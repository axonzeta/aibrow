import { clamp, getAIModelId, getEnum } from '#Shared/API/Untrusted/UntrustedParser'
import {
  getDefaultModel,
  getDefaultModelEngine,
  getModelUpdatePeriod,
  getUseMmap,
  ModelUpdatePeriod
} from '#Shared/Prefs'
import { AICapabilityGpuEngine } from '#Shared/API/AICapability'
import { createIPCErrorResponse } from '#Shared/IPC/IPCErrorHelper'
import {
  kHelperNotInstalled,
  kPermissionDenied,
  kModelCreationAborted,
  kGpuEngineNotSupported,
  kModelPromptAborted,
  kModelPromptTypeNotSupported
} from '#Shared/Errors'
import { NativeInstallHelper, NativeInstallHelperShowReason } from '../NativeInstallHelper'
import { kNativeMessagingHostNotFound } from '#Shared/BrowserErrors'
import AIModelFileSystem from '../AI/AIModelFileSystem'
import AIModelDownload from '../AI/AIModelDownload'
import {
  AICapabilityAvailability,
  AIRootModelCapabilitiesData,
  AICapabilityPromptType,
  AIRootModelProps
} from '#Shared/API/AI'
import { IPCInflightChannel } from '#Shared/IPC/IPCServer'
import PermissionProvider from '../PermissionProvider'
import AILlmSession from '../AI/AILlmSession'
import { AIModelManifest } from '#Shared/AIModelManifest'
import UntrustedParser from '#Shared/API/Untrusted/UntrustedObject'
import AIModelManager from '../AI/AIModelManager'
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
  async getModelId (modelId: any): Promise<string> {
    return getAIModelId(modelId, await getDefaultModel())
  }

  /**
   * Gets the gpu engine to use or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  async getGpuEngine (gpuEngine: any): Promise<AICapabilityGpuEngine> {
    return getEnum(gpuEngine, AICapabilityGpuEngine, await getDefaultModelEngine())
  }

  /* **************************************************************************/
  // MARK: Models
  /* **************************************************************************/

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
  async getAIModelAvailability (channel: IPCInflightChannel, modelId: string, promptType: AICapabilityPromptType) {
    let manifest: AIModelManifest
    let availability: AICapabilityAvailability
    let score: number
    try {
      manifest = await AIModelFileSystem.readModelManifest(modelId)
      score = (await AIModelFileSystem.readModelStats(modelId))?.machineScore ?? 1
      availability = AICapabilityAvailability.Readily
    } catch (ex) {
      try {
        manifest = await AIModelDownload.fetchModelManifest(modelId)
        availability = AICapabilityAvailability.AfterDownload
        score = await AILlmSession.getModelScore(manifest)
      } catch (ex) {
        availability = AICapabilityAvailability.No
        score = 0
      }
    }

    // Check the model supports the prompt type we're trying to use
    if (
      !manifest ||
      !this.modelSupportsPromptType(manifest, promptType) ||
      score < config.modelMinMachineScore
    ) {
      availability = AICapabilityAvailability.No
    }

    return { availability, manifest, score }
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
        case kNativeMessagingHostNotFound:
          NativeInstallHelper.show(NativeInstallHelperShowReason.ApiUsage)
          return createIPCErrorResponse(kHelperNotInstalled)
        case kPermissionDenied:
          return createIPCErrorResponse(kPermissionDenied)
        case kModelPromptTypeNotSupported:
          return createIPCErrorResponse(kModelPromptTypeNotSupported)
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
   * @param promptType: the type of prompt to check is available
   * @returns the response for the channel
   */
  async handleGetStandardCapabilitiesData (
    channel: IPCInflightChannel,
    promptType: AICapabilityPromptType,
    configFn?: (manifest: AIModelManifest) => object
  ): Promise<AIRootModelCapabilitiesData> {
    return await this.captureCommonErrorsForResponse(async () => {
      const modelId = await this.getModelId(channel.payload?.model)

      // Permission checks & requests
      await PermissionProvider.requestModelPermission(channel, modelId)
      await PermissionProvider.ensureModelPermission(channel, modelId)

      const components = await Promise.all([
        (async () => {
          const { availability, score } = await this.getAIModelAvailability(channel, modelId, promptType)
          if (availability === AICapabilityAvailability.Readily) {
            const manifest = await AIModelFileSystem.readModelManifest(modelId)
            return {
              score,
              ...configFn ? configFn(manifest) : undefined,
              available: AICapabilityAvailability.Readily,
              topK: manifest.config.topK,
              topP: manifest.config.topP,
              temperature: manifest.config.temperature,
              repeatPenalty: manifest.config.repeatPenalty,
              flashAttention: manifest.config.flashAttention,
              contextSize: [1, manifest.tokens.default, manifest.tokens.max]
            }
          } else {
            return { available: availability, score }
          }
        })(),
        AILlmSession.getSupportedGpuEngines().then((gpuEngines) => ({ gpuEngines }))
      ])

      return Object.assign({}, ...components)
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
  async #sanitizeModelProps (modelId: string, gpuEngine: AICapabilityGpuEngine, manifest: AIModelManifest, modelProps: any) {
    const props = new UntrustedParser(modelProps)
    return {
      model: modelId,
      gpuEngine,
      topK: props.getRange('topK', manifest.config.topK),
      topP: props.getRange('topP', manifest.config.topP),
      temperature: props.getRange('temperature', manifest.config.temperature),
      repeatPenalty: props.getRange('repeatPenalty', manifest.config.repeatPenalty),
      flashAttention: props.getBool('flashAttention', manifest.config.flashAttention),
      contextSize: clamp(props.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max),
      useMmap: await getUseMmap(),
      grammar: props.getAny('grammar')
    } as AIRootModelProps
  }

  /**
   * Handles a bunch of preflight tasks before a create call
   * @param channel: the incoming IPC channel
   * @param promptType: the prompt type we should check support for
   * @param postflightFn: a function that can execute a after the preflight calls have been executed
   * @returns the reply from the postflight
   */
  async handleStandardCreatePreflight (
    channel: IPCInflightChannel,
    promptType: AICapabilityPromptType,
    postflightFn: (
      manifest: AIModelManifest,
      payload: UntrustedParser,
      props: AIRootModelProps
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload

    // Pre-validation checks
    if (rawPayload?.gpuEngine && !(await AILlmSession.getSupportedGpuEngines()).includes(rawPayload?.gpuEngine)) {
      // This will fail later when you try to use it with the model
      throw new Error(kGpuEngineNotSupported)
    }

    const payload = new UntrustedParser(rawPayload)
    return await this.captureCommonErrorsForResponse(async () => {
      // Values with user-defined defaults
      const modelId = await this.getModelId(rawPayload?.model)
      const gpuEngine = await this.getGpuEngine(rawPayload?.gpuEngine)

      // Permission checks & requests
      await PermissionProvider.requestModelPermission(channel, modelId)
      await PermissionProvider.ensureModelPermission(channel, modelId)
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Model update or install
      if (await AIModelFileSystem.hasModelInstalled(modelId)) {
        if (await getModelUpdatePeriod() === ModelUpdatePeriod.Before) {
          // Hold for the update
          await AIModelManager.update(channel, modelId, true)
        } else {
          // Don't hold for the update (default)
          AIModelManager.update(channel, modelId)
        }
      } else {
        // Pre-check if the manifest supports the prompt type to save downloading a large model
        const manifest = await AIModelDownload.fetchModelManifest(modelId)
        if (!this.modelSupportsPromptType(manifest, promptType)) {
          throw new Error(kModelPromptTypeNotSupported)
        }

        await AIModelManager.install(channel, modelId, (model, loaded, total) => {
          channel.emit({ loaded, total, model })
        })

        const machineScore = await AILlmSession.getModelScore(manifest)
        await AIModelFileSystem.updateModelStats(modelId, { machineScore })
      }
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Check we support this model type after install - things may have changed
      const manifest = await AIModelFileSystem.readModelManifest(modelId)
      if (!this.modelSupportsPromptType(manifest, promptType)) {
        throw new Error(kModelPromptTypeNotSupported)
      }

      // Return builder
      return await postflightFn(
        manifest,
        payload,
        await this.#sanitizeModelProps(modelId, gpuEngine, manifest, rawPayload)
      )
    })
  }

  /**
   * Handles a bunch of preflight tasks before a prompt call
   * @param channel: the incoming IPC channel
   * @param postflightFn: a function that can execute a after the preflight calls have been executed
   * @returns the reply from the postflight
   */
  async handleStandardPromptPreflight (
    channel: IPCInflightChannel,
    postflightFn: (
      manifest: AIModelManifest,
      payload: UntrustedParser,
      props: AIRootModelProps
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload
    const payload = new UntrustedParser(rawPayload)

    // Values with user-defined defaults
    const modelId = await this.getModelId(rawPayload?.props?.model)
    const gpuEngine = await this.getGpuEngine(rawPayload?.props?.gpuEngine)

    // Permission checks & requests
    await PermissionProvider.requestModelPermission(channel, modelId)
    await PermissionProvider.ensureModelPermission(channel, modelId)
    if (channel.abortSignal?.aborted) { throw new Error(kModelPromptAborted) }

    // Get the values
    const manifest = await AIModelFileSystem.readModelManifest(modelId)

    return await postflightFn(
      manifest,
      payload,
      await this.#sanitizeModelProps(modelId, gpuEngine, manifest, rawPayload?.props ?? {}))
  }
}

export default new APIHelper()
