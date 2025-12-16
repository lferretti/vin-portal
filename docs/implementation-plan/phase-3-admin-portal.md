# Phase 3: Admin Portal

> Internal support and security team dashboard

## Overview

The admin portal provides customer support and security teams with:
- Contract status visibility
- Request details and eligibility reason codes
- Dependency failures and retry status
- Audit trail (who/what/when/how)
- Ability to add internal notes

---

## Access Model

| Role | Permissions |
|------|-------------|
| **Support** | View masked contract info, request status, eligibility reason codes |
| **Security/Admin** | View IP/user-agent, full audit metadata |

> **Note:** In v1, admin auth is a placeholder. Production should integrate with internal SSO (Okta).

---

## Routes Configuration

### File: `src/app/features/admin/admin.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { adminAuthGuard } from '../../core/guards/admin-auth.guard';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'search',
        pathMatch: 'full',
      },
      {
        path: 'search',
        component: AdminSearchComponent,
      },
      {
        path: 'contracts/:id',
        component: AdminContractDetailComponent,
      },
      {
        path: 'requests/:id',
        component: AdminRequestDetailComponent,
      },
    ],
  },
];
```

---

## Admin Services

### File: `src/app/core/services/admin.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  
  searchContracts(params: {
    contractNumber?: string;
    externalContractId?: string;
    requestId?: string;
  }): Observable<ApiEnvelope<AdminContractSearchData>> {
    const queryParams = new URLSearchParams();
    if (params.contractNumber) queryParams.set('contractNumber', params.contractNumber);
    if (params.externalContractId) queryParams.set('externalContractId', params.externalContractId);
    if (params.requestId) queryParams.set('requestId', params.requestId);
    
    return this.api.get(`/admin/contracts?${queryParams.toString()}`);
  }
  
  getRequestDetail(requestId: string): Observable<ApiEnvelope<AdminRequestDetailData>> {
    return this.api.get(`/admin/requests/${requestId}`);
  }
  
  addNote(requestId: string, note: string): Observable<ApiEnvelope<AdminNoteResponseData>> {
    return this.api.post(`/admin/requests/${requestId}/note`, { note });
  }
}
```

---

## Page Implementations

### 3.1 Admin Layout

**File Structure:**
```
src/app/features/admin/
├── admin.routes.ts
├── layout/
│   ├── admin-layout.component.ts
│   ├── admin-layout.component.html
│   └── admin-layout.component.scss
├── pages/
│   ├── search/
│   ├── contract-detail/
│   └── request-detail/
└── components/
    ├── admin-header/
    ├── audit-timeline/
    └── note-form/
```

### Admin Layout Component
```typescript
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminHeaderComponent],
  template: `
    <div class="admin-layout">
      <app-admin-header />
      <main class="admin-main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {}
```

### Admin Header Component
```typescript
@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="admin-header">
      <div class="admin-header__brand">
        <span class="admin-header__logo">🛡️</span>
        <span class="admin-header__title">VIN Portal Admin</span>
      </div>
      <nav class="admin-header__nav">
        <a routerLink="/admin/search" routerLinkActive="active">Search</a>
      </nav>
      <div class="admin-header__user">
        <span>{{ userName }}</span>
        <button class="btn btn--ghost btn--sm">Logout</button>
      </div>
    </header>
  `,
})
export class AdminHeaderComponent {
  // Placeholder - would come from SSO in production
  userName = 'Admin User';
}
```

---

### 3.2 Search Page (`/admin/search`)

**Purpose:** Search contracts by various criteria

**Search Options:**
- Contract Number (server hashes for lookup)
- External Contract ID
- Request ID

**Component Logic:**
```typescript
@Component({
  selector: 'app-admin-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, /* shared components */],
  templateUrl: './admin-search.component.html',
})
export class AdminSearchComponent {
  private readonly adminService = inject(AdminService);
  
  readonly isLoading = signal(false);
  readonly searchResults = signal<AdminContractSummary[]>([]);
  readonly hasSearched = signal(false);
  readonly errorMessage = signal<string | null>(null);
  
  readonly searchForm = new FormGroup({
    searchType: new FormControl<'contractNumber' | 'externalContractId' | 'requestId'>('contractNumber'),
    searchValue: new FormControl('', Validators.required),
  });
  
  onSearch(): void {
    if (this.searchForm.invalid) return;
    
    const { searchType, searchValue } = this.searchForm.value;
    
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const params: Record<string, string> = {};
    params[searchType!] = searchValue!;
    
    this.adminService.searchContracts(params).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.hasSearched.set(true);
        if (response.success && response.data) {
          this.searchResults.set(response.data.results);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Search failed. Please try again.');
      }
    });
  }
  
  getStatusBadgeClass(status: VinAddStatus): string {
    const classes: Record<string, string> = {
      'NOT_USED': 'badge--neutral',
      'PENDING': 'badge--warning',
      'COMMITTED_LOCKED': 'badge--success',
      'FAILED_INELIGIBLE': 'badge--error',
      'FAILED_DEPENDENCY': 'badge--error',
      'FAILED_VALIDATION': 'badge--error',
      'CANCELLED': 'badge--neutral',
    };
    return classes[status] || 'badge--neutral';
  }
}
```

**Template:**
```html
<div class="admin-page">
  <h1>Contract Search</h1>
  
  <div class="search-panel">
    <form [formGroup]="searchForm" (ngSubmit)="onSearch()">
      <div class="search-type-selector">
        <label class="radio-label">
          <input type="radio" formControlName="searchType" value="contractNumber" />
          Contract Number
        </label>
        <label class="radio-label">
          <input type="radio" formControlName="searchType" value="externalContractId" />
          External Contract ID
        </label>
        <label class="radio-label">
          <input type="radio" formControlName="searchType" value="requestId" />
          Request ID
        </label>
      </div>
      
      <div class="search-input-row">
        <input 
          type="text" 
          formControlName="searchValue"
          placeholder="Enter search value..."
          class="search-input" />
        <button type="submit" class="btn btn--primary" [disabled]="searchForm.invalid || isLoading()">
          @if (isLoading()) {
            Searching...
          } @else {
            Search
          }
        </button>
      </div>
    </form>
  </div>
  
  @if (errorMessage()) {
    <app-alert-banner type="error">{{ errorMessage() }}</app-alert-banner>
  }
  
  @if (hasSearched()) {
    @if (searchResults().length === 0) {
      <div class="no-results">
        <p>No contracts found matching your search criteria.</p>
      </div>
    } @else {
      <div class="results-table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th>Contract Context ID</th>
              <th>External Contract ID</th>
              <th>Status</th>
              <th>Committed VIN</th>
              <th>Committed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (contract of searchResults(); track contract.contractContextId) {
              <tr>
                <td class="mono">{{ contract.contractContextId | slice:0:8 }}...</td>
                <td>{{ contract.externalContractId }}</td>
                <td>
                  <span class="badge" [class]="getStatusBadgeClass(contract.status)">
                    {{ contract.status }}
                  </span>
                </td>
                <td class="mono">{{ contract.committedVinMasked || '—' }}</td>
                <td>{{ contract.committedAt | date:'short' || '—' }}</td>
                <td>
                  <a [routerLink]="['/admin/contracts', contract.contractContextId]" class="btn btn--ghost btn--sm">
                    View Details
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  }
</div>
```

---

### 3.3 Contract Detail Page (`/admin/contracts/:id`)

**Purpose:** View contract details and associated requests

**Displayed Information:**
- Contract status
- Committed VIN (masked)
- List of all requests with timestamps and statuses

**Component Logic:**
```typescript
@Component({
  selector: 'app-admin-contract-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, /* shared components */],
  templateUrl: './admin-contract-detail.component.html',
})
export class AdminContractDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  
  readonly contractId = signal<string | null>(null);
  readonly contract = signal<AdminContractSummary | null>(null);
  readonly requests = signal<AdminRequestSummary[]>([]);
  readonly isLoading = signal(true);
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.contractId.set(id);
      this.loadContract(id);
    }
  }
  
  private loadContract(id: string): void {
    // Implementation would load contract details
    // For now, this is a placeholder
  }
}
```

**Template:**
```html
<div class="admin-page">
  <nav class="breadcrumb">
    <a routerLink="/admin/search">Search</a>
    <span>›</span>
    <span>Contract Details</span>
  </nav>
  
  @if (isLoading()) {
    <app-loading-spinner message="Loading contract details..." />
  } @else if (contract()) {
    <div class="detail-header">
      <h1>Contract: {{ contract()!.externalContractId }}</h1>
      <span class="badge" [class]="getStatusBadgeClass(contract()!.status)">
        {{ contract()!.status }}
      </span>
    </div>
    
    <div class="detail-cards">
      <div class="detail-card">
        <h3>Contract Information</h3>
        <dl class="detail-list">
          <dt>Contract Context ID</dt>
          <dd class="mono">{{ contract()!.contractContextId }}</dd>
          <dt>External Contract ID</dt>
          <dd>{{ contract()!.externalContractId }}</dd>
          <dt>Status</dt>
          <dd>{{ contract()!.status }}</dd>
          @if (contract()!.committedVinMasked) {
            <dt>Committed VIN</dt>
            <dd class="mono">{{ contract()!.committedVinMasked }}</dd>
            <dt>Committed At</dt>
            <dd>{{ contract()!.committedAt | date:'medium' }}</dd>
          }
        </dl>
      </div>
    </div>
    
    <div class="requests-section">
      <h2>Request History</h2>
      @if (requests().length === 0) {
        <p class="no-data">No requests found for this contract.</p>
      } @else {
        <table class="results-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (request of requests(); track request.requestId) {
              <tr>
                <td class="mono">{{ request.requestId | slice:0:8 }}...</td>
                <td>
                  <span class="badge" [class]="getStatusBadgeClass(request.status)">
                    {{ request.status }}
                  </span>
                </td>
                <td>{{ request.createdAt | date:'medium' }}</td>
                <td>
                  <a [routerLink]="['/admin/requests', request.requestId]" class="btn btn--ghost btn--sm">
                    View
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  }
</div>
```

---

### 3.4 Request Detail Page (`/admin/requests/:id`)

**Purpose:** Detailed view of a single request with audit trail

**Displayed Information:**
- VIN + decoded Year/Make/Model
- Eligibility result + reason code
- Dependency errors + retry counts
- Audit timeline
- Notes section

**Component Logic:**
```typescript
@Component({
  selector: 'app-admin-request-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, AuditTimelineComponent, /* shared components */],
  templateUrl: './admin-request-detail.component.html',
})
export class AdminRequestDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  
  readonly requestId = signal<string | null>(null);
  readonly requestDetail = signal<AdminRequestDetailData | null>(null);
  readonly isLoading = signal(true);
  readonly isSavingNote = signal(false);
  readonly noteSuccess = signal(false);
  
  readonly noteControl = new FormControl('', [Validators.required, Validators.maxLength(4000)]);
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.requestId.set(id);
      this.loadRequestDetail(id);
    }
  }
  
  private loadRequestDetail(id: string): void {
    this.isLoading.set(true);
    
    this.adminService.getRequestDetail(id).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.requestDetail.set(response.data);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
  
  onSaveNote(): void {
    if (this.noteControl.invalid) return;
    
    const requestId = this.requestId();
    if (!requestId) return;
    
    this.isSavingNote.set(true);
    this.noteSuccess.set(false);
    
    this.adminService.addNote(requestId, this.noteControl.value!).subscribe({
      next: (response) => {
        this.isSavingNote.set(false);
        if (response.success) {
          this.noteSuccess.set(true);
          this.noteControl.reset();
          // Reload to show new audit event
          this.loadRequestDetail(requestId);
        }
      },
      error: () => {
        this.isSavingNote.set(false);
      }
    });
  }
}
```

**Template:**
```html
<div class="admin-page">
  <nav class="breadcrumb">
    <a routerLink="/admin/search">Search</a>
    <span>›</span>
    <span>Request Details</span>
  </nav>
  
  @if (isLoading()) {
    <app-loading-spinner message="Loading request details..." />
  } @else if (requestDetail()) {
    <div class="detail-header">
      <h1>Request: {{ requestId()! | slice:0:8 }}...</h1>
      <span class="badge" [class]="getStatusBadgeClass(requestDetail()!.status)">
        {{ requestDetail()!.status }}
      </span>
    </div>
    
    <div class="detail-grid">
      <!-- VIN Information -->
      <div class="detail-card">
        <h3>Vehicle Information</h3>
        <dl class="detail-list">
          <dt>VIN</dt>
          <dd class="mono">{{ requestDetail()!.vin || '—' }}</dd>
          @if (requestDetail()!.decoded) {
            <dt>Year</dt>
            <dd>{{ requestDetail()!.decoded!.year }}</dd>
            <dt>Make</dt>
            <dd>{{ requestDetail()!.decoded!.make }}</dd>
            <dt>Model</dt>
            <dd>{{ requestDetail()!.decoded!.model }}</dd>
          }
        </dl>
      </div>
      
      <!-- Eligibility Information -->
      <div class="detail-card">
        <h3>Eligibility</h3>
        <dl class="detail-list">
          <dt>Allowed</dt>
          <dd>
            @if (requestDetail()!.eligibilityAllowed === true) {
              <span class="badge badge--success">Yes</span>
            } @else if (requestDetail()!.eligibilityAllowed === false) {
              <span class="badge badge--error">No</span>
            } @else {
              <span>—</span>
            }
          </dd>
          <dt>Reason Code</dt>
          <dd>{{ requestDetail()!.eligibilityReasonCode || '—' }}</dd>
        </dl>
      </div>
      
      <!-- Status Information -->
      <div class="detail-card">
        <h3>Status Details</h3>
        <dl class="detail-list">
          <dt>Status</dt>
          <dd>{{ requestDetail()!.status }}</dd>
          <dt>Contract Context ID</dt>
          <dd class="mono">{{ requestDetail()!.contractContextId }}</dd>
          @if (requestDetail()!.lastDependencyError) {
            <dt>Last Dependency Error</dt>
            <dd class="error-text">{{ requestDetail()!.lastDependencyError }}</dd>
          }
        </dl>
      </div>
    </div>
    
    <!-- Audit Timeline -->
    <div class="audit-section">
      <h2>Audit Timeline</h2>
      <app-audit-timeline [events]="requestDetail()!.audit" />
    </div>
    
    <!-- Add Note -->
    <div class="note-section">
      <h2>Add Note</h2>
      <div class="note-form">
        <textarea 
          [formControl]="noteControl"
          rows="4"
          placeholder="Enter internal note (max 4000 characters)..."
          class="note-textarea">
        </textarea>
        <div class="note-actions">
          <span class="char-count">{{ noteControl.value?.length || 0 }} / 4000</span>
          <button 
            type="button" 
            class="btn btn--primary"
            [disabled]="noteControl.invalid || isSavingNote()"
            (click)="onSaveNote()">
            @if (isSavingNote()) {
              Saving...
            } @else {
              Save Note
            }
          </button>
        </div>
        @if (noteSuccess()) {
          <app-alert-banner type="success" [dismissible]="true">
            Note saved successfully.
          </app-alert-banner>
        }
      </div>
    </div>
  }
</div>
```

---

## Admin Components

### Audit Timeline Component

```typescript
@Component({
  selector: 'app-audit-timeline',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="audit-timeline">
      @for (event of events(); track $index) {
        <div class="audit-event">
          <div class="audit-event__marker"></div>
          <div class="audit-event__content">
            <div class="audit-event__header">
              <span class="audit-event__type">{{ event.eventType }}</span>
              <span class="audit-event__time">{{ event.createdAt | date:'medium' }}</span>
            </div>
            <div class="audit-event__details">
              @if (event.actorType) {
                <span class="audit-event__actor">{{ event.actorType }}</span>
              }
              @if (showSensitive() && event.sourceIp) {
                <span class="audit-event__ip">IP: {{ event.sourceIp }}</span>
              }
            </div>
            @if (event.eventData) {
              <pre class="audit-event__data">{{ event.eventData | json }}</pre>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class AuditTimelineComponent {
  events = input<AdminAuditEvent[]>([]);
  showSensitive = input<boolean>(false); // Only for security/admin role
}
```

---

## Admin Styles

```scss
// src/app/features/admin/admin.styles.scss

.admin-layout {
  min-height: 100vh;
  background: var(--color-surface-elevated);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  background: var(--color-primary-900);
  color: white;
  
  &__brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  &__title {
    font-family: var(--font-display);
    font-weight: 600;
  }
  
  &__nav a {
    color: var(--color-primary-500);
    text-decoration: none;
    
    &.active {
      color: white;
    }
  }
}

.admin-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-8);
}

.admin-page {
  h1 {
    margin-bottom: var(--space-6);
  }
}

.search-panel {
  background: var(--color-surface);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-6);
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  
  th, td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  
  th {
    background: var(--color-surface-elevated);
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  tr:hover td {
    background: var(--color-surface-elevated);
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.detail-card {
  background: var(--color-surface);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  
  h3 {
    margin-bottom: var(--space-4);
    color: var(--color-primary-700);
  }
}

.detail-list {
  dt {
    font-size: 0.875rem;
    color: var(--color-primary-600);
    margin-bottom: var(--space-1);
  }
  
  dd {
    margin-bottom: var(--space-3);
    font-weight: 500;
  }
}

.audit-timeline {
  position: relative;
  padding-left: var(--space-6);
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-border);
  }
}

.audit-event {
  position: relative;
  padding-bottom: var(--space-6);
  
  &__marker {
    position: absolute;
    left: calc(-1 * var(--space-6) - 5px);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-accent);
    border: 2px solid var(--color-surface);
  }
  
  &__content {
    background: var(--color-surface);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
  
  &__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }
  
  &__type {
    font-weight: 600;
    font-family: var(--font-mono);
    font-size: 0.875rem;
  }
  
  &__time {
    color: var(--color-primary-600);
    font-size: 0.875rem;
  }
}
```

---

## Admin Auth Guard (Placeholder)

```typescript
// src/app/core/guards/admin-auth.guard.ts
export const adminAuthGuard: CanActivateFn = () => {
  // TODO: Integrate with SSO (Okta) in production
  // For now, allow access in development
  const environment = inject(ENVIRONMENT_TOKEN);
  
  if (!environment.production) {
    return true;
  }
  
  // In production, check for admin session
  // return router.createUrlTree(['/admin/login']);
  return true;
};
```

---

## Audit Requirements

Per the documentation:
- Every admin page view emits `ADMIN_VIEW` audit event
- Every note creation emits `ADMIN_NOTE` event

This should be handled by the backend, but the frontend should ensure proper headers are sent for audit tracking.

---

## Checklist

- [ ] Create admin routes configuration
- [ ] Implement AdminService
- [ ] Build Admin Layout with header
- [ ] Build Search page with filter options
- [ ] Build Contract Detail page
- [ ] Build Request Detail page with audit timeline
- [ ] Create Audit Timeline component
- [ ] Create Note Form component
- [ ] Implement admin auth guard (placeholder)
- [ ] Add admin-specific styles
- [ ] Test search and navigation flow

---

## Next Phase

Once Phase 3 is complete, proceed to [Phase 4: Testing & Polish](./phase-4-testing.md).

