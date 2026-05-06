import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ChatModule, ProvidersModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
