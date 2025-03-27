// components/OrganizationColumns.tsx
"use client"

import { ColumnDef, createColumnHelper } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/Checkbox"
import { Button } from "@/components/ui/Button"
import { Ellipsis } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { DataTableColumnHeader } from "@/components/ui/DataTableColumnHeader"

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
}

const columnHelper = createColumnHelper<Organization>()

export const getOrganizationColumns = ({
  onEditClick,
}: {
  onEditClick: (row: Organization) => void
}): ColumnDef<Organization>[] => [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomeRowsSelected()
            ? "indeterminate"
            : false
        }
        onCheckedChange={() => table.toggleAllPageRowsSelected()}
        className="translate-y-0.5"
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => row.toggleSelected()}
        className="translate-y-0.5"
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { displayName: "Select" },
  }),
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/organizations/${row.original.slug}`}
        className="text-tremor-brand hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
    enableSorting: true,
    meta: { className: "text-left", displayName: "Name" },
  }),
  columnHelper.accessor("slug", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Slug" />
    ),
    enableSorting: true,
    meta: { className: "text-left", displayName: "Slug" },
  }),
  columnHelper.accessor("createdAt", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ getValue }) => format(new Date(getValue() as string), "MMM dd, yyyy"),
    enableSorting: true,
    meta: { className: "text-right", displayName: "Created At" },
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation() // Prevent row click from triggering
          onEditClick(row.original)
        }}
        className="group aspect-square p-1.5 hover:border hover:border-gray-300 data-[state=open]:border-gray-300 data-[state=open]:bg-gray-50 hover:dark:border-gray-700 data-[state=open]:dark:border-gray-700 data-[state=open]:dark:bg-gray-900"
      >
        <Ellipsis
          className="size-4 shrink-0 text-gray-500 group-hover:text-gray-700 group-data-[state=open]:text-gray-700 group-hover:dark:text-gray-300 group-data-[state=open]:dark:text-gray-300"
          aria-hidden="true"
        />
      </Button>
    ),
    enableSorting: false,
    enableHiding: false,
    meta: { className: "text-right", displayName: "Actions" },
  }),
]