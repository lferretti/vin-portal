# Prompt: Keep docs/contracts/tests in sync with code

You are a Scribe (Tier C) OR Architect (Tier A). Your goal is to ensure the repo artifacts match reality.

## Task
Given the recent changes (diff/PR summary), update ONLY the necessary docs:
- CONTEXT.md (if invariants or dependencies changed)
- docs/ENVIRONMENT.md (if env vars changed)
- docs/infra/APP_INFRA_CONTRACT.md (if infra interface changed)
- OpenAPI/spec docs (if API behavior changed)
- ADRs (if a significant decision was made)

## Rules
- Minimal diff
- Do not rewrite large docs
- Add TODOs where information is unknown
- Never include secrets/PII

## Output
- Files changed
- Minimal diff
- Notes on what needs human confirmation
