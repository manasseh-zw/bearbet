"use client";

import { upload } from "@vercel/blob/client";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumSizeInBytes = 5 * 1024 * 1024;

export async function uploadBonusThumbnail({
	file,
	code,
	onUploadProgress,
}: {
	file: File;
	code: string;
	onUploadProgress?: (percentage: number) => void;
}) {
	if (!allowedContentTypes.has(file.type)) {
		throw new Error("Choose a JPEG, PNG, or WebP image.");
	}
	if (file.size > maximumSizeInBytes) {
		throw new Error("Images must be 5 MB or smaller.");
	}

	const safeCode = (code || `draft-${crypto.randomUUID()}`)
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.slice(0, 64);
	const safeFilename = file.name
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.slice(-120);

	return upload(`bonus-definitions/${safeCode}/${safeFilename}`, file, {
		access: "public",
		contentType: file.type,
		handleUploadUrl: "/api/admin/bonus-thumbnail",
		clientPayload: JSON.stringify({ code: code || null }),
		multipart: false,
		onUploadProgress: ({ percentage }) => onUploadProgress?.(percentage),
	});
}
