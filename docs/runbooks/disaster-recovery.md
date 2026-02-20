# Disaster Recovery Runbook -- VIN Portal

**Owner team:** Warranty Digital Products
**Last updated:** 2026-02-18

---

## 1. RPO / RTO Targets

| Component | RPO | RTO | Backup Mechanism |
|-----------|-----|-----|------------------|
| **Frontend (S3 + CloudFront)** | 0 (source in Git) | 1 hour | Re-deploy from CI pipeline |
| **Backend (ECS Fargate)** | 0 (images in ECR) | 2 hours | Force new deployment from existing ECR image |
| **Database (RDS PostgreSQL)** | 24 hours | 2 hours | Daily automated snapshots + point-in-time recovery |
| **Secrets (AWS Secrets Manager)** | 0 (recoverable) | 30 minutes | Re-create from backup or re-generate |

---

## 2. S3 + CloudFront Rebuild (Frontend)

**When:** S3 bucket is deleted, corrupted, or CloudFront distribution is misconfigured.

1. Identify the target environment branch (`main` for production).
2. Trigger the CI/CD pipeline to rebuild and deploy:
   ```bash
   # If CI/CD is available, trigger the deploy workflow.
   # If CI/CD is unavailable, build and deploy manually:
   npm ci
   npm run build
   aws s3 sync dist/vin-portal/browser/ s3://<bucket-name> --delete
   ```
3. Invalidate the CloudFront cache:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id <distribution-id> \
     --paths "/*"
   ```
4. Verify the invalidation completes:
   ```bash
   aws cloudfront get-invalidation \
     --distribution-id <distribution-id> \
     --id <invalidation-id>
   ```
5. Confirm the site loads correctly at the production URL.

---

## 3. ECS Fargate Redeploy (Backend)

**When:** ECS tasks are failing, task definition is corrupted, or the service needs to be rebuilt from a known-good state.

1. Identify the most recent healthy image in ECR:
   ```bash
   aws ecr describe-images \
     --repository-name vin-portal-api \
     --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags' \
     --output text
   ```
2. Force a new deployment using the current task definition (which references the ECR image):
   ```bash
   aws ecs update-service \
     --cluster <cluster-name> \
     --service <service-name> \
     --force-new-deployment
   ```
3. Monitor the deployment:
   ```bash
   aws ecs wait services-stable \
     --cluster <cluster-name> \
     --services <service-name>
   ```
4. If the current task definition is corrupted, register a new task definition pointing to the known-good ECR image, then update the service:
   ```bash
   aws ecs update-service \
     --cluster <cluster-name> \
     --service <service-name> \
     --task-definition <new-task-definition-arn>
   ```
5. Verify the health check endpoint responds:
   ```bash
   curl -f https://<api-domain>/api/v1/health
   ```

---

## 4. RDS Point-in-Time Recovery (Database)

**When:** Data corruption, accidental deletion, or database instance failure.

### Option A: Point-in-Time Recovery (preferred for data corruption)

1. Determine the target restore time (last known-good timestamp, within the 24-hour RPO window):
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier <db-instance-id> \
     --query 'DBInstances[0].LatestRestorableTime'
   ```
2. Restore to a new instance:
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier <db-instance-id> \
     --target-db-instance-identifier <db-instance-id>-restored \
     --restore-time <YYYY-MM-DDTHH:MM:SSZ> \
     --db-subnet-group-name <subnet-group> \
     --vpc-security-group-ids <security-group-id>
   ```
3. Wait for the restored instance to become available:
   ```bash
   aws rds wait db-instance-available \
     --db-instance-identifier <db-instance-id>-restored
   ```
4. Validate the restored data by connecting and running spot checks.
5. Update the backend configuration (Secrets Manager or environment) to point to the new DB endpoint.
6. Force a new ECS deployment to pick up the new endpoint (see section 3).
7. Once confirmed, delete or rename the original corrupted instance.

### Option B: Restore from Daily Snapshot (for full instance loss)

1. List available snapshots:
   ```bash
   aws rds describe-db-snapshots \
     --db-instance-identifier <db-instance-id> \
     --query 'sort_by(DBSnapshots,&SnapshotCreateTime)[-3:].[DBSnapshotIdentifier,SnapshotCreateTime]' \
     --output table
   ```
2. Restore from the most recent snapshot:
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier <db-instance-id>-restored \
     --db-snapshot-identifier <snapshot-id> \
     --db-subnet-group-name <subnet-group> \
     --vpc-security-group-ids <security-group-id>
   ```
3. Follow steps 3-7 from Option A above.

---

## 5. Secret Recovery

**When:** Secrets in AWS Secrets Manager are deleted or corrupted.

1. Check if the secret is in a pending-deletion state and can be restored:
   ```bash
   aws secretsmanager restore-secret --secret-id <secret-name>
   ```
2. If the secret is permanently deleted, re-create it:
   - **DATABASE_PASSWORD:** Reset the RDS password first, then store the new value in Secrets Manager.
   - **JWT_SECRET, JWT_ADMIN_SECRET, OTP_HASH_SALT, CONTRACT_HASH_SALT:** Re-generate per the instructions in [secrets-rotation.md](./secrets-rotation.md).
3. Force a new ECS deployment to pick up the restored secrets (see section 3).
4. Verify the application is functional (health check + smoke test).

**Note:** Regenerating JWT secrets will invalidate all active sessions. Regenerating OTP_HASH_SALT will invalidate in-flight OTPs. Plan accordingly and communicate the impact.

---

## 6. Full Stack Recovery Sequence

Use this sequence when the entire stack needs to be recovered (e.g., region-level failure, accidental infrastructure deletion).

| Step | Action | Est. Time | Owner |
|------|--------|-----------|-------|
| 1 | **Declare incident** per [on-call-escalation.md](./on-call-escalation.md). Post to `#vin-portal-incidents`. | 5 min | On-call |
| 2 | **Restore secrets** in AWS Secrets Manager (section 5). | 15-30 min | On-call + Security |
| 3 | **Restore database** via point-in-time recovery or snapshot (section 4). | 30-60 min | On-call + DBA |
| 4 | **Redeploy backend** on ECS Fargate, pointing to the restored DB (section 3). | 15-30 min | On-call |
| 5 | **Verify backend** health check and API responses. | 10 min | On-call |
| 6 | **Rebuild frontend** to S3 and invalidate CloudFront (section 2). | 15-30 min | On-call |
| 7 | **Run post-recovery verification** (section 7). | 15 min | On-call |
| 8 | **Post resolution** notification and schedule post-mortem. | 10 min | On-call + Manager |

**Total estimated time:** ~2 hours (within RTO targets)

---

## 7. Post-Recovery Verification Checklist

Run through each item and confirm before declaring recovery complete.

### Frontend

- [ ] Production URL loads without errors
- [ ] CloudFront is serving fresh content (check `x-cache` header)
- [ ] Landing page renders correctly
- [ ] Static assets (JS, CSS, images) load successfully

### Backend API

- [ ] Health check endpoint returns 200: `GET /api/v1/health`
- [ ] VIN lookup responds correctly for a known test VIN
- [ ] Authentication flow completes (contract lookup + OTP if applicable)
- [ ] API response times are within normal range (p95 < 2s)

### Database

- [ ] Backend can connect to the database (no connection errors in logs)
- [ ] Recent data is present (check a known contract record)
- [ ] Data integrity spot check: row counts on key tables are within expected range

### Secrets

- [ ] No `SECRET_NOT_FOUND` or authentication errors in backend logs
- [ ] JWT signing is functional (consumer and admin sessions work)
- [ ] OTP generation and verification work end-to-end

### Monitoring

- [ ] Datadog dashboards show healthy metrics
- [ ] No active alerts firing in PagerDuty
- [ ] CloudWatch logs are flowing for the backend service
- [ ] Error rates have returned to baseline

### Final Steps

- [ ] Post resolution notification in `#vin-portal-incidents`
- [ ] Update the incident ticket with root cause and recovery timeline
- [ ] Schedule a post-mortem within 48 hours for P1 incidents
