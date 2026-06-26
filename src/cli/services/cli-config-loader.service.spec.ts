import { readFileSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CliConfigLoaderService } from './cli-config-loader.service';

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
    writeFileSync(configPath, readFixture('valid-gateway.config.yaml'), 'utf-8');

    expect(service.configExists(configPath)).toBe(true);
  });

  it('loadRawConfig should parse valid fixture YAML', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(configPath, readFixture('valid-gateway.config.yaml'), 'utf-8');

    const config = service.loadRawConfig(configPath);

    expect(config.schemaVersion).toBe(1);
    expect(config.masterKeyRef).toBe('MASTER_KEY_TEST');
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
    writeFileSync(configPath, readFixture('valid-gateway.config.yaml'), 'utf-8');

    expect(service.isBoilerplateConfig(configPath)).toBe(false);
  });

  it('loadWithEnvCheck should report missing env refs', () => {
    const configPath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(configPath, readFixture('valid-gateway.config.yaml'), 'utf-8');

    const savedMasterKey = process.env.MASTER_KEY_TEST;
    const savedApiKey = process.env.ANTHROPIC_API_KEY_TEST;
    const savedGatewayKey = process.env.GATEWAY_KEY_CLI_TEST;

    delete process.env.MASTER_KEY_TEST;
    delete process.env.ANTHROPIC_API_KEY_TEST;
    delete process.env.GATEWAY_KEY_CLI_TEST;

    try {
      const { config, missingEnvVars } = service.loadWithEnvCheck(configPath);

      expect(config.schemaVersion).toBe(1);
      expect(missingEnvVars).toEqual(
        expect.arrayContaining([
          'MASTER_KEY_TEST',
          'ANTHROPIC_API_KEY_TEST',
          'GATEWAY_KEY_CLI_TEST',
        ]),
      );
    } finally {
      if (savedMasterKey !== undefined) {
        process.env.MASTER_KEY_TEST = savedMasterKey;
      } else {
        delete process.env.MASTER_KEY_TEST;
      }
      if (savedApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY_TEST = savedApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY_TEST;
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
    writeFileSync(configPath, readFixture('valid-gateway.config.yaml'), 'utf-8');

    const savedMasterKey = process.env.MASTER_KEY_TEST;
    const savedApiKey = process.env.ANTHROPIC_API_KEY_TEST;
    const savedGatewayKey = process.env.GATEWAY_KEY_CLI_TEST;

    process.env.MASTER_KEY_TEST = 'gw_mk_test';
    process.env.ANTHROPIC_API_KEY_TEST = 'sk-test';
    process.env.GATEWAY_KEY_CLI_TEST = 'gw_test';

    try {
      const { missingEnvVars } = service.loadWithEnvCheck(configPath);
      expect(missingEnvVars).toEqual([]);
    } finally {
      if (savedMasterKey !== undefined) {
        process.env.MASTER_KEY_TEST = savedMasterKey;
      } else {
        delete process.env.MASTER_KEY_TEST;
      }
      if (savedApiKey !== undefined) {
        process.env.ANTHROPIC_API_KEY_TEST = savedApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY_TEST;
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

    writeFileSync(envPath, 'MASTER_KEY_TEST=gw_mk_test\n', 'utf-8');

    expect(service.envExists(envPath)).toBe(true);
  });
});
