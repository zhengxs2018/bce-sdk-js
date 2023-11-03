// fork github:openai/openai-node
import os from 'node:os'

import { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError, castToError } from '../error'
import { safeJSON, sleep } from '../util'
import { Stream } from './streaming'

type PromiseOrValue<T> = T | Promise<T>

const USER_AGENT = `${__PKG_NAME__}/${__PKG_VERSION__} (${os.type()}; ${os.platform()}; ${os.arch()};)`

export interface APIClientOptions {
  /**
   * BASE URL
   */
  baseURL: string

  /**
   * 默认请求头
   */
  defaultHeaders?: HeadersInit

  /**
   * 请求超时
   *
   * @defaultValue 10 minutes
   */
  timeout?: number

  /**
   * The maximum number of times that the client will retry a request in case of a
   * temporary failure, like a network error or a 5XX error from the server.
   *
   * @defaultValue 2
   */
  maxRetries?: number

  /**
   * Specify a custom `fetch` function implementation.
   *
   * If not provided, we use `node-fetch` on Node.js and otherwise expect that `fetch` is
   * defined globally.
   */
  fetch?: APIClient.Fetch | undefined
}

export class MultipartBody {
  constructor(public body: any) {}

  get [Symbol.toStringTag](): string {
    return 'MultipartBody'
  }
}

export const isMultipartBody = (body: any): body is MultipartBody =>
  body && typeof body === 'object' && body.body && body[Symbol.toStringTag] === 'MultipartBody'

export class APIClient {
  baseURL: string
  timeout: number
  maxRetries: number
  fetch: APIClient.Fetch

  constructor({
    baseURL,
    maxRetries = 2,
    timeout = 600000, // 10 minutes
    fetch: overrideFetch,
  }: APIClientOptions) {
    this.fetch = overrideFetch ?? fetch

    this.baseURL = baseURL
    this.maxRetries = maxRetries
    this.timeout = timeout
  }

  protected authHeaders(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _opts: APIClient.RequestOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _url: string,
  ): APIClient.HeadersInit {
    return {}
  }

  protected getUserAgent(): string {
    return USER_AGENT
  }

  protected defaultHeaders(opts: APIClient.RequestOptions, url: string): APIClient.HeadersInit {
    const { host } = new URL(url)
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Host: host,
      ...this.authHeaders(opts, url),
      'User-Agent': this.getUserAgent(),
    }
  }

  protected validateHeaders(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _headers: APIClient.HeadersInit,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _customHeaders: APIClient.HeadersInit,
  ): PromiseOrValue<void> {}

  get<Req extends NonNullable<unknown>, Rsp>(
    url: string,
    opts?: PromiseOrValue<APIClient.RequestConfig<Req>>,
  ): Promise<Rsp> {
    return this.methodRequest('get', url, opts)
  }

  post<Req extends NonNullable<unknown>, Rsp>(
    url: string,
    opts?: PromiseOrValue<APIClient.RequestConfig<Req>>,
  ): Promise<Rsp> {
    return this.methodRequest('post', url, opts)
  }

  patch<Req extends NonNullable<unknown>, Rsp>(
    url: string,
    opts?: PromiseOrValue<APIClient.RequestConfig<Req>>,
  ): Promise<Rsp> {
    return this.methodRequest('patch', url, opts)
  }

  put<Req extends NonNullable<unknown>, Rsp>(
    url: string,
    opts?: PromiseOrValue<APIClient.RequestConfig<Req>>,
  ): Promise<Rsp> {
    return this.methodRequest('put', url, opts)
  }

  delete<Req extends NonNullable<unknown>, Rsp>(
    url: string,
    opts?: PromiseOrValue<APIClient.RequestConfig<Req>>,
  ): Promise<Rsp> {
    return this.methodRequest('delete', url, opts)
  }

  async request<Req extends NonNullable<unknown>, Rsp>(
    options: PromiseOrValue<APIClient.RequestOptions<Req>>,
  ): Promise<Rsp> {
    return this.parseResponse(await this.makeRequest(options))
  }

  private async makeRequest(
    optionsInput: PromiseOrValue<APIClient.RequestOptions>,
    retriesRemaining?: number | null,
  ): Promise<APIClient.ResponseProps> {
    const options = await optionsInput
    if (retriesRemaining == null) {
      retriesRemaining = options.maxRetries ?? this.maxRetries
    }

    const { req, url, timeout } = await this.buildRequest(options)

    await this.prepareRequest(req, { url, options })

    if (options.signal?.aborted) {
      throw new APIUserAbortError()
    }

    const controller = new AbortController()
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError)

    if (response instanceof Error) {
      if (options.signal?.aborted) {
        throw new APIUserAbortError()
      }
      if (retriesRemaining) {
        return this.retryRequest(options, retriesRemaining)
      }
      if (response.name === 'AbortError') {
        throw new APIConnectionTimeoutError()
      }

      throw new APIConnectionError({ cause: response })
    }

    const responseHeaders = response.headers

    if (!response.ok) {
      if (retriesRemaining && this.shouldRetry(response)) {
        return this.retryRequest(options, retriesRemaining, responseHeaders)
      }

      const errText = await response.text().catch((e) => castToError(e).message)
      const errJSON = safeJSON(errText)
      const errMessage = errJSON ? undefined : errText

      throw this.makeStatusError(response.status, errJSON, errMessage, responseHeaders)
    }

    return { response, options, controller }
  }

  protected async retryRequest(
    options: APIClient.RequestOptions,
    retriesRemaining: number,
    responseHeaders?: Headers | undefined,
  ): Promise<APIClient.ResponseProps> {
    // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
    let timeoutMillis: number | undefined
    const retryAfterHeader = responseHeaders?.get('retry-after')
    if (retryAfterHeader) {
      const timeoutSeconds = parseInt(retryAfterHeader)
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1000
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now()
      }
    }

    // If the API asks us to wait a certain amount of time (and it's a reasonable amount),
    // just do what it says, but otherwise calculate a default
    if (!timeoutMillis || !Number.isInteger(timeoutMillis) || timeoutMillis <= 0 || timeoutMillis > 60 * 1000) {
      const maxRetries = options.maxRetries ?? this.maxRetries
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries)
    }
    await sleep(timeoutMillis)

    return this.makeRequest(options, retriesRemaining - 1)
  }

  private calculateDefaultRetryTimeoutMillis(retriesRemaining: number, maxRetries: number): number {
    const initialRetryDelay = 0.5
    const maxRetryDelay = 8.0

    const numRetries = maxRetries - retriesRemaining

    // Apply exponential backoff, but not more than the max.
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay)

    // Apply some jitter, take up to at most 25 percent of the retry time.
    const jitter = 1 - Math.random() * 0.25

    return sleepSeconds * jitter * 1000
  }

  async fetchWithTimeout(
    url: RequestInfo,
    init: APIClient.Request | undefined,
    ms: number,
    controller: AbortController,
  ): Promise<Response> {
    const { signal, ...options } = init || {}
    if (signal) signal.addEventListener('abort', () => controller.abort())

    const timeout = setTimeout(() => controller.abort(), ms)

    return this.fetch(url, { signal: controller.signal as any, ...options }).finally(() => clearTimeout(timeout))
  }

  protected shouldRetry(response: Response): boolean {
    // Note this is not a standard header.
    const shouldRetryHeader = response.headers.get('x-should-retry')

    // If the server explicitly says whether or not to retry, obey.
    if (shouldRetryHeader === 'true') return true
    if (shouldRetryHeader === 'false') return false

    // Retry on request timeouts.
    if (response.status === 408) return true

    // Retry on lock timeouts.
    if (response.status === 409) return true

    // Retry on rate limits.
    if (response.status === 429) return true

    // Retry internal errors.
    if (response.status >= 500) return true

    return false
  }

  protected prepareRequest(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _request: APIClient.Request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _init: { url: string; options: APIClient.RequestConfig },
  ): PromiseOrValue<void> {}

  private methodRequest<Req extends NonNullable<unknown>, Rsp>(
    method: APIClient.Method,
    path: string,
    opts?: PromiseOrValue<APIClient.RequestConfig<Req>>,
  ): Promise<Rsp> {
    return this.request(Promise.resolve(opts).then<APIClient.RequestOptions>((opts) => ({ method, path, ...opts })))
  }

  protected makeStatusError(
    status: number | undefined,
    error: NonNullable<unknown> | undefined,
    message: string | undefined,
    headers: Headers | undefined,
  ) {
    return APIError.generate(status, error, message, headers)
  }

  protected async buildRequest<Req extends NonNullable<unknown>>(
    options: APIClient.RequestOptions<Req>,
  ): Promise<{ req: APIClient.Request; url: string; timeout: number }> {
    const { method, headers: headers = {} } = options

    const body = isMultipartBody(options.body)
      ? options.body.body
      : options.body
      ? JSON.stringify(options.body, null, 2)
      : null
    const contentLength = this.calculateContentLength(body)

    const url = await this.buildURL(options.path, options.query)

    const timeout = options.timeout ?? this.timeout

    const reqHeaders: Record<string, string> = {
      ...(contentLength && { 'Content-Length': contentLength }),
      ...this.defaultHeaders(options, url),
      ...headers,
    }

    // Strip any headers being explicitly omitted with null
    Object.keys(reqHeaders).forEach((key) => reqHeaders[key] === null && delete reqHeaders[key])

    const req: APIClient.Request = {
      method,
      ...(body && { body: body as any }),
      headers: new Headers(reqHeaders),
      // @ts-ignore node-fetch uses a custom AbortSignal type that is
      // not compatible with standard web types
      signal: options.signal ?? null,
    }

    this.validateHeaders(reqHeaders, headers)

    return { req, url, timeout }
  }

  protected async parseResponse<T>(props: APIClient.ResponseProps): Promise<T> {
    const { response, options } = props

    if (options.stream) return Stream.fromSSEResponse(response, props.controller) as any

    if (response.status === 204) {
      // fetch refuses to read the body when the status code is 204.
      return null as T
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>
    }

    // TODO handle blob, arraybuffer, other content types, etc.
    return response.text() as Promise<T>
  }

  protected defaultQuery(): PromiseOrValue<Record<string, string>> {
    return {}
  }

  protected async buildURL(path: string, query?: Record<string, string>): Promise<string> {
    const url = new URL(path, this.baseURL)

    const defaultQuery = await this.defaultQuery()
    const searchParams = new URLSearchParams({ ...defaultQuery, ...query })

    url.search = searchParams.toString()

    return url.toString()
  }

  protected calculateContentLength(body: unknown): string | null {
    if (typeof body === 'string') {
      if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(body, 'utf8').toString()
      }

      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder()
        const encoded = encoder.encode(body)
        return encoded.length.toString()
      }
    }

    return null
  }

  static MultipartBody = MultipartBody

  static isMultipartBody = isMultipartBody
}

export type RequestOptions = APIClient.RequestOptions

export namespace APIClient {
  export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>

  export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

  export type HeadersInit = Record<string, string | null | undefined>

  export type RequestConfig<Req extends NonNullable<unknown> = Record<string, unknown>> = {
    method?: Method
    query?: Record<string, string> | undefined
    body?: Req | undefined
    headers?: Record<string, string> | undefined
    maxRetries?: number
    stream?: boolean | undefined
    timeout?: number
    signal?: AbortSignal | undefined | null
  }

  export type RequestOptions<Req extends NonNullable<unknown> = Record<string, unknown>> = RequestConfig<Req> & {
    path: string
    method: Method
  }

  export type Request = {
    method: Method
    body?: BodyInit
    headers: Headers
    signal?: AbortSignal | null
  }

  export type ResponseProps = {
    response: Response
    options: RequestOptions
    controller: AbortController
  }
}

export default APIClient
