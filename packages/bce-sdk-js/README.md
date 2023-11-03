# @zhengxs/bce-sdk-js

> 非官方 JS-SDK，请勿在生产中使用

鉴于官方提供的 JS-SDK 不支持类型提示，为了学习 AI 应用程序开发，实现的一个百度的 JS-SDK。

## 安装

```sh
# With NPM
$ npm i -S @zhengxs/bce-sdk-js

# With Yarn
$ yarn add @zhengxs/bce-sdk-js

# With PNPM
$ pnpm add @zhengxs/bce-sdk-js
```

### 示例

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

更多点击 [这里](https://github.com/zhengxs2018/bce-sdk-js) 查看更多内容。

MIT
