import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpChallenge } from '../../database/entities/otp-challenge.entity';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpChallenge, ContractContext]),
    AuthModule,
    AuditModule,
  ],
  controllers: [OtpController],
  providers: [OtpService],
})
export class OtpModule {}
