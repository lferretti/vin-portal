# VIN-Based Authentication Refactor

## Problem

The current auth flow collects a contract number, last name, and ZIP code. The correct flow should authenticate using the last 7 characters of the VIN, last name, and ZIP code.

## Decision

Replace contract-number-based authentication with VIN-based authentication. Combine the authenticate and VIN entry steps into a single "Vehicle Lookup" step. Reduce the wizard from 5 steps to 4.

## Wizard Flow

```
Landing → Vehicle Lookup → Review → Result
```

The "Authenticate" step is renamed to "Vehicle Lookup" and now collects the full VIN alongside last name and ZIP.

## Vehicle Lookup Page

- **Full VIN field** (17 characters, standard VIN validation including check digit)
- **Last name field** (uppercase, required)
- **ZIP code field** (5-digit or 5+4 format)
- On submit: extract last 7 chars from VIN, send `{vin7, lastName, zipCode}` to backend
- Store full VIN in consumer state so downstream pages (review, result) can reference it

## API Changes

- **Endpoint:** `POST /contract/authenticate` (unchanged)
- **Payload:** `{vin7, lastName, zipCode}` replaces `{contractNumber, lastName, zipCode}`
- Backend resolves the contract by VIN suffix instead of contract number

## Mock API Test Data

| vin7      | Last Name | ZIP   | Behavior               |
|-----------|-----------|-------|------------------------|
| `1234567` | SMITH     | 30301 | Direct auth (no OTP)   |
| `7654321` | JONES     | 10001 | OTP required           |
| Other     | --        | --    | AUTH_NO_MATCH error    |

## Removed

- `/vin-entry` route removed from consumer routes
- VIN entry component deleted
- `eligible.guard` removed or adjusted (VIN known at auth time)
- Progress stepper reduced from 5 to 4 steps

## Unchanged

- OTP flow (still triggered by AUTH_OTP_REQUIRED response)
- Session/JWT management
- Review and result pages
- Error handling codes (AUTH_NO_MATCH, AUTH_OTP_REQUIRED, CONTRACT_LOCKED, RATE_LIMITED)
- Guard-based route protection (authGuard still gates review/result)
