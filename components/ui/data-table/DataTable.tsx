// DataTable.tsx
"use client"

import React from "react"
import {
  flexRender,
  Table as ReactTableType
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table"
import { cx } from "@/components/lib/utils"

import { Filterbar } from "./DataTableFilterbar"
import { DataTableBulkEditor } from "./DataTableBulkEditor"
import { DataTablePagination } from "./DataTablePagination"

interface DataTableProps<TData> {
  table: ReactTableType<TData>
}

// Here is the named export "DataTable"
export function DataTable<TData>({ table }: DataTableProps<TData>) {
  const rowSelection = table.getState().rowSelection

  return (
    <div className="space-y-3">
      {/* Possibly use your Filterbar or other UI up top */}
      <Filterbar table={table} />

      <div className="relative overflow-hidden overflow-x-auto">
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHeaderCell key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHeaderCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length}>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Bulk editor, pagination, etc. */}
        <DataTableBulkEditor table={table} rowSelection={rowSelection} />
      </div>

      <DataTablePagination table={table} pageSize={20} />
    </div>
  )
}
