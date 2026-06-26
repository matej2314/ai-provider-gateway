export function requireVendorApiKey(): string | undefined {
  return (
    process.env.INTEGRATION_ANTHROPIC_API_KEY?.trim() ||
    process.env.INTEGRATION_GOOGLE_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    undefined
  );
}
