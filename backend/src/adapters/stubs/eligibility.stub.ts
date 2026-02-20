import { Injectable } from '@nestjs/common';
import { EligibilityAdapter, EligibilityResult } from '../interfaces/eligibility.adapter';

@Injectable()
export class EligibilityStub implements EligibilityAdapter {
  async check(_externalContractId: string, vin: string): Promise<EligibilityResult> {
    const normalized = vin.toUpperCase();

    if (normalized === '1G1YY22G965123456') {
      return { allowed: false, reasonCode: 'CLASS_TOO_HIGH' };
    }

    if (normalized.startsWith('5FNRL')) {
      return { allowed: false, reasonCode: 'VIN_ALREADY_USED' };
    }

    return { allowed: true, reasonCode: 'OK' };
  }
}
