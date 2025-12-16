import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Guard that requires user to be authenticated
 * Redirects to authenticate page if no valid session
 */
export const authGuard: CanActivateFn = (route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (sessionService.isAuthenticated()) {
    return true;
  }

  // Store intended destination for redirect after auth
  sessionService.setRedirectUrl(state.url);
  return router.createUrlTree(['/authenticate']);
};

