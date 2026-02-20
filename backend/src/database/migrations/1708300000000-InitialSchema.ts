import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1708300000000 implements MigrationInterface {
  name = 'InitialSchema1708300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "vin_add_status_enum" AS ENUM (
        'NOT_USED', 'PENDING', 'COMMITTED_LOCKED',
        'FAILED_INELIGIBLE', 'FAILED_DEPENDENCY', 'FAILED_VALIDATION', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "otp_status_enum" AS ENUM (
        'PENDING', 'SENT', 'VERIFIED', 'EXPIRED', 'LOCKED_OUT'
      )
    `);

    // contract_context
    await queryRunner.query(`
      CREATE TABLE "contract_context" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "contract_number_hash" varchar(128) NOT NULL,
        "external_contract_id" varchar(128),
        "status" "vin_add_status_enum" NOT NULL DEFAULT 'NOT_USED',
        "committed_vin" varchar(17),
        "committed_vin_masked" varchar(20),
        "primary_vin_masked" varchar(128),
        "committed_vin_decoded" jsonb,
        "committed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_context" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contract_context_hash" UNIQUE ("contract_number_hash")
      )
    `);

    // vin_add_request
    await queryRunner.query(`
      CREATE TABLE "vin_add_request" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "contract_context_id" uuid NOT NULL,
        "vin" varchar(17) NOT NULL,
        "decoded" jsonb,
        "status" "vin_add_status_enum" NOT NULL DEFAULT 'PENDING',
        "idempotency_key" varchar(128) NOT NULL,
        "eligibility_allowed" boolean,
        "eligibility_reason_code" varchar(64),
        "eligibility_raw" jsonb,
        "retry_count" int NOT NULL DEFAULT 0,
        "next_retry_at" timestamptz,
        "last_dependency_error" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vin_add_request" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vin_add_request_idempotency" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_vin_add_request_contract" FOREIGN KEY ("contract_context_id")
          REFERENCES "contract_context"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_vin_add_request_status_retry" ON "vin_add_request" ("status", "next_retry_at")
    `);

    // otp_challenge
    await queryRunner.query(`
      CREATE TABLE "otp_challenge" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "contract_context_id" uuid NOT NULL,
        "code_hash" varchar(128) NOT NULL,
        "code_salt" varchar(64) NOT NULL,
        "masked_destination" varchar(20) NOT NULL,
        "channel" varchar(10) NOT NULL DEFAULT 'sms',
        "status" "otp_status_enum" NOT NULL DEFAULT 'PENDING',
        "attempt_count" int NOT NULL DEFAULT 0,
        "max_attempts" int NOT NULL DEFAULT 5,
        "expires_at" timestamptz NOT NULL,
        "locked_out_until" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_challenge" PRIMARY KEY ("id"),
        CONSTRAINT "FK_otp_challenge_contract" FOREIGN KEY ("contract_context_id")
          REFERENCES "contract_context"("id") ON DELETE CASCADE
      )
    `);

    // auth_attempt
    await queryRunner.query(`
      CREATE TABLE "auth_attempt" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "contract_number_hash" varchar(128) NOT NULL,
        "contract_context_id" uuid,
        "source_ip" inet NOT NULL,
        "user_agent" text,
        "success" boolean NOT NULL,
        "failure_reason" varchar(64),
        "correlation_id" varchar(36),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_attempt" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_attempt_contract" FOREIGN KEY ("contract_context_id")
          REFERENCES "contract_context"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_attempt_hash_created" ON "auth_attempt" ("contract_number_hash", "created_at")
    `);

    // audit_event
    await queryRunner.query(`
      CREATE TABLE "audit_event" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_type" varchar(64) NOT NULL,
        "actor_type" varchar(20) NOT NULL,
        "contract_context_id" uuid,
        "request_id" uuid,
        "correlation_id" varchar(36),
        "source_ip" inet,
        "user_agent" text,
        "event_data" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_event" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_event_contract" FOREIGN KEY ("contract_context_id")
          REFERENCES "contract_context"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_event_context_created" ON "audit_event" ("contract_context_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_event_request_created" ON "audit_event" ("request_id", "created_at")
    `);

    // admin_user
    await queryRunner.query(`
      CREATE TABLE "admin_user" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(128) NOT NULL,
        "display_name" varchar(128) NOT NULL,
        "role" varchar(64) NOT NULL DEFAULT 'support',
        "is_active" boolean NOT NULL DEFAULT true,
        "sso_subject" varchar(256),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_user" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_user_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_user" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_event" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_attempt" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_challenge" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vin_add_request" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contract_context" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "otp_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vin_add_status_enum"`);
  }
}
