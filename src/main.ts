import 'dotenv/config';
import './instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingService } from './logging/logging.service';
import { setupSwagger } from './swagger/swagger.setup';
import { setupApp, PORT } from './setup.app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggingService);

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
