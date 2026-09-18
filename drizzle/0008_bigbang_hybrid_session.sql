ALTER TYPE "ledger_entry_type" ADD VALUE IF NOT EXISTS 'provider_reconciliation';--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "launch_url" text;--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "provider_player_id" text;--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "provider_balance_before_minor" bigint;--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "provider_balance_after_minor" bigint;--> statement-breakpoint
ALTER TABLE "game_session" ADD COLUMN "provider_reconciled_at" timestamp with time zone;
