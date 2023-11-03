import { Signer } from '@zhengxs/bce-sdk-js'

const signer = new Signer()

async function main() {
  const request: Signer.SignRequest = {
    path: '/api/cht/completions',
  }

  console.log(signer.sign(request))
}

main()
