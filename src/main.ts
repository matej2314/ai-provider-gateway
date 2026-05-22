import 'dotenv/config';
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';
import { LoggingService } from './logging/logging.service';
import { join } from 'path';
import { readFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggingService);
  app.setGlobalPrefix('api/v1');

  const openApiPath = join(process.cwd(), 'openapi.json');
  const document = JSON.parse(readFileSync(openApiPath, 'utf8'));

  SwaggerModule.setup('api-docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'api-docs/swagger.json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(json({ limit: '1mb' }));

  app.enableShutdownHooks();

  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT, () => {
    logger.info(`[Bootstrap] Gateway listening on http://localhost:${PORT}`);
  });

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down...`);

    if (isShuttingDown) {
      logger.info('Already shutting down. Ignoring signal.');
      return;
    }

    isShuttingDown = true;

    try {
      await app.close();
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during graceful shutdown: ${error}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      logger.error(`Unhandled rejection: ${reason}`);
      shutdown('unhandledRejection');
    },
  );
}
bootstrap().catch((error) => {
  console.error(`Fatal error during startup: ${error}`);
  process.exit(1);
});
