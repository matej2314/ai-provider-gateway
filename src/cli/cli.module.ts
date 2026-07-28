import { Module } from '@nestjs/common';
import { GatewayCommand } from './gateway.command';
import { FileManagerService } from './services/file-manager.service';
import { CliConfigLoaderService } from './services/cli-config-loader.service';
import { WizardStateManager } from './services/wizard-state-manager.service';
import { WizardOrchestratorService } from './services/wizard-orchestrator.service';
import { KeyGeneratorService } from './services/key-generator.service';
import { ConfigGeneratorService } from './services/config-generator.service';
import { ConfigInitCommand } from './commands/config/config-init.command';
import { ConfigSecretsStatusCommand } from './commands/config/config-secrets-status.command';

import { KeyPromptService } from './services/prompts/key-prompt.service';
import { ProviderPromptService } from './services/prompts/provider-prompt.service';
import { ModelPromptService } from './services/prompts/model-prompt.service';
import { ClientPromptService } from './services/prompts/client-prompt.service';
import { ClientManagerService } from './services/client-manager.service';
import { ServerPromptService } from './services/prompts/server-prompt.service';
import { ConfigValidateCommand } from './commands/config/config-validate.command';
import { ConfigShowCommand } from './commands/config/config-show.command';
import { ConfigPersistenceService } from './services/config-persistence.service';
import { CliGatewayValidatorService } from './services/cli-gateway-validator.service';
import { ProviderListCommand } from './commands/provider/provider-list.command';
import { ProviderTestCommand } from './commands/provider/provider-test.command';
import { ProviderTestService } from './services/provider-test.service';
import { EnvPatchService } from './services/env-patch.service';
import { ProviderManagerService } from './services/provider-manager.service';
import { ProviderAddCommand } from './commands/provider/provider-add.command';
import { ProviderRemoveCommand } from './commands/provider/provider-remove.command';
import { ProviderEditCommand } from './commands/provider/provider-edit.command';
import { ModelManagerService } from './services/model-manager.service';
import { ModelAddCommand } from './commands/model/model-add.command';
import { ModelListCommand } from './commands/model/model-list.command';
import { ModelRemoveCommand } from './commands/model/model-remove.command';
import { ModelEditCommand } from './commands/model/model-edit.command';
import { ClientAddCommand } from './commands/client/client-add.command';
import { ClientListCommand } from './commands/client/client-list.command';
import { ClientEditCommand } from './commands/client/client-edit.command';
import { ClientRemoveCommand } from './commands/client/client-remove.command';
import { KeyGenerateCommand } from './commands/key/key-generate.command';

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
    ClientManagerService,
    ClientAddCommand,
    ClientListCommand,
    ClientEditCommand,
    ClientRemoveCommand,
    ServerPromptService,
    WizardOrchestratorService,
    ConfigInitCommand,
    ConfigValidateCommand,
    ConfigShowCommand,
    ConfigSecretsStatusCommand,
    ProviderListCommand,
    ProviderTestCommand,
    ProviderTestService,
    EnvPatchService,
    ConfigPersistenceService,
    CliGatewayValidatorService,
    ProviderManagerService,
    ProviderAddCommand,
    ProviderRemoveCommand,
    ProviderEditCommand,
    ModelAddCommand,
    ModelListCommand,
    ModelRemoveCommand,
    ModelEditCommand,
    KeyGenerateCommand,
  ],
  exports: [GatewayCommand],
})
export class CliModule {}
