/**
 * VIN Add Request status values
 * Represents the lifecycle states of a VIN addition request
 */
export enum VinAddStatus {
  /** Contract authenticated, no commit started */
  NOT_USED = 'NOT_USED',
  /** Commit accepted; waiting on dependencies/worker completion */
  PENDING = 'PENDING',
  /** Committed successfully; contract is locked from future VIN adds */
  COMMITTED_LOCKED = 'COMMITTED_LOCKED',
  /** Eligibility rules denied VIN */
  FAILED_INELIGIBLE = 'FAILED_INELIGIBLE',
  /** Dependency unreachable after retries/circuit logic */
  FAILED_DEPENDENCY = 'FAILED_DEPENDENCY',
  /** VIN format/decode validation failed */
  FAILED_VALIDATION = 'FAILED_VALIDATION',
  /** Optional/manual cancellation state (not typical for consumer flow) */
  CANCELLED = 'CANCELLED',
}

/**
 * Check if a status represents a terminal (final) state
 */
export function isTerminalStatus(status: VinAddStatus): boolean {
  return [
    VinAddStatus.COMMITTED_LOCKED,
    VinAddStatus.FAILED_INELIGIBLE,
    VinAddStatus.FAILED_DEPENDENCY,
    VinAddStatus.FAILED_VALIDATION,
    VinAddStatus.CANCELLED,
  ].includes(status);
}

/**
 * Check if a status represents a failure state
 */
export function isFailedStatus(status: VinAddStatus): boolean {
  return [
    VinAddStatus.FAILED_INELIGIBLE,
    VinAddStatus.FAILED_DEPENDENCY,
    VinAddStatus.FAILED_VALIDATION,
  ].includes(status);
}

