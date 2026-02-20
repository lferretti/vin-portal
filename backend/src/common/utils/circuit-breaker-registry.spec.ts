import { CircuitBreakerRegistry } from './circuit-breaker-registry';
import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  describe('register', () => {
    it('should create and return a new CircuitBreaker', () => {
      const breaker = registry.register('test-service', {
        failureThreshold: 3,
        resetTimeoutMs: 10_000,
      });

      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should return the same instance when registering the same name twice', () => {
      const first = registry.register('test-service', {
        failureThreshold: 3,
        resetTimeoutMs: 10_000,
      });
      const second = registry.register('test-service', {
        failureThreshold: 10,
        resetTimeoutMs: 60_000,
      });

      expect(first).toBe(second);
    });

    it('should register multiple breakers with different names', () => {
      const a = registry.register('service-a');
      const b = registry.register('service-b');

      expect(a).not.toBe(b);
      expect(registry.getAll().size).toBe(2);
    });
  });

  describe('get', () => {
    it('should return the registered breaker by name', () => {
      const registered = registry.register('my-service');
      const retrieved = registry.get('my-service');

      expect(retrieved).toBe(registered);
    });

    it('should return undefined for an unregistered name', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return an empty map when no breakers are registered', () => {
      expect(registry.getAll().size).toBe(0);
    });

    it('should return all registered breakers', () => {
      registry.register('service-a');
      registry.register('service-b');
      registry.register('service-c');

      const all = registry.getAll();
      expect(all.size).toBe(3);
      expect(all.has('service-a')).toBe(true);
      expect(all.has('service-b')).toBe(true);
      expect(all.has('service-c')).toBe(true);
    });
  });

  describe('getStates', () => {
    it('should return an empty object when no breakers are registered', () => {
      expect(registry.getStates()).toEqual({});
    });

    it('should return CLOSED state for all newly registered breakers', () => {
      registry.register('service-a');
      registry.register('service-b');

      expect(registry.getStates()).toEqual({
        'service-a': CircuitState.CLOSED,
        'service-b': CircuitState.CLOSED,
      });
    });

    it('should reflect OPEN state after breaker trips', async () => {
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

      const states = registry.getStates();
      expect(states['flaky-service']).toBe(CircuitState.OPEN);
    });

    it('should reflect mixed states across multiple breakers', async () => {
      const healthy = registry.register('healthy-service', {
        failureThreshold: 5,
      });
      const unhealthy = registry.register('unhealthy-service', {
        failureThreshold: 2,
      });

      // healthy stays CLOSED
      await healthy.execute(() => Promise.resolve('ok'));

      // unhealthy goes OPEN
      for (let i = 0; i < 2; i++) {
        try {
          await unhealthy.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      const states = registry.getStates();
      expect(states['healthy-service']).toBe(CircuitState.CLOSED);
      expect(states['unhealthy-service']).toBe(CircuitState.OPEN);
    });
  });
});
