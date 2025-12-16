# Project Overview

## Purpose
Provide a **public, consumer-facing portal** that allows a customer to:
1. Authenticate using warranty contract details (exact match)
2. Enter one additional VIN to associate to the contract
3. Validate VIN (format + decode Make/Model/Year)
4. Validate eligibility (VIN class must be same-or-less than the contract’s primary VIN)
5. Commit the VIN association **one time only** (irreversible)

## Business rules (v1)
- Contract is sold for a primary VIN.
- Customer may add **one** additional VIN **ever** to share the contract benefits between the two vehicles.
- Added VIN must be **same class or less** compared to the contract’s primary VIN.
- After the VIN is committed and validated, the customer **cannot change it**.

## Non-functional expectations (v1)
- Public portal (no SSO)
- Low expected traffic (hundreds/week)
- Target availability: **99% uptime**
- Low latency for typical path (auth → decode → eligibility → commit)
- Audit logging required; avoid storing unnecessary PII
- Data retention: assume **indefinite** until revisited

## Stakeholders
- Business/Product: defines contract eligibility rules and UX requirements
- Security: validates threat model, logging policy, and controls
- Engineering: builds Angular portal, API, datastore, and integrations
- Support/Operations: uses admin portal to assist customers and investigate issues

## Glossary
- **Contract Context**: record representing a contract that interacted with the portal.
- **VIN Add Request**: a single attempt to add a VIN; may be PENDING, COMMITTED, or FAILED.
- **Hybrid Commit**: commit returns success immediately when dependencies are healthy; otherwise returns PENDING and completes later.
- **OTP Step-up**: additional verification via SMS/email when risk signals are detected.
