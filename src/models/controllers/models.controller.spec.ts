jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ModelsController } from './models.controller';
import { GatewayModelsCatalogService } from '../services/gateway-models-catalog.service';
import { GatewayKeyGuard } from '../../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../../guards/smart-rate-limit-guard';
import { ApiErrorCode } from '../../common/errors/api-error.code';

describe('ModelsController', () => {
  let controller: ModelsController;
  let catalog: jest.Mocked<GatewayModelsCatalogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelsController],
      providers: [
        {
          provide: GatewayModelsCatalogService,
          useValue: { list: jest.fn(), getOne: jest.fn() },
        },
      ],
    })
      .overrideGuard(GatewayKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(ModelsController);
    catalog = module.get(GatewayModelsCatalogService);
  });

  it('list should wrap catalog.list in models envelope', () => {
    const models = [
      {
        modelAlias: 'chat-default',
        providerInstance: 'anthropic-primary',
        providerType: 'anthropic' as const,
        modelId: 'claude-sonnet',
      },
    ];
    catalog.list.mockReturnValue(models);

    expect(controller.list()).toEqual({ models });
  });

  it('getOne should return model when found', () => {
    const model = {
      modelAlias: 'chat-default',
      providerInstance: 'anthropic-primary',
      providerType: 'anthropic' as const,
      modelId: 'claude-sonnet',
    };
    catalog.getOne.mockReturnValue(model);

    expect(controller.getOne('chat-default')).toBe(model);
  });

  it('getOne should throw NotFoundException with MODEL_ALIAS_NOT_FOUND', () => {
    catalog.getOne.mockReturnValue(null);

    expect(() => controller.getOne('missing')).toThrow(NotFoundException);
    try {
      controller.getOne('missing');
    } catch (error) {
      expect((error as NotFoundException).getResponse()).toMatchObject({
        code: ApiErrorCode.MODEL_ALIAS_NOT_FOUND,
        message: 'Model alias missing not found in config',
      });
    }
  });
});
