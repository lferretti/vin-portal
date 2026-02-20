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
