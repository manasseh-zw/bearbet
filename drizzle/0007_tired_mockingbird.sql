ALTER TABLE "bonus_definition" ADD COLUMN "match_percentage_bps" integer;--> statement-breakpoint
ALTER TABLE "bonus_definition" ADD CONSTRAINT "bonus_definition_match_percentage_valid" CHECK ("bonus_definition"."match_percentage_bps" IS NULL OR ("bonus_definition"."match_percentage_bps" > 0 AND "bonus_definition"."match_percentage_bps" <= 10000));--> statement-breakpoint
INSERT INTO "bonus_definition" (
	"id", "code", "name", "description", "type", "amount_minor",
	"match_percentage_bps", "wagering_multiplier", "expires_after_days",
	"minimum_deposit_minor", "maximum_award_minor", "eligible_game_ids",
	"eligible_categories", "eligible_providers", "is_active"
) VALUES
	('10000000-0000-4000-8000-000000000001', 'BEAR_HUG_WELCOME', 'Bear Hug Welcome Bonus', 'A welcome bonus available across the casino.', 'welcome', 10000, NULL, 1, 7, NULL, NULL, '[]', '[]', '[]', true),
	('10000000-0000-4000-8000-000000000002', 'HONEY_POT_RELOAD', 'Honey Pot Reload', 'A 20% match on your latest unused demo top-up, up to $100.', 'deposit', 10000, 2000, 2, 7, 10000, 10000, '[]', '["slots"]', '[]', true),
	('10000000-0000-4000-8000-000000000003', 'LUCKY_PAW_WEEKEND', 'Lucky Paw Weekend', 'A weekend bonus for a rotating selection of casino games.', 'promotional', 7500, NULL, 1, 3, NULL, NULL, '[]', '["slots"]', '[]', true)
ON CONFLICT ("code") DO NOTHING;
