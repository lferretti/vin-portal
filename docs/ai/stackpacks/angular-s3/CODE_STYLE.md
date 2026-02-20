# Code Style Guide (Angular Repo)

## Global Rules
- Small diffs; no drive-by refactors.
- Prefer clarity over cleverness.
- Follow existing patterns in this repo first.

## TypeScript
- Avoid `any`. Prefer `unknown` + type guards.
- Explicit return types for public functions.
- Keep side effects isolated.

## Angular Guidelines
- Prefer OnPush change detection unless there is a clear reason not to.
- Smart/container vs presentational separation where it already exists.
- Use a single state approach per area (do not introduce a second paradigm without ADR).

## Testing Style
- Jest unit tests:
  - focus on behavior, not implementation details
  - keep fixtures small and deterministic
- Playwright:
  - stable selectors (data-testid)
  - avoid brittle CSS selectors
  - no sleeps; use built-in waiting and assertions

## Styling
- Use custom CSS classes from `src/styles.css` for form elements (`form-input`, `otp-input`, `form-label`, etc.) rather than rebuilding with raw Tailwind utilities.
- Do not override font-family, font-size, or letter-spacing on `form-input` — these are owned by the design system class. The `local/no-form-input-modifier` ESLint rule enforces this.
- If a genuinely different input style is needed, create a new named class in `src/styles.css` (like `otp-input`) with the full variant set (placeholder, focus, disabled, error).
- See `src/app/shared/CLAUDE.md` for the full class vocabulary and `app-form-field` contract.

## Observability
- Do not remove or disable Datadog RUM initialization.
- New critical flows should add meaningful non-PII RUM actions/events when appropriate.
