import { APIError, castToError } from '../error'
import { safeJSON } from '../util'
import { Credentials } from './credentials'

type SessionTokenResponse = {
  access_token: string
  scope: string
  expires_in: number // 30 天
  session_key: string
  session_secret: string
}

// TODO 支持自动刷新 token
export class SessionCredentials {
  #promise?: Promise<SessionTokenResponse>

  #cache?: SessionTokenResponse

  #expiredAt?: number

  endpoint: string = 'https://aip.baidubce.com/oauth/2.0/token'

  constructor(protected credentials: Credentials = Credentials) {}

  getAccessToken(): Promise<string> {
    return this.process().then((res) => res.access_token)
  }

  getSessionKey(): Promise<string> {
    return this.process().then((res) => res.session_key)
  }

  protected process() {
    const promise = this.#promise
    if (promise) return promise

    if (this.#cache && this.#expiredAt && this.#expiredAt > Date.now()) {
      return Promise.resolve(this.#cache)
    }

    this.#promise = this.request().then((res) => {
      this.#cache = res
      this.#expiredAt = Date.now() + (res.expires_in - 120) * 1000
      return res
    })

    this.#promise.finally(() => {
      this.#promise = undefined
    })

    return this.#promise
  }

  protected async request(): Promise<SessionTokenResponse> {
    const credentials = this.credentials

    const url = new URL(this.endpoint)

    url.searchParams.set('grant_type', 'client_credentials')
    url.searchParams.set('client_id', credentials.ak!)
    url.searchParams.set('client_secret', credentials.sk!)

    // TODO 支持低版本的 NodeJS
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })

    // TODO 支持重试
    if (!response.ok) {
      const errText = await response.text().catch((e) => castToError(e).message)
      const errJSON = safeJSON(errText)
      const errMessage = errJSON ? undefined : errText

      throw APIError.generate(response.status, errJSON, errMessage, response.headers)
    }

    return response.json()
  }
}
