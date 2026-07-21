import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { toProviderTurns, buildProviderInputForAlias } from './provider-input';
import type { ChatMessageDto } from '../dto/chat-message.dto';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ResolvedSystemPrompts } from '../../config/configuration.types';
import { asToolCallId } from '../../common/types/branded.types';
import { TEST_TOOL_CALL_ID } from '../../common/mocks/test-constants';

const resolvedPrompts: ResolvedSystemPrompts = {
  master: 'master prompt',
  main: 'main prompt',
  perModelByAlias: {},
};

function expectToolCallIdValidationError(fn: () => unknown): void {
  expect(fn).toThrow(BadRequestException);

  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Tool messages must include toolCallId',
      details: [{ field: 'messages[].toolCallId' }],
    });
  }
}

describe('toProviderTurns', () => {
  it('should map user messages', () => {
    const messages: ChatMessageDto[] = [{ role: 'user', content: 'Hello' }];

    expect(toProviderTurns(messages)).toEqual([
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('should map assistant messages without toolCalls', () => {
    const messages: ChatMessageDto[] = [
      { role: 'assistant', content: 'Hi there' },
    ];

    expect(toProviderTurns(messages)).toEqual([
      { role: 'assistant', content: 'Hi there' },
    ]);
  });

  it('should map assistant messages with toolCalls', () => {
    const toolCalls = [
      {
        id: 'call_1',
        name: 'get_weather',
        arguments: '{"city":"NYC"}',
      },
    ];
    const messages: ChatMessageDto[] = [
      { role: 'assistant', content: '', toolCalls },
    ];

    expect(toProviderTurns(messages)).toEqual([
      { role: 'assistant', content: '', toolCalls },
    ]);
  });

  it('should omit toolCalls when assistant has an empty toolCalls array', () => {
    const messages: ChatMessageDto[] = [
      { role: 'assistant', content: 'Done', toolCalls: [] },
    ];

    expect(toProviderTurns(messages)).toEqual([
      { role: 'assistant', content: 'Done' },
    ]);
  });

  it('should map tool messages with toolCallId', () => {
    const messages: ChatMessageDto[] = [
      {
        role: 'tool',
        toolCallId: 'call_123',
        content: '{"temperature":72}',
      },
    ];

    expect(toProviderTurns(messages)).toEqual([
      {
        role: 'tool',
        toolCallId: TEST_TOOL_CALL_ID,
        content: '{"temperature":72}',
      },
    ]);
  });

  it('should map a multi-turn conversation', () => {
    const messages: ChatMessageDto[] = [
      { role: 'user', content: 'What is the weather?' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            name: 'get_weather',
            arguments: '{"city":"NYC"}',
          },
        ],
      },
      {
        role: 'tool',
        toolCallId: 'call_1',
        content: '{"temperature":72}',
      },
      { role: 'assistant', content: 'It is 72°F in NYC.' },
    ];

    expect(toProviderTurns(messages)).toEqual([
      { role: 'user', content: 'What is the weather?' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            name: 'get_weather',
            arguments: '{"city":"NYC"}',
          },
        ],
      },
      {
        role: 'tool',
        toolCallId: asToolCallId('call_1'),
        content: '{"temperature":72}',
      },
      { role: 'assistant', content: 'It is 72°F in NYC.' },
    ]);
  });

  it('should throw when tool message is missing toolCallId', () => {
    const messages: ChatMessageDto[] = [{ role: 'tool', content: 'result' }];

    expectToolCallIdValidationError(() => toProviderTurns(messages));
  });

  it('should throw when tool message has empty toolCallId', () => {
    const messages: ChatMessageDto[] = [
      { role: 'tool', toolCallId: '', content: 'result' },
    ];

    expectToolCallIdValidationError(() => toProviderTurns(messages));
  });
});

describe('buildProviderInputForAlias', () => {
  it('should build provider input with mapped messages and composed system prompt', () => {
    const request: ChatRequestDto = {
      modelAlias: 'claude-sonnet-4-5',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const input = buildProviderInputForAlias(
      request,
      'claude-sonnet-4-5',
      resolvedPrompts,
    );

    expect(input.system).toBe('master prompt\n\nmain prompt');
    expect(input.messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('should propagate toolCallId validation errors from toProviderTurns', () => {
    const request: ChatRequestDto = {
      modelAlias: 'claude-sonnet-4-5',
      messages: [{ role: 'tool', content: 'result' }],
    };

    expectToolCallIdValidationError(() =>
      buildProviderInputForAlias(request, 'claude-sonnet-4-5', resolvedPrompts),
    );
  });
});
