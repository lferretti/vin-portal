import { VinAddStatus } from './status.enum';

/**
 * Decoded VIN information
 */
export interface VinDecoded {
  /** Model year */
  year: number;
  /** Vehicle make/manufacturer */
  make: string;
  /** Vehicle model */
  model: string;
}

/**
 * Request to decode a VIN
 */
export interface VinDecodeRequest {
  /** 17-character VIN (normalized to uppercase) */
  vin: string;
}

/**
 * VIN decode response data
 */
export interface VinDecodeData {
  /** The VIN that was decoded */
  vin: string;
  /** Decoded vehicle information */
  decoded: VinDecoded;
}

/**
 * Request to check VIN eligibility
 */
export interface VinEligibilityRequest {
  /** 17-character VIN */
  vin: string;
}

/**
 * VIN eligibility response data
 */
export interface VinEligibilityData {
  /** The VIN that was checked */
  vin: string;
  /** Whether the VIN is eligible */
  eligible: boolean;
  /** Eligibility reason code (e.g., OK, CLASS_TOO_HIGH, VIN_ALREADY_USED) */
  reasonCode: string;
}

/**
 * Common eligibility reason codes
 */
export const EligibilityReasonCodes = {
  OK: 'OK',
  CLASS_TOO_HIGH: 'CLASS_TOO_HIGH',
  VIN_ALREADY_USED: 'VIN_ALREADY_USED',
  CONTRACT_LOCKED: 'CONTRACT_LOCKED',
  INVALID_VIN: 'INVALID_VIN',
} as const;

export type EligibilityReasonCode =
  (typeof EligibilityReasonCodes)[keyof typeof EligibilityReasonCodes];

/**
 * Request to commit a VIN (irreversible)
 */
export interface VinCommitRequest {
  /** 17-character VIN */
  vin: string;
  /** Must be true to confirm irreversible action */
  acceptIrreversible: boolean;
}

/**
 * VIN commit response data
 */
export interface VinCommitData {
  /** Request ID for tracking */
  requestId: string;
  /** Current status */
  status: VinAddStatus;
  /** Human-readable message */
  message?: string;
  /** Commit timestamp (if committed) */
  committedAt?: string;
  /** The committed VIN */
  vin?: string;
  /** Decoded VIN information */
  decoded?: VinDecoded;
}

/**
 * VIN request status response data
 */
export interface VinRequestStatusData {
  /** Request ID */
  requestId: string;
  /** Current status */
  status: VinAddStatus;
  /** The VIN being added */
  vin?: string;
  /** Decoded VIN information */
  decoded?: VinDecoded;
  /** Last update timestamp (ISO 8601) */
  lastUpdatedAt: string;
  /** Eligibility result (if checked) */
  eligibilityAllowed?: boolean;
  /** Eligibility reason code */
  eligibilityReasonCode?: string;
}

