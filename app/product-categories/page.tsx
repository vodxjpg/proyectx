"use client"
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react"
import { authClient } from "@/utils/auth-client"
import { DataTable } from "@/components/ui/DataTable"
import { Button } from "@/components/ui/Button"
import { FormDrawer } from "@/components/ui/FormDrawer"
import { Row, ColumnDef } from "@tanstack/react-table"
import { ProgressBar } from "@tremor/react"
import { RiCloseLine, RiErrorWarningFill } from "react-icons/ri"

/** TYPES **/
interface ProductCategory {
  id: string
  name: string
  slug: string
  image: string | null
  parentId: string | null
  level?: number
}
interface ProductCategoryTree extends ProductCategory {
  children: ProductCategoryTree[]
}

/** BUILD TREE + FLATTEN **/
function buildCategoryTree(categories: ProductCategory[]): ProductCategoryTree[] {
  const map = new Map<string, ProductCategoryTree>()
  const roots: ProductCategoryTree[] = []

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of categories) {
    const node = map.get(cat.id)
    if (!node) continue
    if (cat.parentId) {
      const parentNode = map.get(cat.parentId)
      if (parentNode) parentNode.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function flattenCategoryTree(tree: ProductCategoryTree[], level = 0): ProductCategory[] {
  let flat: ProductCategory[] = []
  for (const node of tree) {
    flat.push({ ...node, level })
    if (node.children.length > 0) {
      flat = flat.concat(flattenCategoryTree(node.children, level + 1))
    }
  }
  return flat
}

export default function ProductCategoriesPage() {
  // 1) Grab the org from better-auth
  const { data: activeOrg } = authClient.useActiveOrganization()

  // 2) Local states
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // 3) Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)

  // 4) Form fields
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [parentId, setParentId] = useState<string | null>(null)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")

  // 5) File states (for optional image upload)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)

  /** =======================
   *    FETCH CATEGORIES
   * ======================= */
  async function fetchCategories() {
    try {
      setLoading(true)
      setError("")
      if (!activeOrg) {
        // No org means no categories to fetch
        setLoading(false)
        return
      }
      const res = await fetch("/api/products/categories")
      if (!res.ok) throw new Error("Failed to fetch product categories")
      const data = await res.json()
      setCategories(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeOrg) {
      fetchCategories()
    } else {
      setLoading(false)
    }
  }, [activeOrg])

  /** =======================
   *    BUILD & FLATTEN
   * ======================= */
  const tree = React.useMemo(() => buildCategoryTree(categories), [categories])
  const flatCategories = React.useMemo(() => flattenCategoryTree(tree), [tree])

  /** =======================
   *    DATATABLE COLUMNS
   * ======================= 
   *  We add a "select" column for row selection checkboxes,
   *  then the image, name, slug, and actions columns.
   */
  const columns = React.useMemo<ColumnDef<ProductCategory>[]>(
    () => [
      // Checkbox column for multi-select
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
      // Image column
      {
        accessorKey: "image",
        header: "Image",
        cell: ({ row }) => {
          const { image, name } = row.original
          if (image) {
            return (
              <img
                src={image}
                alt={name}
                className="w-10 h-10 object-cover rounded-full"
              />
            )
          }
          // fallback to initials
          const words = name.trim().split(/\s+/)
          let initials = ""
          if (words.length >= 2) {
            initials = words[0][0] + words[1][0]
          } else {
            initials = words[0].slice(0, 2)
          }
          initials = initials.toUpperCase()
          return (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
              {initials}
            </div>
          )
        },
      },
      // Name column
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const level = row.original.level ?? 0
          return (
            <div style={{ paddingLeft: `${level * 20}px` }}>
              {row.original.name}
            </div>
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
              // Prevent row-click from interfering
              e.stopPropagation()
              handleEditCategory(row.original)
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

  /** =======================
   *    BULK DELETE
   * ======================= */
  const handleBulkDelete = async (selectedRows: Row<ProductCategory>[]) => {
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} categories?`)) {
      return
    }
    try {
      const ids = selectedRows.map((row) => row.original.id)
      // Perform all deletes in parallel
      await Promise.all(
        ids.map((id) => fetch(`/api/products/categories/${id}`, { method: "DELETE" }))
      )
      fetchCategories()
    } catch (err) {
      console.error("Error bulk-deleting categories:", err)
      alert("Oops, something went wrong deleting the selected categories!")
    }
  }

  /** =======================
   *    SINGLE ADD/EDIT/DELETE
   * ======================= */
  function handleAddCategory() {
    setEditingCategory(null)
    setIsDrawerOpen(true)
  }

  function handleEditCategory(cat: ProductCategory) {
    setEditingCategory(cat)
    setIsDrawerOpen(true)
  }

  async function handleDeleteCategory() {
    if (!editingCategory) return
    if (!confirm("Are you sure you want to delete this category?")) return
    try {
      await fetch(`/api/products/categories/${editingCategory.id}`, {
        method: "DELETE",
      })
      setIsDrawerOpen(false)
      fetchCategories()
    } catch (err) {
      console.error("Error deleting category:", err)
      alert("Oops, something went wrong deleting that category!")
    }
  }

  /** =======================
   *    DRAWER FORM LOGIC
   * ======================= */
  // Reset form whenever the drawer closes
  useEffect(() => {
    if (!isDrawerOpen) {
      resetForm()
    } else if (editingCategory) {
      // Edit mode
      setName(editingCategory.name)
      setSlug(editingCategory.slug)
      setParentId(editingCategory.parentId)
      setSelectedFile(null)
      setIsSlugManuallyEdited(true)
    } else {
      // Add mode
      resetForm()
    }
  }, [isDrawerOpen])

  function resetForm() {
    setName("")
    setSlug("")
    setParentId(null)
    setSelectedFile(null)
    setUploadError("")
    setUploadProgress(0)
    setIsSlugManuallyEdited(false)
    setSlugStatus("idle")
  }

  // Auto-generate slug from name unless manually edited
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
        // IMPORTANT: we call /api/products/categories/slug-check
        // matching your route: app/api/products/categories/slug-check/route.ts
        const url = new URL("/api/products/categories/slug-check", window.location.origin)
        url.searchParams.append("slug", slug)
        if (editingCategory) {
          url.searchParams.append("excludeId", editingCategory.id)
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
  }, [slug, editingCategory])

  // Possibly upload file
  async function uploadFileIfNeeded(): Promise<string | null> {
    // If no file chosen, keep existing image (if editing) or null
    if (!selectedFile) {
      return editingCategory?.image ?? null
    }
    setUploadError("")
    setUploadProgress(0)

    const valid = ["image/png", "image/webp", "image/jpeg"]
    if (!valid.includes(selectedFile.type)) {
      setUploadError("Invalid format. Allowed: PNG, WEBP, JPG")
      return null
    }
    if (selectedFile.size > 1024 * 1024) {
      setUploadError("File too large (max 1MB).")
      return null
    }

    try {
      const fd = new FormData()
      fd.append("file", selectedFile)

      const resp = await fetch("/api/products/categories/upload", {
        method: "POST",
        body: fd,
      })
      if (!resp.ok) {
        const eBody = await resp.json()
        throw new Error(eBody.error || "Upload failed")
      }
      const data = await resp.json()
      return data.imageURL as string
    } catch (err: any) {
      setUploadError(err.message)
      return null
    }
  }

  // Submit form (create or update)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (slugStatus === "taken") {
      alert("Slug is taken. Please choose another.")
      return
    }
    if (slugStatus === "checking") {
      alert("Please wait for the slug check to complete.")
      return
    }

    const finalImageURL = await uploadFileIfNeeded()
    // If there's an actual upload error, abort
    if (uploadError) {
      return
    }

    const payload = {
      name,
      slug,
      parentId,
      image: finalImageURL,
    }

    try {
      if (!editingCategory) {
        // CREATE
        const r = await fetch("/api/products/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!r.ok) throw new Error("Failed to create category")
      } else {
        // UPDATE
        const r = await fetch(`/api/products/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!r.ok) throw new Error("Failed to update category")
      }
      setIsDrawerOpen(false)
      fetchCategories()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Optional row click (if you want it)
  const handleRowClick = (row: Row<ProductCategory>) => {
    // e.g., navigate or do something else on row click
  }

  /** =======================
   *    RENDER
   * ======================= */
  if (loading) {
    return <div className="p-4 text-center">Loading categories...</div>
  }
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }
  if (!activeOrg) {
    return (
      <div className="p-4 text-center">
        <p>No active organization selected. Please pick one.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:mx-auto sm:max-w-6xl py-24 mt-5">
      <div className="lg:flex items-center justify-between mb-4 flex-md-col">
        <div>
          <h1 className="font-semibold text-lg">Product Categories</h1>
          <p className="mb-3 lg:mb-0">
            Manage your product categories, including nested child categories.
          </p>
        </div>
        <Button onClick={handleAddCategory}>Add Category</Button>
      </div>

      {/* Our DataTable that supports multi-select & bulk delete */}
      <DataTable
        columns={columns}
        data={flatCategories}
        onRowClick={handleRowClick}
        onBulkDelete={handleBulkDelete}
      />

      {/* Drawer for Add/Edit */}
      <FormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingCategory ? "Edit Category" : "Add Category"}
        onDelete={editingCategory ? handleDeleteCategory : undefined}
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
              <p className="text-sm text-gray-500 mt-1">
                Checking availability...
              </p>
            )}
            {slugStatus === "available" && (
              <p className="text-sm text-green-500 mt-1">Slug is available</p>
            )}
            {slugStatus === "taken" && (
              <p className="text-sm text-red-500 mt-1">Slug is already taken</p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">Image (optional)</label>
            <div className="border-2 border-dashed p-3 rounded text-center">
              <p>Drag and drop or</p>
              <label
                htmlFor="file-upload"
                className="text-blue-600 underline cursor-pointer"
              >
                choose a file
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] ?? null)
                  setUploadError("")
                  setUploadProgress(0)
                }}
              />
              {selectedFile && (
                <div className="mt-3 bg-gray-100 p-2 rounded relative">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="absolute top-1 right-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <RiCloseLine size={16} />
                  </button>
                  <p className="text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}
              {uploadError && (
                <div className="mt-2 text-red-500 text-sm flex items-center space-x-1">
                  <RiErrorWarningFill size={16} />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadProgress > 0 && (
                <>
                  <ProgressBar value={uploadProgress} className="mt-2" />
                  <span className="text-xs text-gray-600">
                    {uploadProgress}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Parent Category</label>
            <select
              className="border p-2 w-full"
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value || null)}
            >
              <option value="">None</option>
              {flatCategories
                .filter((fc) => fc.id !== editingCategory?.id)
                .map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {"—".repeat(fc.level || 0)} {fc.name}
                  </option>
                ))}
            </select>
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
            {editingCategory ? "Update" : "Create"}
          </Button>
        </form>
      </FormDrawer>
    </div>
  )
}
