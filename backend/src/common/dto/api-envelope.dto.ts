export class ApiEnvelopeDto<T> {
  correlationId: string;
  success: boolean;
  data: T | null;
  error: ApiErrorDto | null;

  static success<T>(correlationId: string, data: T): ApiEnvelopeDto<T> {
    const envelope = new ApiEnvelopeDto<T>();
    envelope.correlationId = correlationId;
    envelope.success = true;
    envelope.data = data;
    envelope.error = null;
    return envelope;
  }

  static error<T = null>(
    correlationId: string,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): ApiEnvelopeDto<T> {
    const envelope = new ApiEnvelopeDto<T>();
    envelope.correlationId = correlationId;
    envelope.success = false;
    envelope.data = null;
    envelope.error = { code, message, details };
    return envelope;
  }
}

export interface ApiErrorDto {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
