import { Module } from '@nestjs/common';
import { GoogleAdapter } from './google.adapter';

@Module({
  providers: [GoogleAdapter],
  exports: [GoogleAdapter],
})
export class GoogleModule {}
