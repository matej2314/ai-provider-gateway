import { GatewayProviderType } from 'src/config/provider-types';
import { GatewayClientType } from 'src/config/configuration.types';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { EnvTemplateInput } from './env.template';
import {
  isThinkingCapableModel,
  getRecommendedMaxOutputTokens,
} from '../constants/thinking-capable-models';

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

  const providerTypeMap = new Map(
    input.providers.map((provider) => [provider.id, provider.type]),
  );

  const models = Object.fromEntries(
    input.models.map((model) => {
      const providerType = providerTypeMap.get(model.providerInstance);
      const supportsThinking =
        providerType && isThinkingCapableModel(model.modelId, providerType);
      const recommendedMaxTokens = providerType
        ? getRecommendedMaxOutputTokens(model.modelId, providerType)
        : 1024;
      return [
        model.alias,
        {
          providerInstance: model.providerInstance,
          modelId: model.modelId,
          capabilities: {
            streaming: true,
            ...(supportsThinking && { thinking: true }),
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
                maxOutputTokens: recommendedMaxTokens,
                ...(supportsThinking && { thinkingEnabled: false }),
              },
              allowOverrides: [
                'temperature',
                'maxOutputTokens',
                'topP',
                'topK',
                'stop',
                'frequencyPenalty',
                'presencePenalty',
                'seed',
                'responseFormat',
                'thinkingEnabled',
                'thinkingBudget',
              ],
              bounds: {
                temperature: { min: 0, max: 2 },
                maxOutputTokens: {
                  min: 1,
                  max: supportsThinking ? 16384 : 8192,
                },
                topP: { min: 0, max: 1 },
                frequencyPenalty: { min: -2, max: 2 },
                presencePenalty: { min: -2, max: 2 },
              },
            },
          },
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
