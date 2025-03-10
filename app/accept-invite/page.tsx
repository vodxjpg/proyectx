// /app/accept-invite/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/utils/auth-client";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function acceptInvitation() {
      if (!invitationId) {
        setError("Missing invitation ID");
        setLoading(false);
        return;
      }

      try {
        // Accept the invitation using better-auth's organization plugin
        await authClient.organization.acceptInvitation({ invitationId });
        router.push("/dashboard"); // Redirect after accepting
      } catch (err) {
        setError("Failed to accept invitation: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    acceptInvitation();
  }, [invitationId, router]);

  if (loading) return <div>Accepting invitation...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Invitation accepted! Redirecting...</div>;
}