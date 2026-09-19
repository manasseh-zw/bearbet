"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	BanIcon,
	CheckCircle2Icon,
	ChevronRightIcon,
	CircleDollarSignIcon,
	LoaderCircleIcon,
	SearchIcon,
	UserRoundIcon,
	UserRoundPlusIcon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
	AdminDataTable,
	AdminTableEmpty,
	AdminTableError,
	AdminTableLoading,
	AdminTableMobileList,
	type AdminTableColumn,
	AdminTablePagination,
	AdminTableToolbar,
} from "#/components/admin/data-table";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
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
import { Separator } from "#/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { Textarea } from "#/components/ui/textarea";
import { adminUserQueries } from "#/lib/queries/admin-user.queries";
import type {
	AdminUserQuery as AdminUserQueryType,
	AdminUserRole,
	AdminUserStatus,
} from "#/lib/schemas/admin-query.schema";
import { cn } from "#/lib/utils";
import {
	activateAdminUserFn,
	adjustAdminUserBalanceFn,
	assignAdminUserBonusFn,
	suspendAdminUserFn,
} from "#/server/domains/admin/users/users.mutations.functions";

type AdminUserRow = {
	user: {
		id: string;
		name: string;
		email: string;
		username: string | null;
		role: "admin" | "user";
		status: "active" | "suspended";
		createdAt: Date;
	};
	player: {
		firstName: string;
		lastName: string;
		dateOfBirth: string;
		countryCode: string;
	} | null;
	wallet: {
		id: string;
		currencyCode: string;
		balances: {
			cashBalanceMinor: number;
			bonusBalanceMinor: number;
			reservedCashMinor: number;
		};
		playableBalanceMinor: number;
	} | null;
};

type BonusDefinition = {
	id: string;
	code: string;
	name: string;
	amountMinor: number;
	matchPercentageBps: number | null;
	type: string;
};

type ActionMode = "suspend" | "activate" | "balance" | "bonus";
type ActionValues = {
	reason: string;
	amountMajor: string;
	definitionId: string;
};

type UsersPageProps = {
	query: AdminUserQueryType;
	onQueryChange: (query: AdminUserQueryType) => void;
};

const statusLabels: Record<AdminUserStatus, string> = {
	all: "All statuses",
	active: "Active",
	suspended: "Suspended",
};

const roleLabels: Record<AdminUserRole, string> = {
	all: "All roles",
	admin: "Administrators",
	user: "Players",
};

const sortLabels: Record<AdminUserQueryType["sort"], string> = {
	createdAt: "Newest first",
	name: "Name",
	email: "Email",
};

export function UsersPage({ query, onQueryChange }: UsersPageProps) {
	const usersQuery = useQuery(adminUserQueries.list(query));
	const definitionsQuery = useQuery(adminUserQueries.activeBonusDefinitions());
	const queryClient = useQueryClient();
	const [search, setSearch] = useState(query.search);
	const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
	const [action, setAction] = useState<ActionMode | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => setSearch(query.search), [query.search]);

	const mutation = useMutation({
		mutationFn: async (values: ActionValues) => {
			if (!selectedUser || !action) return;
			if (action === "suspend") {
				return suspendAdminUserFn({
					data: { userId: selectedUser.user.id, reason: values.reason },
				});
			}
			if (action === "activate") {
				return activateAdminUserFn({
					data: { userId: selectedUser.user.id, reason: values.reason },
				});
			}
			if (action === "balance") {
				const amount = Number(values.amountMajor);
				if (!Number.isFinite(amount) || amount === 0) {
					throw new Error("Enter a non-zero amount.");
				}
				const amountMinor = Math.round(amount * 100);
				if (!Number.isSafeInteger(amountMinor) || amountMinor === 0) {
					throw new Error(
						"Enter a valid amount with no more than two decimals.",
					);
				}
				return adjustAdminUserBalanceFn({
					data: {
						userId: selectedUser.user.id,
						amountMinor,
						reason: values.reason,
						idempotencyKey: `admin-adjustment:${selectedUser.user.id}:${crypto.randomUUID()}`,
					},
				});
			}
			if (!values.definitionId) throw new Error("Choose a bonus definition.");
			return assignAdminUserBonusFn({
				data: {
					userId: selectedUser.user.id,
					definitionId: values.definitionId,
					reason: values.reason,
					idempotencyKey: `admin-bonus:${selectedUser.user.id}:${values.definitionId}:${crypto.randomUUID()}`,
				},
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: adminUserQueries.all });
			setAction(null);
			setActionError(null);
		},
		onError: (error) => {
			setActionError(
				error instanceof Error ? error.message : "The action failed.",
			);
		},
	});

	const rows = (usersQuery.data?.items ?? []) as AdminUserRow[];
	const definitions = (definitionsQuery.data ?? []) as BonusDefinition[];
	const pageCount = usersQuery.data?.pagination.totalPages ?? 1;
	const hasFilters = Boolean(
		query.search || query.status !== "all" || query.role !== "all",
	);

	function patchQuery(patch: Partial<AdminUserQueryType>) {
		onQueryChange({ ...query, ...patch, page: patch.page ?? 1 });
	}

	function openAction(user: AdminUserRow, mode: ActionMode) {
		setSelectedUser(user);
		setAction(mode);
		setActionError(null);
	}

	function closeAction() {
		if (mutation.isPending) return;
		setAction(null);
		setActionError(null);
	}

	const columns = useMemo<AdminTableColumn<AdminUserRow>[]>(
		() => [
			{
				accessorKey: "name",
				header: "User",
				cell: ({ row }) => (
					<button
						className="flex min-w-56 items-center gap-3 text-left"
						type="button"
						onClick={() => setSelectedUser(row.original)}
					>
						<UserAvatar name={row.original.user.name} size="row" />
						<span className="min-w-0">
							<span className="block truncate font-medium">
								{row.original.user.name}
							</span>
							<span className="block truncate text-xs text-muted-foreground">
								{row.original.user.email}
							</span>
						</span>
					</button>
				),
			},
			{
				accessorKey: "role",
				header: "Role",
				cell: ({ row }) => (
					<Badge variant="outline">
						{row.original.user.role === "admin" ? "Admin" : "Player"}
					</Badge>
				),
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => <StatusBadge status={row.original.user.status} />,
			},
			{
				accessorKey: "balance",
				header: "Playable balance",
				cell: ({ row }) => (
					<span className="tabular-nums">
						{row.original.wallet
							? formatMoney(
									row.original.wallet.playableBalanceMinor,
									row.original.wallet.currencyCode,
								)
							: "No wallet"}
					</span>
				),
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<Button
						aria-label={`Open ${row.original.user.name}`}
						onClick={() => setSelectedUser(row.original)}
						size="icon-sm"
						variant="ghost"
					>
						<ChevronRightIcon />
					</Button>
				),
			},
		],
		[],
	);

	return (
		<main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<header className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-logo text-3xl leading-none tracking-tight sm:text-4xl">
						Users
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Search players, inspect wallet state, and manage account access.
					</p>
				</div>
				<Badge className="w-fit gap-1.5" variant="outline">
					<UserRoundIcon />
					{usersQuery.data?.pagination.total ?? 0} accounts
				</Badge>
			</header>

			<AdminTableToolbar ariaLabel="User filters">
				<div className="relative min-w-0 flex-1 lg:max-w-md">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Search users"
						className="h-9 pl-9"
						onChange={(event) => {
							setSearch(event.target.value);
							patchQuery({ search: event.target.value });
						}}
						placeholder="Search name, email, or username"
						value={search}
					/>
				</div>
				<FilterSelect
					label="Status"
					value={query.status}
					options={statusLabels}
					onChange={(value) => patchQuery({ status: value as AdminUserStatus })}
				/>
				<FilterSelect
					label="Role"
					value={query.role}
					options={roleLabels}
					onChange={(value) => patchQuery({ role: value as AdminUserRole })}
				/>
				<Select
					value={query.sort}
					onValueChange={(value) =>
						patchQuery({ sort: value as AdminUserQueryType["sort"] })
					}
				>
					<SelectTrigger aria-label="Sort users" className="h-9 w-full lg:w-40">
						<SelectValue>{sortLabels[query.sort]}</SelectValue>
					</SelectTrigger>
					<SelectContent align="start">
						{Object.entries(sortLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					aria-label={
						query.direction === "desc" ? "Sort ascending" : "Sort descending"
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
								status: "all",
								role: "all",
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

			<section aria-label="User results" className="pt-5">
				{usersQuery.isError ? (
					<AdminTableError
						onRetry={() => void usersQuery.refetch()}
						title="Users could not be loaded."
					/>
				) : usersQuery.isPending ? (
					<AdminTableLoading />
				) : rows.length === 0 ? (
					<AdminTableEmpty
						action={
							hasFilters ? (
								<Button
									className="mx-auto"
									onClick={() => {
										setSearch("");
										onQueryChange({
											...query,
											search: "",
											status: "all",
											role: "all",
											page: 1,
										});
									}}
									variant="outline"
								>
									Clear filters
								</Button>
							) : null
						}
						description={
							hasFilters
								? "Try a different search or clear the filters."
								: "Registered players will appear here."
						}
						icon={<UserRoundIcon />}
						title={
							hasFilters ? "No users match these filters." : "No users yet."
						}
					/>
				) : (
					<>
						<div className="hidden overflow-hidden rounded-xl border border-border md:block">
							<AdminDataTable
								columns={columns}
								data={rows}
								emptyMessage="No users found."
								getRowId={(row) => row.user.id}
								onRowClick={(row) => setSelectedUser(row)}
								rowClassName="[&>td]:px-4 [&>td]:py-3"
								tableClassName="[&_th]:px-4"
							/>
						</div>
						<AdminTableMobileList
							getKey={(row) => row.user.id}
							items={rows}
							renderItem={(row) => (
								<MobileUserRow row={row} onOpen={() => setSelectedUser(row)} />
							)}
						/>
						<AdminTablePagination
							pageCount={pageCount}
							pageIndex={query.page - 1}
							onPageChange={(page) => patchQuery({ page: page + 1 })}
						/>
					</>
				)}
			</section>

			<UserDetailSheet
				row={selectedUser}
				onOpenChange={(open) => {
					if (!open) setSelectedUser(null);
				}}
				onAction={openAction}
			/>
			<ActionDialog
				mode={action}
				row={selectedUser}
				definitions={definitions}
				error={actionError}
				pending={mutation.isPending}
				onOpenChange={(open) => {
					if (!open) closeAction();
				}}
				onSubmit={(values) => mutation.mutateAsync(values)}
			/>
		</main>
	);
}

function FilterSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: Record<string, string>;
	onChange: (value: string) => void;
}) {
	return (
		<Select
			value={value}
			onValueChange={(nextValue) => onChange(nextValue ?? "")}
		>
			<SelectTrigger aria-label={label} className="h-9 w-full lg:w-36">
				<SelectValue>{options[value]}</SelectValue>
			</SelectTrigger>
			<SelectContent align="start">
				{Object.entries(options).map(([optionValue, optionLabel]) => (
					<SelectItem key={optionValue} value={optionValue}>
						{optionLabel}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function UserDetailSheet({
	row,
	onOpenChange,
	onAction,
}: {
	row: AdminUserRow | null;
	onOpenChange: (open: boolean) => void;
	onAction: (row: AdminUserRow, mode: ActionMode) => void;
}) {
	return (
		<Sheet open={Boolean(row)} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-lg" side="right">
				{row ? (
					<div className="flex min-h-full flex-col">
						<SheetHeader className="pr-12">
							<div className="flex items-center gap-3">
								<UserAvatar name={row.user.name} size="detail" />
								<div className="min-w-0">
									<SheetTitle className="truncate">{row.user.name}</SheetTitle>
									<SheetDescription className="truncate">
										{row.user.email}
									</SheetDescription>
								</div>
							</div>
						</SheetHeader>
						<div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
							<DetailSection title="Account">
								<DetailRow label="Status">
									<StatusBadge status={row.user.status} />
								</DetailRow>
								<DetailRow label="Role">
									<Badge variant="outline">
										{row.user.role === "admin" ? "Administrator" : "Player"}
									</Badge>
								</DetailRow>
								<DetailRow label="Username">
									<span>
										{row.user.username ? `@${row.user.username}` : "Not set"}
									</span>
								</DetailRow>
								<DetailRow label="Joined">
									<span>{formatDate(row.user.createdAt)}</span>
								</DetailRow>
							</DetailSection>
							<Separator />
							<DetailSection title="Player profile">
								{row.player ? (
									<>
										<DetailRow label="Name">
											<span>
												{row.player.firstName} {row.player.lastName}
											</span>
										</DetailRow>
										<DetailRow label="Country">
											<span>{row.player.countryCode.toUpperCase()}</span>
										</DetailRow>
										<DetailRow label="Date of birth">
											<span>{row.player.dateOfBirth}</span>
										</DetailRow>
									</>
								) : (
									<p className="text-sm text-muted-foreground">
										No player profile is linked to this account.
									</p>
								)}
							</DetailSection>
							<Separator />
							<DetailSection title="Wallet">
								{row.wallet ? (
									<>
										<div className="flex items-end justify-between gap-4">
											<span className="text-sm text-muted-foreground">
												Playable balance
											</span>
											<span className="text-2xl font-semibold tabular-nums">
												{formatMoney(
													row.wallet.playableBalanceMinor,
													row.wallet.currencyCode,
												)}
											</span>
										</div>
										<div className="grid gap-3 pt-3 sm:grid-cols-3">
											<BalanceItem
												label="Cash"
												value={row.wallet.balances.cashBalanceMinor}
												currency={row.wallet.currencyCode}
											/>
											<BalanceItem
												label="Bonus"
												value={row.wallet.balances.bonusBalanceMinor}
												currency={row.wallet.currencyCode}
											/>
											<BalanceItem
												label="Reserved"
												value={row.wallet.balances.reservedCashMinor}
												currency={row.wallet.currencyCode}
											/>
										</div>
									</>
								) : (
									<p className="text-sm text-muted-foreground">
										No wallet is linked to this account.
									</p>
								)}
							</DetailSection>
						</div>
						<div className="grid gap-2 p-6 sm:grid-cols-2">
							{row.user.status === "suspended" ? (
								<Button
									onClick={() => onAction(row, "activate")}
									variant="outline"
								>
									<CheckCircle2Icon data-icon="inline-start" />
									Activate
								</Button>
							) : (
								<Button
									onClick={() => onAction(row, "suspend")}
									variant="outline"
								>
									<BanIcon data-icon="inline-start" />
									Suspend
								</Button>
							)}
							<Button
								disabled={!row.wallet}
								onClick={() => onAction(row, "balance")}
								variant="outline"
							>
								<CircleDollarSignIcon data-icon="inline-start" />
								Adjust balance
							</Button>
							<Button
								className="sm:col-span-2"
								disabled={!row.player}
								onClick={() => onAction(row, "bonus")}
								variant="secondary"
							>
								<UserRoundPlusIcon data-icon="inline-start" />
								Assign bonus
							</Button>
						</div>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function ActionDialog({
	mode,
	row,
	definitions,
	error,
	pending,
	onOpenChange,
	onSubmit,
}: {
	mode: ActionMode | null;
	row: AdminUserRow | null;
	definitions: BonusDefinition[];
	error: string | null;
	pending: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ActionValues) => Promise<unknown>;
}) {
	const [values, setValues] = useState<ActionValues>({
		reason: "",
		amountMajor: "",
		definitionId: "",
	});
	useEffect(() => {
		if (mode)
			setValues({
				reason: "",
				amountMajor: "",
				definitionId: definitions[0]?.id ?? "",
			});
	}, [mode, definitions]);
	if (!mode || !row) return null;
	const titles: Record<ActionMode, string> = {
		suspend: "Suspend account",
		activate: "Activate account",
		balance: "Adjust cash balance",
		bonus: "Assign bonus",
	};
	const descriptions: Record<ActionMode, string> = {
		suspend:
			"The user will be signed out and blocked from protected player actions.",
		activate: "The user can sign in again after activation.",
		balance: "This writes an audited cash movement to the wallet ledger.",
		bonus: "The award and its bonus-wallet credit will be recorded together.",
	};
	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{titles[mode]}</DialogTitle>
					<DialogDescription>
						{descriptions[mode]} Target: {row.user.name}.
					</DialogDescription>
				</DialogHeader>
				<form
					className="mt-6 grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						void onSubmit(values).catch(() => undefined);
					}}
				>
					{mode === "balance" ? (
						<div className="grid gap-2">
							<Label htmlFor="amount">
								Amount ({row.wallet?.currencyCode ?? "USD"})
							</Label>
							<Input
								autoFocus
								id="amount"
								inputMode="decimal"
								onChange={(event) =>
									setValues((current) => ({
										...current,
										amountMajor: event.target.value,
									}))
								}
								placeholder="e.g. 25.00 or -10.00"
								value={values.amountMajor}
							/>
						</div>
					) : null}
					{mode === "bonus" ? (
						<div className="grid gap-2">
							<Label htmlFor="bonus">Bonus definition</Label>
							<Select
								value={values.definitionId}
								onValueChange={(value) =>
									setValues((current) => ({
										...current,
										definitionId: value ?? "",
									}))
								}
							>
								<SelectTrigger id="bonus">
									<SelectValue placeholder="Choose a bonus" />
								</SelectTrigger>
								<SelectContent>
									{definitions.map((definition) => (
										<SelectItem key={definition.id} value={definition.id}>
											{definition.name} ·{" "}
											{formatMoney(
												definition.amountMinor,
												row.wallet?.currencyCode ?? "USD",
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}
					<div className="grid gap-2">
						<Label htmlFor="reason">Reason</Label>
						<Textarea
							autoFocus={mode !== "balance" && mode !== "bonus"}
							id="reason"
							maxLength={500}
							onChange={(event) =>
								setValues((current) => ({
									...current,
									reason: event.target.value,
								}))
							}
							placeholder="Explain why this action is needed"
							value={values.reason}
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
						<Button disabled={pending || !values.reason.trim()} type="submit">
							{pending ? (
								<LoaderCircleIcon
									className="animate-spin"
									data-icon="inline-start"
								/>
							) : null}
							{pending ? "Saving" : "Confirm"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function MobileUserRow({
	row,
	onOpen,
}: {
	row: AdminUserRow;
	onOpen: () => void;
}) {
	return (
		<button
			className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left hover:bg-muted/40"
			onClick={onOpen}
			type="button"
		>
			<UserAvatar name={row.user.name} size="row" />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{row.user.name}</span>
				<span className="block truncate text-xs text-muted-foreground">
					{row.user.email}
				</span>
			</span>
			<span className="flex shrink-0 flex-col items-end gap-1">
				<StatusBadge status={row.user.status} />
				<span className="text-xs tabular-nums text-muted-foreground">
					{row.wallet
						? formatMoney(
								row.wallet.playableBalanceMinor,
								row.wallet.currencyCode,
							)
						: "No wallet"}
				</span>
			</span>
			<ChevronRightIcon className="shrink-0 text-muted-foreground" />
		</button>
	);
}

function DetailSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="grid gap-3">
			<h2 className="text-sm font-medium">{title}</h2>
			{children}
		</section>
	);
}
function DetailRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right">{children}</span>
		</div>
	);
}
function BalanceItem({
	label,
	value,
	currency,
}: {
	label: string;
	value: number;
	currency: string;
}) {
	return (
		<div className="grid gap-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="text-sm font-medium tabular-nums">
				{formatMoney(value, currency)}
			</span>
		</div>
	);
}
function StatusBadge({ status }: { status: "active" | "suspended" }) {
	return (
		<Badge variant={status === "suspended" ? "destructive" : "secondary"}>
			{status === "suspended" ? "Suspended" : "Active"}
		</Badge>
	);
}
function UserAvatar({ name, size }: { name: string; size: "detail" | "row" }) {
	return (
		<Avatar
			className={cn("shrink-0", size === "detail" ? "size-10" : "size-8")}
		>
			<AvatarFallback
				className={cn("font-normal text-primary-foreground", avatarColor(name))}
			>
				{initials(name)}
			</AvatarFallback>
		</Avatar>
	);
}

const avatarColors = [
	"bg-primary",
	"bg-amber-300",
	"bg-amber-400",
	"bg-yellow-500",
] as const;

function avatarColor(name: string) {
	let hash = 0;
	for (const character of name) {
		hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
	}
	return avatarColors[hash % avatarColors.length];
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}
function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}
function formatMoney(minor: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	}).format(minor / 100);
}
