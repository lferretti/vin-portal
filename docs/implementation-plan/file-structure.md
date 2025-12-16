# Complete File Structure

> Full project file structure for VIN Portal (Angular 21 + Tailwind CSS + Jest)

```
├── jest.config.js              # Jest configuration
├── setup-jest.ts               # Jest setup file
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── angular.json
├── package.json
│
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   ├── index.ts
│   │   │   ├── api-envelope.model.ts
│   │   │   ├── contract.model.ts
│   │   │   ├── otp.model.ts
│   │   │   ├── vin.model.ts
│   │   │   ├── admin.model.ts
│   │   │   └── status.enum.ts
│   │   │
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── api.service.spec.ts
│   │   │   ├── contract.service.ts
│   │   │   ├── contract.service.spec.ts
│   │   │   ├── otp.service.ts
│   │   │   ├── otp.service.spec.ts
│   │   │   ├── vin.service.ts
│   │   │   ├── vin.service.spec.ts
│   │   │   ├── session.service.ts
│   │   │   ├── session.service.spec.ts
│   │   │   ├── idempotency.service.ts
│   │   │   ├── correlation.service.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── mock-api.service.ts
│   │   │   └── announce.service.ts
│   │   │
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts
│   │   │   ├── auth.interceptor.spec.ts
│   │   │   ├── correlation.interceptor.ts
│   │   │   ├── error.interceptor.ts
│   │   │   └── mock.interceptor.ts
│   │   │
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── auth.guard.spec.ts
│   │   │   ├── otp-required.guard.ts
│   │   │   ├── eligible.guard.ts
│   │   │   ├── contract-not-locked.guard.ts
│   │   │   ├── admin-auth.guard.ts
│   │   │   └── unsaved-changes.guard.ts
│   │   │
│   │   └── tokens/
│   │       └── environment.token.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── header/
│   │   │   │   ├── header.component.ts
│   │   │   │   └── header.component.spec.ts
│   │   │   │
│   │   │   ├── progress-stepper/
│   │   │   │   ├── progress-stepper.component.ts
│   │   │   │   └── progress-stepper.component.spec.ts
│   │   │   │
│   │   │   ├── alert-banner/
│   │   │   │   ├── alert-banner.component.ts
│   │   │   │   └── alert-banner.component.spec.ts
│   │   │   │
│   │   │   ├── loading-spinner/
│   │   │   │   ├── loading-spinner.component.ts
│   │   │   │   └── loading-spinner.component.spec.ts
│   │   │   │
│   │   │   ├── form-field/
│   │   │   │   ├── form-field.component.ts
│   │   │   │   └── form-field.component.spec.ts
│   │   │   │
│   │   │   ├── vin-display/
│   │   │   │   └── vin-display.component.ts
│   │   │   │
│   │   │   └── confirmation-checkbox/
│   │   │       └── confirmation-checkbox.component.ts
│   │   │
│   │   ├── directives/
│   │   │   ├── focus-trap.directive.ts
│   │   │   └── auto-focus.directive.ts
│   │   │
│   │   ├── pipes/
│   │   │   ├── mask.pipe.ts
│   │   │   └── mask.pipe.spec.ts
│   │   │
│   │   └── validators/
│   │       ├── vin.validator.ts
│   │       ├── vin.validator.spec.ts
│   │       ├── zip.validator.ts
│   │       └── zip.validator.spec.ts
│   │
│   ├── features/
│   │   ├── consumer/
│   │   │   ├── consumer.routes.ts
│   │   │   │
│   │   │   ├── state/
│   │   │   │   ├── consumer-state.service.ts
│   │   │   │   └── consumer-state.service.spec.ts
│   │   │   │
│   │   │   └── pages/
│   │   │       ├── landing/
│   │   │       │   ├── landing.component.ts
│   │   │       │   └── landing.component.spec.ts
│   │   │       │
│   │   │       ├── authenticate/
│   │   │       │   ├── authenticate.component.ts
│   │   │       │   └── authenticate.component.spec.ts
│   │   │       │
│   │   │       ├── verify-otp/
│   │   │       │   ├── verify-otp.component.ts
│   │   │       │   └── verify-otp.component.spec.ts
│   │   │       │
│   │   │       ├── vin-entry/
│   │   │       │   ├── vin-entry.component.ts
│   │   │       │   └── vin-entry.component.spec.ts
│   │   │       │
│   │   │       ├── review/
│   │   │       │   ├── review.component.ts
│   │   │       │   └── review.component.spec.ts
│   │   │       │
│   │   │       └── result/
│   │   │           ├── result.component.ts
│   │   │           └── result.component.spec.ts
│   │   │
│   │   └── admin/
│   │       ├── admin.routes.ts
│   │       │
│   │       ├── layout/
│   │       │   └── admin-layout.component.ts
│   │       │
│   │       ├── components/
│   │       │   ├── admin-header/
│   │       │   │   └── admin-header.component.ts
│   │       │   │
│   │       │   ├── audit-timeline/
│   │       │   │   └── audit-timeline.component.ts
│   │       │   │
│   │       │   └── note-form/
│   │       │       └── note-form.component.ts
│   │       │
│   │       └── pages/
│   │           ├── search/
│   │           │   ├── admin-search.component.ts
│   │           │   └── admin-search.component.spec.ts
│   │           │
│   │           ├── contract-detail/
│   │           │   └── admin-contract-detail.component.ts
│   │           │
│   │           └── request-detail/
│   │               └── admin-request-detail.component.ts
│   │
│   ├── app.component.ts
│   ├── app.component.spec.ts
│   ├── app.config.ts
│   └── app.routes.ts
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
├── assets/
│   ├── logo.svg
│   └── icons/
│
├── index.html
├── main.ts
└── styles.css                  # Tailwind CSS imports + custom styles

```

---

## File Count Summary

| Category | Files |
|----------|-------|
| Config (Jest, Tailwind, TS) | 6 |
| Core Models | 7 |
| Core Services | 10 |
| Core Services Tests | 5 |
| Core Interceptors | 5 |
| Core Guards | 7 |
| Shared Components | 7 |
| Shared Components Tests | 5 |
| Shared Utilities | 6 |
| Consumer Pages | 6 |
| Consumer Pages Tests | 6 |
| Admin Pages | 6 |
| State Services | 2 |
| Routes | 2 |
| Config/Root | 5 |
| **Total** | **~85 files** |

> **Note:** With Tailwind CSS, we eliminate separate `.scss` files. 
> Component styles are applied inline using utility classes.

---

## Key Files Description

### Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest test runner configuration |
| `setup-jest.ts` | Jest setup with Angular preset |
| `tailwind.config.js` | Tailwind theme customization |
| `styles.css` | Tailwind imports + custom component classes |

### Core

| File | Purpose |
|------|---------|
| `api-envelope.model.ts` | Standard API response wrapper |
| `status.enum.ts` | VinAddStatus enum values |
| `session.service.ts` | JWT token storage and validation |
| `auth.interceptor.ts` | Attaches Bearer token to requests |
| `mock-api.service.ts` | Development mock backend |

### Consumer Portal

| File | Purpose |
|------|---------|
| `consumer-state.service.ts` | Wizard flow state management |
| `landing.component.ts` | Welcome page with CTA |
| `authenticate.component.ts` | Contract credentials form |
| `vin-entry.component.ts` | VIN input with decode/eligibility |
| `review.component.ts` | Confirmation before commit |
| `result.component.ts` | Status display with polling |

### Admin Portal

| File | Purpose |
|------|---------|
| `admin-search.component.ts` | Contract search interface |
| `admin-request-detail.component.ts` | Request details + audit trail |
| `audit-timeline.component.ts` | Audit event visualization |
| `note-form.component.ts` | Admin note input |

### Shared

| File | Purpose |
|------|---------|
| `progress-stepper.component.ts` | 4-step wizard indicator |
| `alert-banner.component.ts` | Success/warning/error messages |
| `form-field.component.ts` | Consistent form field wrapper |
| `vin.validator.ts` | 17-char VIN pattern validation |

---

## Testing Structure

All test files use the `.spec.ts` suffix and are co-located with their source files:

```
component.ts
component.spec.ts    # Jest unit test
```

### Test Organization

```typescript
// Example: session.service.spec.ts
describe('SessionService', () => {
  describe('setSession', () => {
    it('should store session token', () => { /* ... */ });
    it('should update isAuthenticated signal', () => { /* ... */ });
  });
  
  describe('clearSession', () => {
    it('should remove token from storage', () => { /* ... */ });
  });
  
  describe('isExpired', () => {
    it('should return true for expired token', () => { /* ... */ });
  });
});
```

---

## Import Organization

### Barrel Exports

```typescript
// src/app/core/models/index.ts
export * from './api-envelope.model';
export * from './contract.model';
export * from './otp.model';
export * from './vin.model';
export * from './admin.model';
export * from './status.enum';
```

### Usage
```typescript
import { 
  AuthenticateContractRequest, 
  VinAddStatus, 
  VinDecoded 
} from '@core/models';
```

---

## TypeScript Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@features/*": ["src/app/features/*"],
      "@env": ["src/environments/environment"]
    }
  }
}
```

---

## Tailwind CSS Notes

With Tailwind CSS, component styling is done inline:

```typescript
// Before (with SCSS files)
@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']  // ❌ Not needed
})

// After (with Tailwind)
@Component({
  selector: 'app-button',
  template: `
    <button class="px-4 py-2 bg-primary-600 text-white rounded-lg 
                   hover:bg-primary-700 transition-colors">
      <ng-content></ng-content>
    </button>
  `
})
```

Benefits:
- Fewer files to manage
- Consistent design tokens via Tailwind config
- Smaller bundle size (purged unused CSS)
- Faster development with utility classes
