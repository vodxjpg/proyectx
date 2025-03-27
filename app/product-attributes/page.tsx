"use client"
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react"
import Link from "next/link"

import { Row, ColumnDef } from "@tanstack/react-table"
import { authClient } from "@/utils/auth-client"

import { DataTable } from "@/components/ui/DataTable" // Your multi-select DataTable
import { Button } from "@/components/ui/Button"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { RiCloseLine, RiErrorWarningFill } from "react-icons/ri"
import { ProgressBar } from "@tremor/react"

/** TYPES **/
interface ProductAttribute {
  id: string
  name: string
  slug: string
  organizationId: string
}

/** MAIN COMPONENT **/
export default function ProductAttributesPage() {
  const { data: activeOrg } = authClient.useActiveOrganization()

  // States for data & loading
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingAttr, setEditingAttr] = useState<ProductAttribute | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")

  /** ===========================
   * Fetch Attributes from API
   * =========================== */
  async function fetchAttributes() {
    try {
      setLoading(true)
      setError("")
      if (!activeOrg) {
        // No org, skip fetch
        setLoading(false)
        return
      }
      const res = await fetch("/api/products/attributes")
      if (!res.ok) throw new Error("Failed to fetch product attributes")
      const data = await res.json()
      setAttributes(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeOrg) {
      fetchAttributes()
    } else {
      setLoading(false)
    }
  }, [activeOrg])

  /** ===========================
   * Columns (with multi-select)
   * =========================== */
  const columns = React.useMemo<ColumnDef<ProductAttribute>[]>(
    () => [
      // Checkbox column for row selection
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        ),
      },
      // Name column - clickable link to Terms
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const { id, name } = row.original
          return (
            <Link href={`/product-attributes/${id}/terms`} className="text-blue-600 underline">
              {name}
            </Link>
          )
        },
      },
      // Slug column
      {
        accessorKey: "slug",
        header: "Slug",
      },
      // Actions column
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(row.original)
            }}
            className="focus:outline-none text-gray-500 hover:text-gray-700"
          >
            ...
          </button>
        ),
      },
    ],
    []
  )

  /** ===========================
   * Bulk Delete
   * =========================== */
  async function handleBulkDelete(selectedRows: Row<ProductAttribute>[]) {
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} attributes?`)) {
      return
    }
    try {
      const ids = selectedRows.map((row) => row.original.id)
      // Perform each delete in parallel
      await Promise.all(
        ids.map((id) =>
          fetch("/api/products/attributes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        )
      )
      fetchAttributes()
    } catch (err) {
      console.error("Error deleting attributes:", err)
      alert("Oops, something went wrong deleting the selected attributes!")
    }
  }

  /** ===========================
   * Single Add / Edit / Delete
   * =========================== */
  function handleAdd() {
    setEditingAttr(null)
    setIsDrawerOpen(true)
  }

  function handleEdit(attr: ProductAttribute) {
    setEditingAttr(attr)
    setIsDrawerOpen(true)
  }

  async function handleDelete() {
    // Called from the Drawer
    if (!editingAttr) return
    if (!confirm("Are you sure you want to delete this attribute?")) return
    try {
      const res = await fetch("/api/products/attributes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingAttr.id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      setIsDrawerOpen(false)
      fetchAttributes()
    } catch (err) {
      console.error("Error deleting attribute:", err)
      alert("Oops, something went wrong deleting that attribute!")
    }
  }

  /** ===========================
   * Drawer Form Logic
   * =========================== */
  // Reset form whenever the drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      resetForm()
    } else if (editingAttr) {
      // Edit mode
      setName(editingAttr.name)
      setSlug(editingAttr.slug)
      setIsSlugManuallyEdited(true)
    } else {
      // Add mode
      resetForm()
    }
  }, [isDrawerOpen])

  function resetForm() {
    setName("")
    setSlug("")
    setIsSlugManuallyEdited(false)
    setSlugStatus("idle")
  }

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && name) {
      const autoSlug = name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
      setSlug(autoSlug)
    }
  }, [name, isSlugManuallyEdited])

  // Check slug availability
  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle")
      return
    }
    let cancel = false
    const checkSlug = async () => {
      setSlugStatus("checking")
      try {
        // We'll call the new /api/products/attributes/slug-check route
        const url = new URL("/api/products/attributes/slug-check", window.location.origin)
        url.searchParams.append("slug", slug)
        if (editingAttr) {
          url.searchParams.append("excludeId", editingAttr.id)
        }
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error("Failed to check slug availability")
        const data = await res.json()
        if (!cancel) {
          setSlugStatus(data.exists ? "taken" : "available")
        }
      } catch (err) {
        if (!cancel) {
          setSlugStatus("idle")
        }
      }
    }
    const timer = setTimeout(checkSlug, 300)
    return () => {
      cancel = true
      clearTimeout(timer)
    }
  }, [slug, editingAttr])

  // Submit form (Add / Edit)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slugStatus === "taken") {
      alert("Slug is already taken. Please choose a different one.")
      return
    }
    if (slugStatus === "checking") {
      alert("Please wait for the slug check to complete.")
      return
    }

    const payload = { name, slug }
    try {
      if (!editingAttr) {
        // CREATE
        const r = await fetch("/api/products/attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!r.ok) throw new Error("Failed to create attribute")
      } else {
        // UPDATE
        const r = await fetch("/api/products/attributes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            id: editingAttr.id,
          }),
        })
        if (!r.ok) throw new Error("Failed to update attribute")
      }

      setIsDrawerOpen(false)
      fetchAttributes()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Optional row click
  const handleRowClick = (row: Row<ProductAttribute>) => {
    // If you want to do something on row click, do it here
  }

  /** ===========================
   * Render
   * =========================== */
  if (loading) {
    return <div className="p-4 text-center">Loading attributes...</div>
  }
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }
  if (!activeOrg) {
    return <div className="p-4 text-center">Please select an organization.</div>
  }

  return (
    <div className="p-6 sm:mx-auto sm:max-w-6xl py-24 mt-5">
      {/* Header */}
      <div className="lg:flex items-center justify-between mb-4 flex-md-col">
        <div>
          <h1 className="font-semibold text-lg">Product Attributes</h1>
          <p className="mb-3 lg:mb-0">
            Manage product attributes like Brand, Color, etc.
          </p>
        </div>
        <Button onClick={handleAdd}>Add Attribute</Button>
      </div>

      {/* DataTable with multi-select & onBulkDelete */}
      <DataTable
        columns={columns}
        data={attributes}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
      />

      {/* Drawer for single Add/Edit */}
      <FormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingAttr ? "Edit Attribute" : "Add Attribute"}
        onDelete={editingAttr ? handleDelete : undefined}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input
              type="text"
              required
              className="border p-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Slug</label>
            <input
              type="text"
              required
              className="border p-2 w-full"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setIsSlugManuallyEdited(true)
              }}
            />
            {slugStatus === "checking" && (
              <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
            )}
            {slugStatus === "available" && (
              <p className="text-sm text-green-500 mt-1">Slug is available</p>
            )}
            {slugStatus === "taken" && (
              <p className="text-sm text-red-500 mt-1">Slug is already taken</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full mt-2"
            disabled={
              slugStatus === "taken" ||
              slugStatus === "checking" ||
              !slug ||
              !name
            }
          >
            {editingAttr ? "Update" : "Create"}
          </Button>
        </form>
      </FormDrawer>
    </div>
  )
}
