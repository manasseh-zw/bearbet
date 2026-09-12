CREATE TYPE "public"."bonus_award_status" AS ENUM('active', 'completed', 'exhausted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."bonus_definition_type" AS ENUM('welcome', 'deposit', 'promotional');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."ledger_entry_type" ADD VALUE 'bonus_forfeit' BEFORE 'admin_adjustment';--> statement-breakpoint
CREATE TABLE "bonus_award" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"player_id" text NOT NULL,
	"status" "bonus_award_status" DEFAULT 'active' NOT NULL,
	"awarded_amount_minor" bigint NOT NULL,
	"bonus_balance_minor" bigint NOT NULL,
	"required_wager_minor" bigint NOT NULL,
	"completed_wager_minor" bigint DEFAULT 0 NOT NULL,
	"eligible_game_ids" jsonb NOT NULL,
	"eligible_categories" jsonb NOT NULL,
	"eligible_providers" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"exhausted_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bonus_award_amounts_valid" CHECK ("bonus_award"."awarded_amount_minor" > 0 AND "bonus_award"."bonus_balance_minor" >= 0 AND "bonus_award"."required_wager_minor" > 0 AND "bonus_award"."completed_wager_minor" >= 0 AND "bonus_award"."completed_wager_minor" <= "bonus_award"."required_wager_minor")
);
--> statement-breakpoint
CREATE TABLE "bonus_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"type" "bonus_definition_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"wagering_multiplier" integer NOT NULL,
	"expires_after_days" integer NOT NULL,
	"minimum_deposit_minor" bigint,
	"maximum_award_minor" bigint,
	"eligible_game_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligible_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligible_providers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bonus_definition_amount_positive" CHECK ("bonus_definition"."amount_minor" > 0),
	CONSTRAINT "bonus_definition_multiplier_positive" CHECK ("bonus_definition"."wagering_multiplier" > 0),
	CONSTRAINT "bonus_definition_expiry_positive" CHECK ("bonus_definition"."expires_after_days" > 0),
	CONSTRAINT "bonus_definition_deposit_non_negative" CHECK ("bonus_definition"."minimum_deposit_minor" IS NULL OR "bonus_definition"."minimum_deposit_minor" >= 0),
	CONSTRAINT "bonus_definition_maximum_positive" CHECK ("bonus_definition"."maximum_award_minor" IS NULL OR "bonus_definition"."maximum_award_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_operation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"actor_user_id" text,
	"result_cash_balance_minor" bigint NOT NULL,
	"result_bonus_balance_minor" bigint NOT NULL,
	"result_reserved_cash_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_operation_result_balances_non_negative" CHECK ("wallet_operation"."result_cash_balance_minor" >= 0 AND "wallet_operation"."result_bonus_balance_minor" >= 0 AND "wallet_operation"."result_reserved_cash_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "withdrawal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"requested_amount_minor" bigint NOT NULL,
	"reserved_amount_minor" bigint NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"reviewer_user_id" text,
	"review_reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawal_amounts_positive_and_equal" CHECK ("withdrawal"."requested_amount_minor" > 0 AND "withdrawal"."reserved_amount_minor" = "withdrawal"."requested_amount_minor")
);
--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD COLUMN "operation_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD COLUMN "movement_index" integer;--> statement-breakpoint
ALTER TABLE "bonus_award" ADD CONSTRAINT "bonus_award_definition_id_bonus_definition_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."bonus_definition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_award" ADD CONSTRAINT "bonus_award_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_operation" ADD CONSTRAINT "wallet_operation_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_operation" ADD CONSTRAINT "wallet_operation_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal" ADD CONSTRAINT "withdrawal_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_award_idempotency_key_unique" ON "bonus_award" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_award_player_definition_unique" ON "bonus_award" USING btree ("player_id","definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_award_one_active_per_player" ON "bonus_award" USING btree ("player_id") WHERE "bonus_award"."status" = 'active';--> statement-breakpoint
CREATE INDEX "bonus_award_player_status_idx" ON "bonus_award" USING btree ("player_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_definition_code_unique" ON "bonus_definition" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_operation_idempotency_key_unique" ON "wallet_operation" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "wallet_operation_wallet_created_at_idx" ON "wallet_operation" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_idempotency_key_unique" ON "withdrawal" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "withdrawal_player_status_idx" ON "withdrawal" USING btree ("player_id","status");--> statement-breakpoint
CREATE INDEX "withdrawal_status_requested_at_idx" ON "withdrawal" USING btree ("status","requested_at");--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_operation_id_wallet_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."wallet_operation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_operation_movement_unique" ON "ledger_entry" USING btree ("operation_id","movement_index");