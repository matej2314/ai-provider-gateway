import { Test, TestingModule } from '@nestjs/testing';
import { ChatStreamController } from './chat-stream.controller';

describe('ChatStreamController', () => {
  let controller: ChatStreamController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatStreamController],
    }).compile();

    controller = module.get<ChatStreamController>(ChatStreamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
