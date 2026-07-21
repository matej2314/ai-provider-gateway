import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileManagerService } from './file-manager.service';
import {
  asGatewayKey,
  asProviderApiKey,
} from '../../common/types/branded.types';

describe('FileManagerService', () => {
  let service: FileManagerService;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    service = new FileManagerService();
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-file-mgr-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('fileExists should return false for missing path', async () => {
    expect(await service.fileExists(join(tempDir, 'missing.txt'))).toBe(false);
  });

  it('writeYaml and readYaml should round-trip data', async () => {
    const path = join(tempDir, 'sample.yaml');
    const payload = {
      schemaVersion: 1,
      nested: { enabled: true, tags: ['a', 'b'] },
    };

    await service.writeYaml(path, payload);
    const loaded = await service.readYaml<typeof payload>(path);

    expect(loaded).toEqual(payload);
  });

  it('writeEnv should write KEY=value lines', async () => {
    const path = join(tempDir, '.env');
    const masterKey = asGatewayKey('gw_mk_test');
    const apiKey = asProviderApiKey('sk-test');

    await service.writeEnv(path, {
      MASTER_KEY_TEST: masterKey,
      ANTHROPIC_API_KEY_TEST: apiKey,
    });

    const content = await service.readFile(path);
    expect(content).toContain('MASTER_KEY_TEST=gw_mk_test');
    expect(content).toContain('ANTHROPIC_API_KEY_TEST=sk-test');
  });

  it('writeFile and readFile should round-trip text', async () => {
    const path = join(tempDir, 'notes.txt');
    const text = 'gateway cli fixture';

    await service.writeFile(path, text);

    expect(await service.readFile(path)).toBe(text);
  });

  it('backupFile should copy source into backup directory', async () => {
    const sourcePath = join(tempDir, 'gateway.config.yaml');
    writeFileSync(sourcePath, 'schemaVersion: 1\n', 'utf-8');

    const backupPath = await service.backupFile(sourcePath);

    expect(await service.fileExists(backupPath)).toBe(true);
    expect(await service.readFile(backupPath)).toBe('schemaVersion: 1\n');
  });

  it('ensureDir should create nested directories', async () => {
    const nestedDir = join(tempDir, 'nested', 'dir');

    await service.ensureDir(nestedDir);

    expect(await service.fileExists(nestedDir)).toBe(true);
  });
});
