import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { AuditEvent } from '../../database/entities/audit-event.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractContext, VinAddRequest, AuditEvent]),
    AuthModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
