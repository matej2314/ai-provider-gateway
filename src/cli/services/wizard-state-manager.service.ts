import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { CliLogger } from '../utils/cli-logger.util';
import { parseWizardState } from '../schemas/wizard-state.schema';
import type { WizardState } from './cli.services.types';
export {
  WizardStep,
  WIZARD_STEPS,
  WIZARD_INIT_STEPS,
} from '../constants/wizard-steps';
export type { WizardStep as WizardStepType } from '../constants/wizard-steps';

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
      const raw: unknown = JSON.parse(content);
      const state = parseWizardState(raw);
      if (!state) {
        CliLogger.warning('Wizard state file is invalid or corrupted');
        return null;
      }

      return state;
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
    } catch {
      /* intentionally ignored */
    }
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
      } catch {
        /* intentionally ignored */
      }
    }
    for (const backupPath of state.files.backedUp) {
      const originalPath = this.resolveOriginalPathFromBackup(backupPath);
      try {
        await fs.copyFile(backupPath, originalPath);
        await fs.unlink(backupPath);
        CliLogger.dim(` Restored: ${originalPath}`);
      } catch {
        /* intentionally ignored */
      }
    }

    await this.clearState();

    CliLogger.blank();
    CliLogger.success('Wizard changes rolled back successfully');
  }
}
