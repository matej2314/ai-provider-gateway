import { GatewayProviderType } from 'src/config/provider-types';
import { GatewayClientType } from 'src/config/configuration.types';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { EnvTemplateInput } from './env.template';

export interface ConfigTemplateInput {
  masterKeyRef: string;
  providers: Array<{
    id: string;
    type: GatewayProviderType;
    apiKeyRef: string;
  }>;
  clients: Array<{
    id: string;
    name: string;
    type: GatewayClientType;
    gatewayKeyRef: string;
    rateLimit?: {
      rps: number;
      burst: number;
      maxConcurrentStreams?: number;
    };
  }>;
  models: Array<{
    alias: string;
    providerInstance: string;
    modelId: string;
  }>;
  envInput: EnvTemplateInput;
}

export function generateGatewayConfigTemplate(
  input: ConfigTemplateInput,
): Partial<GatewayConfig> {
  const providers = Object.fromEntries(
    input.providers.map((provider) => [
      provider.id,
      {
        type: provider.type,
        apiKeyRef: provider.apiKeyRef,
        enabled: true,
      },
    ]),
  );

  const clients = Object.fromEntries(
    input.clients.map((client) => [
      client.id,
      {
        name: client.name,
        type: client.type,
        gatewayKeyRef: client.gatewayKeyRef,
        ...(client.rateLimit && {
          rateLimit: {
            rps: client.rateLimit.rps,
            burst: client.rateLimit.burst,
            maxConcurrentStreams: client.rateLimit.maxConcurrentStreams ?? 3,
          },
        }),
      },
    ]),
  );

  const models = Object.fromEntries(
    input.models.map((model) => [
      model.alias,
      {
        providerInstance: model.providerInstance,
        modelId: model.modelId,
        capabilities: {
          streaming: true,
        },
        policy: {
          timeoutMs: 30000,
          retry: {
            maxAttempts: 3,
            onStatus: [429, 500, 502, 503, 504],
          },
          params: {
            defaults: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
            allowOverrides: ['temperature', 'maxOutputTokens'],
            bounds: {
              temperature: { min: 0, max: 2 },
              maxOutputTokens: { min: 1, max: 8192 },
            },
          },
        },
      },
    ]),
  );
  return {
    schemaVersion: 1,
    masterKeyRef: input.masterKeyRef,
    providers,
    clients,
    models,
  };
}
