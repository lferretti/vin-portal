import { Controller, Get, Inject, Optional, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { CircuitBreakerRegistry } from '../../common/utils/circuit-breaker-registry';
import { CircuitState } from '../../common/utils/circuit-breaker';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() @Inject(CircuitBreakerRegistry) private readonly circuitBreakerRegistry?: CircuitBreakerRegistry,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
    }

    const circuitBreakers = this.circuitBreakerRegistry?.getStates() ?? {};

    const anyCircuitOpen = Object.values(circuitBreakers).some(
      (state) => state === CircuitState.OPEN,
    );

    const allHealthy = Object.values(checks).every((v) => v === 'ok') && !anyCircuitOpen;

    if (!allHealthy) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        checks,
        circuitBreakers,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      checks,
      circuitBreakers,
      timestamp: new Date().toISOString(),
    };
  }
}
