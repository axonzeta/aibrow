/* **************************************************************************/
// MARK: Errors
/* **************************************************************************/

/**
 * Responses that throw an error get handled by the default exception handling.
 * If we want to throw an error that we're expecting, then use this helper to
 * return an okay response with something that can be detected as an error
 * @param message: the error message
 * @returns an error object
 */
export function createIPCErrorResponse (message: string) {
  return { _ok: false, _error: message || '' }
}

/**
 * If the message identifies as an error, then throw it
 * @param message: the ipc message
 * @return the original message if it didn't throw
 */
export function throwIPCErrorResponse (message: any) {
  if (message && typeof (message) === 'object' && message._ok === false && typeof (message._error) === 'string') {
    const error = new Error(message._error)
    error.stack = ''
    throw error
  }
  return message
}
