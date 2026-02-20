# Definition of Done (Angular Repo)

## For any PR
- Requirement is captured (ticket/PRD snippet)
- Acceptance criteria is testable
- Diff is scoped (no unrelated refactors)
- QUALITY_GATES are green
- No secrets/PII added
- Datadog RUM remains enabled and correctly configured

## UI/UX
- Changes align with existing component patterns
- Accessibility basics checked (labels, keyboard nav where relevant)

## Testing
- Unit tests updated for logic changes
- Playwright smoke updated if a critical user journey changed
- Selectors use data-testid where needed

## Observability
- RUM signals still present for critical flows
- New critical flows include meaningful non-PII actions when appropriate
