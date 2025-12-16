# Integrations (Placeholders in v1)

This project is intentionally **isolated**. It calls external systems through adapters, but persists its own records for later downstream consumption.

## Adapters (interfaces)
### 1) ContractVerificationAdapter
**Purpose:** Validate contract auth fields (exact match) and return a stable contract identity.

**Input**
- contractNumber
- lastName
- zip

**Output**
- externalContractId (authoritative contract identifier)
- contract summary (primary VIN masked, active flags if available)

**Failure modes**
- No match (401)
- Dependency unavailable (503/429 depending on upstream behavior)

### 2) VinDecodeAdapter
**Purpose:** Decode VIN to Year/Make/Model for UI preview.

**Input**
- vin (normalized uppercase)

**Output**
- year, make, model

**Failure modes**
- VIN invalid format/checksum (400)
- Decode service unavailable (503)

### 3) EligibilityAdapter
**Purpose:** Determine whether VIN is eligible for the contract based on business rules (same class or less).

**Input**
- externalContractId
- vin

**Output**
- allowed boolean
- reason code (e.g., OK, CLASS_TOO_HIGH, VIN_ALREADY_USED)
- raw payload (stored as JSON for support + analysis)

**Failure modes**
- Ineligible (409)
- Dependency unavailable (503)

### 4) AssociationAdapter (Future)
**Purpose:** Persist contract-to-added-VIN association into an authoritative external system, if/when required.

**Input**
- externalContractId
- vin
- requestId

**Output**
- associationReferenceId
- confirmed boolean

**Failure modes**
- dependency unavailable (503) -> keep request PENDING and retry

## Versioning approach
- Each adapter should be versioned internally to support contract-specific changes.
- Store upstream response version identifiers where possible in `eligibility_raw`.

## Operational notes
- Strict timeouts and circuit-breaker behavior recommended (see operations doc).
- All external calls must pass correlation IDs.
