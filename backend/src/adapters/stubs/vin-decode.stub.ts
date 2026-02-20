import { Injectable } from '@nestjs/common';
import { VinDecodeAdapter, VinDecodeResult } from '../interfaces/vin-decode.adapter';
import { CircuitBreaker } from '../../common/utils/circuit-breaker';
import { CircuitBreakerRegistry } from '../../common/utils/circuit-breaker-registry';

@Injectable()
export class VinDecodeStub implements VinDecodeAdapter {
  private readonly circuitBreaker: CircuitBreaker;

  constructor(registry: CircuitBreakerRegistry) {
    this.circuitBreaker = registry.register('vin-decode', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
    });
  }

  private readonly knownVins: Record<string, VinDecodeResult> = {
    '1HGCM82633A123456': { year: 2003, make: 'Honda', model: 'Accord' },
    '1HGCM56787A123456': { year: 2007, make: 'Honda', model: 'Civic' },
    '5FNRL38437B123456': { year: 2007, make: 'Honda', model: 'Odyssey' },
    'WVWZZZ3CZWE123456': { year: 2022, make: 'Volkswagen', model: 'Golf' },
    '1G1YY22G965123456': { year: 2006, make: 'Chevrolet', model: 'Corvette' },
    '3N1AB7AP5KY123456': { year: 2019, make: 'Nissan', model: 'Sentra' },
  };

  async decode(vin: string): Promise<VinDecodeResult> {
    return this.circuitBreaker.execute(async () => {
      const normalized = vin.toUpperCase();
      const known = this.knownVins[normalized];
      if (known) {
        return known;
      }

      // Generate deterministic decode for unknown VINs
      const makes = ['Toyota', 'Ford', 'Chevrolet', 'Honda'];
      const models = ['Sedan', 'SUV', 'Truck', 'Coupe'];
      const charSum = normalized.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      return {
        year: 2020 + (charSum % 5),
        make: makes[charSum % makes.length],
        model: models[charSum % models.length],
      };
    });
  }
}
