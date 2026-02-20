import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers[CORRELATION_ID_HEADER] as string) || uuidv4();
    request.headers[CORRELATION_ID_HEADER] = correlationId;

    return next.handle().pipe(
      tap(() => {
        response.setHeader('X-Correlation-ID', correlationId);
      }),
    );
  }
}
