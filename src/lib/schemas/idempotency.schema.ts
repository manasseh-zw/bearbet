import { z } from "zod";

export const idempotencyKeySchema = z
	.string()
	.trim()
	.min(1, "An idempotency key is required")
	.max(200, "Idempotency key is too long");
