CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "game_name_trgm_idx" ON "game" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "game_content_provider_trgm_idx" ON "game" USING gin (lower("content_provider") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "game_category_trgm_idx" ON "game" USING gin (lower(coalesce("category", '')) gin_trgm_ops);
