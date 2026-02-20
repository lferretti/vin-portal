import { Module } from '@nestjs/common';
import {
  CONTRACT_VERIFICATION_ADAPTER,
  VIN_DECODE_ADAPTER,
  ELIGIBILITY_ADAPTER,
  ASSOCIATION_ADAPTER,
} from './adapter.tokens';
import { ContractVerificationStub } from './stubs/contract-verification.stub';
import { VinDecodeStub } from './stubs/vin-decode.stub';
import { EligibilityStub } from './stubs/eligibility.stub';
import { AssociationStub } from './stubs/association.stub';

@Module({
  providers: [
    { provide: CONTRACT_VERIFICATION_ADAPTER, useClass: ContractVerificationStub },
    { provide: VIN_DECODE_ADAPTER, useClass: VinDecodeStub },
    { provide: ELIGIBILITY_ADAPTER, useClass: EligibilityStub },
    { provide: ASSOCIATION_ADAPTER, useClass: AssociationStub },
  ],
  exports: [
    CONTRACT_VERIFICATION_ADAPTER,
    VIN_DECODE_ADAPTER,
    ELIGIBILITY_ADAPTER,
    ASSOCIATION_ADAPTER,
  ],
})
export class StubsModule {}
