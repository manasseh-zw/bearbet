"use client";

import { Popover } from "@base-ui/react/popover";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

export type MultiSelectOption = {
	value: string;
	label: string;
	group?: string;
	disabled?: boolean;
};

type MultiSelectProps = {
	ariaLabel: string;
	className?: string;
	emptyLabel?: string;
	maxVisibleTags?: number;
	onValuesChange: (values: string[]) => void;
	options: readonly MultiSelectOption[];
	searchPlaceholder?: string;
	values: readonly string[];
};

export function MultiSelect({
	ariaLabel,
	className,
	emptyLabel = "All",
	maxVisibleTags = 2,
	onValuesChange,
	options,
	searchPlaceholder = "Search options",
	values,
}: MultiSelectProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const selected = useMemo(() => new Set(values), [values]);
	const selectedOptions = useMemo(
		() => options.filter((option) => selected.has(option.value)),
		[options, selected],
	);
	const filteredOptions = useMemo(() => {
		const normalizedSearch = search.trim().toLocaleLowerCase();
		if (!normalizedSearch) return options;
		return options.filter((option) =>
			option.label.toLocaleLowerCase().includes(normalizedSearch),
		);
	}, [options, search]);
	const groups = useMemo(() => {
		const grouped = new Map<string, MultiSelectOption[]>();
		for (const option of filteredOptions) {
			const group = option.group ?? "";
			const groupOptions = grouped.get(group) ?? [];
			groupOptions.push(option);
			grouped.set(group, groupOptions);
		}
		return [...grouped.entries()];
	}, [filteredOptions]);

	function toggle(value: string) {
		const next = new Set(selected);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		onValuesChange(
			options
				.filter((option) => next.has(option.value))
				.map((option) => option.value),
		);
	}

	function remove(value: string) {
		onValuesChange(values.filter((currentValue) => currentValue !== value));
	}

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setSearch("");
			}}
		>
			<Popover.Trigger
				nativeButton={false}
				render={<div />}
				aria-label={ariaLabel}
				className={cn(
					"flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-2xl border border-transparent bg-input/50 px-2.5 py-1.5 text-sm text-foreground transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 data-open:border-ring data-open:ring-3 data-open:ring-ring/20",
					className,
				)}
			>
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
					{selectedOptions.length === 0 ? (
						<span className="text-muted-foreground">{emptyLabel}</span>
					) : (
						<>
							{selectedOptions.slice(0, maxVisibleTags).map((option) => (
								<span
									className="inline-flex max-w-36 items-center gap-1 rounded-xl bg-secondary px-2 py-0.5 text-xs font-medium"
									key={option.value}
								>
									<span className="truncate">{option.label}</span>
									<button
										aria-label={`Remove ${option.label}`}
										className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											remove(option.value);
										}}
										type="button"
									>
										<XIcon aria-hidden="true" className="size-3" />
									</button>
								</span>
							))}
							{selectedOptions.length > maxVisibleTags ? (
								<span className="rounded-xl bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
									+{selectedOptions.length - maxVisibleTags}
								</span>
							) : null}
						</>
					)}
				</div>
				<ChevronDownIcon
					aria-hidden="true"
					className="size-4 shrink-0 text-muted-foreground"
				/>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner
					align="start"
					className="isolate z-50"
					side="bottom"
					sideOffset={6}
				>
					<Popover.Popup className="dark w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:w-(--anchor-width) sm:min-w-72">
						<div className="flex items-center gap-2 border-b border-border p-2">
							<div className="relative min-w-0 flex-1">
								<SearchIcon
									aria-hidden="true"
									className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									aria-label={searchPlaceholder}
									autoFocus
									className="h-8 rounded-xl bg-background/60 pl-8"
									onChange={(event) => setSearch(event.target.value)}
									placeholder={searchPlaceholder}
									value={search}
								/>
							</div>
							{selectedOptions.length > 0 ? (
								<Button
									aria-label="Clear selections"
									onClick={() => onValuesChange([])}
									size="icon-xs"
									variant="ghost"
								>
									<XIcon />
								</Button>
							) : null}
						</div>
						<div className="max-h-72 overflow-y-auto p-1.5">
							{groups.length === 0 ? (
								<p className="px-2.5 py-8 text-center text-sm text-muted-foreground">
									No matching options.
								</p>
							) : (
								groups.map(([group, groupOptions], groupIndex) => (
									<div
										className={cn(
											groupIndex > 0 && "mt-1 border-t border-border pt-1",
										)}
										key={group || "ungrouped"}
									>
										{group ? (
											<p className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
												{group}
											</p>
										) : null}
										{groupOptions.map((option) => {
											const isSelected = selected.has(option.value);
											return (
												<button
													aria-pressed={isSelected}
													className="flex min-h-10 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
													disabled={option.disabled}
													key={option.value}
													onClick={() => toggle(option.value)}
													type="button"
												>
													<span
														aria-hidden="true"
														className={cn(
															"flex size-4.5 shrink-0 items-center justify-center rounded-[.3rem] border transition-colors",
															isSelected
																? "border-primary bg-primary text-primary-foreground"
																: "border-input bg-background/40",
														)}
													>
														{isSelected ? (
															<CheckIcon className="size-3.5" />
														) : null}
													</span>
													<span className="min-w-0 truncate">
														{option.label}
													</span>
												</button>
											);
										})}
									</div>
								))
							)}
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
