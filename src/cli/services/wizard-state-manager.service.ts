import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { CliLogger } from '../utils/cli-logger.util';
import type { WizardState } from './cli.services.types';

export enum WizardStep {
  MasterKey = 'master-key',
  Providers = 'providers',
  Models = 'models',
  Clients = 'clients',
  ServerConfig = 'server-config',
  WriteFiles = 'write-files',
  Complete = 'complete',
}

@Injectable()
export class WizardStateManager {
  private readonly STATE_FILE = '.gateway-wizard-state.json';

  async saveState(state: WizardState): Promise<void> {
    const statePath = join(process.cwd(), this.STATE_FILE);
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  async loadState(): Promise<WizardState | null> {
    const statePath = join(process.cwd(), this.STATE_FILE);

    try {
      const content = await fs.readFile(statePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      )
        return null;
      throw error;
    }
  }

  async clearState(): Promise<void> {
    const statePath = join(process.cwd(), this.STATE_FILE);
    try {
      await fs.unlink(statePath);
    } catch {}
  }

  private resolveOriginalPathFromBackup(backupPath: string): string {
    const backupFilename = basename(backupPath);
    return backupFilename.replace(/\.backup-.+$/, '');
  }

  async rollback(state: WizardState): Promise<void> {
    CliLogger.warning('Rolling back wizard changes...');
    CliLogger.blank();

    for (const file of state.files.created) {
      try {
        await fs.unlink(file);
        CliLogger.dim(` Removed: ${file}`);
      } catch {}
    }
    for (const backupPath of state.files.backedUp) {
      const originalPath = this.resolveOriginalPathFromBackup(backupPath);
      try {
        await fs.copyFile(backupPath, originalPath);
        await fs.unlink(backupPath);
        CliLogger.dim(` Restored: ${originalPath}`);
      } catch {}
    }

    await this.clearState();

    CliLogger.blank();
    CliLogger.success('Wizard changes rolled back successfully');
  }
}
