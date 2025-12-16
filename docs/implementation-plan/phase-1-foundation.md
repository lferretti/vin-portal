# Phase 1: Project Foundation

> Core infrastructure and shared components

## Overview

This phase establishes the foundational architecture that all features depend on. Must be completed before proceeding to Phase 2.

---

## 1.1 Environment Configuration

### Files to Create
```
src/environments/
├── environment.ts          # Development config
└── environment.prod.ts     # Production config
```

### Environment Interface
```typescript
export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  sessionTtlMinutes: number;
  features: {
    captchaEnabled: boolean;
    otpSimulation: boolean;
    mockApi: boolean;
  };
  polling: {
    initialIntervalMs: number;
    slowIntervalMs: number;
    maxDurationMs: number;
  };
}
```

### Development Config
```typescript
export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  sessionTtlMinutes: 15,
  features: {
    captchaEnabled: false,
    otpSimulation: true,
    mockApi: true,
  },
  polling: {
    initialIntervalMs: 10000,
    slowIntervalMs: 30000,
    maxDurationMs: 180000,
  },
};
```

---

## 1.2 API Models (from OpenAPI spec)

### Files to Create
```
src/app/core/models/
├── index.ts                    # Barrel export
├── api-envelope.model.ts       # Standard response wrapper
├── contract.model.ts           # Auth request/response
├── otp.model.ts                # OTP workflow
├── vin.model.ts                # VIN decode, eligibility, commit
├── admin.model.ts              # Admin endpoints
└── status.enum.ts              # VinAddStatus enum
```

### Key Types

#### API Envelope (all responses)
```typescript
export interface ApiEnvelope<T> {
  correlationId: string;
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

#### VIN Add Status Enum
```typescript
export enum VinAddStatus {
  NOT_USED = 'NOT_USED',
  PENDING = 'PENDING',
  COMMITTED_LOCKED = 'COMMITTED_LOCKED',
  FAILED_INELIGIBLE = 'FAILED_INELIGIBLE',
  FAILED_DEPENDENCY = 'FAILED_DEPENDENCY',
  FAILED_VALIDATION = 'FAILED_VALIDATION',
  CANCELLED = 'CANCELLED',
}
```

#### Contract Models
```typescript
export interface AuthenticateContractRequest {
  contractNumber: string;
  lastName: string;
  zip: string;
}

export interface AuthenticateSuccessData {
  contractContextId: string;
  sessionToken: string;
  sessionExpiresAt: string;
  otp: OtpSummary;
  contractSummary?: ContractSummary;
}

export interface ContractSummary {
  primaryVinMasked: string;
  hasAdditionalVin: boolean;
}
```

#### OTP Models
```typescript
export type OtpStatus = 'NOT_REQUIRED' | 'REQUIRED' | 'SENT' | 'VERIFIED' | 'LOCKED_OUT' | 'EXPIRED';

export interface OtpSummary {
  status: OtpStatus;
  otpChallengeId: string | null;
  maskedDestination: string | null;
  channel: 'sms' | 'email' | null;
}

export interface OtpSendRequest {
  otpChallengeId: string;
}

export interface OtpVerifyRequest {
  otpChallengeId: string;
  code: string;
}
```

#### VIN Models
```typescript
export interface VinDecodeRequest {
  vin: string;
}

export interface VinDecoded {
  year: number;
  make: string;
  model: string;
}

export interface VinDecodeData {
  vin: string;
  decoded: VinDecoded;
}

export interface VinEligibilityRequest {
  vin: string;
}

export interface VinEligibilityData {
  vin: string;
  eligible: boolean;
  reasonCode: string;
}

export interface VinCommitRequest {
  vin: string;
  acceptIrreversible: boolean;
}

export interface VinCommitData {
  requestId: string;
  status: VinAddStatus;
  message?: string;
  committedAt?: string;
  vin?: string;
  decoded?: VinDecoded;
}

export interface VinRequestStatusData {
  requestId: string;
  status: VinAddStatus;
  vin?: string;
  decoded?: VinDecoded;
  lastUpdatedAt: string;
  eligibilityAllowed?: boolean;
  eligibilityReasonCode?: string;
}
```

---

## 1.3 Core Services

### Files to Create
```
src/app/core/services/
├── api.service.ts              # Base HTTP client
├── contract.service.ts         # Authentication
├── otp.service.ts              # OTP workflow
├── vin.service.ts              # VIN operations
├── session.service.ts          # Token management
├── idempotency.service.ts      # Generate/store idempotency keys
├── correlation.service.ts      # Correlation ID generation
└── mock-api.service.ts         # Mock backend for dev
```

### API Service (Base)
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string): Observable<ApiEnvelope<T>> {
    return this.http.get<ApiEnvelope<T>>(`${this.baseUrl}${path}`);
  }

  post<T>(path: string, body: unknown): Observable<ApiEnvelope<T>> {
    return this.http.post<ApiEnvelope<T>>(`${this.baseUrl}${path}`, body);
  }
}
```

### Session Service
```typescript
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly SESSION_KEY = 'vin_portal_session';
  
  // Signals for reactive state
  readonly token = signal<string | null>(null);
  readonly contractContextId = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token() && !this.isExpired());
  
  setSession(data: AuthenticateSuccessData): void;
  clearSession(): void;
  isExpired(): boolean;
  getToken(): string | null;
}
```

### Contract Service
```typescript
@Injectable({ providedIn: 'root' })
export class ContractService {
  authenticate(request: AuthenticateContractRequest): Observable<ApiEnvelope<AuthenticateSuccessData>>;
}
```

### VIN Service
```typescript
@Injectable({ providedIn: 'root' })
export class VinService {
  decode(request: VinDecodeRequest): Observable<ApiEnvelope<VinDecodeData>>;
  checkEligibility(request: VinEligibilityRequest): Observable<ApiEnvelope<VinEligibilityData>>;
  commit(request: VinCommitRequest, idempotencyKey: string): Observable<ApiEnvelope<VinCommitData>>;
  getStatus(requestId: string): Observable<ApiEnvelope<VinRequestStatusData>>;
}
```

---

## 1.4 HTTP Interceptors

### Files to Create
```
src/app/core/interceptors/
├── auth.interceptor.ts         # Attach Bearer token
├── correlation.interceptor.ts  # Add X-Correlation-ID
└── error.interceptor.ts        # Global error handling
```

### Auth Interceptor
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const token = sessionService.getToken();
  
  if (token && !req.url.includes('/authenticate')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  
  return next(req);
};
```

### Correlation Interceptor
```typescript
export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  const correlationId = crypto.randomUUID();
  
  req = req.clone({
    setHeaders: { 'X-Correlation-ID': correlationId }
  });
  
  return next(req);
};
```

### Error Interceptor
```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Handle unauthorized - redirect to authenticate
      }
      if (error.status === 429) {
        // Handle rate limiting - show cooldown message
      }
      return throwError(() => error);
    })
  );
};
```

### Register in App Config
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        correlationInterceptor,
        authInterceptor,
        errorInterceptor,
      ])
    ),
    // ... other providers
  ]
};
```

---

## 1.5 Tailwind CSS Setup

### Installation

```bash
# Install Tailwind CSS and dependencies
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind config
npx tailwindcss init
```

### Files to Create/Modify

```
├── tailwind.config.js      # Tailwind configuration
├── src/styles.css          # Main styles with Tailwind imports
└── postcss.config.js       # PostCSS configuration (if needed)
```

### Tailwind Configuration
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        accent: {
          DEFAULT: '#2b6cb0',
          hover: '#2c5282',
        },
        success: {
          DEFAULT: '#16a34a',
          light: '#dcfce7',
        },
        warning: {
          DEFAULT: '#ca8a04',
          light: '#fef9c3',
        },
        error: {
          DEFAULT: '#dc2626',
          light: '#fee2e2',
        },
      },
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### Main Styles File
```css
/* src/styles.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@layer base {
  html {
    @apply font-body text-slate-900 antialiased;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply font-display font-semibold;
  }
}

@layer components {
  /* Button variants */
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 
           font-medium rounded-lg transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-primary {
    @apply btn bg-primary-600 text-white 
           hover:bg-primary-700 focus:ring-primary-500;
  }
  
  .btn-secondary {
    @apply btn bg-slate-100 text-slate-700 
           hover:bg-slate-200 focus:ring-slate-500;
  }
  
  .btn-danger {
    @apply btn bg-error text-white 
           hover:bg-red-700 focus:ring-red-500;
  }
  
  .btn-ghost {
    @apply btn bg-transparent text-slate-600 
           hover:bg-slate-100 focus:ring-slate-500;
  }
  
  /* Form inputs */
  .form-input {
    @apply block w-full px-3 py-2 
           border border-slate-300 rounded-lg
           text-slate-900 placeholder-slate-400
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
           disabled:bg-slate-100 disabled:cursor-not-allowed;
  }
  
  .form-input-error {
    @apply form-input border-error focus:ring-error focus:border-error;
  }
  
  /* Card component */
  .card {
    @apply bg-white rounded-xl shadow-sm border border-slate-200 p-6;
  }
  
  /* Alert/Banner variants */
  .alert {
    @apply flex items-start gap-3 p-4 rounded-lg;
  }
  
  .alert-success {
    @apply alert bg-success-light text-green-800;
  }
  
  .alert-warning {
    @apply alert bg-warning-light text-yellow-800;
  }
  
  .alert-error {
    @apply alert bg-error-light text-red-800;
  }
  
  .alert-info {
    @apply alert bg-blue-50 text-blue-800;
  }
  
  /* Badge variants */
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 
           rounded-full text-xs font-medium;
  }
  
  .badge-success {
    @apply badge bg-green-100 text-green-800;
  }
  
  .badge-warning {
    @apply badge bg-yellow-100 text-yellow-800;
  }
  
  .badge-error {
    @apply badge bg-red-100 text-red-800;
  }
  
  .badge-neutral {
    @apply badge bg-slate-100 text-slate-800;
  }
}

@layer utilities {
  /* Screen reader only */
  .sr-only {
    @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
    clip: rect(0, 0, 0, 0);
  }
}
```

### Angular.json Update
Ensure `styles.css` is referenced in `angular.json`:
```json
{
  "projects": {
    "vin-portal": {
      "architect": {
        "build": {
          "options": {
            "styles": ["src/styles.css"]
          }
        }
      }
    }
  }
}
```

### Install Tailwind Forms Plugin
```bash
npm install -D @tailwindcss/forms
```

---

## 1.6 Shared UI Components

### Files to Create
```
src/app/shared/
├── components/
│   ├── header/
│   │   └── header.component.ts
│   ├── progress-stepper/
│   │   └── progress-stepper.component.ts
│   ├── alert-banner/
│   │   └── alert-banner.component.ts
│   ├── loading-spinner/
│   │   └── loading-spinner.component.ts
│   ├── form-field/
│   │   └── form-field.component.ts
│   ├── vin-display/
│   │   └── vin-display.component.ts
│   └── confirmation-checkbox/
│       └── confirmation-checkbox.component.ts
├── pipes/
│   └── mask.pipe.ts
└── validators/
    ├── vin.validator.ts
    └── zip.validator.ts
```

> **Note:** With Tailwind CSS, component styles are applied inline using utility classes, 
> eliminating the need for separate `.scss` files.

### Header Component
```typescript
@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
      <div class="flex items-center gap-3">
        <img src="/assets/logo.svg" alt="Company Logo" class="h-8 w-auto" />
        <span class="font-display font-semibold text-slate-900">Vehicle Protection Portal</span>
      </div>
      <nav>
        <a href="/support" 
           class="text-sm text-primary-600 hover:text-primary-700 hover:underline">
          Need Help?
        </a>
      </nav>
    </header>
  `
})
export class HeaderComponent {}
```

### Progress Stepper Component
```typescript
@Component({
  selector: 'app-progress-stepper',
  standalone: true,
  template: `
    <nav aria-label="Progress" class="py-4">
      <ol class="flex items-center justify-center gap-4">
        @for (step of steps(); track step.id; let i = $index) {
          <li class="flex items-center gap-2">
            <span 
              class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors"
              [class]="i < currentStep() 
                ? 'bg-primary-600 text-white' 
                : i === currentStep() 
                  ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600' 
                  : 'bg-slate-100 text-slate-500'">
              @if (i < currentStep()) {
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span 
              class="text-sm font-medium hidden sm:inline"
              [class]="i <= currentStep() ? 'text-slate-900' : 'text-slate-500'">
              {{ step.label }}
            </span>
            @if (i < steps().length - 1) {
              <div class="w-12 h-0.5 mx-2" 
                   [class]="i < currentStep() ? 'bg-primary-600' : 'bg-slate-200'"></div>
            }
          </li>
        }
      </ol>
    </nav>
  `
})
export class ProgressStepperComponent {
  steps = input<{ id: string; label: string }[]>([]);
  currentStep = input<number>(0);
}
```

### Alert Banner Component
```typescript
export type AlertType = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  template: `
    <div 
      [class]="alertClasses()"
      role="alert"
      [attr.aria-live]="type() === 'error' ? 'assertive' : 'polite'">
      <span class="text-lg">{{ icon() }}</span>
      <div class="flex-1">
        <ng-content></ng-content>
      </div>
      @if (dismissible()) {
        <button 
          (click)="dismiss.emit()" 
          aria-label="Dismiss"
          class="text-current opacity-70 hover:opacity-100 transition-opacity">
          ×
        </button>
      }
    </div>
  `
})
export class AlertBannerComponent {
  type = input<AlertType>('info');
  dismissible = input<boolean>(false);
  dismiss = output<void>();
  
  icon = computed(() => {
    const icons = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };
    return icons[this.type()];
  });
  
  alertClasses = computed(() => {
    const base = 'flex items-start gap-3 p-4 rounded-lg animate-fade-in';
    const variants: Record<AlertType, string> = {
      success: 'bg-green-50 text-green-800 border border-green-200',
      warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      error: 'bg-red-50 text-red-800 border border-red-200',
      info: 'bg-blue-50 text-blue-800 border border-blue-200',
    };
    return `${base} ${variants[this.type()]}`;
  });
}
```

### Loading Spinner Component
```typescript
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      @if (message()) {
        <p class="text-sm text-slate-600">{{ message() }}</p>
      }
      <span class="sr-only">Loading...</span>
    </div>
  `
})
export class LoadingSpinnerComponent {
  message = input<string>('');
}
```

### VIN Validator
```typescript
// src/app/shared/validators/vin.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// VIN pattern: 17 chars, excludes I, O, Q
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function vinValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const vin = control.value.toUpperCase().replace(/\s/g, '');
    
    if (vin.length !== 17) {
      return { vinLength: { required: 17, actual: vin.length } };
    }
    
    if (!VIN_PATTERN.test(vin)) {
      return { vinFormat: true };
    }
    
    return null;
  };
}
```

### ZIP Validator
```typescript
// src/app/shared/validators/zip.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;

export function zipValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    if (!ZIP_PATTERN.test(control.value)) {
      return { zipFormat: true };
    }
    
    return null;
  };
}
```

---

## Checklist

- [ ] Create environment configuration files
- [ ] Generate all API model interfaces
- [ ] Implement core services (API, Session, Contract, OTP, VIN)
- [ ] Create HTTP interceptors (auth, correlation, error)
- [ ] Install and configure Tailwind CSS
- [ ] Create `tailwind.config.js` with custom theme
- [ ] Set up component utility classes in `styles.css`
- [ ] Build shared UI components with Tailwind classes
- [ ] Create custom validators (VIN, ZIP)
- [ ] Update `app.config.ts` with providers
- [ ] Configure Jest for unit testing
- [ ] Test interceptors are working correctly

---

## Next Phase

Once Phase 1 is complete, proceed to [Phase 2: Consumer Portal](./phase-2-consumer-portal.md).

