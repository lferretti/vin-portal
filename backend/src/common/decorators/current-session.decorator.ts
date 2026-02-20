import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface SessionPayload {
  contractContextId: string;
  externalContractId?: string;
  riskTier?: 'low' | 'medium' | 'high';
}

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as SessionPayload;
  },
);
