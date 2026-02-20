import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { DataSource } from 'typeorm';

describe('OTP (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new CorrelationIdInterceptor(), new EnvelopeInterceptor());

    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM audit_event');
    await dataSource.query('DELETE FROM auth_attempt');
    await dataSource.query('DELETE FROM otp_challenge');
    await dataSource.query('DELETE FROM vin_add_request');
    await dataSource.query('DELETE FROM contract_context');
  });

  async function getOtpChallengeId(): Promise<{ otpChallengeId: string; contractContextId: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contract/authenticate')
      .send({ vin7: '0TP7654', lastName: 'TESTUSER', zip: '12345' });
    return {
      otpChallengeId: res.body.error.details.otpChallengeId,
      contractContextId: res.body.error.details.contractContextId,
    };
  }

  describe('POST /api/v1/otp/send', () => {
    it('should send OTP successfully', async () => {
      const { otpChallengeId } = await getOtpChallengeId();

      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/send')
        .send({ otpChallengeId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.otpChallengeId).toBe(otpChallengeId);
      expect(res.body.data.status).toBe('SENT');
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('should return error for invalid challenge ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/send')
        .send({ otpChallengeId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);

      expect(res.body.error.code).toBe('OTP_EXPIRED');
    });
  });

  describe('POST /api/v1/otp/verify', () => {
    it('should verify OTP and return session token', async () => {
      const { otpChallengeId } = await getOtpChallengeId();

      // Send OTP first
      await request(app.getHttpServer())
        .post('/api/v1/otp/send')
        .send({ otpChallengeId });

      // Verify with correct code
      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/verify')
        .send({ otpChallengeId, code: '123456' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionToken).toBeDefined();
      expect(res.body.data.otp.status).toBe('VERIFIED');
    });

    it('should return OTP_INVALID for wrong code', async () => {
      const { otpChallengeId } = await getOtpChallengeId();

      await request(app.getHttpServer())
        .post('/api/v1/otp/send')
        .send({ otpChallengeId });

      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/verify')
        .send({ otpChallengeId, code: '999999' })
        .expect(401);

      expect(res.body.error.code).toBe('OTP_INVALID');
    });

    it('should lock out after too many failed attempts', async () => {
      const { otpChallengeId } = await getOtpChallengeId();

      await request(app.getHttpServer())
        .post('/api/v1/otp/send')
        .send({ otpChallengeId });

      // Make max failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/otp/verify')
          .send({ otpChallengeId, code: '000000' });
      }

      const res = await request(app.getHttpServer())
        .post('/api/v1/otp/verify')
        .send({ otpChallengeId, code: '123456' })
        .expect(429);

      expect(res.body.error.code).toBe('OTP_LOCKED_OUT');
    });
  });
});
