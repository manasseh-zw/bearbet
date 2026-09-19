import assert from "node:assert/strict";
import test from "node:test";

import { isBlobUploadBody, isManagedPublicAssetUrl } from "./blob-storage";

test("blob storage accepts only managed public asset URLs", () => {
	assert.equal(
		isManagedPublicAssetUrl(
			"https://store.public.blob.vercel-storage.com/bonus.png",
		),
		true,
	);
	assert.equal(
		isManagedPublicAssetUrl("https://images.example.com/bonus.png"),
		false,
	);
	assert.equal(
		isManagedPublicAssetUrl(
			"http://store.public.blob.vercel-storage.com/bonus.png",
		),
		false,
	);
});

test("blob storage validates the SDK upload event shape", () => {
	assert.equal(
		isBlobUploadBody({
			type: "blob.generate-client-token",
			payload: {
				pathname: "bonus-definitions/WELCOME/image.png",
				multipart: false,
			},
		}),
		true,
	);
	assert.equal(
		isBlobUploadBody({
			type: "blob.generate-client-token",
			payload: { pathname: "bonus-definitions/WELCOME/image.png" },
		}),
		false,
	);
});
