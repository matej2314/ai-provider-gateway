jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpenAiModelsController } from './openai-models.controller';
import { GatewayModelsCatalogService } from '../../../models/services/gateway-models-catalog.service';
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';

describe('OpenAiModelsController', () => {
  let controller: OpenAiModelsController;
  let catalog: jest.Mocked<GatewayModelsCatalogService>;

  const gatewayModel = {
    modelAlias: 'gpt-4',
    providerInstance: 'openai-main',
    providerType: 'anthropic' as const,
    modelId: 'gpt-4',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAiModelsController],
      providers: [
        {
          provide: GatewayModelsCatalogService,
          useValue: { list: jest.fn(), getOne: jest.fn() },
        },
      ],
    })
      .overrideGuard(OpenAiBearerAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(OpenAiModelsController);
    catalog = module.get(GatewayModelsCatalogService);
  });

  it('list should map catalog rows to OpenAI list format', () => {
    catalog.list.mockReturnValue([gatewayModel]);

    const result = controller.list();

    expect(result.object).toBe('list');
    expect(result.data[0]).toMatchObject({
      id: 'gpt-4',
      object: 'model',
      owned_by: 'anthropic',
    });
  });

  it('getOne should map single row when found', () => {
    catalog.getOne.mockReturnValue(gatewayModel);

    expect(controller.getOne('gpt-4')).toMatchObject({
      id: 'gpt-4',
      object: 'model',
      owned_by: 'anthropic',
    });
  });

  it('getOne should throw NotFoundException with OpenAI message format', () => {
    catalog.getOne.mockReturnValue(null);

    expect(() => controller.getOne('missing')).toThrow(NotFoundException);
    try {
      controller.getOne('missing');
    } catch (error) {
      expect((error as NotFoundException).getResponse()).toMatchObject({
        message: 'Model missing does not exist.',
      });
    }
  });
});
