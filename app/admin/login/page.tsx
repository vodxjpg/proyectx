"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput } from "@tremor/react";
import { authClient } from "@/utils/auth-client"; // Adjust the path as needed

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      // 1) Attempt sign in with Better Auth
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || "Error logging in");
      }

      // 2) Verify that the session belongs to an admin user
      const sessionResponse = await authClient.getSession();
      if (!sessionResponse) {
        throw new Error("No session found, please log in again.");
      }

      // Grab the user's role
      const role = sessionResponse.data?.user?.role || "";

      // If the user is neither "admin" nor "superAdmin", sign out and throw error
      if (role !== "admin" && role !== "superAdmin") {
        await authClient.signOut();
        throw new Error("You are not authorized to access the admin dashboard.");
      }

      // 3) If admin or superAdmin, redirect to the admin dashboard
      router.push("/admin");
    } catch (err: any) {
      setErrorMessage(err.message || "Error logging in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-4 py-10 lg:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h3 className="text-center text-2xl font-semibold">Admin Login</h3>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="font-medium">
              Email
            </label>
            <TextInput
              type="email"
              id="email"
              name="email"
              placeholder="admin@company.com"
              className="mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="font-medium">
              Password
            </label>
            <TextInput
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              className="mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 w-full whitespace-nowrap rounded bg-tremor-brand py-2 text-center text-white shadow hover:bg-tremor-brand-emphasis"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
