import { APIResource } from '../../resource'
import * as CompletionsAPI from './completions'

export class Chat extends APIResource {
  completions: CompletionsAPI.Completions = new CompletionsAPI.Completions(this.client)
}
