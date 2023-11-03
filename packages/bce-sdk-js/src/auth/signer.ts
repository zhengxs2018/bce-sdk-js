// fork github:baidubce/bce-sdk-js
import { debuglog } from 'node:util'

import { normalizeURL, sha256 } from '../util'
import { Credentials } from './credentials'

const debug = debuglog('bce:signer')

export class Signer {
  /**
   * 默认的签名请求头
   */
  public static headersToSign: string[] = ['host', 'content-md5', 'content-length', 'content-type']

  constructor(protected credentials: SignCredentials | Credentials = Credentials) {}

  /**
   * 在 URL 中包含认证字符串
   *
   * @see https://cloud.baidu.com/doc/Reference/s/3jwvz1x2e
   * @param url - 需要进行签名的地址
   * @param options - 可选参数
   * @returns
   */
  signWithURL(url: string, options?: SignLegacyOptions) {
    const dest = new URL(url)

    const request: SignRequest = {
      path: dest.pathname,
      query: dest.searchParams,
      method: 'GET',
      headers: {},
    }

    const authorization = Signer.v1(request, this.credentials, options)

    dest.searchParams.set('authorization', authorization)

    return dest.toString()
  }

  /**
   * 根据参数自动判断调用 V1 或 v2 签名算法
   *
   * @returns The signature.
   */
  sign(request: SignRequest, options?: SignLegacyOptions) {
    const { credentials } = this
    const { service, region } = credentials as SignCredentials

    if (service && region) {
      return Signer.v2(request, credentials as SignCredentials, options)
    }

    return Signer.v1(request, credentials, options)
  }

  /**
   * 生成V1认证字符串
   *
   * @see https://cloud.baidu.com/doc/Reference/s/njwvz1yfu
   * @returns The signature.
   */
  static v1(request: SignRequest, credentials: Credentials, options?: SignLegacyOptions) {
    const { ak, sk } = credentials
    const { timestamp, expirationInSeconds = 1800 } = options || {}

    const now = timestamp ? new Date(timestamp * 1000) : new Date()
    const isoTimestamp = now.toISOString().replace(/\.\d+Z$/, 'Z')
    const authStringPrefix = `bce-auth-v1/${ak}/${isoTimestamp}/${expirationInSeconds}`

    debug('authStringPrefix = %j', authStringPrefix)

    const signingKey = sha256(authStringPrefix, sk)

    debug('signingKey = %j', signingKey)

    return `${authStringPrefix}/${Signer.signature(signingKey, request, options)}`
  }

  /**
   * 生成V2认证字符串
   * @see https://cloud.baidu.com/doc/Reference/s/hjwvz1y4f
   */
  static v2(request: SignRequest, credentials: SignCredentials, options?: SignOptions) {
    const { ak, sk, region, service } = credentials
    const { timestamp } = options || {}

    const now = timestamp ? new Date(timestamp * 1000) : new Date()
    const date = now.toISOString().replace(/\.\d+Z$/, 'Z')
    const authStringPrefix = `bce-auth-v2/${ak}/${date}/${region}/${service}`

    debug('authStringPrefix = %j', authStringPrefix)

    const signingKey = sha256(authStringPrefix, sk)

    debug('signingKey = %j', signingKey)

    return `${authStringPrefix}/${Signer.signature(signingKey, request, options)}`
  }

  static signature(signingKey: string, request: SignRequest, options?: SignOptions) {
    const { path, method, query, headers } = request
    const { headersToSign } = options || {}

    debug('signingKey = %j', signingKey)

    const canonicalUri = Signer.uriCanonicalization(path)
    const canonicalQueryString = Signer.queryStringCanonicalization(query)

    const [canonicalHeaders, signedHeaders] = Signer.headersCanonicalization(headers, headersToSign)

    debug('canonicalUri = %j', canonicalUri)
    debug('canonicalQueryString = %j', canonicalQueryString)
    debug('canonicalHeaders = %j', canonicalHeaders)
    debug('signedHeaders = %j', signedHeaders)

    const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders].join('\n')

    debug('canonicalRequest = %j', canonicalRequest)

    const signature = sha256(canonicalRequest, signingKey)

    debug('signature = %j', signature)

    if (signedHeaders.length) {
      return `${signedHeaders.join(';')}/${signature}`
    }

    return `/${signature}`
  }

  /**
   * @internal
   * @see https://developers.google.com/search/docs/crawling-indexing/canonicalization?hl=zh-cn
   * @param uri - 网址
   * @returns
   */
  static uriCanonicalization(uri: string): string {
    return uri
  }

  /**
   * Canonical the query strings.
   *
   * @internal
   * @param query - The query strings.
   */
  static queryStringCanonicalization(searchParams: SignRequest['query']): string {
    if (searchParams == null) return ''

    const canonicalQueryString: string[] = []

    if (searchParams instanceof URLSearchParams) {
      searchParams.forEach((rawValue, rawKey) => {
        if (rawKey.toLowerCase() === 'authorization') return

        const value = rawValue == null ? '' : rawValue
        canonicalQueryString.push(`${rawKey}=${value}}`)
      })
    } else {
      for (const [rawKey, rawValue] of Object.entries(searchParams)) {
        if (rawKey.toLowerCase() === 'authorization') continue

        const value = rawValue == null ? '' : rawValue
        canonicalQueryString.push(`${rawKey}=${normalizeURL(value)}`)
      }
    }

    return canonicalQueryString.sort().join('&')
  }

  /**
   * Canonical the http request headers.
   *
   * @see http://gollum.baidu.com/AuthenticationMechanism#生成CanonicalHeaders
   * @param headers - The http request headers.
   * @param headersToSign - The request headers list which will be used to calcualate the signature.
   * @returns canonicalHeaders and signedHeaders
   */
  static headersCanonicalization(
    headers: SignRequest['headers'] = {},
    headersToSign?: string[],
  ): readonly [string, string[]] {
    if (!headersToSign || headersToSign.length === 0) {
      headersToSign = Signer.headersToSign
    }

    debug('headers = %j, headersToSign = %j', headers, headersToSign)

    const headersMap: Record<string, boolean> = {}

    headersToSign.forEach(function (item) {
      headersMap[item.toLowerCase()] = true
    })

    const canonicalHeaders: string[] = []
    const signedHeaders: string[] = []

    const append = (rawKey: string, rawValue: string) => {
      const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
      if (value === '') return

      const key = rawKey.toLowerCase()

      if (/^x\-bce\-/.test(key) || headersMap[key] === true) {
        const header = `${normalizeURL(key)}:${normalizeURL(value)}`
        canonicalHeaders.push(header)
      }
    }

    if (headers instanceof Headers) {
      headers.forEach((rawValue, rawKey) => {
        if (rawValue == null) return

        append(rawKey, rawValue)
      })
    } else {
      for (const [rawKey, rawValue] of Object.entries(headers)) {
        if (rawValue == null) continue
        append(rawKey, rawValue)
      }
    }

    canonicalHeaders.sort()

    canonicalHeaders.forEach(function (item) {
      signedHeaders.push(item.split(':')[0])
    })

    return [canonicalHeaders.join('\n'), signedHeaders]
  }
}

export type SignRequest = Signer.SignRequest

export type SignOptions = Signer.SignLegacyOptions | Signer.SignOptions

export type SignLegacyOptions = Signer.SignLegacyOptions

export type SignCredentials = Signer.SignCredentials

export namespace Signer {
  export type SignCredentials = Required<Credentials>

  export type SignRequest = {
    path: string
    query?: Record<string, string> | URLSearchParams | undefined
    method?: string
    headers?: Headers | Record<string, string>
  }

  export interface SignOptions {
    /**
     * Set the current timestamp
     */
    timestamp?: number
    /**
     * The request headers list which will be used to calcualate the signature.
     *
     * @defaultValue ['Host', 'Content-MD5', 'Content-Length', 'Content-Type']
     */
    headersToSign?: string[]
  }

  export interface SignLegacyOptions extends SignOptions {
    /**
     * The signature validation time.
     *
     * @defaultValue 1800
     */
    expirationInSeconds?: number
  }
}

export default Signer
