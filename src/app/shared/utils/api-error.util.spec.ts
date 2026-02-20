import { HttpErrorResponse } from '@angular/common/http';
import { extractApiError, mapApiErrorMessage } from './api-error.util';

describe('api-error.util', () => {
  describe('extractApiError', () => {
    it('should extract error from API envelope', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            code: 'AUTH_NO_MATCH',
            message: 'No matching contract found',
          },
        },
        status: 401,
      });

      const result = extractApiError(httpError);
      expect(result).toEqual({
        code: 'AUTH_NO_MATCH',
        message: 'No matching contract found',
      });
    });

    it('should return undefined when error body has no error property', () => {
      const httpError = new HttpErrorResponse({
        error: { message: 'Something went wrong' },
        status: 500,
      });

      const result = extractApiError(httpError);
      expect(result).toBeUndefined();
    });

    it('should return undefined when error body is null', () => {
      const httpError = new HttpErrorResponse({
        error: null,
        status: 500,
      });

      const result = extractApiError(httpError);
      expect(result).toBeUndefined();
    });

    it('should extract error with details property', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation error',
            details: { field: 'vin', reason: 'too_short' },
          },
        },
        status: 400,
      });

      const result = extractApiError(httpError);
      expect(result).toBeDefined();
      expect(result!.code).toBe('VALIDATION_FAILED');
      expect(result!.details).toEqual({ field: 'vin', reason: 'too_short' });
    });

    it('should return undefined when error body is a string (network error)', () => {
      const httpError = new HttpErrorResponse({
        error: 'Network Error',
        status: 0,
      });

      const result = extractApiError(httpError);
      expect(result).toBeUndefined();
    });

    it('should handle error with code but no message', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            code: 'UNKNOWN_ERROR',
          },
        },
        status: 500,
      });

      const result = extractApiError(httpError);
      expect(result).toBeDefined();
      expect(result!.code).toBe('UNKNOWN_ERROR');
      expect(result!.message).toBeUndefined();
    });
  });

  describe('mapApiErrorMessage', () => {
    const messageMap: Record<string, string> = {
      AUTH_NO_MATCH: 'We could not find a matching contract. Please check your information.',
      OTP_INVALID: 'The verification code is incorrect. Please try again.',
      VIN_INELIGIBLE: 'This vehicle is not eligible for addition to the contract.',
    };
    const defaultMessage = 'An unexpected error occurred. Please try again later.';

    it('should return mapped message when error code matches', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            code: 'AUTH_NO_MATCH',
            message: 'Server-side message',
          },
        },
        status: 401,
      });

      const result = mapApiErrorMessage(httpError, messageMap, defaultMessage);
      expect(result).toBe(
        'We could not find a matching contract. Please check your information.'
      );
    });

    it('should return default message when error code is not in map', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            code: 'UNKNOWN_CODE',
            message: 'Some error',
          },
        },
        status: 500,
      });

      const result = mapApiErrorMessage(httpError, messageMap, defaultMessage);
      expect(result).toBe('An unexpected error occurred. Please try again later.');
    });

    it('should return default message when no API error can be extracted', () => {
      const httpError = new HttpErrorResponse({
        error: null,
        status: 500,
      });

      const result = mapApiErrorMessage(httpError, messageMap, defaultMessage);
      expect(result).toBe('An unexpected error occurred. Please try again later.');
    });

    it('should return default message when error has no code', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            message: 'No code provided',
          },
        },
        status: 400,
      });

      const result = mapApiErrorMessage(httpError, messageMap, defaultMessage);
      expect(result).toBe('An unexpected error occurred. Please try again later.');
    });

    it('should return mapped message for OTP_INVALID code', () => {
      const httpError = new HttpErrorResponse({
        error: {
          error: {
            code: 'OTP_INVALID',
            message: 'OTP verification failed',
          },
        },
        status: 401,
      });

      const result = mapApiErrorMessage(httpError, messageMap, defaultMessage);
      expect(result).toBe('The verification code is incorrect. Please try again.');
    });

    it('should return default message for network errors (string error body)', () => {
      const httpError = new HttpErrorResponse({
        error: 'Network Error',
        status: 0,
      });

      const result = mapApiErrorMessage(httpError, messageMap, defaultMessage);
      expect(result).toBe('An unexpected error occurred. Please try again later.');
    });

    it('should use the provided default message parameter', () => {
      const httpError = new HttpErrorResponse({
        error: null,
        status: 503,
      });

      const customDefault = 'Service is temporarily unavailable.';
      const result = mapApiErrorMessage(httpError, messageMap, customDefault);
      expect(result).toBe('Service is temporarily unavailable.');
    });
  });
});
