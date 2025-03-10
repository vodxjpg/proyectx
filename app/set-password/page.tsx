"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useRouter } from "next/navigation";
import zxcvbn from "zxcvbn";

export default function SetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Internal token for API calls (must be set in .env)
  const internalToken = process.env.NEXT_PUBLIC_INTERNAL_TOKEN || "";

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    if (value) {
      const evaluation = zxcvbn(value);
      setPasswordStrength(evaluation.score);
    } else {
      setPasswordStrength(0);
    }
  };

  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0:
        return "Very Weak";
      case 1:
        return "Weak";
      case 2:
        return "Fair";
      case 3:
        return "Strong";
      case 4:
        return "Very Strong";
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (passwordStrength < 2) {
      setMessage("Please choose a stronger password (at least Fair).");
      return;
    }

    try {
      const res = await fetch("/api/internal/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": internalToken, // Add internal token
        },
        credentials: "include", // Send session cookies
        body: JSON.stringify({ newPassword }),
      });

      if (res.ok) {
        // Instead of router.push, do a forced reload
        setMessage("Password set successfully! Redirecting...");
        setTimeout(() => {
          // Force a full page refresh to /dashboard:
          window.location.href = "/dashboard";
        }, 1000); // 1-second delay, adjustable
      } else {
        const data = await res.json();
        setMessage(data.error || "Error setting password.");
      }
    } catch (error) {
      setMessage("Something went wrong.");
      console.error("Fetch error:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Set Your Password</h1>
      <p className="mb-4">Since you logged in with a one-time link, please set a password.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="new-password">New Password</Label>
          <Input
            type="password"
            id="new-password"
            value={newPassword}
            onChange={handlePasswordChange}
          />
          {newPassword && (
            <p className="mt-1 text-sm">
              Password Strength: <strong>{getStrengthLabel(passwordStrength)}</strong>
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit">Save Password</Button>
      </form>
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.includes("successfully") ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
