import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { ContractContext } from './contract-context.entity';

@Entity('vin_add_request')
@Index(['status', 'nextRetryAt'])
export class VinAddRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_context_id', type: 'uuid' })
  contractContextId: string;

  @ManyToOne(() => ContractContext, (c) => c.vinAddRequests)
  @JoinColumn({ name: 'contract_context_id' })
  contractContext: ContractContext;

  @Column({ type: 'varchar', length: 17 })
  vin: string;

  @Column({ type: 'jsonb', nullable: true })
  decoded: { year: number; make: string; model: string } | null;

  @Column({
    type: 'enum',
    enum: VinAddStatus,
    default: VinAddStatus.PENDING,
  })
  status: VinAddStatus;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, unique: true })
  idempotencyKey: string;

  @Column({ name: 'eligibility_allowed', type: 'boolean', nullable: true })
  eligibilityAllowed: boolean | null;

  @Column({ name: 'eligibility_reason_code', type: 'varchar', length: 64, nullable: true })
  eligibilityReasonCode: string | null;

  @Column({ name: 'eligibility_raw', type: 'jsonb', nullable: true })
  eligibilityRaw: Record<string, unknown> | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  @Column({ name: 'last_dependency_error', type: 'text', nullable: true })
  lastDependencyError: string | null;

  @Column({ name: 'email_status', type: 'varchar', length: 32, nullable: true })
  emailStatus?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
