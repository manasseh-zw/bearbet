import assert from "node:assert/strict";
import { test } from "node:test";

import {
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
