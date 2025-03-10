"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/utils/auth-client";

export function useSignOut() {
  const router = useRouter();

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            console.log('Success');
            router.push('/login');
          },
        },
      });
    } catch (error) {
      console.error("Error signing out:", error);
      // Optionally add further error handling (e.g. toast notifications)
    }
  }, [router]);

  return { signOut };
}
