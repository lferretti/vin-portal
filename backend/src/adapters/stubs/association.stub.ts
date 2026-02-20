import { Injectable } from '@nestjs/common';
import { AssociationAdapter, AssociationResult } from '../interfaces/association.adapter';
import { CircuitBreaker } from '../../common/utils/circuit-breaker';
import { CircuitBreakerRegistry } from '../../common/utils/circuit-breaker-registry';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssociationStub implements AssociationAdapter {
  private readonly circuitBreaker: CircuitBreaker;

  constructor(registry: CircuitBreakerRegistry) {
    this.circuitBreaker = registry.register('association', {
      failureThreshold: 3,
      resetTimeoutMs: 60_000,
    });
  }

  async associate(
    _externalContractId: string,
    _vin: string,
    _requestId: string,
  ): Promise<AssociationResult> {
    return this.circuitBreaker.execute(async () => {
      return {
        associationReferenceId: uuidv4(),
        confirmed: true,
      };
    });
  }
}
