class APIHelper {
  /* **************************************************************************/
  // MARK: Prefs
  /* **************************************************************************/

  /**
   * Gets the model id from the provided value or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  /*async getModelId (modelId: any, modelType: AIModelType): Promise<AIModelId> {
    return typeof (modelId) === 'string' && modelId.length
      ? new AIModelId(modelId)
      : new AIModelId(await getDefaultModel(modelType))
  }*/

  /**
   * Gets the gpu engine to use or the default
   * @param modelId: the id of the model
   * @returns the model id or the default
   */
  /*async getGpuEngine (gpuEngine: any): Promise<AIModelGpuEngine> {
    return Object.values(AIModelGpuEngine).includes(gpuEngine)
      ? gpuEngine
      : await getDefaultModelEngine()
  }*/

  /**
   * Looks to see if a model supports a given prompt type
   * @param manifest: the manifest of the model
   * @param promptType: the prompt type to check
   * @returns true if supported, false otherwise
   */
  /*modelSupportsPromptType (manifest: AIModelManifest, promptType: AIModelPromptType) {
    switch (promptType) {
      case AIModelPromptType.CoreModel: return true
      default: return Boolean(manifest?.prompts?.[promptType])
    }
  }*/

  /**
   * @param channel: the channel making the request
   * @param modelId: the id of the model
   * @param promptType: the type of prompt to check is available
   * @returns the model availablility and manifest in the format { availability, manifest }
   */
  /*async getAIModelAvailability (channel: IPCInflightChannel, modelId: AIModelId, promptType: AIModelPromptType) {
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
      !manifest.formats[AIModelFormat.GGUF] ||
      score <= config.modelMinMachineScore
    ) {
      availability = AICapabilityAvailability.No
    }

    return { availability, manifest, score }
  }*/

  /* **************************************************************************/
  // MARK: Errors
  /* **************************************************************************/

  /**
   * Wraps a helper function and captures common errors. Instead of throwing
   * converts them to error responses that a handler can use on the other size
   * @param fn: the function execute
   * @returns the result from the function or the wrapped error
   */
  /*async captureCommonErrorsForResponse (fn: () => Promise<any>) {
    try {
      return await fn()
    } catch (ex) {
      switch (ex.message) {
        case kNativeMessagingHostNotFound:
          NativeInstallHelper.show(NativeInstallHelperShowReason.ApiUsage)
          return createIPCErrorResponse(kHelperNotInstalled)
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
  }*/

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
  /*async handleGetStandardCapabilitiesData (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    promptType: AIModelPromptType,
    configFn?: (manifest: AIModelManifest) => object
  ): Promise<AIRootModelCapabilitiesData> {
    return await this.captureCommonErrorsForResponse(async () => {
      const modelId = await this.getModelId(channel.payload?.model, modelType)

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
  }*/

  /**
   * Takes a AiModelProps from the API and converts it to the core llm prompt options
   * @param modelId: the id of the model
   * @param gpuEngine: the gpu engine to use
   * @param manifest: the manifest of the model
   * @param modelProps: the model props
   * @returns the core llm prompt options
   */
  /*async #sanitizeModelProps (modelId: AIModelId, gpuEngine: AIModelGpuEngine, manifest: AIModelManifest, modelProps: any) {
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
      useMmap: await getUseMmap(),
      grammar: props.getAny('grammar')
    } as AIRootModelProps
  }*/

  /**
   * Handles a bunch of preflight tasks before a create call
   * @param channel: the incoming IPC channel
   * @param modelType: the type of model we're targeting
   * @param promptType: the prompt type we should check support for
   * @param postflightFn: a function that can execute a after the preflight calls have been executed
   * @returns the reply from the postflight
   */
  /*async handleStandardCreatePreflight (
    channel: IPCInflightChannel,
    modelType: AIModelType,
    promptType: AIModelPromptType,
    postflightFn: (
      manifest: AIModelManifest,
      payload: TypoParser,
      props: AIRootModelProps
    ) => Promise<any>
  ) {
    const rawPayload = channel.payload

    // Pre-validation checks
    if (rawPayload?.gpuEngine && !(await AILlmSession.getSupportedGpuEngines()).includes(rawPayload?.gpuEngine)) {
      // This will fail later when you try to use it with the model
      throw new Error(kGpuEngineNotSupported)
    }

    const payload = new TypoParser(rawPayload)
    return await this.captureCommonErrorsForResponse(async () => {
      // Values with user-defined defaults
      const modelId = await this.getModelId(rawPayload?.model, modelType)
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
      if (!manifest.formats[AIModelFormat.GGUF]) {
        throw new Error(kModelFormatNotSupported)
      }

      // Return builder
      return await postflightFn(
        manifest,
        payload,
        await this.#sanitizeModelProps(modelId, gpuEngine, manifest, rawPayload)
      )
    })
  }*/

  /**
   * Handles a bunch of preflight tasks before a prompt call
   * @param channel: the incoming IPC channel
   * @param modelType: the type of model we're targeting
   * @param postflightFn: a function that can execute a after the preflight calls have been executed
   * @returns the reply from the postflight
   */
  /*async handleStandardPromptPreflight (
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
    const modelId = await this.getModelId(rawPayload?.props?.model, modelType)
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
  }*/
}

export default new APIHelper()
