import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AnthropicAuth } from '../decorators/anthropic-auth.decorator';
import { AnthropicModelsCatalogService } from '../services/anthropic-models-catalog.service';
import { ANTHROPIC_INTEGRATION_PATH } from 'src/integrations/integrations.constants';

@ApiTags('Anthropic API')
@ApiSecurity('ApiKeyAuth')
@Controller(ANTHROPIC_INTEGRATION_PATH)
@AnthropicAuth()
export class AnthropicModelsController {
  constructor(private readonly catalog: AnthropicModelsCatalogService) {}

  @Get('models')
  @ApiOperation({ summary: 'List available models (Anthropic API spec)' })
  list() {
    return this.catalog.listModels();
  }

  @Get('models/:model')
  @ApiOperation({ summary: 'Get model default (Anthropic API)' })
  getOne(@Param('model') model: string) {
    const found = this.catalog.getModel(model);
    if (!found) {
      throw new NotFoundException({
        message: `model ${model} not found.`,
      });
    }
    return found;
  }
}
