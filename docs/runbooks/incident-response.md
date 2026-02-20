# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to incidents affecting the VIN Portal. The VIN Portal is an Angular 21 SPA (S3 + CloudFront) with a NestJS backend (ECS Fargate) and PostgreSQL RDS datastore.

**Related documentation:**
- [Operations & SLA](../operations-sla.md) -- availability and latency targets
- [Secrets Rotation](secrets-rotation.md) -- per-secret rotation procedures
- [Datadog Monitors](../infra/datadog-monitors.md) -- alerting definitions
- [Infrastructure Contract](../infra/APP_INFRA_CONTRACT.md) -- deployment, networking, health checks
- [Security & Compliance](../security.md) -- threat model and controls
- [Integrations](../integrations.md) -- upstream dependency adapters

**Severity levels:**
| Level | Definition | Response time |
|-------|-----------|---------------|
| P1 | Service down or data integrity at risk | Immediate (PagerDuty) |
| P2 | Degraded functionality, elevated errors | Within 1 hour (Slack) |
| P3 | Minor impact, workaround available | Next business day |

**General first steps for every incident:**
1. Acknowledge the alert in PagerDuty or Slack
2. Open an incident channel or thread
3. Assign an Incident Commander (IC)
4. Begin a timeline log (timestamps + actions taken)

---

## 1. Dependency Down (Upstream API Unavailable)

The VIN Portal depends on external adapters: Contract Verification API, Eligibility API, VIN Decode, and the future Association system. When any of these is unavailable, the portal degrades gracefully via the hybrid commit pattern -- requests are stored as `PENDING` and completed by the worker retry path.

### Detection

- **Datadog alert:** Backend 5xx Rate > 5% (P1 monitor)
- **Datadog alert:** API p95 Latency > 2s (P2 monitor)
- **Datadog alert:** Pending Request Backlog > 50 (P2 monitor)
- **Application symptoms:**
  - `/vin/decode` returns 503 with user-friendly error
  - `/vin/eligibility` returns 503 with user-friendly error
  - `/vin/commit` returns `PENDING` instead of `COMMITTED_LOCKED`
- **Log signals:** Repeated timeout or 5xx entries for `ContractVerificationAdapter`, `EligibilityAdapter`, or `VinDecodeAdapter` with correlation IDs

### Immediate Actions

1. **Confirm the dependency is down, not the backend itself:**
   ```bash
   # Check backend health
   curl -s https://<domain>/api/v1/health | jq .
   # Expected: { "status": "ok" } or { "status": "degraded", "checks": { "database": "ok" } }
   ```
2. **Check circuit breaker state** in Datadog logs:
   - Search: `service:vin-portal-api @message:*circuit*`
   - If circuit is open, the portal is already in graceful degradation mode
3. **Verify worker is running** and processing the PENDING backlog:
   - Datadog metric: `vin_portal.pending_requests.count`
   - Datadog logs: `service:vin-portal-api @message:*worker*retry*`
4. **Communicate to stakeholders:** Post in the incident channel that the dependency is down; consumers can still submit requests that will be fulfilled when the dependency recovers

### Investigation Steps

1. **Identify which dependency is down:**
   - Check Datadog APM traces for the specific adapter showing errors
   - Filter by `@adapter:ContractVerificationAdapter`, `@adapter:EligibilityAdapter`, or `@adapter:VinDecodeAdapter`
2. **Determine the scope:**
   - Is it a total outage or intermittent failures?
   - Are all endpoints affected or only specific operations?
3. **Contact the upstream team:**
   - Provide correlation IDs from failed requests
   - Ask for an ETA on restoration
4. **Monitor the PENDING backlog:**
   - Track `vin_portal.pending_requests.count` and oldest pending request age
   - Per SLA: alert if oldest pending > threshold (see [operations-sla.md](../operations-sla.md))

### Resolution

1. **When the dependency recovers:**
   - Verify the circuit breaker closes automatically (check logs for `circuit closed`)
   - Confirm the worker is draining the PENDING backlog
   - Monitor commit success rate returning to normal
2. **If PENDING requests exceed retry limits (5 attempts):**
   - Worker marks them as `FAILED_DEPENDENCY` and triggers Datadog Worker Final Failure alert
   - Review failed requests in the admin dashboard (`/admin`)
   - Determine if manual re-processing is needed
3. **Verify consumer-facing flow** is fully functional end-to-end

### Post-Incident

- Record total duration of dependency outage
- Count of requests that went to PENDING vs. FAILED_DEPENDENCY
- Review whether timeout/retry configuration needs adjustment (current: exponential backoff 1m, 5m, 15m, 1h, 6h cap; 5 attempts max)
- Update upstream dependency SLA documentation if patterns emerge
- File a post-incident review (PIR) if P1

---

## 2. Abuse Spike (Brute Force / Bot Automation)

The portal is publicly accessible and handles contract authentication. Attackers may attempt brute force authentication, contract enumeration, or automated bot submissions.

### Detection

- **Datadog alert:** Sudden spike in auth failures (see [operations-sla.md](../operations-sla.md) alerting section)
- **Datadog alert:** OTP required rate spike (indicates repeated failed auth triggering step-up)
- **WAF metrics:** Elevated blocked request count or rate-limit 429 responses
- **Application symptoms:**
  - Spike in `POST /contract/authenticate` failures from diverse or concentrated IPs
  - Auth failure rate by reason shows `AUTH_NO_MATCH` surge
  - Rate-limit 429 responses increasing
- **Log signals:** High volume of auth attempts with sequential or patterned contract numbers

### Immediate Actions

1. **Assess the scale and source:**
   ```bash
   # Check recent auth failure rate in Datadog (via UI or API)
   # Filter: service:vin-portal-api @path:/contract/authenticate @status:4*
   ```
2. **Tighten rate limits immediately** (if not already auto-triggered):
   - IP rate limit: reduce from 20/min to 5/min
   - Contract hash rate limit: reduce from 5 attempts/10min to 2 attempts/10min
   - Apply via WAF rule update or backend environment variable change + ECS redeploy
3. **Enable CAPTCHA if abuse exceeds threshold** (>100 failed auth attempts/hour from unique IPs):
   - Set `captchaEnabled: true` in `environment.prod.ts`
   - Deploy the frontend: `aws s3 sync dist/vin-portal/browser/ s3://vin-portal-prod --delete` then invalidate CloudFront
   - See [security.md](../security.md) CAPTCHA escalation plan for details
4. **Block known-bad IPs via WAF:**
   ```bash
   # Add IP to WAF block list (AWS WAF Console or CLI)
   aws wafv2 update-ip-set --name vin-portal-blocklist --scope CLOUDFRONT \
     --id <ip-set-id> --addresses "<attacker-ip>/32" --lock-token <token>
   ```

### Investigation Steps

1. **Identify attack pattern:**
   - Single IP vs. distributed (botnet)
   - Sequential contract numbers (enumeration) vs. targeted (credential stuffing)
   - User-agent analysis: automated tools often have distinctive signatures
2. **Check for successful breaches:**
   - Were any auth attempts successful during the spike?
   - Review audit events for any contract contexts created during the attack window
   - Check if any OTP challenges were issued and verified
3. **Review WAF logs:**
   - CloudFront + WAF request logs in S3 or Datadog
   - Identify geographic patterns or ASN concentrations
4. **Assess data exposure:**
   - The portal returns minimal data on auth failure (generic error, no contract details)
   - Confirm no information leakage in error responses

### Resolution

1. **Keep tightened rate limits** until attack subsides (monitor for 24-48 hours)
2. **Gradually relax controls:**
   - First: remove IP blocks for IPs that have stopped (after 48h)
   - Then: restore rate limits to normal thresholds
   - Last: disable CAPTCHA if abuse metrics return to baseline (re-evaluate monthly per security.md)
3. **Update WAF rules** with any new patterns identified (user-agent blocks, geo-restrictions)
4. **Verify legitimate user access** is not impacted by tightened controls

### Post-Incident

- Document attack vectors and patterns observed
- Review whether permanent WAF rules should be added
- Evaluate if OTP step-up triggers need adjustment (see [security.md](../security.md) OTP trigger criteria)
- Consider adding Datadog anomaly detection monitors for auth failure patterns
- Assess whether CAPTCHA should be permanently enabled
- File a PIR; share findings with the security team

---

## 3. Data Leak Concern

A suspected or confirmed exposure of sensitive data: secrets, PII (contract numbers, names, ZIP codes), or session tokens.

### Detection

- **External report:** Security researcher, customer complaint, or partner notification
- **Internal discovery:** Secrets found in logs, source code, or public repositories
- **Datadog alert:** Unexpected access patterns to admin endpoints or database
- **Automated scanning:** Checkmarx SAST/SCA findings, GitHub secret scanning alerts

### Immediate Actions

1. **Classify the data involved:**
   - Secrets (JWT keys, DB password, salts) -- go to step 2a
   - PII (contract numbers, names, ZIPs) -- go to step 2b
   - Session tokens -- go to step 2c

2a. **Secret exposure:**
   - **Rotate ALL secrets immediately** following [secrets-rotation.md](secrets-rotation.md) Emergency Rotation procedure:
     ```bash
     # Generate new secrets
     openssl rand -base64 64  # JWT_SECRET, JWT_ADMIN_SECRET
     openssl rand -base64 32  # OTP_HASH_SALT, CONTRACT_HASH_SALT
     ```
   - Update values in AWS Secrets Manager for ALL environments (dev, qa, uat, prod)
   - Force ECS redeployment across all environments:
     ```bash
     aws ecs update-service --cluster vin-portal-prod --service vin-portal-api \
       --force-new-deployment
     ```
   - If DATABASE_PASSWORD may be compromised, rotate it in RDS first, then update Secrets Manager, then redeploy (see [secrets-rotation.md](secrets-rotation.md) DATABASE_PASSWORD section)

2b. **PII exposure:**
   - Identify the source of the leak (logs, error responses, analytics, database export)
   - If in logs: disable verbose logging immediately, purge affected log entries
   - If in an external system: contact the system owner to remove the data
   - Determine the scope: how many records, which customers

2c. **Session token exposure:**
   - Rotate JWT_SECRET to invalidate all active sessions (see [secrets-rotation.md](secrets-rotation.md))
   - All consumers and admins will need to re-authenticate

3. **Notify the security team** immediately regardless of classification
4. **Preserve evidence:** Do not delete logs or audit trails needed for investigation

### Investigation Steps

1. **Determine the exposure window:**
   - When did the leak start? When was it discovered?
   - Use Datadog logs and audit events to establish a timeline
2. **Audit access logs:**
   ```bash
   # Search for unauthorized access patterns in Datadog
   # Filter: service:vin-portal-api @http.status_code:200 @path:/admin/*
   # Look for access from unexpected IPs or at unusual times
   ```
3. **Review what data was accessible:**
   - The portal masks PII in logs per [security.md](../security.md) logging policy
   - Check if any forbidden fields (raw contract number, raw last name, raw ZIP, plaintext OTP) were logged
4. **Check for downstream impact:**
   - Were compromised credentials used to access the database directly?
   - Were API tokens used to make unauthorized requests?
5. **Review recent code changes** for accidental secret commits or logging changes:
   ```bash
   git log --oneline --since="2 weeks ago" -- src/app/core/ backend/
   ```

### Resolution

1. **Confirm all secrets have been rotated** and new deployments are healthy
2. **Verify the leak source is sealed:**
   - If in code: remove and force-push (or rewrite history), update `.gitignore`
   - If in logs: update log sanitization rules, purge affected entries
   - If in a third-party system: confirm removal with the vendor
3. **Validate controls are restored:**
   - Health checks passing on all environments
   - Auth flow working end-to-end
   - Admin dashboard accessible with new credentials

### Post-Incident

- File an incident report with the security team
- Determine if customer notification is required (consult legal/compliance)
- Review and strengthen PII sanitization in logging pipeline
- Add Checkmarx rules or pre-commit hooks to catch the specific leak pattern
- Update [security.md](../security.md) with any new controls
- Schedule a blameless PIR within 5 business days

---

## 4. Deployment Failure

A failed deployment of either the frontend (S3 + CloudFront) or the backend (ECS Fargate).

### Detection

- **GitHub Actions:** CI/CD pipeline failure notification
- **Datadog alert:** Frontend Error Rate > 1% (P1 monitor) immediately after deploy
- **Datadog alert:** Backend 5xx Rate > 5% (P1 monitor) immediately after deploy
- **Manual observation:** Blank page, broken assets, API errors after deployment
- **Rollback trigger (per infra contract):** 5xx error rate > 5% for 5 minutes OR Datadog RUM error rate > 10% post-deploy

### Immediate Actions -- Frontend (S3 + CloudFront)

1. **Verify the failure:**
   ```bash
   # Check if index.html returns 200
   curl -s -o /dev/null -w "%{http_code}" https://<domain>/
   # Check for JavaScript errors by loading the page in a browser
   ```
2. **Rollback to the previous S3 version:**
   ```bash
   # Option A: Re-deploy the last known good build artifact
   # Download from CI artifact storage or S3 versioning
   aws s3 sync s3://vin-portal-prod-backup/ s3://vin-portal-prod --delete

   # Option B: If S3 versioning is enabled, restore previous object versions
   # Use the AWS Console S3 versioning UI or a script to restore

   # Option C: Re-run the last successful CI pipeline on the previous commit
   git log --oneline -5  # Find the last good commit
   # Trigger a deployment from that commit via GitHub Actions
   ```
3. **Invalidate CloudFront cache** to serve the rolled-back content:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id <CF_DISTRIBUTION_ID> \
     --paths "/*"
   ```
4. **Verify rollback:**
   - `index.html` returns 200
   - App loads without console errors
   - Consumer flow is functional (manual smoke test)

### Immediate Actions -- Backend (ECS Fargate)

1. **Verify the failure:**
   ```bash
   # Check health endpoint
   curl -s https://<domain>/api/v1/health | jq .
   # Check ECS service status
   aws ecs describe-services --cluster vin-portal-prod --services vin-portal-api \
     --query 'services[0].{desired:desiredCount,running:runningCount,deployments:deployments[*].status}'
   ```
2. **Rollback to the previous ECS task definition:**
   ```bash
   # List recent task definitions
   aws ecs list-task-definitions --family vin-portal-api --sort DESC --max-items 5

   # Update service to use the previous task definition
   aws ecs update-service --cluster vin-portal-prod --service vin-portal-api \
     --task-definition vin-portal-api:<previous-revision-number>

   # Monitor the deployment
   aws ecs wait services-stable --cluster vin-portal-prod --services vin-portal-api
   ```
3. **If new tasks are crash-looping:**
   ```bash
   # Check stopped task reasons
   aws ecs describe-tasks --cluster vin-portal-prod \
     --tasks $(aws ecs list-tasks --cluster vin-portal-prod --service-name vin-portal-api \
       --desired-status STOPPED --query 'taskArns[0]' --output text) \
     --query 'tasks[0].{stopCode:stopCode,reason:stoppedReason,containers:containers[*].{name:name,exitCode:exitCode,reason:reason}}'

   # Check CloudWatch logs for the failing task
   # Log group: /ecs/vin-portal-api
   ```
4. **Verify rollback:**
   - Health endpoint returns `{ "status": "ok" }`
   - ECS service shows desired count = running count
   - API responds correctly to test requests

### Investigation Steps

1. **Identify the root cause:**
   - Review the CI/CD pipeline logs for the failed deployment
   - Check for build errors, test failures, or deployment script issues
   - Compare the failed deployment's environment variables with the working version
2. **For frontend failures:**
   - Check if `angular.json` budget limits were exceeded
   - Verify environment file replacements were applied correctly
   - Check for missing or mismatched asset hashes
3. **For backend failures:**
   - Check ECS task definition for correct image tag
   - Verify environment variables and secrets are present in the task definition
   - Check if a database migration failed (see Section 5)
   - Review application startup logs for dependency connection failures

### Resolution

1. **Confirm rollback is stable** (monitor for 15-30 minutes)
2. **Fix the root cause** on a branch
3. **Re-deploy through the normal CI/CD pipeline** once the fix is verified
4. **Post-deploy verification** per [APP_INFRA_CONTRACT.md](../infra/APP_INFRA_CONTRACT.md):
   - `index.html` returns 200
   - App loads without console errors
   - Critical consumer flow is functional

### Post-Incident

- Document what went wrong and why it was not caught in CI
- Review whether additional quality gates are needed (see stackpack quality gates)
- If the failure was a breaking environment variable change, update [APP_INFRA_CONTRACT.md](../infra/APP_INFRA_CONTRACT.md)
- Add a test case that would have caught this failure
- File a PIR if the incident caused user-facing impact

---

## 5. Database Issues

PostgreSQL RDS failures affecting the backend service: connection failures, migration failures, or performance degradation.

### Detection

- **Datadog alert:** DB Connection Pool > 90% (P2 monitor -- 18/20 connections for 5 minutes)
- **Datadog alert:** Backend 5xx Rate > 5% (P1 monitor -- if DB is the root cause)
- **Health endpoint:** Returns `{ "status": "degraded", "checks": { "database": "error" } }`
- **ECS health check failures:** Tasks marked unhealthy due to failed health checks (3 consecutive failures at 30s intervals)
- **Application symptoms:**
  - All API endpoints returning 503
  - Auth attempts failing with internal server errors
  - PENDING requests not being processed by the worker

### Immediate Actions -- Connection Failures

1. **Verify the database is reachable from ECS:**
   ```bash
   # Check health endpoint for DB status
   curl -s https://<domain>/api/v1/health | jq .
   # Expected degraded: { "status": "degraded", "checks": { "database": "error" } }
   ```
2. **Check RDS instance status:**
   ```bash
   aws rds describe-db-instances --db-instance-identifier vin-portal-prod \
     --query 'DBInstances[0].{status:DBInstanceStatus,endpoint:Endpoint,multiAZ:MultiAZ,storage:AllocatedStorage}'
   ```
3. **Check if the issue is a credentials mismatch** (common after secret rotation):
   - Was DATABASE_PASSWORD recently rotated?
   - Verify the secret in Secrets Manager matches the RDS password
   - If mismatched, update Secrets Manager and force ECS redeployment (see [secrets-rotation.md](secrets-rotation.md) DATABASE_PASSWORD section)
4. **Check security group and network connectivity:**
   - Verify the ECS tasks' security group allows outbound to the RDS security group on port 5432
   - Check VPC routing if the RDS is in a private subnet
5. **If RDS is in a failover state (Multi-AZ):**
   - Wait for automatic failover to complete (typically 1-2 minutes)
   - The application should reconnect automatically after the DNS endpoint resolves to the new primary

### Immediate Actions -- Migration Failures

1. **Do NOT retry the migration blindly.** Identify what failed first.
2. **Check the migration status:**
   ```bash
   # Connect to the database and check the TypeORM migrations table
   # (via a bastion host or ECS exec if enabled)
   SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;
   ```
3. **Review the failed migration SQL** in the backend source:
   ```bash
   ls -la backend/src/migrations/
   # Identify the migration that corresponds to the failed deployment
   ```
4. **If the migration partially applied:**
   - Assess whether the schema is in a consistent state
   - If safe, manually complete the remaining DDL statements
   - If not safe, restore from a point-in-time backup (see Resolution below)
5. **Roll back the backend deployment** to the previous ECS task definition (Section 4 backend rollback) to restore service while investigating

### Immediate Actions -- Performance Degradation

1. **Check connection pool saturation:**
   - Datadog metric: `postgresql.connections.active` vs `postgresql.connections.max`
   - Current pool config: max 20 connections, 30s idle timeout, 5s connection timeout
2. **Identify slow queries:**
   ```sql
   -- On the RDS instance (via bastion or ECS exec)
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
   AND state != 'idle'
   ORDER BY duration DESC;
   ```
3. **Check for table locks:**
   ```sql
   SELECT blocked_locks.pid AS blocked_pid,
          blocking_locks.pid AS blocking_pid,
          blocked_activity.query AS blocked_query,
          blocking_activity.query AS blocking_query
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
     AND blocking_locks.relation = blocked_locks.relation
     AND blocking_locks.pid != blocked_locks.pid
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.granted;
   ```
4. **If queries are stuck, terminate long-running queries:**
   ```sql
   -- Terminate a specific backend (use the PID from the slow query check)
   SELECT pg_terminate_backend(<pid>);
   ```
5. **If the connection pool is exhausted:**
   - Force an ECS redeployment to reset all connections:
     ```bash
     aws ecs update-service --cluster vin-portal-prod --service vin-portal-api \
       --force-new-deployment
     ```
   - Consider temporarily increasing `max` pool size if the RDS instance can handle it

### Investigation Steps

1. **Review RDS CloudWatch metrics:**
   - `CPUUtilization` -- sustained high CPU may indicate query issues
   - `FreeableMemory` -- low memory can cause swapping
   - `ReadIOPS` / `WriteIOPS` -- I/O bottlenecks
   - `DatabaseConnections` -- connection count trends
   - `FreeStorageSpace` -- storage exhaustion
2. **Review recent schema changes** that may have introduced missing indexes or inefficient queries
3. **Check if a maintenance window overlap** caused the issue (maintenance window: Sunday 03:00-04:00 UTC per infra contract)
4. **For connection failures, check AWS service health** for the RDS region

### Resolution

1. **Connection failures:**
   - Once connectivity is restored (credentials fixed, failover complete, or network issue resolved), verify the health endpoint returns `{ "status": "ok", "checks": { "database": "ok" } }`
   - Monitor for 15 minutes to ensure stability

2. **Migration failures:**
   - If schema is inconsistent and cannot be repaired manually, restore from a point-in-time backup:
     ```bash
     aws rds restore-db-instance-to-point-in-time \
       --source-db-instance-identifier vin-portal-prod \
       --target-db-instance-identifier vin-portal-prod-restore \
       --restore-time <timestamp-before-migration>
     ```
   - Swap the application to the restored instance (update endpoint in Secrets Manager, redeploy)
   - Fix the migration script and re-apply through the normal deployment pipeline

3. **Performance degradation:**
   - Add missing indexes identified during investigation
   - Optimize slow queries
   - If the RDS instance class is insufficient, resize:
     ```bash
     aws rds modify-db-instance --db-instance-identifier vin-portal-prod \
       --db-instance-class db.r6g.large --apply-immediately
     ```
     Note: This causes a brief outage (reboot). Schedule during low-traffic window if possible.

### Post-Incident

- Document the root cause (credentials mismatch, migration bug, missing index, instance sizing)
- Review backup and point-in-time recovery procedures; confirm retention period is adequate (currently 7 days, consider 30 days for production per [APP_INFRA_CONTRACT.md](../infra/APP_INFRA_CONTRACT.md))
- If a migration caused the issue, add a pre-deployment migration dry-run step to the CI/CD pipeline
- Review connection pool settings (max: 20, idle timeout: 30s, connection timeout: 5s) and adjust if needed
- If performance-related, add the problematic query pattern to a Datadog APM monitor
- File a PIR for any P1 database incident

---

## Appendix: Quick Reference

### Key AWS Resources

| Resource | Identifier pattern |
|----------|-------------------|
| S3 buckets | `s3://vin-portal-{env}` |
| CloudFront | See [APP_INFRA_CONTRACT.md](../infra/APP_INFRA_CONTRACT.md) per environment |
| ECS cluster | `vin-portal-{env}` |
| ECS service | `vin-portal-api` |
| RDS instance | `vin-portal-{env}` |
| Secrets Manager | Per-secret, per-environment (see [secrets-rotation.md](secrets-rotation.md)) |

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health` | Backend health check (DB status included) |
| `POST /api/v1/contract/authenticate` | Consumer authentication |
| `POST /api/v1/vin/decode` | VIN decode |
| `POST /api/v1/vin/eligibility` | Eligibility check |
| `POST /api/v1/vin/commit` | VIN commit (idempotent) |

### Datadog Quick Links

- **Service:** `vin-portal` (frontend RUM), `vin-portal-api` (backend APM)
- **Log search:** `service:vin-portal-api` in Datadog Logs
- **Dashboard:** VIN Portal Overview (see [datadog-monitors.md](../infra/datadog-monitors.md))
- **Monitors:** P1 alerts notify `@pagerduty-vin-portal`; P2 alerts notify `@slack-vin-portal-alerts`

### Escalation Contacts

| Role | Contact |
|------|---------|
| On-call engineer | PagerDuty rotation `vin-portal` |
| Team lead | <!-- Fill: team lead contact --> |
| Security team | <!-- Fill: security team contact --> |
| AWS support | <!-- Fill: AWS support case URL or contact --> |
| Upstream API team | <!-- Fill: upstream team contact --> |
