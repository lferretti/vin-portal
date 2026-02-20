import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiEnvelopeDto } from '../dto/api-envelope.dto';
import { ErrorCodes } from '../constants/error-codes';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';
import { sanitizePii } from '../utils/pii-sanitizer.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request.headers[CORRELATION_ID_HEADER] as string) ?? '';

    let status: number;
    let code: string;
    let message: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        code = (bodyObj['code'] as string) ?? this.statusToErrorCode(status);
        message = (bodyObj['message'] as string) ?? exception.message;
        details = bodyObj['details'] as Record<string, unknown> | undefined;
      } else {
        code = this.statusToErrorCode(status);
        message = typeof body === 'string' ? body : exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCodes.INTERNAL_ERROR;
      message = 'An unexpected error occurred.';
      this.logger.error(
        'Unhandled exception',
        sanitizePii({ exception, correlationId }),
      );
    }

    const envelope = ApiEnvelopeDto.error(correlationId, code, message, details);
    response.status(status).json(envelope);
  }

  private statusToErrorCode(status: number): string {
    switch (status) {
      case 401:
        return ErrorCodes.AUTH_INVALID;
      case 403:
        return ErrorCodes.AUTH_INVALID;
      case 404:
        return ErrorCodes.CONTRACT_NOT_FOUND;
      case 409:
        return ErrorCodes.CONTRACT_LOCKED;
      case 429:
        return ErrorCodes.RATE_LIMITED;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }
}
