import { createOpenAiProvider } from './create-openai-provider';
import { createOpenAiProviderCore } from './create-openai-provider.core';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { asEnvRef, asProviderApiKey } from '../../common/types';
jest.mock('./create-openai-provider.core');

describe('createOpenAiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws for wrong type', () => {
    expect(() =>
      createOpenAiProvider(
        {
          instanceId: 'x',
          type: 'anthropic',
          apiKeyRef: asEnvRef('K'),
          apiKey: asProviderApiKey('k'),
        },
        createMockLoggingService() as never,
      ),
    ).toThrow(/Expected type "openai"/);
  });

  it('throws when baseUrl missing', () => {
    expect(() =>
      createOpenAiProvider(
        {
          instanceId: 'openai-main',
          type: 'openai',
          apiKeyRef: asEnvRef('OPENAI_API_KEY'),
          apiKey: asProviderApiKey(''),
        },
        createMockLoggingService() as never,
      ),
    ).toThrow(/Missing baseUrl/);
  });

  it('delegates to createOpenAiProviderCore', () => {
    createOpenAiProvider(
      {
        instanceId: 'openai-main',
        type: 'openai',
        apiKeyRef: asEnvRef('OPENAI_API_KEY'),
        apiKey: asProviderApiKey('sk-test'),
        baseUrl: 'https://api.openai.com/v1',
      },
      createMockLoggingService() as never,
    );
    expect(createOpenAiProviderCore).toHaveBeenCalledWith(
      'openai',
      expect.objectContaining({
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
      }),
      expect.anything(),
    );
  });
});
