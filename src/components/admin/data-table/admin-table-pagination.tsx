import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "#/components/ui/button";

type AdminTablePaginationProps = {
	pageCount: number;
	pageIndex: number;
	onPageChange: (pageIndex: number) => void;
};

export function AdminTablePagination({
	pageCount,
	pageIndex,
	onPageChange,
}: AdminTablePaginationProps) {
	const hasPreviousPage = pageIndex > 0;
	const hasNextPage = pageIndex < pageCount - 1;

	return (
		<div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
			<span>
				Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
			</span>
			<div className="flex items-center gap-1">
				<Button
					aria-label="Previous page"
					disabled={!hasPreviousPage}
					onClick={() => onPageChange(pageIndex - 1)}
					size="icon-sm"
					variant="ghost"
				>
					<ChevronLeftIcon data-icon="inline-start" />
				</Button>
				<Button
					aria-label="Next page"
					disabled={!hasNextPage}
					onClick={() => onPageChange(pageIndex + 1)}
					size="icon-sm"
					variant="ghost"
				>
					<ChevronRightIcon data-icon="inline-end" />
				</Button>
			</div>
		</div>
	);
}
