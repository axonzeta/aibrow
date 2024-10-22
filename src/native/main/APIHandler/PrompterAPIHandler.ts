import BrowserIPC from '../BrowserIPC'
import {
  kPrompterGetSupportedGpuEngines,
  kPrompterExecPromptSession,
  kPrompterDisposePromptSession
} from '#Shared/NativeAPI/PrompterIPC'
import { AICapabilityGpuEngine } from '#Shared/API/AI'
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

type PromptSessionOptions = {
  modelId: string
  gpuEngine: AICapabilityGpuEngine | undefined
  contextSize: number
  grammar?: any
  flashAttention: boolean
  useMmap: boolean
}

type PromptSession = {
  sessionIds: string[]
  options: PromptSessionOptions
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

  #promptSession: PromptSession
  #promptRunning = false

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserIPC
      .addRequestHandler(kPrompterGetSupportedGpuEngines, this.#handleGetSupportedGpuEngines)
      .addRequestHandler(kPrompterExecPromptSession, this.#handleExecPromptSession)
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
  // MARK: Prompt session
  /* **************************************************************************/

  /**
   * Disposes of the current prompt session safely
   */
  #disposePromptSession () {
    if (this.#promptSession?.options?.modelId) {
      Logger.log(`Dispose AI instance ${this.#promptSession.options.modelId}`)
    }
    this.#promptSession?.session?.dispose?.()
    this.#promptSession?.context?.dispose?.()
    this.#promptSession?.model?.dispose?.()
    this.#promptSession = undefined
  }

  #handleExecPromptSession = async (channel: IPCInflightChannel) => {
    if (this.#promptRunning) {
      throw new Error('Failed to execute, prompt session in progress')
    }

    try {
      this.#promptRunning = true
      // Extract the options
      const payload = new UntrustedParser(channel.payload)
      const modelId = payload.getAIModelId('modelId')
      const manifest = await AIModelFileSystem.readModelManifest(modelId)

      // Extract prompt options
      const gpuEngine = payload.getEnum('gpuEngine', AICapabilityGpuEngine, undefined)
      const sessionId = payload.getNonEmptyString('sessionId', nanoid())
      const prompt = payload.getNonEmptyString('prompt')
      const topK = payload.getRange('topK', manifest.config.topK)
      const topP = payload.getRange('topP', manifest.config.topP)
      const temperature = payload.getRange('temperature', manifest.config.temperature)
      const repeatPenalty = payload.getRange('repeatPenalty', manifest.config.repeatPenalty)
      const flashAttention = payload.getBool('flashAttention', manifest.config.flashAttention)
      const grammar = payload.getAny('grammar')
      const useMmap = payload.getBool('useMmap', true)
      const contextSize = clamp(payload.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max)

      const sessionOptions: PromptSessionOptions = {
        gpuEngine,
        modelId,
        grammar,
        contextSize,
        flashAttention,
        useMmap
      }

      // Create or re-use the session
      if (deepEqual(this.#promptSession?.options, sessionOptions)) {
        Logger.log(`Reusing AI instance ${modelId}`)
        this.#promptSession.sessionIds.push(sessionId)
        this.#promptSession.session.resetChatHistory()
      } else {
        Logger.log(`Loading new AI instance ${modelId}`)

        this.#disposePromptSession()
        clearTimeout(this.#promptSession?.autoDispose)
        const nextPromptSession: Partial<PromptSession> = {
          sessionIds: [sessionId],
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

        this.#promptSession = nextPromptSession as PromptSession
      }

      if (channel.abortSignal.aborted) { throw new Error(kModelPromptAborted) }

      // Send the prompt to the model
      await AIModelFileSystem.markModelUsed(modelId)
      const output = await this.#promptSession.session.prompt(prompt, {
        signal: channel.abortSignal,
        topK,
        topP,
        repeatPenalty: { penalty: repeatPenalty },
        temperature,
        onTextChunk: (chunk) => {
          channel.emit(chunk)
        },
        grammar: this.#promptSession.grammar
      })

      return output
    } finally {
      this.#promptRunning = false
      if (this.#promptSession) {
        clearTimeout(this.#promptSession.autoDispose)
        this.#promptSession.autoDispose = setTimeout(() => {
          this.#disposePromptSession()
        }, config.autoDisposeModelTimeout)
      }
    }
  }

  #handleDisposePromptSession = async (channel: IPCInflightChannel) => {
    const sessionId = channel.payload.session
    if (this.#promptSession?.sessionIds?.includes?.(sessionId)) {
      this.#promptSession.sessionIds = this.#promptSession.sessionIds.filter((id) => id !== sessionId)

      if (!this.#promptRunning && this.#promptSession.sessionIds.length === 0) {
        // If we fail here, the auto-dispose will get it shortly
        this.#disposePromptSession()
      }
    }
  }
}

export default PrompterAPIHandler
