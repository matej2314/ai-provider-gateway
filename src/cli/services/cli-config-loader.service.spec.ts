import { readFileSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CliConfigLoaderService } from './cli-config-loader.service';
import {
  TEST_API_KEY_REF,
  TEST_GATEWAY_KEY,
  TEST_MASTER_KEY_REF,
} from '../../common/mocks/test-constants';
import { asEnvRef } from '../../common/types';

const FIXTURES_DIR = join(__dirname, '../../../test/fixtures/cli');

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

describe('CliConfigLoaderService', () => {
  let service: CliConfigLoaderService;
  let tempDir: string;

  beforeEach(() => {
    service = new CliConfigLoaderService();
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-cli-'));
  });

  it('configExists should return false when file is missing', () => {
    expect(service.configExists(join(tempDir, 'missing.yaml'))).toBe(false);
  });

  it('configExists should return true when file exists', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      readFixture('valid-gateway.config.yaml'),
      'utf-8',
    );

    expect(service.configExists(configPath)).toBe(true);
  });

  it('loadRawConfig should parse valid fixture YAML', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      readFixture('valid-gateway.config.yaml'),
      'utf-8',
    );

    const config = service.loadRawConfig(configPath);

    expect(config.schemaVersion).toBe(1);
    expect(config.masterKeyRef).toBe(asEnvRef(TEST_MASTER_KEY_REF));
    expect(Object.keys(config.models)).toContain('test-model');
    expect(Object.keys(config.providers)).toContain('anthropic-primary');
  });

  it('loadRawConfig should throw when file is missing', () => {
    expect(() =>
      service.loadRawConfig(join(tempDir, 'gateway.config.yaml')),
    ).toThrow(/Configuration file not found/);
  });

  it('loadRawConfig should throw on invalid YAML structure', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      'schemaVersion: 1\nmasterKeyRef: MASTER_KEY_TEST\nmodels: not-an-object\n',
      'utf-8',
    );

    expect(() => service.loadRawConfig(configPath)).toThrow(
      /validation failed/i,
    );
  });

  it('isBoilerplateConfig should detect placeholder refs', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      readFixture('boilerplate-gateway.config.yaml'),
      'utf-8',
    );

    expect(service.isBoilerplateConfig(configPath)).toBe(true);
  });

  it('isBoilerplateConfig should return false for valid config', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      readFixture('valid-gateway.config.yaml'),
      'utf-8',
    );

    expect(service.isBoilerplateConfig(configPath)).toBe(false);
  });

  it('loadWithEnvCheck should report missing env refs', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      readFixture('valid-gateway.config.yaml'),
      'utf-8',
    );

    const savedMasterKey = process.env[TEST_MASTER_KEY_REF];
    const savedApiKey = process.env[TEST_API_KEY_REF];
    const savedGatewayKey = process.env.GATEWAY_KEY_CLI_TEST;

    delete process.env[TEST_MASTER_KEY_REF];
    delete process.env[TEST_API_KEY_REF];
    delete process.env.GATEWAY_KEY_CLI_TEST;

    try {
      const { config, missingEnvVars } = service.loadWithEnvCheck(configPath);

      expect(config.schemaVersion).toBe(1);
      expect(missingEnvVars).toEqual(
        expect.arrayContaining([
          TEST_MASTER_KEY_REF,
          TEST_API_KEY_REF,
          'GATEWAY_KEY_CLI_TEST',
        ]),
      );
    } finally {
      if (savedMasterKey !== undefined) {
        process.env[TEST_MASTER_KEY_REF] = savedMasterKey;
      } else {
        delete process.env[TEST_MASTER_KEY_REF];
      }
      if (savedApiKey !== undefined) {
        process.env[TEST_API_KEY_REF] = savedApiKey;
      } else {
        delete process.env[TEST_API_KEY_REF];
      }
      if (savedGatewayKey !== undefined) {
        process.env.GATEWAY_KEY_CLI_TEST = savedGatewayKey;
      } else {
        delete process.env.GATEWAY_KEY_CLI_TEST;
      }
    }
  });

  it('loadWithEnvCheck should return empty missing list when env is complete', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(
      configPath,
      readFixture('valid-gateway.config.yaml'),
      'utf-8',
    );

    const savedMasterKey = process.env[TEST_MASTER_KEY_REF];
    const savedApiKey = process.env[TEST_API_KEY_REF];
    const savedGatewayKey = process.env.GATEWAY_KEY_CLI_TEST;

    process.env[TEST_MASTER_KEY_REF] = 'gw_mk_test';
    process.env[TEST_API_KEY_REF] = 'sk-test';
    process.env.GATEWAY_KEY_CLI_TEST = TEST_GATEWAY_KEY;

    try {
      const { missingEnvVars } = service.loadWithEnvCheck(configPath);
      expect(missingEnvVars).toEqual([]);
    } finally {
      if (savedMasterKey !== undefined) {
        process.env[TEST_MASTER_KEY_REF] = savedMasterKey;
      } else {
        delete process.env[TEST_MASTER_KEY_REF];
      }
      if (savedApiKey !== undefined) {
        process.env[TEST_API_KEY_REF] = savedApiKey;
      } else {
        delete process.env[TEST_API_KEY_REF];
      }
      if (savedGatewayKey !== undefined) {
        process.env.GATEWAY_KEY_CLI_TEST = savedGatewayKey;
      } else {
        delete process.env.GATEWAY_KEY_CLI_TEST;
      }
    }
  });

  it('envExists should reflect .env file presence in temp dir', () => {
    const envPath = join(tempDir, '.env');
    expect(service.envExists(envPath)).toBe(false);

    writeFileSync(envPath, `${TEST_MASTER_KEY_REF}=gw_mk_test\n`, 'utf-8');

    expect(service.envExists(envPath)).toBe(true);
  });
});
