import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { AuthModule } from '../auth/auth.module';
import { StubsModule } from '../../adapters/stubs.module';

@Module({
  imports: [AuthModule, StubsModule],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
