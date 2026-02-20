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

@Entity('auth_attempt')
@Index(['contractNumberHash', 'createdAt'])
export class AuthAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_number_hash', type: 'varchar', length: 128 })
  contractNumberHash: string;

  @Column({ name: 'contract_context_id', type: 'uuid', nullable: true })
  contractContextId: string | null;

  @ManyToOne(() => ContractContext, (c) => c.authAttempts, { nullable: true })
  @JoinColumn({ name: 'contract_context_id' })
  contractContext: ContractContext | null;

  @Column({ name: 'source_ip', type: 'inet' })
  sourceIp: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ name: 'failure_reason', type: 'varchar', length: 64, nullable: true })
  failureReason: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 36, nullable: true })
  correlationId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
