import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';
import { DataSource } from 'typeorm';
import { AuthService } from '../src/modules/auth/auth.service';
import { v4 as uuidv4 } from 'uuid';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

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

    // Create admin token
    const authService = moduleFixture.get(AuthService);
    const { token } = authService.createAdminToken({
      adminUserId: uuidv4(),
      email: 'admin@test.com',
      role: 'admin',
    });
    adminToken = token;
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

  async function createContractAndCommit(): Promise<{ requestId: string; contractContextId: string }> {
    const authRes = await request(app.getHttpServer())
      .post('/api/v1/contract/authenticate')
      .send({ vin7: '1234567', lastName: 'SMITH', zip: '30301' });

    const token = authRes.body.data.sessionToken;
    const contractContextId = authRes.body.data.contractContextId;

    const commitRes = await request(app.getHttpServer())
      .post('/api/v1/vin/commit')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', uuidv4())
      .send({ vin: '1HGCM82633A123456', acceptIrreversible: true });

    return { requestId: commitRes.body.data.requestId, contractContextId };
  }

  describe('GET /api/v1/admin/contracts', () => {
    it('should return 401 without admin token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/contracts')
        .expect(401);
    });

    it('should search contracts by contract number', async () => {
      await createContractAndCommit();

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/contracts')
        .query({ contractNumber: 'CONTRACT-001' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      expect(res.body.data.results[0].contractContextId).toBeDefined();
      expect(res.body.data.results[0].status).toBe('COMMITTED_LOCKED');
    });
  });

  describe('GET /api/v1/admin/requests/:requestId', () => {
    it('should return request detail with audit trail', async () => {
      const { requestId } = await createContractAndCommit();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/requests/${requestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.requestId).toBe(requestId);
      expect(res.body.data.status).toBe('COMMITTED_LOCKED');
      expect(res.body.data.audit.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/admin/requests/:requestId/note', () => {
    it('should add a note to a request', async () => {
      const { requestId } = await createContractAndCommit();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/requests/${requestId}/note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Customer called about this request.' })
        .expect(200);

      expect(res.body.data.requestId).toBe(requestId);
      expect(res.body.data.noteSaved).toBe(true);
    });

    it('should reject empty note', async () => {
      const { requestId } = await createContractAndCommit();

      await request(app.getHttpServer())
        .post(`/api/v1/admin/requests/${requestId}/note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: '' })
        .expect(400);
    });
  });
});
