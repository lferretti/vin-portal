import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

/**
 * HTTP interceptor for global error handling
 * Handles common error scenarios like unauthorized and rate limiting
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionService = inject(SessionService);

  return next(req).pipe(
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
        console.warn('Rate limited:', error.error?.error?.message);
      }

      // Handle 503 Service Unavailable
      if (error.status === 503) {
        console.error('Service unavailable:', error.error?.error?.message);
      }

      return throwError(() => error);
    })
  );
};

