import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContractContext } from './contract-context.entity';

@Entity('audit_event')
@Index(['contractContextId', 'createdAt'])
@Index(['requestId', 'createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType: string;

  @Column({ name: 'actor_type', type: 'varchar', length: 20 })
  actorType: string;

  @Column({ name: 'contract_context_id', type: 'uuid', nullable: true })
  contractContextId: string | null;

  @ManyToOne(() => ContractContext, (c) => c.auditEvents, { nullable: true })
  @JoinColumn({ name: 'contract_context_id' })
  contractContext: ContractContext | null;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 36, nullable: true })
  correlationId: string | null;

  @Column({ name: 'source_ip', type: 'inet', nullable: true })
  sourceIp: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'event_data', type: 'jsonb', nullable: true })
  eventData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
