# Prompt: Bootstrap a legacy repo (no docs)

You are bootstrapping documentation and guardrails for an existing repo that has little or no documentation.
**Goal:** create minimal, correct artifacts that stop AI drift and enable safe high-velocity development.

## Step 0 — Rules
- Do NOT propose new architectures or large refactors.
- Work strictly from the repository content.
- If you are uncertain, mark it clearly and propose how to validate.
- Output changes as a minimal set of new files and targeted edits.

## Step 1 — Read stack pack + existing repo
Read:
- ai/stackpacks/nest-ecs-fargate/README.md
- ai/stackpacks/nest-ecs-fargate/CONTEXT.md (if empty, you will fill it)
- ai/stackpacks/nest-ecs-fargate/CODE_STYLE.md
- ai/stackpacks/nest-ecs-fargate/DEFINITION_OF_DONE.md
- ai/stackpacks/nest-ecs-fargate/QUALITY_GATES.md
- ai/stackpacks/common/MODEL_GUIDANCE.md
- ai/stackpacks/common/REVIEW_CHECKLIST.md
- ai/stackpacks/common/DOCS_BOOTSTRAP_GUIDE.md

## Step 2 — Create minimal “truth” docs
Create:
- docs/REPO_MAP.md
- docs/ENVIRONMENT.md
- docs/ARCHITECTURE.md (1–2 pages)
- docs/DECISIONS.md (bulleted list of current major decisions)
- docs/infra/APP_INFRA_CONTRACT.md (fill what you can, leave TODOs)

## Step 3 — Wire quality gates
- Ensure package.json scripts exist for:
  - lint, typecheck, test (jest), build
  - e2e (playwright) for frontend repos
  - api e2e (jest/supertest) for backend repos
- Update QUALITY_GATES.md to match exact script names
- Add CI workflow (GitHub Actions) to run the gates
- Add required Checkmarx steps (placeholders acceptable, but must be present and documented)

## Step 4 — Seed safety tests
- Create a smoke suite:
  - Frontend: 1–3 Playwright smoke tests for critical flows
  - Backend: 1–3 API e2e tests for critical endpoints
- Keep tests deterministic and data-light.

## Output format
1) What you discovered (repo map + key entry points)
2) Files created/updated (list)
3) Minimal diff or file contents
4) How to run gates locally
5) Unknowns + validation plan
