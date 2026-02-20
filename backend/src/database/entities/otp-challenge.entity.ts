import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OtpStatus } from '../../common/enums/otp-status.enum';
import { ContractContext } from './contract-context.entity';

@Entity('otp_challenge')
export class OtpChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_context_id', type: 'uuid' })
  contractContextId: string;

  @ManyToOne(() => ContractContext, (c) => c.otpChallenges)
  @JoinColumn({ name: 'contract_context_id' })
  contractContext: ContractContext;

  @Column({ name: 'code_hash', type: 'varchar', length: 128 })
  codeHash: string;

  @Column({ name: 'code_salt', type: 'varchar', length: 64 })
  codeSalt: string;

  @Column({ name: 'masked_destination', type: 'varchar', length: 20 })
  maskedDestination: string;

  @Column({ type: 'varchar', length: 10, default: 'sms' })
  channel: string;

  @Column({
    type: 'enum',
    enum: OtpStatus,
    default: OtpStatus.PENDING,
  })
  status: OtpStatus;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'locked_out_until', type: 'timestamptz', nullable: true })
  lockedOutUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
