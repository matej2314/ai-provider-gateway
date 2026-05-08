import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type { ResolvedSystemPrompts } from '../config/configuration';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import type {
  ProviderCallOptions,
  ProviderChatTurn,
} from '../providers/interfaces/ai-provider.interface';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SseEvent } from './sse/sse-event.type';

const SYSTEM_PROMPT_SECTION_JOINER = '\n\n';

@Injectable()
export class ChatService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly config: ConfigService,
  ) {}

  private getResolvedPrompts(): ResolvedSystemPrompts {
    const resolved = this.config.get<ResolvedSystemPrompts>(
      'systemPrompts',
    );

    if (!resolved) {
      throw new Error(
        '[ChatService] systemPromptsResolved not found in config',
      );
    }
    return resolved;
  }

  private composeSystemPrompt(
    resolved: ResolvedSystemPrompts,
    modelAlias: string,
  ): string {
    const parts: string[] = [resolved.master];
    if (resolved.main?.trim()) parts.push(resolved.main.trim());

    const perModelPrompt = resolved.perModelByAlias[modelAlias]?.trim();
    if (perModelPrompt) parts.push(perModelPrompt);
    return parts.join(SYSTEM_PROMPT_SECTION_JOINER);
  }

  private toProviderTurns(messages: ChatMessageDto[]): ProviderChatTurn[] {
    return messages
      .filter(
        (m): m is ProviderChatTurn =>
          m.role === 'user' || m.role === 'assistant',
      )
      .map((m) => ({ role: m.role, content: m.content }));
  }

  private buildProviderInput(request: ChatRequestDto) {
    const resolved = this.getResolvedPrompts();
    return {
      system: this.composeSystemPrompt(resolved, request.modelAlias),
      messages: this.toProviderTurns(request.messages),
    };
  }

  async executeChat(request: ChatRequestDto) {
    const { provider, providerName, modelId, params } = this.registry.resolve(
      request.modelAlias,
    );

    const providerInput = this.buildProviderInput(request);

    const options: ProviderCallOptions = {
      temperature: params?.defaults?.temperature ?? undefined,
      maxOutputTokens: params?.defaults.maxOutputTokens ?? undefined,
    };

    const response = await provider.complete(providerInput, modelId, options);

    return {
      id: `gw_${uuidv4()}`,
      provider: providerName,
      model: request.modelAlias,
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
        'Streaming adapter not implemented for this provider',
      );
    }

    const providerInput = this.buildProviderInput(request);

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
