import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { otpRequiredGuard } from './otp-required.guard';
import { ConsumerStateService } from '@features/consumer/state/consumer-state.service';

describe('otpRequiredGuard', () => {
  let consumerState: { otpRequired: jest.Mock; otpChallengeId: jest.Mock };
  let router: jest.Mocked<Pick<Router, 'createUrlTree'>>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    consumerState = {
      otpRequired: jest.fn().mockReturnValue(false),
      otpChallengeId: jest.fn().mockReturnValue(null),
    };

    router = {
      createUrlTree: jest.fn().mockReturnValue('/authenticate'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ConsumerStateService, useValue: consumerState },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should allow when OTP is required and challenge exists', () => {
    consumerState.otpRequired.mockReturnValue(true);
    consumerState.otpChallengeId.mockReturnValue('challenge-123');

    const result = TestBed.runInInjectionContext(() => otpRequiredGuard(mockRoute, mockState));

    expect(result).toBe(true);
  });

  it('should redirect when OTP is not required', () => {
    consumerState.otpRequired.mockReturnValue(false);
    consumerState.otpChallengeId.mockReturnValue('challenge-123');

    TestBed.runInInjectionContext(() => otpRequiredGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/authenticate']);
  });

  it('should redirect when no challenge ID exists', () => {
    consumerState.otpRequired.mockReturnValue(true);
    consumerState.otpChallengeId.mockReturnValue(null);

    TestBed.runInInjectionContext(() => otpRequiredGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/authenticate']);
  });

  it('should redirect when neither OTP required nor challenge exists', () => {
    consumerState.otpRequired.mockReturnValue(false);
    consumerState.otpChallengeId.mockReturnValue(null);

    TestBed.runInInjectionContext(() => otpRequiredGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/authenticate']);
  });
});
