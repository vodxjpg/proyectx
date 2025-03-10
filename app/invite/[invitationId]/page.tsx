// /app/invite/[invitationId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const { invitationId } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "redirecting">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleInvitation() {
      try {
        const res = await fetch(`/api/invite/${invitationId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Invalid invitation");
        }

        if (data.status === "magic_link_sent") {
          setStatus("redirecting");
          router.push(data.redirectTo); // Redirect to /check-email
        }
      } catch (err) {
        setError(err.message);
        setStatus("loading");
      }
    }
    handleInvitation();
  }, [invitationId, router]);

  if (status === "loading") return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return null; // Redirecting, no content needed
}