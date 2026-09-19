import "@tanstack/react-start/server-only";

import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

import { env } from "#/server/env";

export type BlobUploadBody = HandleUploadBody;

const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
const maximumSizeInBytes = 5 * 1024 * 1024;

export class BlobStorageError extends Error {
	constructor(
		message: string,
		readonly code: "NOT_CONFIGURED" | "INVALID_UPLOAD",
	) {
		super(message);
		this.name = "BlobStorageError";
	}
}

export function isBlobUploadBody(value: unknown): value is HandleUploadBody {
	if (!value || typeof value !== "object") return false;
	const body = value as { type?: unknown; payload?: unknown };
	if (!body.payload || typeof body.payload !== "object") return false;
	if (body.type === "blob.generate-client-token") {
		const payload = body.payload as { pathname?: unknown; multipart?: unknown };
		return (
			typeof payload.pathname === "string" &&
			typeof payload.multipart === "boolean"
		);
	}
	if (body.type === "blob.upload-completed") {
		return "blob" in body.payload;
	}
	return false;
}

export function isManagedPublicAssetUrl(value: string) {
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			url.hostname.endsWith(".public.blob.vercel-storage.com")
		);
	} catch {
		return false;
	}
}

export async function handleBonusThumbnailUpload({
	request,
	body,
	actorUserId,
}: {
	request: Request;
	body: HandleUploadBody;
	actorUserId: string | null;
}) {
	if (!env.BLOB_READ_WRITE_TOKEN) {
		throw new BlobStorageError(
			"Blob storage is not configured",
			"NOT_CONFIGURED",
		);
	}

	return handleUpload({
		token: env.BLOB_READ_WRITE_TOKEN,
		request,
		body,
		onBeforeGenerateToken: async (pathname, clientPayload) => {
			if (!actorUserId || !isAllowedThumbnailPathname(pathname)) {
				throw new BlobStorageError(
					"Invalid bonus thumbnail upload",
					"INVALID_UPLOAD",
				);
			}
			return {
				allowedContentTypes,
				maximumSizeInBytes,
				addRandomSuffix: true,
				cacheControlMaxAge: 31_536_000,
				tokenPayload: JSON.stringify({ actorUserId, clientPayload }),
			};
		},
		onUploadCompleted: async ({ blob, tokenPayload }) => {
			console.info("Bonus thumbnail uploaded", {
				pathname: blob.pathname,
				contentType: blob.contentType,
				actorUserId: readActorUserId(tokenPayload),
			});
		},
	});
}

function isAllowedThumbnailPathname(pathname: string) {
	return (
		/^bonus-definitions\/[a-z0-9_-]{3,64}\/[a-z0-9._-]{1,120}$/i.test(
			pathname,
		) && !pathname.includes("..")
	);
}

function readActorUserId(tokenPayload: string | null | undefined) {
	if (!tokenPayload) return null;
	try {
		const value: unknown = JSON.parse(tokenPayload);
		return value && typeof value === "object" && "actorUserId" in value
			? String(value.actorUserId)
			: null;
	} catch {
		return null;
	}
}
