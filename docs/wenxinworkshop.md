# 百度智能云千帆大模型

> 关于 AK/SK 的可以看 [鉴权认证机制](./authorization.md).

企业级一站式生成式AI大模型开发及应用平台，提供先进的生成式人工智能全流程工具链。

## SDK 支持模型

- ernie-bot
- ernie-bot-4
- ernie-bot-turbo

> 注意：为了适配基于 OpenAI 的开源项目， 如：[langchain](https://js.langchain.com.cn/docs/) 等，内部做了兼容，导致支持有限。

## 对话聊天

[百度智能云千帆大模型平台](https://cloud.baidu.com/product/wenxinworkshop.html)

```ts
import { WenXinWorkshop } from '@zhengxs/bce-sdk-js'

const ai = new WenXinWorkshop({
  ak: 'My API Access Key', // defaults to process.env["BCE_ACCESS_KEY"]
  sk: 'My API Secret Key', // defaults to process.env["BCE_SECRET_KEY"]
})

async function main() {
  const chatCompletion = await ai.chat.completions.create({
    model: 'ernie-bot',
    messages: [{ role: 'user', content: 'Say this is a test' }],
  })

  console.log(chatCompletion)
}

main()
```
