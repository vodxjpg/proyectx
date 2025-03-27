"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Divider } from "@/components/ui/Divider";
import zxcvbn from "zxcvbn";

// We'll do a minimal check here in addition to server-side checks:
const MIN_PASSWORD_LENGTH = 8;

// Helper to convert zxcvbn score to a string label
function getStrengthLabel(score: number) {
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
}

export default function GeneralSettings() {
  // ---------------------------------------------------------------------------
  // State: user info
  // ---------------------------------------------------------------------------
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    apiKey: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // ---------------------------------------------------------------------------
  // State: change password
  // ---------------------------------------------------------------------------
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  // For zxcvbn-based new password strength
  const [newPasswordScore, setNewPasswordScore] = useState(0);

  // ---------------------------------------------------------------------------
  // State: copy-to-clipboard for API key
  // ---------------------------------------------------------------------------
  const [copySuccess, setCopySuccess] = useState("");

  // Internal token used for internal API calls
  const internalToken = process.env.NEXT_PUBLIC_INTERNAL_TOKEN || "";

  // ---------------------------------------------------------------------------
  // Function to fetch/generate the JWT token for the current user
  // ---------------------------------------------------------------------------
  const fetchApiToken = async () => {
    try {
      const res = await fetch("/api/auth/token", {
        headers: {
          "x-internal-token": internalToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.token;
      } else {
        console.error("Error fetching API token");
        return "";
      }
    } catch (error) {
      console.error("Error fetching API token:", error);
      return "";
    }
  };

  // ---------------------------------------------------------------------------
  // Fetch user data on mount and generate JWT token
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user", {
          headers: {
            "x-internal-token": internalToken,
          },
        });
        if (res.ok) {
          const data = await res.json();
          // Assume that "name" contains first and last name separated by space
          const [fName = "", lName = ""] = data.name.split(" ");
          // Generate JWT token for the current user
          const token = await fetchApiToken();
          setUser({
            firstName: fName,
            lastName: lName,
            email: data.email,
            role: data.role,
            apiKey: token,
          });
          setFirstName(fName);
          setLastName(lName);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    }
    fetchUser();
  }, [internalToken]);

  // ---------------------------------------------------------------------------
  // Handle profile updates
  // ---------------------------------------------------------------------------
  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/internal/settings/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": internalToken,
        },
        body: JSON.stringify({
          firstName,
          lastName,
        }),
      });
      if (res.ok) {
        setProfileMessage("Profile updated successfully!");
      } else {
        setProfileMessage("Error updating profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileMessage("Error updating profile.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // zxcvbn check when user types a new password
  // ---------------------------------------------------------------------------
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    if (value) {
      const result = zxcvbn(value);
      setNewPasswordScore(result.score);
    } else {
      setNewPasswordScore(0);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle change password
  // ---------------------------------------------------------------------------
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage("");

    // 1) Basic client-side checks
    if (!oldPassword || !newPassword) {
      setPasswordMessage("Please provide both old and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    // Also check zxcvbn score if you want to enforce "Fair" or above, for example:
    if (newPasswordScore < 2) {
      setPasswordMessage("Please choose a stronger password (at least Fair).");
      return;
    }

    try {
      const res = await fetch("/api/internal/settings/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": internalToken,
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        // Password changed
        setPasswordMessage("Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setNewPasswordScore(0);
      } else {
        // If there's an error from the server, show it
        const data = await res.json();
        setPasswordMessage(data.error || "Error updating password.");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      setPasswordMessage("Error updating password.");
    }
  };

  // ---------------------------------------------------------------------------
  // Handle copy API key
  // ---------------------------------------------------------------------------
  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(user.apiKey);
      setCopySuccess("Copied!");
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      setCopySuccess("Failed to copy!");
    }
  };

  // ---------------------------------------------------------------------------
  // Handle token regeneration
  // ---------------------------------------------------------------------------
  const handleRegenerateApiKey = async () => {
    const token = await fetchApiToken();
    if (token) {
      setUser(prev => ({ ...prev, apiKey: token }));
    }
  };

  // ---------------------------------------------------------------------------
  // Mask the API key to hide sensitive info
  // ---------------------------------------------------------------------------
  function maskApiKey(apiKey: string) {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return "*".repeat(apiKey.length);
    return (
      apiKey.substring(0, 4) +
      "*".repeat(apiKey.length - 8) +
      apiKey.substring(apiKey.length - 4)
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-10">
      {/* Personal Information & Profile Update */}
      <section aria-labelledby="personal-information">
        <form onSubmit={handleProfileSubmit}>
          <div className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-3">
            <div>
              <h2
                id="personal-information"
                className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50"
              >
                Personal Information
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Manage your personal information.
              </p>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                <div className="col-span-full sm:col-span-3">
                  <Label htmlFor="first-name" className="font-medium">
                    First Name
                  </Label>
                  <Input
                    type="text"
                    id="first-name"
                    name="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="email" className="font-medium">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={user.email}
                    className="mt-2"
                    readOnly
                    disabled
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    E-mail can only be changed by system admin.
                  </p>
                </div>

                <div className="col-span-full sm:col-span-3">
                  <Label htmlFor="role" className="font-medium">
                    Role
                  </Label>
                  <Input
                    type="text"
                    id="role"
                    name="role"
                    value={user.role}
                    className="mt-2"
                    readOnly
                    disabled
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Roles can only be changed by system admin.
                  </p>
                </div>

                <div className="col-span-full mt-6 flex justify-end">
                  <Button type="submit" isLoading={loadingProfile}>
                    Save Profile
                  </Button>
                </div>
              </div>
              {profileMessage && (
                <p className="mt-2 text-sm text-green-600">{profileMessage}</p>
              )}
            </div>
          </div>
        </form>
      </section>

      <Divider />

      {/* Password Update */}
      <section aria-labelledby="password-update">
        <form onSubmit={handlePasswordSubmit}>
          <div className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-3">
            <div>
              <h2
                id="password-update"
                className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50"
              >
                Change Password
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Update your password by providing your old password.
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-6">
              {/* Old password field */}
              <div className="col-span-full sm:col-span-3">
                <Label htmlFor="old-password" className="font-medium">
                  Old Password
                </Label>
                <Input
                  type="password"
                  id="old-password"
                  name="old-password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* New password field with zxcvbn strength meter */}
              <div className="col-span-full sm:col-span-3">
                <Label htmlFor="new-password" className="font-medium">
                  New Password
                </Label>
                <Input
                  type="password"
                  id="new-password"
                  name="new-password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  className="mt-2"
                />
                {newPassword && (
                  <p className="mt-1 text-sm">
                    Password Strength:{" "}
                    <strong>{getStrengthLabel(newPasswordScore)}</strong>
                  </p>
                )}
              </div>

              {/* Confirm password field */}
              <div className="col-span-full sm:col-span-3">
                <Label htmlFor="confirm-password" className="font-medium">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  id="confirm-password"
                  name="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="col-span-full mt-6 flex justify-end">
                <Button type="submit">Change Password</Button>
              </div>
            </div>
          </div>
          {passwordMessage && (
            <p className="mt-2 text-sm text-green-600">{passwordMessage}</p>
          )}
        </form>
      </section>

      <Divider />

      {/* API Key Display */}
      <section aria-labelledby="api-key-section">
        <div className="grid grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-3">
          <div>
            <h2
              id="api-key-section"
              className="scroll-mt-10 font-semibold text-gray-900 dark:text-gray-50"
            >
              API Key
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Your API bearer token. Click the button to copy the full key or regenerate it.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                readOnly
                value={maskApiKey(user.apiKey)}
                className="w-full cursor-not-allowed"
              />
              <Button type="button" onClick={handleCopyApiKey}>
                {copySuccess || "Copy"}
              </Button>
              <Button type="button" onClick={handleRegenerateApiKey}>
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
