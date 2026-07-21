import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { OpenAiAuth } from '../decorators/openai-auth.decorator';
import { GatewayModelsCatalogService } from '../../../models/services/gateway-models-catalog.service';
import { OPENAI_INTEGRATION_PATH } from '../../../integrations/integrations.constants';
import {
  OpenAiModelsListResponseDto,
  OpenAiModelDto,
} from '../dtos/openai-models-list-response.dto';
import { ApiOpenAiErrorResponses } from '../../../common/decorators/api-openai-error-response.decorator';
import { ApiRequestIdHeader } from '../../../common/decorators/api-request-id-header.decorator';
import { OpenAiErrorResponseDto } from '../dtos/openai-error-response.dto';
import {
  mapGatewayModelToOpenAi,
  mapGatewayModelsListToOpenAi,
} from '../mappers/openai-models.mapper';

@ApiTags('OpenAI API')
@ApiSecurity('BearerAuth')
@Controller(OPENAI_INTEGRATION_PATH)
@OpenAiAuth()
export class OpenAiModelsController {
  constructor(private readonly catalog: GatewayModelsCatalogService) {}

  @Get('models')
  @ApiOperation({ summary: 'List available models (OPENAI API spec)' })
  @ApiOkResponse({ type: OpenAiModelsListResponseDto })
  @ApiOpenAiErrorResponses()
  @ApiRequestIdHeader()
  list(): OpenAiModelsListResponseDto {
    return mapGatewayModelsListToOpenAi(this.catalog.list());
  }

  @Get('models/:model')
  @ApiOperation({ summary: 'Get model details (OPENAI API spec)' })
  @ApiParam({ name: 'model', example: 'chat-default' })
  @ApiOkResponse({ type: OpenAiModelDto })
  @ApiNotFoundResponse({
    type: OpenAiErrorResponseDto,
    description: 'Model alias not found.',
  })
  @ApiOpenAiErrorResponses()
  @ApiRequestIdHeader()
  getOne(@Param('model') model: string) {
    const found = this.catalog.getOne(model);
    if (!found) {
      throw new NotFoundException({
        message: `Model ${model} does not exist.`,
      });
    }
    return mapGatewayModelToOpenAi(found);
  }
}
