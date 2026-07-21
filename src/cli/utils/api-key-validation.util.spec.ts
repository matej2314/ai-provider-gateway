import { validateProviderApiKey } from './api-key-validation.util';
import { asProviderApiKey } from '../../common/types/branded.types';

describe('validateProviderApiKey', () => {
  it('allows empty key for openai', () => {
    expect(validateProviderApiKey('openai', '')).toBe(true);
  });

  it('allows empty key for openai-compatible', () => {
    expect(validateProviderApiKey('openai-compatible', '')).toBe(true);
  });

  it('requires key for anthropic', () => {
    expect(validateProviderApiKey('anthropic', '')).toBe(
      'API key is required.',
    );
  });

  it('requires key for google', () => {
    expect(validateProviderApiKey('google', '')).toBe('API key is required.');
  });

  it('accepts valid anthropic key format for branding', () => {
    const raw = 'sk-ant-api03-test-key';
    expect(validateProviderApiKey('anthropic', raw)).toBe(true);
    expect(asProviderApiKey(raw)).toBe(raw);
  });

  it('accepts valid google key format for branding', () => {
    const raw = 'AIzaSyD-test-key';
    expect(validateProviderApiKey('google', raw)).toBe(true);
    expect(asProviderApiKey(raw)).toBe(raw);
  });

  it('rejects invalid anthropic key prefix', () => {
    expect(validateProviderApiKey('anthropic', 'sk-invalid')).toBe(
      'ANTHROPIC_API_KEY must start with "sk-ant-"',
    );
  });
});
