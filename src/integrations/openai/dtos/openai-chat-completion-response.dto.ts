export type OpenAiToolCallDto = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type OpenAiChatCompletionResponseDto = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAiToolCallDto[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
