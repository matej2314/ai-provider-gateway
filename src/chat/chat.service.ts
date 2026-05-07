import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { normalizeMessagesForProvider } from '../providers/interfaces/ai-provider.interface';

@Injectable()
export class ChatService {
  constructor(private readonly registry: ProviderRegistryService) {}

  async executeChat(request: ChatRequestDto) {
    console.log(`[ChatService] Request for modelAlias: ${request.modelAlias}`);
    const { provider, providerName, modelId } = this.registry.resolve(
      request.modelAlias,
    );

    const providerInput = normalizeMessagesForProvider(request.messages);

    const response = await provider.complete(providerInput, modelId);

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
}
