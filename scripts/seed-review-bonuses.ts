import { list } from "@vercel/blob";

import { db, pool } from "#/server/infra/db";
import { bonusDefinition } from "#/server/infra/db/schema";

type SeedBonusDefinition = {
	code: string;
	name: string;
	description: string;
	thumbnailPath: string;
	type: "welcome" | "deposit" | "promotional";
	amountMinor: number;
	matchPercentageBps?: number;
	wageringMultiplier: number;
	expiresAfterDays: number;
	minimumDepositMinor?: number;
	maximumAwardMinor?: number;
};

const bonusDefinitions: SeedBonusDefinition[] = [
	{
		code: "BEAR_HUG_WELCOME",
		name: "Bear Hug Welcome",
		description:
			"A warm welcome for new players: a $100 bonus with a light 1x wagering target.",
		thumbnailPath: "bonus-definitions/bear_hug.png",
		type: "welcome",
		amountMinor: 10_000,
		wageringMultiplier: 1,
		expiresAfterDays: 7,
	},
	{
		code: "HONEY_POT_RELOAD",
		name: "Honey Pot Reload",
		description:
			"A 25% match on an eligible demo top-up, up to $150, with seven days to play it through.",
		thumbnailPath: "bonus-definitions/honey_pot.png",
		type: "deposit",
		amountMinor: 15_000,
		matchPercentageBps: 2_500,
		wageringMultiplier: 3,
		expiresAfterDays: 7,
		minimumDepositMinor: 5_000,
		maximumAwardMinor: 15_000,
	},
	{
		code: "LUCKY_PAW_WEEKEND",
		name: "Lucky Paw Weekend",
		description:
			"A $75 promotional boost for a lucky weekend run across the casino.",
		thumbnailPath: "bonus-definitions/lucky_paw.png",
		type: "promotional",
		amountMinor: 7_500,
		wageringMultiplier: 2,
		expiresAfterDays: 3,
	},
];

const blobPrefix = "bonus-definitions/";

try {
	const blobUrls = await loadBlobUrls();
	const missingPaths = bonusDefinitions
		.map((definition) => definition.thumbnailPath)
		.filter((pathname) => !blobUrls.has(pathname));

	if (missingPaths.length > 0) {
		throw new Error(
			`Missing required bonus images in Vercel Blob: ${missingPaths.join(", ")}`,
		);
	}

	const updatedAt = new Date();
	await db.transaction(async (transaction) => {
		for (const definition of bonusDefinitions) {
			const thumbnailUrl = blobUrls.get(definition.thumbnailPath);
			if (!thumbnailUrl) {
				throw new Error(`Missing bonus image: ${definition.thumbnailPath}`);
			}

			await transaction
				.insert(bonusDefinition)
				.values({
					code: definition.code,
					name: definition.name,
					description: definition.description,
					thumbnailUrl,
					type: definition.type,
					amountMinor: definition.amountMinor,
					matchPercentageBps: definition.matchPercentageBps ?? null,
					wageringMultiplier: definition.wageringMultiplier,
					expiresAfterDays: definition.expiresAfterDays,
					minimumDepositMinor: definition.minimumDepositMinor ?? null,
					maximumAwardMinor: definition.maximumAwardMinor ?? null,
					eligibleGameIds: [],
					eligibleCategories: [],
					eligibleProviders: [],
					isActive: true,
					updatedAt,
				})
				.onConflictDoUpdate({
					target: bonusDefinition.code,
					set: {
						name: definition.name,
						description: definition.description,
						thumbnailUrl,
						type: definition.type,
						amountMinor: definition.amountMinor,
						matchPercentageBps: definition.matchPercentageBps ?? null,
						wageringMultiplier: definition.wageringMultiplier,
						expiresAfterDays: definition.expiresAfterDays,
						minimumDepositMinor: definition.minimumDepositMinor ?? null,
						maximumAwardMinor: definition.maximumAwardMinor ?? null,
						eligibleGameIds: [],
						eligibleCategories: [],
						eligibleProviders: [],
						isActive: true,
						updatedAt,
					},
				});
		}
	});

	console.log(
		`Seeded ${bonusDefinitions.length} active bonus definitions with Vercel Blob thumbnails.`,
	);
} finally {
	await pool.end();
}

async function loadBlobUrls() {
	if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
		throw new Error(
			"BLOB_READ_WRITE_TOKEN or VERCEL_OIDC_TOKEN is required to resolve bonus images",
		);
	}

	const result = new Map<string, string>();
	let cursor: string | undefined;

	do {
		const page = await list({
			prefix: blobPrefix,
			limit: 1000,
			...(cursor ? { cursor } : {}),
		});
		for (const blob of page.blobs) result.set(blob.pathname, blob.url);
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);

	return result;
}
