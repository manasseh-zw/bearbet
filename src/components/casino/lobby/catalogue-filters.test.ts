import assert from "node:assert/strict";
import { test } from "node:test";

import {
	catalogueViewConfig,
	getCatalogueCategories,
	normalizeCatalogueCategory,
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
	assert.equal(catalogueViewConfig.promotions.defaultCategory, "Evoplay");
	assert.deepEqual(catalogueViewConfig.promotions.includedCategories, [
		"Evoplay",
		"Booming",
		"Hacksaw",
		"Spinomenal",
	]);
});
