import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailStatusToVinAddRequest1708300000001 implements MigrationInterface {
  name = 'AddEmailStatusToVinAddRequest1708300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vin_add_request" ADD COLUMN IF NOT EXISTS "email_status" varchar(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vin_add_request" DROP COLUMN "email_status"`,
    );
  }
}
