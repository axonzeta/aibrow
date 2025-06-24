import {
  IPCInflightChannel
} from '#Shared/IPC/IPCServer'
import {
  AIModelAvailability,
  AIModelCoreState,
  AIModelCoreCompatibility,
  AIModelType,
  AIModelPromptType,
  AIModelGpuEngine,
  AIModelDType
} from '#Shared/API/AICoreTypes'
import { createIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kPermissionDenied,
  kModelCreationAborted,
  kGpuEngineNotSupported,
  kModelPromptTypeNotSupported,
  kModelFormatNotSupported,
  kModelIdProviderUnsupported,
  kUrlModelIdInvalid,
  kUrlModelIdUnsupportedDomain,
  kUrlModelIdUnsupportedHuggingFacePath,
  kModelIdInvalid,
  kModelInputTypeNotSupported,
  kModelInputTooLong
} from '#Shared/Errors'
import AIModelId from '#Shared/AIModelId'
import { AIModelFormat, AIModelManifest } from '#Shared/AIModelManifest'
import AILlmSession from '../AI/AILlmSession'
import AIModelManager from '../AI/AIModelManager'
import TypoObject from '#Shared/Typo/TypoObject'
import { clamp } from '#Shared/Typo/TypoParser'
import { nanoid } from 'nanoid'
import config from '#Shared/Config'

class APIHelper {
  /* **************************************************************************/
  // MARK: Prefs
  /* **************************************************************************/

  /**
   * Gets the model id from the provided value or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  async getModelId (modelId: any, modelType: AIModelType): Promise<AIModelId> {
    return typeof (modelId) === 'string' && modelId.length
      ? new AIModelId(modelId)
      : new AIModelId(config.defaultModels[modelType])
  }

  /**
   * Gets the gpu engine to use or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  async getGpuEngine (gpuEngine: any): Promise<AIModelGpuEngine | undefined> {
    const supportedEngines = AILlmSession.getSupportedGpuEngines()
    if (supportedEngines.includes(gpuEngine)) {
      return gpuEngine
    } else if (supportedEngines.includes(AIModelGpuEngine.WebGpu)) {
      return AIModelGpuEngine.WebGpu
    } else {
      return AIModelGpuEngine.Wasm
    }
  }

  /**
   * Looks to see if a model supports a given prompt type
   * @param manifest: the manifest of the model
   * @param promptType: the prompt type to check
   * @returns true if supported, false otherwise
   */
  modelSupportsPromptType (manifest: AIModelManifest, promptType: AIModelPromptType) {
    switch (promptType) {
      case AIModelPromptType.CoreModel: return true
      default: return Boolean(manifest?.prompts?.[promptType])
    }
  }

  /**
   * @param channel: the channel making the request
   * @param modelId: the id of the model
   * @param promptType: the type of prompt to check is available
   * @returns the model availablility and manifest in the format { availability, manifest }
   */
  async getAIModelAvailability (channel: IPCInflightChannel, modelId: AIModelId, promptType: AIModelPromptType) {
    let manifest: AIModelManifest
    let availability: AIModelAvailability
    try {
      manifest = await AIModelManager.fetchModelManifest(modelId)
      availability = await AIModelManager.areManifestAssetsCached(manifest)
        ? AIModelAvailability.Available
        : AIModelAvailability.Downloadable // TODO: Support downloading state in the future
    } catch (ex) {
      availability = AIModelAvailability.Unavailable
    }

    // Check the model supports the prompt type we're trying to use
    if (
      !manifest ||
      !manifest.formats[AIModelFormat.ONNX] ||
      !this.modelSupportsPromptType(manifest, promptType)
    ) {
      availability = AIModelAvailability.Unavailable
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
        case kModelInputTypeNotSupported:
        case kModelInputTooLong:
          return createIPCErrorResponse(ex.message)
      }

      throw ex
    }
  }

  /* **************************************************************************/
  // MARK: Handlers
  /* **************************************************************************/

  /**
   * Gets the model availability
   * @param channel: the incoming channel
   * @param modelType: the type of model we're targeting
   * * @param promptType: the type of prompt to check is available
   * @returns the response for the channel
   */
  async handleGetStandardAvailability (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    promptType: AIModelPromptType
  ): Promise<AIModelAvailability> {
    return await this.captureCommonErrorsForResponse(async () => {
      const modelId = await this.getModelId(channel.payload?.model, modelType)

      // Get the availability
      const { availability } = await this.getAIModelAvailability(channel, modelId, promptType)
      return availability
    })
  }

  /**
   * Gets the model compatibility
   * @param channel: the incoming channel
   * @param modelType: the type of model we're targeting
   * @returns the response for the channel
   */
  async handleGetStandardCompatibility (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    promptType: AIModelPromptType
  ): Promise<AIModelCoreCompatibility | null> {
    return await this.captureCommonErrorsForResponse(async () => {
      const modelId = await this.getModelId(channel.payload?.model, modelType)

      const {
        availability,
        score,
        manifest
      } = await this.getAIModelAvailability(channel, modelId, promptType)

      switch (availability) {
        case AIModelAvailability.Unavailable: return null
        default: return {
          score,
          gpuEngines: AILlmSession.getSupportedGpuEngines(),
          flashAttention: manifest.config.flashAttention,
          contextSize: [1, manifest.tokens.default, manifest.tokens.max]
        }
      }
    })
  }

  /**
   * Gets the core model state from the provided user options
   * @param manifest: the manifest of the model
   * @param modelType: the type of model we're targeting
   * @param options: the user options
   * @returns the core llm prompt state
   */
  async getCoreModelState (
    manifest: AIModelManifest,
    modelType: AIModelType,
    options: TypoObject
  ): Promise<AIModelCoreState> {
    const modelId = await this.getModelId(options.getString('model'), modelType)
    const gpuEngine = await this.getGpuEngine(options.getString('gpuEngine'))

    return {
      model: modelId.toString(),
      gpuEngine,
      dtype: options.getEnum('dtype', AIModelDType, AIModelDType.Auto),
      flashAttention: options.getBool('flashAttention', manifest.config.flashAttention),
      contextSize: clamp(options.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max),
      useMmap: false
    } as AIModelCoreState
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
    promptType: AIModelPromptType,
    postflightFn: (
      manifest: AIModelManifest,
      sessionId: string,
      payload: TypoObject,
      modelId: AIModelId,
      gpuEngine: AIModelGpuEngine
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload

    // Pre-validation checks
    if (rawPayload?.gpuEngine && !(AILlmSession.getSupportedGpuEngines()).includes(rawPayload?.gpuEngine)) {
      // This will fail later when you try to use it with the model
      throw new Error(kGpuEngineNotSupported)
    }

    const payload = new TypoObject(rawPayload)
    return await this.captureCommonErrorsForResponse(async () => {
      // Values with user-defined defaults
      const sessionId = nanoid()
      const modelId = await this.getModelId(rawPayload?.model, modelType)
      const gpuEngine = await this.getGpuEngine(rawPayload?.gpuEngine)

      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Check we support this model type after install - things may have changed
      const manifest = await AIModelManager.fetchModelManifest(modelId)
      if (!this.modelSupportsPromptType(manifest, promptType)) {
        throw new Error(kModelPromptTypeNotSupported)
      }

      const props = await this.getCoreModelState(manifest, modelType, payload)

      // Permission checks & requests
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Model update or install
      await AILlmSession.createPromptSession(sessionId, props, (loaded, total) => {
        channel.emit({ loaded, total, model: modelId.toString() })
      })
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      if (!manifest.formats[AIModelFormat.GGUF]) {
        throw new Error(kModelFormatNotSupported)
      }

      // Return builder
      return await postflightFn(
        manifest,
        sessionId,
        payload,
        modelId,
        gpuEngine
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
      payload: TypoObject
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload
    const payload = new TypoObject(rawPayload)
    return await this.captureCommonErrorsForResponse(async () => {
      // Values with user-defined defaults
      const modelId = await this.getModelId(rawPayload?.model, modelType)

      // Permission checks & requests
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Get the values
      const manifest = await AIModelManager.fetchModelManifest(modelId)

      return await postflightFn(
        manifest,
        payload
      )
    })
  }
}

export default new APIHelper()
