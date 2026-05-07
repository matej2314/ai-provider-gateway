import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

const GatewayConfigSchema = z.object({
  schemaVersion: z.number().int().min(1),
  providers: z.record(
    z.string(),
    z.object({
      type: z.enum(['anthropic', 'google']),
      apiKeyRef: z.string(),
    }),
  ),
  models: z.record(
    z.string(),
    z.object({
      providerInstance: z.string(),
      modelId: z.string(),
      capabilities: z.object({
        streaming: z.boolean(),
      }),
      policy: z.object({
        timeoutMs: z.number().int().min(1),
        retry: z.object({
          maxAttempts: z.number().int().min(1),
          onStatus: z.array(z.number().int().min(1)),
        }),
        params: z.object({
          defaults: z.object({
            temperature: z.number().min(0).max(2),
            maxOutputTokens: z.number().int().min(1),
          }),
          allowOverrides: z.array(z.string()),
          bounds: z.object({
            temperature: z.object({
              min: z.number().min(0),
              max: z.number().max(2),
            }),
            maxOutputTokens: z.object({
              min: z.number().min(1),
              max: z.number().max(8192),
            }),
          }),
        }),
      }),
    }),
  ),
});

export default () => {
  const configPath = join(process.cwd(), 'gateway.config.yaml');
  let gatewayConfig;

  try {
    const fileContents = readFileSync(configPath, 'utf8');
    const parsedYaml = yaml.load(fileContents);

    const validationResult = GatewayConfigSchema.safeParse(parsedYaml);


    if (!validationResult.success) {
      console.error('Config validation failed:', validationResult.error.flatten());
      throw new Error('Invalid configuration file');
    }

    gatewayConfig = validationResult.data;
    console.log('Config loaded successfully');

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Config file not found:', configPath);
      throw new Error('Config file not found');
    }
    throw error;
  }

  return {
    gateway: gatewayConfig,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    providers: {
      anthropic: {
        apiKey: process.env[gatewayConfig.providers['anthropic-main'].apiKeyRef] || '',
      },
      google: {
        apiKey: process.env[gatewayConfig.providers['google-main'].apiKeyRef] || '',
      },
    }
  }
}
