import type { WenXinWorkshop } from './index'

export class APIResource {
  constructor(protected client: WenXinWorkshop) {
    this.client = client

    this.get = client.get.bind(client)
    this.post = client.post.bind(client)
    this.patch = client.patch.bind(client)
    this.put = client.put.bind(client)
    this.delete = client.delete.bind(client)
  }

  protected get: WenXinWorkshop['get']
  protected post: WenXinWorkshop['post']
  protected patch: WenXinWorkshop['patch']
  protected put: WenXinWorkshop['put']
  protected delete: WenXinWorkshop['delete']
}

export default APIResource
