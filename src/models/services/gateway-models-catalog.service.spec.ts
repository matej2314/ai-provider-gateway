import { Test, TestingModule } from '@nestjs/testing';
import { asModelAlias } from '../../common/types/branded.types';
import { ConfigService } from '@nestjs/config';
import { GatewayModelsCatalogService } from './gateway-models-catalog.service';
import { createMockConfigService } from '../../common/mocks/createMockConfigService';

describe('GatewayModelsCatalogService', () => {
  let service: GatewayModelsCatalogService;
  let configService: jest.Mocked<ConfigService>;

  const gatewayConfig = {
    models: {
      'gemini-2.5-flash': {
        providerInstance: 'gemini-main',
        modelId: 'gemini-2.5-flash',
        capabilities: { streaming: true, tools: true },
      },
      'claude-sonnet-4-5': {
        providerInstance: 'anthropic-main',
        modelId: 'claude-sonnet-4-5-20250929',
        fallback: 'gemini-2.5-flash',
        capabilities: { streaming: true, tools: true, thinking: true },
      },
      orphan: { providerInstance: 'unknown-provider', modelId: 'orphan-id' },
    },
    providers: {
      'gemini-main': { type: 'google' },
      'anthropic-main': { type: 'anthropic' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayModelsCatalogService,
        { provide: ConfigService, useValue: createMockConfigService() },
      ],
    }).compile();

    service = module.get(GatewayModelsCatalogService);
    configService = module.get(ConfigService);
  });

  it('list should map aliases with providerType and fallback', () => {
    configService.get.mockReturnValue(gatewayConfig);

    const result = service.list();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelAlias: 'gemini-2.5-flash',
          providerInstance: 'gemini-main',
          providerType: 'google',
          modelId: 'gemini-2.5-flash',
        }),
        expect.objectContaining({
          modelAlias: 'claude-sonnet-4-5',
          providerType: 'anthropic',
          fallback: 'gemini-2.5-flash',
          capabilities: expect.objectContaining({ thinking: true }),
        }),
        expect.objectContaining({
          modelAlias: 'orphan',
          providerType: 'gateway',
        }),
      ]),
    );
  });

  it('list should throw when gateway config is missing', () => {
    configService.get.mockReturnValue(undefined);

    expect(() => service.list()).toThrow('Missing config key: gateway');
  });

  it('getOne should return null for unknown alias (case-sensitive)', () => {
    configService.get.mockReturnValue(gatewayConfig);

    expect(service.getOne(asModelAlias('gemini-2.5-flash'))?.providerType).toBe(
      'google',
    );
    expect(service.getOne(asModelAlias('GEMINI-2.5-FLASH'))).toBeNull();
    expect(service.getOne('')).toBeNull();
  });
});
