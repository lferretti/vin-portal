import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, retry, timer } from 'rxjs';
import { SessionService } from '../services/session.service';

/**
 * HTTP interceptor for global error handling.
 * Retries transient errors on GET requests, then handles common error scenarios.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        const isGet = req.method === 'GET';
        const isTransient = error.status === 503 || error.status === 0;
        if (isGet && isTransient) {
          return timer(retryCount * 1000);
        }
        return throwError(() => error);
      },
    }),
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized
      if (error.status === 401) {
        // Check if it's a session expiry vs authentication failure
        const apiError = error.error?.error;
        if (apiError?.code === 'AUTH_EXPIRED' || apiError?.code === 'AUTH_INVALID') {
          sessionService.clearSession();
          router.navigate(['/authenticate']);
        }
      }

      // Parse Retry-After header on 429 for component consumption
      if (error.status === 429) {
        const retryAfter = error.headers?.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : null;
        // Attach parsed value for component consumption
        (error as HttpErrorResponse & { retryAfterSeconds?: number }).retryAfterSeconds =
          retrySeconds && !isNaN(retrySeconds) ? retrySeconds : undefined;
      }

      return throwError(() => error);
    })
  );
};
