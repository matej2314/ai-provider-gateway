import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ChatModule, ProvidersModule, HealthModule],
})
export class AppModule {}
