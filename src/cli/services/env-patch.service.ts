import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

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

  async setVar(cwd: string, key: string, value: string): Promise<void> {
    const lines = await this.readLines(cwd);
    const prefix = `${key}=`;
    let found = false;
    const next = lines.map((line) => {
      if (line.startsWith(prefix)) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });
    if (!found) next.push(`${key}=${value}`);
    await fs.writeFile(this.envPath(cwd), next.join('\n') + '\n', 'utf-8');
    }
    
    async removeVar(cwd: string, key: string): Promise<void> {
        const prefix = `${key}=`;
        const lines = await this.readLines(cwd);
        const next = lines.filter((line) => !line.startsWith(prefix));
        await fs.writeFile(this.envPath(cwd), next.join('\n') + '\n', 'utf-8');
    }
}
