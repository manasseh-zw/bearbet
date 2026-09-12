CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar(40) NOT NULL,
	"external_id" text NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"content_provider" text NOT NULL,
	"type" text,
	"description" text,
	"rtp" real,
	"banner_url" text,
	"cover_url" text,
	"supports_fun" boolean NOT NULL,
	"is_available" boolean NOT NULL,
	"is_mobile" boolean NOT NULL,
	"has_free_spins" boolean NOT NULL,
	"has_lobby" boolean NOT NULL,
	"has_tables" boolean NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_rtp_non_negative" CHECK ("game"."rtp" IS NULL OR "game"."rtp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "game_provider" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_provider_id_game_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."game_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_provider_external_unique" ON "game" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "game_provider_available_idx" ON "game" USING btree ("provider_id","is_available");--> statement-breakpoint
CREATE INDEX "game_content_provider_idx" ON "game" USING btree ("content_provider");--> statement-breakpoint
CREATE INDEX "game_type_idx" ON "game" USING btree ("type");