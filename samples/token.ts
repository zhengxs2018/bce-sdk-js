import { SessionCredentials } from '@zhengxs/bce-sdk-js'

const session = new SessionCredentials()

async function main() {
  const token = await session.getAccessToken()

  console.log(token)
}

main()
