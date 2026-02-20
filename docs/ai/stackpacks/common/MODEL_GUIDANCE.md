# AI Model Guidance (Shared)

## Goal
Move fast without drift:
- Repo artifacts are the source of truth (docs/contracts/tests > chat memory)
- Cheaper models implement within constraints
- Strong models define correctness + review risks
- CI quality gates decide

## Model Tiers
### Tier A — Strong Reasoning / Reviewer
Use for:
- Acceptance criteria, architecture, ADRs
- Security/privacy review
- Complex bug diagnosis, concurrency/failure mode analysis
- Final PR review vs Definition of Done

### Tier B — Implementer (Cost-efficient)
Use for:
- Scaffolding components/modules/endpoints
- Straightforward implementation tasks
- Small refactors in a tight scope
- Repetitive test creation once patterns are defined

### Tier C — Clerical / Utility
Use for:
- Summarizing logs/errors
- Ticket slicing/checklists
- Repo maps / TODO extraction

## Default Workflow (per feature)
1) Tier A: confirm acceptance criteria + identify tests
2) Tier B: implement + add tests
3) Tier A: review diff with REVIEW_CHECKLIST
4) CI gates: pass or block merge

## Drift Prevention Rules (non-negotiable)
- Do not re-decide architecture during implementation tasks.
- New libraries/tools require an ADR + Tier A review.
- Requirements changes update docs/tests first, code second.
- Minimize diffs: no drive-by refactors.

## Context Efficiency Rules
- Reference repo files instead of pasting long content
- Prefer diff-based edits over rewriting full files
- Keep changes scoped to the task
