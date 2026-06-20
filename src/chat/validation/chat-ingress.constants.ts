export const INGRESS_LIMITS = {
  native: {
    maxMessages: 150,
    maxContentUser: 3000,
    maxContentAssistant: 3000,
    maxContentTool: 32000,
  },
  'facade-openai': {
    maxMessages: 15000,
    maxContentUser: 128000,
    maxContentAssistant: 128000,
    maxContentTool: 128000,
  },
  'facade-anthropic': {
    maxMessages: 15000,
    maxContentUser: 128000,
    maxContentAssistant: 128000,
    maxContentTool: 128000,
  },
} as const;
