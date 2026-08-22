import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigPersistenceService } from './config-persistence.service';
import { FileManagerService } from './file-manager.service';
import { createTestGatewayConfig } from '../../common/mocks/createTestGatewayConfig';
import {
  TEST_API_KEY_REF,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';

/** js-yaml omits undefined fields on write — mirror that for disk assertions. */
function withoutUndefinedFields<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('ConfigPersistenceService', () => {
  let service: ConfigPersistenceService;
  let fileManager: FileManagerService;
  let cwd: string;
  let originalCwd: string;

  beforeEach(() => {
    fileManager = new FileManagerService();
    service = new ConfigPersistenceService(fileManager);
    cwd = mkdtempSync(join(tmpdir(), 'gateway-persist-'));
    originalCwd = process.cwd();
    process.chdir(cwd);
    writeFileSync(
      join(cwd, '.env'),
      `${TEST_API_KEY_REF}=sk-ant-test-key-for-persist\n`,
      'utf-8',
    );
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('persistConfig should write valid YAML to cwd', async () => {
    const configPath = join(cwd, 'gateway.config.yaml');
    writeFileSync(configPath, 'schemaVersion: 1\n', 'utf-8');

    const config = createTestGatewayConfig();
    const saved = await service.persistConfig(config, cwd);

    expect(saved.schemaVersion).toBe(config.schemaVersion);
    expect(saved.models).toMatchObject(config.models);

    const onDisk = await fileManager.readYaml<typeof config>(configPath);
    expect(onDisk.schemaVersion).toBe(1);
    expect(onDisk.models).toMatchObject(withoutUndefinedFields(config.models));
  });

  it('persistConfig should reject invalid config shape', async () => {
    const invalid = { schemaVersion: 1 } as Parameters<
      typeof service.persistConfig
    >[0];

    await expect(service.persistConfig(invalid, cwd)).rejects.toThrow();
  });

  it('persistConfig should create backup of existing gateway.config.yaml', async () => {
    const configPath = join(cwd, 'gateway.config.yaml');
    writeFileSync(configPath, 'schemaVersion: 1\nlegacy: true\n', 'utf-8');

    await service.persistConfig(createTestGatewayConfig(), cwd);

    const backupDir = join(cwd, 'backup');
    expect(await fileManager.fileExists(backupDir)).toBe(true);
  });

  it('persistConfig rejects config with no models at schema validation', async () => {
    const invalid = createTestGatewayConfig();
    invalid.models = {};
    await expect(service.persistConfig(invalid, cwd)).rejects.toThrow(
      /Models section must contain at least one model alias/,
    );
  });

  it('persistConfig rejects config with no active models when effective check enabled', async () => {
    const invalid = createTestGatewayConfig({
      providers: { [TEST_PROVIDER_INSTANCE_BRANDED]: { enabled: false } },
    });
    await expect(service.persistConfig(invalid, cwd)).rejects.toThrow(
      /would fail at application startup|No active models/,
    );
  });

  it('persistConfig allows skipEffectiveCheck for destructive ops', async () => {
    const configPath = join(cwd, 'gateway.config.yaml');
    writeFileSync(configPath, 'schemaVersion: 1\n', 'utf-8');

    const invalid = createTestGatewayConfig({
      providers: { [TEST_PROVIDER_INSTANCE_BRANDED]: { enabled: false } },
    });
    await expect(
      service.persistConfig(invalid, cwd, { skipEffectiveCheck: true }),
    ).resolves.toBeDefined();
  });

  it('persistConfig rejects missing provider API key by default', async () => {
    const configPath = join(cwd, 'gateway.config.yaml');
    writeFileSync(configPath, 'schemaVersion: 1\n', 'utf-8');
    writeFileSync(join(cwd, '.env'), '', 'utf-8');
    delete process.env[TEST_API_KEY_REF];

    const config = createTestGatewayConfig();
    await expect(service.persistConfig(config, cwd)).rejects.toThrow(
      /Missing API key/,
    );
  });

  it('persistConfig allows missing provider secrets when allowMissingProviderSecrets', async () => {
    const configPath = join(cwd, 'gateway.config.yaml');
    writeFileSync(configPath, 'schemaVersion: 1\n', 'utf-8');
    writeFileSync(join(cwd, '.env'), '', 'utf-8');
    delete process.env[TEST_API_KEY_REF];

    const config = createTestGatewayConfig();
    await expect(
      service.persistConfig(config, cwd, {
        allowMissingProviderSecrets: true,
      }),
    ).resolves.toBeDefined();
  });
});
