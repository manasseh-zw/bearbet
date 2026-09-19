import {
	type ColumnDef,
	columnFilteringFeature,
	columnVisibilityFeature,
	flexRender,
	type Row,
	type RowData,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

import { Checkbox } from "#/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";

export const adminTableFeatures = tableFeatures({
	columnFilteringFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
});

export type AdminTableColumn<TData extends RowData> = ColumnDef<
	typeof adminTableFeatures,
	TData
>;

export type AdminDataTableProps<TData extends RowData> = {
	columns: Array<AdminTableColumn<TData>>;
	data: TData[];
	emptyMessage?: ReactNode;
	enableRowSelection?:
		| boolean
		| ((row: Row<typeof adminTableFeatures, TData>) => boolean);
	footer?: ReactNode;
	getRowId?: (
		originalRow: TData,
		index: number,
		parent?: Row<typeof adminTableFeatures, TData>,
	) => string;
	manualPagination?: boolean;
	pageCount?: number;
	rowCount?: number;
	tableClassName?: string;
};

export function AdminDataTable<TData extends RowData>({
	columns,
	data,
	emptyMessage = "No results found.",
	enableRowSelection = false,
	footer,
	getRowId,
	manualPagination = false,
	pageCount,
	rowCount,
	tableClassName,
}: AdminDataTableProps<TData>) {
	const table = useTable({
		columns,
		data,
		enableRowSelection,
		features: adminTableFeatures,
		...(getRowId ? { getRowId } : {}),
		...(manualPagination ? { manualPagination } : {}),
		...(pageCount !== undefined ? { pageCount } : {}),
		...(rowCount !== undefined ? { rowCount } : {}),
	});

	return (
		<div className="overflow-x-auto">
			<Table className={tableClassName}>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length > 0 ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								data-state={row.getIsSelected() ? "selected" : undefined}
								key={row.id}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell className="h-24 text-center" colSpan={columns.length}>
								{emptyMessage}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
				{footer}
			</Table>
		</div>
	);
}

export function createRowSelectionColumn<
	TData extends RowData,
>(): AdminTableColumn<TData> {
	return {
		cell: ({ row }) => (
			<Checkbox
				aria-label="Select row"
				checked={row.getIsSelected()}
				disabled={!row.getCanSelect()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
			/>
		),
		header: ({ table }) => {
			const isAllSelected = table.getIsAllPageRowsSelected();
			const isSomeSelected = table.getIsSomePageRowsSelected();

			return (
				<Checkbox
					aria-label="Select all rows"
					checked={isAllSelected}
					indeterminate={isSomeSelected && !isAllSelected}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				/>
			);
		},
		id: "select",
	};
}
