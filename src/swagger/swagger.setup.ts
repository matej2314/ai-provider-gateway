import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import type { LoggingService } from '../logging/logging.service';
import { HealthReadinessResponseDto } from '../health/dto/health-readiness-response.dto';
import { HealthLivenessResponseDto } from '../health/dto/health-liveness-response.dto';
import { HealthCheckItemDto } from '../health/dto/health-check-item.dto';
import { ErrorEnvelopeDto } from '../common/dtos/error-envelope.dto';
import { ChatRequestDto } from '../chat/dto/chat-request.dto';
import { ChatMessageDto } from '../chat/dto/chat-message.dto';
import { ChatParamsDto } from '../chat/dto/chat-params.dto';
import { ChatResponseDto } from '../chat/dto/chat-response.dto';
import { SseDoneUsageDto } from '../chat/dto/sse-done-payload.dto';
import { SseMetaPayloadDto } from '../chat/dto/sse-meta-payload.dto';
import { SseDeltaPayloadDto } from '../chat/dto/sse-delta-payload.dto';
import { SseDonePayloadDto } from '../chat/dto/sse-done-payload.dto';
import { ChatOutputTextDto } from '../chat/dto/chat-output-text.dto';
import { ChatUsageDto } from '../chat/dto/chat-usage.dto';
import { ChatToolingDto } from '../chat/dto/chat-tooling.dto';
import { GatewayToolCallDto } from '../common/dtos/gateway-tool-call.dto';
import { GatewayToolDefinitionDto } from '../common/dtos/gateway-tool-definition.dto';
import { GatewayNamedToolChoiceDto } from 'src/chat/dto/chat-tooling.dto';
import { GatewayNamedToolChoiceFunctionDto } from 'src/chat/dto/chat-tooling.dto';
import { OpenAiChatCompletionRequestDto } from '../integrations/openai/dtos/openai-chat-completion-request.dto';
import { OpenAiChatCompletionResponseDto } from '../integrations/openai/dtos/openai-chat-completion-response.dto';
import { OpenAiModelsListResponseDto } from '../integrations/openai/dtos/openai-models-list-response.dto';
import { OpenAiErrorResponseDto } from '../integrations/openai/dtos/openai-error-response.dto';
import { AnthropicMessagesRequestDto } from 'src/integrations/anthropic/dtos/anthropic-messages-request.dto';
import { AnthropicMessagesResponseDto } from 'src/integrations/anthropic/dtos/anthropic-messages-response.dto';
import { AnthropicModelsListResponseDto } from 'src/integrations/anthropic/dtos/anthropic-models-list-response.dto';
import { AnthropicErrorResponseDto } from 'src/integrations/anthropic/dtos/anthropic-error-response.dto';

import { OPENAPI_VERSION, SWAGGER_UI_PATH } from './swagger.constants';

const OPENAPI_EXTRA_MODELS = [
  HealthReadinessResponseDto,
  HealthLivenessResponseDto,
  HealthCheckItemDto,
  ErrorEnvelopeDto,
  ChatRequestDto,
  ChatMessageDto,
  ChatParamsDto,
  ChatResponseDto,
  SseMetaPayloadDto,
  SseDeltaPayloadDto,
  SseDonePayloadDto,
  ChatOutputTextDto,
  ChatUsageDto,
  ChatToolingDto,
  GatewayToolCallDto,
  GatewayToolDefinitionDto,
  OpenAiChatCompletionRequestDto,
  OpenAiChatCompletionResponseDto,
  OpenAiModelsListResponseDto,
  AnthropicMessagesRequestDto,
  AnthropicMessagesResponseDto,
  AnthropicModelsListResponseDto,
  OpenAiErrorResponseDto,
  AnthropicErrorResponseDto,
  GatewayNamedToolChoiceDto,
  GatewayNamedToolChoiceFunctionDto,
  SseDoneUsageDto,
] as const;

export type SetupSwaggerOptions = {
  logger?: Pick<LoggingService, 'info'>;
  port?: number;
};

function isSwaggerEnabled(): boolean {
  return (
    process.env.SWAGGER_ENABLED !== 'false' &&
    (process.env.NODE_ENV !== 'production' ||
      process.env.SWAGGER_ENABLED === 'true')
  );
}

function buildSwaggerConfig(port: number) {
  return new DocumentBuilder()
    .setTitle('AI Provider Gateway API')
    .setDescription(
      'REST API: chat JSON + streaming SSE. System prompt on server side. Details: `docs/pl/dokumentacja_api.md`.',
    )
    .setVersion(OPENAPI_VERSION)
    .addServer(`http://localhost:${port}`, 'Localhost')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Gateway-Key',
        in: 'header',
        description:
          'Client key. Required for POST /chat and POST /chat/stream.',
      },
      'GatewayKeyAuth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        description:
          'OpenAI-compatible Bearer token Required for /openai/* endpopints.',
      },
      'BearerAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Anthropic API key. Required for /anthropic/* endpoints.',
      },
      'ApiKeyAuth',
    )
    .addTag('Health', 'Liveness and readiness - without X-Gateway-Key.')
    .addTag('Chat', 'Chat completions (standard + streaming SSE).')
    .addTag('OpenAI API')
    .addTag('Anthropic API')
    .build();
}

export function createOpenApiDocument(
  app: INestApplication,
  port = Number(process.env.PORT ?? 3000),
): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildSwaggerConfig(port), {
    extraModels: [...OPENAPI_EXTRA_MODELS],
  });
}

export function setupSwagger(
  app: INestApplication,
  options: SetupSwaggerOptions = {},
): void {
  if (!isSwaggerEnabled()) return;

  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const document = createOpenApiDocument(app, port);

  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'swagger.json',
    swaggerOptions: { persistAuthorization: true },
  });

  options.logger?.info(
    `[Bootstrap] Swagger documentation enabled. Access at /${SWAGGER_UI_PATH}`,
  );
}
