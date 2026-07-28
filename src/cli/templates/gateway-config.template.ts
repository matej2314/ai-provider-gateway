import { GatewayProviderType } from 'src/config/provider-types';
import { GatewayClientType } from 'src/config/configuration.types';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { asEnvRef, asProviderInstanceId } from 'src/common/types';
import { EnvTemplateInput } from './env.template';
import { buildClientRateLimitConfig } from '../utils/client-rate-limit.util';
import {
  buildDefaultModelCapabilities,
  buildDefaultModelPolicy,
} from '../utils/default-model-policy.util';
import {
  asRateLimitRps,
  asRateLimitBurst,
  asMaxConcurrentStreams,
  EnvRef,
  ModelAlias,
  ProviderInstanceId,
  ModelId,
  asClientId,
} from '../../common/types/branded.types';

export interface ConfigTemplateInput {
  masterKeyRef: string;
  providers: Array<{
    id: string;
    type: GatewayProviderType;
    apiKeyRef: EnvRef;
    baseUrlRef?: EnvRef;
    enabled?: boolean;
  }>;
  clients: Array<{
    id: string;
    name: string;
    type: GatewayClientType;
    gatewayKeyRef: EnvRef;
    rateLimit?: {
      rps: number;
      burst: number;
      maxConcurrentStreams?: number;
    };
  }>;
  models: Array<{
    alias: ModelAlias;
    providerInstance: ProviderInstanceId;
    modelId: ModelId;
  }>;
  envInput: EnvTemplateInput;
}

export function generateGatewayConfigTemplate(
  input: ConfigTemplateInput,
): Partial<GatewayConfig> {
  const providers = Object.fromEntries(
    input.providers.map((provider) => [
      asProviderInstanceId(provider.id),
      {
        type: provider.type,
        apiKeyRef: asEnvRef(provider.apiKeyRef),
        enabled: provider.enabled !== false,
        baseUrlRef: provider.baseUrlRef
          ? asEnvRef(provider.baseUrlRef)
          : undefined,
      },
    ]),
  );

  const clients = Object.fromEntries(
    input.clients.map((client) => [
      asClientId(client.id),
      {
        name: client.name,
        type: client.type,
        gatewayKeyRef: asEnvRef(client.gatewayKeyRef),
        ...(client.rateLimit && {
          rateLimit: buildClientRateLimitConfig({
            rps: asRateLimitRps(client.rateLimit.rps),
            burst: asRateLimitBurst(client.rateLimit.burst),
            maxConcurrentStreams: client.rateLimit.maxConcurrentStreams
              ? asMaxConcurrentStreams(client.rateLimit.maxConcurrentStreams)
              : undefined,
          }),
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
          providerInstance: asProviderInstanceId(model.providerInstance),
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
    masterKeyRef: asEnvRef(input.masterKeyRef),
    providers,
    clients,
    models,
  };
}
