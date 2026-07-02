import { isResponsesOnlyModel } from './openai-api-surface.models';
import type { OpenAiApiSurface } from './openai-provider.types';

export function isOpenAiChatCompletionsIncompatible(
  modelId: string,
  apiSurface: OpenAiApiSurface | undefined,
): boolean {
  if (apiSurface !== 'chat-completions') return false;
  return isResponsesOnlyModel(modelId);
}

export function formatOpenAiSurfaceCompatMessage(modelId: string): string {
  return (
    `Model "${modelId}" requires OpenAI Responses API. ` +
    `Set provider apiSurface to "auto" or "responses", or use a chat-completions model.`
  );
}
