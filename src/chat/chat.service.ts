import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import {
  normalizeMessagesForProvider,
  ProviderCallOptions,
} from '../providers/interfaces/ai-provider.interface';
import { SseEvent } from './sse/sse-event.type';

@Injectable()
export class ChatService {
  constructor(private readonly registry: ProviderRegistryService) {}

  async executeChat(request: ChatRequestDto) {
    const { provider, providerName, modelId, params } = this.registry.resolve(
      request.modelAlias,
    );

    const providerInput = normalizeMessagesForProvider(request.messages);

    const options: ProviderCallOptions = {
      temperature: params?.defaults?.temperature ?? undefined,
      maxOutputTokens: params?.defaults?.maxOutputTokens ?? undefined,
    };

    const response = await provider.complete(providerInput, modelId, options);

    return {
      id: `gw_${uuidv4()}`,
      provider: providerName,
      model: modelId,
      output: {
        type: 'text',
        text: response.text,
      },
      usage: response.usage,
      requestId: `req_${uuidv4()}`,
    };
  }

  async executeStream(
    request: ChatRequestDto,
    emit: (event: SseEvent) => void,
  ): Promise<void> {
    const { provider, providerName, modelId, capabilities, params } =
      this.registry.resolve(request.modelAlias);

    if (!capabilities?.streaming) {
      throw new BadRequestException('Streaming not supported for this model');
    }

    if (!provider.stream) {
      throw new BadRequestException(
        'Streaming adapter not implemented for rhis provider',
      );
    }

    const providerInput = normalizeMessagesForProvider(request.messages);

    const options: ProviderCallOptions = {
      temperature: params?.defaults?.temperature ?? undefined,
      maxOutputTokens: params?.defaults?.maxOutputTokens ?? undefined,
    };

    const id = `gw_${uuidv4()}`;
    const requestId = `req_${uuidv4()}`;

    emit({
      name: 'meta',
      data: { id, provider: providerName, model: modelId, requestId },
    });

    const textStream = provider.stream(providerInput, modelId, options);

    for await (const textChunk of textStream) {
      emit({ name: 'delta', data: { text: textChunk } });
    }

    emit({ name: 'done', data: {} });
  }
}
