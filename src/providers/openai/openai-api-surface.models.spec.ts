import {
  isResponsesOnlyModel,
  requestRequiresResponsesApi,
} from './openai-api-surface.models';

describe('openai-api-surface.models', () => {
  it('isResponsesOnlyModel', () => {
    expect(isResponsesOnlyModel('o3-mini')).toBe(true);
    expect(isResponsesOnlyModel('gpt-4o')).toBe(false);
  });

  it('requestRequiresResponsesApi returns false for MVP defaults', () => {
    expect(requestRequiresResponsesApi({}, { messages: [] })).toBe(false);
  });
});
