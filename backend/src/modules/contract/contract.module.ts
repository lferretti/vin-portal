import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { AuthAttempt } from '../../database/entities/auth-attempt.entity';
import { OtpChallenge } from '../../database/entities/otp-challenge.entity';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { StubsModule } from '../../adapters/stubs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractContext, AuthAttempt, OtpChallenge]),
    AuthModule,
    AuditModule,
    StubsModule,
  ],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
