import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiErrorCode } from 'src/common/errors/api-error.code';

@Catch()
export class OpenAiExceptionFilter implements ExceptionFilter {
  catch() {}
}
