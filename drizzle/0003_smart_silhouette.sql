CREATE TYPE "public"."game_round_status" AS ENUM('open', 'settled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."game_session_mode" AS ENUM('fun', 'real');--> statement-breakpoint
CREATE TYPE "public"."game_session_status" AS ENUM('active', 'closed', 'error');--> statement-breakpoint
CREATE TYPE "public"."provider_operation_status" AS ENUM('accepted', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."provider_operation_type" AS ENUM('bet', 'win', 'refund');--> statement-breakpoint
CREATE TABLE "game_round" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" text NOT NULL,
	"integration_provider" varchar(40) NOT NULL,
	"external_round_id" text NOT NULL,
	"game_id" text NOT NULL,
	"status" "game_round_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"integration_provider" varchar(40) NOT NULL,
	"external_session_id" text NOT NULL,
	"game_id" text NOT NULL,
	"mode" "game_session_mode" DEFAULT 'real' NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" "game_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "provider_operation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"player_id" text NOT NULL,
	"integration_provider" varchar(40) NOT NULL,
	"type" "provider_operation_type" NOT NULL,
	"external_transaction_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reported_bet_amount_minor" bigint,
	"cash_amount_minor" bigint DEFAULT 0 NOT NULL,
	"bonus_amount_minor" bigint DEFAULT 0 NOT NULL,
	"wagering_contribution_minor" bigint DEFAULT 0 NOT NULL,
	"refunded_cash_minor" bigint DEFAULT 0 NOT NULL,
	"refunded_bonus_minor" bigint DEFAULT 0 NOT NULL,
	"bonus_award_id" uuid,
	"original_operation_id" uuid,
	"wallet_operation_id" uuid,
	"status" "provider_operation_status" DEFAULT 'accepted' NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_operation_amounts_valid" CHECK ("provider_operation"."amount_minor" >= 0 AND "provider_operation"."cash_amount_minor" >= 0 AND "provider_operation"."bonus_amount_minor" >= 0 AND "provider_operation"."cash_amount_minor" + "provider_operation"."bonus_amount_minor" = "provider_operation"."amount_minor" AND "provider_operation"."wagering_contribution_minor" >= 0 AND "provider_operation"."refunded_cash_minor" >= 0 AND "provider_operation"."refunded_bonus_minor" >= 0 AND "provider_operation"."refunded_cash_minor" <= "provider_operation"."cash_amount_minor" AND "provider_operation"."refunded_bonus_minor" <= "provider_operation"."bonus_amount_minor")
);
--> statement-breakpoint
ALTER TABLE "game_round" ADD CONSTRAINT "game_round_session_id_game_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_session"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_round" ADD CONSTRAINT "game_round_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_operation" ADD CONSTRAINT "provider_operation_round_id_game_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."game_round"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_operation" ADD CONSTRAINT "provider_operation_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_operation" ADD CONSTRAINT "provider_operation_bonus_award_id_bonus_award_id_fk" FOREIGN KEY ("bonus_award_id") REFERENCES "public"."bonus_award"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_operation" ADD CONSTRAINT "provider_operation_original_operation_id_provider_operation_id_fk" FOREIGN KEY ("original_operation_id") REFERENCES "public"."provider_operation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_operation" ADD CONSTRAINT "provider_operation_wallet_operation_id_wallet_operation_id_fk" FOREIGN KEY ("wallet_operation_id") REFERENCES "public"."wallet_operation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_round_session_external_game_unique" ON "game_round" USING btree ("session_id","external_round_id","game_id");--> statement-breakpoint
CREATE INDEX "game_round_player_created_at_idx" ON "game_round" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_provider_player_external_unique" ON "game_session" USING btree ("integration_provider","player_id","external_session_id");--> statement-breakpoint
CREATE INDEX "game_session_player_created_at_idx" ON "game_session" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_operation_idempotency_unique" ON "provider_operation" USING btree ("integration_provider","type","external_transaction_id");--> statement-breakpoint
CREATE INDEX "provider_operation_round_type_idx" ON "provider_operation" USING btree ("round_id","type");--> statement-breakpoint
CREATE INDEX "provider_operation_player_created_at_idx" ON "provider_operation" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "provider_operation_original_idx" ON "provider_operation" USING btree ("original_operation_id");