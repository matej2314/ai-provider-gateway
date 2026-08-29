import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseCacheService } from '../../cache/response-cache.service';
import {
  isCachedChatAllowedForModelAlias,
  shouldStoreChatResponse,
} from '../helpers/cache-policy';
import { toChatCacheIdentity } from '../helpers/to-chat-cache-identity';
import { toCachedChatResponse } from '../helpers/to-cached-chat-response';
import { isToolingRequest } from '../helpers/tooling-request';
import { asModelAlias } from '../../common/types/branded.types';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import {
  SemanticCacheService,
  type SemanticStoreEmbedState,
} from '../../cache/semantic/semantic-cache.service';
import { getAppConfigOrThrow } from '../../config/typed-config';
import type { ChatResponseData } from './chat-response-builder.service';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import type { CachedChatResponse } from '../../cache/response-cache.service';
import type { ChatCacheSource } from '../../cache/types/chat-cache-source.type';
import type { ClientId, GatewayKey } from '../../common/types/branded.types';
import type { ChatRequestDto } from '../dto/chat-request.dto';

export type ChatCacheLookupResult =
  | {
      cached: CachedChatResponse;
      cacheSource: ChatCacheSource;
      embedState?: SemanticStoreEmbedState;
    }
  | {
      cached: null;
      embedState?: SemanticStoreEmbedState;
    };

@Injectable()
export class ChatCachePipelineService {
  constructor(
    private readonly cacheService: ResponseCacheService,
    private readonly config: ConfigService,
    private readonly appMetrics: AppMetricsService,
    @Optional() private readonly semanticCache?: SemanticCacheService,
  ) {}

  async getCachedIfAllowed(
    requestBody: ChatRequestDto,
    options: ProviderCallOptions,
    clientId: ClientId,
    gatewayKey: GatewayKey,
  ): Promise<ChatCacheLookupResult> {
    if (
      isToolingRequest(requestBody) ||
      !gatewayKey ||
      clientId === 'unknown'
    ) {
      return { cached: null };
    }

    const gateway = getAppConfigOrThrow(this.config, 'gateway');
    const modelAlias = requestBody.modelAlias;
    if (!isCachedChatAllowedForModelAlias(gateway, modelAlias)) {
      return { cached: null };
    }

    const alias = asModelAlias(modelAlias);
    const identity = toChatCacheIdentity(requestBody, clientId, options);
    const exact = await this.cacheService.getCachedResponse(identity);
    if (exact) {
      this.appMetrics.recordCachePipelineAccess(alias, true);
      return { cached: exact, cacheSource: 'exact' };
    }

    // Single-turn / last-user gates live in SemanticCacheService (skip metrics owner).
    if (!this.semanticCache) {
      return { cached: null };
    }

    const semantic = await this.semanticCache.lookup(identity);
    if (semantic.reply) {
      this.appMetrics.recordCachePipelineAccess(alias, true);
      return { cached: semantic.reply, cacheSource: 'semantic' };
    }
    return {
      cached: null,
      embedState: {
        vector: semantic.vector ?? undefined,
        embedAttempted: semantic.embedAttempted,
      },
    };
  }

  buildIdentityKey(
    requestBody: ChatRequestDto,
    clientId: ClientId,
    options: ProviderCallOptions,
  ) {
    return this.cacheService.buildIdentityKey(
      toChatCacheIdentity(requestBody, clientId, options),
    );
  }

  async setCachedIfAllowed(
    requestBody: ChatRequestDto,
    response: ChatResponseData,
    options: ProviderCallOptions,
    clientId: ClientId,
    gatewayKey: GatewayKey,
    embedState?: SemanticStoreEmbedState,
  ): Promise<void> {
    if (
      isToolingRequest(requestBody) ||
      !gatewayKey ||
      clientId === 'unknown'
    ) {
      return;
    }

    const gateway = getAppConfigOrThrow(this.config, 'gateway');
    if (!isCachedChatAllowedForModelAlias(gateway, requestBody.modelAlias)) {
      return;
    }

    if (!shouldStoreChatResponse(response)) {
      return;
    }

    const identity = toChatCacheIdentity(requestBody, clientId, options);
    const cached = toCachedChatResponse(response);
    await this.cacheService.setCachedResponse(identity, cached);
    // Single-turn / last-user gates live in SemanticCacheService.
    if (this.semanticCache) {
      await this.semanticCache.storeReply(
        identity,
        cached,
        embedState ?? { embedAttempted: false },
      );
    }
  }
}
