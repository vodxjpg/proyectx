// /home/zodx/Desktop/proyectx/app/select-organization/page.tsx

"use client";

import { useState } from "react";
import { authClient } from "@/utils/auth-client";

export default function SelectOrganization() {
  // The plugin returns something like:
  // { data, error, isPending, refetch, ... }
  // So we rename isLoading -> isPending to avoid TS errors.
  const { data: organizations, error, isPending, refetch } = authClient.useListOrganizations();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1) Force a full page reload => ensures the SSR layout sees the updated cookie
  const handleSelect = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId });

      // Force a *full* page reload so the server sees the new session cookie
      // and your layout logic won't immediately redirect you back here.
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Failed to set active org:", err);
      setErrorMessage("Failed to select organization. Please try again.");
    }
  };

  if (isPending) {
    return <div>Loading organizations...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>Error loading organizations!</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <div>
        <h1>No Organizations Found</h1>
        <p>
          You’re not a member of any organizations yet. 
          Contact an admin or accept an invitation.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Select an Organization</h1>
      <p>Please choose an organization to continue:</p>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {organizations.map((org) => (
          <li key={org.id} style={{ margin: "10px 0" }}>
            <button
              onClick={() => handleSelect(org.id)}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              {org.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
