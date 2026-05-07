import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  ProviderChatInput,
  ProviderChatResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class GoogleAdapter implements AIProvider {
  private client: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('providers.google.apiKey');

    if (!apiKey) throw new Error('[GoogleAdapter] API key not configured');

    this.client = new GoogleGenAI({ apiKey });
    console.log('[GoogleAdapter] Initialized');
  }

  async complete(
    input: ProviderChatInput,
    modelId: string,
  ): Promise<ProviderChatResponse> {
    console.log(
      `[GoogleAdapter] Calling model: ${modelId} with ${input.messages.length} messages`,
    );

    const history = input.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = input.messages[input.messages.length - 1];

    const chat = this.client.chats.create({
      model: modelId,
      history,
      config: input.system?.trim()
        ? { systemInstruction: input.system.trim() }
        : undefined,
    });

    const response = await chat.sendMessage({ message: lastMessage.content });

    return {
      text: response.text ?? '',
      model: modelId,
      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
