"use client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { authClient } from "@/utils/auth-client";

export default function SupportEmail() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 1) Get list of organizations for this user (like in the Bot Keys page)
  const { data: organizations, isLoading: orgLoading } = authClient.useListOrganizations();
  // 2) Keep track of which organization the user selects
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    // Auto-select the first organization if available
    if (!orgLoading && organizations && organizations.length > 0 && !selectedOrg) {
      setSelectedOrg(organizations[0].id);
    }
  }, [organizations, orgLoading, selectedOrg]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // POST to our /api/onboarding route with org + supportEmail
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrg,
          supportEmail: email,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save support email");
      }
      // On success, go to the next step
      router.push("/onboarding/secret-phrase");
    } catch (error) {
      console.error("Error saving support email:", error);
      // Show an error message or do nothing
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto p-4">
      <div
        className="motion-safe:animate-revealBottom"
        style={{ animationDuration: "500ms" }}
      >
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
          Please provide a support email
        </h1>
        <p className="mt-6 text-gray-700 sm:text-sm dark:text-gray-300">
          This email will be used to send tracking numbers to your customers
          and for them to request support assistance. Each organization can have its own.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Organization Selection */}
        <div>
          <Label
            htmlFor="org-select"
            className="text-base font-medium text-gray-900 sm:text-sm dark:text-gray-50"
          >
            Select Organization
          </Label>
          {orgLoading ? (
            <p>Loading organizations...</p>
          ) : (
            <select
              id="org-select"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="border rounded p-2 mt-1 w-full dark:bg-gray-800 dark:text-gray-50"
              required
            >
              {organizations?.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Support Email Input */}
        <div>
          <Label
            htmlFor="support-email"
            className="text-base font-medium text-gray-900 sm:text-sm dark:text-gray-50"
          >
            Support Email
          </Label>
          <Input
            id="support-email"
            type="email"
            placeholder="Enter your support email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="ghost" asChild>
            <Link href="/onboarding/bot-keys">Back</Link>
          </Button>
          <Button
            className="disabled:bg-gray-200 disabled:text-gray-500"
            type="submit"
            disabled={!email || loading || !selectedOrg}
            aria-disabled={!email || loading || !selectedOrg}
            isLoading={loading}
          >
            {loading ? "Submitting..." : "Continue"}
          </Button>
        </div>
      </form>
    </main>
  );
}
