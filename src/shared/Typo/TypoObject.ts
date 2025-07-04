import objectPath from 'object-path'
import {
  getString,
  getStringArray,
  getNonEmptyString,
  getNonEmptyTrimString,
  getNumber,
  getEnum,
  getBool,
  getAny,
  getRange
} from './TypoParser'

class TypoObject {
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

  getStringArray (path: string): string[] {
    return getStringArray(this.#get(path))
  }

  getNonEmptyString (path: string, defaultVal?: string | undefined): string | undefined {
    return getNonEmptyString(this.#get(path), defaultVal)
  }

  getNonEmptyTrimString (path: string, defaultVal?: string | undefined): string | undefined {
    return getNonEmptyTrimString(this.#get(path), defaultVal)
  }

  getNumber (path: string, defaultVal?: number | undefined): number | undefined {
    return getNumber(this.#get(path), defaultVal)
  }

  getEnum (path: string, enumType: any, defaultVal?: any): any {
    return getEnum(this.#get(path), enumType, defaultVal)
  }

  getBool (path: string, defaultVal: boolean): boolean {
    return getBool(this.#get(path), defaultVal)
  }

  getAny (path: string, defaultVal?: any): any {
    return getAny(this.#get(path), defaultVal)
  }

  getRange (path: string, range: [number, number, number]) {
    return getRange(this.#get(path), range)
  }

  getTypo (path: string) {
    const data = this.#get(path)
    return new TypoObject(typeof (data) === 'object' ? data : {})
  }

  /* **************************************************************************/
  // MARK:
  /* **************************************************************************/

  has (path: string): boolean {
    return objectPath.has(this.#data, path)
  }
}

export default TypoObject
