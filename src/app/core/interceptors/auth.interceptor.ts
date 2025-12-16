import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

/**
 * HTTP interceptor that attaches Bearer token to authenticated requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const token = sessionService.getToken();

  // Skip auth header for authentication endpoint
  if (req.url.includes('/contract/authenticate') || req.url.includes('/otp/')) {
    return next(req);
  }

  // Add Bearer token if available
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};

