import { APIError, BCEError } from '../../../../error'
import { type RequestOptions, Stream } from '../../../../http'
import * as OpenAI from '../../../../vendors/openai'
import { APIResource } from '../../resource'

type ChatModel = 'ernie-bot-4' | 'ernie-bot-turbo' | 'ernie-bot'

type ChatErrorResponse = {
  error_code: number
  error_msg: string
}

interface ChatCompletionResponse extends Omit<ChatCompletion, 'choices' | 'model'> {
  result: string
}
const endpoints: Record<ChatModel, string> = {
  'ernie-bot': 'chat/completions',
  'ernie-bot-4': 'chat/completions_pro',
  'ernie-bot-turbo': 'chat/eb-instant',
}

const isWenXinError = (data: unknown): data is ChatErrorResponse =>
  typeof (data as ChatErrorResponse).error_code === 'number' && (data as ChatErrorResponse).error_code !== 0

export class Completions extends APIResource {
  /**
   * Creates a model response for the given chat conversation.
   */
  create(params: ChatCompletionCreateParamsNonStreaming, options?: RequestOptions): Promise<ChatCompletion>
  create(params: ChatCompletionCreateParamsStreaming, options?: RequestOptions): Promise<Stream<ChatCompletionChunk>>
  create(
    params: ChatCompletionCreateParamsBase,
    options?: RequestOptions,
  ): Promise<Stream<ChatCompletionChunk> | ChatCompletion>
  async create(
    params: ChatCompletionCreateParams,
    options?: RequestOptions,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    const { model, ...body } = params
    const endpoint = endpoints[model as ChatModel]

    if (!endpoint) throw new BCEError(`暂不支持 ${model} 模型的调用`)

    const raw = (await this.post(endpoint, { body, ...options, stream: body.stream ?? false })) as
      | ChatCompletionResponse
      | ChatErrorResponse
      | Stream<ChatCompletionChunk>

    if (raw instanceof Stream) return raw

    if (isWenXinError(raw)) {
      throw APIError.generate(403, new Error(raw.error_msg))
    }

    const { result, ...rest } = raw

    const choice: OpenAI.Chat.ChatCompletion.Choice = {
      index: 0,
      finish_reason: 'stop',
      message: {
        content: result,
        role: 'assistant',
      },
    }

    return {
      ...rest,
      model: model,
      choices: [choice],
    }
  }
}

export type ChatCompletion = OpenAI.Chat.ChatCompletion

export type ChatCompletionChunk = OpenAI.Chat.ChatCompletionChunk

export type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming

export type ChatCompletionCreateParamsBase = OpenAI.Chat.ChatCompletionCreateParamsBase<ChatModel>

export type ChatCompletionCreateParamsNonStreaming = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming<ChatModel>

export type ChatCompletionCreateParamsStreaming = OpenAI.Chat.ChatCompletionCreateParamsStreaming<ChatModel>
