import request from 'supertest';
import { withE2eApp } from './helpers/create-e2e-app';
import { createE2eProviderRegistry } from './helpers/e2e-provider-registry';
import {
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';
import { asToolCallId } from '../../src/common/types/branded.types';

describe('OpenAI Facade Extended (E2E)', () => {
  const openAiModel = 'gpt-4';

  const weatherTool = {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get weather',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
      },
    },
  };

  describe('POST /openai/chat/completions with tools', () => {
    it('should return tool_calls in OpenAI response format', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
            completeResponse: {
              text: '',
              stopReason: 'tool_use',
              toolCalls: [
                {
                  id: asToolCallId('call_openai_1'),
                  name: 'get_weather',
                  arguments: JSON.stringify({ city: 'Gdansk' }),
                },
              ],
            },
          }),
        },
        async ({ app, providerRegistry }) => {
          const completeMock = jest.spyOn(
            providerRegistry.provider,
            'complete',
          );

          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Weather in Gdansk?' }],
              tools: [weatherTool],
              tool_choice: 'auto',
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body).toMatchObject({
            object: 'chat.completion',
            choices: [
              expect.objectContaining({
                message: expect.objectContaining({
                  role: 'assistant',
                  tool_calls: expect.arrayContaining([
                    expect.objectContaining({
                      type: 'function',
                      function: expect.objectContaining({
                        name: 'get_weather',
                      }),
                    }),
                  ]),
                }),
                finish_reason: 'tool_calls',
              }),
            ],
          });
          expect(completeMock).toHaveBeenCalled();
        },
      );
    });
  });

  describe('POST /openai/chat/completions with reasoning_effort', () => {
    it('should map reasoning_effort to thinking params', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
            capabilities: { thinking: true },
            completeResponse: {
              text: 'Answer with reasoning',
              stopReason: 'end_turn',
              thinkingContent: 'Internal reasoning trace',
            },
          }),
        },
        async ({ app, providerRegistry }) => {
          const completeMock = jest.spyOn(
            providerRegistry.provider,
            'complete',
          );

          await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Complex question' }],
              reasoning_effort: 'medium',
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(completeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
              thinkingEnabled: true,
              thinkingBudget: 'medium',
            }),
          );
        },
      );
    });
  });

  describe('POST /openai/chat/completions with metadata', () => {
    it('should pass metadata through without error', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
          }),
        },
        async ({ app, providerRegistry }) => {
          const completeMock = jest.spyOn(
            providerRegistry.provider,
            'complete',
          );

          await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Hello' }],
              metadata: { userId: '123', sessionId: 'abc' },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(completeMock).toHaveBeenCalledWith(
            expect.objectContaining({
              metadata: { userId: '123', sessionId: 'abc' },
            }),
            expect.anything(),
            expect.anything(),
          );
        },
      );
    });
  });

  describe('Validation errors for tools', () => {
    it('should return 400 in OpenAI format when tools are invalid', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Test' }],
              tools: [{ type: 'invalid', function: { name: 'skip_me' } }],
            })
            .expect(400);

          expect(response.body).toMatchObject({
            error: {
              message: expect.stringMatching(/valid function tool/i),
              type: 'invalid_request_error',
            },
          });
        },
      );
    });
  });

  describe('Streaming with tools', () => {
    it('should stream OpenAI chunks ending with data: [DONE]', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
            streamChunks: ['Partial '],
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Hi' }],
              stream: true,
              tools: [weatherTool],
            })
            .expect(200)
            .expect('Content-Type', /text\/event-stream/);

          expect(response.text).toContain('data: ');
          expect(response.text).toContain('data: [DONE]');
        },
      );
    });
  });
});
