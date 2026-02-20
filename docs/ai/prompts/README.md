# Prompt Library

This folder contains reusable prompts so you don’t have to re-type common instructions.

## How to use
1) Pick the prompt file that matches your activity (bootstrap, implement feature, review, etc.)
2) Replace the bracketed placeholders (e.g., [OBJECTIVE], [ALLOWED_PATHS])
3) Paste the prompt into your AI tool of choice

## Recommended “agent roles”
- Architect (Tier A): requirements, acceptance criteria, ADRs, risk review
- Implementer (Tier B): small diffs, code + tests
- Reviewer (Tier A): strict review vs Definition of Done and security gates
- Scribe (Tier C): summaries, repo maps, TODO extraction, ticket slicing

## Repo-enforced habit
Always start prompts with:
- “Read the stack pack files first”
- “Only modify allowed paths”
- “No drive-by refactors”
- “Output a minimal diff”
