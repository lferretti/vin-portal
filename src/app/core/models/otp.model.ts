/**
 * OTP workflow status values
 */
export type OtpStatus =
  | 'NOT_REQUIRED'
  | 'REQUIRED'
  | 'SENT'
  | 'VERIFIED'
  | 'LOCKED_OUT'
  | 'EXPIRED';

/**
 * OTP delivery channel
 */
export type OtpChannel = 'sms' | 'email';

/**
 * OTP summary included in authentication responses
 */
export interface OtpSummary {
  /** Current OTP status */
  status: OtpStatus;
  /** Challenge ID (if OTP required or sent) */
  otpChallengeId: string | null;
  /** Masked destination (e.g., "***-***-1234") */
  maskedDestination: string | null;
  /** Delivery channel */
  channel: OtpChannel | null;
}

/**
 * Request to send OTP
 */
export interface OtpSendRequest {
  /** Challenge ID from authentication response */
  otpChallengeId: string;
}

/**
 * Response after OTP is sent
 */
export interface OtpSendData {
  /** Challenge ID */
  otpChallengeId: string;
  /** Status (should be SENT) */
  status: 'SENT';
  /** Challenge expiration timestamp (ISO 8601) */
  expiresAt: string;
}

/**
 * Request to verify OTP
 */
export interface OtpVerifyRequest {
  /** Challenge ID */
  otpChallengeId: string;
  /** 6-digit OTP code */
  code: string;
}

/**
 * Successful OTP verification response data
 */
export interface OtpVerifySuccessData {
  /** Contract context ID */
  contractContextId: string;
  /** JWT session token */
  sessionToken: string;
  /** Token expiration timestamp (ISO 8601) */
  sessionExpiresAt: string;
  /** Updated OTP summary */
  otp: OtpSummary;
}

