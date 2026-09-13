ALTER TABLE "wallet_operation" ADD COLUMN "public_reference" varchar(17);--> statement-breakpoint
UPDATE "wallet_operation"
SET "public_reference" = 'BB-' || upper(substr(md5("id"::text), 1, 4)) || '-' || upper(substr(md5("id"::text), 5, 4)) || '-' || upper(substr(md5("id"::text), 9, 4));--> statement-breakpoint
ALTER TABLE "wallet_operation" ALTER COLUMN "public_reference" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_operation_public_reference_unique" ON "wallet_operation" USING btree ("public_reference");
