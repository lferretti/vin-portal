import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok');

    if (!allHealthy) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
