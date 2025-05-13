import { AIModelType } from './API/AICoreTypes'

export type Config = {
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

  defaultModels: {
    [AIModelType.Text]: string
    [AIModelType.Embedding]: string
  }
  modelMinMachineScore: number
  permissionRequiredForDefaultModel: boolean
  permissionAlwaysAllowedOrigins: string[]

  autoDisposeModelTimeout: number
  autoShutdownNativeClientTimeout: number

  updateCheckInterval: number
}

export const config = (process.env as any).AZ_CONFIG as Config
export default config
