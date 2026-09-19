"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	BadgeDollarSignIcon,
	CirclePlusIcon,
	Edit3Icon,
	LoaderCircleIcon,
	SearchIcon,
	ShieldCheckIcon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
import { adminBonusQueries } from "#/lib/queries/admin-bonus.queries";
import {
	type AdminBonusQuery,
	type AdminBonusSortField,
	type AdminBonusStatus,
	type AdminBonusType,
	bonusDefinitionTypes,
	type CreateAdminBonusDefinitionInput,
	createAdminBonusDefinitionInputSchema,
	type SetAdminBonusDefinitionStatusInput,
	type UpdateAdminBonusDefinitionInput,
	updateAdminBonusDefinitionInputSchema,
} from "#/lib/schemas/admin-bonus.schema";
import type { listAdminBonusDefinitionsFn } from "#/server/domains/admin/bonuses/bonuses.functions";
import {
	createAdminBonusDefinitionFn,
	setAdminBonusDefinitionStatusFn,
	updateAdminBonusDefinitionFn,
} from "#/server/domains/admin/bonuses/bonuses.functions";

type DefinitionRow = Awaited<
	ReturnType<typeof listAdminBonusDefinitionsFn>
>["items"][number];

type Editor = { mode: "create" } | { mode: "edit"; row: DefinitionRow };
type StatusChange = Pick<DefinitionRow, "id" | "code" | "name" | "isActive">;

const typeLabels: Record<AdminBonusType, string> = {
	all: "All types",
	welcome: "Welcome",
	deposit: "Deposit match",
	promotional: "Promotional",
};
const statusLabels: Record<AdminBonusStatus, string> = {
	all: "All statuses",
	active: "Active",
	inactive: "Inactive",
};
const sortLabels: Record<AdminBonusSortField, string> = {
	name: "Name",
	createdAt: "Created",
	updatedAt: "Updated",
};

export function BonusDefinitionsPage({
	query,
	onQueryChange,
}: {
	query: AdminBonusQuery;
	onQueryChange: (query: AdminBonusQuery) => void;
}) {
	const queryClient = useQueryClient();
	const definitionsQuery = useQuery(adminBonusQueries.list(query));
	const [search, setSearch] = useState(query.search);
	const [editor, setEditor] = useState<Editor | null>(null);
	const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => setSearch(query.search), [query.search]);

	const invalidate = async () => {
		await queryClient.invalidateQueries({ queryKey: adminBonusQueries.all });
	};
	const createMutation = useMutation({
		mutationFn: (input: CreateAdminBonusDefinitionInput) =>
			createAdminBonusDefinitionFn({ data: input }),
		onSuccess: async () => {
			await invalidate();
			setEditor(null);
			setActionError(null);
		},
		onError: (error) =>
			setActionError(errorMessage(error, "The bonus could not be created.")),
	});
	const updateMutation = useMutation({
		mutationFn: (input: UpdateAdminBonusDefinitionInput) =>
			updateAdminBonusDefinitionFn({ data: input }),
		onSuccess: async () => {
			await invalidate();
			setEditor(null);
			setActionError(null);
		},
		onError: (error) =>
			setActionError(errorMessage(error, "The bonus could not be updated.")),
	});
	const statusMutation = useMutation({
		mutationFn: (input: SetAdminBonusDefinitionStatusInput) =>
			setAdminBonusDefinitionStatusFn({ data: input }),
		onSuccess: async () => {
			await invalidate();
			setStatusChange(null);
			setActionError(null);
		},
		onError: (error) =>
			setActionError(
				errorMessage(error, "The bonus status could not be changed."),
			),
	});

	const rows = definitionsQuery.data?.items ?? [];
	const pageCount = definitionsQuery.data?.pagination.totalPages ?? 1;
	const hasFilters = Boolean(
		query.search || query.status !== "all" || query.type !== "all",
	);
	const pending = createMutation.isPending || updateMutation.isPending;

	function patchQuery(patch: Partial<AdminBonusQuery>) {
		onQueryChange({ ...query, ...patch, page: patch.page ?? 1 });
	}

	function clearFilters() {
		setSearch("");
		onQueryChange({
			...query,
			search: "",
			status: "all",
			type: "all",
			page: 1,
		});
	}

	return (
		<main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
			<header className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Bonuses
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Manage the rules players can claim. Issued awards keep the rules
						they were granted with.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge className="gap-1.5" variant="outline">
						<BadgeDollarSignIcon />
						{definitionsQuery.data?.pagination.total ?? 0} definitions
					</Badge>
					<Button
						onClick={() => {
							setActionError(null);
							setEditor({ mode: "create" });
						}}
					>
						<CirclePlusIcon data-icon="inline-start" />
						New bonus
					</Button>
				</div>
			</header>

			{actionError ? (
				<div
					className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
					role="alert"
				>
					<span>{actionError}</span>
					<button
						aria-label="Dismiss error"
						onClick={() => setActionError(null)}
						type="button"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			) : null}

			<div
				className="flex flex-col gap-3 py-5 xl:flex-row xl:items-center"
				role="toolbar"
				aria-label="Bonus definition filters"
			>
				<div className="relative min-w-0 flex-1 xl:max-w-md">
					<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						aria-label="Search bonus definitions"
						className="h-9 pl-9"
						placeholder="Search code, name, or description"
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							patchQuery({ search: event.target.value });
						}}
					/>
				</div>
				<FilterSelect
					label="Status"
					value={query.status}
					options={statusLabels}
					onChange={(value) =>
						patchQuery({ status: value as AdminBonusStatus })
					}
				/>
				<FilterSelect
					label="Type"
					value={query.type}
					options={typeLabels}
					onChange={(value) => patchQuery({ type: value as AdminBonusType })}
				/>
				<Select
					value={query.sort}
					onValueChange={(value) =>
						patchQuery({ sort: value as AdminBonusSortField })
					}
				>
					<SelectTrigger
						aria-label="Sort bonuses"
						className="h-9 w-full xl:w-32"
					>
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
						query.direction === "asc" ? "Sort descending" : "Sort ascending"
					}
					onClick={() =>
						patchQuery({
							direction: query.direction === "asc" ? "desc" : "asc",
						})
					}
					size="icon-sm"
					variant="outline"
				>
					{query.direction === "asc" ? <ArrowDownIcon /> : <ArrowUpIcon />}
				</Button>
				{hasFilters ? (
					<Button onClick={clearFilters} size="sm" variant="ghost">
						<XIcon data-icon="inline-start" /> Clear
					</Button>
				) : null}
			</div>

			<section aria-label="Bonus definition results">
				{definitionsQuery.isError ? (
					<div
						className="grid min-h-56 place-items-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
						role="alert"
					>
						<div>
							<p className="font-medium">
								Bonus definitions could not be loaded.
							</p>
							<Button
								className="mt-3"
								onClick={() => void definitionsQuery.refetch()}
								variant="outline"
							>
								Retry
							</Button>
						</div>
					</div>
				) : definitionsQuery.isPending ? (
					<DefinitionListSkeleton />
				) : rows.length === 0 ? (
					<div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border p-8 text-center">
						<div>
							<p className="font-medium">
								No bonus definitions match these filters.
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								{hasFilters
									? "Try a different search or clear the filters."
									: "Create the first definition to make a bonus available to players."}
							</p>
							{hasFilters ? (
								<Button
									className="mt-4"
									onClick={clearFilters}
									variant="outline"
								>
									Clear filters
								</Button>
							) : null}
						</div>
					</div>
				) : (
					<div className="space-y-3">
						{rows.map((row) => (
							<DefinitionRowView
								key={row.id}
								row={row}
								onEdit={() => {
									setActionError(null);
									setEditor({ mode: "edit", row });
								}}
								onStatus={() => {
									setActionError(null);
									setStatusChange(row);
								}}
							/>
						))}
						<footer className="flex flex-col gap-3 pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
							<span>
								Page {query.page} of {pageCount} ·{" "}
								{definitionsQuery.data?.pagination.total} definitions
							</span>
							<div className="flex gap-2">
								<Button
									disabled={query.page <= 1 || definitionsQuery.isFetching}
									onClick={() => patchQuery({ page: query.page - 1 })}
									variant="outline"
								>
									Previous
								</Button>
								<Button
									disabled={
										query.page >= pageCount || definitionsQuery.isFetching
									}
									onClick={() => patchQuery({ page: query.page + 1 })}
									variant="outline"
								>
									Next
								</Button>
							</div>
						</footer>
					</div>
				)}
			</section>

			<BonusDefinitionDialog
				editor={editor}
				pending={pending}
				error={
					createMutation.isError || updateMutation.isError ? actionError : null
				}
				onOpenChange={(open) => {
					if (!open && !pending) setEditor(null);
				}}
				onSubmit={(values) => {
					setActionError(null);
					if (values.mode === "create") createMutation.mutate(values.input);
					else updateMutation.mutate(values.input);
				}}
			/>
			<StatusDialog
				key={statusChange?.id ?? "closed"}
				change={statusChange}
				pending={statusMutation.isPending}
				error={statusMutation.isError ? actionError : null}
				onOpenChange={(open) => {
					if (!open && !statusMutation.isPending) setStatusChange(null);
				}}
				onSubmit={(input) => {
					setActionError(null);
					statusMutation.mutate(input);
				}}
			/>
		</main>
	);
}

function DefinitionRowView({
	row,
	onEdit,
	onStatus,
}: {
	row: DefinitionRow;
	onEdit: () => void;
	onStatus: () => void;
}) {
	return (
		<article className="rounded-xl border border-border bg-card/40 p-4">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<code className="text-sm font-semibold tracking-wide">
							{row.code}
						</code>
						<Badge variant={row.isActive ? "default" : "secondary"}>
							{row.isActive ? "Active" : "Inactive"}
						</Badge>
						<Badge variant="outline">{typeLabels[row.type]}</Badge>
					</div>
					<h2 className="mt-2 text-lg font-semibold">{row.name}</h2>
					{row.description ? (
						<p className="mt-1 max-w-3xl text-sm text-muted-foreground">
							{row.description}
						</p>
					) : null}
					<div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
						<Rule label="Award">
							{formatMinor(row.amountMinor)}
							{row.matchPercentageBps
								? ` · ${row.matchPercentageBps / 100}% match`
								: ""}
						</Rule>
						<Rule label="Wagering">{row.wageringMultiplier}x</Rule>
						<Rule label="Expires">{row.expiresAfterDays} days</Rule>
						<Rule label="Minimum deposit">
							{row.minimumDepositMinor == null
								? "No minimum"
								: formatMinor(row.minimumDepositMinor)}
						</Rule>
					</div>
					<div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
						<RulePill label="Games" values={row.eligibleGameIds} />
						<RulePill label="Categories" values={row.eligibleCategories} />
						<RulePill label="Providers" values={row.eligibleProviders} />
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
					<Button onClick={onEdit} size="sm" variant="outline">
						<Edit3Icon data-icon="inline-start" /> Edit
					</Button>
					<Button onClick={onStatus} size="sm" variant="outline">
						{row.isActive ? "Deactivate" : "Activate"}
					</Button>
				</div>
			</div>
		</article>
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
			<SelectTrigger aria-label={label} className="h-9 w-full xl:w-40">
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

function BonusDefinitionDialog({
	editor,
	pending,
	error,
	onOpenChange,
	onSubmit,
}: {
	editor: Editor | null;
	pending: boolean;
	error: string | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		values:
			| { mode: "create"; input: CreateAdminBonusDefinitionInput }
			| { mode: "edit"; input: UpdateAdminBonusDefinitionInput },
	) => void;
}) {
	const [values, setValues] = useState<BonusFormValues>(emptyForm());
	const [validationError, setValidationError] = useState<string | null>(null);
	useEffect(() => {
		setValues(editor?.mode === "edit" ? rowToForm(editor.row) : emptyForm());
		setValidationError(null);
	}, [editor]);
	if (!editor) return null;
	const currentEditor = editor;
	const isCreate = editor.mode === "create";
	const set = (key: keyof BonusFormValues, value: string) =>
		setValues((current) => ({ ...current, [key]: value }));

	function submit() {
		if (currentEditor.mode === "create") {
			const parsed = toDefinitionInput(values, currentEditor);
			if (!parsed.success) {
				setValidationError(
					parsed.error.issues[0]?.message ?? "Check the bonus rules.",
				);
				return;
			}
			setValidationError(null);
			onSubmit({
				mode: "create",
				input: parsed.data as CreateAdminBonusDefinitionInput,
			});
			return;
		}
		const parsed = toDefinitionInput(values, currentEditor);
		if (!parsed.success) {
			setValidationError(
				parsed.error.issues[0]?.message ?? "Check the bonus rules.",
			);
			return;
		}
		setValidationError(null);
		onSubmit({
			mode: "edit",
			input: parsed.data as UpdateAdminBonusDefinitionInput,
		});
	}

	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>
						{isCreate ? "Create bonus definition" : "Edit bonus definition"}
					</DialogTitle>
					<DialogDescription>
						{isCreate
							? "Define the rules for a new player offer."
							: "Changes apply to future awards. Existing awards keep their snapshot."}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 sm:grid-cols-2">
					{isCreate ? (
						<Field label="Code" hint="Stable identifier, 3–64 characters">
							<Input
								value={values.code}
								onChange={(event) => set("code", event.target.value)}
								placeholder="WELCOME_2026"
							/>
						</Field>
					) : (
						<Field label="Code" hint="Stable after creation">
							<Input disabled value={values.code} />
						</Field>
					)}
					<Field label="Name">
						<Input
							value={values.name}
							onChange={(event) => set("name", event.target.value)}
							placeholder="Welcome bonus"
						/>
					</Field>
					<Field label="Type">
						<Select
							value={values.type}
							onValueChange={(value) => set("type", value ?? "welcome")}
						>
							<SelectTrigger>
								<SelectValue>
									{typeLabels[values.type as AdminBonusType]}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{bonusDefinitionTypes.map((type) => (
									<SelectItem key={type} value={type}>
										{typeLabels[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field
						label="Award amount"
						hint="Major currency units, for example 100 = 100.00 in the player's currency"
					>
						<Input
							inputMode="decimal"
							value={values.amountMajor}
							onChange={(event) => set("amountMajor", event.target.value)}
							placeholder="100"
						/>
					</Field>
					<Field label="Wagering multiplier">
						<Input
							inputMode="numeric"
							value={values.wageringMultiplier}
							onChange={(event) =>
								set("wageringMultiplier", event.target.value)
							}
							placeholder="5"
						/>
					</Field>
					<Field label="Expires after (days)">
						<Input
							inputMode="numeric"
							value={values.expiresAfterDays}
							onChange={(event) => set("expiresAfterDays", event.target.value)}
							placeholder="30"
						/>
					</Field>
					<Field
						label="Match percentage"
						hint="Deposit bonuses only. Leave blank for a fixed award."
					>
						<Input
							disabled={values.type !== "deposit"}
							inputMode="decimal"
							value={values.matchPercentage}
							onChange={(event) => set("matchPercentage", event.target.value)}
							placeholder="25"
						/>
					</Field>
					<Field label="Minimum deposit" hint="Optional major currency units">
						<Input
							inputMode="decimal"
							value={values.minimumDepositMajor}
							onChange={(event) =>
								set("minimumDepositMajor", event.target.value)
							}
							placeholder="50"
						/>
					</Field>
					<Field label="Maximum award" hint="Optional major currency units">
						<Input
							inputMode="decimal"
							value={values.maximumAwardMajor}
							onChange={(event) => set("maximumAwardMajor", event.target.value)}
							placeholder="500"
						/>
					</Field>
					<div className="sm:col-span-2">
						<Field label="Description">
							<Textarea
								value={values.description}
								onChange={(event) => set("description", event.target.value)}
								placeholder="Explain the offer in the player-facing campaign."
							/>
						</Field>
					</div>
					<Field
						label="Eligible game IDs"
						hint="Comma-separated. Leave blank for all games."
					>
						<Input
							value={values.eligibleGameIds}
							onChange={(event) => set("eligibleGameIds", event.target.value)}
							placeholder="game-id-1, game-id-2"
						/>
					</Field>
					<Field
						label="Eligible categories"
						hint="Comma-separated. Leave blank for all categories."
					>
						<Input
							value={values.eligibleCategories}
							onChange={(event) =>
								set("eligibleCategories", event.target.value)
							}
							placeholder="Slots, Table"
						/>
					</Field>
					<Field
						label="Eligible providers"
						hint="Comma-separated. Leave blank for all providers."
					>
						<Input
							value={values.eligibleProviders}
							onChange={(event) => set("eligibleProviders", event.target.value)}
							placeholder="BigBang"
						/>
					</Field>
					<div className="sm:col-span-2">
						<Field label="Reason for change">
							<Textarea
								value={values.reason}
								onChange={(event) => set("reason", event.target.value)}
								placeholder="Explain the campaign or rule change"
								maxLength={500}
							/>
						</Field>
					</div>
				</div>
				{validationError || error ? (
					<p className="text-sm text-destructive">{validationError ?? error}</p>
				) : null}
				<DialogFooter>
					<Button
						disabled={pending}
						onClick={() => onOpenChange(false)}
						variant="ghost"
					>
						Cancel
					</Button>
					<Button disabled={pending || !values.reason.trim()} onClick={submit}>
						{pending ? (
							<LoaderCircleIcon className="animate-spin" />
						) : (
							<ShieldCheckIcon />
						)}
						{isCreate ? "Create definition" : "Save changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function StatusDialog({
	change,
	pending,
	error,
	onOpenChange,
	onSubmit,
}: {
	change: StatusChange | null;
	pending: boolean;
	error: string | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: SetAdminBonusDefinitionStatusInput) => void;
}) {
	const [reason, setReason] = useState("");
	if (!change) return null;
	const active = !change.isActive;
	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{active ? "Activate bonus" : "Deactivate bonus"}
					</DialogTitle>
					<DialogDescription>
						{active
							? "Players can claim this definition again."
							: "New claims stop immediately. Existing awards continue."}{" "}
						{change.name} ({change.code})
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="bonus-status-reason">Reason</Label>
					<Textarea
						id="bonus-status-reason"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder="Explain this availability change"
						maxLength={500}
					/>
				</div>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<DialogFooter>
					<Button
						disabled={pending}
						onClick={() => onOpenChange(false)}
						variant="ghost"
					>
						Cancel
					</Button>
					<Button
						disabled={pending || !reason.trim()}
						onClick={() =>
							onSubmit({ definitionId: change.id, isActive: active, reason })
						}
					>
						{pending ? <LoaderCircleIcon className="animate-spin" /> : null}
						{active ? "Activate" : "Deactivate"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			{children}
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function Rule({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div>
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-1 font-medium tabular-nums">{children}</dd>
		</div>
	);
}

function RulePill({ label, values }: { label: string; values: string[] }) {
	return (
		<span className="rounded-md bg-muted/60 px-2 py-1">
			{label}: {values.length ? values.join(", ") : "All"}
		</span>
	);
}

function DefinitionListSkeleton() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading bonus definitions"
			className="block space-y-3"
		>
			{["one", "two", "three", "four", "five"].map((key) => (
				<div
					className="h-44 animate-pulse rounded-xl bg-muted/50"
					key={`bonus-definition-loading-${key}`}
				/>
			))}
		</output>
	);
}

type BonusFormValues = {
	code: string;
	name: string;
	description: string;
	type: string;
	amountMajor: string;
	matchPercentage: string;
	wageringMultiplier: string;
	expiresAfterDays: string;
	minimumDepositMajor: string;
	maximumAwardMajor: string;
	eligibleGameIds: string;
	eligibleCategories: string;
	eligibleProviders: string;
	reason: string;
};

function emptyForm(): BonusFormValues {
	return {
		code: "",
		name: "",
		description: "",
		type: "welcome",
		amountMajor: "",
		matchPercentage: "",
		wageringMultiplier: "5",
		expiresAfterDays: "30",
		minimumDepositMajor: "",
		maximumAwardMajor: "",
		eligibleGameIds: "",
		eligibleCategories: "",
		eligibleProviders: "",
		reason: "",
	};
}

function rowToForm(row: DefinitionRow): BonusFormValues {
	return {
		code: row.code,
		name: row.name,
		description: row.description ?? "",
		type: row.type,
		amountMajor: (row.amountMinor / 100).toString(),
		matchPercentage:
			row.matchPercentageBps == null
				? ""
				: (row.matchPercentageBps / 100).toString(),
		wageringMultiplier: row.wageringMultiplier.toString(),
		expiresAfterDays: row.expiresAfterDays.toString(),
		minimumDepositMajor:
			row.minimumDepositMinor == null
				? ""
				: (row.minimumDepositMinor / 100).toString(),
		maximumAwardMajor:
			row.maximumAwardMinor == null
				? ""
				: (row.maximumAwardMinor / 100).toString(),
		eligibleGameIds: row.eligibleGameIds.join(", "),
		eligibleCategories: row.eligibleCategories.join(", "),
		eligibleProviders: row.eligibleProviders.join(", "),
		reason: "",
	};
}

function toDefinitionInput(values: BonusFormValues, editor: Editor) {
	const base = {
		name: values.name,
		description: values.description || undefined,
		type: values.type,
		amountMinor: toMinor(values.amountMajor),
		matchPercentageBps:
			values.type === "deposit" && values.matchPercentage
				? Math.round(Number(values.matchPercentage) * 100)
				: undefined,
		wageringMultiplier: Number(values.wageringMultiplier),
		expiresAfterDays: Number(values.expiresAfterDays),
		minimumDepositMinor: values.minimumDepositMajor
			? toMinor(values.minimumDepositMajor)
			: undefined,
		maximumAwardMinor: values.maximumAwardMajor
			? toMinor(values.maximumAwardMajor)
			: undefined,
		eligibleGameIds: splitList(values.eligibleGameIds),
		eligibleCategories: splitList(values.eligibleCategories),
		eligibleProviders: splitList(values.eligibleProviders),
		reason: values.reason,
	};
	return editor.mode === "create"
		? createAdminBonusDefinitionInputSchema.safeParse({
				...base,
				code: values.code,
			})
		: updateAdminBonusDefinitionInputSchema.safeParse({
				...base,
				definitionId: editor.row.id,
			});
}

function toMinor(value: string) {
	return Math.round(Number(value) * 100);
}

function splitList(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function formatMinor(value: number) {
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value / 100);
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}
