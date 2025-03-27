"use client";

import React, { useEffect, useState } from "react";
import { authClient } from "@/utils/auth-client";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Row, ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

// -------------- DROPDOWN COMPONENT (simple) --------------
function ActionsDropdown({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="text-gray-500 hover:text-gray-800 focus:outline-none"
      >
        •••
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg py-1 z-50"
        >
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="block w-full text-left px-3 py-1 hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** We'll match the shape from the new API */
interface ProductRow {
  id: string;
  name: string;
  type: "simple" | "variable";
  sku: string | null;
  imageURL: string | null;
  price: number | null; 
  variableMinPrice: number | null; 
  variableMaxPrice: number | null; 
  totalStock: number;    
  categories: { categoryId: string; categoryName: string }[];
}

export default function ProductsPage() {
  const { data: activeOrg } = authClient.useActiveOrganization();
  const router = useRouter();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch products from GET /api/products
  async function fetchProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeOrg) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [activeOrg]);

  // DataTable columns
  const columns = React.useMemo<ColumnDef<ProductRow>[]>(
    () => [
      // 1) Bulk selection checkbox
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
        size: 50,
      },
      // 2) Image
      {
        accessorKey: "imageURL",
        header: "Image",
        cell: ({ row }) => {
          const { imageURL, name } = row.original;
          if (imageURL) {
            return (
              <img
                src={imageURL}
                alt={name}
                className="w-10 h-10 object-cover rounded"
              />
            );
          }
          const words = name.trim().split(/\s+/);
          let initials = words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
          return (
            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
              {initials}
            </div>
          );
        },
      },
      // 3) Product Title => clickable link to edit page
      {
        accessorKey: "name",
        header: "Product Title",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <a
              href={`/products/${product.id}`}
              className="text-black hover:underline"
            >
              {product.name}
            </a>
          );
        },
      },
      // 4) Price (show range if variable)
      {
        id: "priceColumn",
        header: "Price",
        cell: ({ row }) => {
          const p = row.original;
          if (p.type === "simple") {
            return p.price ? p.price.toFixed(2) : "0.00";
          }
          const min = p.variableMinPrice ?? 0;
          const max = p.variableMaxPrice ?? 0;
          return min === max
            ? `${min.toFixed(2)}`
            : `${min.toFixed(2)} - ${max.toFixed(2)}`;
        },
      },
      // 5) Stock
      {
        accessorKey: "totalStock",
        header: "Stock",
        cell: ({ row }) => row.original.totalStock,
      },
      // 6) Last category
      {
        id: "categoryColumn",
        header: "Category",
        cell: ({ row }) => {
          const cats = row.original.categories;
          if (!cats || cats.length === 0) return "—";
          const lastCat = cats[cats.length - 1];
          return lastCat.categoryName;
        },
      },
      // 7) Actions (Dropdown)
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <ActionsDropdown
              onEdit={() => handleEdit(product)}
              onDelete={() => handleDeleteOne(product.id)}
            />
          );
        },
      },
    ],
    []
  );

  // Bulk delete
  const handleBulkDelete = async (selectedRows: Row<ProductRow>[]) => {
    if (!confirm(`Delete ${selectedRows.length} product(s)?`)) return;
    try {
      // Each selected row => fetch /api/products/[id], { method: 'DELETE' }
      const ids = selectedRows.map((r) => r.original.id);
      await Promise.all(
        ids.map((id) => fetch(`/api/products/${id}`, { method: "DELETE" }))
      );
      fetchProducts();
    } catch (err) {
      console.error("Error bulk-deleting products:", err);
      alert("Could not delete products.");
    }
  };

  // Single item edit
  function handleEdit(product: ProductRow) {
    router.push(`/products/${product.id}`);
  }

  // Single item delete
  async function handleDeleteOne(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const resp = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Unknown delete error");
      }
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Something went wrong deleting product!");
    }
  }

  // Render
  if (!activeOrg) {
    return (
      <div className="p-4 text-center">
        <p>No active organization selected. Please pick one.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-center">Loading products...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 sm:mx-auto sm:max-w-6xl py-24 mt-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-semibold text-lg">Products</h1>
        <Button onClick={() => router.push("/products/new")}>Add Product</Button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        // Remove onRowClick so the entire row is NOT clickable
        onBulkDelete={handleBulkDelete}
        pageSize={10}
      />
    </div>
  );
}
