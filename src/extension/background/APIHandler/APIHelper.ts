import { clamp, getAIModelId, getEnum } from '#Shared/API/Untrusted/UntrustedParser'
import {
  getDefaultModel,
  getDefaultModelEngine,
  getModelUpdatePeriod,
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
import AIPrompter from '../AI/AIPrompter'
import { AIModelManifest } from '#Shared/AIModelManifest'
import UntrustedParser from '#Shared/API/Untrusted/UntrustedObject'
import AIModelManager from '../AI/AIModelManager'
import { PromptOptions } from '#Shared/NativeAPI/PrompterIPC'

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
   * @returns the model availablility
   */
  async getAIModelAvailability (channel: IPCInflightChannel, modelId: string, promptType: AICapabilityPromptType) {
    let manifest: AIModelManifest
    let availability: AICapabilityAvailability
    try {
      manifest = await AIModelFileSystem.readModelManifest(modelId)
      availability = AICapabilityAvailability.Readily
    } catch (ex) {
      try {
        manifest = await AIModelDownload.fetchModelManifest(modelId, channel.origin)
        availability = AICapabilityAvailability.AfterDownload
      } catch (ex) {
        availability = AICapabilityAvailability.No
      }
    }

    if (
      availability === AICapabilityAvailability.No ||
      !manifest ||
      !this.modelSupportsPromptType(manifest, promptType)
    ) {
      return AICapabilityAvailability.No
    } else {
      return availability
    }
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
          const available = await this.getAIModelAvailability(channel, modelId, promptType)
          if (available === AICapabilityAvailability.Readily) {
            if (configFn) {
              const manifest = await AIModelFileSystem.readModelManifest(modelId)
              return {
                ...configFn(manifest),
                available: AICapabilityAvailability.Readily,
                topK: manifest.config.topK,
                topP: manifest.config.topP,
                temperature: manifest.config.temperature,
                repeatPenalty: manifest.config.repeatPenalty,
                flashAttention: manifest.config.flashAttention,
                contextSize: [1, manifest.tokens.max, manifest.tokens.default]
              }
            } else {
              return { available }
            }
          } else {
            return { available }
          }
        })(),
        AIPrompter.getSupportedGpuEngines().then((gpuEngines) => ({ gpuEngines }))
      ])

      return Object.assign({}, ...components)
    })
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
    if (rawPayload?.gpuEngine && !(await AIPrompter.getSupportedGpuEngines()).includes(rawPayload?.gpuEngine)) {
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
        const manifest = await AIModelDownload.fetchModelManifest(modelId, channel.origin)
        if (!this.modelSupportsPromptType(manifest, promptType)) {
          throw new Error(kModelPromptTypeNotSupported)
        }

        await AIModelManager.install(channel, modelId, (model, loaded, total) => {
          channel.emit({ loaded, total, model })
        })
      }
      if (channel.abortSignal?.aborted) { throw new Error(kModelCreationAborted) }

      // Check we support this model type after install - things may have changed
      const manifest = await AIModelFileSystem.readModelManifest(modelId)
      if (!this.modelSupportsPromptType(manifest, promptType)) {
        throw new Error(kModelPromptTypeNotSupported)
      }

      // Return builder
      return await postflightFn(manifest, payload, {
        model: modelId,
        gpuEngine,
        topK: payload.getRange('topK', manifest.config.topK),
        topP: payload.getRange('topP', manifest.config.topP),
        temperature: payload.getRange('temperature', manifest.config.temperature),
        repeatPenalty: payload.getRange('repeatPenalty', manifest.config.repeatPenalty),
        flashAttention: payload.getBool('flashAttention', manifest.config.flashAttention),
        contextSize: clamp(payload.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max)
      })
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
      options: Omit<PromptOptions, 'prompt'>
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

    return await postflightFn(manifest, payload, {
      modelId,
      gpuEngine,
      sessionId: payload.getNonEmptyString('sessionId'),
      topK: payload.getRange('props.topK', manifest.config.topK),
      topP: payload.getRange('props.topP', manifest.config.topP),
      temperature: payload.getRange('props.temperature', manifest.config.temperature),
      repeatPenalty: payload.getRange('props.repeatPenalty', manifest.config.repeatPenalty),
      flashAttention: payload.getBool('props.flashAttention', manifest.config.flashAttention),
      contextSize: clamp(payload.getNumber('contextSize', manifest.tokens.default), 1, manifest.tokens.max)
    })
  }
}

export default new APIHelper()
