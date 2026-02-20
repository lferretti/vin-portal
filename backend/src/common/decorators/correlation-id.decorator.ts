import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request.headers[CORRELATION_ID_HEADER] as string) ?? '';
  },
);
