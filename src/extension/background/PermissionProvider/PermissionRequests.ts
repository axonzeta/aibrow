import { EventEmitter } from 'events'
import { SiteModelPermissionRequest } from '#Shared/Permissions/AISitePermissions'

export class PermissionRequests extends EventEmitter {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #requests: SiteModelPermissionRequest[] = []

  /* **************************************************************************/
  // MARK: Modification
  /* **************************************************************************/

  /**
   * Adds a request
   * @param request
   */
  add (request: SiteModelPermissionRequest) {
    this.#requests.push(request)
    this.emit('changed')
  }

  /**
   * Deletes a request for a tab
   * @param tabId: the id of the tab to delete
   * @return true if a request was deleted, false otherwise
   */
  deleteForTab (tabId: number) {
    let didDelete = false
    this.#requests = this.#requests.filter((request) => {
      if (request.tabId === tabId) {
        request.reject?.(new Error('Request deleted'))
        didDelete = true
        return false
      }
      return true
    })
    if (didDelete) {
      this.emit('changed')
    }
    return didDelete
  }

  /**
   * Deletes a request for a tab and frame
   * @param tabId: the id of the tab to delete
   * @param frameId: the id of the frame to delete
   * @return true if a request was deleted, false otherwise
   */
  deleteForTabAndFrame (tabId: number, frameId: number) {
    let didDelete = false
    this.#requests = this.#requests.filter((request) => {
      if (request.tabId === tabId && request.frameId === frameId) {
        request.reject?.(new Error('Request deleted'))
        didDelete = true
        return false
      }
      return true
    })
    if (didDelete) {
      this.emit('changed')
    }
    return didDelete
  }

  /**
   * Resolves the requests for an origin
   * @param origin: the origin to resolve for
   * @param modelId: the id of the model to resolve for
   * @param permission: the permission to resolve with
   */
  resolveForOrigin (origin: string, modelId: string, permission: boolean) {
    let didResolve = false
    this.#requests = this.#requests.filter((request) => {
      if (request.origin === origin && request.modelId === modelId) {
        didResolve = true
        request.resolve?.(permission)
        return false
      }
      return true
    })

    if (didResolve) {
      this.emit('changed')
    }
  }

  /* **************************************************************************/
  // MARK: Getters
  /* **************************************************************************/

  /**
   * Queries the requests
   * @param tabId: the id of the tab to get requests for
   * @returns an array of pending requests
   */
  queryForTab (tabId: number) {
    return this.#requests.filter((request) => request.tabId === tabId)
  }

  /**
   * Checks if a request exists
   * @param tabId: the id of the tab to check for
   * @returns true if the request exists, false otherwise
   */
  hasForTab (tabId: number) {
    return this.#requests.some((request) => request.tabId === tabId)
  }

  /**
   * @returns an array of tab ids with permission requests
   */
  getTabIdsWithPermissionRequests () {
    return this.#requests.map((request) => request.tabId)
  }

  /**
   * @returns true if there are any requests, false otherwise
   */
  hasRequests () {
    return this.#requests.length !== 0
  }
}
