import { Module } from '@nestjs/common';
import { GatewayKeyGuard } from 'src/guards/gateway-key.guard';
import { SmartRateLimitGuard } from 'src/guards/smart-rate-limit-guard';
import { ModelsController } from './controllers/models.controller';
import { GatewayModelsCatalogService } from './services/gateway-models-catalog.service';

@Module({
  controllers: [ModelsController],
  providers: [
    GatewayModelsCatalogService,
    GatewayKeyGuard,
    SmartRateLimitGuard,
  ],
  exports: [GatewayModelsCatalogService],
})
export class ModelsModule {}
