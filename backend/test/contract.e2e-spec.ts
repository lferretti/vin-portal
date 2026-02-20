import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { DataSource } from 'typeorm';

describe('Contract (e2e)', () => {
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
    // Clean tables between tests
    await dataSource.query('DELETE FROM audit_event');
    await dataSource.query('DELETE FROM auth_attempt');
    await dataSource.query('DELETE FROM otp_challenge');
    await dataSource.query('DELETE FROM vin_add_request');
    await dataSource.query('DELETE FROM contract_context');
  });

  describe('POST /api/v1/contract/authenticate', () => {
    it('should return 200 with session token for valid direct-auth credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contract/authenticate')
        .send({ vin7: '1234567', lastName: 'SMITH', zip: '30301' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.contractContextId).toBeDefined();
      expect(res.body.data.sessionToken).toBeDefined();
      expect(res.body.data.sessionExpiresAt).toBeDefined();
      expect(res.body.data.otp.status).toBe('NOT_REQUIRED');
      expect(res.body.data.contractSummary.primaryVinMasked).toBe('1HG******1234');
      expect(res.body.data.contractSummary.hasAdditionalVin).toBe(false);
      expect(res.body.correlationId).toBeDefined();
    });

    it('should return 401 AUTH_NO_MATCH for invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contract/authenticate')
        .send({ vin7: '9999999', lastName: 'NOBODY', zip: '00000' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_NO_MATCH');
    });

    it('should return 401 AUTH_OTP_REQUIRED for OTP contract', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contract/authenticate')
        .send({ vin7: '0TP7654', lastName: 'TESTUSER', zip: '12345' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_OTP_REQUIRED');
      expect(res.body.error.details.contractContextId).toBeDefined();
      expect(res.body.error.details.otpChallengeId).toBeDefined();
      expect(res.body.error.details.maskedDestination).toBe('***-***-1234');
      expect(res.body.error.details.channel).toBe('sms');
    });

    it('should return 409 CONTRACT_LOCKED for locked contract', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contract/authenticate')
        .send({ vin7: 'LOCKED1', lastName: 'LOCKED', zip: '99999' })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONTRACT_LOCKED');
    });

    it('should return 400 for invalid ZIP format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contract/authenticate')
        .send({ vin7: '1234567', lastName: 'SMITH', zip: 'ABCDE' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should enforce rate limiting after too many attempts', async () => {
      // Make max attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/contract/authenticate')
          .send({ vin7: '1234567', lastName: 'WRONG', zip: '30301' });
      }

      // Next attempt should be rate limited
      const res = await request(app.getHttpServer())
        .post('/api/v1/contract/authenticate')
        .send({ vin7: '1234567', lastName: 'SMITH', zip: '30301' })
        .expect(429);

      expect(res.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
