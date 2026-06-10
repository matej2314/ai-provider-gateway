import { Injectable } from '@nestjs/common';
import { join } from 'path';
import {
  GatewayConfig,
  GatewayConfigSchema,
} from 'src/config/gateway-config.schema';
import { FileManagerService } from './file-manager.service';
import { ValidationFormatter } from '../utils/validation-formatter.util';

@Injectable()
export class ConfigPersistenceService {
  constructor(private readonly fileManager: FileManagerService) {}

  async persistConfig(
    config: GatewayConfig,
    cwd: string,
  ): Promise<GatewayConfig> {
    const parsed = GatewayConfigSchema.safeParse(config);
    if (!parsed.success) {
      throw new Error(ValidationFormatter.formatZodError(parsed.error));
    }
    const configPath = join(cwd, 'gateway.config.yaml');
    await this.fileManager.backupFile(configPath);
    await this.fileManager.writeYaml(configPath, parsed.data);
    return parsed.data;
  }
}
