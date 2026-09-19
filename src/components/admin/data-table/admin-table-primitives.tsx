import type { ReactNode } from "react";

import { RefreshCcwIcon } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

type AdminTableToolbarProps = {
	ariaLabel: string;
	children: ReactNode;
	className?: string;
};

export function AdminTableToolbar({
	ariaLabel,
	children,
	className,
}: AdminTableToolbarProps) {
	return (
		<div
			aria-label={ariaLabel}
			className={cn(
				"flex flex-col gap-3 py-5 lg:flex-row lg:items-center",
				className,
			)}
			role="toolbar"
		>
			{children}
		</div>
	);
}

type AdminTableMobileListProps<TData> = {
	getKey: (item: TData) => string;
	items: TData[];
	renderItem: (item: TData) => ReactNode;
};

export function AdminTableMobileList<TData>({
	getKey,
	items,
	renderItem,
}: AdminTableMobileListProps<TData>) {
	return (
		<ul className="grid gap-2 md:hidden">
			{items.map((item) => (
				<li key={getKey(item)}>{renderItem(item)}</li>
			))}
		</ul>
	);
}

type AdminTableLoadingProps = {
	rowCount?: number;
};

export function AdminTableLoading({
	rowCount = 6,
}: AdminTableLoadingProps = {}) {
	return (
		<output
			aria-busy="true"
			aria-label="Loading table"
			className="grid gap-3 rounded-xl border border-border p-4"
		>
			<div className="grid gap-3">
				{Array.from({ length: rowCount }, (_, index) => `loading-${index}`).map(
					(key) => (
						<div className="flex items-center gap-3" key={key}>
							<Skeleton className="size-9" />
							<Skeleton className="h-4 flex-1" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-28" />
						</div>
					),
				)}
			</div>
		</output>
	);
}

type AdminTableErrorProps = {
	description?: string;
	onRetry: () => void;
	retryLabel?: string;
	title: string;
};

export function AdminTableError({
	description = "Check the connection and try again.",
	onRetry,
	retryLabel = "Retry",
	title,
}: AdminTableErrorProps) {
	return (
		<div
			className="grid gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
			role="alert"
		>
			<p className="font-medium">{title}</p>
			<p className="text-sm text-muted-foreground">{description}</p>
			<Button onClick={onRetry} variant="outline">
				<RefreshCcwIcon data-icon="inline-start" />
				{retryLabel}
			</Button>
		</div>
	);
}

type AdminTableEmptyProps = {
	action?: ReactNode;
	description: string;
	icon?: ReactNode;
	title: string;
};

export function AdminTableEmpty({
	action,
	description,
	icon,
	title,
}: AdminTableEmptyProps) {
	return (
		<div className="grid gap-3 rounded-xl border border-dashed border-border p-10 text-center">
			{icon ? (
				<div className="mx-auto text-muted-foreground">{icon}</div>
			) : null}
			<p className="font-medium">{title}</p>
			<p className="text-sm text-muted-foreground">{description}</p>
			{action}
		</div>
	);
}
