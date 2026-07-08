import request from 'supertest';
import { withE2eApp } from './helpers/create-e2e-app';
import { createE2eProviderRegistry } from './helpers/e2e-provider-registry';
import {
  createAnthropicRequestBody,
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';
import { asToolCallId } from '../../src/common/types/branded.types';

describe('Anthropic Facade Extended (E2E)', () => {
  const anthropicModel = 'claude-3-opus-20240229';

  const weatherTool = {
    name: 'get_weather',
    description: 'Get weather for a city',
    input_schema: {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    },
  };

  describe('POST /anthropic/messages with thinking', () => {
    it('should map thinking config and return thinking content block', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: anthropicModel,
            capabilities: { thinking: true },
            completeResponse: {
              text: 'Final answer',
              stopReason: 'end_turn',
              thinkingContent: 'Step by step reasoning...',
            },
          }),
        },
        async ({ app, providerRegistry }) => {
          const completeMock = jest.spyOn(
            providerRegistry.provider,
            'complete',
          );

          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.anthropicMessages)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .send(
              createAnthropicRequestBody(anthropicModel, {
                max_tokens: 4096,
                thinking: { type: 'enabled', budget_tokens: 2048 },
              }),
            )
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.content).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ type: 'thinking' }),
              expect.objectContaining({ type: 'text', text: 'Final answer' }),
            ]),
          );

          expect(completeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
              thinkingEnabled: true,
              thinkingBudget: 2048,
            }),
          );
        },
      );
    });

    it('should support adaptive thinking without budget_tokens', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: anthropicModel,
            capabilities: { thinking: true },
          }),
        },
        async ({ app, providerRegistry }) => {
          const completeMock = jest.spyOn(
            providerRegistry.provider,
            'complete',
          );

          await request(app.getHttpServer())
            .post(E2E_ROUTES.anthropicMessages)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .send(
              createAnthropicRequestBody(anthropicModel, {
                thinking: { type: 'enabled' },
              }),
            )
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(completeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
              thinkingEnabled: true,
            }),
          );
        },
      );
    });
  });

  describe('POST /anthropic/messages with tools', () => {
    it('should return tool_use content block', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: anthropicModel,
            completeResponse: {
              text: '',
              stopReason: 'tool_use',
              toolCalls: [
                {
                  id: asToolCallId('toolu_abc'),
                  name: 'get_weather',
                  arguments: JSON.stringify({ city: 'Wroclaw' }),
                },
              ],
            },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.anthropicMessages)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .send(
              createAnthropicRequestBody(anthropicModel, {
                tools: [weatherTool],
              }),
            )
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.content).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: 'tool_use',
                name: 'get_weather',
              }),
            ]),
          );
          expect(response.body.stop_reason).toBe('tool_use');
        },
      );
    });
  });

  describe('Streaming with thinking/tools', () => {
    it('should emit Anthropic SSE events for stream request', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: anthropicModel,
            capabilities: { thinking: true },
            streamChunks: ['Hello'],
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.anthropicMessages)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .send(
              createAnthropicRequestBody(anthropicModel, {
                stream: true,
                max_tokens: 2048,
                thinking: { type: 'enabled', budget_tokens: 1024 },
              }),
            )
            .expect(200)
            .expect('Content-Type', /text\/event-stream/);

          expect(response.text).toContain('event: message_start');
          expect(response.text).toContain('event: message_stop');
        },
      );
    });
  });
});
