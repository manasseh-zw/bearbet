import assert from "node:assert/strict";
import { test } from "node:test";

import {
	catalogueViewConfig,
	getCatalogueCategories,
	normalizeCatalogueCategory,
	orderCatalogueGames,
} from "./catalogue-filters";

test("catalogue categories reflect provider data and sort by availability", () => {
	assert.deepEqual(
		getCatalogueCategories([
			{ category: "Amusnet" },
			{ category: "Pragmatic" },
			{ category: "Pragmatic" },
			{ category: " " },
			{},
		]),
		[
			{ id: "category:Other", label: "Other", value: "Other", count: 2 },
			{
				id: "category:Pragmatic",
				label: "Pragmatic",
				value: "Pragmatic",
				count: 2,
			},
			{ id: "category:Amusnet", label: "Amusnet", value: "Amusnet", count: 1 },
		],
	);
});

test("blank provider categories use the Other bucket", () => {
	assert.equal(normalizeCatalogueCategory(), "Other");
	assert.equal(normalizeCatalogueCategory("  "), "Other");
	assert.equal(normalizeCatalogueCategory("Hacksaw"), "Hacksaw");
});

test("curated provider priority wins over category size", () => {
	assert.deepEqual(
		getCatalogueCategories(
			[
				{ category: "Pragmatic" },
				{ category: "Pragmatic" },
				{ category: "Pragmatic" },
				{ category: "Booming" },
				{ category: "Evoplay" },
			],
			{ priorityCategories: catalogueViewConfig.casino.priorityCategories },
		),
		[
			{ id: "category:Booming", label: "Booming", value: "Booming", count: 1 },
			{ id: "category:Evoplay", label: "Evoplay", value: "Evoplay", count: 1 },
			{
				id: "category:Pragmatic",
				label: "Pragmatic",
				value: "Pragmatic",
				count: 3,
			},
		],
	);
});

test("promotions use a separate default and curated provider set", () => {
	assert.equal(catalogueViewConfig.promotions.defaultCategory, "all");
	assert.equal(catalogueViewConfig.promotions.maxItems, 100);
	assert.deepEqual(catalogueViewConfig.promotions.includedCategories, [
		"Pragmatic",
		"Evoplay",
		"Booming",
		"Playtech",
		"Hacksaw",
		"Spinomenal",
		"Endorphina",
		"Amatic",
	]);
});

test("priority categories sort games within the All categories result", () => {
	const games = [
		{ id: "amusnet", category: "Amusnet" },
		{ id: "pragmatic", category: "Pragmatic" },
		{ id: "other", category: "Other" },
	];

	assert.deepEqual(orderCatalogueGames(games, ["Pragmatic", "Booming"]), [
		{ id: "pragmatic", category: "Pragmatic" },
		{ id: "amusnet", category: "Amusnet" },
		{ id: "other", category: "Other" },
	]);
});

test("casino uses different featured and default providers", () => {
	assert.equal(catalogueViewConfig.casino.featuredCategory, "Playtech");
	assert.equal(catalogueViewConfig.casino.defaultCategory, "all");
});
