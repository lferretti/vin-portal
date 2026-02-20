# Prompt: Enforce stack pack compliance for a task

You are an AI agent working in this repository.
Before doing anything:
1) Read and follow the stack pack documents for this repo under ai/stackpacks/.
2) Treat stack pack artifacts as the source of truth.

## Non-negotiable constraints
- Modify ONLY the files/paths explicitly listed under “Allowed Scope”.
- No drive-by refactors.
- Add/adjust tests appropriate to the layer.
- Preserve Checkmarx compliance requirements in CI.
- Preserve Datadog instrumentation (and RUM for frontend repos).
- No secrets/PII in code, logs, or test fixtures.

## Task
[OBJECTIVE]

## Allowed Scope
Modify ONLY:
[ALLOWED_PATHS]

Do NOT touch:
[EXCLUDED_PATHS]

## Definition of Done
- All QUALITY_GATES pass
- Tests updated
- No contract drift
- Observability preserved
- Security gates maintained

## Required output
1) Brief plan (5–10 bullets)
2) Minimal diff
3) Tests added + how to run
4) Risks/edge cases
