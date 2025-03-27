"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, TextInput } from "@tremor/react";
import { authClient } from "@/utils/auth-client";
import zxcvbn from "zxcvbn";

const Logo = (props) => (
  <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
    <path d="M10.9999 2.04938L11 5.07088C7.6077 5.55612 5 8.47352 5 12C5 15.866 8.13401 19 12 19C13.5723 19 15.0236 18.4816 16.1922 17.6064L18.3289 19.7428C16.605 21.1536 14.4014 22 12 22C6.47715 22 2 17.5228 2 12C2 6.81468 5.94662 2.55115 10.9999 2.04938Z M21.9506 13.0001C21.7509 15.0111 20.9555 16.8468 19.7433 18.3283L17.6064 16.1922C18.2926 15.2759 18.7595 14.1859 18.9291 13Z M13.0011 2.04948C17.725 2.51902 21.4815 6.27589 21.9506 10.9999L18.9291 10.9998C18.4905 7.93452 16.0661 5.50992 13.001 5.07103L13.0011 2.04948Z" />
  </svg>
);

export default function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailError, setEmailError] = useState(""); // New state for email-specific error
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId");

  // Pre-fill email if an invitationId is present
  useEffect(() => {
    if (invitationId) {
      async function fetchInvitation() {
        try {
          const invitation = await authClient.organization.getInvitation({
            query: { id: invitationId },
          });
          setEmail(invitation.email);
        } catch (err) {
          console.error("Failed to fetch invitation:", err);
        }
      }
      fetchInvitation();
    }
  }, [invitationId]);

  // For dynamic password strength
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword) {
      const evaluation = zxcvbn(newPassword);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    // Basic validation
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (passwordStrength < 2) {
      setErrorMessage("Please choose a stronger password");
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const userCheck = await fetch(`/api/user/check?email=${encodeURIComponent(normalizedEmail)}`, {
        method: "GET",
      });

      if (!userCheck.ok) {
        throw new Error("Failed to check email availability. Please try again.");
      }

      const { exists } = await userCheck.json();
      if (exists) {
        setEmailError("This email is already registered. Please log in instead.");
        if (invitationId) {
          setTimeout(() => router.push(`/login?invitationId=${invitationId}`), 2000);
        }
        setLoading(false);
        return;
      }

      // Sign up the user
      const response = await authClient.signUp.email({
        name,
        email: normalizedEmail,
        password,
      });
      console.log("Sign-up response:", response);

      // Log the user in immediately
      await authClient.signIn.email({
        email: normalizedEmail,
        password,
      });

      // If there’s an invitationId, redirect to accept-invite page
      if (invitationId) {
        setSuccessMessage("Account created! Redirecting to accept your invitation...");
        setTimeout(() => router.push(`/accept-invite?invitationId=${invitationId}`), 2000);
      } else {
        setSuccessMessage("Account created successfully! Redirecting to dashboard...");
        setTimeout(() => router.push("/dashboard"), 2000);
      }
    } catch (error: any) {
      console.error("Sign-up error:", error);
      const errMsg = error?.message?.toLowerCase() || "";
      if (errMsg.includes("already") || errMsg.includes("exists")) {
        setEmailError("This email is already in use. Please log in instead.");
        if (invitationId) {
          setTimeout(() => router.push(`/login?invitationId=${invitationId}`), 2000);
        }
      } else {
        setErrorMessage(error?.message || "Error creating account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-10 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Logo
          className="mx-auto h-10 w-10 text-tremor-content-strong dark:text-dark-tremor-content-strong"
          aria-hidden={true}
        />
        <h3 className="mt-6 text-center text-tremor-title font-bold text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Create an account to unlock the potential of your shop
        </h3>
      </div>
      {successMessage ? (
        <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md p-10">
          <p className="text-center text-3xl font-bold text-green-600">
            {successMessage}
          </p>
        </Card>
      ) : (
        <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md ring-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
              >
                Name
              </label>
              <TextInput
                type="text"
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Name"
                className="mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
              >
                Email
              </label>
              <TextInput
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                placeholder="john@company.com"
                className="mt-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!invitationId} // Disable if from invitation
              />
              {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
              >
                Password
              </label>
              <TextInput
                type="password"
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="Password"
                className="mt-2"
                value={password}
                onChange={handlePasswordChange}
                required
              />
              {password && (
                <p className="mt-1 text-sm">
                  Password Strength: <strong>{getStrengthLabel(passwordStrength)}</strong>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-tremor-default font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong"
              >
                Confirm Password
              </label>
              <TextInput
                type="password"
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                placeholder="Confirm Password"
                className="mt-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-red-500 text-sm">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full whitespace-nowrap rounded-tremor-default btn-primary py-2 text-center text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="mt-6 text-center text-sm text-gray-600">
              By signing up, you agree to our{" "}
              <a
                href="#"
                className="capitalize text-tremor-brand hover:text-tremor-brand-emphasis dark:text-dark-tremor-brand hover:dark:text-dark-tremor-brand-emphasis"
              >
                Terms of Use
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="capitalize text-tremor-brand hover:text-tremor-brand-emphasis dark:text-dark-tremor-brand hover:dark:text-dark-tremor-brand-emphasis"
              >
                Privacy Policy
              </a>
            </p>
          </form>
        </Card>
      )}
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-black hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}