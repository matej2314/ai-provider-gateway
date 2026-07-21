import 'dotenv/config';
import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingService } from './logging/logging.service';
import helmet from 'helmet';
import { setupSwagger } from './swagger/swagger.setup';
import { setupApp, PORT } from './setup.app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggingService);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  setupApp(app);
  setupSwagger(app, { logger, port: PORT });

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
    } catch (error: unknown) {
      logger.error(
        `Error during graceful shutdown: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error);
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(`Unhandled rejection: ${String(reason)}`);
    void shutdown('unhandledRejection');
  });
}
void bootstrap().catch((error: unknown) => {
  console.error(
    `Fatal error during startup: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
