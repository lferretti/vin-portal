import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionService } from '../services/session.service';

describe('authGuard', () => {
  let sessionService: jest.Mocked<Pick<SessionService, 'isAuthenticated' | 'setRedirectUrl'>>;
  let router: jest.Mocked<Pick<Router, 'createUrlTree'>>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/vin-entry' } as RouterStateSnapshot;

  beforeEach(() => {
    sessionStorage.clear();

    sessionService = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      setRedirectUrl: jest.fn(),
    };

    router = {
      createUrlTree: jest.fn().mockReturnValue('/authenticate'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should allow authenticated users', () => {
    sessionService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated users to /authenticate', () => {
    sessionService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(router.createUrlTree).toHaveBeenCalledWith(['/authenticate']);
  });

  it('should store the redirect URL when not authenticated', () => {
    sessionService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(sessionService.setRedirectUrl).toHaveBeenCalledWith('/vin-entry');
  });

  it('should not store redirect URL when authenticated', () => {
    sessionService.isAuthenticated.mockReturnValue(true);

    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(sessionService.setRedirectUrl).not.toHaveBeenCalled();
  });
});
