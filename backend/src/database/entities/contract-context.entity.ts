import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { VinAddStatus } from '../../common/enums/vin-add-status.enum';
import { VinAddRequest } from './vin-add-request.entity';
import { OtpChallenge } from './otp-challenge.entity';
import { AuthAttempt } from './auth-attempt.entity';
import { AuditEvent } from './audit-event.entity';

@Entity('contract_context')
export class ContractContext {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_number_hash', type: 'varchar', length: 128, unique: true })
  contractNumberHash: string;

  @Column({ name: 'external_contract_id', type: 'varchar', length: 128, nullable: true })
  externalContractId: string | null;

  @Column({
    type: 'enum',
    enum: VinAddStatus,
    default: VinAddStatus.NOT_USED,
  })
  status: VinAddStatus;

  @Column({ name: 'committed_vin', type: 'varchar', length: 17, nullable: true })
  committedVin: string | null;

  @Column({ name: 'committed_vin_masked', type: 'varchar', length: 20, nullable: true })
  committedVinMasked: string | null;

  @Column({ name: 'primary_vin_masked', type: 'varchar', length: 128, nullable: true })
  primaryVinMasked: string | null;

  @Column({ name: 'committed_vin_decoded', type: 'jsonb', nullable: true })
  committedVinDecoded: { year: number; make: string; model: string } | null;

  @Column({ name: 'committed_at', type: 'timestamptz', nullable: true })
  committedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => VinAddRequest, (r) => r.contractContext)
  vinAddRequests: VinAddRequest[];

  @OneToMany(() => OtpChallenge, (o) => o.contractContext)
  otpChallenges: OtpChallenge[];

  @OneToMany(() => AuthAttempt, (a) => a.contractContext)
  authAttempts: AuthAttempt[];

  @OneToMany(() => AuditEvent, (e) => e.contractContext)
  auditEvents: AuditEvent[];
}
