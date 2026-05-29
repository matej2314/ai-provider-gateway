import { Module } from '@nestjs/common';
import { FileManagerService } from './services/file-manager.service';
import { GatewayCommand } from './gateway.command';
import { CliConfigLoaderService } from './services/cli-config-loader.service';

@Module({
  providers: [GatewayCommand, FileManagerService, CliConfigLoaderService],
  exports: [GatewayCommand],
})
export class CliModule {}
