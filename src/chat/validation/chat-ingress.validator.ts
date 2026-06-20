import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { INGRESS_LIMITS } from './chat-ingress.constants';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ChatIngressProfile } from './chat-ingress.types';

export function validateChatIngress(
  dto: ChatRequestDto,
  profile: ChatIngressProfile,
): void {
  const limits = INGRESS_LIMITS[profile];

  if (dto.messages.length > limits.maxMessages) {
    throw new HttpException(
      {
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Too many messages for ${profile}. Maximum allowed: ${limits.maxMessages}`,
        details: [
          {
            field: 'messages',
            issue: `Array length ${dto.messages.length} exceeds maximum ${limits.maxMessages}`,
          },
        ],
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  for (let i = 0; i < dto.messages.length; i++) {
    const msg = dto.messages[i];
    let maxLength: number;

    if (msg.role === 'tool') {
      maxLength = limits.maxContentTool;
    } else if (msg.role === 'user') {
      maxLength = limits.maxContentUser;
    } else if (msg.role === 'assistant') {
      maxLength = limits.maxContentAssistant;
    } else {
      continue;
    }

    if (msg.content && msg.content.length > maxLength) {
      throw new HttpException(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: `Message content too long for ${profile} and role ${msg.role}.`,
          details: [
            {
              field: `messages[${i}].content`,
              issue: `Content length ${msg.content.length} exceeds maximum ${maxLength}`,
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
