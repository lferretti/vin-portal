# Phase 4: Testing & Polish

> Mock backend, route guards, accessibility, Jest testing, and final integration

## Overview

This phase ensures the application is production-ready with:
- Mock API service for development/testing
- Complete route guard coverage
- Accessibility compliance
- Jest unit and integration testing
- Final integration testing

---

## Testing Framework: Jest

### Why Jest?
- Faster test execution than Karma
- Better developer experience with snapshot testing
- Built-in code coverage
- Excellent mocking capabilities
- Works well with Angular standalone components

### Jest Setup

#### Installation
```bash
# Remove Karma (if present)
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter

# Install Jest and Angular Jest preset
npm install -D jest @types/jest jest-preset-angular @angular-builders/jest
```

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.module.ts',
    '!src/app/**/*.routes.ts',
    '!src/main.ts',
  ],
  moduleNameMapper: {
    '@core/(.*)': '<rootDir>/src/app/core/$1',
    '@shared/(.*)': '<rootDir>/src/app/shared/$1',
    '@features/(.*)': '<rootDir>/src/app/features/$1',
    '@env': '<rootDir>/src/environments/environment',
  },
};
```

#### Setup File
```typescript
// setup-jest.ts
import 'jest-preset-angular/setup-jest';

// Mock window.crypto for UUID generation
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});
```

#### Update angular.json
```json
{
  "projects": {
    "vin-portal": {
      "architect": {
        "test": {
          "builder": "@angular-builders/jest:run",
          "options": {
            "configPath": "jest.config.js"
          }
        }
      }
    }
  }
}
```

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit"
  }
}
```

---

## 4.1 Mock API Service

Since the backend APIs may not be implemented, create a mock service for development.

### File: `src/app/core/services/mock-api.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly delay = () => Math.random() * 1000 + 500; // 500-1500ms
  
  // Simulated data store
  private contracts = new Map<string, MockContractContext>();
  private requests = new Map<string, MockVinAddRequest>();
  
  authenticateContract(request: AuthenticateContractRequest): Observable<ApiEnvelope<AuthenticateSuccessData>> {
    return of(this.mockAuthResponse(request)).pipe(
      delay(this.delay())
    );
  }
  
  decodeVin(vin: string): Observable<ApiEnvelope<VinDecodeData>> {
    // Mock VIN decode using VIN patterns
    const decoded = this.mockDecode(vin);
    return of({
      correlationId: crypto.randomUUID(),
      success: true,
      data: { vin, decoded },
      error: null
    }).pipe(delay(this.delay()));
  }
  
  checkEligibility(vin: string): Observable<ApiEnvelope<VinEligibilityData>> {
    // 90% eligible, 10% ineligible for testing
    const eligible = Math.random() > 0.1;
    return of({
      correlationId: crypto.randomUUID(),
      success: true,
      data: {
        vin,
        eligible,
        reasonCode: eligible ? 'OK' : 'CLASS_TOO_HIGH'
      },
      error: null
    }).pipe(delay(this.delay()));
  }
  
  commitVin(request: VinCommitRequest, idempotencyKey: string): Observable<ApiEnvelope<VinCommitData>> {
    const requestId = crypto.randomUUID();
    // 80% immediate commit, 20% pending
    const status = Math.random() > 0.2 
      ? VinAddStatus.COMMITTED_LOCKED 
      : VinAddStatus.PENDING;
    
    return of({
      correlationId: crypto.randomUUID(),
      success: true,
      data: {
        requestId,
        status,
        vin: request.vin,
        decoded: this.mockDecode(request.vin),
        committedAt: status === VinAddStatus.COMMITTED_LOCKED ? new Date().toISOString() : null
      },
      error: null
    }).pipe(delay(this.delay()));
  }
  
  getRequestStatus(requestId: string): Observable<ApiEnvelope<VinRequestStatusData>> {
    // After a few polls, change PENDING to COMMITTED_LOCKED
    const status = this.getOrCreateRequestStatus(requestId);
    return of({
      correlationId: crypto.randomUUID(),
      success: true,
      data: status,
      error: null
    }).pipe(delay(this.delay()));
  }
  
  private mockDecode(vin: string): VinDecoded {
    // Use VIN character 10 to determine year (simplified)
    const yearChar = vin.charAt(9);
    const yearMap: Record<string, number> = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
      'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
      'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    };
    
    const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW'];
    const models = ['Camry', 'Accord', 'F-150', 'Silverado', '3 Series'];
    
    return {
      year: yearMap[yearChar] || 2020,
      make: makes[Math.floor(Math.random() * makes.length)],
      model: models[Math.floor(Math.random() * models.length)]
    };
  }
  
  private mockAuthResponse(request: AuthenticateContractRequest): ApiEnvelope<AuthenticateSuccessData> {
    // Simulate auth - accept any input for dev
    const contractContextId = crypto.randomUUID();
    const sessionToken = btoa(JSON.stringify({
      contractContextId,
      exp: Date.now() + 15 * 60 * 1000
    }));
    
    return {
      correlationId: crypto.randomUUID(),
      success: true,
      data: {
        contractContextId,
        sessionToken,
        sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp: { status: 'NOT_REQUIRED', otpChallengeId: null, maskedDestination: null, channel: null },
        contractSummary: {
          primaryVinMasked: '1HG******1234',
          hasAdditionalVin: false
        }
      },
      error: null
    };
  }
}
```

### HTTP Interceptor for Mock Mode

```typescript
// src/app/core/interceptors/mock.interceptor.ts
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.features.mockApi) {
    return next(req);
  }
  
  const mockService = inject(MockApiService);
  
  // Route to mock handlers based on URL
  if (req.url.includes('/contract/authenticate')) {
    return mockService.authenticateContract(req.body);
  }
  
  if (req.url.includes('/vin/decode')) {
    return mockService.decodeVin(req.body.vin);
  }
  
  // ... etc
  
  return next(req);
};
```

---

## 4.2 Route Guards (Complete)

### Auth Guard
```typescript
// src/app/core/guards/auth.guard.ts
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
```

### Contract Not Locked Guard
```typescript
// src/app/core/guards/contract-not-locked.guard.ts
export const contractNotLockedGuard: CanActivateFn = () => {
  const consumerState = inject(ConsumerStateService);
  const router = inject(Router);
  
  const status = consumerState.commitStatus();
  
  if (status === VinAddStatus.COMMITTED_LOCKED) {
    // Contract already has additional VIN
    return router.createUrlTree(['/result', consumerState.commitRequestId()]);
  }
  
  return true;
};
```

### Can Deactivate Guard (Unsaved Changes)
```typescript
// src/app/core/guards/unsaved-changes.guard.ts
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Are you sure you want to leave?');
  }
  return true;
};
```

---

## 4.3 Accessibility Audit

### Checklist

#### Forms
- [ ] All inputs have associated `<label>` elements
- [ ] Required fields indicated with `aria-required="true"`
- [ ] Error messages linked with `aria-describedby`
- [ ] Invalid fields marked with `aria-invalid="true"`

#### Navigation
- [ ] Skip link to main content
- [ ] Focus visible on all interactive elements
- [ ] Focus trapped in modals/dialogs
- [ ] Logical tab order maintained

#### Content
- [ ] Page titles unique and descriptive
- [ ] Headings in logical hierarchy (h1 → h2 → h3)
- [ ] Images have alt text (or `alt=""` for decorative)
- [ ] Color contrast minimum 4.5:1 (AA)

#### Dynamic Content
- [ ] Loading states announced via `aria-live`
- [ ] Error banners use `role="alert"`
- [ ] Status changes announced appropriately

### Accessibility Utilities

```typescript
// src/app/shared/directives/focus-trap.directive.ts
@Directive({
  selector: '[appFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements AfterViewInit {
  private readonly el = inject(ElementRef);
  
  ngAfterViewInit(): void {
    const focusableElements = this.el.nativeElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Trap focus within element
    this.el.nativeElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
    
    firstElement?.focus();
  }
}
```

```typescript
// src/app/shared/services/announce.service.ts
@Injectable({ providedIn: 'root' })
export class AnnounceService {
  private announcer = document.createElement('div');
  
  constructor() {
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.classList.add('sr-only');
    document.body.appendChild(this.announcer);
  }
  
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = '';
    
    // Force screen reader to announce
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
  }
}
```

---

## 4.4 Integration Testing

### Test Scenarios

#### Happy Path
1. Navigate to landing page
2. Click "Get Started"
3. Enter valid contract credentials
4. Verify auth success → redirected to VIN entry
5. Enter valid 17-char VIN
6. Verify decode displays Y/M/M
7. Verify eligibility passes
8. Click Continue to Review
9. Check confirmation checkbox
10. Click Confirm
11. Verify success result displayed

#### OTP Flow
1. Auth with credentials that trigger OTP
2. Verify redirect to OTP page
3. Enter valid 6-digit code
4. Verify redirect to VIN entry

#### Error Handling
1. Auth with invalid credentials → error message
2. Multiple failed auth attempts → rate limit message
3. Enter invalid VIN format → validation error
4. VIN fails eligibility → ineligible message
5. Dependency failure on commit → PENDING status with polling

#### Edge Cases
1. Session timeout during flow → redirect to auth
2. Browser refresh on review page → state preserved or redirected
3. Double-click on commit button → idempotency prevents duplicate
4. Network failure → appropriate error handling

### Jest Unit Test Examples

#### Service Test
```typescript
// src/app/core/services/session.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false for isAuthenticated when no session', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should store and retrieve session token', () => {
    const mockSession = {
      contractContextId: 'test-id',
      sessionToken: 'test-token',
      sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      otp: { status: 'NOT_REQUIRED' as const, otpChallengeId: null, maskedDestination: null, channel: null },
    };

    service.setSession(mockSession);
    
    expect(service.getToken()).toBe('test-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should clear session', () => {
    service.setSession({
      contractContextId: 'test-id',
      sessionToken: 'test-token',
      sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      otp: { status: 'NOT_REQUIRED' as const, otpChallengeId: null, maskedDestination: null, channel: null },
    });

    service.clearSession();
    
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
```

#### Component Test
```typescript
// src/app/shared/components/alert-banner/alert-banner.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertBannerComponent } from './alert-banner.component';

describe('AlertBannerComponent', () => {
  let component: AlertBannerComponent;
  let fixture: ComponentFixture<AlertBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display success alert with correct classes', () => {
    fixture.componentRef.setInput('type', 'success');
    fixture.detectChanges();
    
    const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl.className).toContain('bg-green-50');
  });

  it('should display error alert with assertive aria-live', () => {
    fixture.componentRef.setInput('type', 'error');
    fixture.detectChanges();
    
    const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl.getAttribute('aria-live')).toBe('assertive');
  });

  it('should emit dismiss event when dismiss button clicked', () => {
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();
    
    const dismissSpy = jest.fn();
    component.dismiss.subscribe(dismissSpy);
    
    const dismissBtn = fixture.nativeElement.querySelector('button[aria-label="Dismiss"]');
    dismissBtn.click();
    
    expect(dismissSpy).toHaveBeenCalled();
  });
});
```

#### Validator Test
```typescript
// src/app/shared/validators/vin.validator.spec.ts
import { FormControl } from '@angular/forms';
import { vinValidator } from './vin.validator';

describe('vinValidator', () => {
  const validator = vinValidator();

  it('should return null for valid VIN', () => {
    const control = new FormControl('1HGCM82633A123456');
    expect(validator(control)).toBeNull();
  });

  it('should return error for VIN with invalid length', () => {
    const control = new FormControl('1HGCM8263');
    expect(validator(control)).toEqual({
      vinLength: { required: 17, actual: 9 }
    });
  });

  it('should return error for VIN with invalid characters (I, O, Q)', () => {
    const control = new FormControl('1HGCM82633I123456');
    expect(validator(control)).toEqual({ vinFormat: true });
  });

  it('should normalize to uppercase', () => {
    const control = new FormControl('1hgcm82633a123456');
    expect(validator(control)).toBeNull();
  });

  it('should return null for empty value', () => {
    const control = new FormControl('');
    expect(validator(control)).toBeNull();
  });
});
```

#### Guard Test
```typescript
// src/app/core/guards/auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionService } from '../services/session.service';

describe('authGuard', () => {
  let sessionService: SessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn().mockReturnValue('/authenticate') }
        }
      ]
    });

    sessionService = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('should allow access when authenticated', () => {
    jest.spyOn(sessionService, 'isAuthenticated').mockReturnValue(true);
    
    const result = TestBed.runInInjectionContext(() => 
      authGuard({} as any, { url: '/vin-entry' } as any)
    );
    
    expect(result).toBe(true);
  });

  it('should redirect to authenticate when not authenticated', () => {
    jest.spyOn(sessionService, 'isAuthenticated').mockReturnValue(false);
    
    const result = TestBed.runInInjectionContext(() => 
      authGuard({} as any, { url: '/vin-entry' } as any)
    );
    
    expect(router.createUrlTree).toHaveBeenCalledWith(['/authenticate']);
  });
});
```

### Integration Test Example
```typescript
// src/app/features/consumer/pages/authenticate/authenticate.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthenticateComponent } from './authenticate.component';

describe('AuthenticateComponent Integration', () => {
  let component: AuthenticateComponent;
  let fixture: ComponentFixture<AuthenticateComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthenticateComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthenticateComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should submit form and handle success', fakeAsync(() => {
    // Fill form
    component.form.patchValue({
      contractNumber: 'TEST123456',
      lastName: 'Smith',
      zip: '30301',
    });
    
    // Submit
    component.onSubmit();
    
    // Expect HTTP request
    const req = httpMock.expectOne('/api/v1/contract/authenticate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      contractNumber: 'TEST123456',
      lastName: 'SMITH',
      zip: '30301',
    });
    
    // Respond
    req.flush({
      correlationId: 'test-id',
      success: true,
      data: {
        contractContextId: 'ctx-123',
        sessionToken: 'token-abc',
        sessionExpiresAt: new Date().toISOString(),
        otp: { status: 'NOT_REQUIRED', otpChallengeId: null, maskedDestination: null, channel: null },
      },
      error: null,
    });
    
    tick();
    
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  }));

  it('should display error message on auth failure', fakeAsync(() => {
    component.form.patchValue({
      contractNumber: 'INVALID',
      lastName: 'Test',
      zip: '12345',
    });
    
    component.onSubmit();
    
    const req = httpMock.expectOne('/api/v1/contract/authenticate');
    req.flush(
      {
        correlationId: 'test-id',
        success: false,
        data: null,
        error: { code: 'AUTH_NO_MATCH', message: 'No match found' },
      },
      { status: 401, statusText: 'Unauthorized' }
    );
    
    tick();
    
    expect(component.errorMessage()).toContain("couldn't find an exact match");
  }));
});
```

---

## Final Checklist

### Code Quality
- [ ] All components use standalone architecture
- [ ] Signals used for reactive state
- [ ] New control flow syntax (`@if`, `@for`) used
- [ ] No console.log statements in production code
- [ ] Proper error handling throughout

### Testing (Jest)
- [ ] Jest configured with Angular preset
- [ ] Unit tests for all services
- [ ] Unit tests for shared components
- [ ] Unit tests for validators
- [ ] Guard tests with mocked dependencies
- [ ] Integration tests for key user flows
- [ ] Code coverage > 80%
- [ ] All tests passing in CI

### Performance
- [ ] Lazy loading for admin module
- [ ] Images optimized (if any)
- [ ] Bundle size analyzed
- [ ] No memory leaks (subscription cleanup)

### Security
- [ ] No sensitive data in localStorage
- [ ] Session tokens properly secured
- [ ] XSS prevention (Angular default)
- [ ] CSRF tokens if required by backend

### Documentation
- [ ] README updated with setup instructions
- [ ] Environment variables documented
- [ ] API integration points documented

---

## Deployment Considerations

### Build for Production
```bash
ng build --configuration production
```

### Environment Variables
- `API_BASE_URL` - Backend API endpoint
- `ENABLE_MOCK_API` - Toggle mock mode

### Hosting (Recommended)
- S3 + CloudFront for static hosting
- Configure SPA routing (all paths → index.html)
- Enable HTTPS only
- Set appropriate cache headers

---

## Summary

Upon completing Phase 4, the VIN Portal should be:
- ✅ Fully functional consumer wizard flow
- ✅ Admin dashboard for support team
- ✅ Mock API for development/testing
- ✅ Route guards protecting all sensitive pages
- ✅ Comprehensive Jest test suite with >80% coverage
- ✅ WCAG 2.1 AA accessible
- ✅ Ready for production deployment

