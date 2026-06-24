import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiModelsCatalogService } from './openai-models-catalog.service';
import { createMockConfigService } from '../../../common/mocks/createMockConfigService';

describe('OpenAiModelsCatalogService', () => {
  let service: OpenAiModelsCatalogService;
  let configService: jest.Mocked<ConfigService>;

  const gatewayConfig = {
    models: {
      'gemini-2.5-flash': { providerInstance: 'gemini-main' },
      'claude-sonnet-4-5': { providerInstance: 'anthropic-main' },
      orphan: { providerInstance: 'unknown-provider' },
    },
    providers: {
      'gemini-main': { type: 'google' },
      'anthropic-main': { type: 'anthropic' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiModelsCatalogService,
        { provide: ConfigService, useValue: createMockConfigService() },
      ],
    }).compile();

    service = module.get(OpenAiModelsCatalogService);
    configService = module.get(ConfigService);
  });

  it('listModels should map aliases with owned_by from provider type', () => {
    configService.get.mockReturnValue(gatewayConfig);

    const result = service.listModels();

    expect(result.object).toBe('list');
    expect(result.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gemini-2.5-flash',
          owned_by: 'google',
        }),
        expect.objectContaining({
          id: 'claude-sonnet-4-5',
          owned_by: 'anthropic',
        }),
        expect.objectContaining({ id: 'orphan', owned_by: 'gateway' }),
      ]),
    );
    expect(result.data[0].created).toBeGreaterThan(0);
  });

  it('listModels should throw when gateway config is missing', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => service.listModels()).toThrow('Missing config key: gateway');
  });

  it('getModel should return null for unknown id (case-sensitive)', () => {
    configService.get.mockReturnValue(gatewayConfig);

    expect(service.getModel('gemini-2.5-flash')?.owned_by).toBe('google');
    expect(service.getModel('GEMINI-2.5-FLASH')).toBeNull();
    expect(service.getModel('')).toBeNull();
  });

  it('getModel should use gateway owned_by when provider type is missing', () => {
    configService.get.mockReturnValue({
      models: { 'model-1': { providerInstance: 'p1' } },
      providers: { p1: {} },
    });

    expect(service.getModel('model-1')!.owned_by).toBe('gateway');
  });
});
