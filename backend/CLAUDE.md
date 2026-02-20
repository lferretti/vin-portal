# VIN Portal Backend

NestJS API serving the VIN Portal Angular SPA.

## Quick Commands

```bash
npm run start:dev      # Dev server with watch (port 3000)
npm run build          # Compile to dist/
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Jest unit tests
npm run test:ci        # Jest with coverage
npm run test:e2e       # Supertest E2E tests (needs Postgres)
npm run migration:run  # Apply pending migrations
```

## Architecture

- **`src/config/`** — Typed configuration (app, database, JWT)
- **`src/common/`** — Shared constants, decorators, DTOs, filters, guards, interceptors, utils
- **`src/database/`** — TypeORM entities, migrations, data-source for CLI
- **`src/modules/`** — Feature modules (health, auth, audit, contract, otp, vin, admin, worker)
- **`src/adapters/`** — External service interfaces + stub implementations

## Key Conventions

- Adapter pattern for all external services (swap stubs for real implementations)
- Envelope wrapping via interceptor — controllers return plain data
- Correlation IDs on every request/response
- PII sanitization in logs and error messages
- Append-only audit events for compliance
- Code-first TypeORM entities with generated migrations
