# VIN Portal

Angular 21 single-page application for adding an additional vehicle to a warranty contract. Paired with a NestJS backend API (`/api/v1`) and hosted on S3 + CloudFront.

## Prerequisites

| Tool        | Version | Notes                      |
| ----------- | ------- | -------------------------- |
| Node.js     | 20+     | Required by Angular 21     |
| npm         | 10+     | Ships with Node 20         |
| Docker      | 24+     | Only needed for backend DB |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (mock API enabled, no backend needed)
npm start
# → http://localhost:4200
```

### Running with the Backend

```bash
# Start Postgres
docker compose up -d

# Install backend dependencies
cd backend && npm install && cd ..

# Start Angular with proxy to backend
npm run start:backend

# In a separate terminal, start the backend
cd backend && npm run start:dev
```

## Scripts

### Frontend

| Command                | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm start`            | Dev server (port 4200, mock API enabled) |
| `npm run start:backend`| Dev server with proxy to NestJS backend  |
| `npm run build`        | Production build → `dist/vin-portal/`    |
| `npm run lint`         | ESLint                                   |
| `npm run typecheck`    | `tsc --noEmit`                           |
| `npm test`             | Jest unit tests                          |
| `npm run test:watch`   | Jest in watch mode                       |
| `npm run test:ci`      | Jest with coverage (CI mode)             |
| `npm run e2e`          | Playwright full suite                    |
| `npm run e2e:smoke`    | Playwright `@smoke`-tagged tests only    |
| `npm run e2e:headed`   | Playwright with browser visible          |
| `npm run format`       | Prettier format                          |
| `npm run format:check` | Prettier check                           |
| `npm run lighthouse`   | Lighthouse CI audit                      |

### Backend (`cd backend`)

| Command                    | Description                          |
| -------------------------- | ------------------------------------ |
| `npm run start:dev`        | Dev server with watch (port 3000)    |
| `npm run build`            | Compile to `dist/`                   |
| `npm test`                 | Jest unit tests                      |
| `npm run test:ci`          | Jest with coverage                   |
| `npm run test:e2e`         | Supertest E2E tests (needs Postgres) |
| `npm run migration:run`    | Apply pending TypeORM migrations     |
| `npm run migration:revert` | Revert last migration                |

### Load Testing

| Command                    | Description        |
| -------------------------- | ------------------ |
| `npm run load-test`        | k6 auth flow       |
| `npm run load-test:vin`    | k6 VIN flow        |
| `npm run load-test:admin`  | k6 admin search    |

## Architecture

```
src/app/
├── core/               # Singleton services, guards, interceptors, models
├── shared/             # Reusable components, validators, utils
├── features/
│   ├── consumer/       # Consumer wizard (landing → authenticate → vin-entry → review → result)
│   └── admin/          # Admin dashboard (lazy-loaded under /admin)
└── environments/       # Build-time config (dev w/ mock API, prod w/ real API + Datadog RUM)

backend/
├── src/
│   ├── config/         # Typed configuration (app, database, JWT)
│   ├── common/         # Shared decorators, DTOs, filters, guards, interceptors
│   ├── database/       # TypeORM entities, migrations, data-source
│   ├── modules/        # Feature modules (auth, contract, otp, vin, admin, audit, worker)
│   └── adapters/       # External service interfaces + stub implementations
```

### Key Conventions

- **Change detection:** `OnPush` on all components
- **State management:** Angular signals (`signal()`, `computed()`)
- **Components:** Standalone, inline templates, `input()`/`output()` signal APIs
- **Styling:** Tailwind CSS 4 utility classes in templates (no separate CSS files)
- **Types:** No `any` — use `unknown` + type narrowing
- **Barrel exports:** Every `core/` and `shared/` subdirectory has an `index.ts`
- **Interceptor chain:** mock → correlation → auth → error (order matters)
- **Backend adapters:** External services use adapter pattern (stubs swap for real implementations)

## Testing

| Layer     | Framework  | Config                                |
| --------- | ---------- | ------------------------------------- |
| Unit      | Jest       | `jest.config.js` (frontend), `backend/jest.config.ts` (backend) |
| E2E (UI)  | Playwright | `playwright.config.ts` — Chromium, Firefox, mobile Chrome |
| E2E (API) | Supertest  | `backend/test/jest-e2e.config.ts`     |
| Load      | k6         | `load-tests/`                         |
| A11y      | axe-core   | via Playwright                        |
| Perf      | Lighthouse | `lighthouserc.json`                   |

## Mock API Test Credentials

Dev mode (`features.mockApi: true`) provides an in-app mock backend — no external services needed.

| VIN (last 7)   | Last Name  | ZIP   | Behavior              |
| -------------- | ---------- | ----- | --------------------- |
| `1234567`      | `SMITH`    | `30301` | Direct auth (no OTP)  |
| `7654321`      | `JONES`    | `10001` | Contract locked       |
| `0TP7654`      | `TESTUSER` | `12345` | OTP required          |
| `LOCKED1`      | `LOCKED`   | `99999` | Contract locked       |
| Other values   | —          | —     | `AUTH_NO_MATCH` error |

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow                | Trigger      | Purpose                          |
| ----------------------- | ------------ | -------------------------------- |
| `ci.yml`                | Push / PR    | Lint, typecheck, test, build     |
| `checkmarx-pr.yml`      | PR           | Checkmarx incremental scan       |
| `checkmarx-security.yml`| Schedule     | Checkmarx full security scan     |
| `load-test.yml`         | Manual       | k6 load tests                   |

### Commit Conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint + Husky:

```
<type>(<scope>): <description>

# Scopes: frontend, backend, ci, docs, e2e, infra
```

## Environment Configuration

Configuration is build-time only via Angular environment files in `src/environments/`. See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for the full config reference.

## Documentation

Additional docs live in the `docs/` directory:

| Path                 | Content                                   |
| -------------------- | ----------------------------------------- |
| `docs/ENVIRONMENT.md`| Environment setup and config reference    |
| `docs/DECISIONS.md`  | Project decisions quick reference         |
| `docs/REPO_MAP.md`   | Repository structure overview             |
| `docs/security.md`   | Security model and threat considerations  |
| `docs/adr/`          | Architecture Decision Records             |
| `docs/infra/`        | Infrastructure contracts                  |
| `docs/runbooks/`     | Operational runbooks                      |

## License

Private — not licensed for distribution.
