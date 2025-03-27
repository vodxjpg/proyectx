"use client";

import { useState, useEffect, useRef } from "react";
import { authClient } from "@/utils/auth-client";
import { Button } from "@tremor/react";
import Select from "react-select";
import ReactCountryFlag from "react-country-flag";
import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

// 1) Register i18n for countries
countriesLib.registerLocale(enLocale);

// 2) Build the country options for react-select
const countryNames = countriesLib.getNames("en");
const countryOptions = Object.entries(countryNames).map(([code, name]) => ({
  value: code,
  label: (
    <div style={{ display: "flex", alignItems: "center" }}>
      <ReactCountryFlag
        countryCode={code}
        svg
        style={{ width: "20px", height: "15px", marginRight: "8px" }}
      />
      {name}
    </div>
  ),
}));

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface OrganizationFormProps {
  existingId?: string;            // If set => editing, else => creating
  existingName?: string;
  existingSlug?: string;
  existingSupportEmail?: string;  // decrypted email from your GET route
  existingCountries?: string[];   // e.g. ["US","CA"] from your GET route

  onSuccess?: () => void;         // callback to close drawer / refetch
}

export default function OrganizationForm({
  existingId = "",
  existingName = "",
  existingSlug = "",
  existingSupportEmail = "",
  existingCountries = [],
  onSuccess,
}: OrganizationFormProps) {

  // Basic fields
  const [name, setName] = useState(existingName);
  const [slug, setSlug] = useState(existingSlug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugError, setSlugError] = useState("");
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Support Email + Countries
  const [supportEmail, setSupportEmail] = useState(existingSupportEmail);
  const [selectedCountries, setSelectedCountries] = useState<
    { value: string; label: JSX.Element }[]
  >([]);

  // For slug-check debouncing
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Pre-fill the countries multi-select if editing
  useEffect(() => {
    if (existingCountries.length > 0) {
      const preSelected = countryOptions.filter((option) =>
        existingCountries.includes(option.value)
      );
      setSelectedCountries(preSelected);
    }
  }, [existingCountries]);

  // If user hasn't typed a custom slug, auto-generate from name
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  // Slug availability check
  useEffect(() => {
    if (!slug) {
      setIsSlugAvailable(null);
      setSlugError("");
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/onboarding/organization/slug-check?slug=${slug}`);
        const { exists } = await res.json();
        if (exists && slug !== existingSlug) {
          setIsSlugAvailable(false);
          setSlugError("This slug is already taken. Try another or use Suggest.");
        } else {
          setIsSlugAvailable(true);
          setSlugError("");
        }
      } catch (error) {
        console.error("Error checking slug:", error);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [slug, existingSlug]);

  // --------------- The important 2-step update logic ---------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !slug || slugError || isSlugAvailable === false) return;
    setLoading(true);

    try {
      let finalOrgId = existingId;

      if (existingId) {
        // 1) Let Better Auth update name & slug on the existing org
        const updateRes = await authClient.organization.update({
          organizationId: existingId,
          data: { name, slug },
        });
        // updateRes might return the updated org. Typically updateRes.id = existingId
        finalOrgId = updateRes.id || existingId;
      } else {
        // 1) Let Better Auth create a new org with name & slug
        const createRes = await authClient.organization.create({ name, slug });
        // createRes might contain the new org's ID, e.g. createRes.id
        finalOrgId = createRes.id; // or data.id
      }

      // 2) Call *your* custom route to store supportEmail/countries
      //    since better auth doesn't handle these fields
      if (finalOrgId) {
        const extraData = {
          // We only need to pass the fields we want stored in the custom DB
          supportEmail,
          countries: selectedCountries.map((c) => c.value),
        };
        // PUT /api/organization/[organizationId]
        const response = await fetch(`/api/organization/${finalOrgId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extraData),
        });
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error || "Failed to store email/countries");
        }
      } else {
        console.warn("Did not get a finalOrgId from Better Auth create/update response!");
      }

      // Done
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving organization with extra fields:", error);
      alert("Something went wrong saving your organization!");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestSlug = () => {
    const randomNum = Math.floor(Math.random() * 1000);
    setSlug(`${slugify(name)}-${randomNum}`);
    setSlugEdited(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 h-full">
      {/* Organization Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Organization Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="e.g. My Company"
          required
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Slug
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugEdited(true);
            }}
            className="mt-1 w-full rounded border p-2"
            placeholder="my-cool-company"
            required
          />
          <Button
            variant="secondary"
            onClick={handleSuggestSlug}
            type="button"
            className="bg-black text-white"
          >
            Suggest
          </Button>
        </div>
        {slugError && <p className="mt-1 text-sm text-red-500">{slugError}</p>}
      </div>

      {/* Support Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Support Email
        </label>
        <input
          type="email"
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="support@mycompany.com"
        />
      </div>

      {/* Countries */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Selling Countries
        </label>
        <Select
          isMulti
          options={countryOptions}
          value={selectedCountries}
          onChange={(selected) => setSelectedCountries(selected || [])}
          placeholder="Select countries..."
          className="mt-1"
          classNamePrefix="react-select"
        />
      </div>

      <Button
        variant="primary"
        type="submit"
        disabled={
          loading ||
          !name ||
          !slug ||
          !!slugError ||
          isSlugAvailable === false
        }
        className="w-full bg-black text-white"
      >
        {loading
          ? "Saving..."
          : existingId
          ? "Save Changes"
          : "Create Organization"}
      </Button>
    </form>
  );
}
