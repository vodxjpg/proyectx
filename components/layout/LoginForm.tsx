"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TextInput, Divider } from "@tremor/react";
import { authClient } from "@/utils/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Check if user exists
      const userCheck = await fetch(`/api/check-user?email=${encodeURIComponent(email)}`, {
        method: "GET",
      });

      if (!userCheck.ok) {
        throw new Error("Failed to check user existence. Please try again.");
      }

      const { exists } = await userCheck.json();
      if (!exists) {
        setEmailError("This email is not registered in our system.");
        setLoading(false);
        return;
      }

      // Attempt sign-in
      const { data, error } = await authClient.signIn.email({ email, password });
      if (error) throw error; // Throw error to catch block if sign-in fails

      // Handle invitation or redirect
      if (invitationId) {
        router.push(`/accept-invite?invitationId=${invitationId}`);
      } else {
        // Redirect to organization onboarding where tenant creation will happen
        router.push("/dashboard");
      }
    } catch (err) {
      console.log("Login error:", err); // Log the error to inspect its structure

      // Reset previous error states
      setEmailError("");
      setPasswordError("");
      setErrorMessage("");

      // Handle invalid credentials
      if (err.status === 401 || err.message?.includes("Invalid email or password")) {
        setPasswordError("Incorrect password.");
      } else if (err.status === 403 || err.message?.toLowerCase().includes("verify")) {
        setEmailError("Please verify your email address before logging in.");
      } else {
        setErrorMessage(err.message || "Error logging in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-10 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h3 className="text-center text-tremor-title font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
          Welcome Back
        </h3>
        <p className="text-center text-tremor-default text-tremor-content dark:text-dark-tremor-content">
          Enter your credentials to access your account.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              autoComplete="current-password"
              placeholder="Password"
              className="mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>
          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 w-full whitespace-nowrap rounded-tremor-default bg-tremor-brand py-2 text-center text-tremor-default font-medium text-tremor-brand-inverted shadow-tremor-input hover:bg-tremor-brand-emphasis dark:bg-dark-tremor-brand dark:text-dark-tremor-brand-inverted dark:shadow-dark-tremor-input dark:hover:bg-dark-tremor-brand-emphasis"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-600 text-center dark:text-dark-tremor-content">
          Forgot your password?{" "}
          <a
            href="/forgot-password"
            className="font-medium text-tremor-brand hover:text-tremor-brand-emphasis dark:text-dark-tremor-brand dark:hover:text-dark-tremor-brand-emphasis"
          >
            Reset password
          </a>
        </p>
        <Divider className="my-6" />
        <p className="mt-2 text-sm text-gray-600 text-center dark:text-dark-tremor-content">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="font-medium text-tremor-brand hover:text-tremor-brand-emphasis dark:text-dark-tremor-brand dark:hover:text-dark-tremor-brand-emphasis"
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}