# Baidu Cloud Engine JavaScript SDK

[![Typescript](https://img.shields.io/badge/lang-typescript-informational?style=flat-square)](https://www.typescriptlang.org)[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)[![npm package](https://img.shields.io/npm/v/@zhengxs/bce-sdk-js.svg?style=flat-square)](https://www.npmjs.com/package/@zhengxs/bce-sdk-js)[![npm downloads](https://img.shields.io/npm/dt/@zhengxs/bce-sdk-js.svg?style=flat-square)](https://www.npmjs.com/package/@zhengxs/bce-sdk-js)![License](https://img.shields.io/npm/l/@zhengxs/bce-sdk-js.svg?style=flat-square)

> 非官方 JS-SDK，请勿在生产中使用

官方提供的 JS-SDK 不支持类型提示，为了学习 AI 应用程序开发，实现的一个非官方的百度云 JS-SDK。

## 文档

- 授权认证
  - [x] [获取 Access Token](./docs/authorization.md#获取访问凭证)
  - [x] [生成认证字符串](./docs/authorization.md#生成认证字符串)
  - [x] [在URL中包含认证字符串](./docs/authorization.md#在URL中包含认证字符串)
- 文心千帆
  - [x] [ChatCompletion](./docs/wenxinworkshop.md#对话聊天)
  - [ ] Embedding
  - [ ] Images
  - [ ] Files
  - [ ] FineTuning

## 支持的环境变量

| 名称                        | 描述                                             | 默认值 |
| --------------------------- | ------------------------------------------------ | ------ |
| `BCE_AK` / `BCE_ACCESS_KEY` | Access Key ID，详见 [如何获取 AK/SK][apikey]     | -      |
| `BCE_AK` / `BCE_SECRET_KEY` | Secret Access Key，详见 [如何获取 AK/SK][apikey] | -      |
| `BCE_SERVICE`               | 所请求的服务名称，小写格式。例如：bos。          | -      |
| `BCE_REGION`                | 所请求服务资源所在的区域，小写格式。例如：bj     | `bj`   |

## 参考

- [Baidu Cloud Engine JavaScript SDK](https://github.com/baidubce/bce-sdk-js)
- [OpenAI Node API Library](https://github.com/openai/openai-node)

## License

MIT

[apikey]: https://cloud.baidu.com/doc/Reference/s/9jwvz2egb
