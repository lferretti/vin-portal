import { Module } from '@nestjs/common';
import {
  CONTRACT_VERIFICATION_ADAPTER,
  VIN_DECODE_ADAPTER,
  ELIGIBILITY_ADAPTER,
  ASSOCIATION_ADAPTER,
  EMAIL_ADAPTER,
} from './adapter.tokens';
import { ContractVerificationStub } from './stubs/contract-verification.stub';
import { VinDecodeStub } from './stubs/vin-decode.stub';
import { EligibilityStub } from './stubs/eligibility.stub';
import { AssociationStub } from './stubs/association.stub';
import { EmailStub } from './stubs/email.stub';
import { CircuitBreakerRegistry } from '../common/utils/circuit-breaker-registry';

@Module({
  providers: [
    CircuitBreakerRegistry,
    { provide: CONTRACT_VERIFICATION_ADAPTER, useClass: ContractVerificationStub },
    { provide: VIN_DECODE_ADAPTER, useClass: VinDecodeStub },
    { provide: ELIGIBILITY_ADAPTER, useClass: EligibilityStub },
    { provide: ASSOCIATION_ADAPTER, useClass: AssociationStub },
    { provide: EMAIL_ADAPTER, useClass: EmailStub },
  ],
  exports: [
    CircuitBreakerRegistry,
    CONTRACT_VERIFICATION_ADAPTER,
    VIN_DECODE_ADAPTER,
    ELIGIBILITY_ADAPTER,
    ASSOCIATION_ADAPTER,
    EMAIL_ADAPTER,
  ],
})
export class StubsModule {}
