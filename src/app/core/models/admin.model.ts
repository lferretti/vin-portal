import { VinAddStatus } from './status.enum';
import { VinDecoded } from './vin.model';

/**
 * Admin contract search result
 */
export interface AdminContractSummary {
  /** Internal contract context ID */
  contractContextId: string;
  /** External contract ID from verification system */
  externalContractId: string;
  /** Current status */
  status: VinAddStatus;
  /** Committed VIN (masked) */
  committedVinMasked?: string;
  /** Commit timestamp */
  committedAt?: string;
}

/**
 * Admin request summary (in contract detail list)
 */
export interface AdminRequestSummary {
  /** Request ID */
  requestId: string;
  /** Current status */
  status: VinAddStatus;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Admin contract search response data
 */
export interface AdminContractSearchData {
  /** Search results */
  results: AdminContractSummary[];
}

/**
 * Admin audit event
 */
export interface AdminAuditEvent {
  /** Event type (e.g., AUTH_SUCCESS, VIN_COMMIT, ADMIN_VIEW) */
  eventType: string;
  /** Event timestamp */
  createdAt: string;
  /** Actor type (e.g., CONSUMER, ADMIN, SYSTEM) */
  actorType?: string;
  /** Source IP address (restricted access) */
  sourceIp?: string;
  /** User agent (restricted access) */
  userAgent?: string;
  /** Additional event data */
  eventData?: Record<string, unknown>;
}

/**
 * Admin request detail response data
 */
export interface AdminRequestDetailData {
  /** Request ID */
  requestId: string;
  /** Contract context ID */
  contractContextId: string;
  /** Current status */
  status: VinAddStatus;
  /** The VIN being added */
  vin?: string;
  /** Decoded VIN information */
  decoded?: VinDecoded;
  /** Eligibility result */
  eligibilityAllowed?: boolean;
  /** Eligibility reason code */
  eligibilityReasonCode?: string;
  /** Last dependency error (if any) */
  lastDependencyError?: string;
  /** Audit event timeline */
  audit: AdminAuditEvent[];
}

/**
 * Admin note request
 */
export interface AdminNoteRequest {
  /** Note content (max 4000 characters) */
  note: string;
}

/**
 * Admin note response data
 */
export interface AdminNoteResponseData {
  /** Request ID the note was added to */
  requestId: string;
  /** Whether the note was saved */
  noteSaved: boolean;
}

