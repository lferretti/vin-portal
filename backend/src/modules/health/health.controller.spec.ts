import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import { CircuitBreakerRegistry } from '../../common/utils/circuit-breaker-registry';
import { CircuitState } from '../../common/utils/circuit-breaker';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: Record<string, jest.Mock>;
  let registry: CircuitBreakerRegistry;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    registry = new CircuitBreakerRegistry();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DataSource, useValue: dataSource },
        { provide: CircuitBreakerRegistry, useValue: registry },
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

  describe('circuit breaker integration', () => {
    it('should include circuitBreakers in the health response', async () => {
      registry.register('test-service');
      const result = await controller.check();
      expect(result.circuitBreakers).toBeDefined();
      expect(result.circuitBreakers['test-service']).toBe(CircuitState.CLOSED);
    });

    it('should return ok when all circuit breakers are CLOSED', async () => {
      registry.register('service-a');
      registry.register('service-b');
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(result.circuitBreakers).toEqual({
        'service-a': CircuitState.CLOSED,
        'service-b': CircuitState.CLOSED,
      });
    });

    it('should return degraded when a circuit breaker is OPEN', async () => {
      const breaker = registry.register('flaky-service', {
        failureThreshold: 2,
        resetTimeoutMs: 30_000,
      });

      // Drive the breaker to OPEN
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      try {
        await controller.check();
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const exc = error as ServiceUnavailableException;
        const body = exc.getResponse() as Record<string, unknown>;
        expect(body['status']).toBe('degraded');
        expect(
          (body['circuitBreakers'] as Record<string, string>)['flaky-service'],
        ).toBe(CircuitState.OPEN);
      }
    });

    it('should return degraded when database is ok but a circuit breaker is OPEN', async () => {
      const breaker = registry.register('broken-service', {
        failureThreshold: 1,
      });

      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // expected
      }

      try {
        await controller.check();
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const body = (error as ServiceUnavailableException).getResponse() as Record<string, unknown>;
        expect((body['checks'] as Record<string, string>)['database']).toBe('ok');
        expect(body['status']).toBe('degraded');
      }
    });

    it('should return empty circuitBreakers when no breakers are registered', async () => {
      const result = await controller.check();
      expect(result.circuitBreakers).toEqual({});
    });
  });
});
