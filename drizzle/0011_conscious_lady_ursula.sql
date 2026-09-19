CREATE TABLE "admin_audit_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"target_type" varchar(40) NOT NULL,
	"target_id" text NOT NULL,
	"action" varchar(80) NOT NULL,
	"reason" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_favorite_game" (
	"player_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_favorite_game_pk" PRIMARY KEY("player_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "player_recent_game" (
	"player_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"last_played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"play_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_recent_game_pk" PRIMARY KEY("player_id","game_id"),
	CONSTRAINT "player_recent_game_play_count_positive" CHECK ("player_recent_game"."play_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "is_popular" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "is_new" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_entry" ADD CONSTRAINT "admin_audit_entry_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_favorite_game" ADD CONSTRAINT "player_favorite_game_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_favorite_game" ADD CONSTRAINT "player_favorite_game_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_recent_game" ADD CONSTRAINT "player_recent_game_player_id_player_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_recent_game" ADD CONSTRAINT "player_recent_game_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_actor_created_at_idx" ON "admin_audit_entry" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_target_created_at_idx" ON "admin_audit_entry" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_action_created_at_idx" ON "admin_audit_entry" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "player_favorite_game_player_created_at_idx" ON "player_favorite_game" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "player_favorite_game_game_idx" ON "player_favorite_game" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "player_recent_game_player_last_played_idx" ON "player_recent_game" USING btree ("player_id","last_played_at");--> statement-breakpoint
CREATE INDEX "player_recent_game_game_idx" ON "player_recent_game" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "user_admin_status_idx" ON "user" USING btree ("banned","role","created_at");--> statement-breakpoint
CREATE INDEX "user_name_trgm_idx" ON "user" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_email_trgm_idx" ON "user" USING gin (lower("email") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_username_trgm_idx" ON "user" USING gin (lower(coalesce("username", '')) gin_trgm_ops);