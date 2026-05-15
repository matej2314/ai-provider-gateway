import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.use(json({ limit: '1mb' }));

  app.enableShutdownHooks();

  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT, () => {
    console.log(`[Bootstrap] Gateway listening on http://localhost:${PORT}`);
  });

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down...`);

    if (isShuttingDown) {
      console.log('Already shutting down. Ignoring signal.');
      return;
    }

    isShuttingDown = true;

    try {
      await app.close();
      console.log('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      console.error(`Error during graceful shutdown: ${error}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on(
    'unhandledRejection',
    (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled rejection:', reason);
      shutdown('unhandledRejection');
    },
  );
}
bootstrap().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
