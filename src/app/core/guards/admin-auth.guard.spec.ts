import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AdminSessionService } from '../services/admin-session.service';
import { adminAuthGuard } from './admin-auth.guard';

describe('adminAuthGuard', () => {
  let adminSessionService: { isAuthenticated: jest.Mock };
  let router: jest.Mocked<Pick<Router, 'createUrlTree'>>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/admin/dashboard' } as RouterStateSnapshot;

  beforeEach(() => {
    adminSessionService = { isAuthenticated: jest.fn() };
    router = {
      createUrlTree: jest.fn().mockReturnValue('/admin/login'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminSessionService, useValue: adminSessionService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('should allow access when authenticated', () => {
    adminSessionService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      adminAuthGuard(mockRoute, mockState),
    );

    expect(result).toBe(true);
  });

  it('should not call createUrlTree when authenticated', () => {
    adminSessionService.isAuthenticated.mockReturnValue(true);

    TestBed.runInInjectionContext(() =>
      adminAuthGuard(mockRoute, mockState),
    );

    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to /admin/login when not authenticated', () => {
    adminSessionService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      adminAuthGuard(mockRoute, mockState),
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
    expect(result).toBe('/admin/login');
  });
});
