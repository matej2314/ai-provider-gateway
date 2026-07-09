import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import * as yaml from 'js-yaml';
import { CliLogger } from '../utils/cli-logger.util';

/**
 * File Manager Service - manages file operations for CLI
 */

@Injectable()
export class FileManagerService {
  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async backupFile(path: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = basename(path);
    const backupPath = join('backup', `${fileName}.backup-${timestamp}`);

    await this.ensureDir('backup');
    await fs.copyFile(path, backupPath);
    CliLogger.info(`Backup created: ${backupPath}`);

    return backupPath;
  }

  async writeYaml(path: string, data: unknown): Promise<void> {
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });
    await fs.writeFile(path, yamlContent, 'utf-8');
  }

  async readYaml<T = unknown>(path: string): Promise<T> {
    const content = await fs.readFile(path, 'utf-8');
    return yaml.load(content) as T;
  }

  async writeEnv(path: string, data: Record<string, string>): Promise<void> {
    const lines = Object.entries(data).map(([key, value]) => `${key}=${value}`);
    await fs.writeFile(path, lines.join('\n') + '\n', 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, 'utf-8');
  }

  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async readFile(path: string): Promise<string> {
    return await fs.readFile(path, 'utf-8');
  }

  async deleteFile(path: string): Promise<boolean> {
    const exists = await this.fileExists(path);
    if (!exists) {
      return false;
    }
    await fs.unlink(path);
    return true;
  }
}
