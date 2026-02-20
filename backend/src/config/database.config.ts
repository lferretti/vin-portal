import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ContractContext } from '../database/entities/contract-context.entity';
import { VinAddRequest } from '../database/entities/vin-add-request.entity';
import { OtpChallenge } from '../database/entities/otp-challenge.entity';
import { AuthAttempt } from '../database/entities/auth-attempt.entity';
import { AuditEvent } from '../database/entities/audit-event.entity';
import { AdminUser } from '../database/entities/admin-user.entity';

const isProduction = process.env.NODE_ENV === 'production';

export const databaseConfig = registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  database: process.env.DATABASE_NAME ?? 'vin_portal',
  username: process.env.DATABASE_USER ?? 'vin_portal',
  password: process.env.DATABASE_PASSWORD ?? 'localdev',
  entities: [ContractContext, VinAddRequest, OtpChallenge, AuthAttempt, AuditEvent, AdminUser],
  synchronize: false,
  logging: !isProduction,
  ...(isProduction && {
    ssl: { rejectUnauthorized: true },
    extra: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  }),
}));
