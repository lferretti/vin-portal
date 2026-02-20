# Stack Pack: NestJS + ECS Fargate (GitHub Actions, Jest, Checkmarx, Datadog)

## Purpose
Standardize how this API repo is changed safely:
Spec/Contract → Tests → Implementation → Review → CI Gates → Deploy (ECS Fargate)

## Runtime Model
- Dockerized NestJS service deployed to ECS Fargate.
- IaC is owned by Infrastructure dept; this repo defines app-side requirements and contracts.

## Tooling
- Unit + integration/e2e: Jest (often with Supertest)
- CI: GitHub Actions
- Security: Checkmarx Enterprise (all features) REQUIRED
- Observability: Datadog logs/APM integration

## Read before any task
- CONTEXT.md
- CODE_STYLE.md
- DEFINITION_OF_DONE.md
- QUALITY_GATES.md
- ../common/MODEL_GUIDANCE.md
- ../common/REVIEW_CHECKLIST.md
- Prompt library under ai/prompts/
