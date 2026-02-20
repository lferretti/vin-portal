# Adapters

External service integrations use the **adapter pattern**. Each adapter implements an interface defined in `interfaces/` and is injected via NestJS dependency injection tokens from `adapter.tokens.ts`.

## Stub Implementations

During development, stub implementations in `stubs/` return mock data. In production, swap stubs for real implementations by updating `stubs.module.ts` or using environment-based provider registration.

## Circuit Breaker Usage

Real adapter implementations should wrap external calls with the `CircuitBreaker` utility to protect against cascading failures:

```typescript
import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from '../common/utils/circuit-breaker';

@Injectable()
export class RealVehicleDataAdapter implements VehicleDataPort {
  private readonly circuitBreaker = new CircuitBreaker({
    name: 'vehicle-data-api',
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
  });

  async decode(vin: string): Promise<VehicleData> {
    return this.circuitBreaker.execute(() =>
      this.httpService.get(`/vehicles/${vin}`),
    );
  }
}
```

When the circuit opens, the `CircuitBreaker` throws a `ServiceUnavailableException` with code `CIRCUIT_OPEN`. The existing `CommitWorkerService` already handles `DEPENDENCY_UNAVAILABLE` errors by scheduling retries — a `CIRCUIT_OPEN` exception follows the same retry path.

## Circuit Breaker States

- **CLOSED** — Normal operation. Failures increment the counter.
- **OPEN** — Threshold exceeded. All calls fail immediately without hitting the external service.
- **HALF_OPEN** — After the reset timeout, one call is allowed through. Success resets to CLOSED; failure reopens.
