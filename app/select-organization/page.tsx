"use client";

import { useState, useEffect, useRef } from "react";
import { authClient } from "@/utils/auth-client";
import { useRouter } from "next/navigation";

// Turns a name into a slug (e.g., "My Org" becomes "my-org")
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SelectOrganization() {
  const router = useRouter();
  const { data: organizations, error, isPending, refetch } = authClient.useListOrganizations();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug) {
      setIsSlugAvailable(null);
      setSlugError("");
      setCheckingSlug(false);
      return;
    }

    setIsSlugAvailable(null);
    setCheckingSlug(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const checkRes = await authClient.organization.checkSlug({ slug });
        if (checkRes.error || checkRes.exists) {
          setSlugError("This slug is already taken. Please choose another.");
          setIsSlugAvailable(false);
        } else {
          setSlugError("");
          setIsSlugAvailable(true);
        }
      } catch (error) {
        console.error("Error checking slug:", error);
        setSlugError("Error checking slug availability.");
        setIsSlugAvailable(false);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [slug]);

  // Handle organization creation
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || slugError || isSlugAvailable === false || checkingSlug) {
      return;
    }
    setLoading(true);
    try {
      await authClient.organization.create({ name, slug });
      refetch(); // Refresh the organization list
      setShowCreateForm(false);
      setName("");
      setSlug("");
      setSlugEdited(false);
    } catch (error) {
      console.error("Error creating organization:", error);
      setSlugError("Failed to create organization. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle organization selection
  const handleSelect = async (orgId: string) => {
    try {
      // inside handleSelect
      await authClient.organization.setActive({ organizationId: orgId });

      // Option A: simple forced reload
      window.location.href = "/dashboard";

      // or Option B: short async delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      router.push("/dashboard");

    } catch (err) {
      console.error("Failed to set active org:", err);
      setSlugError("Failed to select organization. Please try again.");
    }
  };

  // Get initials for organization display
  const getInitials = (name: string) => {
    const words = name.split(" ");
    const initials = words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
    return initials.length > 1 ? initials : name.slice(0, 2).toUpperCase();
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading organizations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">Error loading organizations!</h1>
        <pre className="text-sm text-red-600">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (organizations.length === 0 && !showCreateForm) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">No Organizations Found</h1>
        <p className="text-gray-600 mb-4">
          You’re not a member of any organizations yet. Create a new organization to get started.
        </p>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded bg-black px-4 py-2 text-white hover:bg-blue-600"
        >
          Create Organization
        </button>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="flex min-h-screen flex-col items-center mt-5 p-6">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">Create Organization</h1>
        <form onSubmit={handleCreateOrganization} className="w-full max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border p-2"
              placeholder="Your organization name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Organization Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugEdited(true);
              }}
              className="mt-1 w-full rounded border p-2"
              placeholder="auto-generated-slug"
              required
            />
            {checkingSlug && <p className="mt-1 text-sm text-gray-500">Checking slug availability...</p>}
            {isSlugAvailable === true && <p className="mt-1 text-sm text-green-500">Slug is available.</p>}
            {slugError && <p className="mt-1 text-sm text-red-500">{slugError}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || checkingSlug || !name || !slug || !!slugError || isSlugAvailable === false}
            className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Organization"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="mt-2 w-full rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center mt-5 p-6">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Select an Organization</h1>
      <p className="mb-6 text-gray-600">Please choose an organization to continue:</p>
      <ul className="w-full max-w-md space-y-3">
        {organizations.map((org) => (
          <li key={org.id}>
            <button
              onClick={() => handleSelect(org.id)}
              className="flex w-full items-center rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-lg font-medium text-white">
                {getInitials(org.name)}
              </span>
              <span className="ml-4 text-gray-900">{org.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setShowCreateForm(true)}
        className="mt-6 rounded bg-black px-4 py-2 text-white hover:bg-blue-600"
      >
        Create New Organization
      </button>
    </div>
  );
}