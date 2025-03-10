"use client"

import { Button } from "@/components/ui/Button"
import { Searchbar } from "@/components/ui/Searchbar"
import { RiDownloadLine } from "@remixicon/react"
import { Table } from "@tanstack/react-table"
import { useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { DataTableFilter } from "./DataTableFilter"
import { ViewOptions } from "./DataTableViewOptions"

/** For "status" => single select: "true" => banned, "false" => active */
const statuses = [
  { label: "Active", value: "false" },
  { label: "Banned", value: "true" },
];

/** For "role" => multi-check: "admin", "user", "superAdmin" */
const roles = [
  { label: "Super Admin", value: "superAdmin" },
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
];

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function Filterbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const [searchTerm, setSearchTerm] = useState("");
  const isFiltered = table.getState().columnFilters.length > 0;

  // Debounce the text input so we don't spam calls
  const debouncedSetFilterValue = useDebouncedCallback((value: string) => {
    // "owner" is the email column
    table.getColumn("owner")?.setFilterValue(value);
  }, 300);

  // On input change, update searchTerm state + call debounced setter
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSetFilterValue(value);
  }

  /** CSV export function - uses existing "Export" button. */
  function exportToCsv() {
    const selectedRows = table.getSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0
      ? selectedRows
      : table.getRowModel().rows;

    if (rowsToExport.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = ["id", "name", "email", "role", "banned"];
    const lines = [headers.join(",")];

    for (const row of rowsToExport) {
      const u = row.original as any;
      const safeName = (u.name ?? "").replace(/,/g, "");
      const bannedStr = u.banned ? "banned" : "active";

      lines.push([
        u.id,
        safeName,
        u.email,
        u.role,
        bannedStr
      ].join(","));
    }

    const csvString = lines.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "users-export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-x-6">
      {/* LEFT SIDE: filters + search */}
      <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-center">
        {/* Single select: "status" => "true"/"false" */}
        {table.getColumn("status")?.getIsVisible() && (
          <DataTableFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses}
            type="select"
          />
        )}

        {/* Multi check: "role" => "admin","user","superAdmin" */}
        {table.getColumn("role")?.getIsVisible() && (
          <DataTableFilter
            column={table.getColumn("role")}
            title="Roles"
            options={roles}
            type="checkbox"
          />
        )}

        {/* Email search => "owner" column */}
        {table.getColumn("owner")?.getIsVisible() && (
          <Searchbar
            type="search"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full sm:max-w-[250px]"
          />
        )}

        {/* If any filters are set, let user clear them */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="border border-gray-200 px-2 font-semibold text-indigo-600 
                       dark:border-gray-800 dark:text-indigo-500 
                       sm:border-none sm:py-1"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* RIGHT SIDE: Export + ViewOptions */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={exportToCsv}
          className="hidden gap-x-2 px-2 py-1.5 text-sm sm:text-xs lg:flex"
        >
          <RiDownloadLine className="size-4 shrink-0" aria-hidden="true" />
          Export
        </Button>

        <ViewOptions table={table} />
      </div>
    </div>
  );
}
