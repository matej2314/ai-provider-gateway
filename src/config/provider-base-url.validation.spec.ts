import { createTestGatewayConfig } from '../common/mocks/createTestGatewayConfig';
import {
  collectMissingBaseUrlErrors,
  resolveBaseUrlFromEnv,
} from './provider-base-url.validation';

describe('provider-base-url.validation', () => {
  describe('resolveBaseUrlFromEnv', () => {
    it('returns trimmed URL without trailing slash', () => {
      expect(
        resolveBaseUrlFromEnv('OPENAI_BASE_URL', {
          OPENAI_BASE_URL: 'https://api.openai.com/v1/',
        }),
      ).toBe('https://api.openai.com/v1');
    });

    it('returns empty for missing env', () => {
      expect(resolveBaseUrlFromEnv('OPENAI_BASE_URL', {})).toBe('');
    });
  });

  describe('collectMissingBaseUrlErrors', () => {
    it('reports missing base URL for enabled openai provider', () => {
      const config = createTestGatewayConfig({
        providers: {
          'openai-primary': {
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY',
            baseUrlRef: 'OPENAI_BASE_URL',
            enabled: true,
          },
        },
      });
      expect(collectMissingBaseUrlErrors(config, {})).toEqual([
        { instanceId: 'openai-primary', baseUrlRef: 'OPENAI_BASE_URL' },
      ]);
    });

    it('ignores anthropic providers', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
        },
      });
      expect(collectMissingBaseUrlErrors(config, {})).toEqual([]);
    });
  });
});
