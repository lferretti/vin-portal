import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { eligibleGuard } from './eligible.guard';
import { ConsumerStateService } from '@features/consumer/state/consumer-state.service';

describe('eligibleGuard', () => {
  let consumerState: { isEligible: jest.Mock };
  let router: jest.Mocked<Pick<Router, 'createUrlTree'>>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = {} as RouterStateSnapshot;

  beforeEach(() => {
    consumerState = {
      isEligible: jest.fn().mockReturnValue(false),
    };

    router = {
      createUrlTree: jest.fn().mockReturnValue('/vin-entry'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ConsumerStateService, useValue: consumerState },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should allow when eligible', () => {
    consumerState.isEligible.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => eligibleGuard(mockRoute, mockState));

    expect(result).toBe(true);
  });

  it('should redirect to /vin-entry when not eligible', () => {
    consumerState.isEligible.mockReturnValue(false);

    TestBed.runInInjectionContext(() => eligibleGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/vin-entry']);
  });
});
