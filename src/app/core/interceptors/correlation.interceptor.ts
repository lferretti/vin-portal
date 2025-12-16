import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP interceptor that adds a correlation ID to all requests
 * Used for request tracing and debugging
 */
export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  const correlationId = crypto.randomUUID();

  req = req.clone({
    setHeaders: {
      'X-Correlation-ID': correlationId,
    },
  });

  return next(req);
};

