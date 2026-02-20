import { OtpSummary } from './otp.model';

/**
 * Request payload for contract authentication
 */
export interface AuthenticateContractRequest {
  /** Last 7 characters of the VIN */
  vin7: string;
  /** Last name (exact match) */
  lastName: string;
  /** US ZIP code (5-digit or 5+4 format) */
  zip: string;
}

/**
 * Contract summary information
 */
export interface ContractSummary {
  /** Primary VIN with masked middle characters */
  primaryVinMasked: string;
  /** Whether an additional VIN has already been added */
  hasAdditionalVin: boolean;
}

/**
 * Successful authentication response data
 */
export interface AuthenticateSuccessData {
  /** Internal contract context identifier */
  contractContextId: string;
  /** JWT session token */
  sessionToken: string;
  /** Token expiration timestamp (ISO 8601) */
  sessionExpiresAt: string;
  /** OTP status and challenge info */
  otp: OtpSummary;
  /** Contract summary (if available) */
  contractSummary?: ContractSummary;
}

/**
 * Session token claims (decoded from JWT)
 */
export interface SessionClaims {
  /** Contract context ID */
  contractContextId: string;
  /** External contract ID (from verification system) */
  externalContractId?: string;
  /** Token issue time (unix timestamp) */
  iat: number;
  /** Token expiration time (unix timestamp) */
  exp: number;
  /** Risk tier (optional) */
  riskTier?: 'low' | 'medium' | 'high';
}

