import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { AdminLoginComponent } from './admin-login.component';
import { AdminService } from '@core/services/admin.service';
import { AdminSessionService } from '@core/services/admin-session.service';
import { ApiEnvelope, AdminLoginResponseData } from '@core/models';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let adminService: { devLogin: jest.Mock };
  let adminSession: { setSession: jest.Mock };
  let router: Router;

  const mockLoginResponse: ApiEnvelope<AdminLoginResponseData> = {
    correlationId: 'corr-100',
    success: true,
    data: {
      token: 'mock-jwt-token',
      expiresAt: '2026-12-31T00:00:00Z',
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Dev Admin',
    },
    error: null,
  };

  const mockSupportLoginResponse: ApiEnvelope<AdminLoginResponseData> = {
    correlationId: 'corr-101',
    success: true,
    data: {
      token: 'mock-jwt-token-support',
      expiresAt: '2026-12-31T00:00:00Z',
      email: 'support@example.com',
      role: 'support',
      displayName: 'Dev Support',
    },
    error: null,
  };

  function setupComponent(): void {
    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
  }

  beforeEach(async () => {
    adminService = {
      devLogin: jest.fn().mockReturnValue(of(mockLoginResponse)),
    };
    adminSession = {
      setSession: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        provideRouter([
          { path: 'admin', component: AdminLoginComponent },
          { path: '', component: AdminLoginComponent },
        ]),
        { provide: AdminService, useValue: adminService },
        { provide: AdminSessionService, useValue: adminSession },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    setupComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display the VIN Portal title', () => {
    setupComponent();
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('VIN Portal');
  });

  it('should display Admin / Support Portal subtitle', () => {
    setupComponent();
    fixture.detectChanges();
    const subtitle = fixture.nativeElement.querySelector('p.text-lg');
    expect(subtitle.textContent).toContain('Admin / Support Portal');
  });

  it('should have Okta widget container div', () => {
    setupComponent();
    fixture.detectChanges();
    const oktaDiv = fixture.nativeElement.querySelector('#okta-signin-widget');
    expect(oktaDiv).toBeTruthy();
    expect(oktaDiv.classList.contains('hidden')).toBe(true);
  });

  it('should show role selection buttons', () => {
    setupComponent();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b: unknown) => (b as HTMLElement).textContent?.trim());
    expect(buttonTexts).toContain('Security / Admin');
    expect(buttonTexts).toContain('Support');
  });

  it('should show Development Login card heading', () => {
    setupComponent();
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('h2');
    expect(heading.textContent).toContain('Development Login');
  });

  it('should call devLogin with admin role when admin button clicked', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();

    component.loginAs('admin');
    tick();

    expect(adminService.devLogin).toHaveBeenCalledWith('admin');
  }));

  it('should call devLogin with support role when support button clicked', fakeAsync(() => {
    adminService.devLogin.mockReturnValue(of(mockSupportLoginResponse));
    setupComponent();
    fixture.detectChanges();

    component.loginAs('support');
    tick();

    expect(adminService.devLogin).toHaveBeenCalledWith('support');
  }));

  it('should set session and navigate to /admin on success', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();

    component.loginAs('admin');
    tick();

    expect(adminSession.setSession).toHaveBeenCalledWith(mockLoginResponse.data);
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  }));

  it('should set loading state while request is in flight', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);

    component.loginAs('admin');
    tick();

    // After synchronous observable completes, loading is reset
    expect(component.isLoading()).toBe(false);
  }));

  it('should set loadingRole during request', fakeAsync(() => {
    setupComponent();
    fixture.detectChanges();

    expect(component.loadingRole()).toBeNull();

    component.loginAs('support');
    tick();

    // After synchronous observable completes, loadingRole is reset
    expect(component.loadingRole()).toBeNull();
  }));

  it('should show error on failure', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: { error: { code: 'AUTH_FAILED', message: 'Invalid credentials' } },
      status: 401,
    });
    adminService.devLogin.mockReturnValue(throwError(() => errorResponse));

    setupComponent();
    fixture.detectChanges();

    component.loginAs('admin');
    tick();

    expect(component.errorMessage()).toBe('Invalid credentials');
    expect(component.isLoading()).toBe(false);
  }));

  it('should show generic error when no message in response', fakeAsync(() => {
    const errorResponse = new HttpErrorResponse({
      error: {},
      status: 500,
    });
    adminService.devLogin.mockReturnValue(throwError(() => errorResponse));

    setupComponent();
    fixture.detectChanges();

    component.loginAs('admin');
    tick();

    expect(component.errorMessage()).toBe('Login failed. Please try again.');
  }));

  it('should clear error message', () => {
    setupComponent();
    fixture.detectChanges();

    component.errorMessage.set('some error');
    component.clearError();
    expect(component.errorMessage()).toBeNull();
  });

  it('should have a back to consumer portal link', () => {
    setupComponent();
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[href="/"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Back to Consumer Portal');
  });
});
