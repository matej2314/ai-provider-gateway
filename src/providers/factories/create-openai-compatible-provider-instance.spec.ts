import { createOpenAiCompatibleProviderInstance } from './create-openai-compatible-provider-instance';
import { createOpenAiProviderCore } from './create-openai-provider.core';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { asEnvRef, asProviderApiKey } from '../../common/types';

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
          apiKeyRef: asEnvRef('K'),
          apiKey: asProviderApiKey('k'),
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
          apiKeyRef: asEnvRef('OLLAMA_API_KEY'),
          apiKey: asProviderApiKey(''),
        },
        createMockLoggingService() as never,
      ),
    ).toThrow(/Missing baseUrl/);
  });

  it('delegates to createOpenAiProviderCore', () => {
    const mockLogger = createMockLoggingService();
    createOpenAiCompatibleProviderInstance(
      {
        instanceId: 'ollama-local',
        type: 'openai-compatible',
        apiKeyRef: asEnvRef('OLLAMA_API_KEY'),
        apiKey: asProviderApiKey(''),
        baseUrl: 'http://localhost:11434/v1',
      },
      mockLogger as never,
    );
    expect(mockLogger.child).toHaveBeenCalledWith({
      module: 'OpenAiCompatibleProvider',
      instanceId: 'ollama-local',
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      'OpenAI-compatible provider instance "ollama-local" created.',
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
