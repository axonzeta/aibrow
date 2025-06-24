/* **************************************************************************/
// MARK: Base types
/* **************************************************************************/

export function getString (val: any, defaultVal?: string | undefined): string | undefined {
  return typeof val === 'string' ? val : defaultVal
}

export function getStringArray (val: any): string[] {
  return Array.isArray(val)
    ? val.filter((v) => typeof v === 'string')
    : []
}

export function getNonEmptyString (val: any, defaultVal?: string | undefined): string | undefined {
  return typeof val === 'string' && val.length > 0 ? val : defaultVal
}

export function getNonEmptyTrimString (val: any, defaultVal?: string | undefined): string | undefined {
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed.length > 0 ? trimmed : defaultVal
  } else {
    return defaultVal
  }
}

export function getNumber (val: any, defaultVal?: number | undefined): number | undefined {
  return typeof val === 'number' ? val : defaultVal
}

export function getEnum (val: any, enumType: any, defaultVal?: any): any {
  return Object.values(enumType).includes(val) ? val : defaultVal
}

export function getBool (val: any, defaultVal: boolean): boolean {
  return typeof val === 'boolean' ? val : defaultVal
}

export function getAny (val: any, defaultVal?: any): any {
  return val ?? defaultVal
}

export function clamp (val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

export function getRange (val: any, range: [number, number, number]) {
  const [min, defaultVal, max] = range
  return clamp(getNumber(val, defaultVal), min, max)
}
