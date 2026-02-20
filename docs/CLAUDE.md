# Documentation

Project documentation for VIN Portal. AI agents should read relevant docs before making changes.

## Key Docs

| File | When to Read |
|------|-------------|
| `overview.md` | First time working with the project |
| `architecture.md` | Before architectural or API changes |
| `ui-spec.md` | Before UI/component changes |
| `security.md` | Before auth, session, or PII-related changes |
| `integrations.md` | Before changing API calls or external service interactions |
| `db-schema.md` | Before backend model/API contract changes |
| `operations-sla.md` | Before changing error handling, polling, or timeouts |

## Directory Structure

- **`adr/`** — Architecture Decision Records (append-only, numbered)
- **`ai/`** — AI agent instructions and stackpacks
- **`ai/stackpacks/angular-s3/`** — Standards for this Angular SPA (quality gates, code style, review checklist)
- **`infra/`** — Infrastructure contracts (`APP_INFRA_CONTRACT.md`)
- **`implementation-plan/`** — Original implementation plan docs
- **`DECISIONS.md`** — Quick-reference project decisions
- **`ENVIRONMENT.md`** — Environment setup guide
- **`REPO_MAP.md`** — Repository structure overview
