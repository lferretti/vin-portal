import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';
import { ApiEnvelopeDto } from '../dto/api-envelope.dto';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        const correlationId =
          (request.headers[CORRELATION_ID_HEADER] as string) ?? '';
        response.setHeader('X-Correlation-ID', correlationId);

        // If already wrapped, return as-is
        if (
          data &&
          typeof data === 'object' &&
          'correlationId' in data &&
          'success' in data
        ) {
          return data;
        }

        return ApiEnvelopeDto.success(correlationId, data);
      }),
    );
  }
}
