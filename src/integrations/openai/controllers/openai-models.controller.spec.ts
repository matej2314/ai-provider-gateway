jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpenAiModelsController } from './openai-models.controller';
import { OpenAiModelsCatalogService } from '../services/openai-models-catalog.service';
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';

describe('OpenAiModelsController', () => {
  let controller: OpenAiModelsController;
  let catalog: jest.Mocked<OpenAiModelsCatalogService>;
  let listModelsMock: jest.Mock;
  let getModelMock: jest.Mock;

  beforeEach(async () => {
    listModelsMock = jest.fn();
    getModelMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAiModelsController],
      providers: [
        {
          provide: OpenAiModelsCatalogService,
          useValue: { listModels: listModelsMock, getModel: getModelMock },
        },
      ],
    })
      .overrideGuard(OpenAiBearerAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(OpenAiModelsController);
    catalog = module.get(OpenAiModelsCatalogService);
  });

  it('list should return catalog listModels result', () => {
    const list = {
      object: 'list' as const,
      data: [
        {
          id: 'gpt-4',
          object: 'model' as const,
          created: 1,
          owned_by: 'openai',
        },
      ],
    };
    catalog.listModels.mockReturnValue(list);

    expect(controller.list()).toBe(list);
  });

  it('getOne should return model when found', () => {
    const model = {
      id: 'gpt-4',
      object: 'model' as const,
      created: 123,
      owned_by: 'openai',
    };
    catalog.getModel.mockReturnValue(model);

    expect(controller.getOne('gpt-4')).toBe(model);
    expect(getModelMock).toHaveBeenCalledWith('gpt-4');
  });

  it('getOne should throw NotFoundException with OpenAI message format', () => {
    catalog.getModel.mockReturnValue(null);

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
