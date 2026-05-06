export default () => ({
  port: process.env.PORT ?? 3000,
  nodeEnv: process.env.NODE_ENV || 'production',
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
  },
});
