import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import type {
  BaseUrl,
  EnvRef,
  GatewayKey,
  ProviderApiKey,
} from '../../common/types/branded.types';

export type EnvPatchValue = ProviderApiKey | GatewayKey | BaseUrl | string;

@Injectable()
export class EnvPatchService {
  private envPath(cwd: string) {
    return join(cwd, '.env');
  }

  async readLines(cwd: string): Promise<string[]> {
    const path = this.envPath(cwd);
    try {
      const raw = await fs.readFile(path, 'utf-8');
      return raw.split(/\r?\n/).filter((line) => line.length > 0);
    } catch {
      return [];
    }
  }

  async getVar(cwd: string, key: EnvRef): Promise<string | undefined> {
    const lines = await this.readLines(cwd);
    const prefix = `${key}=`;
    for (const line of lines) {
      if (line.startsWith(prefix)) {
        return line.slice(prefix.length);
      }
    }
    return undefined;
  }

  async setVar(cwd: string, key: EnvRef, value: EnvPatchValue): Promise<void> {
    const lines = await this.readLines(cwd);
    const prefix = `${key}=`;
    const serialized = String(value);
    let found = false;
    const next = lines.map((line) => {
      if (line.startsWith(prefix)) {
        found = true;
        return `${key}=${serialized}`;
      }
      return line;
    });
    if (!found) next.push(`${key}=${serialized}`);
    await fs.writeFile(this.envPath(cwd), next.join('\n') + '\n', 'utf-8');
  }

  async removeVar(cwd: string, key: EnvRef): Promise<void> {
    const prefix = `${key}=`;
    const lines = await this.readLines(cwd);
    const next = lines.filter((line) => !line.startsWith(prefix));
    await fs.writeFile(this.envPath(cwd), next.join('\n') + '\n', 'utf-8');
  }

  async isVarNonEmpty(cwd: string, key: EnvRef): Promise<boolean> {
    const v = await this.getVar(cwd, key);
    return Boolean(v?.trim());
  }

  async ensureVarExists(
    cwd: string,
    key: EnvRef,
    value: EnvPatchValue = '',
  ): Promise<void> {
    const existing = await this.getVar(cwd, key);
    if (existing === undefined) {
      await this.setVar(cwd, key, value);
    }
  }
}
