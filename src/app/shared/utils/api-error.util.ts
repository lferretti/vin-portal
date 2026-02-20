import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorDetail {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export function extractApiError(err: HttpErrorResponse): ApiErrorDetail | undefined {
  return err.error?.error;
}

export function mapApiErrorMessage(
  err: HttpErrorResponse,
  messageMap: Record<string, string>,
  defaultMessage: string
): string {
  const apiError = extractApiError(err);
  if (apiError?.code && messageMap[apiError.code]) {
    return messageMap[apiError.code];
  }
  return defaultMessage;
}
