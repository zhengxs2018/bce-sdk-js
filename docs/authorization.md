# 鉴权认证机制

将 HTTP请 求发送到百度智能云时，需要对请求进行签名计算，以便百度智能云可以识别请求者的身份。这需要百度智能云的访问密钥来进行签名计算，该访问密钥包含访问密钥ID(Access Key Id, 后文简称 AK ) 和秘密访问密钥 ( Secret Access Key, 后文简称 SK ).

## 获取访问凭证

```ts
import { SessionCredentials } from '@zhengxs/bce-sdk-js'

const session = new SessionCredentials({
  ak: 'My API Access Key',
  sk: 'My API Secret Key',
})

await session.getAccessToken()
//=> '24.xxxxxxxxxxxxxx.xxxxxxx.xxxxxxxxxx.xxxxxx-xxxxxxxx'
```

## 生成认证字符串

[生成认证字符串](https://cloud.baidu.com/doc/Reference/s/njwvz1yfu)

```ts
import { Signer } from '@zhengxs/bce-sdk-js'

const signer = new Signer({
  ak: 'My API Access Key',
  sk: 'My API Secret Key',
})

const req: Signer.SignRequest = {
  path: '',
  query: {},
  method: '',
  headers: {},
}

signer.sign(req)
//=> bce-auth-v1/xxxxxxxxxxxxxxxxxxxxxxxx
```

## 为 URL 添加认证字符串

[官方文档](https://cloud.baidu.com/doc/Reference/s/3jwvz1x2e)

```ts
import { Signer } from '@zhengxs/bce-sdk-js'

const signer = new Signer({
  ak: 'My API Access Key', // defaults to process.env["BCE_ACCESS_KEY"]
  sk: 'My API Secret Key', // defaults to process.env["BCE_SECRET_KEY"]
})

const url = 'https://bj.bcebos.com/test/readme.txt?foo=bar'

signer.signWithURL(url)
//=> 'https://bj.bcebos.com/test/readme.txt?foo=bar&authorization=bce-auth-v1/xxxxxxxxxxxxxxxxxxxxxxxx'
```
