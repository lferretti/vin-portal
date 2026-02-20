import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { ContractModule } from './modules/contract/contract.module';
import { OtpModule } from './modules/otp/otp.module';
import { VinModule } from './modules/vin/vin.module';
import { DocumentModule } from './modules/document/document.module';
import { AdminModule } from './modules/admin/admin.module';
import { WorkerModule } from './modules/worker/worker.module';
import { StubsModule } from './adapters/stubs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<TypeOrmModuleOptions>('database')!,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('app.rateLimitTtlSeconds') ?? 60) * 1000,
            limit: config.get<number>('app.rateLimitMax') ?? 20,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    AuditModule,
    StubsModule,
    ContractModule,
    OtpModule,
    VinModule,
    DocumentModule,
    AdminModule,
    WorkerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
