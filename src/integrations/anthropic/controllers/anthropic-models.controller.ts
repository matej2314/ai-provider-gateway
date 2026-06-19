import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AnthropicAuth } from '../decorators/anthropic-auth.decorator';
import { AnthropicModelsCatalogService } from '../services/anthropic-models-catalog.service';
import {
  AnthropicModelsListResponseDto,
  AnthropicModelDto,
} from '../dtos/anthropic-models-list-response.dto';
import { ApiAnthropicErrorResponses } from '../../../common/decorators/api-anthropic-error-response.decorator';
import { ApiRequestIdHeader } from '../../../common/decorators/api-request-id-header.decorator';
import { AnthropicErrorResponseDto } from '../dtos/anthropic-error-response.dto';
import { ANTHROPIC_INTEGRATION_PATH } from '../../../integrations/integrations.constants';

@ApiTags('Anthropic API')
@ApiSecurity('ApiKeyAuth')
@Controller(ANTHROPIC_INTEGRATION_PATH)
@AnthropicAuth()
export class AnthropicModelsController {
  constructor(private readonly catalog: AnthropicModelsCatalogService) {}

  @Get('models')
  @ApiOperation({ summary: 'List available models (Anthropic API spec)' })
  @ApiOkResponse({ type: AnthropicModelsListResponseDto })
  @ApiAnthropicErrorResponses()
  @ApiRequestIdHeader()
  list() {
    return this.catalog.listModels();
  }

  @Get('models/:model')
  @ApiOperation({ summary: 'Get model default (Anthropic API)' })
  @ApiParam({ name: 'model', example: 'chat-default' })
  @ApiOkResponse({ type: AnthropicModelDto })
  @ApiNotFoundResponse({
    type: AnthropicErrorResponseDto,
    description: 'Model alias not found.',
  })
  @ApiAnthropicErrorResponses()
  @ApiRequestIdHeader()
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
