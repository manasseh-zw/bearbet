import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "#/components/ui/pagination";

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
	const pages = getPaginationPages(pageCount, pageIndex);

	return (
		<footer className="flex flex-col gap-3 px-1 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
			<p>
				Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
			</p>
			<Pagination className="mx-0 w-auto sm:justify-end">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							disabled={!hasPreviousPage}
							onClick={() => onPageChange(pageIndex - 1)}
						/>
					</PaginationItem>
					{pages.map((page) =>
						page === "ellipsis-start" || page === "ellipsis-end" ? (
							<PaginationItem key={page}>
								<PaginationEllipsis />
							</PaginationItem>
						) : (
							<PaginationItem key={page}>
								<PaginationLink
									aria-label={`Go to page ${page + 1}`}
									isActive={page === pageIndex}
									onClick={() => onPageChange(page)}
								>
									{page + 1}
								</PaginationLink>
							</PaginationItem>
						),
					)}
					<PaginationItem>
						<PaginationNext
							disabled={!hasNextPage}
							onClick={() => onPageChange(pageIndex + 1)}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</footer>
	);
}

function getPaginationPages(
	pageCount: number,
	pageIndex: number,
): Array<number | "ellipsis-start" | "ellipsis-end"> {
	if (pageCount <= 7) {
		return Array.from({ length: pageCount }, (_, page) => page);
	}

	const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [0];
	const start = Math.max(1, pageIndex - 1);
	const end = Math.min(pageCount - 2, pageIndex + 1);

	if (start > 1) pages.push("ellipsis-start");
	for (let page = start; page <= end; page += 1) pages.push(page);
	if (end < pageCount - 2) pages.push("ellipsis-end");
	pages.push(pageCount - 1);

	return pages;
}
