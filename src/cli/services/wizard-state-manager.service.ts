import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CliLogger } from '../utils/cli-logger.util';
import type { GatewayProviderType } from 'src/config/provider-types';
import type { GatewayClientType } from 'src/config/configuration.types';

export enum WizardStep {
  MasterKey = 'master-key',
  Providers = 'providers',
  Models = 'models',
  Clients = 'clients',
  ServerConfig = 'server-config',
  WriteFiles = 'write-files',
  Complete = 'complete',
}

export interface WizardState {
  sessionId: string;
  startedAt: string;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  data: {
    masterKey?: string;
    providers?: Array<{
      id: string;
      type: GatewayProviderType;
      apiKeyRef: string;
      apiKey: string;
    }>;
    models?: Array<{
      alias: string;
      providerInstance: string;
      modelId: string;
    }>;
    clients?: Array<{
      id: string;
      name: string;
      type: GatewayClientType;
      gatewayKeyRef: string;
      gatewayKey: string;
      rateLimit?: {
        rps: number;
        burst: number;
        maxConcurrentStreams?: number;
      };
    }>;
    serverConfig?: {
      port: number;
      nodeEnv: string;
    };
  };
  files: {
    created: string[];
    backedUp: string[];
  };
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
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async clearState(): Promise<void> {
    const statePath = join(process.cwd(), this.STATE_FILE);
    try {
      await fs.unlink(statePath);
    } catch {}
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
      const originalPath = backupPath.replace(/\.backup-[^.]+$/, '');
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
