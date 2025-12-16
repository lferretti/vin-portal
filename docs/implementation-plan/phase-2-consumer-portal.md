# Phase 2: Consumer Portal

> Wizard-style flow for customers to add a VIN

## Overview

The consumer portal guides users through a multi-step wizard to:
1. Authenticate with contract details
2. Complete OTP verification (if required)
3. Enter and validate a VIN
4. Review and confirm the irreversible commit
5. View the result status

---

## Routes Configuration

### File: `src/app/features/consumer/consumer.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { otpRequiredGuard } from '../../core/guards/otp-required.guard';
import { eligibleGuard } from '../../core/guards/eligible.guard';

export const consumerRoutes: Routes = [
  {
    path: '',
    component: LandingComponent,
  },
  {
    path: 'authenticate',
    component: AuthenticateComponent,
  },
  {
    path: 'verify-otp',
    component: VerifyOtpComponent,
    canActivate: [otpRequiredGuard],
  },
  {
    path: 'vin-entry',
    component: VinEntryComponent,
    canActivate: [authGuard],
  },
  {
    path: 'review',
    component: ReviewComponent,
    canActivate: [authGuard, eligibleGuard],
  },
  {
    path: 'result/:requestId',
    component: ResultComponent,
    canActivate: [authGuard],
  },
];
```

---

## Consumer State Service

### File: `src/app/features/consumer/state/consumer-state.service.ts`

Manages the wizard flow state across pages.

```typescript
@Injectable({ providedIn: 'root' })
export class ConsumerStateService {
  // Authentication state
  readonly contractContextId = signal<string | null>(null);
  readonly contractSummary = signal<ContractSummary | null>(null);
  
  // OTP state
  readonly otpRequired = signal<boolean>(false);
  readonly otpChallengeId = signal<string | null>(null);
  readonly otpMaskedDestination = signal<string | null>(null);
  
  // VIN state
  readonly enteredVin = signal<string | null>(null);
  readonly decodedVin = signal<VinDecoded | null>(null);
  readonly eligibilityResult = signal<VinEligibilityData | null>(null);
  
  // Commit state
  readonly idempotencyKey = signal<string | null>(null);
  readonly commitRequestId = signal<string | null>(null);
  readonly commitStatus = signal<VinAddStatus | null>(null);
  
  // Computed
  readonly isEligible = computed(() => this.eligibilityResult()?.eligible ?? false);
  readonly currentStep = computed(() => {
    if (!this.contractContextId()) return 0;
    if (this.otpRequired() && !this.isOtpVerified()) return 1;
    if (!this.enteredVin()) return 2;
    if (!this.isEligible()) return 2;
    if (!this.commitRequestId()) return 3;
    return 4;
  });
  
  // Methods
  setAuthResult(data: AuthenticateSuccessData): void;
  setOtpVerified(): void;
  setVinDecode(vin: string, decoded: VinDecoded): void;
  setEligibility(result: VinEligibilityData): void;
  prepareCommit(): string; // Returns idempotency key
  setCommitResult(data: VinCommitData): void;
  reset(): void;
}
```

---

## Page Implementations

### 2.1 Landing Page (`/`)

**Purpose:** Welcome page with key information and CTA

**File Structure:**
```
src/app/features/consumer/pages/landing/
├── landing.component.ts
├── landing.component.html
└── landing.component.scss
```

**Template:**
```html
<div class="landing">
  <div class="landing__hero">
    <h1 class="landing__title">Add an Additional Vehicle to Your Contract</h1>
    <p class="landing__subtitle">
      Extend your warranty protection to a second vehicle with just a few steps.
    </p>
  </div>
  
  <div class="landing__info-cards">
    <div class="info-card">
      <div class="info-card__icon">🚗</div>
      <h3>One Additional Vehicle</h3>
      <p>You may add one additional VIN to your existing warranty contract.</p>
    </div>
    
    <div class="info-card">
      <div class="info-card__icon">🔒</div>
      <h3>One-Time Change</h3>
      <p>Once validated and committed, this change cannot be reversed.</p>
    </div>
    
    <div class="info-card">
      <div class="info-card__icon">📋</div>
      <h3>Same Class or Less</h3>
      <p>The additional vehicle must be the same class or lower than your primary vehicle.</p>
    </div>
  </div>
  
  <div class="landing__cta">
    <button class="btn btn--primary btn--lg" routerLink="/authenticate">
      Get Started
    </button>
    <p class="landing__support">
      Need help? <a href="/support">Contact Support</a>
    </p>
  </div>
</div>
```

---

### 2.2 Authenticate Page (`/authenticate`)

**Purpose:** Collect contract credentials and authenticate

**Fields:**
| Field | Validation | Notes |
|-------|------------|-------|
| Contract Number | Required, 6-64 chars | Trim whitespace |
| Last Name | Required, 1-64 chars | Uppercase on submit |
| ZIP Code | Required, pattern `^\d{5}(-\d{4})?$` | US ZIP only |

**Component Logic:**
```typescript
@Component({
  selector: 'app-authenticate',
  standalone: true,
  imports: [ReactiveFormsModule, /* shared components */],
  templateUrl: './authenticate.component.html',
})
export class AuthenticateComponent {
  private readonly contractService = inject(ContractService);
  private readonly sessionService = inject(SessionService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  
  readonly form = new FormGroup({
    contractNumber: new FormControl('', [Validators.required, Validators.minLength(6)]),
    lastName: new FormControl('', [Validators.required]),
    zip: new FormControl('', [Validators.required, zipValidator()]),
  });
  
  onSubmit(): void {
    if (this.form.invalid) return;
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const request: AuthenticateContractRequest = {
      contractNumber: this.form.value.contractNumber!.trim(),
      lastName: this.form.value.lastName!.trim().toUpperCase(),
      zip: this.form.value.zip!.trim(),
    };
    
    this.contractService.authenticate(request).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        if (response.success && response.data) {
          this.sessionService.setSession(response.data);
          this.consumerState.setAuthResult(response.data);
          
          if (response.data.otp.status === 'REQUIRED') {
            this.router.navigate(['/verify-otp']);
          } else {
            this.router.navigate(['/vin-entry']);
          }
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.handleError(err);
      }
    });
  }
  
  private handleError(err: HttpErrorResponse): void {
    const apiError = err.error?.error;
    
    switch (apiError?.code) {
      case 'AUTH_NO_MATCH':
        this.errorMessage.set("We couldn't find an exact match. Please verify your details.");
        break;
      case 'AUTH_OTP_REQUIRED':
        // Handle OTP required flow
        this.consumerState.setOtpRequired(apiError.details);
        this.router.navigate(['/verify-otp']);
        break;
      case 'RATE_LIMITED':
        const seconds = apiError.details?.retryAfterSeconds || 60;
        this.errorMessage.set(`Too many attempts. Please wait ${seconds} seconds and try again.`);
        break;
      default:
        this.errorMessage.set('An unexpected error occurred. Please try again.');
    }
  }
}
```

**Template:**
```html
<div class="authenticate-page">
  <app-progress-stepper [steps]="steps" [currentStep]="0" />
  
  <div class="page-card">
    <h1>Verify Your Contract</h1>
    <p class="page-description">
      Enter your contract details exactly as they appear on your warranty documents.
    </p>
    
    @if (errorMessage()) {
      <app-alert-banner type="error">
        {{ errorMessage() }}
      </app-alert-banner>
    }
    
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <app-form-field 
        label="Contract Number" 
        [control]="form.controls.contractNumber"
        hint="Found on your warranty certificate">
        <input 
          type="text" 
          formControlName="contractNumber"
          autocomplete="off"
          [attr.aria-invalid]="form.controls.contractNumber.invalid && form.controls.contractNumber.touched" />
      </app-form-field>
      
      <app-form-field 
        label="Last Name" 
        [control]="form.controls.lastName">
        <input 
          type="text" 
          formControlName="lastName"
          autocomplete="family-name" />
      </app-form-field>
      
      <app-form-field 
        label="ZIP Code" 
        [control]="form.controls.zip"
        hint="5-digit or 5+4 format">
        <input 
          type="text" 
          formControlName="zip"
          autocomplete="postal-code"
          inputmode="numeric"
          maxlength="10" />
      </app-form-field>
      
      <button 
        type="submit" 
        class="btn btn--primary btn--full"
        [disabled]="form.invalid || isLoading()">
        @if (isLoading()) {
          <app-loading-spinner />
          Verifying...
        } @else {
          Continue
        }
      </button>
    </form>
  </div>
</div>
```

---

### 2.3 OTP Verify Page (`/verify-otp`)

**Purpose:** Complete step-up verification when risk signals detected

**UI Elements:**
- Masked destination display (e.g., `***-***-1234`)
- 6-digit code input
- Resend button (disabled for 30-60 seconds)
- Lockout messaging

**Component Logic:**
```typescript
@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [ReactiveFormsModule, /* shared components */],
  templateUrl: './verify-otp.component.html',
})
export class VerifyOtpComponent implements OnInit {
  private readonly otpService = inject(OtpService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  
  readonly isLoading = signal(false);
  readonly isSending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly resendCooldown = signal(0);
  
  readonly maskedDestination = computed(() => this.consumerState.otpMaskedDestination());
  readonly channel = computed(() => this.consumerState.otpChannel());
  
  readonly codeControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/)
  ]);
  
  ngOnInit(): void {
    // Auto-send OTP on page load
    this.sendOtp();
  }
  
  sendOtp(): void {
    const challengeId = this.consumerState.otpChallengeId();
    if (!challengeId) return;
    
    this.isSending.set(true);
    this.startResendCooldown();
    
    this.otpService.send({ otpChallengeId: challengeId }).subscribe({
      next: () => this.isSending.set(false),
      error: () => {
        this.isSending.set(false);
        this.errorMessage.set('Failed to send verification code. Please try again.');
      }
    });
  }
  
  verifyOtp(): void {
    if (this.codeControl.invalid) return;
    
    const challengeId = this.consumerState.otpChallengeId();
    if (!challengeId) return;
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    this.otpService.verify({
      otpChallengeId: challengeId,
      code: this.codeControl.value!
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.consumerState.setOtpVerified();
          this.router.navigate(['/vin-entry']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.handleError(err);
      }
    });
  }
  
  private startResendCooldown(): void {
    this.resendCooldown.set(60);
    const interval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        clearInterval(interval);
        this.resendCooldown.set(0);
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }
}
```

---

### 2.4 VIN Entry Page (`/vin-entry`)

**Purpose:** Enter VIN, decode, and check eligibility

**Behavior:**
1. Normalize VIN to uppercase, remove spaces
2. On blur (or after 17 chars): auto-decode
3. After decode: auto-check eligibility
4. Display decoded Year/Make/Model
5. Show eligibility result (success or error)
6. Enable Continue only if eligible

**Component Logic:**
```typescript
@Component({
  selector: 'app-vin-entry',
  standalone: true,
  imports: [ReactiveFormsModule, /* shared components */],
  templateUrl: './vin-entry.component.html',
})
export class VinEntryComponent {
  private readonly vinService = inject(VinService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly router = inject(Router);
  
  readonly isDecoding = signal(false);
  readonly isCheckingEligibility = signal(false);
  readonly decodeError = signal<string | null>(null);
  readonly eligibilityError = signal<string | null>(null);
  
  readonly decodedVin = computed(() => this.consumerState.decodedVin());
  readonly eligibilityResult = computed(() => this.consumerState.eligibilityResult());
  readonly canContinue = computed(() => this.eligibilityResult()?.eligible === true);
  
  readonly vinControl = new FormControl('', [Validators.required, vinValidator()]);
  
  onVinBlur(): void {
    const vin = this.normalizeVin(this.vinControl.value || '');
    if (vin.length === 17 && this.vinControl.valid) {
      this.decodeAndCheckEligibility(vin);
    }
  }
  
  private normalizeVin(value: string): string {
    return value.toUpperCase().replace(/\s/g, '');
  }
  
  private decodeAndCheckEligibility(vin: string): void {
    this.isDecoding.set(true);
    this.decodeError.set(null);
    this.eligibilityError.set(null);
    
    // First decode the VIN
    this.vinService.decode({ vin }).pipe(
      tap((decodeResponse) => {
        this.isDecoding.set(false);
        if (decodeResponse.success && decodeResponse.data) {
          this.consumerState.setVinDecode(vin, decodeResponse.data.decoded);
        } else {
          this.decodeError.set('Unable to decode VIN. Please check and try again.');
        }
      }),
      filter(res => res.success),
      switchMap(() => {
        this.isCheckingEligibility.set(true);
        return this.vinService.checkEligibility({ vin });
      })
    ).subscribe({
      next: (eligResponse) => {
        this.isCheckingEligibility.set(false);
        if (eligResponse.success && eligResponse.data) {
          this.consumerState.setEligibility(eligResponse.data);
          if (!eligResponse.data.eligible) {
            this.eligibilityError.set(this.getEligibilityMessage(eligResponse.data.reasonCode));
          }
        }
      },
      error: (err) => {
        this.isDecoding.set(false);
        this.isCheckingEligibility.set(false);
        this.handleError(err);
      }
    });
  }
  
  private getEligibilityMessage(reasonCode: string): string {
    const messages: Record<string, string> = {
      'CLASS_TOO_HIGH': 'This vehicle class exceeds your contract coverage.',
      'VIN_ALREADY_USED': 'This VIN is already associated with another contract.',
      'CONTRACT_LOCKED': 'Your contract already has an additional vehicle.',
    };
    return messages[reasonCode] || 'This vehicle is not eligible for your contract.';
  }
  
  onContinue(): void {
    if (this.canContinue()) {
      this.router.navigate(['/review']);
    }
  }
}
```

**Template:**
```html
<div class="vin-entry-page">
  <app-progress-stepper [steps]="steps" [currentStep]="2" />
  
  <div class="page-card">
    <h1>Enter Vehicle VIN</h1>
    <p class="page-description">
      Enter the 17-character Vehicle Identification Number (VIN) of the vehicle you want to add.
    </p>
    
    <div class="vin-input-section">
      <app-form-field 
        label="Vehicle Identification Number (VIN)" 
        [control]="vinControl"
        hint="17 characters, found on dashboard or driver's door">
        <input 
          type="text" 
          [formControl]="vinControl"
          (blur)="onVinBlur()"
          autocomplete="off"
          maxlength="17"
          class="vin-input"
          [class.vin-input--valid]="decodedVin()"
          placeholder="1HGCM82633A123456" />
      </app-form-field>
    </div>
    
    @if (isDecoding() || isCheckingEligibility()) {
      <app-loading-spinner 
        [message]="isDecoding() ? 'Decoding VIN...' : 'Checking eligibility...'" />
    }
    
    @if (decodeError()) {
      <app-alert-banner type="error">{{ decodeError() }}</app-alert-banner>
    }
    
    @if (decodedVin()) {
      <div class="decoded-vin-card">
        <h3>Vehicle Information</h3>
        <app-vin-display [decoded]="decodedVin()!" />
      </div>
    }
    
    @if (eligibilityResult()) {
      @if (eligibilityResult()!.eligible) {
        <app-alert-banner type="success">
          ✓ This vehicle is eligible for your contract.
        </app-alert-banner>
      } @else {
        <app-alert-banner type="error">
          {{ eligibilityError() }}
        </app-alert-banner>
      }
    }
    
    <div class="page-actions">
      <button 
        type="button" 
        class="btn btn--secondary"
        routerLink="/authenticate">
        Back
      </button>
      <button 
        type="button" 
        class="btn btn--primary"
        [disabled]="!canContinue()"
        (click)="onContinue()">
        Continue to Review
      </button>
    </div>
  </div>
</div>
```

---

### 2.5 Review Page (`/review`)

**Purpose:** Final confirmation before irreversible commit

**UI Elements:**
- Summary card (contract info + VIN + decoded Y/M/M)
- Irreversible confirmation checkbox
- Confirm button (disabled until checkbox checked)

**Component Logic:**
```typescript
@Component({
  selector: 'app-review',
  standalone: true,
  imports: [ReactiveFormsModule, /* shared components */],
  templateUrl: './review.component.html',
})
export class ReviewComponent {
  private readonly vinService = inject(VinService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly idempotencyService = inject(IdempotencyService);
  private readonly router = inject(Router);
  
  readonly isCommitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  
  readonly contractSummary = computed(() => this.consumerState.contractSummary());
  readonly enteredVin = computed(() => this.consumerState.enteredVin());
  readonly decodedVin = computed(() => this.consumerState.decodedVin());
  
  readonly confirmationChecked = signal(false);
  readonly canCommit = computed(() => this.confirmationChecked() && !this.isCommitting());
  
  onConfirmationChange(checked: boolean): void {
    this.confirmationChecked.set(checked);
  }
  
  onCommit(): void {
    if (!this.canCommit()) return;
    
    const vin = this.enteredVin();
    if (!vin) return;
    
    // Generate or retrieve stable idempotency key
    const idempotencyKey = this.consumerState.prepareCommit();
    
    this.isCommitting.set(true);
    this.errorMessage.set(null);
    
    this.vinService.commit(
      { vin, acceptIrreversible: true },
      idempotencyKey
    ).subscribe({
      next: (response) => {
        this.isCommitting.set(false);
        if (response.success && response.data) {
          this.consumerState.setCommitResult(response.data);
          this.router.navigate(['/result', response.data.requestId]);
        }
      },
      error: (err) => {
        this.isCommitting.set(false);
        this.handleError(err);
      }
    });
  }
}
```

**Template:**
```html
<div class="review-page">
  <app-progress-stepper [steps]="steps" [currentStep]="3" />
  
  <div class="page-card">
    <h1>Review & Confirm</h1>
    <p class="page-description">
      Please review the details below carefully. This action cannot be undone.
    </p>
    
    <div class="summary-card">
      <div class="summary-section">
        <h3>Your Contract</h3>
        <dl class="summary-list">
          <dt>Primary Vehicle</dt>
          <dd>{{ contractSummary()?.primaryVinMasked }}</dd>
        </dl>
      </div>
      
      <div class="summary-section summary-section--highlight">
        <h3>Vehicle to Add</h3>
        <dl class="summary-list">
          <dt>VIN</dt>
          <dd class="vin-value">{{ enteredVin() }}</dd>
          <dt>Year</dt>
          <dd>{{ decodedVin()?.year }}</dd>
          <dt>Make</dt>
          <dd>{{ decodedVin()?.make }}</dd>
          <dt>Model</dt>
          <dd>{{ decodedVin()?.model }}</dd>
        </dl>
      </div>
      
      <div class="summary-section">
        <h3>Eligibility</h3>
        <span class="badge badge--success">✓ Eligible</span>
      </div>
    </div>
    
    <div class="warning-box">
      <strong>⚠️ Important:</strong>
      <p>
        Adding this vehicle to your contract is a <strong>one-time, irreversible action</strong>. 
        Once confirmed, you will not be able to change or remove this vehicle.
      </p>
    </div>
    
    @if (errorMessage()) {
      <app-alert-banner type="error">{{ errorMessage() }}</app-alert-banner>
    }
    
    <app-confirmation-checkbox
      label="I understand this change is one-time and cannot be reversed."
      [checked]="confirmationChecked()"
      (checkedChange)="onConfirmationChange($event)" />
    
    <div class="page-actions">
      <button 
        type="button" 
        class="btn btn--secondary"
        routerLink="/vin-entry"
        [disabled]="isCommitting()">
        Back
      </button>
      <button 
        type="button" 
        class="btn btn--primary btn--danger"
        [disabled]="!canCommit()"
        (click)="onCommit()">
        @if (isCommitting()) {
          <app-loading-spinner />
          Confirming...
        } @else {
          Confirm & Add Vehicle
        }
      </button>
    </div>
  </div>
</div>
```

---

### 2.6 Result Page (`/result/:requestId`)

**Purpose:** Display commit result with polling for PENDING status

**Status Handling:**
| Status | Display |
|--------|---------|
| `COMMITTED_LOCKED` | Success message + timestamp + VIN details |
| `PENDING` | Processing message + auto-polling |
| `FAILED_INELIGIBLE` | Error with reason |
| `FAILED_DEPENDENCY` | Support contact message |

**Polling Strategy:**
- Poll every 10-15 seconds for first 2-3 minutes
- Then slow to 30-60 seconds
- Option for manual refresh

**Component Logic:**
```typescript
@Component({
  selector: 'app-result',
  standalone: true,
  imports: [/* shared components */],
  templateUrl: './result.component.html',
})
export class ResultComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly vinService = inject(VinService);
  private readonly consumerState = inject(ConsumerStateService);
  private readonly destroyRef = inject(DestroyRef);
  
  readonly requestId = signal<string | null>(null);
  readonly status = signal<VinAddStatus | null>(null);
  readonly statusData = signal<VinRequestStatusData | null>(null);
  readonly isPolling = signal(false);
  readonly pollCount = signal(0);
  
  readonly isSuccess = computed(() => this.status() === VinAddStatus.COMMITTED_LOCKED);
  readonly isPending = computed(() => this.status() === VinAddStatus.PENDING);
  readonly isFailed = computed(() => 
    this.status()?.startsWith('FAILED') ?? false
  );
  
  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('requestId');
    if (requestId) {
      this.requestId.set(requestId);
      this.loadStatus(requestId);
    }
  }
  
  private loadStatus(requestId: string): void {
    this.vinService.getStatus(requestId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statusData.set(response.data);
          this.status.set(response.data.status);
          
          if (response.data.status === VinAddStatus.PENDING) {
            this.startPolling(requestId);
          }
        }
      }
    });
  }
  
  private startPolling(requestId: string): void {
    this.isPolling.set(true);
    
    // Poll every 10s for first 18 polls (~3 min), then every 30s
    interval(10000).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.pollCount.update(c => c + 1)),
      switchMap(() => this.vinService.getStatus(requestId)),
      takeWhile(res => res.data?.status === VinAddStatus.PENDING, true)
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statusData.set(response.data);
          this.status.set(response.data.status);
          
          if (response.data.status !== VinAddStatus.PENDING) {
            this.isPolling.set(false);
          }
        }
      }
    });
  }
  
  refreshStatus(): void {
    const id = this.requestId();
    if (id) {
      this.loadStatus(id);
    }
  }
}
```

**Template:**
```html
<div class="result-page">
  <app-progress-stepper [steps]="steps" [currentStep]="4" />
  
  <div class="page-card">
    @switch (status()) {
      @case (VinAddStatus.COMMITTED_LOCKED) {
        <div class="result-success">
          <div class="result-icon result-icon--success">✓</div>
          <h1>Vehicle Added Successfully!</h1>
          <p class="result-message">
            Your additional vehicle has been added to your warranty contract.
          </p>
          
          <div class="result-details">
            <app-vin-display [decoded]="statusData()?.decoded!" />
            <p class="result-timestamp">
              Confirmed: {{ statusData()?.lastUpdatedAt | date:'medium' }}
            </p>
            <p class="result-id">
              Reference: {{ requestId() }}
            </p>
          </div>
        </div>
      }
      
      @case (VinAddStatus.PENDING) {
        <div class="result-pending">
          <div class="result-icon result-icon--pending">
            <app-loading-spinner />
          </div>
          <h1>Processing Your Request</h1>
          <p class="result-message">
            Your request is being processed. This may take a few moments.
          </p>
          
          <p class="result-id">
            Reference: {{ requestId() }}
          </p>
          
          @if (isPolling()) {
            <p class="polling-status">
              Checking status automatically...
            </p>
          } @else {
            <button class="btn btn--secondary" (click)="refreshStatus()">
              Check Status
            </button>
          }
        </div>
      }
      
      @case (VinAddStatus.FAILED_INELIGIBLE) {
        <div class="result-failed">
          <div class="result-icon result-icon--error">✕</div>
          <h1>Vehicle Not Eligible</h1>
          <p class="result-message">
            {{ statusData()?.eligibilityReasonCode }}
          </p>
          
          <button class="btn btn--primary" routerLink="/vin-entry">
            Try Another Vehicle
          </button>
        </div>
      }
      
      @case (VinAddStatus.FAILED_DEPENDENCY) {
        <div class="result-failed">
          <div class="result-icon result-icon--error">✕</div>
          <h1>Unable to Complete Request</h1>
          <p class="result-message">
            We encountered an issue processing your request. Please contact support with your reference number.
          </p>
          
          <p class="result-id">
            Reference: {{ requestId() }}
          </p>
          
          <a href="/support" class="btn btn--primary">
            Contact Support
          </a>
        </div>
      }
    }
  </div>
</div>
```

---

## Guards

### Auth Guard
```typescript
// src/app/core/guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  
  if (sessionService.isAuthenticated()) {
    return true;
  }
  
  return router.createUrlTree(['/authenticate']);
};
```

### OTP Required Guard
```typescript
// src/app/core/guards/otp-required.guard.ts
export const otpRequiredGuard: CanActivateFn = () => {
  const consumerState = inject(ConsumerStateService);
  const router = inject(Router);
  
  if (consumerState.otpRequired() && consumerState.otpChallengeId()) {
    return true;
  }
  
  return router.createUrlTree(['/authenticate']);
};
```

### Eligible Guard
```typescript
// src/app/core/guards/eligible.guard.ts
export const eligibleGuard: CanActivateFn = () => {
  const consumerState = inject(ConsumerStateService);
  const router = inject(Router);
  
  if (consumerState.isEligible()) {
    return true;
  }
  
  return router.createUrlTree(['/vin-entry']);
};
```

---

## Checklist

- [ ] Create consumer routes configuration
- [ ] Implement ConsumerStateService
- [ ] Build Landing page
- [ ] Build Authenticate page with form validation
- [ ] Build Verify OTP page with resend cooldown
- [ ] Build VIN Entry page with decode/eligibility
- [ ] Build Review page with confirmation
- [ ] Build Result page with polling
- [ ] Create route guards (auth, otp-required, eligible)
- [ ] Add page transition animations
- [ ] Test complete wizard flow

---

## Next Phase

Once Phase 2 is complete, proceed to [Phase 3: Admin Portal](./phase-3-admin-portal.md).

