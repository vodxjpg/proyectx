// /home/zodx/Desktop/proyectx/app/onboarding/selling-countries/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";
import countries from "i18n-iso-countries";
import ReactCountryFlag from "react-country-flag";
import { authClient } from "@/utils/auth-client";

// Load English country names
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
const countryList = countries.getNames("en");
const options = Object.entries(countryList).map(([code, name]) => ({
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

export default function SellingCountriesForm() {
  const router = useRouter();
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const { data: organizations, isLoading: orgLoading } = authClient.useListOrganizations();
  const [selectedOrg, setSelectedOrg] = useState("");

  // Default to the first organization when the list is loaded
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrg) {
      setSelectedOrg(organizations[0].id);
    }
  }, [organizations, selectedOrg]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) {
      alert("Please select an organization.");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding/selling-countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrg,
          countries: selectedCountries.map((option) => option.value),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save countries");
      }

      console.log("[DEBUG] Countries saved, moving to support email");
      router.push("/onboarding/support-email");
    } catch (error) {
      console.error("Error saving countries:", error);
      alert("Failed to save countries. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
        Select Countries to Sell To
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-50">
            Select Organization
          </label>
          {orgLoading ? (
            <p>Loading organizations...</p>
          ) : (
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {/* Country selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-50">
            Countries
          </label>
          <Select
            isMulti
            options={options}
            value={selectedCountries}
            onChange={(selected) => setSelectedCountries(selected || [])}
            placeholder="Choose countries..."
            className="mt-1"
            classNamePrefix="react-select"
          />
          {selectedCountries.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Please select at least one country.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || selectedCountries.length === 0 || !selectedOrg}
          className="w-full rounded bg-black px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save and Continue"}
        </button>
      </form>
    </div>
  );
}