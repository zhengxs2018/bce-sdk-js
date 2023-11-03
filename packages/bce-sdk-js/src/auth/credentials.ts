/**
 * 鉴权认证机制
 * @see https://cloud.baidu.com/doc/Reference/s/Njwvz1wot
 */
export interface Credentials {
  /**
   * Access Key ID
   */
  ak: string
  /**
   * Secret Access Key
   */
  sk: string
  /**
   * 所请求服务资源所在的区域，小写格式。例如：bj。
   */
  region?: string
  /**
   * 所请求的服务名称，小写格式。例如：bos。
   */
  service?: string
}

export namespace Credentials {
  // TODO 不强制类型转换
  export const ak = process.env.BCE_ACCESS_KEY || process.env.BCE_AK!
  export const sk = process.env.BCE_SECRET_KEY || process.env.BCE_SK!

  // v2 签名必须
  export const service = process.env.BCE_SERVICE
  export const region = process.env.CEC_REGION || 'bj'
}
