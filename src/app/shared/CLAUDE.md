# Shared Module

Reusable components, validators, and utilities. No business logic — these are pure UI building blocks.

## Components (`components/`)

- **Pattern:** Standalone, `OnPush`, inline templates, `input()`/`output()` signal APIs
- **Styling:** Tailwind CSS 4 utility classes directly in templates
- **Barrel export** from `components/index.ts` — export the component class and any related types
- Key interactive elements should have `data-testid` attributes for E2E fallback selectors

### Available Components

| Component | Selector | Purpose |
|-----------|----------|---------|
| HeaderComponent | `app-header` | Page header with logo |
| ProgressStepperComponent | `app-progress-stepper` | Wizard step indicator |
| AlertBannerComponent | `app-alert-banner` | Success/warning/error/info alerts (`role="alert"`) |
| FormFieldComponent | `app-form-field` | Form field wrapper with label, hint, validation errors |
| LoadingSpinnerComponent | `app-loading-spinner` | Spinner with optional message |
| VinDisplayComponent | `app-vin-display` | Decoded VIN details display |
| ConfirmationCheckboxComponent | `app-confirmation-checkbox` | Checkbox with label for confirmations |

## Validators (`validators/`)

- **Pattern:** Factory functions returning `ValidatorFn` (e.g., `vinValidator()`, `zipValidator()`)
- Pure functions, no Angular dependencies beyond `@angular/forms`
- Export from `validators/index.ts`
- Also export helper functions like `normalizeVin()`, `maskVin()`

## Utils (`utils/`)

- **Pattern:** Pure functions, no Angular dependencies
- `api-error.util.ts` — API error parsing helpers
- `status-badge.util.ts` — Status-to-badge-class mapping

## Design System

Custom CSS classes live in `src/styles.css`. Use these instead of rebuilding styles with raw Tailwind utilities.

### Class Vocabulary

| Class | Purpose | When to use |
|-------|---------|-------------|
| `form-input` | Standard text input styling (border, padding, radius, transitions) | Every `<input>`, `<select>`, `<textarea>` in a form |
| `form-input-error` | Red border for invalid inputs | Add via `[class.form-input-error]` when control is invalid + touched |
| `form-label` | Label above a form field | Used by `app-form-field`; rarely needed directly |
| `form-hint` | Hint text below a field | Used by `app-form-field`; rarely needed directly |
| `form-error` | Validation error message | Used by `app-form-field`; rarely needed directly |
| `otp-input` | OTP/code entry input (centered, monospace, large) | Only for one-time-code or PIN-style inputs |
| `otp-input-error` | Red border for invalid OTP inputs | Add via `[class.otp-input-error]` when control is invalid + touched |
| `card` | Generic card container | Inline content cards |
| `page-card` | Full-width centered page card (max-width 32rem, shadow) | Main content card on wizard pages |
| `page-container` | Full-height flex column page wrapper | Outermost `<div>` of every page component |
| `page-main` | Flex-grow main content area with padding | `<main>` inside `page-container` |
| `detail-list` | Vertical key–value list (`<dl>`) | Contract/vehicle detail displays |
| `mono` | Monospace font + slight letter-spacing | VIN display, code snippets |
| `sr-only` | Screen-reader-only (visually hidden) | Accessible labels that shouldn't render visually |

### Rules for `form-input`

- **Do not** override font-family, font-size, or letter-spacing with Tailwind utilities (e.g., `font-mono`, `text-lg`, `tracking-wider`). The ESLint rule `local/no-form-input-modifier` enforces this.
- `uppercase` is allowed for functional reasons (e.g., VIN entry) — always pair with `placeholder:normal-case` so placeholder text stays readable.
- If you need a fundamentally different input style (like `otp-input`), create a new class in `src/styles.css` with its own full variant set (placeholder, focus, disabled, error).

### The `app-form-field` Contract

The `app-form-field` component provides:
- Label rendering (`form-label`)
- Required indicator
- Hint text (`form-hint`)
- Validation error display (`form-error`)

The **caller** provides:
- The `<input>` / `<select>` / `<textarea>` as projected content
- The `class="form-input"` (or `class="otp-input"`) on that element
- The `[class.form-input-error]` / `[class.otp-input-error]` binding
- Any allowed Tailwind modifiers (`uppercase`, `placeholder:normal-case`)
