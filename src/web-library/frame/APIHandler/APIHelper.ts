import { clamp } from '#Shared/Typo/TypoParser'
import { createIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kPermissionDenied,
  kModelCreationAborted,
  kGpuEngineNotSupported,
  kModelPromptAborted,
  kModelPromptTypeNotSupported,
  kModelFormatNotSupported,
  kModelIdProviderUnsupported,
  kUrlModelIdInvalid,
  kUrlModelIdUnsupportedDomain,
  kUrlModelIdUnsupportedHuggingFacePath,
  kModelIdInvalid
} from '#Shared/Errors'
import {
  AICapabilityAvailability,
  AICapabilityGpuEngine,
  AIRootModelCapabilitiesData,
  AICapabilityPromptType,
  AIRootModelProps,
  AIModelType
} from '#Shared/API/AI'
import AIModelId from '#Shared/AIModelId'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import { AIModelManifest, AIModelFormat } from '#Shared/AIModelManifest'
import TypoParser from '#Shared/Typo/TypoObject'
import config from '#Shared/Config'
import AIModelManager from '../AI/AIModelManager'
import AILlmSession from '../AI/AILlmSession'
import { nanoid } from 'nanoid'

class APIHelper {
  /* **************************************************************************/
  // MARK: Prefs
  /* **************************************************************************/

  /**
   * Gets the model id from the provided value or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  getModelId (modelId: any, modelType: AIModelType): AIModelId {
    return typeof (modelId) === 'string' && modelId.length
      ? new AIModelId(modelId)
      : new AIModelId(config.defaultModels[modelType])
  }

  /**
   * Gets the gpu engine to use or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  getGpuEngine (gpuEngine: any): AICapabilityGpuEngine {
    const supportedEngines = AILlmSession.getSupportedGpuEngines()
    if (supportedEngines.includes(gpuEngine)) {
      return gpuEngine
    } else if (supportedEngines.includes(AICapabilityGpuEngine.WebGpu)) {
      return AICapabilityGpuEngine.WebGpu
    } else {
      return AICapabilityGpuEngine.Wasm
    }
  }

  /**
   * Looks to see if a model supports a given prompt type
   * @param manifest: the manifest of the model
   * @param promptType: the prompt type to check
   * @returns true if supported, false otherwise
   */
  modelSupportsPromptType (manifest: AIModelManifest, promptType: AICapabilityPromptType) {
    switch (promptType) {
      case AICapabilityPromptType.CoreModel: return true
      default: return Boolean(manifest?.prompts?.[promptType])
    }
  }

  /**
   * @param channel: the channel making the request
   * @param modelId: the id of the model
   * @param promptType: the type of prompt to check is available
   * @returns the model availablility and manifest in the format { availability, manifest }
   */
  async getAIModelAvailability (channel: IPCInflightChannel, modelId: AIModelId, promptType: AICapabilityPromptType) {
    let manifest: AIModelManifest
    let availability: AICapabilityAvailability
    try {
      manifest = await AIModelManager.fetchModelManifest(modelId)
      availability = await AIModelManager.areManifestAssetsCached(manifest)
        ? AICapabilityAvailability.Readily
        : AICapabilityAvailability.AfterDownload
    } catch (ex) {
      availability = AICapabilityAvailability.No
    }

    // Check the model supports the prompt type we're trying to use
    if (
      !manifest ||
      !manifest.formats[AIModelFormat.ONNX] ||
      !this.modelSupportsPromptType(manifest, promptType)
    ) {
      availability = AICapabilityAvailability.No
    }

    return { availability, manifest, score: 1 }
  }

  /* **************************************************************************/
  // MARK: Errors
  /* **************************************************************************/

  /**
   * Wraps a helper function and captures common errors. Instead of throwing
   * converts them to error responses that a handler can use on the other size
   * @param fn: the function execute
   * @returns the result from the function or the wrapped error
   */
  async captureCommonErrorsForResponse (fn: () => Promise<any>) {
    try {
      return await fn()
    } catch (ex) {
      switch (ex.message) {
        case kPermissionDenied:
        case kModelPromptTypeNotSupported:
        case kModelFormatNotSupported:
        case kModelIdProviderUnsupported:
        case kUrlModelIdInvalid:
        case kUrlModelIdUnsupportedDomain:
        case kUrlModelIdUnsupportedHuggingFacePath:
        case kModelIdInvalid:
          return createIPCErrorResponse(ex.message)
      }

      throw ex
    }
  }

  /* **************************************************************************/
  // MARK: Handlers
  /* **************************************************************************/

  /**
   * Gets the standard capabilities data
   * @param channel: the incoming channel
   * @param modelType: the type of model we're targeting
   * @param promptType: the type of prompt to check is available
   * @returns the response for the channel
   */
  async handleGetStandardCapabilitiesData (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    promptType: AICapabilityPromptType,
    configFn?: (manifest: AIModelManifest) => object
  ): Promise<AIRootModelCapabilitiesData> {
    return await this.captureCommonErrorsForResponse(async () => {
      const modelId = this.getModelId(channel.payload?.model, modelType)
      const gpuEngines = AILlmSession.getSupportedGpuEngines()
      const { availability, manifest, score } = await this.getAIModelAvailability(channel, modelId, promptType)

      if (availability === AICapabilityAvailability.Readily) {
        return {
          score,
          ...configFn ? configFn(manifest) : undefined,
          available: AICapabilityAvailability.Readily,
          gpuEngines,
          topK: manifest.config.topK,
          topP: manifest.config.topP,
          temperature: manifest.config.temperature,
          repeatPenalty: manifest.config.repeatPenalty,
          flashAttention: manifest.config.flashAttention,
          contextSize: [1, manifest.tokens.default, manifest.tokens.max]
        }
      } else {
        return {
          available: availability,
          gpuEngines,
          score
        }
      }
    })
  }

  /**
   * Takes a AiModelProps from the API and converts it to the core llm prompt options
   * @param modelId: the id of the model
   * @param gpuEngine: the gpu engine to use
   * @param manifest: the manifest of the model
   * @param modelProps: the model props
   * @returns the core llm prompt options
   */
  async #sanitizeModelProps (modelId: AIModelId, gpuEngine: AICapabilityGpuEngine, manifest: AIModelManifest, modelProps: any) {
    const props = new TypoParser(modelProps)
    return {
      model: modelId.toString(),
      gpuEngine,
      topK: props.getRange('topK', manifest.config.topK),
      topP: props.getRange('topP', manifest.config.topP),
      temperature: props.getRange('temperature', manifest.config.temperature),
      repeatPenalty: props.getRange('repeatPenalty', manifest.config.repeatPenalty),
      flashAttention: props.getBool('flashAttention', manifest.config.flashAttention),
      contextSize: clamp(props.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max),
      useMmap: false,
      grammar: props.getAny('grammar')
    } as AIRootModelProps
  }

  /**
   * Handles a bunch of preflight tasks before a create call
   * @param channel: the incoming IPC channel
   * @param modelType: the type of model we're targeting
   * @param promptType: the prompt type we should check support for
   * @param postflightFn: a function that can execute a after the preflight calls have been executed
   * @returns the reply from the postflight
   */
  async handleStandardCreatePreflight (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    promptType: AICapabilityPromptType,
    postflightFn: (
      manifest: AIModelManifest,
      sessionId: string,
      payload: TypoParser,
      props: AIRootModelProps
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload

    // Pre-validation checks
    if (rawPayload?.gpuEngine && !(AILlmSession.getSupportedGpuEngines()).includes(rawPayload?.gpuEngine)) {
      // This will fail later when you try to use it with the model
      throw new Error(kGpuEngineNotSupported)
    }

    const payload = new TypoParser(rawPayload)
    return await this.captureCommonErrorsForResponse(async () => {
      // Values with user-defined defaults
      const sessionId = nanoid()
      const modelId = this.getModelId(rawPayload?.model, modelType)
      const gpuEngine = this.getGpuEngine(rawPayload?.gpuEngine)

      // Check we support this model
      const manifest = await AIModelManager.fetchModelManifest(modelId)
      if (!this.modelSupportsPromptType(manifest, promptType)) {
        throw new Error(kModelPromptTypeNotSupported)
      }
      const props = await this.#sanitizeModelProps(modelId, gpuEngine, manifest, rawPayload)

      // Permission checks & requests
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Model update or install
      await AILlmSession.createPromptSession(sessionId, props, (loaded, total) => {
        channel.emit({ loaded, total, model: modelId.toString() })
      })
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Return builder
      return await postflightFn(
        manifest,
        sessionId,
        payload,
        props
      )
    })
  }

  /**
   * Handles a bunch of preflight tasks before a prompt call
   * @param channel: the incoming IPC channel
   * @param modelType: the type of model we're targeting
   * @param postflightFn: a function that can execute a after the preflight calls have been executed
   * @returns the reply from the postflight
   */
  async handleStandardPromptPreflight (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    postflightFn: (
      manifest: AIModelManifest,
      payload: TypoParser,
      props: AIRootModelProps
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload
    const payload = new TypoParser(rawPayload)

    // Values with user-defined defaults
    const modelId = this.getModelId(rawPayload?.props?.model, modelType)
    const gpuEngine = this.getGpuEngine(rawPayload?.props?.gpuEngine)

    // Permission checks & requests
    if (channel.abortSignal?.aborted) { throw new Error(kModelPromptAborted) }

    // Get the values
    const manifest = await AIModelManager.fetchModelManifest(modelId)

    return await postflightFn(
      manifest,
      payload,
      await this.#sanitizeModelProps(modelId, gpuEngine, manifest, rawPayload?.props ?? {}))
  }
}

export default new APIHelper()
