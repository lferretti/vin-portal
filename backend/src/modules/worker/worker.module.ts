import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractContext } from '../../database/entities/contract-context.entity';
import { VinAddRequest } from '../../database/entities/vin-add-request.entity';
import { CommitWorkerService } from './commit-worker.service';
import { DataRetentionService } from './data-retention.service';
import { AuditModule } from '../audit/audit.module';
import { StubsModule } from '../../adapters/stubs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractContext, VinAddRequest]),
    AuditModule,
    StubsModule,
  ],
  providers: [CommitWorkerService, DataRetentionService],
})
export class WorkerModule {}
