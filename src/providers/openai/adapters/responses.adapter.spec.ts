import OpenAI from 'openai';
import { HttpException } from '@nestjs/common';
import { createResponsesAdapter } from './responses.adapter';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import {
  asInputTokens,
  asOutputTokens,
} from '../../../common/types/branded.types';

function createMockClient() {
  const create = jest.fn();
  const client = {
    responses: {
      create,
    },
  } as unknown as OpenAI;
  return { client, create };
}

describe('createResponsesAdapter', () => {
  const logger = createMockLoggingService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('complete delegates to responses.create and maps thinkingContent', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      model: 'gpt-5.4-mini',
      output_text: 'Answer',
      output: [
        {
          type: 'reasoning',
          id: 'rs_1',
          summary: [{ type: 'summary_text', text: 'Reasoning summary' }],
        },
      ],
      usage: { input_tokens: 4, output_tokens: 6 },
    });

    const adapter = createResponsesAdapter(client, logger as never);
    const result = await adapter.complete(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'gpt-5.4-mini',
      { thinkingEnabled: true },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.4-mini',
        reasoning: { effort: 'medium', summary: 'auto' },
      }),
    );
    expect(result.text).toBe('Answer');
    expect(result.thinkingContent).toBe('Reasoning summary');
  });

  it('complete passes metadata to responses.create when provided', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      model: 'gpt-5.4-mini',
      output_text: 'OK',
      output: [],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    const adapter = createResponsesAdapter(client, logger as never);
    await adapter.complete(
      {
        messages: [{ role: 'user', content: 'Hi' }],
        metadata: { userId: '123', sessionId: 'abc' },
      },
      'gpt-5.4-mini',
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: '123', sessionId: 'abc' },
      }),
    );
  });

  it('complete omits metadata when not provided or empty', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      model: 'gpt-5.4-mini',
      output_text: 'OK',
      output: [],
    });

    const adapter = createResponsesAdapter(client, logger as never);
    await adapter.complete(
      { messages: [{ role: 'user', content: 'Hi' }], metadata: {} },
      'gpt-5.4-mini',
    );

    expect(create).toHaveBeenCalledWith(
      expect.not.objectContaining({ metadata: expect.anything() }),
    );
  });

  it('complete passes parallel_tool_calls to responses.create', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      model: 'gpt-5.4-mini',
      output_text: 'OK',
      output: [],
    });

    const adapter = createResponsesAdapter(client, logger as never);
    await adapter.complete(
      {
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [{ name: 'get_weather', parameters: { type: 'object' } }],
      },
      'gpt-5.4-mini',
      { parallelToolCalls: false },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        parallel_tool_calls: false,
      }),
    );
  });

  it('passes AbortSignal as request options when provided', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue({
      output_text: 'Hi',
      output: [],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'gpt-5.4-mini',
    });
    const adapter = createResponsesAdapter(client, logger as never);
    const signal = new AbortController().signal;

    await adapter.complete(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'gpt-5.4-mini',
      { signal },
    );

    expect(create).toHaveBeenCalledWith(expect.any(Object), {
      signal,
    });
  });

  it('maps SDK errors to HttpException', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockRejectedValue(
      new OpenAI.APIError(500, undefined, 'Server error', undefined),
    );

    const adapter = createResponsesAdapter(client, logger as never);

    await expect(
      adapter.complete(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'gpt-5.4-mini',
      ),
    ).rejects.toBeInstanceOf(HttpException);

    await expect(
      adapter.complete(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'gpt-5.4-mini',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ApiErrorCode.PROVIDER_UNAVAILABLE,
      }),
    });
  });

  it('stream exposes thinking content from reasoning summary events', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue(
      (function* () {
        yield {
          type: 'response.reasoning_summary_text.delta',
          delta: 'Thinking ',
        };
        yield {
          type: 'response.reasoning_summary_text.done',
          text: 'Thinking done',
        };
        yield {
          type: 'response.output_text.delta',
          delta: 'Answer',
        };
        yield {
          type: 'response.completed',
          response: {
            model: 'gpt-5.4-mini',
            output: [],
            usage: { input_tokens: 1, output_tokens: 2 },
          },
        };
      })(),
    );

    const adapter = createResponsesAdapter(client, logger as never);
    const stream = adapter.stream(
      { messages: [{ role: 'user', content: 'Hi' }] },
      'o3-mini',
      { thinkingEnabled: true },
    );

    const chunks: string[] = [];
    for await (const chunk of stream.textStream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Answer']);
    await expect(stream.getThinkingContent?.()).resolves.toBe('Thinking done');
    await expect(stream.getUsageMetadata()).resolves.toEqual({
      inputTokens: asInputTokens(1),
      outputTokens: asOutputTokens(2),
      model: 'gpt-5.4-mini',
    });
  });

  it('stream exposes final tool calls from function_call_arguments.done', async function (this: void) {
    const { client, create } = createMockClient();
    create.mockResolvedValue(
      (function* () {
        yield {
          type: 'response.output_item.added',
          item: {
            type: 'function_call',
            id: 'fc_item_1',
            call_id: 'call_1',
            name: 'get_weather',
            arguments: '',
          },
        };
        yield {
          type: 'response.function_call_arguments.done',
          item_id: 'fc_item_1',
          name: 'get_weather',
          arguments: '{"city":"Warsaw"}',
        };
        yield {
          type: 'response.output_text.delta',
          delta: 'Done',
        };
        yield {
          type: 'response.completed',
          response: {
            model: 'o3-mini',
            output: [],
            status: 'completed',
          },
        };
      })(),
    );
    const adapter = createResponsesAdapter(client, logger as never);
    const stream = adapter.stream(
      { messages: [{ role: 'user', content: 'Weather?' }] },
      'o3-mini',
      { thinkingEnabled: true },
    );
    for await (const chunk of stream.textStream) {
      void chunk;
    }
    await expect(stream.getFinalToolCalls?.()).resolves.toEqual([
      {
        id: 'call_1',
        name: 'get_weather',
        arguments: '{"city":"Warsaw"}',
      },
    ]);
    await expect(stream.getStopReason?.()).resolves.toBe('tool_calls');
  });
});
