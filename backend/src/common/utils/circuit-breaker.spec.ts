import { ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 5000,
      name: 'test-circuit',
    });
  });

  describe('constructor defaults', () => {
    it('should use default options when none provided', () => {
      const defaultBreaker = new CircuitBreaker();
      expect(defaultBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('CLOSED state', () => {
    it('should execute the function and return the result when closed', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should remain CLOSED after successful executions', async () => {
      await breaker.execute(() => Promise.resolve('ok'));
      await breaker.execute(() => Promise.resolve('ok'));
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should remain CLOSED when failures are below threshold', async () => {
      // Fail twice (threshold is 3)
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should re-throw the original error on failure', async () => {
      const originalError = new Error('upstream failure');

      await expect(
        breaker.execute(() => Promise.reject(originalError)),
      ).rejects.toThrow('upstream failure');
    });

    it('should transition to OPEN after reaching the failure threshold', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset failure count after a successful execution', async () => {
      // Two failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      // One success resets the count
      await breaker.execute(() => Promise.resolve('ok'));

      // Two more failures should NOT open the circuit (count was reset)
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Drive the circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should throw ServiceUnavailableException without executing the function', async () => {
      const fn = jest.fn().mockResolvedValue('should not run');

      await expect(breaker.execute(fn)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(fn).not.toHaveBeenCalled();
    });

    it('should include CIRCUIT_OPEN code in the exception', async () => {
      try {
        await breaker.execute(() => Promise.resolve('nope'));
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const response = (error as ServiceUnavailableException).getResponse();
        expect(response).toMatchObject({
          code: 'CIRCUIT_OPEN',
        });
      }
    });

    it('should include the circuit name in the error message', async () => {
      try {
        await breaker.execute(() => Promise.resolve('nope'));
        fail('Expected ServiceUnavailableException');
      } catch (error) {
        const response = (error as ServiceUnavailableException).getResponse() as Record<string, unknown>;
        expect(response.message).toContain('test-circuit');
      }
    });

    it('should reject multiple consecutive calls while OPEN', async () => {
      await expect(
        breaker.execute(() => Promise.resolve('a')),
      ).rejects.toThrow(ServiceUnavailableException);

      await expect(
        breaker.execute(() => Promise.resolve('b')),
      ).rejects.toThrow(ServiceUnavailableException);

      await expect(
        breaker.execute(() => Promise.resolve('c')),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('HALF_OPEN state transition', () => {
    beforeEach(async () => {
      // Drive the circuit to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition to HALF_OPEN after the reset timeout elapses', async () => {
      // Simulate time passing beyond resetTimeoutMs
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);

      // The next execute call should transition to HALF_OPEN and try the function
      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should transition back to CLOSED on success in HALF_OPEN', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);

      await breaker.execute(() => Promise.resolve('recovered'));

      jest.spyOn(Date, 'now').mockRestore();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition back to OPEN on failure in HALF_OPEN', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);

      try {
        await breaker.execute(() => Promise.reject(new Error('still failing')));
      } catch {
        // expected
      }

      jest.spyOn(Date, 'now').mockRestore();

      // After a single failure in HALF_OPEN, failure count reaches threshold again
      // because onFailure increments and checks >= threshold.
      // The circuit was already at threshold, one more failure keeps it OPEN.
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should not transition to HALF_OPEN before the reset timeout elapses', async () => {
      // Only 2 seconds have passed, timeout is 5 seconds
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000);

      await expect(
        breaker.execute(() => Promise.resolve('too early')),
      ).rejects.toThrow(ServiceUnavailableException);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('reset()', () => {
    it('should reset the circuit to CLOSED state', async () => {
      // Drive to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should allow successful execution after reset', async () => {
      // Drive to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      breaker.reset();

      const result = await breaker.execute(() => Promise.resolve('after reset'));
      expect(result).toBe('after reset');
    });

    it('should reset the failure count so threshold failures are required again', async () => {
      // Drive to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }

      breaker.reset();

      // Only 2 failures after reset should not open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail again')));
        } catch {
          // expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('getState()', () => {
    it('should return CircuitState.CLOSED initially', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should return CircuitState.OPEN after threshold failures', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {
          // expected
        }
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('CircuitState enum', () => {
    it('should have three states: CLOSED, OPEN, HALF_OPEN', () => {
      expect(CircuitState.CLOSED).toBe('CLOSED');
      expect(CircuitState.OPEN).toBe('OPEN');
      expect(CircuitState.HALF_OPEN).toBe('HALF_OPEN');
    });
  });
});
