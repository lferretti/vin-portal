# Stack Pack: Angular + AWS S3 Hosting (GitHub Actions, Jest, Playwright, Checkmarx, Datadog RUM)

## Purpose
Standardize how this Angular repo is changed safely and consistently:
Spec → Tests → Implementation → Review → CI Gates → Deploy (S3 web hosting)

## Deployment Model
- Static build artifacts deployed to S3 website hosting bucket (and optionally CloudFront).
- Preview strategy (if used) must be explicitly documented (branch-based buckets, CloudFront behaviors, etc).

## Tooling
- Unit tests: Jest
- E2E tests: Playwright
- CI: GitHub Actions
- Security gates: Checkmarx Enterprise (all features) REQUIRED
- Observability: Datadog + RUM (license enabled)

## What to read before any task
- CONTEXT.md
- CODE_STYLE.md
- DEFINITION_OF_DONE.md
- QUALITY_GATES.md
- ../common/MODEL_GUIDANCE.md
- ../common/REVIEW_CHECKLIST.md
- Prompt library under ai/prompts/
