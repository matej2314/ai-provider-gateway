import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { CliLogger } from '../utils/cli-logger.util';
import type { BaseUrl, ProviderApiKey } from '../../common/types/branded.types';

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
}
