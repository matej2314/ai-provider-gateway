import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigPersistenceService } from './config-persistence.service';
import { FileManagerService } from './file-manager.service';
import { createTestGatewayConfig } from '../../common/mocks/createTestGatewayConfig';

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
    expect(onDisk.models).toMatchObject(config.models);
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
});
