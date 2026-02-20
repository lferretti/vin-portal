# Documentation Bootstrap Guide (Shared)

## Goal
Create enough accurate, version-controlled truth so AI (and humans) stop guessing.

> Principle: “Artifacts are law, code is implementation.”
> We bootstrap *just enough* documentation to stop AI drift, then we improve docs iteratively.

## Phase 0 — Inventory (1–2 hours)
Create:
- docs/REPO_MAP.md (apps/libs/modules, entrypoints)
- docs/ENVIRONMENT.md (env vars, ports, dependencies)
- docs/infra/APP_INFRA_CONTRACT.md (what infra needs from app repo)

## Phase 1 — Minimal Architecture (half day)
Create:
- docs/ARCHITECTURE.md (1–2 pages)
- docs/DECISIONS.md (bullets until ADRs exist)
- Fill in ai/stackpacks/<repo>/CONTEXT.md

## Phase 2 — Tests as executable truth (1–3 days)
- Add smoke tests for top 1–3 critical flows
- Add unit tests for highest-risk logic paths
- Add minimal integration tests around key boundaries

## Phase 3 — Enforce CI Gates (0.5–1 day)
- Ensure repo scripts exist for quality gates
- Ensure GitHub Actions runs gates on PRs
- Add Checkmarx required steps in pipeline

## Phase 4 — ADRs (ongoing)
For decisions that change patterns, add docs/adr/0001-*.md:
- Context / Decision / Alternatives / Consequences
