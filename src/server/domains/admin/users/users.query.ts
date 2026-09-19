import "@tanstack/react-start/server-only";

import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import type { AdminUserQuery } from "#/lib/schemas/admin-query.schema";
import { adminUserQuerySchema } from "#/lib/schemas/admin-query.schema";
import { playableBalance } from "#/server/domains/wallet/wallet.policy";
import { db } from "#/server/infra/db";
import { player, user, wallet } from "#/server/infra/db/schema";

export async function listAdminUsers(input: AdminUserQuery) {
	const query = adminUserQuerySchema.parse(input);
	const conditions = [];

	if (query.search) {
		const pattern = `%${query.search}%`;
		conditions.push(
			or(
				ilike(user.name, pattern),
				ilike(user.email, pattern),
				ilike(user.username, pattern),
			),
		);
	}
	if (query.status === "active") {
		conditions.push(eq(user.banned, false));
	}
	if (query.status === "suspended") {
		conditions.push(eq(user.banned, true));
	}
	if (query.role !== "all") {
		conditions.push(eq(user.role, query.role));
	}

	const where = conditions.length ? and(...conditions) : undefined;
	const totalResult = await db
		.select({ value: count() })
		.from(user)
		.where(where);
	const total = totalResult[0]?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
	const page = Math.min(query.page, totalPages);

	const orderColumn = {
		createdAt: user.createdAt,
		name: user.name,
		email: user.email,
	}[query.sort];
	const orderDirection = query.direction === "asc" ? asc : desc;
	const rows = await db
		.select({
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				username: user.username,
				role: user.role,
				banned: user.banned,
				createdAt: user.createdAt,
			},
			player: {
				firstName: player.firstName,
				lastName: player.lastName,
				dateOfBirth: player.dateOfBirth,
				countryCode: player.countryCode,
			},
			wallet: {
				id: wallet.id,
				currencyCode: wallet.currencyCode,
				cashBalanceMinor: wallet.cashBalanceMinor,
				bonusBalanceMinor: wallet.bonusBalanceMinor,
				reservedCashMinor: wallet.reservedCashMinor,
			},
		})
		.from(user)
		.leftJoin(player, eq(player.userId, user.id))
		.leftJoin(wallet, eq(wallet.playerId, user.id))
		.where(where)
		.orderBy(orderDirection(orderColumn), orderDirection(user.id))
		.limit(query.pageSize)
		.offset((page - 1) * query.pageSize);

	return {
		items: rows.map(
			({ user: identity, player: playerRecord, wallet: walletRecord }) => ({
				user: {
					id: identity.id,
					name: identity.name,
					email: identity.email,
					username: identity.username,
					role:
						identity.role === "admin" ? ("admin" as const) : ("user" as const),
					status: identity.banned
						? ("suspended" as const)
						: ("active" as const),
					createdAt: identity.createdAt,
				},
				player: playerRecord,
				wallet: walletRecord
					? {
							id: walletRecord.id,
							currencyCode: walletRecord.currencyCode,
							balances: {
								cashBalanceMinor: walletRecord.cashBalanceMinor,
								bonusBalanceMinor: walletRecord.bonusBalanceMinor,
								reservedCashMinor: walletRecord.reservedCashMinor,
							},
							playableBalanceMinor: playableBalance({
								cashBalanceMinor: walletRecord.cashBalanceMinor,
								bonusBalanceMinor: walletRecord.bonusBalanceMinor,
								reservedCashMinor: walletRecord.reservedCashMinor,
							}),
						}
					: null,
			}),
		),
		pagination: { page, pageSize: query.pageSize, total, totalPages },
	};
}
