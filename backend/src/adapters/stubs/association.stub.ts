import { Injectable } from '@nestjs/common';
import { AssociationAdapter, AssociationResult } from '../interfaces/association.adapter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssociationStub implements AssociationAdapter {
  async associate(
    _externalContractId: string,
    _vin: string,
    _requestId: string,
  ): Promise<AssociationResult> {
    return {
      associationReferenceId: uuidv4(),
      confirmed: true,
    };
  }
}
