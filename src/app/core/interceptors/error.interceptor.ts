import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, retry, timer } from 'rxjs';
import { SessionService } from '../services/session.service';
import { environment } from '@env';

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

      // Handle 429 Rate Limited
      if (error.status === 429) {
        // Error is handled by components, but we could add global notification here
        if (!environment.production) {
          console.warn('Rate limited:', error.error?.error?.message);
        }
      }

      // Handle 503 Service Unavailable
      if (error.status === 503) {
        if (!environment.production) {
          console.error('Service unavailable:', error.error?.error?.message);
        }
      }

      return throwError(() => error);
    })
  );
};
