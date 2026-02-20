import { Injectable } from '@nestjs/common';
import {
  ContractVerificationAdapter,
  ContractVerificationResult,
} from '../interfaces/contract-verification.adapter';

@Injectable()
export class ContractVerificationStub implements ContractVerificationAdapter {
  private readonly validCredentials: Record<
    string,
    { lastName: string; zip: string; requiresOtp: boolean; hasAdditionalVin: boolean; primaryVinMasked: string }
  > = {
    '1234567': {
      lastName: 'SMITH',
      zip: '30301',
      requiresOtp: false,
      hasAdditionalVin: false,
      primaryVinMasked: '1HG******1234',
    },
    '7654321': {
      lastName: 'JONES',
      zip: '10001',
      requiresOtp: false,
      hasAdditionalVin: true,
      primaryVinMasked: '5FN******5678',
    },
    '0TP7654': {
      lastName: 'TESTUSER',
      zip: '12345',
      requiresOtp: true,
      hasAdditionalVin: false,
      primaryVinMasked: '1XX******9999',
    },
    'LOCKED1': {
      lastName: 'LOCKED',
      zip: '99999',
      requiresOtp: false,
      hasAdditionalVin: true,
      primaryVinMasked: '1ZZ******0000',
    },
  };

  async verify(
    vin7: string,
    lastName: string,
    zip: string,
  ): Promise<ContractVerificationResult> {
    const key = vin7.toUpperCase();
    const expected = this.validCredentials[key];

    if (!expected) {
      return { matched: false };
    }

    if (lastName.toUpperCase() !== expected.lastName || zip !== expected.zip) {
      return { matched: false };
    }

    return {
      matched: true,
      externalContractId: `EXT-${key}`,
      primaryVinMasked: expected.primaryVinMasked,
      hasAdditionalVin: expected.hasAdditionalVin,
      requiresOtp: expected.requiresOtp,
      maskedDestination: expected.requiresOtp ? '***-***-1234' : undefined,
      channel: expected.requiresOtp ? 'sms' : undefined,
    };
  }
}
