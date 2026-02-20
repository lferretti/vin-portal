import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { VinController } from './vin.controller';
import { VinService } from './vin.service';
import { CommitService } from './commit.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { StubsModule } from '../../adapters/stubs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractContext, VinAddRequest]),
    AuthModule,
    AuditModule,
    StubsModule,
  ],
  controllers: [VinController],
  providers: [VinService, CommitService],
})
export class VinModule {}
