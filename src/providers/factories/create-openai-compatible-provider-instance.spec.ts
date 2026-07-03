import { createOpenAiCompatibleProviderInstance } from './create-openai-compatible-provider-instance';
import { createOpenAiProviderCore } from './create-openai-provider.core';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';

jest.mock('./create-openai-provider.core');

describe('createOpenAiCompatibleProviderInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws for wrong type', () => {
    expect(() =>
      createOpenAiCompatibleProviderInstance(
        {
          instanceId: 'x',
          type: 'openai',
          apiKeyRef: 'K',
          apiKey: 'k',
        },
        createMockLoggingService() as never,
      ),
    ).toThrow(/Expected type "openai-compatible"/);
  });

  it('throws when baseUrl missing', () => {
    expect(() =>
      createOpenAiCompatibleProviderInstance(
        {
          instanceId: 'ollama-local',
          type: 'openai-compatible',
          apiKeyRef: 'OLLAMA_API_KEY',
          apiKey: '',
        },
        createMockLoggingService() as never,
      ),
    ).toThrow(/Missing baseUrl/);
  });

  it('delegates to createOpenAiProviderCore', () => {
    createOpenAiCompatibleProviderInstance(
      {
        instanceId: 'ollama-local',
        type: 'openai-compatible',
        apiKeyRef: 'OLLAMA_API_KEY',
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
      },
      createMockLoggingService() as never,
    );
    expect(createOpenAiProviderCore).toHaveBeenCalledWith(
      'openai-compatible',
      expect.objectContaining({
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
      }),
      expect.anything(),
    );
  });
});
