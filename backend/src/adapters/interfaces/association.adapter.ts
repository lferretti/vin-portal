export interface AssociationResult {
  associationReferenceId: string;
  confirmed: boolean;
}

export interface AssociationAdapter {
  associate(
    externalContractId: string,
    vin: string,
    requestId: string,
  ): Promise<AssociationResult>;
}
