# Agent Operating Procedure (How to use this stack pack with AI tooling)

This repo is designed for a repeatable multi-agent workflow.

## Core concept
- Artifacts are law: stack pack docs + repo docs + tests define truth
- CI gates enforce quality and security (including Checkmarx)
- Datadog/RUM is part of “done”, not optional

## Recommended agents (can be separate chats / separate runs)
1) Architect (Tier A)
   - Produces/updates: acceptance criteria, ADRs, contracts, risk notes
2) Implementer (Tier B)
   - Produces: minimal code diffs + tests, within allowed scope
3) Reviewer (Tier A)
   - Produces: strict review + missing tests + risk checks
4) Scribe (Tier C)
   - Produces: repo maps, env docs, infra contract updates, changelogs

## How to avoid re-typing prompts
Store prompts in-repo:
- ai/prompts/*.md (copy/paste templates with placeholders)
Then in your AI tool, create “snippets” or “saved prompts” that simply paste:
- the relevant prompt file content
- plus your task-specific Objective and Allowed Paths

## The enforcement pattern
For every task, start with:
- ai/prompts/01_ENFORCE_STACK_PACK.md (or equivalent)
Then use:
- ai/stackpacks/<repo>/TASK_TEMPLATE.md

## Guardrails you should always include
- Allowed scope (exact file paths)
- Definition of Done checklist
- Required gates (QUALITY_GATES)
- Security and observability constraints (Checkmarx + Datadog/RUM)

## A practical “daily loop”
1) Architect: writes acceptance criteria + identifies tests
2) Implementer: implements minimal diff + tests
3) Reviewer: blocks drift + security regressions
4) CI: pass/fail
5) Scribe: updates docs/contracts if needed

## When to use a strong model
- Acceptance criteria, tricky design decisions, auth/security, performance concerns
- Final review

## When to use a cheaper model
- Scaffolding, straightforward implementation, repetitive tests, refactors within a tight scope
