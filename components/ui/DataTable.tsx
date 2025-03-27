// components/ui/DataTable.tsx
"use client"

import { useState } from "react"
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/Button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table"

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  onRowClick?: (row: Row<TData>) => void
  onBulkDelete?: (selectedRows: Row<TData>[]) => void
  pageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  onRowClick,
  onBulkDelete,
  pageSize = 20,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({})
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    initialState: { pagination: { pageIndex: 0, pageSize } },
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
  })

  const selectedRows = table.getSelectedRowModel().rows

  return (
    <div className="space-y-3">
      <Table>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHeaderCell key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHeaderCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className="cursor-pointer hover:bg-gray-50"
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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {selectedRows.length > 0 && onBulkDelete && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white p-4 rounded shadow-lg flex items-center justify-center space-x-4">
          <span>{selectedRows.length} selected</span>
          <Button
            variant="destructive"
            onClick={() => onBulkDelete(selectedRows)}
          >
            Delete Selected
          </Button>
          <Button
            variant="secondary"
            onClick={() => table.resetRowSelection()}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}