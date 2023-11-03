import { WenXinWorkshop } from '@zhengxs/bce-sdk-js'

const ai = new WenXinWorkshop()

async function main() {
  const chatCompletion = await ai.chat.completions.create({
    model: 'ernie-bot',
    messages: [{ role: 'user', content: 'Say this is a test' }],
  })

  console.log(chatCompletion)
}

main()
