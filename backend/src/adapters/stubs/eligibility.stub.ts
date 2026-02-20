import { Injectable } from '@nestjs/common';
import { EligibilityAdapter, EligibilityResult } from '../interfaces/eligibility.adapter';
import { CircuitBreaker } from '../../common/utils/circuit-breaker';
import { CircuitBreakerRegistry } from '../../common/utils/circuit-breaker-registry';

@Injectable()
export class EligibilityStub implements EligibilityAdapter {
  private readonly circuitBreaker: CircuitBreaker;

  constructor(registry: CircuitBreakerRegistry) {
    this.circuitBreaker = registry.register('eligibility', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
    });
  }

  async check(_externalContractId: string, vin: string): Promise<EligibilityResult> {
    return this.circuitBreaker.execute(async () => {
      const normalized = vin.toUpperCase();

      if (normalized === '1G1YY22G965123456') {
        return { allowed: false, reasonCode: 'CLASS_TOO_HIGH' };
      }

      if (normalized.startsWith('5FNRL')) {
        return { allowed: false, reasonCode: 'VIN_ALREADY_USED' };
      }

      return { allowed: true, reasonCode: 'OK' };
    });
  }
}
