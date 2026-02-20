import { DataSource } from 'typeorm';
import { ContractContext } from './entities/contract-context.entity';
import { VinAddRequest } from './entities/vin-add-request.entity';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { AuthAttempt } from './entities/auth-attempt.entity';
import { AuditEvent } from './entities/audit-event.entity';
import { AdminUser } from './entities/admin-user.entity';

const isProduction = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  database: process.env.DATABASE_NAME ?? 'vin_portal',
  username: process.env.DATABASE_USER ?? 'vin_portal',
  password: process.env.DATABASE_PASSWORD ?? 'localdev',
  entities: [ContractContext, VinAddRequest, OtpChallenge, AuthAttempt, AuditEvent, AdminUser],
  migrations: ['src/database/migrations/*.ts'],
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
});
