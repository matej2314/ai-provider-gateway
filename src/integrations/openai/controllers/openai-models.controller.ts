import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { OpenAiAuth } from '../decorators/openai-auth.decorator';
import { OpenAiModelsCatalogService } from '../services/openai-models-catalog.service';
import { OPENAI_INTEGRATION_PATH } from 'src/integrations/integrations.constants';
import { OpenAiModelsListResponseDto } from '../dtos/openai-models-list-response.dto';

@ApiTags('OpenAI API')
@ApiSecurity('BearerAuth')
@Controller(OPENAI_INTEGRATION_PATH)
@OpenAiAuth()
export class OpenAiModelsController {
  constructor(private readonly catalog: OpenAiModelsCatalogService) {}

  @Get('models')
  @ApiOperation({ summary: 'List available models (OPENAI API spec)' })
  list(): OpenAiModelsListResponseDto {
    return this.catalog.listModels();
  }

  @Get('models/:model')
  @ApiOperation({ summary: 'Get model details (OPENAI API spec)' })
  getOne(@Param('model') model: string) {
    const found = this.catalog.getModel(model);
    if (!found) {
      throw new NotFoundException({
        message: `Model ${model} does not exist.`,
      });
    }
    return found;
  }
}
