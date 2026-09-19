"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	BadgeDollarSignIcon,
	CirclePlusIcon,
	Edit3Icon,
	ImagePlusIcon,
	LoaderCircleIcon,
	SearchIcon,
	ShieldCheckIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	AdminDataTable,
	type AdminTableColumn,
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
import { uploadBonusThumbnail } from "#/lib/blob-upload";
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
						<BonusDefinitionTable
							rows={rows}
							onEdit={(row) => {
								setActionError(null);
								setEditor({ mode: "edit", row });
							}}
							onStatus={(row) => {
								setActionError(null);
								setStatusChange(row);
							}}
						/>
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

function BonusDefinitionTable({
	rows,
	onEdit,
	onStatus,
}: {
	rows: DefinitionRow[];
	onEdit: (row: DefinitionRow) => void;
	onStatus: (row: StatusChange) => void;
}) {
	const columns: AdminTableColumn<DefinitionRow>[] = [
		{
			id: "bonus",
			header: "Bonus",
			cell: ({ row }) => (
				<div className="flex min-w-64 items-center gap-3">
					<div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted text-center text-[10px] text-muted-foreground">
						{row.original.thumbnailUrl ? (
							<img
								alt=""
								className="size-full object-cover"
								loading="lazy"
								src={row.original.thumbnailUrl}
							/>
						) : (
							<span>No image</span>
						)}
					</div>
					<div className="min-w-0">
						<p className="truncate font-medium">{row.original.name}</p>
						{row.original.description ? (
							<p className="mt-1 max-w-96 truncate text-xs text-muted-foreground">
								{row.original.description}
							</p>
						) : null}
					</div>
				</div>
			),
		},
		{
			accessorKey: "isActive",
			header: "Status",
			cell: ({ row }) => (
				<Badge variant={row.original.isActive ? "default" : "secondary"}>
					{row.original.isActive ? "Active" : "Inactive"}
				</Badge>
			),
		},
		{
			id: "award",
			header: "Award",
			cell: ({ row }) => (
				<div className="tabular-nums">
					<p className="font-medium">{formatMinor(row.original.amountMinor)}</p>
					{row.original.matchPercentageBps ? (
						<p className="text-xs text-muted-foreground">
							{row.original.matchPercentageBps / 100}% match
						</p>
					) : null}
				</div>
			),
		},
		{
			accessorKey: "wageringMultiplier",
			header: "Wagering",
			cell: ({ row }) => (
				<span className="tabular-nums">{row.original.wageringMultiplier}x</span>
			),
		},
		{
			accessorKey: "expiresAfterDays",
			header: "Expires",
			cell: ({ row }) => (
				<span className="tabular-nums">
					{row.original.expiresAfterDays} days
				</span>
			),
		},
		{
			id: "actions",
			header: "Actions",
			meta: {
				headerClassName: "w-0 text-right",
				cellClassName: "text-right",
			},
			cell: ({ row }) => (
				<div className="flex justify-end gap-1.5">
					<Button
						aria-label={`Edit ${row.original.name}`}
						onClick={() => onEdit(row.original)}
						size="sm"
						variant="outline"
					>
						<Edit3Icon data-icon="inline-start" /> Edit
					</Button>
					<Button
						aria-label={`${row.original.isActive ? "Deactivate" : "Activate"} ${row.original.name}`}
						onClick={() => onStatus(row.original)}
						size="sm"
						variant="outline"
					>
						{row.original.isActive ? "Deactivate" : "Activate"}
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="overflow-hidden rounded-xl border border-border">
			<AdminDataTable
				columns={columns}
				data={rows}
				getRowId={(row) => row.id}
				rowClassName="[&>td]:px-4 [&>td]:py-4"
				tableClassName="min-w-[58rem] [&_th]:px-4"
			/>
		</div>
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
	const [initialValues, setInitialValues] = useState<BonusFormValues>(
		emptyForm(),
	);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const nextValues =
			editor?.mode === "edit" ? rowToForm(editor.row) : emptyForm();
		setValues(nextValues);
		setInitialValues(nextValues);
		setValidationError(null);
		setUploadError(null);
		setUploadProgress(null);
	}, [editor]);
	if (!editor) return null;
	const currentEditor = editor;
	const isCreate = editor.mode === "create";
	const generatedCode = isCreate
		? generatedBonusCode(values.name)
		: editor.row.code;
	const hasDefinitionChanges =
		formSnapshot(values) !== formSnapshot(initialValues);
	const canSubmit =
		!pending &&
		!uploading &&
		Boolean(values.reason.trim()) &&
		(isCreate ? Boolean(values.name.trim()) : hasDefinitionChanges);
	const set = (key: keyof BonusFormValues, value: string) =>
		setValues((current) => ({ ...current, [key]: value }));

	function submit() {
		if (uploading) return;
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

	async function uploadThumbnail(file: File) {
		setUploading(true);
		setUploadError(null);
		setUploadProgress(0);
		try {
			const blob = await uploadBonusThumbnail({
				file,
				code: generatedCode,
				onUploadProgress: setUploadProgress,
			});
			set("thumbnailUrl", blob.url);
			setUploadProgress(100);
		} catch (error) {
			setUploadError(
				error instanceof Error
					? error.message
					: "The thumbnail could not be uploaded.",
			);
		} finally {
			setUploading(false);
		}
	}

	return (
		<Dialog open onOpenChange={onOpenChange}>
			<DialogContent className="inset-0 top-0 left-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-none p-0">
				<DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-16 sm:px-8">
					<DialogTitle className="text-lg font-medium">
						{isCreate ? "Create bonus" : "Edit bonus"}
					</DialogTitle>
					<DialogDescription>
						{isCreate
							? "Set up the offer players will see in the lobby."
							: "Updates apply to future awards. Existing awards keep their snapshot."}
					</DialogDescription>
				</DialogHeader>

				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
						<aside className="border-b border-border bg-muted/15 px-5 py-6 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-6">
							<div className="mx-auto max-w-sm lg:mx-0">
								<p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
									Live preview
								</p>
								<div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
									<div className="aspect-[4/3] overflow-hidden bg-muted">
										{values.thumbnailUrl ? (
											<img
												alt="Bonus thumbnail preview"
												className="size-full object-cover"
												src={values.thumbnailUrl}
											/>
										) : (
											<div className="grid size-full place-items-center px-8 text-center text-sm text-muted-foreground">
												Your thumbnail will appear here
											</div>
										)}
									</div>
									<div className="space-y-4 p-4">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate text-base font-medium">
													{values.name || "New bonus"}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{generatedCode}
												</p>
											</div>
											<Badge variant="outline">
												{isCreate
													? "Draft"
													: editor.row.isActive
														? "Active"
														: "Inactive"}
											</Badge>
										</div>
										{values.description ? (
											<p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
												{values.description}
											</p>
										) : (
											<p className="text-sm text-muted-foreground">
												Add a short player-facing description.
											</p>
										)}
										<div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
											<div>
												<p className="text-xs text-muted-foreground">Award</p>
												<p className="mt-1 font-medium tabular-nums">
													{values.amountMajor ? `${values.amountMajor}` : "--"}
												</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground">
													Wagering
												</p>
												<p className="mt-1 font-medium tabular-nums">
													{values.wageringMultiplier
														? `${values.wageringMultiplier}x`
														: "--"}
												</p>
											</div>
										</div>
									</div>
								</div>

								<div className="mt-5 space-y-2">
									<input
										accept="image/jpeg,image/png,image/webp"
										className="sr-only"
										onChange={(event) => {
											const file = event.target.files?.[0];
											if (file) void uploadThumbnail(file);
											event.target.value = "";
										}}
										ref={fileInputRef}
										type="file"
									/>
									<Button
										className="w-full"
										disabled={uploading}
										onClick={() => fileInputRef.current?.click()}
										type="button"
										variant="outline"
									>
										{uploading ? (
											<LoaderCircleIcon className="animate-spin" />
										) : (
											<ImagePlusIcon />
										)}
										{uploading
											? `Uploading ${uploadProgress ?? 0}%`
											: values.thumbnailUrl
												? "Replace thumbnail"
												: "Upload thumbnail"}
									</Button>
									{values.thumbnailUrl ? (
										<Button
											className="w-full"
											disabled={uploading}
											onClick={() => set("thumbnailUrl", "")}
											type="button"
											variant="ghost"
										>
											<Trash2Icon /> Remove thumbnail
										</Button>
									) : null}
									<p className="text-xs leading-5 text-muted-foreground">
										JPEG, PNG, or WebP. Maximum 5 MB.
									</p>
									{uploadError ? (
										<p className="text-sm text-destructive" role="alert">
											{uploadError}
										</p>
									) : null}
								</div>
							</div>
						</aside>

						<div className="min-w-0 px-5 py-7 sm:px-8 lg:px-10">
							<div className="mx-auto max-w-4xl space-y-10">
								<section
									aria-labelledby="bonus-details-heading"
									className="space-y-4"
								>
									<SectionHeading
										id="bonus-details-heading"
										title="Offer details"
										description="Name the offer and write the message players will see."
									/>
									<div className="grid gap-5 sm:grid-cols-2">
										<Field id="bonus-name" label="Name">
											<Input
												className="h-10 rounded-lg"
												id="bonus-name"
												value={values.name}
												onChange={(event) => set("name", event.target.value)}
												placeholder="Welcome bonus"
											/>
											<p className="text-xs text-muted-foreground">
												Generated code:{" "}
												<code className="rounded bg-muted px-1 py-0.5 font-medium text-foreground">
													{generatedCode}
												</code>
											</p>
										</Field>
										<Field id="bonus-type" label="Type">
											<Select
												value={values.type}
												onValueChange={(value) =>
													set("type", value ?? "welcome")
												}
											>
												<SelectTrigger
													aria-label="Bonus type"
													className="h-10 w-full rounded-lg"
													id="bonus-type"
												>
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
										<div className="sm:col-span-2">
											<Field id="bonus-description" label="Description">
												<Textarea
													className="min-h-24 rounded-lg"
													id="bonus-description"
													value={values.description}
													onChange={(event) =>
														set("description", event.target.value)
													}
													placeholder="Explain the offer in the player-facing campaign."
												/>
											</Field>
										</div>
									</div>
								</section>

								<section
									aria-labelledby="bonus-rules-heading"
									className="space-y-4"
								>
									<SectionHeading
										id="bonus-rules-heading"
										title="Bonus rules"
										description="Set the award, wagering requirement, and deposit limits."
									/>
									<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
										<Field
											id="bonus-amount"
											label="Award amount"
											hint="Major currency units"
										>
											<Input
												className="h-10 rounded-lg"
												id="bonus-amount"
												inputMode="decimal"
												value={values.amountMajor}
												onChange={(event) =>
													set("amountMajor", event.target.value)
												}
												placeholder="100"
											/>
										</Field>
										<Field id="bonus-wagering" label="Wagering multiplier">
											<Input
												className="h-10 rounded-lg"
												id="bonus-wagering"
												inputMode="numeric"
												value={values.wageringMultiplier}
												onChange={(event) =>
													set("wageringMultiplier", event.target.value)
												}
												placeholder="5"
											/>
										</Field>
										<Field id="bonus-expires" label="Expires after (days)">
											<Input
												className="h-10 rounded-lg"
												id="bonus-expires"
												inputMode="numeric"
												value={values.expiresAfterDays}
												onChange={(event) =>
													set("expiresAfterDays", event.target.value)
												}
												placeholder="30"
											/>
										</Field>
										<Field
											id="bonus-match"
											label="Match percentage"
											hint="Deposit bonuses only"
										>
											<Input
												className="h-10 rounded-lg"
												disabled={values.type !== "deposit"}
												id="bonus-match"
												inputMode="decimal"
												value={values.matchPercentage}
												onChange={(event) =>
													set("matchPercentage", event.target.value)
												}
												placeholder="25"
											/>
										</Field>
										<Field
											id="bonus-minimum-deposit"
											label="Minimum deposit"
											hint="Optional"
										>
											<Input
												className="h-10 rounded-lg"
												id="bonus-minimum-deposit"
												inputMode="decimal"
												value={values.minimumDepositMajor}
												onChange={(event) =>
													set("minimumDepositMajor", event.target.value)
												}
												placeholder="50"
											/>
										</Field>
										<Field
											id="bonus-maximum-award"
											label="Maximum award"
											hint="Optional"
										>
											<Input
												className="h-10 rounded-lg"
												id="bonus-maximum-award"
												inputMode="decimal"
												value={values.maximumAwardMajor}
												onChange={(event) =>
													set("maximumAwardMajor", event.target.value)
												}
												placeholder="500"
											/>
										</Field>
									</div>
								</section>

								<section
									aria-labelledby="bonus-eligibility-heading"
									className="space-y-4"
								>
									<SectionHeading
										id="bonus-eligibility-heading"
										title="Eligibility"
										description="Leave these blank to include the full catalogue."
									/>
									<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
										<Field
											id="bonus-game-ids"
											label="Game IDs"
											hint="Comma-separated"
										>
											<Input
												className="h-10 rounded-lg"
												id="bonus-game-ids"
												value={values.eligibleGameIds}
												onChange={(event) =>
													set("eligibleGameIds", event.target.value)
												}
												placeholder="game-id-1, game-id-2"
											/>
										</Field>
										<Field
											id="bonus-categories"
											label="Categories"
											hint="Comma-separated"
										>
											<Input
												className="h-10 rounded-lg"
												id="bonus-categories"
												value={values.eligibleCategories}
												onChange={(event) =>
													set("eligibleCategories", event.target.value)
												}
												placeholder="Slots, Table"
											/>
										</Field>
										<Field
											id="bonus-providers"
											label="Providers"
											hint="Comma-separated"
										>
											<Input
												className="h-10 rounded-lg"
												id="bonus-providers"
												value={values.eligibleProviders}
												onChange={(event) =>
													set("eligibleProviders", event.target.value)
												}
												placeholder="BigBang"
											/>
										</Field>
									</div>
								</section>

								<section
									aria-labelledby="bonus-audit-heading"
									className="space-y-4"
								>
									<SectionHeading
										id="bonus-audit-heading"
										title="Audit note"
										description="Add a short reason so this change stays traceable."
									/>
									<Field id="bonus-reason" label="Reason for change">
										<Textarea
											className="min-h-24 rounded-lg"
											id="bonus-reason"
											value={values.reason}
											onChange={(event) => set("reason", event.target.value)}
											placeholder="Explain the campaign or rule change"
											maxLength={500}
										/>
									</Field>
								</section>
							</div>
						</div>
					</div>

					<DialogFooter className="mt-0 shrink-0 border-t border-border bg-popover px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
						<div className="min-w-0 text-xs text-muted-foreground">
							{!values.reason.trim()
								? "Add a reason to enable saving."
								: !isCreate && !hasDefinitionChanges
									? "No changes to save."
									: isCreate || hasDefinitionChanges
										? "Your thumbnail and form changes will be saved together."
										: ""}
						</div>
						<div className="flex flex-col-reverse gap-2 sm:flex-row">
							<Button
								disabled={pending || uploading}
								onClick={() => onOpenChange(false)}
								type="button"
								variant="ghost"
							>
								Cancel
							</Button>
							<Button disabled={!canSubmit} type="submit">
								{pending || uploading ? (
									<LoaderCircleIcon className="animate-spin" />
								) : (
									<ShieldCheckIcon />
								)}
								{isCreate ? "Create bonus" : "Save changes"}
							</Button>
						</div>
					</DialogFooter>
				</form>
				{validationError || error ? (
					<div
						className="absolute right-5 bottom-20 left-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:right-8 sm:left-8"
						role="alert"
					>
						{validationError ?? error}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function SectionHeading({
	id,
	title,
	description,
}: {
	id: string;
	title: string;
	description: string;
}) {
	return (
		<div className="border-b border-border pb-3">
			<h3 className="text-sm font-medium" id={id}>
				{title}
			</h3>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
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
	id,
	label,
	hint,
	children,
}: {
	id?: string;
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			{children}
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function DefinitionListSkeleton() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading bonus definitions"
			className="block overflow-hidden rounded-xl border border-border"
		>
			<div className="h-10 animate-pulse border-b border-border bg-muted/30" />
			<div className="divide-y divide-border">
				{["one", "two", "three", "four", "five"].map((key) => (
					<div
						className="flex h-20 items-center gap-4 px-4"
						key={`bonus-definition-loading-${key}`}
					>
						<div className="size-14 animate-pulse rounded-lg bg-muted/50" />
						<div className="h-4 w-56 animate-pulse rounded bg-muted/50" />
						<div className="ml-auto h-4 w-24 animate-pulse rounded bg-muted/50" />
					</div>
				))}
			</div>
		</output>
	);
}

type BonusFormValues = {
	name: string;
	description: string;
	thumbnailUrl: string;
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
		name: "",
		description: "",
		thumbnailUrl: "",
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
		name: row.name,
		description: row.description ?? "",
		thumbnailUrl: row.thumbnailUrl ?? "",
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
		thumbnailUrl: values.thumbnailUrl || null,
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
				code: generatedBonusCode(values.name),
			})
		: updateAdminBonusDefinitionInputSchema.safeParse({
				...base,
				definitionId: editor.row.id,
			});
}

function generatedBonusCode(name: string) {
	const normalized = name
		.trim()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase();
	const base = normalized
		.replace(/[^A-Z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);

	if (!base) return "BONUS";
	return base.length >= 3 ? base : `BONUS-${base}`;
}

function formSnapshot(values: BonusFormValues) {
	return JSON.stringify({ ...values, reason: "" });
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
