import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from '../../database/entities/audit-event.entity';

export interface AuditEventInput {
  eventType: string;
  actorType: string;
  contractContextId?: string;
  requestId?: string;
  correlationId?: string;
  sourceIp?: string;
  userAgent?: string;
  eventData?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepo: Repository<AuditEvent>,
  ) {}

  async emit(input: AuditEventInput): Promise<void> {
    try {
      const event = this.auditRepo.create({
        eventType: input.eventType,
        actorType: input.actorType,
        contractContextId: input.contractContextId ?? null,
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? null,
        sourceIp: input.sourceIp ?? null,
        userAgent: input.userAgent ?? null,
        eventData: input.eventData ?? null,
      });
      await this.auditRepo.save(event);
    } catch (error) {
      // Never throw — audit failures should not break the request
      this.logger.error('Failed to emit audit event', {
        eventType: input.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async findByContractContext(contractContextId: string): Promise<AuditEvent[]> {
    return this.auditRepo.find({
      where: { contractContextId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByRequestId(requestId: string): Promise<AuditEvent[]> {
    return this.auditRepo.find({
      where: { requestId },
      order: { createdAt: 'ASC' },
    });
  }
}
