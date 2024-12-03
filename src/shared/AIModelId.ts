import {
  kUrlModelIdInvalid,
  kUrlModelIdUnsupportedDomain,
  kUrlModelIdUnsupportedHuggingFacePath,
  kModelIdInvalid
} from './Errors'
import sanitizeFilename from 'sanitize-filename'

export enum AIModelIdProvider {
  HuggingFace = '@hf',
  AiBrow = '@ab'
}

export type AIModelIdJSONObj = {
  provider: AIModelIdProvider
  model: string
  owner?: string
  repo?: string
}

class AIModelId {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #provider: AIModelIdProvider
  #owner?: string
  #repo?: string
  #model: string

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor (input: string | AIModelIdJSONObj) {
    if (typeof (input) === 'string') {
      if (input.startsWith('https://')) {
        let url: URL
        try {
          url = new URL(input)
        } catch (ex) { throw new Error(kUrlModelIdInvalid) }
        this.#fromUrl(url)
      } else {
        this.#fromString(input)
      }
    } else if (typeof (input) === 'object') {
      this.#fromObj(input)
    } else {
      throw new Error(kModelIdInvalid)
    }

    this.#validate()
  }

  /**
   * Fills the model id from a URL
   * @param url: the url to populate with
   */
  #fromUrl (url: URL) {
    switch (url.hostname) {
      case 'huggingface.co': {
        const urlPath = url.pathname.split('/').filter(Boolean)
        const owner = urlPath.at(0)
        const repo = urlPath.at(1)
        const model = urlPath.at(-1)

        if (
          !owner ||
          !repo ||
          !model ||
          !model.endsWith('.gguf')
        ) {
          throw new Error(kUrlModelIdUnsupportedHuggingFacePath)
        }

        this.#provider = AIModelIdProvider.HuggingFace
        this.#owner = sanitizeFilename(owner)
        this.#repo = sanitizeFilename(repo)
        this.#model = sanitizeFilename(model)
        break
      }
      default:
        throw new Error(kUrlModelIdUnsupportedDomain)
    }
  }

  /**
   * Fills the model id from a string
   * @param modelId: the id to populate with
   */
  #fromString (modelId: string) {
    if (modelId.startsWith(AIModelIdProvider.HuggingFace)) {
      const parts = modelId.split('/')
      if (parts.length !== 4) { throw new Error(kModelIdInvalid) }
      const [provider, owner, repo, model] = parts
      this.#provider = sanitizeFilename(provider) as AIModelIdProvider
      this.#owner = sanitizeFilename(owner)
      this.#repo = sanitizeFilename(repo)
      this.#model = sanitizeFilename(model)
    } else if (modelId.startsWith(AIModelIdProvider.AiBrow)) {
      this.#provider = AIModelIdProvider.AiBrow
      this.#model = modelId
    } else if (modelId.startsWith('@')) {
      throw new Error(kModelIdInvalid)
    } else {
      this.#model = modelId
      this.#provider = AIModelIdProvider.AiBrow
    }
  }

  /**
   * Fills the model id from an object
   * @param obj: the obj to populate with
   */
  #fromObj (obj: AIModelIdJSONObj) {
    this.#provider = obj.provider
    this.#owner = obj.owner
    this.#repo = obj.repo
    this.#model = obj.model
  }

  /**
   * Validates the model id
   */
  #validate () {
    switch (this.#provider) {
      case AIModelIdProvider.HuggingFace: {
        if (!this.#owner || !this.#repo || !this.#model) {
          throw new Error(kModelIdInvalid)
        }
        if (!this.#model.endsWith('.gguf')) {
          throw new Error(kModelIdInvalid)
        }
        break
      }
      case AIModelIdProvider.AiBrow: {
        if (this.#owner && Object.values(AIModelIdProvider).includes(this.#owner as AIModelIdProvider)) {
          throw new Error(kModelIdInvalid)
        }
        break
      }
    }
  }

  /* **************************************************************************/
  // MARK: Properties
  /* **************************************************************************/

  get provider () { return this.#provider }

  get owner () { return this.#owner }

  get repo () { return this.#repo }

  get model () { return this.#model }

  /* **************************************************************************/
  // MARK: Utils
  /* **************************************************************************/

  /**
   * Converts the id to a JSON object
   * @returns the json representation of the id
   */
  toJSON () {
    return {
      provider: this.#provider,
      owner: this.#owner,
      repo: this.#repo,
      model: this.#model
    } as AIModelIdJSONObj
  }

  /**
   * Converts the id to a string
   * @returns the string representation of the id
   */
  toString () {
    switch (this.#provider) {
      case AIModelIdProvider.AiBrow:
        return this.#owner
          ? `${this.#provider}/${this.#owner}/${this.#model}`
          : this.#model
      default:
        return [
          this.#provider,
          ...[
            this.#owner,
            this.#repo,
            this.#model
          ].filter(Boolean)
        ].join('/')
    }
  }

  /**
   * Converts the id to a path components
   * @returns an array of path components
   */
  toPathComponents () {
    switch (this.#provider) {
      case AIModelIdProvider.AiBrow:
        return (this.#owner
          ? [this.#provider, this.#owner, this.#model]
          : [this.#model]).map((v) => sanitizeFilename(v))
      default:
        return [
          this.#provider,
          ...[
            this.#owner,
            this.#repo,
            this.#model
          ].filter(Boolean)
        ].map((v) => sanitizeFilename(v))
    }
  }
}

export default AIModelId
