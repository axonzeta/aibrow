type Config = {
  version: string,

  native: {
    identifier: string
    execName: string
    name: string
    description: string
    updateUrl: string
    apiVersion: string
    useModelDownloader: boolean
  }

  extension: {
    crxExtensionIds: string[]
    mozExtensionIds: string[]
    installHelperUrl: string
  }

  defaultAiModel: string
  modelMinMachineScore: number
  permissionRequiredForDefaultModel: boolean
  permissionAlwaysAllowedOrigins: string[]

  autoDisposeModelTimeout: number
  autoShutdownNativeClientTimeout: number

  updateCheckInterval: number
}

const config = (process.env as any).AZ_CONFIG as Config
export default config
