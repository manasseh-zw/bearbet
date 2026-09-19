import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoreHorizontalIcon,
} from "lucide-react";
import type * as React from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			aria-label="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			data-slot="pagination"
			{...props}
		/>
	);
}

function PaginationContent({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			className={cn("flex items-center gap-1", className)}
			data-slot="pagination-content"
			{...props}
		/>
	);
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & React.ComponentProps<typeof Button>;

function PaginationLink({
	className,
	isActive,
	...props
}: PaginationLinkProps) {
	return (
		<Button
			aria-current={isActive ? "page" : undefined}
			className={cn(className)}
			data-active={isActive}
			data-slot="pagination-link"
			size="icon"
			variant={isActive ? "outline" : "ghost"}
			{...props}
		/>
	);
}

function PaginationPrevious({
	className,
	children = "Previous",
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			className={cn("w-auto gap-1.5 px-2", className)}
			{...props}
		>
			<ChevronLeftIcon data-icon="inline-start" />
			<span className="hidden sm:inline">{children}</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	children = "Next",
	...props
}: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			className={cn("w-auto gap-1.5 px-2", className)}
			{...props}
		>
			<span className="hidden sm:inline">{children}</span>
			<ChevronRightIcon data-icon="inline-end" />
		</PaginationLink>
	);
}

function PaginationEllipsis({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden="true"
			className={cn("flex size-8 items-center justify-center", className)}
			data-slot="pagination-ellipsis"
			{...props}
		>
			<MoreHorizontalIcon />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
