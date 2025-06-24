class AIAssetCache {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #cache: Cache
  #cacheOpening = false
  #cacheOpenPromises: [(cache: Cache) => void, (err: Error) => void][] = []

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  #getCache = async (): Promise<Cache> => {
    if (this.#cache) { return this.#cache }

    if (!this.#cacheOpening) {
      this.#cacheOpening = true
      window.caches.open('aibrow-assets').then(
        (cache) => {
          this.#cache = cache
          this.#cacheOpening = false
          const promises = this.#cacheOpenPromises
          this.#cacheOpenPromises = []
          for (const [resolve] of promises) {
            resolve(cache)
          }
        },
        (err) => {
          const promises = this.#cacheOpenPromises
          this.#cacheOpenPromises = []
          for (const [_resolve, reject] of promises) {
            reject(err)
          }
        }
      )
    }
    return new Promise((resolve, reject) => {
      this.#cacheOpenPromises.push([resolve, reject])
    })
  }

  /* **************************************************************************/
  // MARK: Accessors
  /* **************************************************************************/

  async match (request: RequestInfo, opts?: CacheQueryOptions): Promise<Response | undefined> {
    const cache = await this.#getCache()
    return await cache.match(request, opts)
  }

  async put (key: RequestInfo, value: Response): Promise<void> {
    const cache = await this.#getCache()
    return await cache.put(key, value)
  }

  async has (request: RequestInfo, opts?: CacheQueryOptions): Promise<boolean> {
    const cache = await this.#getCache()
    return await cache.match(request, opts) !== undefined
  }
}

export default new AIAssetCache()
