"use client";

import React from "react";
import ProductForm from "@/components/layout/ProductForm";

/**
 * This page is shown at /products/[productId].
 * We pass the productId into ProductForm so it loads
 * the existing product details and allows editing.
 */

export default function ProductEditPage({
  params,
}: {
  params: { productId: string };
}) {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-semibold mb-6">
        Edit Product
      </h1>

      {/* 
        Pass the productId prop to ProductForm so it knows 
        to load & populate data from GET /api/products/:id
      */}
      <ProductForm productId={params.productId} />
    </div>
  );
}
