import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: Record<string, jest.Mock>;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return ok status when database is healthy', async () => {
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(result.checks['database']).toBe('ok');
    });

    it('should return a timestamp in ISO format', async () => {
      const result = await controller.check();
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should execute SELECT 1 to check database', async () => {
      await controller.check();
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw ServiceUnavailableException when database is down', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection refused'));
      try {
        await controller.check();
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const exc = error as ServiceUnavailableException;
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body['status']).toBe('degraded');
        expect((body['checks'] as Record<string, string>)['database']).toBe('error');
      }
    });

    it('should include checks object in the response', async () => {
      const result = await controller.check();
      expect(result.checks).toBeDefined();
      expect(typeof result.checks).toBe('object');
    });

    it('should include database key in checks', async () => {
      const result = await controller.check();
      expect('database' in result.checks).toBe(true);
    });

    it('should mark database as error when query throws', async () => {
      dataSource.query.mockRejectedValue(new Error('timeout'));
      try {
        await controller.check();
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        const exc = error as ServiceUnavailableException;
        const body = exc.getResponse() as Record<string, unknown>;
        expect((body['checks'] as Record<string, string>)['database']).toBe('error');
      }
    });
  });
});
