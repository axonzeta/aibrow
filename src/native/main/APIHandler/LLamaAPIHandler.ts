import BrowserIPC from '../BrowserIPC'
import { kLlamaGetSupportedGpuEngines } from '#Shared/NativeAPI/LlamaIPC'
import { AICapabilityGpuEngine } from '#Shared/API/AI'
import { importLlama } from '#R/Llama'

class LlamaAPIHandler {
  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    BrowserIPC
      .addRequestHandler(kLlamaGetSupportedGpuEngines, this.#handleGetSupportedGpuEngines)
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
}

export default LlamaAPIHandler
