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
  // Graphify's JSON AST extractor skips data-shaped JSON unless the root has
  // $schema / $ref / compilerOptions. OpenAPI 3.1 is JSON Schema-based; this
  // dialect URI makes the exported spec indexable in graphify-out.
  const exported = {
    $schema: 'https://spec.openapis.org/oas/3.1/schema/2022-10-07',
    ...document,
  };

  const outputPath = join(process.cwd(), OPENAPI_OUTPUT_FILENAME);
  writeFileSync(outputPath, `${JSON.stringify(exported, null, 2)}\n`, 'utf-8');

  await app.close();
  console.log(`OpenAPI spec exported to ${outputPath}`);
}

exportOpenApi().catch((error: unknown) => {
  console.error('Failed to export OpenApi Spec: ', error);
  process.exit(1);
});
