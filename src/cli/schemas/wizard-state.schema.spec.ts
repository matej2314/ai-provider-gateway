import { parseWizardState } from './wizard-state.schema';
import { WizardStep } from '../constants/wizard-steps';
import {
  asEnvRef,
  asProviderApiKey,
  type EnvRef,
  type GatewayKey,
  type ProviderApiKey,
} from '../../common/types/branded.types';

describe('parseWizardState', () => {
  it('parses valid state', () => {
    const raw = {
      sessionId: 'test',
      startedAt: new Date().toISOString(),
      currentStep: WizardStep.MasterKey,
      completedSteps: [],
      data: {},
      files: { created: [], backedUp: [] },
    };
    expect(parseWizardState(raw)).not.toBeNull();
  });

  it('returns null for invalid currentStep', () => {
    expect(
      parseWizardState({
        sessionId: 'x',
        startedAt: 'x',
        currentStep: 'invalid',
        completedSteps: [],
        data: {},
        files: { created: [], backedUp: [] },
      }),
    ).toBeNull();
  });
});

describe('WizardState Branded Types Conversion', () => {
  it('should convert plain strings to branded types in parseWizardState()', () => {
    const raw = {
      sessionId: 'session-123',
      startedAt: '2026-01-01T00:00:00Z',
      currentStep: 'providers',
      completedSteps: [],
      data: {
        masterKey: 'master-key-123',
        providers: [
          {
            id: 'test-provider',
            type: 'anthropic',
            apiKeyRef: 'TEST_API_KEY',
            apiKey: 'sk-test-123',
          },
        ],
        models: [
          {
            alias: 'claude-sonnet',
            providerInstance: 'test-provider',
            modelId: 'claude-sonnet-4-5-20250929',
          },
        ],
        clients: [
          {
            id: 'test-client',
            name: 'Test Client',
            type: 'webapp',
            gatewayKeyRef: 'TEST_GATEWAY_KEY',
            gatewayKey: 'gk_test_123',
            rateLimit: {
              rps: 10,
              burst: 20,
              maxConcurrentStreams: 5,
            },
          },
        ],
        serverConfig: {
          port: 3000,
          nodeEnv: 'development',
          redisPort: 6379,
        },
      },
      files: {
        created: [],
        backedUp: [],
      },
    };

    const state = parseWizardState(raw);

    expect(state).toBeDefined();
    expect(state!.data.masterKey).toBeDefined();
    const masterKey: GatewayKey = state!.data.masterKey!;
    expect(masterKey).toBe('master-key-123');

    expect(state!.data.providers).toHaveLength(1);
    const provider = state!.data.providers![0];
    const apiKey: ProviderApiKey = provider.apiKey;
    expect(apiKey).toBe('sk-test-123');

    expect(state!.data.models).toHaveLength(1);
    expect(state!.data.clients).toHaveLength(1);

    const client = state!.data.clients![0];
    expect(client.rateLimit?.rps).toBe(10);
    expect(client.rateLimit?.burst).toBe(20);

    expect(state!.data.serverConfig?.port).toBe(3000);
    expect(state!.data.serverConfig?.redisPort).toBe(6379);
  });

  it('should handle optional fields in conversion', () => {
    const raw = {
      sessionId: 'session-456',
      startedAt: '2026-01-01T00:00:00Z',
      currentStep: 'server-config',
      completedSteps: [],
      data: {
        providers: [
          {
            id: 'minimal-provider',
            type: 'openai',
            apiKeyRef: 'OPENAI_KEY',
            apiKey: 'sk-openai-123',
          },
        ],
      },
      files: {
        created: [],
        backedUp: [],
      },
    };

    const state = parseWizardState(raw);

    expect(state).toBeDefined();
    expect(state!.data.providers![0].baseUrlRef).toBeUndefined();
    expect(state!.data.providers![0].baseUrl).toBeUndefined();
  });

  it('should return null for invalid structure (pre-validation)', () => {
    const invalid = {
      sessionId: 'test',
    };

    const state = parseWizardState(invalid);

    expect(state).toBeNull();
  });
});

describe('Branded Types Serialization (Template Integration)', () => {
  it('should serialize branded types to plain strings in output', () => {
    const apiKey: ProviderApiKey = asProviderApiKey('sk-test-key');
    const envRef: EnvRef = asEnvRef('TEST_API_KEY');

    const envLine = `${envRef}=${apiKey}`;

    expect(envLine).toBe('TEST_API_KEY=sk-test-key');
    expect(typeof envLine).toBe('string');
  });
});
