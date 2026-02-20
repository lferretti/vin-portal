import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

describe('VIN (e2e)', () => {
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

  async function getSessionToken(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contract/authenticate')
      .send({ vin7: '1234567', lastName: 'SMITH', zip: '30301' });
    return res.body.data.sessionToken;
  }

  describe('POST /api/v1/vin/decode', () => {
    it('should decode a known VIN', async () => {
      const token = await getSessionToken();

      const res = await request(app.getHttpServer())
        .post('/api/v1/vin/decode')
        .set('Authorization', `Bearer ${token}`)
        .send({ vin: '1HGCM82633A123456' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vin).toBe('1HGCM82633A123456');
      expect(res.body.data.decoded).toEqual({ year: 2003, make: 'Honda', model: 'Accord' });
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vin/decode')
        .send({ vin: '1HGCM82633A123456' })
        .expect(401);
    });

    it('should reject invalid VIN format', async () => {
      const token = await getSessionToken();

      await request(app.getHttpServer())
        .post('/api/v1/vin/decode')
        .set('Authorization', `Bearer ${token}`)
        .send({ vin: 'INVALID' })
        .expect(400);
    });
  });

  describe('POST /api/v1/vin/eligibility', () => {
    it('should return eligible for valid VIN', async () => {
      const token = await getSessionToken();

      const res = await request(app.getHttpServer())
        .post('/api/v1/vin/eligibility')
        .set('Authorization', `Bearer ${token}`)
        .send({ vin: '1HGCM82633A123456' })
        .expect(200);

      expect(res.body.data.eligible).toBe(true);
      expect(res.body.data.reasonCode).toBe('OK');
    });

    it('should return ineligible for Corvette (CLASS_TOO_HIGH)', async () => {
      const token = await getSessionToken();

      const res = await request(app.getHttpServer())
        .post('/api/v1/vin/eligibility')
        .set('Authorization', `Bearer ${token}`)
        .send({ vin: '1G1YY22G965123456' })
        .expect(200);

      expect(res.body.data.eligible).toBe(false);
      expect(res.body.data.reasonCode).toBe('CLASS_TOO_HIGH');
    });

    it('should return ineligible for Odyssey VIN (VIN_ALREADY_USED)', async () => {
      const token = await getSessionToken();

      const res = await request(app.getHttpServer())
        .post('/api/v1/vin/eligibility')
        .set('Authorization', `Bearer ${token}`)
        .send({ vin: '5FNRL38437B123456' })
        .expect(200);

      expect(res.body.data.eligible).toBe(false);
      expect(res.body.data.reasonCode).toBe('VIN_ALREADY_USED');
    });
  });

  describe('POST /api/v1/vin/commit', () => {
    it('should commit an eligible VIN', async () => {
      const token = await getSessionToken();
      const idempotencyKey = uuidv4();

      const res = await request(app.getHttpServer())
        .post('/api/v1/vin/commit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ vin: '1HGCM82633A123456', acceptIrreversible: true })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.requestId).toBeDefined();
      expect(res.body.data.status).toBe('COMMITTED_LOCKED');
      expect(res.body.data.vin).toBe('1HGCM82633A123456');
      expect(res.body.data.decoded).toEqual({ year: 2003, make: 'Honda', model: 'Accord' });
    });

    it('should reject commit without acceptIrreversible', async () => {
      const token = await getSessionToken();

      await request(app.getHttpServer())
        .post('/api/v1/vin/commit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({ vin: '1HGCM82633A123456', acceptIrreversible: false })
        .expect(400);
    });

    it('should support idempotent replay', async () => {
      const token = await getSessionToken();
      const idempotencyKey = uuidv4();

      const res1 = await request(app.getHttpServer())
        .post('/api/v1/vin/commit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ vin: '1HGCM82633A123456', acceptIrreversible: true })
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/vin/commit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ vin: '1HGCM82633A123456', acceptIrreversible: true })
        .expect(200);

      expect(res2.body.data.requestId).toBe(res1.body.data.requestId);
    });

    it('should reject ineligible VIN on commit', async () => {
      const token = await getSessionToken();

      const res = await request(app.getHttpServer())
        .post('/api/v1/vin/commit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Idempotency-Key', uuidv4())
        .send({ vin: '1G1YY22G965123456', acceptIrreversible: true })
        .expect(409);

      expect(res.body.error.code).toBe('VIN_INELIGIBLE');
    });
  });

  describe('GET /api/v1/vin/request/:requestId', () => {
    it('should return request status', async () => {
      const token = await getSessionToken();
      const idempotencyKey = uuidv4();

      const commitRes = await request(app.getHttpServer())
        .post('/api/v1/vin/commit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Idempotency-Key', idempotencyKey)
        .send({ vin: '1HGCM82633A123456', acceptIrreversible: true });

      const requestId = commitRes.body.data.requestId;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/vin/request/${requestId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.requestId).toBe(requestId);
      expect(res.body.data.status).toBe('COMMITTED_LOCKED');
    });
  });
});
