import OpenAI from 'openai';
import { HttpException } from '@nestjs/common';
import { createResponsesAdapter } from './responses.adapter';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import { ApiErrorCode } from '../../../common/errors/api-error.code';

function createMockClient() {
  return {
    responses: {
      create: jest.fn(),
    },
  } as unknown as OpenAI;
}

describe('createResponsesAdapter', () => {
  const logger = createMockLoggingService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('complete delegates to responses.create and maps thinkingContent', async () => {
    const client = createMockClient();
    (client.responses.create as jest.Mock).mockResolvedValue({
      model: 'o3-mini',
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
      'o3-mini',
      { thinkingEnabled: true },
    );

    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'o3-mini',
        reasoning: { effort: 'medium', summary: 'auto' },
      }),
    );
    expect(result.text).toBe('Answer');
    expect(result.thinkingContent).toBe('Reasoning summary');
  });

  it('maps SDK errors to HttpException', async () => {
    const client = createMockClient();
    (client.responses.create as jest.Mock).mockRejectedValue(
      new OpenAI.APIError(500, undefined, 'Server error', undefined),
    );

    const adapter = createResponsesAdapter(client, logger as never);

    await expect(
      adapter.complete(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'o3-mini',
      ),
    ).rejects.toBeInstanceOf(HttpException);

    await expect(
      adapter.complete(
        { messages: [{ role: 'user', content: 'Hi' }] },
        'o3-mini',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ApiErrorCode.PROVIDER_UNAVAILABLE,
      }),
    });
  });

  it('stream exposes thinking content from reasoning summary events', async () => {
    const client = createMockClient();
    (client.responses.create as jest.Mock).mockResolvedValue(
      (async function* () {
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
            model: 'o3-mini',
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
      inputTokens: 1,
      outputTokens: 2,
      model: 'o3-mini',
    });
  });

  it('stream exposes final tool calls from function_call_arguments.done', async () => {
    const client = createMockClient();
    (client.responses.create as jest.Mock).mockResolvedValue(
      (async function* () {
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
      {
        messages: [{ role: 'user', content: 'Weather?' }],
        tools: [{ name: 'get_weather', parameters: { type: 'object' } }],
      },
      'o3-mini',
      { thinkingEnabled: true },
    );
    for await (const _chunk of stream.textStream) {
      // consume
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
