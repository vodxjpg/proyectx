// /home/zodx/Desktop/proyectx/app/onboarding/secret-phrase/page.tsx
"use client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function SecretPhraseForm() {
  const [secretPhrase, setSecretPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretPhrase }),
      });
      if (!res.ok) {
        throw new Error("Failed to save secret phrase");
      }

      // On success, the backend might have set onboardingCompleted=1
      // so the user can proceed to /dashboard
      console.log("[DEBUG] SecretPhraseForm: Onboarding API returned OK. Navigating to /dashboard...");
      router.push("/select-organization");
    } catch (error) {
      console.error("[DEBUG] Error saving secret phrase:", error);
      // Could show an error message
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
          Set Your Secret Phrase
        </h1>
        <p className="mt-6 text-gray-700 sm:text-sm dark:text-gray-300">
          This secret phrase will be required to perform special actions within
          the platform, such as exporting report revenues. Please choose a
          secure phrase.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div
          className="space-y-2 motion-safe:animate-revealBottom"
          style={{
            animationDuration: "600ms",
            animationDelay: "100ms",
            animationFillMode: "backwards",
          }}
        >
          <Label
            htmlFor="secret-phrase"
            className="text-base font-medium text-gray-900 sm:text-sm dark:text-gray-50"
          >
            Secret Phrase
          </Label>
          <Input
            id="secret-phrase"
            type="password"
            placeholder="Enter your secret phrase"
            value={secretPhrase}
            onChange={(e) => setSecretPhrase(e.target.value)}
            required
          />
        </div>
        <div className="mt-6 flex justify-between">
          <Button type="button" variant="ghost" asChild>
            <Link href="/onboarding/support-email">Back</Link>
          </Button>
          <Button
            className="disabled:bg-gray-200 disabled:text-gray-500"
            type="submit"
            disabled={!secretPhrase || loading}
            aria-disabled={!secretPhrase || loading}
            isLoading={loading}
          >
            {loading ? "Submitting..." : "Continue"}
          </Button>
        </div>
      </form>
    </main>
  );
}
