import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  ProviderChatResponse,
  ProviderChatInput,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class AnthropicAdapter implements AIProvider {
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('providers.anthropic.apiKey');

    if (!apiKey) throw new Error('[AnthropicAdapter] API key not configured');

    this.client = new Anthropic({ apiKey });
    console.log('[AnthropicAdapter] Initialized');
  }

  async complete(
    input: ProviderChatInput,
    modelId: string,
  ): Promise<ProviderChatResponse> {
    console.log(
      `[AnthropicAdapter] Calling model: ${modelId} with ${input.messages.length} messages`,
    );

    const response = await this.client.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: input.system,
      messages: input.messages,
    });

    let text = '';

    for (const c of response.content) {
      if (c.type === 'text') text += c.text;
    }

    console.log(`[AnthropicAdapter] Response: ${text}`);

    return {
      text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
