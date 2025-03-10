"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { authClient } from "@/utils/auth-client";
import { useSignOut } from "@/hooks/useSignOut";

export default function UserProfile() {
  const router = useRouter();
  const { signOut } = useSignOut();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Grab the session from the client
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  if (!session) {
    return <div>Please sign in</div>;
  }

  // 2. Extract name/email, build initials
  const { name, email } = session.user;
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  // 3. Handle sign out
  const handleSignOut = async () => {
    await signOut();
    // Optionally navigate somewhere after sign out:
    // router.push("/sign-in");
  };

  // 4. Render a button that toggles the dropdown
  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2"
      >
        {/* Profile initials circle */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "#ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
        {/* Name & Email */}
        <div className="text-left">
          <div>{name}</div>
          <div className="text-sm text-gray-500">{email}</div>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                setIsOpen(false);
                router.push("/settings/general");
              }}
            >
              Settings
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
