# Admin Portal Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all 18 gaps between the `docs/admin-portal.md` spec and the current implementation, making the admin portal fully functional with stubbed auth, role-based access, and E2E tests.

**Architecture:** New `AdminSessionService` + `adminAuthGuard` on the frontend for admin-specific auth. Backend gets a dev-only login endpoint, contract detail endpoint, search validation, role-based field filtering, and a `@Roles()` decorator system. Mock layer gains admin auth simulation and missing filters. Okta-ready login page uses a container div + env config for future widget integration.

**Tech Stack:** Angular 21 (signals, standalone components, OnPush), NestJS 11 (Passport, TypeORM), Playwright E2E, Jest unit tests.

**Design Doc:** `docs/plans/2026-02-20-admin-portal-completion-design.md`

---

## Task 1: Admin Session Models & Service (Frontend)

**Files:**
- Modify: `src/app/core/models/admin.model.ts` (add admin session types, lines 93-99)
- Create: `src/app/core/services/admin-session.service.ts`
- Modify: `src/app/core/services/index.ts` (add export, line 9)
- Create: `src/app/core/services/admin-session.service.spec.ts`

**Step 1: Add admin session models to `admin.model.ts`**

Append after line 99 (after `AdminNoteResponseData`):

```typescript
// Admin Auth Models
export interface AdminLoginRequest {
  role: 'admin' | 'support';
}

export interface AdminLoginResponseData {
  token: string;
  expiresAt: string;
  email: string;
  role: string;
  displayName: string;
}

export interface AdminContractDetailData {
  contractContextId: string;
  externalContractId: string | null;
  status: VinAddStatus;
  committedVinMasked: string | null;
  committedAt: string | null;
  requests: AdminRequestSummary[];
}
```

Note: `AdminRequestSummary` already exists at line 23.

**Step 2: Write failing test for `AdminSessionService`**

Create `src/app/core/services/admin-session.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { AdminSessionService } from './admin-session.service';

describe('AdminSessionService', () => {
  let service: AdminSessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSessionService);
  });

  afterEach(() => sessionStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not be authenticated initially', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should set session and become authenticated', () => {
    service.setSession({
      token: 'mock.jwt.token',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Admin User',
    });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.role()).toBe('admin');
    expect(service.email()).toBe('admin@example.com');
    expect(service.displayName()).toBe('Admin User');
  });

  it('should clear session on logout', () => {
    service.setSession({
      token: 'mock.jwt.token',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Admin User',
    });
    service.clearSession();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.role()).toBeNull();
  });

  it('should return null token when expired', () => {
    service.setSession({
      token: 'mock.jwt.token',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Admin User',
    });
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should load session from sessionStorage on init', () => {
    const session = {
      token: 'stored.jwt.token',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      email: 'stored@example.com',
      role: 'support',
      displayName: 'Stored User',
    };
    sessionStorage.setItem('admin_portal_session', JSON.stringify(session));

    const freshService = TestBed.inject(AdminSessionService);
    // Re-create to trigger constructor
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(AdminSessionService);
    expect(newService.isAuthenticated()).toBe(true);
    expect(newService.role()).toBe('support');
  });

  it('should persist session to sessionStorage', () => {
    service.setSession({
      token: 'mock.jwt.token',
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Admin User',
    });
    const stored = JSON.parse(sessionStorage.getItem('admin_portal_session')!);
    expect(stored.token).toBe('mock.jwt.token');
    expect(stored.role).toBe('admin');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- --testPathPattern admin-session.service.spec`
Expected: FAIL — module not found

**Step 4: Implement `AdminSessionService`**

Create `src/app/core/services/admin-session.service.ts`:

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { AdminLoginResponseData } from '@core/models';

const ADMIN_SESSION_KEY = 'admin_portal_session';

interface StoredAdminSession {
  token: string;
  expiresAt: string;
  email: string;
  role: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  private readonly _token = signal<string | null>(null);
  private readonly _expiresAt = signal<Date | null>(null);
  private readonly _email = signal<string | null>(null);
  private readonly _role = signal<string | null>(null);
  private readonly _displayName = signal<string | null>(null);

  readonly token = this._token.asReadonly();
  readonly email = this._email.asReadonly();
  readonly role = this._role.asReadonly();
  readonly displayName = this._displayName.asReadonly();

  readonly isAuthenticated = computed(() => {
    const token = this._token();
    return !!token && !this.isExpired();
  });

  constructor() {
    this.loadFromStorage();
  }

  setSession(data: AdminLoginResponseData): void {
    this._token.set(data.token);
    this._expiresAt.set(new Date(data.expiresAt));
    this._email.set(data.email);
    this._role.set(data.role);
    this._displayName.set(data.displayName);

    this.saveToStorage({
      token: data.token,
      expiresAt: data.expiresAt,
      email: data.email,
      role: data.role,
      displayName: data.displayName,
    });
  }

  clearSession(): void {
    this._token.set(null);
    this._expiresAt.set(null);
    this._email.set(null);
    this._role.set(null);
    this._displayName.set(null);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  getToken(): string | null {
    if (this.isExpired()) {
      this.clearSession();
      return null;
    }
    return this._token();
  }

  private isExpired(): boolean {
    const expiresAt = this._expiresAt();
    if (!expiresAt) return true;
    return Date.now() >= expiresAt.getTime();
  }

  private loadFromStorage(): void {
    try {
      const data = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (!data) return;
      const stored: StoredAdminSession = JSON.parse(data);
      const expiresAt = new Date(stored.expiresAt);
      if (Date.now() >= expiresAt.getTime()) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        return;
      }
      this._token.set(stored.token);
      this._expiresAt.set(expiresAt);
      this._email.set(stored.email);
      this._role.set(stored.role);
      this._displayName.set(stored.displayName);
    } catch {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  }

  private saveToStorage(session: StoredAdminSession): void {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPattern admin-session.service.spec`
Expected: PASS

**Step 6: Export from barrel**

Add to `src/app/core/services/index.ts` after line 8:

```typescript
export { AdminSessionService } from './admin-session.service';
```

**Step 7: Commit**

```bash
git add src/app/core/models/admin.model.ts src/app/core/services/admin-session.service.ts src/app/core/services/admin-session.service.spec.ts src/app/core/services/index.ts
git commit -m "feat(admin): add AdminSessionService and admin auth models"
```

---

## Task 2: Admin Auth Guard (Frontend)

**Files:**
- Create: `src/app/core/guards/admin-auth.guard.ts`
- Create: `src/app/core/guards/admin-auth.guard.spec.ts`
- Modify: `src/app/core/guards/index.ts` (add export)

**Step 1: Write failing test**

Create `src/app/core/guards/admin-auth.guard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminSessionService } from '@core/services';
import { adminAuthGuard } from './admin-auth.guard';

describe('adminAuthGuard', () => {
  let adminSessionService: { isAuthenticated: jest.Mock };
  let router: { createUrlTree: jest.Mock };

  beforeEach(() => {
    adminSessionService = { isAuthenticated: jest.fn() };
    router = { createUrlTree: jest.fn().mockReturnValue('/admin/login') };

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
      adminAuthGuard({} as any, {} as any)
    );
    expect(result).toBe(true);
  });

  it('should redirect to /admin/login when not authenticated', () => {
    adminSessionService.isAuthenticated.mockReturnValue(false);
    TestBed.runInInjectionContext(() =>
      adminAuthGuard({} as any, {} as any)
    );
    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern admin-auth.guard.spec`
Expected: FAIL — module not found

**Step 3: Implement guard**

Create `src/app/core/guards/admin-auth.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionService } from '../services/admin-session.service';

export const adminAuthGuard: CanActivateFn = () => {
  const adminSession = inject(AdminSessionService);
  const router = inject(Router);

  if (adminSession.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern admin-auth.guard.spec`
Expected: PASS

**Step 5: Export from barrel**

Add to `src/app/core/guards/index.ts` after line 3:

```typescript
export { adminAuthGuard } from './admin-auth.guard';
```

**Step 6: Commit**

```bash
git add src/app/core/guards/admin-auth.guard.ts src/app/core/guards/admin-auth.guard.spec.ts src/app/core/guards/index.ts
git commit -m "feat(admin): add adminAuthGuard for admin route protection"
```

---

## Task 3: Admin Login Component (Frontend)

**Files:**
- Create: `src/app/features/admin/pages/admin-login/admin-login.component.ts`
- Create: `src/app/features/admin/pages/admin-login/admin-login.component.spec.ts`
- Modify: `src/app/features/admin/admin.routes.ts` (add login route, swap guard)

**Step 1: Write failing test**

Create `src/app/features/admin/pages/admin-login/admin-login.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminLoginComponent } from './admin-login.component';
import { AdminService, AdminSessionService } from '@core/services';
import { of, throwError } from 'rxjs';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let adminService: { devLogin: jest.Mock };
  let adminSession: { setSession: jest.Mock; isAuthenticated: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(async () => {
    adminService = {
      devLogin: jest.fn().mockReturnValue(of({
        success: true,
        data: {
          token: 'mock.jwt.token',
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
          email: 'admin@example.com',
          role: 'admin',
          displayName: 'Dev Admin',
        },
      })),
    };
    adminSession = {
      setSession: jest.fn(),
      isAuthenticated: jest.fn().mockReturnValue(false),
    };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: AdminSessionService, useValue: adminSession },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show role selection buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Security / Admin');
    expect(el.textContent).toContain('Support');
  });

  it('should call devLogin with admin role when admin button clicked', () => {
    component.loginAs('admin');
    expect(adminService.devLogin).toHaveBeenCalledWith('admin');
  });

  it('should call devLogin with support role when support button clicked', () => {
    component.loginAs('support');
    expect(adminService.devLogin).toHaveBeenCalledWith('support');
  });

  it('should set session and navigate to /admin on success', () => {
    component.loginAs('admin');
    expect(adminSession.setSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should show error on failure', () => {
    adminService.devLogin.mockReturnValue(
      throwError(() => new Error('Login failed'))
    );
    component.loginAs('admin');
    expect(component.errorMessage()).toBe('Login failed. Please try again.');
  });

  it('should have Okta widget container div', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#okta-signin-widget')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern admin-login.component.spec`
Expected: FAIL — module not found

**Step 3: Implement `AdminLoginComponent`**

Create `src/app/features/admin/pages/admin-login/admin-login.component.ts`:

```typescript
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, AdminSessionService } from '@core/services';
import { AlertBannerComponent } from '@shared/components';
import { environment } from '@env';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [AlertBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-slate-900">VIN Portal</h1>
          <p class="text-slate-600 mt-1">Admin / Support Portal</p>
        </div>

        @if (errorMessage()) {
          <app-alert-banner type="error" [message]="errorMessage()!" class="mb-4" />
        }

        <!-- Okta widget container (hidden in dev/mock mode) -->
        <div id="okta-signin-widget" class="hidden"></div>

        <!-- Dev/mock login: role picker -->
        @if (isMockMode) {
          <div class="card">
            <h2 class="text-lg font-semibold text-slate-900 mb-2">Development Login</h2>
            <p class="text-sm text-slate-600 mb-6">Select a role to sign in with mock credentials.</p>

            <div class="space-y-3">
              <button
                (click)="loginAs('admin')"
                [disabled]="isLoading()"
                class="w-full flex items-center justify-between p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div class="text-left">
                  <div class="font-medium text-slate-900">Security / Admin</div>
                  <div class="text-sm text-slate-500">Full access including IP addresses and user agents</div>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">admin</span>
              </button>

              <button
                (click)="loginAs('support')"
                [disabled]="isLoading()"
                class="w-full flex items-center justify-between p-4 rounded-lg border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div class="text-left">
                  <div class="font-medium text-slate-900">Support</div>
                  <div class="text-sm text-slate-500">View contracts, requests, and add notes</div>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">support</span>
              </button>
            </div>

            @if (isLoading()) {
              <div class="mt-4 text-center text-sm text-slate-500">Signing in...</div>
            }
          </div>
        } @else {
          <div class="card text-center">
            <p class="text-slate-600">Redirecting to SSO login...</p>
            <!-- TODO: Initialize Okta Sign-In Widget here -->
            <!-- Configuration: environment.admin.oktaIssuer, environment.admin.oktaClientId -->
          </div>
        }

        <div class="mt-6 text-center">
          <a href="/" class="text-sm text-blue-600 hover:underline">Back to Consumer Portal</a>
        </div>
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  private readonly adminService = inject(AdminService);
  private readonly adminSession = inject(AdminSessionService);
  private readonly router = inject(Router);

  readonly isMockMode = environment.features.mockApi;
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  loginAs(role: 'admin' | 'support'): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.devLogin(role).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.adminSession.setSession(response.data);
          this.router.navigate(['/admin']);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Login failed. Please try again.');
        this.isLoading.set(false);
      },
    });
  }
}
```

**Step 4: Add `devLogin` method to `AdminService`**

Add to `src/app/core/services/admin.service.ts` after `addNote()` method (after line 65):

```typescript
  devLogin(role: 'admin' | 'support'): Observable<ApiEnvelope<AdminLoginResponseData>> {
    return this.api.post<AdminLoginResponseData>('/admin/auth/dev-login', { role });
  }
```

Also update the imports at the top to include `AdminLoginResponseData`:

```typescript
import {
  ApiEnvelope,
  AdminContractSearchData,
  AdminRequestDetailData,
  AdminNoteRequest,
  AdminNoteResponseData,
  AdminLoginResponseData,
  AdminContractDetailData,
} from '@core/models';
```

**Step 5: Update admin routes**

Replace `src/app/features/admin/admin.routes.ts` content:

```typescript
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { adminAuthGuard } from '@core/guards';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent
      ),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/contract-search/contract-search.component').then(
            (m) => m.ContractSearchComponent
          ),
      },
      {
        path: 'contract/:contractContextId',
        loadComponent: () =>
          import('./pages/contract-detail/contract-detail.component').then(
            (m) => m.ContractDetailComponent
          ),
      },
      {
        path: 'request/:requestId',
        loadComponent: () =>
          import('./pages/request-detail/request-detail.component').then(
            (m) => m.RequestDetailComponent
          ),
      },
    ],
  },
];
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- --testPathPattern admin-login.component.spec`
Expected: PASS

**Step 7: Commit**

```bash
git add src/app/features/admin/pages/admin-login/ src/app/features/admin/admin.routes.ts src/app/core/services/admin.service.ts
git commit -m "feat(admin): add admin login page with dev role picker and Okta placeholder"
```

---

## Task 4: Mock Admin Auth (Frontend Mock Layer)

**Files:**
- Modify: `src/app/core/services/mock-api.service.ts` (add `devLogin`, fix `searchContracts` requestId filter)
- Modify: `src/app/core/interceptors/mock.interceptor.ts` (add admin auth route)

**Step 1: Add `devLogin` mock to `MockApiService`**

Insert in `mock-api.service.ts` before the `// ============== Admin Operations ==============` line (line 415):

```typescript
  // ============== Admin Auth ==============

  devLogin(role: string): Observable<ApiEnvelope<AdminLoginResponseData>> {
    return of(null).pipe(
      delay(this.randomDelay(200, 500)),
      map(() => {
        const isAdmin = role === 'admin';
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(
          JSON.stringify({
            adminUserId: isAdmin ? 'admin-001' : 'support-001',
            email: isAdmin ? 'admin@example.com' : 'support@example.com',
            role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          })
        );
        const signature = btoa('mock-admin-signature');
        const token = `${header}.${payload}.${signature}`;

        return this.successResponse<AdminLoginResponseData>({
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          email: isAdmin ? 'admin@example.com' : 'support@example.com',
          role,
          displayName: isAdmin ? 'Dev Admin' : 'Dev Support',
        });
      })
    );
  }
```

Add `AdminLoginResponseData` to the imports from `@core/models` at the top of `mock-api.service.ts`.

**Step 2: Fix `searchContracts` requestId filter**

In `mock-api.service.ts`, update the `searchContracts` filter function (around line 426-433). Replace the filter body with:

```typescript
          .filter((c) => {
            if (params.contractNumber && !c.contractNumber.includes(params.contractNumber)) {
              return false;
            }
            if (params.externalContractId && c.externalContractId !== params.externalContractId) {
              return false;
            }
            if (params.requestId) {
              const hasMatchingRequest = Array.from(this._requests().values()).some(
                (r) => r.id === params.requestId && r.contractContextId === c.id
              );
              if (!hasMatchingRequest) return false;
            }
            return true;
          })
```

**Step 3: Add admin login route to mock interceptor**

In `mock.interceptor.ts`, insert before the existing `// Admin endpoints` comment (line 95):

```typescript
  // Admin auth
  if (url.includes('/admin/auth/dev-login') && method === 'POST') {
    return mockApi
      .devLogin(body['role'] as string)
      .pipe(switchMap((response) => toHttpResult(response, url)));
  }
```

**Step 4: Run all admin-related tests**

Run: `npm test -- --testPathPattern "admin|mock"`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/app/core/services/mock-api.service.ts src/app/core/interceptors/mock.interceptor.ts
git commit -m "feat(admin): add mock admin auth and fix searchContracts requestId filter"
```

---

## Task 5: Backend Dev Login Endpoint

**Files:**
- Create: `backend/src/modules/admin/admin-auth.controller.ts`
- Create: `backend/src/modules/admin/admin-auth.controller.spec.ts`
- Create: `backend/src/modules/admin/dto/admin-login.dto.ts`
- Modify: `backend/src/modules/admin/admin.module.ts` (add controller)

**Step 1: Create login DTO**

Create `backend/src/modules/admin/dto/admin-login.dto.ts`:

```typescript
import { IsIn, IsString } from 'class-validator';

export class AdminDevLoginDto {
  @IsString()
  @IsIn(['admin', 'support'])
  role!: string;
}
```

**Step 2: Write failing test**

Create `backend/src/modules/admin/admin-auth.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthController } from './admin-auth.controller';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  beforeEach(async () => {
    authService = {
      createAdminToken: jest.fn().mockReturnValue({
        token: 'mock.admin.jwt',
        expiresAt: '2026-02-20T12:00:00.000Z',
      }),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'app.nodeEnv') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  describe('devLogin', () => {
    it('should return token for admin role', async () => {
      const result = await controller.devLogin({ role: 'admin' });
      expect(result.token).toBe('mock.admin.jwt');
      expect(authService.createAdminToken).toHaveBeenCalledWith({
        adminUserId: expect.stringContaining('dev-admin'),
        email: 'admin@dev.local',
        role: 'admin',
      });
    });

    it('should return token for support role', async () => {
      await controller.devLogin({ role: 'support' });
      expect(authService.createAdminToken).toHaveBeenCalledWith({
        adminUserId: expect.stringContaining('dev-support'),
        email: 'support@dev.local',
        role: 'support',
      });
    });

    it('should include displayName and email in response', async () => {
      const result = await controller.devLogin({ role: 'admin' });
      expect(result.email).toBe('admin@dev.local');
      expect(result.displayName).toBeDefined();
    });

    it('should throw ForbiddenException in production', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'app.nodeEnv') return 'production';
        return undefined;
      });
      await expect(controller.devLogin({ role: 'admin' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern admin-auth.controller.spec`
Expected: FAIL — module not found

**Step 4: Implement controller**

Create `backend/src/modules/admin/admin-auth.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { AdminDevLoginDto } from './dto/admin-login.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('dev-login')
  async devLogin(@Body() dto: AdminDevLoginDto) {
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    if (nodeEnv === 'production') {
      throw new ForbiddenException('Dev login is not available in production');
    }

    const isAdmin = dto.role === 'admin';
    const payload = {
      adminUserId: isAdmin ? 'dev-admin-001' : 'dev-support-001',
      email: isAdmin ? 'admin@dev.local' : 'support@dev.local',
      role: dto.role,
    };

    const { token, expiresAt } = this.authService.createAdminToken(payload);

    return {
      token,
      expiresAt,
      email: payload.email,
      role: dto.role,
      displayName: isAdmin ? 'Dev Admin' : 'Dev Support',
    };
  }

  @Post('sso-callback')
  async ssoCallback() {
    // TODO: Implement Okta OIDC callback
    // 1. Validate IdP token
    // 2. Look up or create admin_user record
    // 3. Issue admin JWT
    throw new ForbiddenException('SSO callback not yet implemented');
  }
}
```

**Step 5: Register controller in module**

In `backend/src/modules/admin/admin.module.ts`, add `AdminAuthController` to the controllers array:

```typescript
import { AdminAuthController } from './admin-auth.controller';
```

```typescript
  controllers: [AdminController, AdminAuthController],
```

**Step 6: Update admin JWT strategy valid roles**

In `backend/src/modules/auth/admin-jwt.strategy.ts`, update line 19:

```typescript
const VALID_ADMIN_ROLES = ['admin', 'supervisor', 'readonly', 'support'] as const;
```

**Step 7: Run tests to verify they pass**

Run: `cd backend && npm test -- --testPathPattern admin-auth.controller.spec`
Expected: PASS

**Step 8: Commit**

```bash
git add backend/src/modules/admin/admin-auth.controller.ts backend/src/modules/admin/admin-auth.controller.spec.ts backend/src/modules/admin/dto/admin-login.dto.ts backend/src/modules/admin/admin.module.ts backend/src/modules/auth/admin-jwt.strategy.ts
git commit -m "feat(admin): add dev-login endpoint and update valid admin roles"
```

---

## Task 6: Backend Contract Detail Endpoint

**Files:**
- Modify: `backend/src/modules/admin/admin.controller.ts` (add GET endpoint)
- Modify: `backend/src/modules/admin/admin.service.ts` (add method)
- Modify: `backend/src/modules/admin/admin.controller.spec.ts` (add tests)
- Modify: `backend/src/modules/admin/admin.service.spec.ts` (add tests)

**Step 1: Add test for controller endpoint**

Add to `backend/src/modules/admin/admin.controller.spec.ts` inside the describe block, after `getRequestDetail` section:

```typescript
  describe('getContractDetail', () => {
    beforeEach(() => {
      adminService.getContractDetail = jest.fn().mockResolvedValue({
        contractContextId: 'ctx-1',
        status: 'NOT_USED',
        requests: [],
      });
    });

    it('should call adminService.getContractDetail with correct arguments', async () => {
      await controller.getContractDetail('ctx-1', correlationId, ip, userAgent);
      expect(adminService.getContractDetail).toHaveBeenCalledWith(
        'ctx-1', correlationId, ip, userAgent,
      );
    });

    it('should return the service response', async () => {
      const result = await controller.getContractDetail('ctx-1', correlationId, ip, userAgent);
      expect(result.contractContextId).toBe('ctx-1');
    });

    it('should propagate service errors', async () => {
      adminService.getContractDetail.mockRejectedValue(new Error('Not found'));
      await expect(
        controller.getContractDetail('ctx-1', correlationId, ip, userAgent),
      ).rejects.toThrow('Not found');
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern admin.controller.spec`
Expected: FAIL — `getContractDetail` is not a function on controller

**Step 3: Add controller endpoint**

In `backend/src/modules/admin/admin.controller.ts`, add after `searchContracts` (after line 32) — **IMPORTANT**: this must come before `getRequestDetail` to prevent route conflicts:

```typescript
  @Get('contracts/:contractContextId')
  getContractDetail(
    @Param('contractContextId', ParseUUIDPipe) contractContextId: string,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.getContractDetail(contractContextId, correlationId, ip, userAgent);
  }
```

**Step 4: Add service method**

In `backend/src/modules/admin/admin.service.ts`, add after `searchContracts` method (after line 82):

```typescript
  async getContractDetail(
    contractContextId: string,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
  ) {
    const contract = await this.contractRepo.findOne({
      where: { id: contractContextId },
    });

    if (!contract) {
      throw new HttpException(
        {
          code: ErrorCodes.CONTRACT_NOT_FOUND,
          message: 'Contract not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const requests = await this.requestRepo.find({
      where: { contractContextId },
      order: { createdAt: 'DESC' },
    });

    await this.auditService.emit({
      eventType: EventTypes.ADMIN_VIEW,
      actorType: ActorType.ADMIN,
      contractContextId,
      correlationId,
      sourceIp,
      userAgent,
      eventData: { action: 'contract_detail' },
    });

    return {
      contractContextId: contract.id,
      externalContractId: contract.externalContractId,
      status: contract.status,
      committedVinMasked: contract.committedVinMasked,
      committedAt: contract.committedAt?.toISOString() ?? null,
      requests: requests.map((r) => ({
        requestId: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- --testPathPattern "admin.controller.spec|admin.service.spec"`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/modules/admin/admin.controller.ts backend/src/modules/admin/admin.service.ts backend/src/modules/admin/admin.controller.spec.ts
git commit -m "feat(admin): add GET /admin/contracts/:contractContextId endpoint"
```

---

## Task 7: Frontend Contract Detail Wiring

**Files:**
- Modify: `src/app/core/services/admin.service.ts` (add `getContractDetail`)
- Modify: `src/app/features/admin/pages/contract-detail/contract-detail.component.ts` (wire loadData)
- Modify: `src/app/core/services/mock-api.service.ts` (add `getContractDetail` mock)
- Modify: `src/app/core/interceptors/mock.interceptor.ts` (add route matcher)

**Step 1: Add `getContractDetail` to frontend `AdminService`**

In `src/app/core/services/admin.service.ts`, add after `getRequestDetail`:

```typescript
  getContractDetail(contractContextId: string): Observable<ApiEnvelope<AdminContractDetailData>> {
    return this.api.get<AdminContractDetailData>(`/admin/contracts/${contractContextId}`);
  }
```

**Step 2: Add mock `getContractDetail`**

In `mock-api.service.ts`, add after `devLogin` method:

```typescript
  getContractDetail(contractContextId: string): Observable<ApiEnvelope<AdminContractDetailData>> {
    return of(null).pipe(
      delay(this.randomDelay(300, 800)),
      map(() => {
        const contract = this._contracts().get(contractContextId);
        if (!contract) {
          return this.errorResponse<AdminContractDetailData>(
            ApiErrorCodes.CONTRACT_NOT_FOUND,
            'Contract not found.'
          );
        }

        const requests = Array.from(this._requests().values())
          .filter((r) => r.contractContextId === contractContextId)
          .map((r) => ({
            requestId: r.id,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
          }));

        return this.successResponse<AdminContractDetailData>({
          contractContextId: contract.id,
          externalContractId: contract.externalContractId,
          status: contract.hasAdditionalVin ? VinAddStatus.COMMITTED_LOCKED : VinAddStatus.NOT_USED,
          committedVinMasked: contract.additionalVinMasked ?? null,
          committedAt: contract.additionalVinCommittedAt ?? null,
          requests,
        });
      })
    );
  }
```

Add `AdminContractDetailData` to the imports from `@core/models`.

**Step 3: Add mock interceptor route**

In `mock.interceptor.ts`, the existing `url.includes('/admin/contracts')` at line 96 will match both search and detail. We need to add the contract detail route **before** the search route. Insert before line 96:

```typescript
  // Admin contract detail (must be before search route)
  if (url.match(/\/admin\/contracts\/[^?]+$/) && !url.includes('?') && method === 'GET') {
    const contractContextId = url.split('/').pop() || '';
    return mockApi
      .getContractDetail(contractContextId)
      .pipe(switchMap((response) => toHttpResult(response, url)));
  }
```

Update the existing search route to be more specific (line 96):

```typescript
  if (url.includes('/admin/contracts') && url.includes('?') && method === 'GET') {
```

Actually, a better approach — use regex. Replace the existing search handler condition with:

```typescript
  if (url.match(/\/admin\/contracts(\?|$)/) && !url.match(/\/admin\/contracts\/[^?]/) && method === 'GET') {
```

**Step 4: Wire `ContractDetailComponent.loadData()`**

In `src/app/features/admin/pages/contract-detail/contract-detail.component.ts`, replace the stub `loadData()` method (lines 166-175) with:

```typescript
  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService
      .getContractDetail(this.contractContextId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.contractData.set(response.data);
            if (response.data.requests.length > 0) {
              // Load the most recent request detail
              const latestRequest = response.data.requests[0];
              this.loadRequestData(latestRequest.requestId);
            }
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.error?.message || 'Failed to load contract details.'
          );
          this.isLoading.set(false);
        },
      });
  }

  private loadRequestData(requestId: string): void {
    this.adminService
      .getRequestDetail(requestId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.requestData.set(response.data);
          }
        },
      });
  }
```

Also update imports in the component: add `DestroyRef`, `takeUntilDestroyed`, and add a `contractData` signal. Remove the unused `VinService` import. Add `destroyRef = inject(DestroyRef)` and `contractData = signal<AdminContractDetailData | null>(null)` to the class.

**Step 5: Run tests**

Run: `npm test -- --testPathPattern contract-detail.component.spec`
Expected: PASS (update spec if needed for new signal/method signatures)

**Step 6: Commit**

```bash
git add src/app/core/services/admin.service.ts src/app/core/services/mock-api.service.ts src/app/core/interceptors/mock.interceptor.ts src/app/features/admin/pages/contract-detail/contract-detail.component.ts
git commit -m "feat(admin): wire contract detail page to real API"
```

---

## Task 8: Backend Search Validation

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts` (add at-least-one-param check)
- Modify: `backend/src/modules/admin/admin.service.spec.ts` (add test)

**Step 1: Write failing test**

Add to `backend/src/modules/admin/admin.service.spec.ts`:

```typescript
  it('should throw 400 when no search criteria provided', async () => {
    await expect(
      service.searchContracts({}, 'corr', '127.0.0.1', 'agent'),
    ).rejects.toThrow('At least one search criterion is required');
  });
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern admin.service.spec`
Expected: FAIL — currently returns all contracts instead of throwing

**Step 3: Add validation**

In `backend/src/modules/admin/admin.service.ts`, add at the beginning of `searchContracts` (after line 42):

```typescript
    if (!query.contractNumber && !query.externalContractId && !query.requestId) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'At least one search criterion is required.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- --testPathPattern admin.service.spec`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/admin/admin.service.ts backend/src/modules/admin/admin.service.spec.ts
git commit -m "fix(admin): enforce at-least-one search criterion on admin contract search"
```

---

## Task 9: Role-Based Field Filtering (Backend)

**Files:**
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Modify: `backend/src/modules/admin/admin.service.ts` (strip fields for non-admin)
- Modify: `backend/src/modules/admin/admin.controller.ts` (pass user to service)

**Step 1: Create Roles decorator**

Create `backend/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Step 2: Create RolesGuard**

Create `backend/src/common/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

**Step 3: Pass admin user to service**

In `backend/src/modules/admin/admin.controller.ts`, add `@Request()` decorator to `getRequestDetail`:

Add import: `import { Request as NestRequest } from '@nestjs/common';`

Update `getRequestDetail`:

```typescript
  @Get('requests/:requestId')
  getRequestDetail(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CorrelationId() correlationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: { user?: { role?: string } },
  ) {
    const callerRole = req.user?.role ?? 'support';
    return this.adminService.getRequestDetail(requestId, correlationId, ip, userAgent, callerRole);
  }
```

Add `Req` to the NestJS imports.

**Step 4: Update service to filter fields**

In `backend/src/modules/admin/admin.service.ts`, update `getRequestDetail` signature to accept `callerRole`:

```typescript
  async getRequestDetail(
    requestId: string,
    correlationId: string,
    sourceIp: string,
    userAgent: string,
    callerRole: string = 'support',
  ) {
```

And update the audit event mapping (around line 132-139):

```typescript
    const showRestrictedFields = callerRole === 'admin';

    return {
      requestId: request.id,
      contractContextId: request.contractContextId,
      status: request.status,
      vin: request.vin,
      decoded: request.decoded,
      eligibilityAllowed: request.eligibilityAllowed,
      eligibilityReasonCode: request.eligibilityReasonCode,
      lastDependencyError: request.lastDependencyError,
      audit: auditEvents.map((e) => ({
        eventType: e.eventType,
        createdAt: e.createdAt.toISOString(),
        actorType: e.actorType,
        sourceIp: showRestrictedFields ? e.sourceIp : undefined,
        userAgent: showRestrictedFields ? e.userAgent : undefined,
        eventData: e.eventData,
      })),
    };
```

**Step 5: Update controller spec**

In `admin.controller.spec.ts`, update `getRequestDetail` tests to account for `req` parameter:

```typescript
  it('should pass caller role from request user', async () => {
    await controller.getRequestDetail('req-1', correlationId, ip, userAgent, { user: { role: 'admin' } } as any);
    expect(adminService.getRequestDetail).toHaveBeenCalledWith('req-1', correlationId, ip, userAgent, 'admin');
  });
```

**Step 6: Add service spec test for role filtering**

Add to `admin.service.spec.ts`:

```typescript
  it('should include sourceIp/userAgent for admin role', async () => {
    // ... setup mock data with sourceIp/userAgent in audit events
    const result = await service.getRequestDetail('req-1', 'corr', '127.0.0.1', 'agent', 'admin');
    expect(result.audit[0].sourceIp).toBeDefined();
  });

  it('should strip sourceIp/userAgent for support role', async () => {
    const result = await service.getRequestDetail('req-1', 'corr', '127.0.0.1', 'agent', 'support');
    expect(result.audit[0].sourceIp).toBeUndefined();
  });
```

**Step 7: Run tests**

Run: `cd backend && npm test -- --testPathPattern "admin.service.spec|admin.controller.spec"`
Expected: PASS

**Step 8: Commit**

```bash
git add backend/src/common/decorators/roles.decorator.ts backend/src/common/guards/roles.guard.ts backend/src/modules/admin/admin.controller.ts backend/src/modules/admin/admin.service.ts backend/src/modules/admin/admin.controller.spec.ts backend/src/modules/admin/admin.service.spec.ts
git commit -m "feat(admin): add role-based field filtering on audit events"
```

---

## Task 10: Admin Layout Updates (Identity, Logout, Role)

**Files:**
- Modify: `src/app/features/admin/layout/admin-layout.component.ts`
- Modify: `src/app/features/admin/layout/admin-layout.component.spec.ts`

**Step 1: Update layout component**

In `admin-layout.component.ts`, add imports and inject `AdminSessionService` and `Router`:

```typescript
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminSessionService } from '@core/services';
```

Update the class:

```typescript
export class AdminLayoutComponent {
  private readonly adminSession = inject(AdminSessionService);
  private readonly router = inject(Router);

  readonly displayName = this.adminSession.displayName;
  readonly role = this.adminSession.role;
  readonly email = this.adminSession.email;

  logout(): void {
    this.adminSession.clearSession();
    this.router.navigate(['/admin/login']);
  }
}
```

Update the template sidebar bottom section (lines 70-85) to show user info + logout:

```html
        <!-- User info + logout -->
        <div class="px-4 py-4 border-t border-slate-700">
          @if (displayName()) {
            <div class="mb-3">
              <div class="text-sm font-medium text-slate-200">{{ displayName() }}</div>
              <div class="text-xs text-slate-400">{{ email() }}</div>
              <span class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                [class]="role() === 'admin' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'">
                {{ role() === 'admin' ? 'Security / Admin' : 'Support' }}
              </span>
            </div>
          }
          <button
            (click)="logout()"
            class="w-full text-left text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
          <a routerLink="/" class="block mt-2 text-sm text-slate-400 hover:text-white transition-colors">
            Back to Consumer Portal
          </a>
        </div>
```

**Step 2: Update layout spec**

Update `admin-layout.component.spec.ts` to provide `AdminSessionService` mock and test the new elements:

```typescript
  it('should show admin display name', () => {
    // verify displayName signal value renders
  });

  it('should show role badge', () => {
    // verify role badge renders
  });

  it('should call logout and navigate on sign out click', () => {
    // verify clearSession + navigate called
  });
```

**Step 3: Run tests**

Run: `npm test -- --testPathPattern admin-layout`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/features/admin/layout/
git commit -m "feat(admin): add user identity display and logout to admin layout"
```

---

## Task 11: Dashboard Status Reference Update

**Files:**
- Modify: `src/app/features/admin/pages/admin-dashboard/admin-dashboard.component.ts`

**Step 1: Update status reference section**

Replace the Status Reference card in the dashboard template with all 7 statuses from the spec:

```html
        <!-- Status Reference -->
        <div class="card">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">Status Reference</h2>
          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 shrink-0">NOT_USED</span>
              <span class="text-sm text-slate-600">Contract authenticated, no VIN commit started.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 shrink-0">PENDING</span>
              <span class="text-sm text-slate-600">VIN commit accepted, awaiting dependency confirmation.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">COMMITTED_LOCKED</span>
              <span class="text-sm text-slate-600">VIN committed successfully. Contract permanently locked.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 shrink-0">FAILED_INELIGIBLE</span>
              <span class="text-sm text-slate-600">Eligibility rules denied the VIN (e.g., vehicle class too high).</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 shrink-0">FAILED_DEPENDENCY</span>
              <span class="text-sm text-slate-600">External dependency unreachable after all retries.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 shrink-0">FAILED_VALIDATION</span>
              <span class="text-sm text-slate-600">VIN failed format or decode validation.</span>
            </div>
            <div class="flex items-start gap-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 shrink-0">CANCELLED</span>
              <span class="text-sm text-slate-600">Manually cancelled (not used in standard consumer flow).</span>
            </div>
          </div>
        </div>
```

**Step 2: Update dashboard spec**

Adjust the test that checks for status reference to verify 7 statuses.

**Step 3: Run tests**

Run: `npm test -- --testPathPattern admin-dashboard`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/features/admin/pages/admin-dashboard/
git commit -m "fix(admin): update dashboard status reference to show all 7 spec statuses"
```

---

## Task 12: Frontend Role-Based Audit Field Visibility

**Files:**
- Modify: `src/app/features/admin/pages/request-detail/request-detail.component.ts`
- Modify: `src/app/features/admin/pages/request-detail/request-detail.component.spec.ts`

**Step 1: Inject `AdminSessionService` and conditionally show fields**

In `request-detail.component.ts`, add:

```typescript
import { AdminSessionService } from '@core/services';
```

In the class:

```typescript
  private readonly adminSession = inject(AdminSessionService);
  readonly isSecurityAdmin = computed(() => this.adminSession.role() === 'admin');
```

In the audit timeline template, wrap the sourceIp/userAgent display:

```html
@if (isSecurityAdmin()) {
  @if (event.sourceIp) {
    <span class="text-xs text-slate-500">IP: {{ event.sourceIp }}</span>
  }
  @if (event.userAgent) {
    <span class="text-xs text-slate-500">UA: {{ event.userAgent }}</span>
  }
}
```

**Step 2: Update spec**

Add tests verifying:
- When role is 'admin': IP/UA fields are visible
- When role is 'support': IP/UA fields are hidden

**Step 3: Run tests**

Run: `npm test -- --testPathPattern request-detail.component.spec`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/features/admin/pages/request-detail/
git commit -m "feat(admin): hide IP/user-agent in audit timeline for support role"
```

---

## Task 13: Backend Event Types & Schema

**Files:**
- Modify: `backend/src/common/constants/event-types.ts` (add DEPENDENCY_RETRY)
- Modify: `backend/src/database/entities/vin-add-request.entity.ts` (add email_status)
- Modify: `backend/src/database/entities/admin-user.entity.ts` (fix default role)
- Modify: `backend/src/modules/admin/admin.module.ts` (import AdminUser entity)

**Step 1: Add DEPENDENCY_RETRY event type**

In `backend/src/common/constants/event-types.ts`, add after line 16 (`WORKER_FINAL_FAILURE`):

```typescript
  DEPENDENCY_RETRY: 'DEPENDENCY_RETRY',
```

**Step 2: Add email_status to VinAddRequest**

In `backend/src/database/entities/vin-add-request.entity.ts`, add column:

```typescript
  @Column({ name: 'email_status', type: 'varchar', length: 32, nullable: true })
  emailStatus?: string;
```

**Step 3: Fix AdminUser default role**

In `backend/src/database/entities/admin-user.entity.ts`, change the default role from `'support'` to match the valid roles. The spec role "Support" maps to `'support'`, which we've now added to `VALID_ADMIN_ROLES`, so this is fine. No change needed here.

**Step 4: Import AdminUser entity into AdminModule**

In `backend/src/modules/admin/admin.module.ts`, add to imports:

```typescript
import { AdminUser } from '../../database/entities/admin-user.entity';
```

Update the `TypeOrmModule.forFeature` array:

```typescript
TypeOrmModule.forFeature([ContractContext, VinAddRequest, AuditEvent, AdminUser]),
```

**Step 5: Run backend tests**

Run: `cd backend && npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/common/constants/event-types.ts backend/src/database/entities/vin-add-request.entity.ts backend/src/modules/admin/admin.module.ts
git commit -m "feat(admin): add DEPENDENCY_RETRY event type, email_status column, and AdminUser entity"
```

---

## Task 14: E2E Admin Portal Tests

**Files:**
- Create: `e2e/helpers/admin-auth.helper.ts`
- Modify: `e2e/admin-dashboard.spec.ts` (rewrite with admin auth)
- Create: `e2e/admin-portal.spec.ts`

**Step 1: Create admin auth E2E helper**

Create `e2e/helpers/admin-auth.helper.ts`:

```typescript
import { expect, Page } from '@playwright/test';

export async function authenticateAdmin(
  page: Page,
  role: 'admin' | 'support' = 'admin',
): Promise<void> {
  await page.goto('/admin/login');

  const buttonName = role === 'admin' ? /security.*admin/i : /support/i;
  await page.getByRole('button', { name: buttonName }).click();

  // Wait for redirect to /admin dashboard
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}
```

**Step 2: Update existing admin-dashboard.spec.ts**

Replace `authenticateConsumer` with `authenticateAdmin`:

```typescript
import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './helpers/admin-auth.helper';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAdmin(page);
  });

  // ... keep existing tests, they should still pass
});
```

**Step 3: Create comprehensive admin E2E test**

Create `e2e/admin-portal.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './helpers/admin-auth.helper';
import { authenticateConsumer } from './helpers/auth.helper';

test.describe('Admin Portal @smoke', () => {
  test.describe('Authentication', () => {
    test('should redirect to login when accessing /admin without auth', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('should show role picker on login page', async ({ page }) => {
      await page.goto('/admin/login');
      await expect(page.getByText('Development Login')).toBeVisible();
      await expect(page.getByRole('button', { name: /security.*admin/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /support/i })).toBeVisible();
    });

    test('should authenticate as admin and show dashboard', async ({ page }) => {
      await authenticateAdmin(page, 'admin');
      await expect(page.getByText('Dev Admin')).toBeVisible();
      await expect(page.getByText('Security / Admin')).toBeVisible();
    });

    test('should authenticate as support and show dashboard', async ({ page }) => {
      await authenticateAdmin(page, 'support');
      await expect(page.getByText('Dev Support')).toBeVisible();
      await expect(page.getByText('Support')).toBeVisible();
    });

    test('should logout and redirect to login', async ({ page }) => {
      await authenticateAdmin(page);
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  });

  test.describe('Contract Search', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateAdmin(page);
    });

    test('should search by external contract ID and show results', async ({ page }) => {
      await page.goto('/admin/search');
      await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
      await page.getByRole('button', { name: /search/i }).click();

      await expect(page.getByText('EXT-001')).toBeVisible({ timeout: 5_000 });
    });

    test('should navigate to contract detail from search results', async ({ page }) => {
      await page.goto('/admin/search');
      await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
      await page.getByRole('button', { name: /search/i }).click();

      await page.getByRole('link', { name: /view details/i }).first().click();
      await expect(page).toHaveURL(/\/admin\/contract\//);
    });
  });

  test.describe('Contract Detail', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateAdmin(page);
    });

    test('should show contract information', async ({ page }) => {
      // First search to get a contract
      await page.goto('/admin/search');
      await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
      await page.getByRole('button', { name: /search/i }).click();
      await page.getByRole('link', { name: /view details/i }).first().click();

      await expect(page.getByText(/contract context id/i)).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Dashboard Status Reference', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateAdmin(page);
    });

    test('should show all 7 statuses', async ({ page }) => {
      await expect(page.getByText('NOT_USED')).toBeVisible();
      await expect(page.getByText('PENDING')).toBeVisible();
      await expect(page.getByText('COMMITTED_LOCKED')).toBeVisible();
      await expect(page.getByText('FAILED_INELIGIBLE')).toBeVisible();
      await expect(page.getByText('FAILED_DEPENDENCY')).toBeVisible();
      await expect(page.getByText('FAILED_VALIDATION')).toBeVisible();
      await expect(page.getByText('CANCELLED')).toBeVisible();
    });
  });
});
```

**Step 4: Run E2E tests**

Run: `npm run e2e -- --grep "Admin Portal"`
Expected: PASS (after all previous tasks are complete)

**Step 5: Commit**

```bash
git add e2e/helpers/admin-auth.helper.ts e2e/admin-portal.spec.ts e2e/admin-dashboard.spec.ts
git commit -m "test(admin): add comprehensive E2E tests for admin portal"
```

---

## Task 15: Final Verification

**Step 1: Run full lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: No errors

**Step 2: Run full unit test suite**

Run: `npm test`
Expected: All PASS

**Step 3: Run backend tests**

Run: `cd backend && npm test`
Expected: All PASS

**Step 4: Run E2E smoke tests**

Run: `npm run e2e:smoke`
Expected: All PASS

**Step 5: Run full E2E suite**

Run: `npm run e2e`
Expected: All PASS

**Step 6: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "chore(admin): fix lint/test issues from admin portal completion"
```
