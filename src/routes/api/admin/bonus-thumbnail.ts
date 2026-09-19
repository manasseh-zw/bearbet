import "@tanstack/react-start/server-only";

import { createFileRoute } from "@tanstack/react-router";

import {
	AdminAuthorizationError,
	assertActiveAdminInTransaction,
} from "#/server/domains/admin/admin-auth.service";
import { getCurrentSession } from "#/server/infra/auth/session";
import {
	BlobStorageError,
	type BlobUploadBody,
	handleBonusThumbnailUpload,
	isBlobUploadBody,
} from "#/server/infra/blob/blob-storage";
import { db } from "#/server/infra/db";

export const Route = createFileRoute("/api/admin/bonus-thumbnail")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				let body: BlobUploadBody;
				try {
					const parsed: unknown = await request.json();
					if (!isBlobUploadBody(parsed)) {
						return json({ error: "INVALID_REQUEST" }, { status: 400 });
					}
					body = parsed;
				} catch {
					return json({ error: "INVALID_REQUEST" }, { status: 400 });
				}

				let actorUserId: string | null = null;
				if (body.type === "blob.generate-client-token") {
					try {
						const session = await getCurrentSession({
							disableCookieCache: true,
						});
						if (!session) {
							return json({ error: "UNAUTHORIZED" }, { status: 401 });
						}
						const actor = await db.transaction((transaction) =>
							assertActiveAdminInTransaction(transaction, session.user.id),
						);
						actorUserId = actor.id;
					} catch (error) {
						if (error instanceof AdminAuthorizationError) {
							return json({ error: "FORBIDDEN" }, { status: 403 });
						}
						return json({ error: "INTERNAL_ERROR" }, { status: 500 });
					}
				}

				try {
					const response = await handleBonusThumbnailUpload({
						request,
						body,
						actorUserId,
					});
					return json(response);
				} catch (error) {
					console.error("Bonus thumbnail upload handling failed", error);
					return json(
						{
							error:
								error instanceof BlobStorageError &&
								error.code === "NOT_CONFIGURED"
									? "BLOB_STORAGE_NOT_CONFIGURED"
									: "UPLOAD_FAILED",
						},
						{
							status:
								error instanceof BlobStorageError &&
								error.code === "NOT_CONFIGURED"
									? 503
									: 400,
						},
					);
				}
			},
		},
	},
});

function json(body: Record<string, unknown>, init?: ResponseInit) {
	return Response.json(body, {
		...init,
		headers: { "Cache-Control": "no-store", ...init?.headers },
	});
}
