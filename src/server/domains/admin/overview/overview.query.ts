import "@tanstack/react-start/server-only";

import { sql } from "drizzle-orm";

import { env } from "#/server/env";
import { db } from "#/server/infra/db";

export type AdminOverview = {
	stats: {
		registeredPlayers: number;
		activePlayers: number;
		suspendedPlayers: number;
		enabledGames: number;
		totalGames: number;
		unavailableGames: number;
		pendingWithdrawals: number;
		pendingWithdrawalAmountMinor: number;
		activeBonusDefinitions: number;
		promotionalBonusDefinitions: number;
		activeBonusAwards: number;
	};
	operations: Array<{
		day: string;
		rounds: number;
		walletOperations: number;
	}>;
	recentActivity: Array<{
		id: string;
		kind: "wallet" | "gameplay" | "withdrawal" | "bonus";
		eventType: string;
		subject: string;
		amountMinor: number;
		currencyCode: string | null;
		status: string | null;
		context: string | null;
		createdAt: string;
	}>;
};

type AdminOverviewRow = {
	registeredPlayers: number;
	activePlayers: number;
	suspendedPlayers: number;
	enabledGames: number;
	totalGames: number;
	unavailableGames: number;
	pendingWithdrawals: number;
	pendingWithdrawalAmountMinor: number;
	activeBonusDefinitions: number;
	promotionalBonusDefinitions: number;
	activeBonusAwards: number;
	operations: Array<{
		day: string;
		rounds: number;
		walletOperations: number;
	}>;
	recentActivity: Array<{
		id: string;
		kind: AdminOverview["recentActivity"][number]["kind"];
		eventType: string;
		subject: string;
		amountMinor: number;
		currencyCode: string | null;
		status: string | null;
		context: string | null;
		createdAt: string;
	}>;
};

export async function getAdminOverview(): Promise<AdminOverview> {
	const result = await db.execute<AdminOverviewRow>(sql`
		WITH player_counts AS (
			SELECT
				count(*)::int AS "registeredPlayers",
				count(*) FILTER (WHERE coalesce(u.banned, false) = false)::int AS "activePlayers",
				count(*) FILTER (WHERE u.banned = true)::int AS "suspendedPlayers"
			FROM player p
			INNER JOIN "user" u ON u.id = p.user_id
		),
		catalogue_counts AS (
			SELECT
				count(*) FILTER (WHERE g.is_enabled = true)::int AS "enabledGames",
				count(*)::int AS "totalGames",
				count(*) FILTER (WHERE g.is_available = false)::int AS "unavailableGames"
			FROM game g
			WHERE g.provider_id = ${env.CASINO_PROVIDER}
		),
		withdrawal_counts AS (
			SELECT
				count(*) FILTER (WHERE w.status = 'pending')::int AS "pendingWithdrawals",
				coalesce(sum(w.requested_amount_minor) FILTER (WHERE w.status = 'pending'), 0)::int AS "pendingWithdrawalAmountMinor"
			FROM withdrawal w
		),
		bonus_definition_counts AS (
			SELECT
				count(*) FILTER (WHERE bd.is_active = true)::int AS "activeBonusDefinitions",
				count(*) FILTER (WHERE bd.is_active = true AND bd.type = 'promotional')::int AS "promotionalBonusDefinitions"
			FROM bonus_definition bd
		),
		bonus_award_counts AS (
			SELECT count(*) FILTER (WHERE ba.status = 'active')::int AS "activeBonusAwards"
			FROM bonus_award ba
		),
		operation_days AS (
			SELECT
				to_char(days.day::date, 'YYYY-MM-DD') AS day,
				coalesce(rounds.round_count, 0)::int AS rounds,
				coalesce(wallet_operations.operation_count, 0)::int AS "walletOperations"
			FROM generate_series(
				(current_date - interval '6 days')::date,
				current_date,
				interval '1 day'
			) AS days(day)
			LEFT JOIN (
				SELECT created_at::date AS day, count(*)::int AS round_count
				FROM game_round
				WHERE created_at >= current_date - interval '6 days'
				GROUP BY created_at::date
			) rounds ON rounds.day = days.day::date
			LEFT JOIN (
				SELECT created_at::date AS day, count(*)::int AS operation_count
				FROM wallet_operation
				WHERE created_at >= current_date - interval '6 days'
				GROUP BY created_at::date
			) wallet_operations ON wallet_operations.day = days.day::date
		),
		recent_events AS (
			SELECT
				events.id,
				events.kind,
				events."eventType",
				events.subject,
				events."amountMinor",
				events."currencyCode",
				events.status,
				events.context,
				events."createdAt"
			FROM (
				SELECT
					wo.id::text AS id,
					'wallet'::text AS kind,
					wo.type::text AS "eventType",
					u.name AS subject,
					coalesce(
						(
							SELECT le.amount_minor
							FROM ledger_entry le
							WHERE le.operation_id = wo.id
								AND le.bucket = 'cash'
								AND le.amount_minor <> 0
							ORDER BY le.movement_index
							LIMIT 1
						),
						(
							SELECT le.amount_minor
							FROM ledger_entry le
							WHERE le.operation_id = wo.id
								AND le.bucket = 'bonus'
								AND le.amount_minor <> 0
							ORDER BY le.movement_index
							LIMIT 1
						),
						(
							SELECT le.amount_minor
							FROM ledger_entry le
							WHERE le.operation_id = wo.id
								AND le.bucket = 'reserved_cash'
								AND le.amount_minor <> 0
							ORDER BY le.movement_index
							LIMIT 1
						),
						0
					)::int AS "amountMinor",
					w.currency_code AS "currencyCode",
					null::text AS status,
					null::text AS context,
					wo.created_at AS "createdAt"
				FROM wallet_operation wo
				INNER JOIN wallet w ON w.id = wo.wallet_id
				INNER JOIN "user" u ON u.id = w.player_id
				WHERE wo.source_type IS NULL
					OR wo.source_type NOT IN ('provider_operation', 'withdrawal', 'bonus_award')

				UNION ALL

				SELECT
					po.id::text AS id,
					'gameplay'::text AS kind,
					po.type::text AS "eventType",
					u.name AS subject,
					po.amount_minor::int AS "amountMinor",
					w.currency_code AS "currencyCode",
					po.status::text AS status,
					coalesce(g.name, gr.game_id) AS context,
					po.created_at AS "createdAt"
				FROM provider_operation po
				INNER JOIN game_round gr ON gr.id = po.round_id
				INNER JOIN "user" u ON u.id = po.player_id
				INNER JOIN wallet w ON w.player_id = po.player_id
				LEFT JOIN game g ON g.external_id = gr.game_id AND g.provider_id = po.integration_provider

				UNION ALL

				SELECT
					wd.id::text AS id,
					'withdrawal'::text AS kind,
					'withdrawal_requested'::text AS "eventType",
					u.name AS subject,
					wd.requested_amount_minor::int AS "amountMinor",
					wd.currency_code AS "currencyCode",
					wd.status::text AS status,
					null::text AS context,
					wd.requested_at AS "createdAt"
				FROM withdrawal wd
				INNER JOIN "user" u ON u.id = wd.player_id

				UNION ALL

				SELECT
					ba.id::text AS id,
					'bonus'::text AS kind,
					'bonus_awarded'::text AS "eventType",
					u.name AS subject,
					ba.awarded_amount_minor::int AS "amountMinor",
					w.currency_code AS "currencyCode",
					ba.status::text AS status,
					bd.name AS context,
					ba.activated_at AS "createdAt"
				FROM bonus_award ba
				INNER JOIN bonus_definition bd ON bd.id = ba.definition_id
				INNER JOIN "user" u ON u.id = ba.player_id
				INNER JOIN wallet w ON w.player_id = ba.player_id
			) events
			ORDER BY events."createdAt" DESC, events.id DESC
			LIMIT 6
		)
		SELECT
			pc."registeredPlayers",
			pc."activePlayers",
			pc."suspendedPlayers",
			cc."enabledGames",
			cc."totalGames",
			cc."unavailableGames",
			wc."pendingWithdrawals",
			wc."pendingWithdrawalAmountMinor",
			bdc."activeBonusDefinitions",
			bdc."promotionalBonusDefinitions",
			bac."activeBonusAwards",
			coalesce((SELECT json_agg(od ORDER BY od.day) FROM operation_days od), '[]'::json) AS operations,
			coalesce((SELECT json_agg(re ORDER BY re."createdAt" DESC, re.id DESC) FROM recent_events re), '[]'::json) AS "recentActivity"
		FROM player_counts pc
		CROSS JOIN catalogue_counts cc
		CROSS JOIN withdrawal_counts wc
		CROSS JOIN bonus_definition_counts bdc
		CROSS JOIN bonus_award_counts bac
	`);
	const row = result.rows[0];

	if (!row) throw new Error("The admin overview could not be loaded");

	return {
		stats: {
			registeredPlayers: Number(row.registeredPlayers),
			activePlayers: Number(row.activePlayers),
			suspendedPlayers: Number(row.suspendedPlayers),
			enabledGames: Number(row.enabledGames),
			totalGames: Number(row.totalGames),
			unavailableGames: Number(row.unavailableGames),
			pendingWithdrawals: Number(row.pendingWithdrawals),
			pendingWithdrawalAmountMinor: Number(row.pendingWithdrawalAmountMinor),
			activeBonusDefinitions: Number(row.activeBonusDefinitions),
			promotionalBonusDefinitions: Number(row.promotionalBonusDefinitions),
			activeBonusAwards: Number(row.activeBonusAwards),
		},
		operations: row.operations.map((day) => ({
			day: day.day,
			rounds: Number(day.rounds),
			walletOperations: Number(day.walletOperations),
		})),
		recentActivity: row.recentActivity.map((event) => ({
			...event,
			amountMinor: Number(event.amountMinor),
		})),
	};
}
