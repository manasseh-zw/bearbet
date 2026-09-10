CREATE TYPE "public"."ledger_entry_type" AS ENUM('welcome_credit', 'demo_top_up', 'bet', 'win', 'refund', 'withdrawal_reserve', 'withdrawal_release', 'withdrawal_debit', 'bonus_credit', 'bonus_conversion', 'admin_adjustment');--> statement-breakpoint
CREATE TYPE "public"."wallet_bucket" AS ENUM('cash', 'bonus', 'reserved_cash');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"username" text,
	"display_username" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"bucket" "wallet_bucket" NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"balance_before_minor" bigint NOT NULL,
	"balance_after_minor" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"actor_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entry_balance_equation" CHECK ("ledger_entry"."balance_after_minor" = "ledger_entry"."balance_before_minor" + "ledger_entry"."amount_minor")
);
--> statement-breakpoint
CREATE TABLE "player" (
	"user_id" text PRIMARY KEY NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"date_of_birth" date NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"cash_balance_minor" bigint DEFAULT 0 NOT NULL,
	"bonus_balance_minor" bigint DEFAULT 0 NOT NULL,
	"reserved_cash_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_cash_balance_non_negative" CHECK ("wallet"."cash_balance_minor" >= 0),
	CONSTRAINT "wallet_bonus_balance_non_negative" CHECK ("wallet"."bonus_balance_minor" >= 0),
	CONSTRAINT "wallet_reserved_cash_non_negative" CHECK ("wallet"."reserved_cash_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_idempotency_key_unique" ON "ledger_entry" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ledger_entry_wallet_created_at_idx" ON "ledger_entry" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_player_id_unique" ON "wallet" USING btree ("player_id");