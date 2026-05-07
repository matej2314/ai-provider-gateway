import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './interfaces/ai-provider.interface';

interface ResolvedAlias {
  provider: AIProvider;
  providerName: string;
  modelId: string;
}

@Injectable()
export class ProviderRegistryService {
  private providers = new Map<string, { provider: AIProvider; name: string }>();

  constructor(private configService: ConfigService) {}

  register(providerName: string, provider: AIProvider) {
    this.providers.set(providerName, { provider, name: providerName });
  }

  resolve(modelAlias: string): ResolvedAlias {
    let providerKey: string;
    let modelId: string;

    if (modelAlias.startsWith('claude')) {
      providerKey = 'anthropic';
      modelId = 'claude-sonnet-4-5-20250929';
    } else if (modelAlias.startsWith('gemini')) {
      providerKey = 'google';
      modelId = 'gemini-1.5-pro';
    } else {
      throw new BadRequestException(`Unknown model alias: ${modelAlias}`);
    }

    const entry = this.providers.get(providerKey);

    if (!entry) {
      throw new BadRequestException(`Provider not configured: ${providerKey}`);
    }

    console.log(
      `[ProviderRegistry] Resolved alias '${modelAlias}' → provider '${entry.name}', model '${modelId}'`,
    );
    return {
      provider: entry.provider,
      providerName: entry.name,
      modelId,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
