jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnthropicModelsController } from './anthropic-models.controller';
import { AnthropicModelsCatalogService } from '../services/anthropic-models-catalog.service';
import { AnthropicApiKeyGuard } from '../guards/anthropic-api-key.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';

describe('AnthropicModelsController', () => {
  let controller: AnthropicModelsController;
  let catalog: jest.Mocked<AnthropicModelsCatalogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnthropicModelsController],
      providers: [
        {
          provide: AnthropicModelsCatalogService,
          useValue: { listModels: jest.fn(), getModel: jest.fn() },
        },
      ],
    })
      .overrideGuard(AnthropicApiKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(AnthropicModelsController);
    catalog = module.get(AnthropicModelsCatalogService);
  });

  it('list should return catalog listModels result', () => {
    const list = {
      data: [
        {
          id: 'claude-3',
          type: 'model' as const,
          display_name: 'Claude 3',
          created_at: '',
        },
      ],
      first_id: 'claude-3',
      last_id: 'claude-3',
      has_more: false,
    };
    catalog.listModels.mockReturnValue(list);

    expect(controller.list()).toBe(list);
    expect(catalog.listModels).toHaveBeenCalled();
  });

  it('getOne should return model when found', () => {
    const model = {
      id: 'claude-3-opus',
      type: 'model' as const,
      display_name: 'Claude 3 Opus',
      created_at: '2024-01-01T00:00:00.000Z',
    };
    catalog.getModel.mockReturnValue(model);

    expect(controller.getOne('claude-3-opus')).toBe(model);
  });

  it('getOne should throw NotFoundException with Anthropic message format', () => {
    catalog.getModel.mockReturnValue(null);

    expect(() => controller.getOne('missing-model')).toThrow(NotFoundException);
    try {
      controller.getOne('missing-model');
    } catch (error) {
      expect((error as NotFoundException).getResponse()).toMatchObject({
        message: 'model missing-model not found.',
      });
    }
  });
});
