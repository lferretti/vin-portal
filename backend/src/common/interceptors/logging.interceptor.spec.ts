import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, lastValueFrom, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockRequest: Record<string, unknown>;
  let mockResponse: Record<string, unknown>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let logSpy: jest.SpyInstance;

  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    mockRequest = {
      method: 'GET',
      url: '/api/v1/contracts',
      ip: '127.0.0.1',
      headers: {
        [CORRELATION_ID_HEADER]: 'corr-id-abc-123',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      },
    };

    mockResponse = {
      statusCode: 200,
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test-response' })),
    };

    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    logSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should call next.handle()', async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should pass through the response data unchanged', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(mockContext, mockCallHandler),
    );
    expect(result).toEqual({ data: 'test-response' });
  });

  it('should log after the response completes', async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    expect(logSpy).toHaveBeenCalled();
  });

  describe('non-production logging', () => {
    beforeEach(() => {
      // The isProduction const is evaluated at module load time.
      // Since NODE_ENV is not 'production' in test, we hit the else branch.
      process.env.NODE_ENV = 'test';
    });

    it('should log method, url, status code, duration, and correlation ID', async () => {
      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(logSpy).toHaveBeenCalledTimes(1);
      const logMessage = logSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('GET');
      expect(logMessage).toContain('/api/v1/contracts');
      expect(logMessage).toContain('200');
      expect(logMessage).toContain('corr-id-abc-123');
      // Duration is a number followed by 'ms'
      expect(logMessage).toMatch(/\d+ms/);
    });

    it('should include the correlation ID in brackets', async () => {
      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logMessage = logSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('[corr-id-abc-123]');
    });

    it('should handle missing correlation ID', async () => {
      (mockRequest.headers as Record<string, string>)[CORRELATION_ID_HEADER] =
        '';
      mockRequest.headers = {};

      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(logSpy).toHaveBeenCalledTimes(1);
      // Should still log without crashing
      const logMessage = logSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('GET');
    });

    it('should log different HTTP methods', async () => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/v1/vin/validate';
      mockResponse.statusCode = 201;

      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logMessage = logSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('POST');
      expect(logMessage).toContain('/api/v1/vin/validate');
      expect(logMessage).toContain('201');
    });

    it('should log error status codes', async () => {
      mockResponse.statusCode = 500;

      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logMessage = logSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('500');
    });
  });

  describe('duration tracking', () => {
    it('should record a non-negative duration', async () => {
      const now = 1000;
      jest.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 42);

      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      const logMessage = logSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain('42ms');

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined user-agent header', async () => {
      delete (mockRequest.headers as Record<string, string>)['user-agent'];

      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      // Should complete without error
      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle undefined IP', async () => {
      delete mockRequest.ip;

      await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      // Should complete without error
      expect(logSpy).toHaveBeenCalled();
    });

    it('should not interfere with observable errors', async () => {
      const testError = new Error('Request failed');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => testError));

      await expect(
        lastValueFrom(interceptor.intercept(mockContext, mockCallHandler)),
      ).rejects.toThrow('Request failed');
    });

    it('should not log when the observable errors (tap only fires on next)', async () => {
      const testError = new Error('Request failed');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => testError));

      try {
        await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
      } catch {
        // expected
      }

      // tap() without an error callback does not fire on error
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
