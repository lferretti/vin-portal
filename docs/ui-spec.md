# UI Specification (Angular Consumer Portal)

## Goals
- Allow consumers to authenticate and add an additional VIN with minimal friction.
- Prevent irreversible mistakes with a guided flow and clear confirmation.
- Provide resilience with a PENDING state when dependencies are unavailable.

## UX principles
- Wizard flow; no skipping required steps.
- Show decoded Make/Model/Year prior to commit.
- Disable progression unless eligibility passes.
- Irreversible action clearly communicated and confirmed via checkbox.
- Accessible: keyboard navigation, ARIA labels, readable error messages.

## Routes
- `/` Landing
- `/authenticate`
- `/verify-otp` (conditional)
- `/vin-entry`
- `/review`
- `/result/:requestId`

## Shared UI components
- **Header**: logo + support link
- **Progress indicator**: step tracker (Authenticate → VIN → Review → Result)
- **Inline alerts**: success/warn/error banners
- **Field validation hints**: consistent patterns for required/format errors
- **Loading states**: spinners with “what is happening” messages

## Page specs

### Landing (`/`)
**Content**
- Title: Add an Additional Vehicle to Your Contract
- Key points:
  - One additional VIN ever
  - Once validated and committed, cannot be changed
  - Support link
- CTA: Start

### Authenticate (`/authenticate`)
**Fields**
- Contract Number (required)
- Last Name (required)
- ZIP Code (required; 5-digit or 5+4 pattern)

**Client validation**
- required fields
- ZIP regex
- trim whitespace, uppercase last name

**Submit behavior**
- POST `/contract/authenticate`
- Outcomes:
  - Success: store sessionToken → route `/vin-entry`
  - OTP required: route `/verify-otp`
  - No match: show error message
  - Rate limited: show cooldown message

**Error messages**
- NO_MATCH: “We couldn’t find an exact match. Please verify your details.”
- RATE_LIMITED: “Too many attempts. Please wait and try again.”

### OTP Verify (`/verify-otp`)
**UI**
- Display masked destination
- 6-digit code input
- Buttons: Verify, Resend (disabled for 30–60 seconds)

**Behavior**
- POST `/otp/send` on load (or via resend)
- POST `/otp/verify` on submit
- Lockout messaging if too many attempts

### VIN Entry (`/vin-entry`)
**Fields**
- VIN (required; 17 characters)

**Behavior**
- Normalize VIN to uppercase, remove spaces
- On blur or after 17 chars:
  - POST `/vin/decode`
  - Display decoded Year/Make/Model
  - POST `/vin/eligibility`
  - Display eligibility result

**Eligibility handling**
- Eligible: show success banner; enable Continue
- Ineligible: show error banner; disable Continue; allow user to enter another VIN (until contract committed)

### Review (`/review`)
**Summary card**
- Contract summary (masked)
- New VIN + decoded Y/M/M
- Eligibility “Eligible”

**Irreversible confirmation**
- Checkbox required: “I understand this change is one-time and cannot be reversed.”
- Confirm button disabled until checked

**Submit**
- POST `/vin/commit` with stable `X-Idempotency-Key`
- Route to `/result/:requestId`

### Result (`/result/:requestId`)
**Statuses**
- COMMITTED_LOCKED: success message + timestamp + VIN + decoded Y/M/M
- PENDING: processing message + requestId; auto-poll GET `/vin/request/:requestId`
- FAILED_INELIGIBLE: show reason; allow restart if not locked
- FAILED_DEPENDENCY: show support message + requestId

**Polling strategy**
- Poll every 10–15 seconds for 2–3 minutes
- Then slow to 30–60 seconds or require manual refresh

## Accessibility requirements
- All inputs have labels and ARIA descriptions
- Error banners announced via aria-live
- Keyboard focus management on page transitions and errors
- Color contrast compliant

## Internationalization (optional)
- Keep labels/strings in a single file to support future translations
