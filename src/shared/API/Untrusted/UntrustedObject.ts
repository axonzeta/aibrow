import objectPath from 'object-path'
import {
  getString,
  getNonEmptyString,
  getNumber,
  getEnum,
  getAny,
  getAIModelId,
  getAILanguageModelInitialPrompts,
  getAILanguageModelPrompts
} from './UntrustedParser'

class UntrustedParser {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #data: any

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (data: any) {
    this.#data = data
  }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #get (path: string) {
    return objectPath.get(this.#data, path)
  }

  /* **************************************************************************/
  // MARK: Base types
  /* **************************************************************************/

  getString (path: string, defaultVal?: string | undefined): string | undefined {
    return getString(this.#get(path), defaultVal)
  }

  getNonEmptyString (path: string, defaultVal?: string | undefined): string | undefined {
    return getNonEmptyString(this.#get(path), defaultVal)
  }

  getNumber (path: string, defaultVal?: number | undefined): number | undefined {
    return getNumber(this.#get(path), defaultVal)
  }

  getEnum (path: string, enumType: any, defaultVal?: any): any {
    return getEnum(this.#get(path), enumType, defaultVal)
  }

  getAny (path: string, defaultVal?: any): any {
    return getAny(this.#get(path), defaultVal)
  }

  /* **************************************************************************/
  // MARK: AI types
  /* **************************************************************************/

  getAIModelId (path: string): string {
    return getAIModelId(this.#get(path))
  }

  /* **************************************************************************/
  // MARK: AI Language model
  /* **************************************************************************/

  getAILanguageModelInitialPrompts (path: string) {
    return getAILanguageModelInitialPrompts(this.#get(path))
  }

  getAILanguageModelPrompts (path: string) {
    return getAILanguageModelPrompts(this.#get(path))
  }
}

export default UntrustedParser
