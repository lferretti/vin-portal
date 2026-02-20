# VIN-Based Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace contract-number-based authentication with VIN-based authentication, combining the authenticate and VIN entry steps into a single "Vehicle Lookup" step.

**Architecture:** The authenticate page collects full VIN + last name + ZIP. On submit, the last 7 chars of the VIN are extracted and sent as `vin7` to the backend. The full VIN is stored in consumer state for downstream pages. The separate VIN entry page and route are removed, reducing the wizard from 5 steps to 4.

**Tech Stack:** Angular 21 (signals, standalone components, OnPush), NestJS backend, Jest unit tests, Playwright E2E tests

---

### Task 1: Update the AuthenticateContractRequest model

**Files:**
- Modify: `src/app/core/models/contract.model.ts:6-13`

**Step 1: Update the interface**

Replace `contractNumber` with `vin7` in the request interface:

```typescript
export interface AuthenticateContractRequest {
  /** Last 7 characters of the VIN */
  vin7: string;
  /** Last name (exact match) */
  lastName: string;
  /** US ZIP code (5-digit or 5+4 format) */
  zip: string;
}
```

**Step 2: Commit**

```bash
git add src/app/core/models/contract.model.ts
git commit -m "refactor: replace contractNumber with vin7 in AuthenticateContractRequest"
```

---

### Task 2: Update ContractService to send vin7

**Files:**
- Modify: `src/app/core/services/contract.service.ts:18-26`

**Step 1: Update the authenticate method**

Change the HTTP payload to use `vin7` instead of `contractNumber`:

```typescript
authenticate(
  request: AuthenticateContractRequest
): Observable<ApiEnvelope<AuthenticateSuccessData>> {
  return this.api.post<AuthenticateSuccessData>('/contract/authenticate', {
    vin7: request.vin7.trim(),
    lastName: request.lastName.trim().toUpperCase(),
    zip: request.zip.trim(),
  });
}
```

**Step 2: Commit**

```bash
git add src/app/core/services/contract.service.ts
git commit -m "refactor: send vin7 instead of contractNumber in ContractService"
```

---

### Task 3: Update mock API interceptor and MockApiService

**Files:**
- Modify: `src/app/core/interceptors/mock.interceptor.ts:23-28`
- Modify: `src/app/core/services/mock-api.service.ts:42-144`

**Step 1: Update the mock interceptor to extract vin7 instead of contractNumber**

In `mock.interceptor.ts`, change the `/contract/authenticate` handler (around line 23-39):

```typescript
if (url.includes('/contract/authenticate') && method === 'POST') {
  return mockApi
    .authenticateContract(
      body['vin7'] as string,
      body['lastName'] as string,
      body['zip'] as string
    )
    .pipe(
      switchMap((response) =>
        of(
          new HttpResponse({
            status: response.success ? 200 : getErrorStatus(response.error?.code),
            body: response,
          })
        )
      )
    );
}
```

**Step 2: Update MockApiService.authenticateContract**

Change the method signature and test data to use `vin7` instead of `contractNumber`. Replace the `validContracts` map with VIN-suffix-based credentials:

```typescript
authenticateContract(
  vin7: string,
  lastName: string,
  zip: string
): Observable<ApiEnvelope<AuthenticateSuccessData>> {
  return of(null).pipe(
    delay(this.randomDelay(500, 1500)),
    map(() => {
      // Simulate rate limiting
      const now = Date.now();
      if (now - this.lastAuthAttemptTime < 1000) {
        this.authAttempts++;
        if (this.authAttempts > 5) {
          return this.errorResponse<AuthenticateSuccessData>(
            ApiErrorCodes.RATE_LIMITED,
            'Too many attempts. Please wait.',
            { retryAfterSeconds: 60 }
          );
        }
      } else {
        this.authAttempts = 1;
      }
      this.lastAuthAttemptTime = now;

      // Check for valid test credentials (keyed by last 7 of VIN)
      const validCredentials: Record<string, { lastName: string; zip: string }> = {
        '1234567': { lastName: 'SMITH', zip: '30301' },
        '7654321': { lastName: 'JONES', zip: '10001' },
        '0TP7654': { lastName: 'TESTUSER', zip: '12345' },
        'LOCKED1': { lastName: 'LOCKED', zip: '99999' },
      };

      const normalized = vin7.toUpperCase();
      const expected = validCredentials[normalized];
      if (!expected) {
        return this.errorResponse<AuthenticateSuccessData>(
          ApiErrorCodes.AUTH_NO_MATCH,
          'No contract found matching the provided information.'
        );
      }

      if (lastName.toUpperCase() !== expected.lastName || zip !== expected.zip) {
        return this.errorResponse<AuthenticateSuccessData>(
          ApiErrorCodes.AUTH_NO_MATCH,
          'No contract found matching the provided information.'
        );
      }

      // Check if triggers OTP
      if (normalized === '0TP7654') {
        const challengeId = this.generateId('otp');
        this._otpChallenges.update((m) => {
          m.set(challengeId, {
            id: challengeId,
            contractContextId: 'ctx-otp',
            code: '123456',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attempts: 0,
          });
          return new Map(m);
        });

        return this.errorResponse<AuthenticateSuccessData>(
          ApiErrorCodes.AUTH_OTP_REQUIRED,
          'OTP verification required.',
          {
            contractContextId: 'ctx-otp',
            otpChallengeId: challengeId,
            maskedDestination: '***-***-1234',
            channel: 'sms',
          }
        );
      }

      // Check if contract is locked
      if (normalized === 'LOCKED1') {
        return this.errorResponse<AuthenticateSuccessData>(
          ApiErrorCodes.CONTRACT_LOCKED,
          'This contract already has an additional vehicle registered.'
        );
      }

      // Successful authentication
      const contractContextId = `ctx-${normalized}`;
      const contract = this.getOrCreateContract(contractContextId, normalized);

      return this.successResponse<AuthenticateSuccessData>({
        contractContextId,
        sessionToken: this.generateMockJwt(contractContextId),
        sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        otp: {
          status: 'NOT_REQUIRED',
          otpChallengeId: null,
          maskedDestination: null,
          channel: null,
        },
        contractSummary: {
          primaryVinMasked: contract.primaryVinMasked,
          hasAdditionalVin: contract.hasAdditionalVin,
        },
      });
    })
  );
}
```

**Step 3: Update initializeMockData to use vin7-based keys**

```typescript
private initializeMockData(): void {
  const contracts: MockContract[] = [
    {
      id: 'ctx-1234567',
      contractNumber: '1234567',
      externalContractId: 'EXT-001',
      primaryVinMasked: '1HG******1234',
      hasAdditionalVin: false,
    },
    {
      id: 'ctx-7654321',
      contractNumber: '7654321',
      externalContractId: 'EXT-002',
      primaryVinMasked: '5FN******5678',
      hasAdditionalVin: true,
      additionalVinMasked: '3N1******9012',
      additionalVinCommittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  this._contracts.set(new Map(contracts.map((c) => [c.id, c])));
}
```

**Step 4: Commit**

```bash
git add src/app/core/interceptors/mock.interceptor.ts src/app/core/services/mock-api.service.ts
git commit -m "refactor: update mock API to use vin7-based authentication credentials"
```

---

### Task 4: Rewrite the Authenticate component as "Vehicle Lookup"

**Files:**
- Modify: `src/app/features/consumer/pages/authenticate/authenticate.component.ts`

This is the biggest change. The component currently collects `contractNumber`, `lastName`, `zip`. It needs to:
1. Collect `vin` (full 17-char VIN), `lastName`, `zip`
2. Extract last 7 from VIN and send `{vin7, lastName, zip}` to API
3. Store the full VIN in consumer state on success
4. Update heading/labels to "Vehicle Lookup"
5. Update step labels from 4 steps (auth, vin, review, result) to 3 steps (lookup, review, result)
6. Navigate to `/review` on success (not `/vin-entry`)
7. After OTP verification, navigate to `/review` (not `/vin-entry`)

**Step 1: Rewrite the component**

Replace the entire component with:

```typescript
import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ContractService } from '@core/services/contract.service';
import { SessionService } from '@core/services/session.service';
import { ConsumerStateService } from '../../state/consumer-state.service';
import { vinValidator, normalizeVin } from '@shared/validators';
import { zipValidator } from '@shared/validators';
import {
  HeaderComponent,
  ProgressStepperComponent,
  AlertBannerComponent,
  FormFieldComponent,
} from '@shared/components';
import type { StepConfig } from '@shared/components';
import { AuthenticateContractRequest } from '@core/models';

@Component({
  selector: 'app-authenticate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent,
    ProgressStepperComponent,
    AlertBannerComponent,
    FormFieldComponent,
  ],
  template: `
    <div class="page-container">
      <app-header />

      <main class="page-main">
        <app-progress-stepper [steps]="steps" [currentStep]="0" />

        <div class="page-card mt-8">
          <h1 class="text-2xl font-bold text-slate-900 mb-2">Vehicle Lookup</h1>
          <p class="text-slate-600 mb-6">
            Enter your vehicle and personal details to find your warranty contract.
          </p>

          @if (errorMessage()) {
            <app-alert-banner type="error" class="mb-6" data-testid="auth-error" [dismissible]="true" (dismiss)="clearError()">
              {{ errorMessage() }}
            </app-alert-banner>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" data-testid="auth-form" class="space-y-5">
            <app-form-field
              label="Vehicle Identification Number (VIN)"
              hint="17 characters, found on your dashboard or driver's door frame"
              [control]="form.controls.vin"
              [required]="true"
            >
              <input
                type="text"
                formControlName="vin"
                class="form-input font-mono text-lg tracking-wider uppercase"
                [class.form-input-error]="form.controls.vin.invalid && form.controls.vin.touched"
                (input)="onVinInput($event)"
                autocomplete="off"
                maxlength="17"
                placeholder="Enter your 17-character VIN"
              />
            </app-form-field>

            <app-form-field
              label="Last Name"
              [control]="form.controls.lastName"
              [required]="true"
            >
              <input
                type="text"
                formControlName="lastName"
                class="form-input"
                [class.form-input-error]="form.controls.lastName.invalid && form.controls.lastName.touched"
                autocomplete="family-name"
                placeholder="Enter your last name"
              />
            </app-form-field>

            <app-form-field
              label="ZIP Code"
              hint="5-digit or 5+4 format"
              [control]="form.controls.zip"
              [required]="true"
            >
              <input
                type="text"
                formControlName="zip"
                class="form-input"
                [class.form-input-error]="form.controls.zip.invalid && form.controls.zip.touched"
                autocomplete="postal-code"
                inputmode="numeric"
                maxlength="10"
                placeholder="30301"
              />
            </app-form-field>

            <div class="pt-4">
              <button
                type="submit"
                class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                [disabled]="form.invalid || isLoading()"
              >
                @if (isLoading()) {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verifying...
                } @else {
                  Continue
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
              </button>
            </div>
          </form>

          <p class="mt-6 text-center text-sm text-slate-500">
            <a routerLink="/" class="text-primary-600 hover:underline">← Back to home</a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class AuthenticateComponent {
  private readonly contractService = inject(ContractService);
  private readonly sessionService = inject(SessionService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly steps: StepConfig[] = [
    { id: 'lookup', label: 'Vehicle Lookup' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    vin: new FormControl('', [Validators.required, vinValidator()]),
    lastName: new FormControl('', [Validators.required]),
    zip: new FormControl('', [Validators.required, zipValidator()]),
  });

  onVinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    this.form.controls.vin.setValue(input.value, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const fullVin = normalizeVin(this.form.value.vin!);
    const vin7 = fullVin.slice(-7);

    const request: AuthenticateContractRequest = {
      vin7,
      lastName: this.form.value.lastName!.trim().toUpperCase(),
      zip: this.form.value.zip!.trim(),
    };

    this.contractService.authenticate(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (response.success && response.data) {
          // Store session
          this.sessionService.setSession(response.data);

          // Update consumer state with auth result and VIN
          this.consumerState.setAuthResult(
            response.data.contractContextId,
            response.data.contractSummary,
            response.data.otp
          );
          this.consumerState.setEnteredVin(fullVin);

          // Navigate based on OTP status
          if (response.data.otp.status === 'REQUIRED') {
            this.router.navigate(['/verify-otp']);
          } else {
            const redirectUrl = this.sessionService.consumeRedirectUrl();
            this.router.navigate([redirectUrl || '/review']);
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.handleError(err);
      },
    });
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;

    switch (apiError?.code) {
      case 'AUTH_NO_MATCH':
        this.errorMessage.set(
          "We couldn't find an exact match. Please verify your details and try again."
        );
        break;
      case 'AUTH_OTP_REQUIRED':
        if (apiError.details) {
          this.consumerState.setOtpRequired({
            contractContextId: apiError.details.contractContextId as string,
            otpChallengeId: apiError.details.otpChallengeId as string,
            maskedDestination: apiError.details.maskedDestination as string,
            channel: apiError.details.channel as 'sms' | 'email',
          });
          // Store VIN before navigating to OTP
          const fullVin = normalizeVin(this.form.value.vin!);
          this.consumerState.setEnteredVin(fullVin);
          this.router.navigate(['/verify-otp']);
        }
        break;
      case 'RATE_LIMITED':
        const seconds = (apiError.details?.retryAfterSeconds as number) || 60;
        this.errorMessage.set(`Too many attempts. Please wait ${seconds} seconds and try again.`);
        break;
      case 'CONTRACT_LOCKED':
        this.errorMessage.set(
          'This contract already has an additional vehicle registered. Contact support for assistance.'
        );
        break;
      default:
        this.errorMessage.set(
          'An unexpected error occurred. Please try again or contact support.'
        );
    }
  }
}
```

Key differences from old component:
- Form field: `vin` (with `vinValidator()`) replaces `contractNumber`
- `onVinInput()` method filters invalid VIN chars as user types (moved from VIN entry component)
- `onSubmit()` extracts `vin7 = fullVin.slice(-7)` before sending request
- `onSubmit()` calls `consumerState.setEnteredVin(fullVin)` to store VIN for review page
- Default navigation goes to `/review` instead of `/vin-entry`
- Steps array has 3 items instead of 4 (no "VIN Entry" step)
- Heading changed to "Vehicle Lookup"

**Step 2: Commit**

```bash
git add src/app/features/consumer/pages/authenticate/authenticate.component.ts
git commit -m "feat: rewrite authenticate page as Vehicle Lookup with VIN + lastName + ZIP"
```

---

### Task 5: Add setEnteredVin method to ConsumerStateService

**Files:**
- Modify: `src/app/features/consumer/state/consumer-state.service.ts`

**Step 1: Add the method**

Add a `setEnteredVin` method after `setVinDecode` (around line 128). This stores just the VIN without a decode result (decode happens separately or not at all in the new flow):

```typescript
/**
 * Set the entered VIN (from auth page, before decode)
 */
setEnteredVin(vin: string): void {
  this._enteredVin.set(vin);
}
```

**Step 2: Update canProceedToReview**

The old `canProceedToReview` checks `isEligible()`, which requires VIN decode + eligibility check. Since we're removing the VIN entry step, review access should only require authentication. Update the computed (line 69-71):

```typescript
readonly canProceedToReview = computed(() => {
  return !!this._contractContextId() && (!this._otpRequired() || this._otpVerified());
});
```

**Step 3: Update currentStep computed**

The currentStep computed (line 56-63) references VIN entry step 2. Update it for the new 3-step flow:

```typescript
readonly currentStep = computed(() => {
  if (!this._contractContextId()) return 0;
  if (this._otpRequired() && !this._otpVerified()) return 0;
  if (!this._commitRequestId()) return 1;
  return 2;
});
```

**Step 4: Remove canProceedToVinEntry computed**

Delete the `canProceedToVinEntry` computed (lines 65-67) since there is no VIN entry step anymore.

**Step 5: Commit**

```bash
git add src/app/features/consumer/state/consumer-state.service.ts
git commit -m "feat: add setEnteredVin, update computed signals for 3-step flow"
```

---

### Task 6: Update consumer routes — remove vin-entry, update eligible guard

**Files:**
- Modify: `src/app/features/consumer/consumer.routes.ts`
- Modify: `src/app/core/guards/eligible.guard.ts`

**Step 1: Remove the vin-entry route and eligibleGuard from review**

Update `consumer.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { authGuard, otpRequiredGuard } from '@core/guards';

export const consumerRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
    title: 'VIN Portal - Add Vehicle',
  },
  {
    path: 'authenticate',
    loadComponent: () =>
      import('./pages/authenticate/authenticate.component').then(
        (m) => m.AuthenticateComponent
      ),
    title: 'Vehicle Lookup - VIN Portal',
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./pages/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent),
    canActivate: [otpRequiredGuard],
    title: 'Verify Identity - VIN Portal',
  },
  {
    path: 'review',
    loadComponent: () =>
      import('./pages/review/review.component').then((m) => m.ReviewComponent),
    canActivate: [authGuard],
    title: 'Review & Confirm - VIN Portal',
  },
  {
    path: 'result/:requestId',
    loadComponent: () =>
      import('./pages/result/result.component').then((m) => m.ResultComponent),
    canActivate: [authGuard],
    title: 'Result - VIN Portal',
  },
];
```

Note: `eligibleGuard` removed from review route. The VIN entry + eligibility check no longer gates review access (the full VIN is entered on auth page, but eligibility is not checked pre-review in the new flow — the review page just shows the VIN and contract summary).

**Step 2: Update eligible guard redirect**

Update `eligible.guard.ts` to redirect to `/authenticate` instead of `/vin-entry`:

```typescript
export const eligibleGuard: CanActivateFn = () => {
  const consumerState = inject(ConsumerStateService);
  const router = inject(Router);

  if (consumerState.isEligible()) {
    return true;
  }

  return router.createUrlTree(['/authenticate']);
};
```

(This guard is no longer used in routes, but update it defensively in case it's referenced elsewhere.)

**Step 3: Commit**

```bash
git add src/app/features/consumer/consumer.routes.ts src/app/core/guards/eligible.guard.ts
git commit -m "refactor: remove vin-entry route, update eligible guard redirect"
```

---

### Task 7: Update review component — new steps, back link

**Files:**
- Modify: `src/app/features/consumer/pages/review/review.component.ts`

**Step 1: Update steps array and currentStep**

Change the steps array (line 161-166) and currentStep (line 37):

```typescript
readonly steps: StepConfig[] = [
  { id: 'lookup', label: 'Vehicle Lookup' },
  { id: 'review', label: 'Review' },
  { id: 'result', label: 'Result' },
];
```

Update `[currentStep]="2"` → `[currentStep]="1"` in the template (line 37).

**Step 2: Update back link**

Change `routerLink="/vin-entry"` to `routerLink="/authenticate"` (line 129).

**Step 3: Update the no-VIN fallback redirect**

In `onCommit()`, change the fallback `this.router.navigate(['/vin-entry'])` to `this.router.navigate(['/authenticate'])` (line 189).

**Step 4: Commit**

```bash
git add src/app/features/consumer/pages/review/review.component.ts
git commit -m "refactor: update review page steps and back link for 3-step flow"
```

---

### Task 8: Update verify-otp component — new steps, navigation target

**Files:**
- Modify: `src/app/features/consumer/pages/verify-otp/verify-otp.component.ts`

**Step 1: Update steps array**

Change the steps array (line 149-154):

```typescript
readonly steps: StepConfig[] = [
  { id: 'lookup', label: 'Vehicle Lookup' },
  { id: 'review', label: 'Review' },
  { id: 'result', label: 'Result' },
];
```

**Step 2: Update post-OTP navigation**

Change the redirect URL fallback from `/vin-entry` to `/review` (line 215):

```typescript
this.router.navigate([redirectUrl || '/review']);
```

**Step 3: Commit**

```bash
git add src/app/features/consumer/pages/verify-otp/verify-otp.component.ts
git commit -m "refactor: update verify-otp steps and post-OTP redirect to /review"
```

---

### Task 9: Update backend — DTO, adapter, stub, service

**Files:**
- Modify: `backend/src/modules/contract/dto/authenticate-contract.dto.ts`
- Modify: `backend/src/adapters/interfaces/contract-verification.adapter.ts`
- Modify: `backend/src/adapters/stubs/contract-verification.stub.ts`
- Modify: `backend/src/modules/contract/contract.service.ts`

**Step 1: Update the DTO**

Replace `contractNumber` with `vin7`:

```typescript
import { IsString, Length, Matches } from 'class-validator';

export class AuthenticateContractDto {
  @IsString()
  @Length(7, 7)
  @Matches(/^[A-HJ-NPR-Z0-9]{7}$/i, { message: 'vin7 must be 7 valid VIN characters' })
  vin7: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName: string;

  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'ZIP must be a valid US ZIP code' })
  zip: string;
}
```

Note: keep `MinLength` and `MaxLength` imports for `lastName`.

**Step 2: Update the adapter interface**

Change `contractNumber` to `vin7` in the verify method:

```typescript
export interface ContractVerificationAdapter {
  verify(
    vin7: string,
    lastName: string,
    zip: string,
  ): Promise<ContractVerificationResult>;
}
```

**Step 3: Update the stub implementation**

Replace contract-number keys with vin7-based keys:

```typescript
@Injectable()
export class ContractVerificationStub implements ContractVerificationAdapter {
  private readonly validCredentials: Record<
    string,
    { lastName: string; zip: string; requiresOtp: boolean; hasAdditionalVin: boolean; primaryVinMasked: string }
  > = {
    '1234567': {
      lastName: 'SMITH',
      zip: '30301',
      requiresOtp: false,
      hasAdditionalVin: false,
      primaryVinMasked: '1HG******1234',
    },
    '7654321': {
      lastName: 'JONES',
      zip: '10001',
      requiresOtp: false,
      hasAdditionalVin: true,
      primaryVinMasked: '5FN******5678',
    },
    '0TP7654': {
      lastName: 'TESTUSER',
      zip: '12345',
      requiresOtp: true,
      hasAdditionalVin: false,
      primaryVinMasked: '1XX******9999',
    },
    'LOCKED1': {
      lastName: 'LOCKED',
      zip: '99999',
      requiresOtp: false,
      hasAdditionalVin: true,
      primaryVinMasked: '1ZZ******0000',
    },
  };

  async verify(
    vin7: string,
    lastName: string,
    zip: string,
  ): Promise<ContractVerificationResult> {
    const key = vin7.toUpperCase();
    const expected = this.validCredentials[key];

    if (!expected) {
      return { matched: false };
    }

    if (lastName.toUpperCase() !== expected.lastName || zip !== expected.zip) {
      return { matched: false };
    }

    return {
      matched: true,
      externalContractId: `EXT-${key}`,
      primaryVinMasked: expected.primaryVinMasked,
      hasAdditionalVin: expected.hasAdditionalVin,
      requiresOtp: expected.requiresOtp,
      maskedDestination: expected.requiresOtp ? '***-***-1234' : undefined,
      channel: expected.requiresOtp ? 'sms' : undefined,
    };
  }
}
```

**Step 4: Update ContractService (backend)**

In `backend/src/modules/contract/contract.service.ts`, change all references from `dto.contractNumber` to `dto.vin7`. The hash function should hash `vin7` instead of `contractNumber`:

- Line 56: `const contractHash = hashContractNumber(dto.vin7, salt);`
- Line 62-65: `await this.verificationAdapter.verify(dto.vin7, dto.lastName, dto.zip);`

(The `hashContractNumber` function name becomes slightly misleading but still works — it's just hashing a string. Optionally rename to `hashIdentifier` but not strictly required.)

**Step 5: Commit**

```bash
git add backend/src/modules/contract/dto/authenticate-contract.dto.ts backend/src/adapters/interfaces/contract-verification.adapter.ts backend/src/adapters/stubs/contract-verification.stub.ts backend/src/modules/contract/contract.service.ts
git commit -m "feat: update backend to accept vin7 instead of contractNumber for authentication"
```

---

### Task 10: Update unit tests — authenticate component spec

**Files:**
- Modify: `src/app/features/consumer/pages/authenticate/authenticate.component.spec.ts`

**Step 1: Rewrite the test suite**

Update the entire test file. Key changes:
- Form fields: `vin` replaces `contractNumber`
- Test values: `'1HGCM82633A1234567'` → a valid 17-char VIN ending in `1234567`
- Assertions: `vin7: '1234567'` in request payload
- Navigation: `/review` instead of `/vin-entry`
- Heading: "Vehicle Lookup" instead of "Verify Your Contract"
- Add `consumerState.setEnteredVin` mock

The existing test file structure is preserved. Update the mock providers to include `setEnteredVin: jest.fn()` on the consumerState mock.

Replace form fill patterns from:
```typescript
component.form.controls.contractNumber.setValue('CONTRACT-001');
```
to:
```typescript
component.form.controls.vin.setValue('1HGCM82633A1234567');
```

Replace assertion from:
```typescript
expect(contractService.authenticate).toHaveBeenCalledWith({
  contractNumber: 'CONTRACT-001',
  lastName: 'SMITH',
  zip: '30301',
});
```
to:
```typescript
expect(contractService.authenticate).toHaveBeenCalledWith({
  vin7: '1234567',
  lastName: 'SMITH',
  zip: '30301',
});
```

Replace navigation assertion from `/vin-entry` to `/review`.

**Step 2: Run tests to verify they pass**

Run: `npm test -- --testPathPattern=authenticate.component`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/app/features/consumer/pages/authenticate/authenticate.component.spec.ts
git commit -m "test: update authenticate component tests for vin7-based auth"
```

---

### Task 11: Update unit tests — eligible guard spec, consumer state spec

**Files:**
- Modify: `src/app/core/guards/eligible.guard.spec.ts`
- Modify: `src/app/features/consumer/state/consumer-state.service.spec.ts`

**Step 1: Update eligible guard test**

Change the redirect assertion from `/vin-entry` to `/authenticate`:

```typescript
it('should redirect to /authenticate when not eligible', () => {
  consumerState.isEligible.mockReturnValue(false);
  TestBed.runInInjectionContext(() => eligibleGuard(mockRoute, mockState));
  expect(router.createUrlTree).toHaveBeenCalledWith(['/authenticate']);
});
```

**Step 2: Update consumer state tests**

Add tests for `setEnteredVin` and update any tests that reference `canProceedToVinEntry` (which was removed). Update `currentStep` computed tests to match new 3-step logic.

**Step 3: Run tests**

Run: `npm test -- --testPathPattern="eligible.guard|consumer-state"`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/app/core/guards/eligible.guard.spec.ts src/app/features/consumer/state/consumer-state.service.spec.ts
git commit -m "test: update eligible guard and consumer state tests for new flow"
```

---

### Task 12: Update backend unit tests

**Files:**
- Modify: `backend/src/modules/contract/contract.controller.spec.ts`
- Modify: `backend/src/modules/contract/contract.service.spec.ts`

**Step 1: Update all `contractNumber` references to `vin7` in test payloads**

In controller spec, change DTOs from `{ contractNumber: '...', lastName: '...', zip: '...' }` to `{ vin7: '...', lastName: '...', zip: '...' }`.

In service spec, update the same patterns.

**Step 2: Run backend tests**

Run: `cd backend && npm test -- --testPathPattern=contract`
Expected: All PASS

**Step 3: Commit**

```bash
git add backend/src/modules/contract/contract.controller.spec.ts backend/src/modules/contract/contract.service.spec.ts
git commit -m "test: update backend contract tests for vin7-based auth"
```

---

### Task 13: Update E2E tests

**Files:**
- Modify: `e2e/helpers/auth.helper.ts`
- Modify: `e2e/consumer-happy-path.spec.ts`
- Modify: `e2e/consumer-smoke.spec.ts`
- Modify: `e2e/consumer-otp-flow.spec.ts`
- Modify: `e2e/consumer-error-scenarios.spec.ts`

**Step 1: Update auth helper**

The helper authenticates via the mock API. Update to fill VIN instead of contract number and navigate to `/review` instead of `/vin-entry`:

```typescript
import { expect, Page } from '@playwright/test';

interface AuthenticateOptions {
  vin?: string;
  lastName?: string;
  zip?: string;
}

export async function authenticateConsumer(
  page: Page,
  opts?: AuthenticateOptions,
): Promise<void> {
  const vin = opts?.vin ?? '1HGCM82633A1234567';
  const lastName = opts?.lastName ?? 'SMITH';
  const zip = opts?.zip ?? '30301';

  await page.goto('/authenticate');

  await page.getByPlaceholder(/enter your 17-character vin/i).fill(vin);
  await page.getByPlaceholder(/enter your last name/i).fill(lastName);
  await page.getByPlaceholder('30301').fill(zip);

  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });
}
```

Note: The default VIN `1HGCM82633A1234567` ends in `1234567` which maps to SMITH/30301 in the mock API.

**Step 2: Update consumer-happy-path.spec.ts**

Remove the separate VIN entry step. The flow becomes:
1. Landing → click Get Started
2. Authenticate (Vehicle Lookup) — fill VIN + last name + ZIP, click Continue
3. Review — verify VIN shown, check confirmation, click Confirm
4. Result — verify success

Update heading checks: "Vehicle Lookup" instead of "Verify Your Contract". Remove VIN Entry step entirely (no more `/vin-entry` URL check, no VIN input on separate page, no decode/eligibility waiting).

**Step 3: Update consumer-smoke.spec.ts**

- Update placeholder from `enter your contract number` to `enter your 17-character vin`
- Update heading from "Verify Your Contract" to "Vehicle Lookup"
- Update navigation target from `/vin-entry` to `/review`
- Update the VIN value: `'1HGCM82633A1234567'` (17 chars ending in `1234567`)
- Invalid credentials test: use a VIN ending in non-matching suffix

**Step 4: Update consumer-otp-flow.spec.ts**

- Replace `CONTRACT-OTP` with a 17-char VIN ending in `0TP7654`
- Update placeholder references
- Update heading references
- Post-OTP redirect goes to `/review` instead of `/vin-entry`
- Remove VIN entry step from the full flow test

**Step 5: Update consumer-error-scenarios.spec.ts**

- Update auth error tests to use VIN instead of contract number
- Remove VIN validation errors section (VIN validation now happens on auth page, the form won't submit with invalid VIN)
- Remove ineligible VIN scenarios (eligibility check is no longer a separate step)
- Update guard tests: remove `/vin-entry` guard test, update `/review` guard test
- Update `authenticateConsumer` call — it now navigates to `/review` instead of `/vin-entry`

**Step 6: Run E2E smoke tests**

Run: `npm run e2e:smoke`
Expected: All smoke tests PASS

**Step 7: Commit**

```bash
git add e2e/
git commit -m "test: update all E2E tests for VIN-based auth and 3-step flow"
```

---

### Task 14: Update CLAUDE.md docs with new mock credentials

**Files:**
- Modify: `CLAUDE.md`
- Modify: `e2e/CLAUDE.md` (if it has credential tables)

**Step 1: Update mock API test credentials table in root CLAUDE.md**

Replace the table under "Mock API Test Credentials":

```markdown
## Mock API Test Credentials

Dev mode (`features.mockApi: true`) enables an in-app mock backend:

| VIN (last 7) | Last Name | ZIP   | Behavior |
|---------------|----------|-------|----------|
| 1234567 | SMITH | 30301 | Direct auth (no OTP) |
| 7654321 | JONES | 10001 | OTP required |
| 0TP7654 | TESTUSER | 12345 | OTP required |
| LOCKED1 | LOCKED | 99999 | Contract locked |
| Other values | — | — | AUTH_NO_MATCH error |

Use a full 17-character VIN ending in the suffix above (e.g., `1HGCM82633A1234567` for SMITH).
```

**Step 2: Update architecture section**

Update the consumer wizard flow description:
```
- **`src/app/features/consumer/`** — Consumer wizard: landing → vehicle lookup → review → result
```

**Step 3: Commit**

```bash
git add CLAUDE.md e2e/CLAUDE.md
git commit -m "docs: update CLAUDE.md with VIN-based auth credentials and 3-step flow"
```

---

### Task 15: Run full test suite and fix any remaining issues

**Step 1: Run all frontend unit tests**

Run: `npm test`
Expected: All PASS

**Step 2: Run linter and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: No errors

**Step 3: Run E2E tests**

Run: `npm run e2e`
Expected: All PASS

**Step 4: Run backend tests**

Run: `cd backend && npm test`
Expected: All PASS

**Step 5: Fix any failures**

If any tests fail, investigate and fix the root cause. Common issues:
- Missed `contractNumber` → `vin7` rename somewhere
- Missing import for `vinValidator` or `normalizeVin`
- `canProceedToVinEntry` referenced somewhere after removal
- E2E selectors not matching new placeholder text

**Step 6: Final commit**

```bash
git add -A
git commit -m "fix: resolve any remaining test failures from VIN-based auth refactor"
```
