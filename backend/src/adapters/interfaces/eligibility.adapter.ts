export interface EligibilityResult {
  allowed: boolean;
  reasonCode: string;
  rawPayload?: Record<string, unknown>;
}

export interface EligibilityAdapter {
  check(externalContractId: string, vin: string): Promise<EligibilityResult>;
}
