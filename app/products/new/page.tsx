// app/products/new/page.tsx
import dynamic from 'next/dynamic';
import React from 'react';
import ProductForm from '@/components/layout/ProductForm'


export default function Page() {
  return (
    <main style={{ padding: 20 }}>
      <ProductForm />
    </main>
  );
}
