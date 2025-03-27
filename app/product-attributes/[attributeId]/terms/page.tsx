"use client"
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react"
import Link from "next/link"

import { Row, ColumnDef } from "@tanstack/react-table"
import { authClient } from "@/utils/auth-client"

import { DataTable } from "@/components/ui/DataTable" // Your multi-select DataTable
import { Button } from "@/components/ui/Button"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { RiCloseLine } from "react-icons/ri"
import { ProgressBar } from "@tremor/react"
import { useRouter } from "next/navigation"

interface ProductAttributeTerm {
  id: string
  attributeId: string
  name: string
  slug: string
  organizationId: string
}

export default function ProductAttributeTermsPage({
  params,
}: {
  params: { attributeId: string }
}) {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const router = useRouter()

  // States for data/loading
  const [terms, setTerms] = useState<ProductAttributeTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<ProductAttributeTerm | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")

  /** ================================
   *  1) Fetch Terms
   * ================================ */
  async function fetchTerms() {
    try {
      setLoading(true)
      setError("")
      if (!activeOrg) {
        setLoading(false)
        return
      }
      // GET all terms for the specified attribute
      const res = await fetch(`/api/products/attribute-terms?attributeId=${params.attributeId}`)
      if (!res.ok) throw new Error("Failed to fetch terms.")
      const data = await res.json()
      setTerms(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeOrg) {
      fetchTerms()
    } else {
      setLoading(false)
    }
  }, [activeOrg, params.attributeId])

  /** ================================
   *  2) DataTable Columns
   * ================================ */
  const columns = React.useMemo<ColumnDef<ProductAttributeTerm>[]>(
    () => [
      // 2a) A selection checkbox column for multi-select
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
      // 2b) Name column
      {
        accessorKey: "name",
        header: "Name",
      },
      // 2c) Slug column
      {
        accessorKey: "slug",
        header: "Slug",
      },
      // 2d) Actions column
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

  /** ================================
   *  3) Bulk Delete
   * ================================ */
  async function handleBulkDelete(selectedRows: Row<ProductAttributeTerm>[]) {
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} terms?`)) {
      return
    }
    try {
      const ids = selectedRows.map((row) => row.original.id)
      // We do a bulk delete. We'll POST the IDs to an endpoint or do them in parallel
      // For now, let's mimic the pattern from product-attributes:
      await Promise.all(
        ids.map((id) =>
          fetch("/api/products/attribute-terms", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        )
      )
      fetchTerms()
    } catch (err) {
      console.error("Error deleting terms:", err)
      alert("Oops, something went wrong deleting those terms!")
    }
  }

  /** ================================
   *  4) Single Add / Edit / Delete
   * ================================ */
  function handleAdd() {
    setEditingTerm(null)
    setIsDrawerOpen(true)
  }

  function handleEdit(term: ProductAttributeTerm) {
    setEditingTerm(term)
    setIsDrawerOpen(true)
  }

  async function handleDeleteTerm() {
    if (!editingTerm) return
    if (!confirm("Are you sure you want to delete this term?")) return
    try {
      const resp = await fetch("/api/products/attribute-terms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTerm.id }),
      })
      if (!resp.ok) {
        const errBody = await resp.json()
        throw new Error(errBody.error || "Failed to delete term.")
      }
      setIsDrawerOpen(false)
      fetchTerms()
    } catch (err) {
      console.error("Error deleting term:", err)
      alert("Oops, something went wrong deleting that term!")
    }
  }

  /** ================================
   *  5) Drawer Form Logic
   * ================================ */
  // Reset the form when the drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      resetForm()
    } else if (editingTerm) {
      // Edit mode
      setName(editingTerm.name)
      setSlug(editingTerm.slug)
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
        // We'll call /api/products/attribute-terms/slug-check
        const url = new URL("/api/products/attribute-terms/slug-check", window.location.origin)
        url.searchParams.append("attributeId", params.attributeId)
        url.searchParams.append("slug", slug)
        if (editingTerm) {
          url.searchParams.append("excludeId", editingTerm.id)
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
  }, [slug, editingTerm, params.attributeId])

  // Submit the form (create/update)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (slugStatus === "taken") {
      alert("That slug is already taken.")
      return
    }
    if (slugStatus === "checking") {
      alert("Please wait for the slug check to finish.")
      return
    }

    const payload = {
      attributeId: params.attributeId,
      name,
      slug,
    }
    try {
      if (!editingTerm) {
        // CREATE
        const r = await fetch("/api/products/attribute-terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!r.ok) {
          const errBody = await r.json()
          throw new Error(errBody.error || "Failed to create term.")
        }
      } else {
        // UPDATE
        const r = await fetch("/api/products/attribute-terms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingTerm.id }),
        })
        if (!r.ok) {
          const errBody = await r.json()
          throw new Error(errBody.error || "Failed to update term.")
        }
      }
      setIsDrawerOpen(false)
      fetchTerms()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Optional row click
  const handleRowClick = (row: Row<ProductAttributeTerm>) => {
    // if you want to do something on row click, do it here
  }

  /** ================================
   *  6) Render
   * ================================ */
  if (loading) {
    return <div className="p-4 text-center">Loading terms...</div>
  }
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }
  if (!activeOrg) {
    return (
      <div className="p-4 text-center">
        <p>Please select an organization.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:mx-auto sm:max-w-6xl py-24 mt-5">
      {/* Header */}
      <div className="lg:flex items-center justify-between mb-4 flex-md-col">
        <div>
          <h1 className="font-semibold text-lg">Attribute Terms</h1>
          <p className="mb-3 lg:mb-0">
            Manage terms for this attribute (ID: {params.attributeId}).
          </p>
        </div>
        <div className="space-x-2">
          <Button onClick={handleAdd}>Add Term</Button>
          <Button onClick={() => router.push("/product-attributes")}>
            Back to Attributes
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={terms}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
      />

      <FormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingTerm ? "Edit Term" : "Add Term"}
        onDelete={editingTerm ? handleDeleteTerm : undefined}
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
            {editingTerm ? "Update" : "Create"}
          </Button>
        </form>
      </FormDrawer>
    </div>
  )
}
