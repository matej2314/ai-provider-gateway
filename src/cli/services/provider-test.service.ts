import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { CliLogger } from '../utils/cli-logger.util';
import type {
  BaseUrl,
  ProviderApiKey,
  ProviderInstanceId,
} from '../../common/types/branded.types';
import type { GatewayConfig } from '../../config/gateway-config.schema';

@Injectable()
export class ProviderTestService {
  async testAnthropic(apiKey: ProviderApiKey): Promise<boolean> {
    try {
      const client = new Anthropic({ apiKey });

      await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return true;
    } catch (err) {
      if (err instanceof Error) {
        CliLogger.error(`Anthropic test failed: ${err.message}`);
      }
      return false;
    }
  }

  async testGoogle(apiKey: ProviderApiKey): Promise<boolean> {
    try {
      const client = new GoogleGenAI({ apiKey });
      await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: 'Hi' }] }],
      });
      return true;
    } catch (err) {
      if (err instanceof Error) {
        CliLogger.error(`Google test failed: ${err.message}`);
      }
      return false;
    }
  }

  async testOpenAi(apiKey: ProviderApiKey, baseUrl: BaseUrl): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey, baseURL: baseUrl });
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (err) {
      if (err instanceof Error) {
        CliLogger.error(`OpenAI test failed: ${err.message}`);
      }
      return false;
    }
  }

  async testOpenAiCompatible(
    apiKey: ProviderApiKey,
    baseUrl: BaseUrl,
    providerInstanceId: ProviderInstanceId,
    config: GatewayConfig,
  ): Promise<boolean> {
    try {
      const modelEntry = Object.entries(config.models).find(
        ([_, model]) => model.providerInstance === providerInstanceId,
      );

      if (!modelEntry) {
        CliLogger.error(
          `No model configured for provider ${providerInstanceId} in gateway.config.yaml`,
        );
        CliLogger.info(
          'Add at least one model for this provider using: gateway model:add',
        );
        return false;
      }

      const [modelAlias, modelConfig] = modelEntry;
      const modelId = modelConfig.modelId;

      CliLogger.info(`Using model ${modelId} (alias: ${modelAlias})`);

      const client = new OpenAI({ apiKey, baseURL: baseUrl });
      await client.chat.completions.create({
        model: modelId,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Say hi' }],
      });
      return true;
    } catch (err) {
      if (err instanceof Error) {
        CliLogger.error(`OpenAI-compatible test failed: ${err.message}`);
      }
      return false;
    }
  }
}
