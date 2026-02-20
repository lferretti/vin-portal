# Review Checklist (Shared)

## Correctness
- Matches Objective + acceptance criteria?
- Handles edge cases (invalid input, timeouts, missing data, permissions)?
- Errors are consistent with repo’s error contract (if applicable).

## Tests
- Tests added/updated at the right layer:
  - unit for logic
  - integration/e2e for boundaries
  - Playwright for user journeys (frontend)
- Flakiness risks addressed (timeouts, stable selectors, deterministic test data)?

## Maintainability
- Diff is small and scoped?
- Pattern matches existing codebase conventions?
- Any tech debt introduced is explicitly tracked?

## Security/Privacy
- No secrets/PII in logs/tests/code
- Input validation and auth checks where applicable
- Dependencies updated responsibly

## Observability
- Datadog instrumentation preserved/extended
- Frontend: RUM events + session/user context (non-PII)
- Backend: logs + traces correlation (where applicable)

## CI Compliance
- Checkmarx gates included and pass (per repo policy)
- No “bypass” changes
