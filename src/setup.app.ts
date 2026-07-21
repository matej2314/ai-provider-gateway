import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';

export const API_GLOBAL_PREFIX = 'api/v1';
export const PORT = Number(process.env.PORT ?? 3000);

export const setupApp = (app: INestApplication) => {
  app.setGlobalPrefix(API_GLOBAL_PREFIX, {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  (app as NestExpressApplication)
    .getHttpAdapter()
    .getInstance()
    .disable('x-powered-by');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(json({ limit: '1mb' }));

  app.enableShutdownHooks();
};
