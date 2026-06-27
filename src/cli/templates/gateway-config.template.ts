import { GatewayProviderType } from 'src/config/provider-types';
import { GatewayClientType } from 'src/config/configuration.types';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { EnvTemplateInput } from './env.template';
import { buildClientRateLimitConfig } from '../utils/client-rate-limit.util';
import {
  buildDefaultModelCapabilities,
  buildDefaultModelPolicy,
} from '../utils/default-model-policy.util';

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
          rateLimit: buildClientRateLimitConfig(client.rateLimit),
        }),
      },
    ]),
  );

  const providerTypeMap = new Map(
    input.providers.map((provider) => [provider.id, provider.type]),
  );

  const models = Object.fromEntries(
    input.models.map((model) => {
      const providerType = providerTypeMap.get(model.providerInstance);
      if (!providerType) {
        throw new Error(
          `Unknown provider instance for model "${model.alias}": ${model.providerInstance}`,
        );
      }
      return [
        model.alias,
        {
          providerInstance: model.providerInstance,
          modelId: model.modelId,
          capabilities: buildDefaultModelCapabilities(
            model.modelId,
            providerType,
          ),
          policy: buildDefaultModelPolicy(model.modelId, providerType),
        },
      ];
    }),
  );
  return {
    schemaVersion: 1,
    masterKeyRef: input.masterKeyRef,
    providers,
    clients,
    models,
  };
}
