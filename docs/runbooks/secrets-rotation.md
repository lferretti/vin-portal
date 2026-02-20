# Secrets Rotation Runbook

## Overview

All secrets are stored in **AWS Secrets Manager** (or Parameter Store) and injected into ECS task definitions as environment variables. Rotation requires updating the secret value and restarting the backend service.

## General Rotation Procedure

1. Generate a new secret value (see per-secret instructions below)
2. Update the value in AWS Secrets Manager for the target environment
3. Force a new ECS deployment: `aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment`
4. Monitor the deployment for healthy task count
5. Verify the application is functioning (health check + smoke test)
6. Record the rotation in the team's change log

## Per-Secret Instructions

### JWT_SECRET

- **Purpose:** Signs consumer session JWTs
- **Impact of rotation:** All active consumer sessions are immediately invalidated. Users must re-authenticate.
- **Recommended schedule:** Every 90 days or after a suspected compromise
- **Generate:** `openssl rand -base64 64`
- **Rotation steps:**
  1. Generate new value
  2. Update in AWS Secrets Manager for the target environment
  3. Deploy — all existing tokens become invalid
  4. No dual-key support; rotation is a hard cut

### JWT_ADMIN_SECRET

- **Purpose:** Signs admin portal JWTs
- **Impact of rotation:** All active admin sessions are invalidated. Admins must re-authenticate.
- **Recommended schedule:** Every 90 days or after a suspected compromise
- **Generate:** `openssl rand -base64 64`
- **Rotation steps:** Same as JWT_SECRET

### OTP_HASH_SALT

- **Purpose:** Salts OTP codes before hashing for storage
- **Impact of rotation:** Any in-flight OTPs (issued but not yet verified) become unverifiable. Users will need to request a new OTP.
- **Recommended schedule:** Every 180 days or after a suspected compromise
- **Generate:** `openssl rand -base64 32`
- **Rotation steps:**
  1. Choose a low-traffic window (minimizes users with pending OTPs)
  2. Update in AWS Secrets Manager
  3. Deploy — pending OTPs become invalid
  4. Monitor for increased OTP failure rates in Datadog

### CONTRACT_HASH_SALT

- **Purpose:** Salts contract identifiers before hashing for rate-limit tracking
- **Impact of rotation:** Rate-limit counters keyed by contract hash are effectively reset. No user-facing impact beyond a brief window where rate limits restart from zero.
- **Recommended schedule:** Every 180 days or after a suspected compromise
- **Generate:** `openssl rand -base64 32`
- **Rotation steps:**
  1. Update in AWS Secrets Manager
  2. Deploy
  3. No user-facing impact

### DATABASE_PASSWORD

- **Purpose:** PostgreSQL connection credentials
- **Impact of rotation:** Backend loses DB connectivity until redeployed with new password
- **Recommended schedule:** Every 90 days
- **Rotation steps:**
  1. Update the password in RDS (via AWS Console or CLI)
  2. Update the corresponding secret in AWS Secrets Manager
  3. Force ECS redeployment immediately
  4. Verify health check passes and DB queries succeed

### Datadog Credentials

#### DD_API_KEY (Backend APM / Log Forwarding)

- **Purpose:** Authenticates the Datadog Agent (or direct log/metrics submission) from the backend ECS tasks
- **Where stored:** AWS Secrets Manager, injected as the `DD_API_KEY` environment variable in the ECS task definition
- **Impact of rotation:** Metrics and logs stop flowing to Datadog until the new key is deployed. No user-facing impact.
- **Recommended schedule:** Every 180 days, or immediately after a suspected compromise
- **Rotation steps:**
  1. Generate a new API key in Datadog: Organization Settings > API Keys > New Key
  2. Copy the new key value (it is only shown once)
  3. Update `DD_API_KEY` in AWS Secrets Manager for the target environment
  4. Force a new ECS deployment to pick up the new key
  5. Verify logs and metrics appear in Datadog within 5 minutes
  6. Revoke the old API key in Datadog: Organization Settings > API Keys > delete the old key

#### Datadog RUM Client Token and Application ID (Frontend)

- **Purpose:** Initializes Datadog Real User Monitoring in the Angular SPA. The client token (`datadog.clientToken`) and application ID (`datadog.applicationId`) are compiled into the production build via `src/environments/environment.prod.ts`.
- **Where stored:** Build-time only. The values are embedded in `environment.prod.ts` and baked into the JavaScript bundle. They are **not** runtime secrets.
- **Impact of rotation:** The old client token stops accepting RUM data. Users on cached bundles (served by CloudFront) will silently fail to report RUM data until the cache is invalidated and they receive the new bundle.
- **Recommended schedule:** Only rotate if compromised (the client token is low-sensitivity -- it can only submit RUM data, not read it)
- **Rotation steps:**
  1. Generate a new client token in Datadog: UX Monitoring > Setup & Configuration > Client Tokens > New Client Token
  2. Optionally create a new RUM Application if the application ID also needs to change
  3. Update the placeholder values in `src/environments/environment.prod.ts` or your CI/CD pipeline's substitution variables:
     - `REPLACE_WITH_DATADOG_CLIENT_TOKEN` -> new client token
     - `REPLACE_WITH_DATADOG_APP_ID` -> new application ID (if changed)
  4. Rebuild and redeploy the frontend:
     ```bash
     npm run build
     aws s3 sync dist/vin-portal/browser/ s3://<bucket-name> --delete
     aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
     ```
  5. Verify RUM data is flowing in Datadog: UX Monitoring > Sessions > filter by `service:vin-portal`
  6. Revoke the old client token in Datadog

### SES / Email Service Credentials

- **Purpose:** Sends confirmation emails with PDF attachments via the `EmailAdapter` (backed by Amazon SES)
- **Authentication model:** The backend uses an **IAM role** attached to the ECS task definition to call SES. There is no standalone SES API key or SMTP password to rotate.
- **Impact of rotation:** If the IAM role credentials are rotated (i.e., the task execution role is changed), email sending fails until the new role is deployed.
- **Recommended schedule:** IAM role credentials are automatically rotated by AWS (temporary credentials via STS). No manual rotation is required under normal circumstances.
- **When manual action is needed:**
  - If someone has extracted the temporary credentials from a running ECS task and they may be compromised:
    1. Stop the affected ECS tasks immediately (they will be restarted with fresh credentials)
    2. If the IAM role itself is compromised, create a new role with the same SES permissions, update the ECS task definition, and force a new deployment
  - If SES SMTP credentials are used instead of IAM role (non-standard configuration):
    1. Generate new SMTP credentials in the AWS SES Console > SMTP Settings
    2. Update `SES_SMTP_USERNAME` and `SES_SMTP_PASSWORD` in AWS Secrets Manager
    3. Force a new ECS deployment
    4. Verify email delivery by triggering a test email (e.g., via the admin portal or a manual API call)
    5. Delete the old SMTP credentials in the SES Console

### PDF Confirmation Template

- **Purpose:** The confirmation PDF template (`backend/assets/templates/confirmation.pdf`) is an AcroForm PDF used by `DocumentService` to generate branded confirmation documents. When the template is absent, a plain-text fallback PDF is generated.
- **Where stored:** Baked into the backend Docker image at build time, located at `backend/assets/templates/confirmation.pdf`
- **Impact of update:** Changing the template affects the visual layout of all newly generated confirmation PDFs. Previously generated PDFs are not affected.
- **Update procedure:**
  1. Obtain the updated AcroForm PDF template from the design team
  2. Verify that the template contains the expected named form fields. The backend fills these fields via `field-mapper.ts`:
     - `requestReferenceId` -- the VIN add request ID
     - `confirmationDate` -- formatted date string
     - `maskedVin` -- the masked VIN
     - `yearMakeModel` -- decoded vehicle year/make/model
     - `contractReference` -- the contract reference identifier
  3. Replace the file at `backend/assets/templates/confirmation.pdf`
  4. Test locally:
     ```bash
     cd backend
     npm run start:dev
     # Trigger a PDF generation via the document endpoint
     curl -o test.pdf http://localhost:3000/api/v1/document/request/<test-request-id>/pdf
     # Open test.pdf and verify fields are populated correctly
     ```
  5. Commit the new template, build, and deploy via CI/CD
  6. After deployment, verify in production by downloading a confirmation PDF from the admin portal or triggering a test email

## Emergency Rotation (Suspected Compromise)

1. Rotate **all** secrets simultaneously
2. Force ECS redeployment across **all** environments (dev → qa → uat → prod)
3. Notify the security team and create an incident ticket
4. Review audit logs for unauthorized access during the exposure window
5. Consider rotating DATABASE_PASSWORD if the compromised secret could have been used to access the database

## Monitoring

- **Failed auth spike:** May indicate stale JWT_SECRET in one ECS task (rolling deploy)
- **OTP verification failures:** May indicate OTP_HASH_SALT rotation during active OTP window
- **Database connection errors:** DATABASE_PASSWORD mismatch between Secrets Manager and RDS
- **Datadog metrics gap:** If backend metrics or logs stop flowing after a deployment, check that `DD_API_KEY` in Secrets Manager matches the active key in Datadog Organization Settings
- **RUM data gap:** If frontend RUM sessions stop appearing, verify the client token in the deployed bundle matches the active token in Datadog. Check CloudFront cache -- users may still have an old bundle with the previous token.
- **Email delivery failures:** If `DocumentService.emailDocument()` returns `sent: false`, check CloudWatch logs for SES errors. Common causes: IAM role permissions changed, SES sending limits exceeded, or the SES sender address is no longer verified
