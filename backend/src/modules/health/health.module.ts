import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { StubsModule } from '../../adapters/stubs.module';

@Module({
  imports: [StubsModule],
  controllers: [HealthController],
})
export class HealthModule {}
