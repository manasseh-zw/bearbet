"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckCircle2Icon,
	Clock3Icon,
	LoaderCircleIcon,
	SearchIcon,
	WalletCardsIcon,
	XCircleIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
	AdminDataTable,
	type AdminTableColumn,
	AdminTableEmpty,
	AdminTableError,
	AdminTableLoading,
	AdminTableMobileList,
	AdminTablePagination,
	AdminTableToolbar,
} from "#/components/admin/data-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import {
	type AdminWithdrawalRow,
	adminOperationsQueries,
} from "#/lib/queries/admin-operations.queries";
import type {
	AdminWithdrawalQuery,
	AdminWithdrawalStatus,
} from "#/lib/schemas/admin-operations.schema";
import { emitToast } from "#/lib/toast-events";
import { reviewAdminWithdrawal } from "#/server/domains/withdrawal/withdrawal.functions";

type WithdrawalRow = AdminWithdrawalRow;
type ReviewDecision = "approve" | "reject";

const statusLabels: Record<AdminWithdrawalStatus, string> = {
	all: "All decisions",
	pending: "Pending review",
	approved: "Approved",
	rejected: "Rejected",
};

export function WithdrawalsPage({
	query,
	onQueryChange,
}: {
	query: AdminWithdrawalQuery;
	onQueryChange: (query: AdminWithdrawalQuery) => void;
}) {
	const withdrawalsQuery = useQuery(adminOperationsQueries.withdrawals(query));
	const queryClient = useQueryClient();
	const [search, setSearch] = useState(query.search);
	const [selected, setSelected] = useState<WithdrawalRow | null>(null);
	const [decision, setDecision] = useState<ReviewDecision | null>(null);
	const [reviewError, setReviewError] = useState<string | null>(null);

	useEffect(() => setSearch(query.search), [query.search]);

	const reviewMutation = useMutation({
		mutationFn: ({
			withdrawalId,
			decision: nextDecision,
			reason,
		}: {
			withdrawalId: string;
			decision: ReviewDecision;
			reason: string;
		}) =>
			reviewAdminWithdrawal({
				data: {
					withdrawalId,
					decision: nextDecision,
					reason,
				},
			}),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: adminOperationsQueries.all }),
				queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
			]);
			setSelected(null);
			setDecision(null);
			setReviewError(null);
			emitToast({
				title:
					result.withdrawal.status === "approved"
						? "Withdrawal approved"
						: "Withdrawal rejected",
				description: "The wallet and audit trail have been updated.",
			});
		},
		onError: (error) => {
			setReviewError(
				error instanceof Error
					? error.message
					: "The review could not be saved.",
			);
		},
	});

	const rows = (withdrawalsQuery.data?.items ?? []) as WithdrawalRow[];
	const hasFilters = Boolean(query.search || query.status !== "pending");

	function patchQuery(patch: Partial<AdminWithdrawalQuery>) {
		onQueryChange({ ...query, ...patch, page: patch.page ?? 1 });
	}

	function openReview(row: WithdrawalRow, nextDecision: ReviewDecision) {
		setSelected(row);
		setDecision(nextDecision);
		setReviewError(null);
	}

	function closeReview(open: boolean) {
		if (reviewMutation.isPending) return;
		if (!open) {
			setSelected(null);
			setDecision(null);
			setReviewError(null);
		}
	}

	const columns: AdminTableColumn<WithdrawalRow>[] = [
		{
			accessorKey: "player",
			header: "Player",
			cell: ({ row }) => (
				<div className="min-w-52">
					<p className="truncate font-medium">{row.original.player.name}</p>
					<p className="truncate text-xs text-muted-foreground">
						{row.original.player.email}
					</p>
				</div>
			),
		},
		{
			accessorKey: "amount",
			header: "Requested",
			cell: ({ row }) => (
				<div>
					<p className="font-medium tabular-nums">
						{formatMoney(
							row.original.withdrawal.requestedAmountMinor,
							row.original.withdrawal.currencyCode,
						)}
					</p>
					<p className="text-xs text-muted-foreground">
						{formatDateTime(row.original.withdrawal.requestedAt)}
					</p>
				</div>
			),
		},
		{
			accessorKey: "wallet",
			header: "Wallet after request",
			cell: ({ row }) => (
				<div className="text-xs">
					<p className="tabular-nums">
						Cash{" "}
						{formatMoney(
							row.original.wallet.cashBalanceMinor,
							row.original.withdrawal.currencyCode,
						)}
					</p>
					<p className="text-muted-foreground tabular-nums">
						Reserved{" "}
						{formatMoney(
							row.original.wallet.reservedCashMinor,
							row.original.withdrawal.currencyCode,
						)}
					</p>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Decision",
			cell: ({ row }) => (
				<WithdrawalStatusBadge status={row.original.decision.status} />
			),
		},
		{
			id: "reviewer",
			header: "Reviewer",
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{row.original.decision.reviewer?.name ?? "Awaiting review"}
				</span>
			),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				row.original.decision.status === "pending" ? (
					<div className="flex justify-end gap-1">
						<Button
							aria-label={`Approve ${row.original.player.name}'s withdrawal`}
							onClick={() => openReview(row.original, "approve")}
							size="icon-sm"
							variant="ghost"
						>
							<CheckCircle2Icon className="text-emerald-400" />
						</Button>
						<Button
							aria-label={`Reject ${row.original.player.name}'s withdrawal`}
							onClick={() => openReview(row.original, "reject")}
							size="icon-sm"
							variant="ghost"
						>
							<XCircleIcon className="text-destructive" />
						</Button>
					</div>
				) : null,
		},
	];

	return (
		<main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<header className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-logo text-3xl leading-none tracking-tight sm:text-4xl">
						Withdrawals
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Review reserved-cash requests with the player, wallet, and audit
						evidence in view.
					</p>
				</div>
				<Badge className="w-fit gap-1.5" variant="outline">
					<WalletCardsIcon />
					{withdrawalsQuery.data?.pagination.total ?? 0} requests
				</Badge>
			</header>

			<AdminTableToolbar ariaLabel="Withdrawal filters">
				<div className="relative min-w-0 flex-1 lg:max-w-md">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Search withdrawals"
						className="h-9 pl-9"
						onChange={(event) => {
							setSearch(event.target.value);
							patchQuery({ search: event.target.value });
						}}
						placeholder="Search player or request ID"
						value={search}
					/>
				</div>
				<Select
					value={query.status}
					onValueChange={(value) =>
						patchQuery({
							status: (value ?? "pending") as AdminWithdrawalStatus,
						})
					}
				>
					<SelectTrigger
						aria-label="Withdrawal status"
						className="h-9 w-full lg:w-40"
					>
						<SelectValue>{statusLabels[query.status]}</SelectValue>
					</SelectTrigger>
					<SelectContent align="start">
						{Object.entries(statusLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					aria-label={
						query.direction === "desc"
							? "Sort oldest first"
							: "Sort newest first"
					}
					onClick={() =>
						patchQuery({
							direction: query.direction === "desc" ? "asc" : "desc",
						})
					}
					size="icon-sm"
					variant="outline"
				>
					{query.direction === "desc" ? <ArrowDownIcon /> : <ArrowUpIcon />}
				</Button>
				{hasFilters ? (
					<Button
						onClick={() => {
							setSearch("");
							onQueryChange({
								...query,
								search: "",
								status: "pending",
								page: 1,
							});
						}}
						size="sm"
						variant="ghost"
					>
						<XIcon data-icon="inline-start" />
						Clear
					</Button>
				) : null}
			</AdminTableToolbar>

			<section aria-label="Withdrawal results" className="pt-5">
				{withdrawalsQuery.isError ? (
					<AdminTableError
						onRetry={() => void withdrawalsQuery.refetch()}
						title="Withdrawals could not be loaded."
					/>
				) : withdrawalsQuery.isPending ? (
					<AdminTableLoading />
				) : rows.length === 0 ? (
					<AdminTableEmpty
						description={
							hasFilters
								? "Try a different search or decision filter."
								: "New player withdrawal requests will appear here."
						}
						icon={<Clock3Icon />}
						title={
							hasFilters
								? "No requests match these filters."
								: "Queue is clear."
						}
					/>
				) : (
					<>
						<div className="hidden overflow-hidden rounded-xl border border-border md:block">
							<AdminDataTable
								columns={columns}
								data={rows}
								getRowId={(row) => row.withdrawal.id}
								rowClassName="[&>td]:px-4 [&>td]:py-3"
								tableClassName="[&_th]:px-4"
							/>
						</div>
						<AdminTableMobileList
							getKey={(row) => row.withdrawal.id}
							items={rows}
							renderItem={(row) => (
								<MobileWithdrawalRow row={row} onReview={openReview} />
							)}
						/>
						<AdminTablePagination
							pageCount={withdrawalsQuery.data.pagination.totalPages}
							pageIndex={query.page - 1}
							onPageChange={(page) => patchQuery({ page: page + 1 })}
						/>
					</>
				)}
			</section>

			<ReviewDialog
				decision={decision}
				error={reviewError}
				pending={reviewMutation.isPending}
				row={selected}
				onOpenChange={closeReview}
				onSubmit={(reason) => {
					if (!selected || !decision) return;
					reviewMutation.mutate({
						withdrawalId: selected.withdrawal.id,
						decision,
						reason,
					});
				}}
			/>
		</main>
	);
}

function MobileWithdrawalRow({
	row,
	onReview,
}: {
	row: WithdrawalRow;
	onReview: (row: WithdrawalRow, decision: ReviewDecision) => void;
}) {
	return (
		<div className="grid gap-4 rounded-xl border border-border p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate font-medium">{row.player.name}</p>
					<p className="truncate text-xs text-muted-foreground">
						{row.player.email}
					</p>
				</div>
				<WithdrawalStatusBadge status={row.decision.status} />
			</div>
			<div className="flex items-end justify-between gap-4">
				<div>
					<p className="text-xs text-muted-foreground">Requested</p>
					<p className="text-lg font-medium tabular-nums">
						{formatMoney(
							row.withdrawal.requestedAmountMinor,
							row.withdrawal.currencyCode,
						)}
					</p>
				</div>
				<p className="text-right text-xs text-muted-foreground">
					{formatDateTime(row.withdrawal.requestedAt)}
				</p>
			</div>
			<div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
				<div>
					<p className="text-muted-foreground">Cash after request</p>
					<p className="mt-1 font-medium tabular-nums">
						{formatMoney(
							row.wallet.cashBalanceMinor,
							row.withdrawal.currencyCode,
						)}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground">Reserved</p>
					<p className="mt-1 font-medium tabular-nums">
						{formatMoney(
							row.wallet.reservedCashMinor,
							row.withdrawal.currencyCode,
						)}
					</p>
				</div>
			</div>
			{row.decision.status === "pending" ? (
				<div className="grid grid-cols-2 gap-2">
					<Button onClick={() => onReview(row, "approve")} variant="outline">
						<CheckCircle2Icon data-icon="inline-start" />
						Approve
					</Button>
					<Button onClick={() => onReview(row, "reject")} variant="outline">
						<XCircleIcon data-icon="inline-start" />
						Reject
					</Button>
				</div>
			) : row.decision.reviewer ? (
				<p className="text-xs text-muted-foreground">
					Reviewed by {row.decision.reviewer.name}
				</p>
			) : null}
		</div>
	);
}

function ReviewDialog({
	row,
	decision,
	error,
	pending,
	onOpenChange,
	onSubmit,
}: {
	row: WithdrawalRow | null;
	decision: ReviewDecision | null;
	error: string | null;
	pending: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (reason: string) => void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (row && decision) setReason("");
	}, [row, decision]);

	if (!row || !decision) return null;
	const approving = decision === "approve";

	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{approving ? "Approve withdrawal" : "Reject withdrawal"}
					</DialogTitle>
					<DialogDescription>
						{approving
							? "Reserved cash will be consumed and the request will be marked approved."
							: "Reserved cash will be returned to the player's cash balance."}{" "}
						This decision is permanent for {row.player.name}.
					</DialogDescription>
				</DialogHeader>
				<form
					className="mt-6 grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (reason.trim()) onSubmit(reason.trim());
					}}
				>
					<div className="rounded-lg bg-muted/50 p-3 text-sm">
						<div className="flex items-center justify-between gap-4">
							<span className="text-muted-foreground">Amount</span>
							<span className="font-medium tabular-nums">
								{formatMoney(
									row.withdrawal.requestedAmountMinor,
									row.withdrawal.currencyCode,
								)}
							</span>
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="withdrawal-review-reason">Review reason</Label>
						<Textarea
							autoFocus
							id="withdrawal-review-reason"
							maxLength={500}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Explain the decision for the audit trail"
							value={reason}
						/>
					</div>
					{error ? (
						<p aria-live="polite" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
					<DialogFooter>
						<Button
							disabled={pending}
							onClick={() => onOpenChange(false)}
							type="button"
							variant="ghost"
						>
							Cancel
						</Button>
						<Button disabled={pending || !reason.trim()} type="submit">
							{pending ? (
								<LoaderCircleIcon
									className="animate-spin"
									data-icon="inline-start"
								/>
							) : null}
							{pending
								? "Saving"
								: approving
									? "Approve request"
									: "Reject request"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function WithdrawalStatusBadge({
	status,
}: {
	status: "pending" | "approved" | "rejected";
}) {
	return (
		<Badge
			variant={
				status === "rejected"
					? "destructive"
					: status === "approved"
						? "secondary"
						: "outline"
			}
		>
			{status === "pending"
				? "Pending"
				: status === "approved"
					? "Approved"
					: "Rejected"}
		</Badge>
	);
}

function formatMoney(minor: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(minor / 100);
}

function formatDateTime(value: Date | string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}
