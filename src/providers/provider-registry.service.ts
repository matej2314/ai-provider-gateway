import { Injectable, BadRequestException } from '@nestjs/common';
import { AIProvider } from './interfaces/ai-provider.interface';

@Injectable()
export class ProviderRegistryService {
  private providers = new Map<string, { provider: AIProvider; name: string }>();

  register() {}
  resolve() {}
  list() {}
}
