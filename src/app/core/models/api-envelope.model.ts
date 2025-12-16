/**
 * Standard API response wrapper
 * All endpoints return this envelope format
 */
export interface ApiEnvelope<T> {
  /** Unique correlation ID for request tracing */
  correlationId: string;
  /** Indicates if the request was successful */
  success: boolean;
  /** Response data (null on error) */
  data: T | null;
  /** Error details (null on success) */
  error: ApiError | null;
}

/**
 * API error structure
 */
export interface ApiError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Common error codes used across the API
 */
export const ApiErrorCodes = {
  // Authentication errors
  AUTH_NO_MATCH: 'AUTH_NO_MATCH',
  AUTH_OTP_REQUIRED: 'AUTH_OTP_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // OTP errors
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_LOCKED_OUT: 'OTP_LOCKED_OUT',

  // VIN errors
  VIN_INVALID_FORMAT: 'VIN_INVALID_FORMAT',
  VIN_DECODE_FAILED: 'VIN_DECODE_FAILED',
  VIN_INELIGIBLE: 'VIN_INELIGIBLE',
  VIN_ALREADY_COMMITTED: 'VIN_ALREADY_COMMITTED',

  // Contract errors
  CONTRACT_LOCKED: 'CONTRACT_LOCKED',
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',

  // System errors
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

