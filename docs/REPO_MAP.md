# Repo Map

## Project

| Field        | Value                                |
| ------------ | ------------------------------------ |
| Name         | vin-portal                           |
| Framework    | Angular 21 (standalone components)   |
| Language     | TypeScript ~5.9                      |
| Styling      | Tailwind CSS 4.x                     |
| Test runner  | Jest 30 (jest-preset-angular)        |
| Build output | `dist/vin-portal`                    |
| Dev server   | `ng serve` → `http://localhost:4200` |

## Directory Layout

```
vin-portal/
├── src/
│   ├── main.ts                          # Bootstrap entry point
│   ├── index.html                       # Root HTML
│   ├── styles.css                       # Global Tailwind imports
│   │
│   ├── app/
│   │   ├── app.component.ts             # Root component (<router-outlet>)
│   │   ├── app.config.ts                # Providers, interceptors, router config
│   │   ├── app.routes.ts                # Top-level routes (consumer + admin lazy)
│   │   │
│   │   ├── core/                        # Singleton services, guards, interceptors, models
│   │   │   ├── guards/                  # auth, eligible, otp-required
│   │   │   ├── interceptors/            # mock, auth, correlation, error
│   │   │   ├── models/                  # API envelope, contract, OTP, VIN, admin, status
│   │   │   └── services/               # api, session, contract, vin, otp, admin, idempotency, mock-api
│   │   │
│   │   ├── features/
│   │   │   ├── consumer/                # Consumer wizard flow
│   │   │   │   ├── consumer.routes.ts
│   │   │   │   ├── state/               # ConsumerStateService (wizard state)
│   │   │   │   └── pages/               # landing, authenticate, verify-otp, vin-entry, review, result
│   │   │   │
│   │   │   └── admin/                   # Admin portal
│   │   │       ├── admin.routes.ts
│   │   │       ├── layout/              # AdminLayoutComponent
│   │   │       └── pages/               # admin-dashboard, contract-search, contract-detail, request-detail
│   │   │
│   │   └── shared/                      # Reusable components and validators
│   │       ├── components/              # header, progress-stepper, alert-banner, loading-spinner, form-field, vin-display, confirmation-checkbox
│   │       └── validators/              # vin, zip
│   │
│   └── environments/
│       ├── environment.ts               # Dev (mockApi: true)
│       └── environment.prod.ts          # Prod (mockApi: false)
│
├── public/                              # Static assets
├── openapi/
│   └── vin-portal.openapi.yaml          # OpenAPI 3.0.3 contract
│
├── docs/                                # Project documentation
│   ├── overview.md                      # Purpose, business rules, glossary
│   ├── architecture.md                  # System architecture & sequence diagrams
│   ├── db-schema.md                     # PostgreSQL schema
│   ├── ui-spec.md                       # UI specifications
│   ├── security.md                      # Threat model & controls
│   ├── integrations.md                  # External API dependencies
│   ├── operations-sla.md               # SLA & operational requirements
│   ├── admin-portal.md                 # Admin feature spec
│   ├── REPO_MAP.md                     # ← this file
│   ├── ENVIRONMENT.md                  # Env vars & local setup
│   ├── DECISIONS.md                    # Major decisions log
│   ├── implementation-plan/            # Phased implementation docs
│   ├── adr/                            # Architecture Decision Records
│   ├── infra/                          # Infra contracts
│   └── ai/                            # AI prompts & stack packs
│
├── angular.json                        # Angular CLI config
├── tsconfig.json                       # TypeScript (strict, path aliases)
├── tsconfig.app.json                   # App TS config
├── tsconfig.spec.json                  # Test TS config
├── jest.config.js                      # Jest config
├── setup-jest.ts                       # Jest zone.js setup
├── tailwind.config.js                  # Tailwind theme
├── .postcssrc.json                     # PostCSS config
└── package.json                        # Scripts & dependencies
```

## Path Aliases (tsconfig.json)

| Alias          | Maps to                           |
| -------------- | --------------------------------- |
| `@core/*`      | `src/app/core/*`                  |
| `@shared/*`    | `src/app/shared/*`                |
| `@features/*`  | `src/app/features/*`              |
| `@env`         | `src/environments/environment`    |

## Key Entry Points

| Entry point            | File                                    | Purpose                              |
| ---------------------- | --------------------------------------- | ------------------------------------ |
| Bootstrap              | `src/main.ts`                           | Bootstraps AppComponent              |
| Root routes            | `src/app/app.routes.ts`                 | Consumer (lazy) + Admin (lazy)       |
| Consumer routes        | `src/app/features/consumer/consumer.routes.ts` | Wizard: landing → auth → OTP → VIN → review → result |
| Admin routes           | `src/app/features/admin/admin.routes.ts`       | Dashboard, search, contract detail, request detail |
| API service            | `src/app/core/services/api.service.ts`         | Base HTTP client (`/api/v1`)         |
| Mock API               | `src/app/core/services/mock-api.service.ts`    | Full mock backend for dev            |
| Session management     | `src/app/core/services/session.service.ts`     | JWT token storage (signals-based)    |
| OpenAPI spec           | `openapi/vin-portal.openapi.yaml`              | API contract definition              |

## Existing Tests

| File                                              | Covers                      |
| ------------------------------------------------- | --------------------------- |
| `src/app/shared/validators/vin.validator.spec.ts` | VIN format validation       |
| `src/app/shared/validators/zip.validator.spec.ts` | ZIP code validation         |
| `src/app/shared/components/alert-banner/alert-banner.component.spec.ts` | Alert banner component |
| `src/app/shared/components/progress-stepper/progress-stepper.component.spec.ts` | Progress stepper |
| `src/app/core/services/session.service.spec.ts`   | Session service             |
| `src/app/core/services/idempotency.service.spec.ts` | Idempotency key generation |
