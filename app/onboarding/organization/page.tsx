"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/utils/auth-client";

// Turns a name into a slug (e.g., "My Org" becomes "my-org")
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OrganizationForm({
  existingName = "",
  existingSlug = "",
  onSuccess,
}) {
  const router = useRouter();

  // Variables to keep track of what the user types and errors
  const [name, setName] = useState(existingName); // Organization name
  const [slug, setSlug] = useState(existingSlug); // Organization slug
  const [slugEdited, setSlugEdited] = useState(false); // Tracks if user changed slug manually
  const [slugError, setSlugError] = useState(""); // Error message for slug
  const [isSlugAvailable, setIsSlugAvailable] = useState(null); // True if slug is free, false if taken
  const [loading, setLoading] = useState(false); // Shows "Saving..." when submitting
  const [checkingSlug, setCheckingSlug] = useState(false); // Shows "Checking..." while validating
  const debounceTimer = useRef(null); // Delays slug checking so it’s not too fast

  // When the name changes, update the slug automatically (unless user edited it)
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Check if the slug is available whenever it changes
  useEffect(() => {
    // If slug is empty, reset everything
    if (!slug) {
      setIsSlugAvailable(null);
      setSlugError("");
      setCheckingSlug(false);
      return;
    }

    // If editing and slug is the same as before, it’s fine
    if (existingSlug && slug === existingSlug) {
      setIsSlugAvailable(true);
      setSlugError("");
      setCheckingSlug(false);
      return;
    }

    // Start checking the new slug
    setIsSlugAvailable(null);
    setCheckingSlug(true);

    // Cancel any previous check
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Wait 0.5 seconds before checking (so we don’t check too often)
    debounceTimer.current = setTimeout(async () => {
      try {
        const checkRes = await authClient.organization.checkSlug({ slug });
        console.log("Slug check response:", checkRes); // Show what the server said

        if (checkRes.error) {
          setSlugError("This slug is already taken. Please choose another.");
          setIsSlugAvailable(false);
        } else if (checkRes.exists) {
          setSlugError("This slug is already taken. Please choose another.");
          setIsSlugAvailable(false);
        } else {
          setSlugError("");
          setIsSlugAvailable(true);
        }
      } catch (error) {
        console.error("Error checking slug:", error);
        setSlugError("This slug is already taken. Please choose another.");
        setIsSlugAvailable(false);
      } finally {
        setCheckingSlug(false); // Done checking
      }
    }, 500);

    // Clean up if the component changes or closes
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [slug, existingSlug]);

  // When the user submits the form
  async function handleSubmit(e) {
    e.preventDefault();

    // Don’t submit if there’s a problem
    if (!name || !slug || slugError || isSlugAvailable === false || checkingSlug) {
      return;
    }

    setLoading(true);

    try {
      if (existingSlug) {
        // Update existing organization (you’d need the real ID here)
        await authClient.organization.update({
          organizationId: "some-existing-id", // Replace with your actual ID
          data: { name, slug },
        });
      } else {
        // Create a new organization
        await authClient.organization.create({ name, slug });

        // After creating the organization, create the tenant
        const createTenantRes = await fetch("/api/create-tenant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!createTenantRes.ok) {
          const errorData = await createTenantRes.json();
          throw new Error(errorData.error || "Failed to create tenant");
        }

        const createTenantData = await createTenantRes.json();
        if (
          !createTenantData.message ||
          (createTenantData.message !== "Tenant created successfully!" &&
            createTenantData.message !== "Tenant already exists")
        ) {
          throw new Error(createTenantData.error || "Unexpected response from tenant creation");
        }
      }

      // Move to the next page or call a success function
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/onboarding/bot-keys");
      }
    } catch (error) {
      console.error("Error saving organization or creating tenant:", error);
      setSlugError("Failed to save organization or create tenant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Suggest a new slug by adding a random number
  function handleSuggestSlug() {
    const randomNum = Math.floor(Math.random() * 1000);
    setSlug(`${slug}-${randomNum}`);
    setSlugEdited(true);
  }

  // The form users see
  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-50">
          Organization Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="Your organization name"
          required
        />
      </div>

      {/* Slug Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-50">
          Organization Slug
        </label>
        <div className="flex items-center space-x-2">
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
          <button
            type="button"
            onClick={handleSuggestSlug}
            className="rounded border bg-gray-200 px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
          >
            Suggest
          </button>
        </div>
        {/* Messages about the slug */}
        {checkingSlug && (
          <p className="mt-1 text-sm text-gray-500">Checking slug availability...</p>
        )}
        {isSlugAvailable === true && (
          <p className="mt-1 text-sm text-green-500">Slug is available.</p>
        )}
        {slugError && <p className="mt-1 text-sm text-red-500">{slugError}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={
          loading ||
          checkingSlug ||
          !name ||
          !slug ||
          !!slugError ||
          isSlugAvailable === false
        }
        className="rounded bg-black w-full px-4 py-2 text-white enabled:hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : existingSlug ? "Save" : "Create"}
      </button>
    </form>
  );
}