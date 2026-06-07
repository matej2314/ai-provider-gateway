import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { CliLogger } from '../utils/cli-logger.util';

@Injectable()
export class ProviderTestService {
  async testAnthropic(apiKey: string): Promise<boolean> {
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

  async testGoogle(apiKey: string): Promise<boolean> {
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
}
