import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConsumerStateService } from '@features/consumer/state/consumer-state.service';

/**
 * Guard that only allows access if VIN eligibility check has passed
 * Redirects to VIN entry if not eligible
 */
export const eligibleGuard: CanActivateFn = () => {
  const consumerState = inject(ConsumerStateService);
  const router = inject(Router);

  if (consumerState.isEligible()) {
    return true;
  }

  return router.createUrlTree(['/vin-entry']);
};

