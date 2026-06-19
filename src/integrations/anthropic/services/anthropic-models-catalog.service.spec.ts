jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnthropicModelsCatalogService } from './anthropic-models-catalog.service';
import { createMockConfigService } from '../../../common/mocks/createMockConfigService';

describe('AnthropicModelsCatalogService', () => {
  let service: AnthropicModelsCatalogService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnthropicModelsCatalogService,
        { provide: ConfigService, useValue: createMockConfigService() },
      ],
    }).compile();

    service = module.get(AnthropicModelsCatalogService);
    configService = module.get(ConfigService);
  });

  it('listModels should map aliases to Anthropic model DTOs with pagination', () => {
    configService.get.mockReturnValue({
      models: {
        'claude-3-opus': { providerInstance: 'anthropic-main' },
        claude_3_sonnet: { providerInstance: 'anthropic-main' },
      },
      providers: {
        'anthropic-main': {
          type: 'anthropic',
          apiKeyRef: 'anthropic-api-key',
          enabled: true,
        },
      },
    });
    const result = service.listModels();

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({
      id: 'claude-3-opus',
      type: 'model',
      display_name: 'Claude 3 Opus',
    });
    expect(result.data[1].display_name).toBe('Claude 3 Sonnet');
    expect(result.first_id).toBe('claude-3-opus');
    expect(result.last_id).toBe('claude_3_sonnet');
    expect(result.has_more).toBe(false);
    expect(result.data[0].created_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('listModels should return empty pagination when config is missing', () => {
    configService.get.mockReturnValue(undefined);

    expect(service.listModels()).toEqual({
      data: [],
      first_id: '',
      last_id: '',
      has_more: false,
    });
  });

  it('getModel should return null for unknown id (case-sensitive)', () => {
    configService.get.mockReturnValue({
      models: { 'Claude-3': {} },
      providers: {},
    });

    expect(service.getModel('Claude-3')).not.toBeNull();
    expect(service.getModel('claude-3')).toBeNull();
    expect(service.getModel('')).toBeNull();
  });

  it('toDisplayName should only split on hyphen and underscore', () => {
    configService.get.mockReturnValue({
      models: { myCustomModel: {}, 'claude--3': {} },
      providers: {},
    });

    expect(service.getModel('myCustomModel')!.display_name).toBe('MyCustomModel');
    expect(service.getModel('claude--3')!.display_name).toBe('Claude 3');
  });
});
