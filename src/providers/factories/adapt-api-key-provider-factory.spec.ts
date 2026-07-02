import { adaptApiKeyProviderFactory } from './adapt-api-key-provider-factory';
import type { ApiKeyProviderFactoryFn } from './provider-factory.types';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';

describe('adaptApiKeyProviderFactory', () => {
  it('passes only apiKey to api-key factory', () => {
    const apiKeyFactory = jest.fn<
      ReturnType<ApiKeyProviderFactoryFn>,
      [string, unknown]
    >();
    const adapted = adaptApiKeyProviderFactory(
      apiKeyFactory as ApiKeyProviderFactoryFn,
    );
    const logger = createMockLoggingService();

    adapted(
      {
        instanceId: 'anthropic-primary',
        type: 'anthropic',
        apiKeyRef: 'ANTHROPIC_API_KEY',
        apiKey: 'sk-ant-test',
        baseUrl: 'https://should-be-ignored.example',
      },
      logger as never,
    );

    expect(apiKeyFactory).toHaveBeenCalledWith('sk-ant-test', logger);
  });
});
