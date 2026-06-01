import { Module } from '@nestjs/common';
import { GatewayCommand } from './gateway.command';
import { FileManagerService } from './services/file-manager.service';
import { CliConfigLoaderService } from './services/cli-config-loader.service';
import { WizardStateManager } from './services/wizard-state-manager.service';
import { WizardOrchestratorService } from './services/wizard-orchestrator.service';
import { KeyGeneratorService } from './services/key-generator.service';
import { ConfigGeneratorService } from './services/config-generator.service';
import { ConfigInitCommand } from './commands/config/config-init.command';

import { KeyPromptService } from './services/prompts/key-prompt.service';
import { ProviderPromptService } from './services/prompts/provider-prompt.service';
import { ModelPromptService } from './services/prompts/model-prompt.service';
import { ClientPromptService } from './services/prompts/client-prompt.service';
import { ServerPromptService } from './services/prompts/server-prompt.service';

@Module({
  providers: [
    GatewayCommand,
    FileManagerService,
    CliConfigLoaderService,
    KeyGeneratorService,
    WizardStateManager,
    ConfigGeneratorService,
    KeyPromptService,
    ProviderPromptService,
    ModelPromptService,
    ClientPromptService,
    ServerPromptService,
    WizardOrchestratorService,
    ConfigInitCommand,
  ],
  exports: [GatewayCommand],
})
export class CliModule {}
