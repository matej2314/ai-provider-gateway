import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { GatewayKeyAndSmartRateLimit } from '../../common/decorators/gateway-key-and-smart-rate-limit.decorator';
import { ApiGatewayModelsErrorResponses } from '../../common/decorators/api-gateway-models-error-responses.decorator';
import { ApiRequestIdHeader } from '../../common/decorators/api-request-id-header.decorator';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { ErrorEnvelopeDto } from '../../common/dtos/error-envelope.dto';
import { GatewayModelsCatalogService } from '../services/gateway-models-catalog.service';
import { GatewayModelDto } from '../dto/gateway-model.dto';
import { ModelsListResponseDto } from '../dto/models-list-response.dto';

@ApiTags('Models')
@ApiSecurity('GatewayKeyAuth')
@Controller('models')
@GatewayKeyAndSmartRateLimit()
export class ModelsController {
  constructor(private readonly catalog: GatewayModelsCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'List available model aliases',
    description: 'Returns active model aliases from gateway.config.yaml',
  })
  @ApiOkResponse({ type: ModelsListResponseDto })
  @ApiGatewayModelsErrorResponses()
  @ApiRequestIdHeader()
  list(): ModelsListResponseDto {
    return { models: this.catalog.list() };
  }

  @Get(':modelAlias')
  @ApiOperation({ summary: 'Get model alias details' })
  @ApiParam({ name: 'modelAlias', example: 'chat-default' })
  @ApiOkResponse({ type: GatewayModelDto })
  @ApiNotFoundResponse({
    type: ErrorEnvelopeDto,
    description: 'MODEL_ALIAS_NOT_FOUND',
  })
  @ApiGatewayModelsErrorResponses()
  @ApiRequestIdHeader()
  getOne(@Param('modelAlias') modelAlias: string): GatewayModelDto {
    const model = this.catalog.getOne(modelAlias);
    if (!model) {
      throw new NotFoundException({
        code: ApiErrorCode.MODEL_ALIAS_NOT_FOUND,
        message: `Model alias ${modelAlias} not found in config`,
        details: [],
      });
    }
    return model;
  }
}
