import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConsumerStateService } from '@features/consumer/state/consumer-state.service';

/**
 * Guard that only allows access if OTP verification is required
 * Redirects to authenticate if no OTP challenge active
 */
export const otpRequiredGuard: CanActivateFn = () => {
  const consumerState = inject(ConsumerStateService);
  const router = inject(Router);

  if (consumerState.otpRequired() && consumerState.otpChallengeId()) {
    return true;
  }

  return router.createUrlTree(['/authenticate']);
};

