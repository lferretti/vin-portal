import { HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Record<string, jest.Mock>;
  let mockRequest: Record<string, unknown>;
  let mockHost: Record<string, unknown>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      headers: {
        'x-correlation-id': 'corr-test-123',
      },
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  describe('catch - HttpException', () => {
    it('should set response status from HttpException', () => {
      const exception = new HttpException(
        { code: 'AUTH_NO_MATCH', message: 'No match' },
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockHost as any);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should use the code from HttpException response body', () => {
      const exception = new HttpException(
        { code: 'CONTRACT_LOCKED', message: 'Locked' },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.code).toBe('CONTRACT_LOCKED');
    });

    it('should include the correlation ID in the envelope', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.correlationId).toBe('corr-test-123');
    });

    it('should wrap response in ApiEnvelopeDto format', () => {
      const exception = new HttpException(
        { code: 'AUTH_NO_MATCH', message: 'No match' },
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error).toBeDefined();
      expect(body.error.message).toBe('No match');
    });

    it('should include details when present in HttpException body', () => {
      const exception = new HttpException(
        {
          code: 'AUTH_OTP_REQUIRED',
          message: 'OTP required',
          details: { otpChallengeId: 'otp-1' },
        },
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.details).toEqual({ otpChallengeId: 'otp-1' });
    });

    it('should map status 429 to RATE_LIMITED code when no code in body', () => {
      const exception = new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);

      filter.catch(exception, mockHost as any);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.code).toBe('RATE_LIMITED');
    });

    it('should handle HttpException with string body', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.code).toBe('AUTH_INVALID');
      expect(body.error.message).toBe('Forbidden');
    });
  });

  describe('catch - unknown errors', () => {
    it('should return 500 for unknown errors', () => {
      const error = new Error('Something broke');

      filter.catch(error, mockHost as any);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should return INTERNAL_ERROR code for unknown errors', () => {
      filter.catch(new Error('crash'), mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return generic message for unknown errors', () => {
      filter.catch(new Error('sensitive info'), mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.message).toBe('An unexpected error occurred.');
    });

    it('should handle non-Error throws', () => {
      filter.catch('string error', mockHost as any);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should use empty string for missing correlation ID', () => {
      (mockRequest.headers as Record<string, string>)['x-correlation-id'] = '';
      filter.catch(new Error('test'), mockHost as any);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.correlationId).toBe('');
    });
  });
});
