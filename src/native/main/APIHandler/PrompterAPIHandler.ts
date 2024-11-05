import BrowserIPC from '../BrowserIPC'
import {
  kPrompterGetSupportedGpuEngines,
  kPrompterExecPromptSession,
  kPrompterCountPromptTokens,
  kPrompterDisposePromptSession
} from '#Shared/NativeAPI/PrompterIPC'
import { AICapabilityGpuEngine, AIRootModelProps } from '#Shared/API/AI'
import { importLlama } from '#R/Llama'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import deepEqual from 'fast-deep-equal'
import Logger from '#R/Logger'
import config from '#Shared/Config'
import type { LlamaChatSession, LlamaContext, LlamaModel, LlamaGrammar } from 'node-llama-cpp'
import AIModelFileSystem from '#R/AI/AIModelFileSystem'
import { kModelPromptAborted } from '#Shared/Errors'
import UntrustedParser from '#Shared/API/Untrusted/UntrustedObject'
import { nanoid } from 'nanoid'
import { clamp } from '#Shared/API/Untrusted/UntrustedParser'
import { AIModelManifest } from '#Shared/AIModelManifest'
import AsyncQueue from '#Shared/AsyncQueue'

type LlmSessionOptions = {
  manifestVersion: string
  modelId: string
  gpuEngine: AICapabilityGpuEngine | undefined
  contextSize: number
  grammar?: any
  flashAttention: boolean
  useMmap: boolean
}

type LlmSession = {
  sessionIds: string[]
  options: LlmSessionOptions
  model: LlamaModel
  context: LlamaContext
  session: LlamaChatSession
  autoDispose: ReturnType<typeof setTimeout>
  grammar?: LlamaGrammar
}

class PrompterAPIHandler {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #llmSession: LlmSession
  #llmQueue: AsyncQueue

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    this.#llmQueue = new AsyncQueue()

    BrowserIPC
      .addRequestHandler(kPrompterGetSupportedGpuEngines, this.#handleGetSupportedGpuEngines)
      .addRequestHandler(kPrompterExecPromptSession, this.#handleExecPromptSession)
      .addRequestHandler(kPrompterCountPromptTokens, this.#handleExecCountPromptTokens)
      .addRequestHandler(kPrompterDisposePromptSession, this.#handleDisposePromptSession)
  }

  /* **************************************************************************/
  // MARK: Platform support
  /* **************************************************************************/

  #handleGetSupportedGpuEngines = async () => {
    const supportedEngines: AICapabilityGpuEngine[] = []
    const possibleEngines = [
      AICapabilityGpuEngine.Cuda,
      AICapabilityGpuEngine.Vulkan,
      AICapabilityGpuEngine.Cpu,
      ...process.platform === 'darwin' ? [AICapabilityGpuEngine.Metal] : []
    ]

    const { getLlamaForOptions } = await importLlama()
    for (const engine of possibleEngines) {
      try {
        await getLlamaForOptions(
          {
            gpu: engine === AICapabilityGpuEngine.Cpu ? false : engine,
            build: 'never',
            vramPadding: 0
          },
          { skipLlamaInit: true }
        )
        supportedEngines.push(engine)
      } catch (ex) { /* not supported */ }
    }

    return supportedEngines
  }

  /* **************************************************************************/
  // MARK: LLM session management
  /* **************************************************************************/

  /**
   * Loads a prompt session into memory
   * @param sessionId: the id of the session
   * @param manifest: the manifest of the model
   * @param sessionOptions: the options for the session
   */
  #loadLlmSession = async (sessionId: string | undefined, manifest: AIModelManifest, sessionOptions: LlmSessionOptions) => {
    const {
      modelId,
      gpuEngine,
      contextSize,
      grammar,
      flashAttention,
      useMmap
    } = sessionOptions

    // Clear the auto-dispose timer
    clearTimeout(this.#llmSession?.autoDispose)

    // Create or re-use the session
    if (deepEqual(this.#llmSession?.options, sessionOptions)) {
      Logger.log(`Reusing AI instance ${modelId}`)
      if (sessionId) {
        this.#llmSession.sessionIds.push(sessionId)
      }
      this.#llmSession.session.resetChatHistory()
    } else {
      Logger.log(`Loading new AI instance ${modelId}`)

      this.#disposeLlmSession()
      const nextPromptSession: Partial<LlmSession> = {
        sessionIds: sessionId ? [sessionId] : [],
        options: sessionOptions
      }

      const { getLlama, LlamaChatSession } = await importLlama()
      const llama = await getLlama({
        build: 'never',
        gpu: gpuEngine === undefined
          ? 'auto'
          : gpuEngine === AICapabilityGpuEngine.Cpu
            ? false
            : gpuEngine
      })
      nextPromptSession.model = await llama.loadModel({
        modelPath: AIModelFileSystem.getAssetPath(manifest.model),
        useMmap
      })

      nextPromptSession.context = await nextPromptSession.model.createContext({
        contextSize,
        flashAttention,
        lora: manifest.adapter
          ? { adapters: [{ filePath: AIModelFileSystem.getAssetPath(manifest.adapter) }] }
          : undefined
      })
      nextPromptSession.session = new LlamaChatSession({
        contextSequence: nextPromptSession.context.getSequence()
      })

      if (grammar !== undefined) {
        nextPromptSession.grammar = await llama.createGrammarForJsonSchema(grammar)
      }

      this.#llmSession = nextPromptSession as LlmSession
    }
  }

  /**
   * Disposes of the current prompt session safely
   */
  #disposeLlmSession () {
    if (this.#llmSession?.options?.modelId) {
      Logger.log(`Dispose AI instance ${this.#llmSession.options.modelId}`)
    }
    this.#llmSession?.session?.dispose?.()
    this.#llmSession?.context?.dispose?.()
    this.#llmSession?.model?.dispose?.()
    this.#llmSession = undefined
  }

  /**
   * Schedules a prompt session to be disposed
   */
  #scheduleLlmSessionDispose () {
    if (this.#llmSession) {
      clearTimeout(this.#llmSession.autoDispose)
      this.#llmSession.autoDispose = setTimeout(() => {
        this.#disposeLlmSession()
      }, config.autoDisposeModelTimeout)
    }
  }

  /* **************************************************************************/
  // MARK: LLM API handlers
  /* **************************************************************************/

  /**
   * Sanitizes the model props
   * @param modelProps: the incoming model props
   * @param manifest: the manifest of the model
   * @returns the model props sanitized with the manifest
   */
  #sanitizeModelProps = (modelProps: any, manifest: AIModelManifest) => {
    const props = new UntrustedParser(modelProps)
    return {
      model: manifest.id,
      gpuEngine: props.getEnum('gpuEngine', AICapabilityGpuEngine, undefined),
      topK: props.getRange('topK', manifest.config.topK),
      topP: props.getRange('topP', manifest.config.topP),
      temperature: props.getRange('temperature', manifest.config.temperature),
      repeatPenalty: props.getRange('repeatPenalty', manifest.config.repeatPenalty),
      flashAttention: props.getBool('flashAttention', manifest.config.flashAttention),
      contextSize: clamp(props.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max),
      useMmap: props.getBool('useMmap', true),
      grammar: props.getAny('grammar')
    } as AIRootModelProps
  }

  #handleExecPromptSession = async (channel: IPCInflightChannel) => {
    return await this.#llmQueue.push(async () => {
      let output = ''

      try {
        // Extract the options
        const payload = new UntrustedParser(channel.payload)
        const modelId = payload.getAIModelId('props.model')
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          topK,
          topP,
          temperature,
          repeatPenalty,
          flashAttention,
          contextSize,
          useMmap,
          grammar
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)
        const sessionId = payload.getNonEmptyString('sessionId', nanoid())
        const prompt = payload.getNonEmptyString('prompt')

        const llmOptions: LlmSessionOptions = {
          gpuEngine,
          manifestVersion: manifest.version,
          modelId,
          grammar,
          contextSize,
          flashAttention,
          useMmap
        }

        // Load the session
        await this.#loadLlmSession(sessionId, manifest, llmOptions)

        // Preflight checks
        await AIModelFileSystem.markModelUsed(modelId)
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        // Send the prompt to the model
        await this.#llmSession.session.prompt(prompt, {
          signal: channel.abortSignal,
          topK,
          topP,
          repeatPenalty: { penalty: repeatPenalty },
          temperature,
          onTextChunk: (chunk) => {
            channel.emit(chunk)
            output += chunk
          },
          grammar: this.#llmSession.grammar,
          customStopTriggers: manifest.tokens.stop
        })

        return output
      } catch (ex) {
        if (ex.message === 'Failed to compress chat history for context shift due to a too long prompt or system message that cannot be compressed without affecting the generation quality. Consider increasing the context size or shortening the long prompt or system message.') {
          Logger.warn('Early context shift due to long prompt or system message')
          return output
        }
        throw ex
      } finally {
        this.#scheduleLlmSessionDispose()
      }
    })
  }

  #handleExecCountPromptTokens = async (channel: IPCInflightChannel) => {
    return await this.#llmQueue.push(async () => {
      try {
        // Extract the options
        const payload = new UntrustedParser(channel.payload)
        const modelId = payload.getAIModelId('props.model')
        const input = payload.getString('input')
        const manifest = await AIModelFileSystem.readModelManifest(modelId)

        // Extract prompt options
        const {
          gpuEngine,
          flashAttention,
          contextSize,
          useMmap,
          grammar
        } = this.#sanitizeModelProps(payload.getAny('props'), manifest)

        const llmOptions: LlmSessionOptions = {
          gpuEngine,
          manifestVersion: manifest.version,
          modelId,
          grammar,
          contextSize,
          flashAttention,
          useMmap
        }

        // Load the session
        await this.#loadLlmSession(undefined, manifest, llmOptions)

        // Preflight checks
        await AIModelFileSystem.markModelUsed(modelId)
        if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

        return this.#llmSession.model.tokenize(input).length
      } finally {
        this.#scheduleLlmSessionDispose()
      }
    })
  }

  #handleDisposePromptSession = async (channel: IPCInflightChannel) => {
    return await this.#llmQueue.push(async () => {
      const sessionId = channel.payload.session
      if (this.#llmSession?.sessionIds?.includes?.(sessionId)) {
        this.#llmSession.sessionIds = this.#llmSession.sessionIds.filter((id) => id !== sessionId)

        if (this.#llmSession.sessionIds.length === 0) {
          // If we fail here, the auto-dispose will get it shortly
          this.#disposeLlmSession()
        }
      }
    })
  }
}

export default PrompterAPIHandler
