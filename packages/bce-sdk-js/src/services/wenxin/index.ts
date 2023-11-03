import { BCEClient, type BCEClientOptions } from '../../bce'
import * as API from './resources'

const BASE_URL = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/'

export interface WenXinOptions extends Partial<BCEClientOptions> {
  // pass
}

export class WenXinWorkshop extends BCEClient {
  constructor(options?: WenXinOptions) {
    const { baseURL = BASE_URL, ...rest } = options || {}
    super({ baseURL, ...rest })
  }

  chat: API.Chat = new API.Chat(this)

  protected override async defaultQuery() {
    return { access_token: await this.getAccessToken() }
  }
}

export default WenXinWorkshop
