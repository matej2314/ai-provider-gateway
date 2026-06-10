import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { createOpenApiDocument } from './swagger.setup';
import {
  OPENAPI_OUTPUT_FILENAME,
  OPENAPI_SPEC_VERSION,
} from './swagger.constants';
import { PORT, API_GLOBAL_PREFIX } from '../setup.app';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  const document = createOpenApiDocument(app, PORT);
  document.openapi = OPENAPI_SPEC_VERSION;

  const outputPath = join(process.cwd(), OPENAPI_OUTPUT_FILENAME);
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf-8');

  await app.close();
  console.log(`OpenAPI spec exported to ${outputPath}`);
}

exportOpenApi().catch((error: unknown) => {
  console.error('Failed to export OpenApi Spec: ', error);
  process.exit(1);
});
