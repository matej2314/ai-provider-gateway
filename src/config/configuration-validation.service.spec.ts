import 'reflect-metadata';
import { createTestGatewayConfig } from '../common/mocks/createTestGatewayConfig';
import {
  ConfigurationValidationService,
  assertEnabledProviderSecretsPresent,
  assertMasterKeyPresent,
  configurationValidation,
  validateEnvironment,
} from './configuration-validation.service';
import { asEnvRef } from '../common/types/branded.types';

describe('ConfigurationValidationService', () => {
  const service = new ConfigurationValidationService();

  describe('validateEnvironment', () => {
    it('accepts empty env and returns defaults', () => {
      const result = service.validateEnvironment({});
      expect(result.CACHE_ENABLED).toBe(false);
      expect(result.CACHE_BACKEND).toBe('noop');
    });
  });

  describe('assertMasterKeyPresent', () => {
    it('passes when master key env is non-empty', () => {
      expect(() =>
        service.assertMasterKeyPresent(
          { masterKeyRef: asEnvRef('MASTER_KEY') },
          { MASTER_KEY: 'gw_mk_test' },
        ),
      ).not.toThrow();
    });

    it('throws when master key is missing', () => {
      expect(() =>
        service.assertMasterKeyPresent(
          { masterKeyRef: asEnvRef('MASTER_KEY') },
          {},
        ),
      ).toThrow('[GatewayKey] Missing master key.');
    });
  });

  describe('assertEnabledProviderSecretsPresent', () => {
    it('passes when anthropic apiKeyRef is set', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });

      expect(() =>
        service.assertEnabledProviderSecretsPresent(config, {
          ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test',
        }),
      ).not.toThrow();
    });

    it('throws when enabled anthropic key is missing', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });

      expect(() =>
        service.assertEnabledProviderSecretsPresent(config, {}),
      ).toThrow(/ANTHROPIC_PRIMARY_API_KEY/);
    });

    it('throws when openai baseUrlRef env is missing', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': { enabled: false },
          'openai-primary': {
            type: 'openai',
            apiKeyRef: asEnvRef('OPENAI_API_KEY'),
            baseUrlRef: asEnvRef('OPENAI_BASE_URL'),
            enabled: true,
          },
        },
      });

      expect(() =>
        service.assertEnabledProviderSecretsPresent(config, {
          OPENAI_API_KEY: 'sk-test',
        }),
      ).toThrow(/OPENAI_BASE_URL/);
    });
  });

  describe('validateParsedGatewayConfig', () => {
    it('orchestrates master key + provider secrets', () => {
      const config = createTestGatewayConfig({
        masterKeyRef: 'MASTER_KEY',
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });

      expect(() =>
        service.validateParsedGatewayConfig(config, {
          MASTER_KEY: 'gw_mk_test',
          ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test',
        }),
      ).not.toThrow();
    });

    it('fails on missing master key before secrets are enough', () => {
      const config = createTestGatewayConfig({
        masterKeyRef: 'MASTER_KEY',
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });

      expect(() =>
        service.validateParsedGatewayConfig(config, {
          ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test',
        }),
      ).toThrow('[GatewayKey] Missing master key.');
    });
  });

  describe('module-level helpers', () => {
    it('validateEnvironment delegates to singleton', () => {
      expect(validateEnvironment({})).toEqual(
        configurationValidation.validateEnvironment({}),
      );
    });

    it('assertMasterKeyPresent delegates to singleton', () => {
      expect(() =>
        assertMasterKeyPresent({ masterKeyRef: asEnvRef('MASTER_KEY') }, {}),
      ).toThrow('[GatewayKey] Missing master key.');
    });

    it('assertEnabledProviderSecretsPresent delegates to singleton', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });
      expect(() => assertEnabledProviderSecretsPresent(config, {})).toThrow(
        /ANTHROPIC_PRIMARY_API_KEY/,
      );
    });
  });
});
