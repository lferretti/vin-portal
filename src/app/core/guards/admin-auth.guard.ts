import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionService } from '../services/admin-session.service';

/**
 * Guard that requires admin authentication.
 * Redirects to /admin/login if no valid admin session exists.
 */
export const adminAuthGuard: CanActivateFn = () => {
  const adminSession = inject(AdminSessionService);
  const router = inject(Router);

  if (adminSession.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};
