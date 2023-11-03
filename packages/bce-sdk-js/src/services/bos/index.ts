import { Credentials } from '../../auth'
import { BCEClient, type BCEClientOptions } from '../../bce'

const BOS_PROTOCOL = process.env.BOS_PROTOCOL || 'https:'
const BOS_HOST = process.env.BOS_HOST || 'bcebos.com'
const BOS_SERVICE = process.env.BOS_SERVICE || Credentials.service
const BOS_REGION = process.env.BOS_REGION || Credentials.region

export type BOSClientOptions = Partial<UrlOptions & BCEClientOptions>

export class BOSClient extends BCEClient {
  #options: UrlOptions

  constructor(options: BOSClientOptions) {
    const { protocol = BOS_PROTOCOL, host = BOS_HOST, service = BOS_SERVICE, region = BOS_REGION, ...rest } = options

    const urlOptions = {
      protocol,
      service,
      host,
      region,
    }

    super({ baseURL: computedURL(urlOptions), ...rest })

    this.#options = urlOptions
  }

  get protocol(): string | undefined {
    return this.#options.protocol
  }

  set protocol(value: string) {
    this.#options.protocol = value
    this.baseURL = computedURL(this.#options)
  }

  get service(): string | undefined {
    return this.#options.service
  }

  set service(value: string) {
    this.#options.service = value
    this.baseURL = computedURL(this.#options)
  }

  get region(): string | undefined {
    return this.#options.region
  }

  set region(value: string) {
    this.#options.region = value
    this.baseURL = computedURL(this.#options)
  }

  get host(): string {
    return this.#options.host
  }

  set host(value: string) {
    this.#options.host = value
    this.baseURL = computedURL(this.#options)
  }
}

/** @internal */
function computedURL({ protocol, host, region }: UrlOptions): string {
  const parts: string[] = [host]

  if (region) parts.unshift(region)

  // TODO 需要考虑支持？
  // if (service) parts.unshift(service)

  return `${protocol}//${parts.join('.')}`
}

export type UrlOptions = {
  /**
   * 请求协议
   *
   * @defaultValue https
   */
  protocol?: (string & NonNullable<unknown>) | 'https:' | 'http:'
  /**
   * 主机地址
   *
   * @defaultValue bcebos.com
   */
  host: string
  /**
   * 服务ID
   */
  service?: string
  /**
   * 存储区域
   *
   * @defaultValue bj
   */
  region?: string
}
