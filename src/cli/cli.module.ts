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
import { ConfigValidateCommand } from './commands/config/config-validate.command';
import { ConfigShowCommand } from './commands/config/config-show.command';
import { ConfigPersistenceService } from './services/config-persistence.service';
import { ProviderListCommand } from './commands/provider/provider-list.command';
import { ProviderTestCommand } from './commands/provider/provider-test.command';
import { ProviderTestService } from './services/provider-test.service';
import { EnvPatchService } from './services/env-patch.service';
import { ProviderManagerService } from './services/provider-manager.service';
import { ProviderAddCommand } from './commands/provider/provider-add.command';
import { ProviderRemoveCommand } from './commands/provider/provider-remove.command';
import { ProviderEditCommand } from './commands/provider/provider-edit.command';
import { ModelManagerService } from './services/model-manager.service';

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
    ModelManagerService,
    ClientPromptService,
    ServerPromptService,
    WizardOrchestratorService,
    ConfigInitCommand,
    ConfigValidateCommand,
    ConfigShowCommand,
    ProviderListCommand,
    ProviderTestCommand,
    ProviderTestService,
    EnvPatchService,
    ConfigPersistenceService,
    ProviderManagerService,
    ProviderAddCommand,
    ProviderRemoveCommand,
    ProviderEditCommand,
  ],
  exports: [GatewayCommand],
})
export class CliModule {}
