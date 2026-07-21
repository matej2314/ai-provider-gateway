import OpenAI from 'openai';
import { HttpException } from '@nestjs/common';
import { createChatCompletionsAdapter } from './chat-completions.adapter';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import {
  asInputTokens,
  asOutputTokens,
} from '../../../common/types/branded.types';

function createMockClient() {
  const create = jest.fn();
  const client = {
    chat: {
      completions: {
        create,
      },
    },
  } as unknown as OpenAI;
  return { client, create };
}

describe('createChatCompletionsAdapter', () => {
  const logger = createMockLoggingService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('complete delegates to chat.completions.create and maps response', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      id: 'cmpl_1',
      model: 'gpt-4o',
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'Hello' },
        },
      ],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
    });

    const adapter = createChatCompletionsAdapter(client, logger as never);
    const result = await adapter.complete(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'gpt-4o',
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        thinking: { type: 'disabled' },
      }),
    );
    expect(result.text).toBe('Hello');
    expect(result.usage).toEqual({
      inputTokens: asInputTokens(3),
      outputTokens: asOutputTokens(2),
    });
  });

  it('passes AbortSignal as request options when provided', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      choices: [
        {
          message: { role: 'assistant', content: 'Hi' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      model: 'gpt-4o',
    });
    const adapter = createChatCompletionsAdapter(client, logger as never);
    const signal = new AbortController().signal;

    await adapter.complete(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'gpt-4o',
      { signal },
    );

    expect(create).toHaveBeenCalledWith(expect.any(Object), { signal });
  });

  it('maps SDK errors to HttpException', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockRejectedValue(
      new OpenAI.APIError(429, undefined, 'Rate limited', undefined),
    );

    const adapter = createChatCompletionsAdapter(client, logger as never);

    await expect(
      adapter.complete(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'gpt-4o',
      ),
    ).rejects.toBeInstanceOf(HttpException);

    await expect(
      adapter.complete(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'gpt-4o',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ApiErrorCode.PROVIDER_RATE_LIMITED,
      }),
    });
  });

  it('stream yields text deltas and exposes final tool calls', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue(
      (function* () {
        yield {
          model: 'gpt-4o',
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'fn', arguments: '' },
                  },
                ],
              },
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '{"a":1}' } }],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 2 },
        };
      })(),
    );

    const adapter = createChatCompletionsAdapter(client, logger as never);
    const stream = adapter.stream(
      {
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [{ name: 'fn', parameters: { type: 'object', properties: {} } }],
      },
      'gpt-4o',
    );

    const chunks: string[] = [];
    for await (const chunk of stream.textStream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([]);
    await expect(stream.getFinalToolCalls?.()).resolves.toEqual([
      { id: 'call_1', name: 'fn', arguments: '{"a":1}' },
    ]);
    await expect(stream.getStopReason?.()).resolves.toBe('tool_calls');
  });

  it('stream omits stream_options by default (openai-compatible path)', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue(
      (function* () {
        yield {
          choices: [{ delta: { content: 'Hi' } }],
        };
      })(),
    );

    const adapter = createChatCompletionsAdapter(client, logger as never);
    const stream = adapter.stream(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'llama3',
    );

    for await (const chunk of stream.textStream) {
      void chunk;
    }

    expect(create).toHaveBeenCalledWith(
      expect.not.objectContaining({ stream_options: expect.anything() }),
    );
  });

  it('stream sends stream_options when includeStreamUsage is true', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue(
      (function* () {
        yield {
          choices: [{ delta: { content: 'Hi' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        };
      })(),
    );

    const adapter = createChatCompletionsAdapter(client, logger as never, {
      includeStreamUsage: true,
    });
    const stream = adapter.stream(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'gpt-4o',
    );

    for await (const chunk of stream.textStream) {
      void chunk;
    }

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        stream_options: { include_usage: true },
      }),
    );
    await expect(stream.getUsageMetadata()).resolves.toEqual({
      inputTokens: asInputTokens(1),
      outputTokens: asOutputTokens(1),
      model: 'gpt-4o',
    });
  });
});
