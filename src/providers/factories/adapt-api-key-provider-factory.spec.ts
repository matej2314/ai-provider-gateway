import { adaptApiKeyProviderFactory } from './adapt-api-key-provider-factory';
import type { ApiKeyProviderFactoryFn } from './provider-factory.types';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import {
  asEnvRef,
  asProviderApiKey,
  type ProviderApiKey,
} from '../../common/types';

describe('adaptApiKeyProviderFactory', () => {
  it('passes only apiKey to api-key factory', () => {
    const apiKeyFactory = jest.fn<
      ReturnType<ApiKeyProviderFactoryFn>,
      [ProviderApiKey, unknown]
    >();
    const adapted = adaptApiKeyProviderFactory(
      apiKeyFactory as ApiKeyProviderFactoryFn,
    );
    const logger = createMockLoggingService();

    adapted(
      {
        instanceId: 'anthropic-primary',
        type: 'anthropic',
        apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
        apiKey: asProviderApiKey('sk-ant-test'),
        baseUrl: 'https://should-be-ignored.example',
      },
      logger as never,
    );

    expect(apiKeyFactory).toHaveBeenCalledWith(
      asProviderApiKey('sk-ant-test'),
      logger,
    );
  });
});
