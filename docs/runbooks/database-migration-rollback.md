# Database Migration Rollback Runbook

**Owner team:** Warranty Digital Products
**Last updated:** 2026-02-20

---

## 1. When to Rollback a Migration

Rollback a migration when any of the following occur after a migration has been applied:

- **Bad deployment:** A migration was applied as part of a release that is being rolled back.
- **Data issues:** The migration introduced data corruption, unintended data transformations, or constraint violations on existing rows.
- **Schema problems:** The new schema breaks the running application (e.g., dropped column still referenced, incorrect column type, missing index causing query timeouts).
- **Performance degradation:** The migration caused lock contention, table scan regressions, or connection pool exhaustion in production.
- **Partial failure:** The migration partially applied (e.g., one statement succeeded but a later one failed), leaving the schema in an inconsistent state.

> **Important:** TypeORM reverts only the **last applied migration** per invocation. If multiple migrations need to be rolled back, run `migration:revert` once for each migration, in reverse order.

---

## 2. TypeORM CLI Rollback Command

From the `backend/` directory:

```bash
# Revert the most recently applied migration
npm run migration:revert
```

This runs:

```bash
typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts
```

The command reads the `migrations` table in PostgreSQL to determine which migration was last applied, then executes that migration's `down()` method.

### Environment variables required

The data source (`backend/src/database/data-source.ts`) reads these from the environment:

| Variable | Default (local) | Description |
|----------|-----------------|-------------|
| `DATABASE_HOST` | `localhost` | PostgreSQL hostname |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_NAME` | `vin_portal` | Database name |
| `DATABASE_USER` | `vin_portal` | Database user |
| `DATABASE_PASSWORD` | `localdev` | Database password |
| `NODE_ENV` | — | Set to `production` for SSL and connection pooling |

For non-local environments, retrieve credentials from AWS Secrets Manager. See [secrets-rotation.md](./secrets-rotation.md) for credential locations and rotation procedures.

---

## 3. Pre-Rollback Checklist

Complete every item before running the rollback in the target environment:

- [ ] **Identify the migration:** Confirm which migration needs to be reverted. Check the `migrations` table in PostgreSQL:
  ```sql
  SELECT * FROM migrations ORDER BY id DESC LIMIT 5;
  ```
- [ ] **Verify the `down()` method exists and is correct:** Open the migration file in `backend/src/database/migrations/` and confirm the `down()` method reverses all changes made by `up()`. See Section 6 if it is missing or broken.
- [ ] **Take a database backup:**
  - For RDS: Create a manual snapshot via AWS Console or CLI:
    ```bash
    aws rds create-db-snapshot \
      --db-instance-identifier vin-portal-<env> \
      --db-snapshot-identifier vin-portal-<env>-pre-rollback-$(date +%Y%m%d-%H%M%S)
    ```
  - Wait for the snapshot status to become `available` before proceeding.
- [ ] **Test in a lower environment first:** Always run the rollback in dev or QA before applying it to UAT or prod. Confirm the application works correctly after the revert.
- [ ] **Notify the team:** Post in `#vin-portal-dev` (routine) or `#vin-portal-incidents` (P1/P2) that a migration rollback is about to begin.
- [ ] **Confirm application compatibility:** Verify that the currently deployed backend code (or the version being rolled back to) is compatible with the schema that will exist after the revert.
- [ ] **Check for data dependencies:** If the migration added columns that have since been populated with data, understand that the rollback will drop that data. Decide if the data needs to be exported first.

---

## 4. Step-by-Step Rollback Procedure

### 4.1 Local / Dev

```bash
cd backend

# Set environment variables for the target database
export DATABASE_HOST=<dev-rds-endpoint>
export DATABASE_NAME=vin_portal
export DATABASE_USER=vin_portal
export DATABASE_PASSWORD=<from-secrets-manager>

# Revert the last migration
npm run migration:revert
```

### 4.2 QA / UAT

1. Obtain database credentials from AWS Secrets Manager for the target environment.
2. Ensure you have network access to the RDS instance (VPN or bastion host).
3. Create a manual RDS snapshot (see checklist above).
4. Run the rollback:
   ```bash
   cd backend

   export DATABASE_HOST=<qa-or-uat-rds-endpoint>
   export DATABASE_NAME=vin_portal
   export DATABASE_USER=vin_portal
   export DATABASE_PASSWORD=<from-secrets-manager>
   export NODE_ENV=production

   npm run migration:revert
   ```
5. Verify the rollback (see Section 5).
6. Force a new ECS deployment if the backend code also needs to be rolled back:
   ```bash
   aws ecs update-service \
     --cluster vin-portal-<env> \
     --service vin-portal-backend-<env> \
     --force-new-deployment
   ```

### 4.3 Production

> **Production rollbacks require approval from the escalation manager or engineering manager.**

1. Declare the situation in `#vin-portal-incidents` if this is part of an active incident.
2. Obtain production database credentials from AWS Secrets Manager.
3. Create a manual RDS snapshot and **wait for it to complete**.
4. Connect to the production VPC (VPN or bastion host).
5. Run the rollback:
   ```bash
   cd backend

   export DATABASE_HOST=<prod-rds-endpoint>
   export DATABASE_NAME=vin_portal
   export DATABASE_USER=vin_portal
   export DATABASE_PASSWORD=<from-secrets-manager>
   export NODE_ENV=production

   npm run migration:revert
   ```
6. Verify the rollback (see Section 5).
7. Roll back the backend ECS service to the previous task definition if needed:
   ```bash
   aws ecs update-service \
     --cluster vin-portal-prod \
     --service vin-portal-backend-prod \
     --task-definition vin-portal-backend-prod:<previous-revision> \
     --force-new-deployment
   ```
8. Monitor Datadog dashboards for error rates and latency for at least 15 minutes.
9. Post a resolution or status update in `#vin-portal-incidents`.

---

## 5. Verifying the Rollback

After running `migration:revert`, confirm the rollback was successful:

### 5.1 Check the migrations table

```sql
SELECT * FROM migrations ORDER BY id DESC LIMIT 5;
```

The reverted migration should no longer appear in this table.

### 5.2 Verify the schema

Confirm the schema matches the expected state. For example, if the migration added a table:

```sql
-- Confirm the table was dropped
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

If the migration added or altered columns:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = '<table_name>'
ORDER BY ordinal_position;
```

### 5.3 Verify application health

```bash
# Hit the health endpoint
curl -f https://<env-domain>/api/v1/health
```

Expected response:

```json
{ "status": "ok", "checks": { "database": "ok" } }
```

### 5.4 Run a smoke test

- For dev/QA: Run the Playwright smoke suite against the environment:
  ```bash
  npm run e2e:smoke
  ```
- For production: Manually walk through the critical consumer flow (authenticate, VIN entry, review, submit) to confirm end-to-end functionality.

---

## 6. Missing or Broken `down()` Method

If the migration's `down()` method is empty, missing, or incorrect:

### Option A: Write the `down()` method manually

1. Open the migration file in `backend/src/database/migrations/`.
2. Review the `up()` method and write the inverse operations in `down()`.
3. Common patterns:
   | `up()` action | `down()` action |
   |---------------|-----------------|
   | `CREATE TABLE "x"` | `DROP TABLE IF EXISTS "x" CASCADE` |
   | `ALTER TABLE ADD COLUMN` | `ALTER TABLE DROP COLUMN` |
   | `CREATE INDEX` | `DROP INDEX IF EXISTS` |
   | `CREATE TYPE` | `DROP TYPE IF EXISTS` |
   | `INSERT INTO` | `DELETE FROM ... WHERE` |
4. Test the `down()` method in a local or dev environment before applying it to higher environments.
5. Commit the fix and deploy it, then run `migration:revert`.

### Option B: Revert manually with raw SQL

If time is critical and writing a proper `down()` method is not feasible:

1. Connect to the database directly via `psql` or a SQL client.
2. Manually execute the SQL statements that reverse the migration.
3. Remove the migration's entry from the `migrations` table:
   ```sql
   DELETE FROM migrations WHERE name = '<MigrationClassName>';
   ```
4. **Document exactly what was done** in the incident ticket for auditability.

> **Warning:** Manual SQL changes bypass TypeORM's migration tracking. After the incident, ensure the migration history is reconciled so that future `migration:run` invocations work correctly.

---

## 7. Emergency Procedures: RDS Point-in-Time Recovery

Use point-in-time recovery (PITR) when:

- The `down()` method cannot reverse the damage (e.g., data was irreversibly transformed or deleted).
- Multiple migrations need to be reverted and the `down()` methods are unreliable.
- The database is in an unrecoverable inconsistent state.

### 7.1 Determine the target restore time

Identify the timestamp **before** the bad migration was applied. Check CloudWatch logs, ECS deployment events, or the `migrations` table's insertion timestamps to find the exact time.

### 7.2 Restore to a new RDS instance

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier vin-portal-<env> \
  --target-db-instance-identifier vin-portal-<env>-pitr-$(date +%Y%m%d-%H%M%S) \
  --restore-time <YYYY-MM-DDTHH:MM:SSZ> \
  --db-instance-class db.t3.medium \
  --vpc-security-group-ids <sg-id> \
  --db-subnet-group-name <subnet-group>
```

> **Note:** RDS PITR creates a **new** instance. It does not overwrite the existing one.

### 7.3 Validate the restored instance

1. Wait for the new instance status to become `available`.
2. Connect to the restored instance and verify:
   - The `migrations` table shows the expected migration history.
   - The schema is in the expected state.
   - Sample data queries return correct results.

### 7.4 Cut over to the restored instance

1. Update the `DATABASE_HOST` secret in AWS Secrets Manager to point to the new RDS endpoint.
2. Force a new ECS deployment:
   ```bash
   aws ecs update-service \
     --cluster vin-portal-<env> \
     --service vin-portal-backend-<env> \
     --force-new-deployment
   ```
3. Verify the health endpoint returns `200 OK` with `database: "ok"`.
4. Monitor for 15-30 minutes to confirm stability.

### 7.5 Cleanup

1. Keep the old RDS instance for at least 48 hours in case further investigation is needed. Set it to stopped to avoid costs.
2. After confirming the restored instance is stable, delete the old instance (or create a final snapshot first).
3. Update any DNS CNAME records if applicable.
4. Document the recovery in the incident post-mortem.

---

## 8. Migration Pattern Rollback Reference

This section documents the expected `down()` logic for each common migration pattern. Use it when writing or verifying `down()` methods, or when performing manual SQL rollbacks.

### 8.1 Add Column

**`up()` example:**

```sql
ALTER TABLE "vin_add_request" ADD COLUMN "email_status" varchar(16);
```

**`down()` logic:**

```sql
ALTER TABLE "vin_add_request" DROP COLUMN IF EXISTS "email_status";
```

**Data impact:** Any data stored in the column is permanently lost on rollback. If the column has been populated in production, export the data before reverting:

```sql
-- Export before rollback
COPY (SELECT id, email_status FROM vin_add_request WHERE email_status IS NOT NULL)
TO '/tmp/email_status_backup.csv' WITH CSV HEADER;
```

### 8.2 Add Table

**`up()` example:**

```sql
CREATE TABLE "new_table" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(128) NOT NULL,
  CONSTRAINT "PK_new_table" PRIMARY KEY ("id")
);
```

**`down()` logic:**

```sql
DROP TABLE IF EXISTS "new_table" CASCADE;
```

**Data impact:** All rows in the table are permanently lost. Foreign keys referencing this table (with `CASCADE`) will also be dropped. Verify dependent tables before running.

### 8.3 Alter Column (type change or constraint)

**`up()` example:**

```sql
ALTER TABLE "vin_add_request" ALTER COLUMN "retry_count" TYPE bigint;
```

**`down()` logic:**

```sql
ALTER TABLE "vin_add_request" ALTER COLUMN "retry_count" TYPE int;
```

**Data impact:** Type narrowing (e.g., `bigint` back to `int`) may fail if existing values exceed the target type's range. Check data ranges before reverting:

```sql
SELECT MAX(retry_count), MIN(retry_count) FROM vin_add_request;
```

### 8.4 Drop Column

**`up()` example:**

```sql
ALTER TABLE "contract_context" DROP COLUMN "deprecated_field";
```

**`down()` logic:**

```sql
ALTER TABLE "contract_context" ADD COLUMN "deprecated_field" varchar(128);
```

**Data impact:** The column is restored empty (all NULLs). The original data **cannot** be recovered from the `down()` method alone. If the data is needed, restore from a database backup or snapshot.

---

## 9. Specific Migration: `email_status` Column (Phase 3.4)

This section documents the rollback procedure for the `email_status` column added to `vin_add_request` as part of the email/document integration (Phase 3.4).

### 9.1 Migration overview

| Detail | Value |
|--------|-------|
| **Table** | `vin_add_request` |
| **Column** | `email_status` |
| **Type** | `varchar(16)`, nullable |
| **Valid values** | `sent`, `failed`, `bounced`, `NULL` (not yet emailed) |
| **Purpose** | Tracks whether the confirmation email was successfully delivered for a given VIN add request |
| **Backend code dependency** | `DocumentService.emailDocument()` writes this column on SES send success/failure; worker retries on `failed` status |

### 9.2 Pre-rollback considerations

- **Is the backend being rolled back too?** If rolling back to a backend version that predates the `email_status` column, the backend code will not reference this column and the rollback is safe.
- **Is the backend staying on the current version?** If the backend code still references `email_status`, dropping the column will cause runtime errors. Roll back the backend code first or deploy a version that does not depend on the column.
- **Data preservation:** If email tracking data is needed for auditing, export it before rolling back:

```sql
COPY (
  SELECT id, vin, status, email_status, updated_at
  FROM vin_add_request
  WHERE email_status IS NOT NULL
) TO '/tmp/email_status_export.csv' WITH CSV HEADER;
```

### 9.3 Rollback steps

1. Follow the standard pre-rollback checklist (Section 3).
2. Verify the `email_status` column exists:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'vin_add_request' AND column_name = 'email_status';
   ```
3. Run `npm run migration:revert` from the `backend/` directory (see Section 4 for per-environment instructions).
4. Verify the column has been removed:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'vin_add_request' AND column_name = 'email_status';
   -- Expected: 0 rows
   ```
5. If the backend code that references `email_status` is still deployed, roll back the ECS service to the previous task definition (see Section 4.3, step 7).
6. Verify application health (Section 5).

### 9.4 Manual rollback (if `down()` is unavailable)

```sql
ALTER TABLE "vin_add_request" DROP COLUMN IF EXISTS "email_status";
DELETE FROM migrations WHERE name LIKE '%EmailStatus%';
```

After manual rollback, verify TypeORM migration state:

```sql
SELECT * FROM migrations ORDER BY id DESC LIMIT 5;
```

---

## Related Runbooks

- [Secrets Rotation](./secrets-rotation.md) -- Database credential management and rotation procedures
- [On-Call Escalation](./on-call-escalation.md) -- Severity levels, escalation flows, and communication templates
