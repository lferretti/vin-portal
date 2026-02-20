import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { EnvelopeInterceptor } from './envelope.interceptor';
import { CORRELATION_ID_HEADER } from '../decorators/correlation-id.decorator';

describe('EnvelopeInterceptor', () => {
  let interceptor: EnvelopeInterceptor;
  let mockRequest: Record<string, unknown>;
  let mockResponse: Record<string, jest.Mock>;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new EnvelopeInterceptor();

    mockRequest = {
      headers: {
        [CORRELATION_ID_HEADER]: 'corr-test-123',
      },
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
  });

  it('should wrap response data in ApiEnvelope format', async () => {
    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ name: 'John' })),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect(result).toEqual({
      correlationId: 'corr-test-123',
      success: true,
      data: { name: 'John' },
      error: null,
    });
  });

  it('should set X-Correlation-ID response header', async () => {
    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'corr-test-123');
  });

  it('should not re-wrap data that is already in envelope format', async () => {
    const alreadyWrapped = {
      correlationId: 'existing-corr',
      success: true,
      data: { name: 'John' },
      error: null,
    };

    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(alreadyWrapped)),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect(result).toEqual(alreadyWrapped);
    // Should not double-wrap
    expect((result as Record<string, unknown>)['data']).toEqual({ name: 'John' });
  });

  it('should handle null data', async () => {
    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of(null)),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect(result).toEqual({
      correlationId: 'corr-test-123',
      success: true,
      data: null,
      error: null,
    });
  });

  it('should use empty string when correlation ID header is missing', async () => {
    (mockRequest.headers as Record<string, string>)[CORRELATION_ID_HEADER] = '';
    mockRequest.headers = {};

    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect((result as Record<string, unknown>)['correlationId']).toBe('');
  });

  it('should wrap array data correctly', async () => {
    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of([1, 2, 3])),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect(result).toEqual({
      correlationId: 'corr-test-123',
      success: true,
      data: [1, 2, 3],
      error: null,
    });
  });

  it('should wrap string data correctly', async () => {
    const callHandler: CallHandler = {
      handle: jest.fn().mockReturnValue(of('plain string')),
    };

    const result = await lastValueFrom(interceptor.intercept(mockContext, callHandler));
    expect(result).toEqual({
      correlationId: 'corr-test-123',
      success: true,
      data: 'plain string',
      error: null,
    });
  });
});
