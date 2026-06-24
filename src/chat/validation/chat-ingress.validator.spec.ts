import { validateChatIngress } from './chat-ingress.validator';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { ChatRequestDto } from '../dto/chat-request.dto';

describe('validateChatIngress', () => {
  describe('native profile', () => {
    it('should pass with 150 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(150).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'native')).not.toThrow();
    });

    it('should fail with 151 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(151).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'native')).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ApiErrorCode.VALIDATION_FAILED,
          }),
        }),
      );
    });

    it('should fail when user content exceeds 3000 chars', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'a'.repeat(3001) }],
      };
      expect(() => validateChatIngress(dto, 'native')).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ApiErrorCode.VALIDATION_FAILED,
          }),
        }),
      );
    });

    it('should pass when tool content is 32000 chars', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'tool', content: 'a'.repeat(32000), toolCallId: 'call_1' },
        ],
      };
      expect(() => validateChatIngress(dto, 'native')).not.toThrow();
    });
  });

  describe('facade-openai profile', () => {
    it('should pass with 200 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(200).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'facade-openai')).not.toThrow();
    });

    it('should pass when user content is 100000 chars', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'a'.repeat(100000) }],
      };
      expect(() => validateChatIngress(dto, 'facade-openai')).not.toThrow();
    });

    it('should fail with 15001 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(15001).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'facade-openai')).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ApiErrorCode.VALIDATION_FAILED,
          }),
        }),
      );
    });
  });

  describe('facade-anthropic profile', () => {
    it('should pass with 200 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(200).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'facade-anthropic')).not.toThrow();
    });
  });
});
