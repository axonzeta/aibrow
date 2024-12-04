import { AIModelIdProvider } from './AIModelId'

const kAssetIdDivider = '/'

class AIModelAssetId {
  /**
   * Generates an asset id for a given provider
   * @param provider: the model provider
   * @param owner: the model owner
   * @param repo: the model repo
   * @param model: the model file
   * @returns the local id of the model
   */
  static generate (provider: AIModelIdProvider, owner: string, repo: string, model: string) {
    switch (provider) {
      case AIModelIdProvider.HuggingFace: return [provider, owner, repo, model].join(kAssetIdDivider)
      default: throw new Error(`Unable to generate asset id for provider ${provider}`)
    }
  }

  /**
   * Checks if the given asset id is for the given provider
   * @param assetId: the id of the asset
   * @param provider: the provider to check for
   * @return true if the asset is for the given provider
   */
  static isProvider (assetId: string, provider: AIModelIdProvider) {
    switch (provider) {
      case AIModelIdProvider.HuggingFace: return assetId.startsWith(`${provider}${kAssetIdDivider}`)
      default: throw new Error(`Unable to check asset id for provider ${provider}`)
    }
  }

  /**
   * Generates a remote url from a given asset id
   * @param assetId: the id of the asset
   * @returns the remote url of the asset
   */
  static getRemoteUrl (assetId: string) {
    const parts = assetId.split(kAssetIdDivider)
    switch (parts[0]) {
      case AIModelIdProvider.HuggingFace: {
        const owner = parts[1]
        const repo = parts[2]
        const model = parts[3]
        if (!model.endsWith('.gguf')) { throw new Error('Huggingface model must be in .gguf format') }
        return `https://huggingface.co/${owner}/${repo}/resolve/main/${model}`
      }
      default: throw new Error(`Unable to get remote url for asset ${assetId}`)
    }
  }
}

export default AIModelAssetId
