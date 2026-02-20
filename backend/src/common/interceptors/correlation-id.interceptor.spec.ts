import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { CorrelationIdInterceptor } from './correlation-id.interceptor';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';

describe('CorrelationIdInterceptor', () => {
  let interceptor: CorrelationIdInterceptor;
  let mockRequest: Record<string, unknown>;
  let mockResponse: Record<string, jest.Mock>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new CorrelationIdInterceptor();

    mockRequest = {
      headers: {} as Record<string, string>,
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };
  });

  it('should generate a correlation ID when none exists in the request', async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    const headers = mockRequest.headers as Record<string, string>;
    expect(headers[CORRELATION_ID_HEADER]).toBeDefined();
    expect(headers[CORRELATION_ID_HEADER]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should use the existing correlation ID from request headers', async () => {
    (mockRequest.headers as Record<string, string>)[CORRELATION_ID_HEADER] = 'existing-corr-id';

    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    const headers = mockRequest.headers as Record<string, string>;
    expect(headers[CORRELATION_ID_HEADER]).toBe('existing-corr-id');
  });

  it('should set X-Correlation-ID header on the response', async () => {
    (mockRequest.headers as Record<string, string>)[CORRELATION_ID_HEADER] = 'my-corr-id';

    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'my-corr-id');
  });

  it('should call next.handle()', async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should pass through the response data unchanged', async () => {
    const result = await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    expect(result).toEqual({ data: 'test' });
  });

  it('should set response header with generated UUID when request has no correlation ID', async () => {
    await lastValueFrom(interceptor.intercept(mockContext, mockCallHandler));
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-/i),
    );
  });
});
