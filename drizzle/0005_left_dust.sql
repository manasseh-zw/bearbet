ALTER TABLE "game" ADD COLUMN "is_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;