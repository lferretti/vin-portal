import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';

const isProduction = process.env.NODE_ENV === 'production';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const correlationId = request.headers[CORRELATION_ID_HEADER] as string;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const response = context.switchToHttp().getResponse<Response>();

        if (isProduction) {
          // Structured JSON for CloudWatch / Datadog log ingestion
          this.logger.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'info',
              method,
              url,
              statusCode: response.statusCode,
              durationMs: duration,
              correlationId,
              ip,
              userAgent: request.headers['user-agent'],
            }),
          );
        } else {
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms [${correlationId}]`,
          );
        }
      }),
    );
  }
}
