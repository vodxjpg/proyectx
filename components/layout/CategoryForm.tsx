"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@tremor/react";
import { Input } from "@/components/ui/Input"; // Adjust path
import { Label } from "@/components/ui/Label"; // Adjust path
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"; // Adjust path

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  level?: number;
}

interface CategoryFormProps {
  existingId?: string;
  existingName?: string;
  existingSlug?: string;
  existingParentId?: string | null;
  existingImage?: string | null;
  onSuccess: () => void;
  categories: ProductCategory[];
}

export default function CategoryForm({
  existingId,
  existingName,
  existingSlug,
  existingParentId,
  existingImage,
  onSuccess,
  categories,
}: CategoryFormProps) {
  const [name, setName] = useState(existingName || "");
  const [slug, setSlug] = useState(existingSlug || "");
  const [parentId, setParentId] = useState(existingParentId || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(!!existingSlug);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");

  useEffect(() => {
    if (!isSlugManuallyEdited && name) setSlug(generateSlug(name));
  }, [name, isSlugManuallyEdited]);

  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    const checkSlug = async () => {
      setSlugStatus("checking");
      const url = new URL("/api/products/categories?slug-check", window.location.origin);
      url.searchParams.append("slug", slug);
      if (existingId) url.searchParams.append("excludeId", existingId);
      const res = await fetch(url);
      const data = await res.json();
      setSlugStatus(data.exists ? "taken" : "available");
    };
    const debounce = setTimeout(checkSlug, 300);
    return () => clearTimeout(debounce);
  }, [slug, existingId]);

  async function uploadFileIfNeeded(): Promise<string | null> {
    if (!selectedFile) return existingImage || null;
    const valid = ["image/png", "image/webp", "image/jpeg"];
    if (!valid.includes(selectedFile.type) || selectedFile.size > 1024 * 1024) return null;

    const fd = new FormData();
    fd.append("file", selectedFile);
    const resp = await fetch("/api/products/categoriesupload", { method: "POST", body: fd });
    const data = await resp.json();
    return resp.ok ? data.imageURL : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugStatus === "taken" || slugStatus === "checking") return;

    const imageURL = await uploadFileIfNeeded();
    if (selectedFile && !imageURL) return;

    const payload = { name, slug, image: imageURL, parentId };
    const url = existingId ? `/api/products/categories${existingId}` : "/api/products/categories";
    const method = existingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setIsSlugManuallyEdited(true);
          }}
          required
        />
        {slugStatus === "checking" && <p className="text-sm text-gray-500">Checking...</p>}
        {slugStatus === "available" && <p className="text-sm text-green-500">Available</p>}
        {slugStatus === "taken" && <p className="text-sm text-red-500">Taken</p>}
      </div>
      <div>
        <Label htmlFor="parent">Parent Category</Label>
        <Select value={parentId || "none"} onValueChange={(value) => setParentId(value === "none" ? null : value)}>
          <SelectTrigger id="parent">
            <SelectValue placeholder="Select parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {"—".repeat(cat.level || 0)} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="image">Image</Label>
        <input
          type="file"
          id="image"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
      </div>
      <Button type="submit" disabled={!name || !slug || slugStatus === "taken" || slugStatus === "checking"}>
        {existingId ? "Update" : "Create"}
      </Button>
    </form>
  );
}