import { Credentials, SessionCredentials, Signer, type SignOptions, type SignRequest } from './auth'
import { APIClient, type APIClientOptions } from './http'

export type BCEClientOptions = APIClientOptions & Partial<Credentials>

export class BCEClient extends APIClient {
  ak: string
  sk: string

  signer: Signer
  session: SessionCredentials

  constructor(options: BCEClientOptions) {
    const { ak = Credentials.ak, sk = Credentials.sk, ...rest } = options

    super(rest)

    this.ak = ak
    this.sk = sk

    this.signer = new Signer(this)
    this.session = new SessionCredentials(this)
  }

  sign(request: SignRequest, options?: SignOptions) {
    return this.signer.sign(request, options)
  }

  signWithURL(url: string, options?: SignOptions) {
    return this.signer.signWithURL(url, options)
  }

  getAccessToken() {
    return this.session.getAccessToken()
  }
}
