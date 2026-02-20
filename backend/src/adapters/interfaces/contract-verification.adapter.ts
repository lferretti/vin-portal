export interface ContractVerificationResult {
  matched: boolean;
  externalContractId?: string;
  primaryVinMasked?: string;
  hasAdditionalVin?: boolean;
  requiresOtp?: boolean;
  maskedDestination?: string;
  channel?: string;
}

export interface ContractVerificationAdapter {
  verify(
    vin7: string,
    lastName: string,
    zip: string,
  ): Promise<ContractVerificationResult>;
}
