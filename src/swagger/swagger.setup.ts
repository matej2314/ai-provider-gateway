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
import { SseMetaPayloadDto } from '../chat/dto/sse-meta-payload.dto';
import { SseDeltaPayloadDto } from '../chat/dto/sse-delta-payload.dto';
import { SseDonePayloadDto } from '../chat/dto/sse-done-payload.dto';
import { ChatOutputTextDto } from '../chat/dto/chat-output-text.dto';
import { ChatUsageDto } from '../chat/dto/chat-usage.dto';
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
  ChatOutputTextDto,
  ChatUsageDto,
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
      'REST API: chat JSON + streaming SSE. System prompt on server side. Details: `docs/dokumentacja_api.md`.',
    )
    .setVersion('0.12.0')
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
    .addTag('Health', 'Liveness and readiness - without X-Gateway-Key.')
    .addTag('Chat', 'Chat completions (standard + streaming SSE).')
    .setVersion(OPENAPI_VERSION)
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
