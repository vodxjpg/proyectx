// /app/onboarding/bot-keys/page.tsx
"use client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RadioCardGroup, RadioCardItem } from "@/components/ui/RadioCardGroup";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { authClient } from "@/utils/auth-client";

// A simple Telegram icon component
const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 240 240"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    {...props}
  >
    <circle cx="120" cy="120" r="120" fill="#37aee2" />
    <path
      d="M100 160l-2 40c3 0 4-1 6-3l20-30 40 30c7 4 12 2 14-5l22-100c2-8-3-11-9-8l-120 90c-5 3-9 1-10-4l-20-80c-1-4-4-5-8-2l-60 45c-7 5-2 9 5 7l80-25z"
      fill="#fff"
    />
  </svg>
);

export default function TelegramApiForm() {
  // Only two options: "telegram" (enabled) or "comingSoon" (disabled)
  const [provider, setProvider] = useState<"telegram" | "comingSoon">("telegram");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // New: Get the user's organizations via the auth client.
  const { data: organizations, isLoading: orgLoading } = authClient.useListOrganizations();
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrg) {
      // Default to the first organization.
      setSelectedOrg(organizations[0].id);
    }
  }, [organizations, selectedOrg]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (provider !== "telegram") {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        platforms: [
          {
            platformName: "telegram",
            apiKey,
            organizationId: selectedOrg, // associate the API key with the selected organization
          },
        ],
      };

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save Telegram API Key");
      }

      // On success, go to the next onboarding step.
      router.push("/onboarding/selling-countries");
    } catch (error) {
      console.error("Error submitting API key:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto p-4">
      <div
        style={{ animationDuration: "500ms" }}
        className="motion-safe:animate-revealBottom"
      >
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-xl dark:text-gray-50">
          Add your bots' API key
        </h1>
        <p className="mt-6 text-gray-700 sm:text-sm dark:text-gray-300">
          Enter your Telegram bot API key below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex flex-col gap-6">
          {/* Service provider selection */}
          <fieldset
            className="space-y-2 motion-safe:animate-revealBottom"
            style={{
              animationDuration: "500ms",
              animationDelay: "200ms",
              animationFillMode: "backwards",
            }}
          >
            <legend className="font-medium text-gray-900 sm:text-sm dark:text-gray-50">
              Service provider
            </legend>
            <RadioCardGroup
              id="service-provider"
              value={provider}
              onValueChange={(value) =>
                setProvider(value as "telegram" | "comingSoon")
              }
              className="mt-2 grid grid-cols-1 gap-4 sm:text-sm md:grid-cols-2"
              aria-label="Select service provider"
            >
              <RadioCardItem value="telegram">
                <div className="flex items-center gap-2">
                  <TelegramIcon
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-semibold leading-6">TELEGRAM</span>
                </div>
                <p className="mt-1 text-sm text-gray-500 sm:text-xs dark:text-gray-500">
                  Telegram integration
                </p>
              </RadioCardItem>
              <RadioCardItem value="comingSoon" disabled>
                <div className="flex items-center gap-2">
                  <span className="font-semibold leading-6">
                    MORE COMING SOON
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 sm:text-xs dark:text-gray-500">
                  Other integrations are coming soon.
                </p>
              </RadioCardItem>
            </RadioCardGroup>
          </fieldset>

          {/* New: Organization selection */}
          <div
            className="space-y-2 motion-safe:animate-revealBottom"
            style={{
              animationDuration: "500ms",
              animationDelay: "300ms",
              animationFillMode: "backwards",
            }}
          >
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
                className="border rounded p-2"
              >
                {organizations?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* API key input */}
          <div
            className="space-y-2 motion-safe:animate-revealBottom"
            style={{
              animationDuration: "500ms",
              animationDelay: "400ms",
              animationFillMode: "backwards",
            }}
          >
            <Label
              className="text-base font-medium text-gray-900 sm:text-sm dark:text-gray-50"
              htmlFor="api-key"
            >
              Telegram Bot API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              aria-describedby="api-key-description"
            />
            <p id="api-key-description" className="sr-only">
              Enter your Telegram bot API key. This field is password protected.
            </p>
          </div>

          <div className="mt-6 flex justify-between">
            <Button type="button" variant="ghost" asChild>
              <a href="/onboarding/organization">Back</a>
            </Button>
            <Button
              className="disabled:bg-gray-200 disabled:text-gray-500"
              type="submit"
              disabled={!apiKey || loading}
              aria-disabled={!apiKey || loading}
              isLoading={loading}
            >
              {loading ? "Submitting..." : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
