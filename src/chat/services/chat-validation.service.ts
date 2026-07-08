import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { LoggingService } from '../../logging/logging.service';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { isToolingRequest } from '../helpers/tooling-request';
import { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import { isOpenAiReasoningRequested } from '../../providers/openai/mappers/openai-thinking-provider.mapper';
import { asProviderInstanceId } from '../../common/types/branded.types';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';

@Injectable()
export class ChatValidationService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly loggingService: LoggingService,
  ) {}

  validateTooling(
    requestBody: ChatRequestDto,
    resolved: ResolvedProviderConfig,
  ): void {
    if (!isToolingRequest(requestBody)) return;

    if (!resolved.capabilities?.tools) {
      throw new HttpException(
        {
          code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
          message: 'Tools are not supported for this model alias.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateThinking(
    resolved: ResolvedProviderConfig,
    options: ProviderCallOptions,
  ): void {
    const reasoningRequested =
      resolved.providerType === 'openai'
        ? isOpenAiReasoningRequested(options)
        : options.thinkingEnabled === true;

    if (reasoningRequested && !resolved.capabilities?.thinking) {
      throw new HttpException(
        {
          code: ApiErrorCode.THINKING_NOT_SUPPORTED,
          message: 'Extended thinking is not supported for this model alias.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateForStreaming(modelAlias: string): ResolvedProviderConfig {
    const log = this.loggingService.child({
      module: 'ChatValidationService',
      modelAlias: modelAlias,
    });

    const resolved = this.registry.resolve(modelAlias);

    if (!resolved.capabilities?.streaming) {
      log.warn('Streaming not supported for this model', {
        provider: asProviderInstanceId(resolved.providerName),
        code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          message: 'Streaming not supported for this model.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!resolved.provider.stream) {
      log.warn('Streaming adapter not implemented for this provider', {
        provider: asProviderInstanceId(resolved.providerName),
        code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          message: 'Streaming adapter not implemented for this provider.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return resolved;
  }
}
