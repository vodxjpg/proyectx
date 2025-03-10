// /utils/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient, magicLinkClient } from "better-auth/client/plugins";
import {
  ac,
  ownerRole,
  managerRole,
  accountantRole,
  employeeRole,
} from "@/utils/permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    adminClient(),
    organizationClient({
      ac,
      roles: {
        owner: ownerRole,
        manager: managerRole,
        accountant: accountantRole,
        employee: employeeRole,
      },
      teams: { enabled: true },
    }),
    magicLinkClient(),
  ],
});