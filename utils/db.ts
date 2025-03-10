// /home/zodx/Desktop/proyectx/utils/db.ts
import path from "path";
import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";

interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: number; // or boolean
  image?: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
  banned?: number;
  banReason?: string;
  banExpires?: string;
  onboardingCompleted: number; // store as integer 0 or 1
}

interface SessionTable {
  id: string;
  expiresAt: string;
  token: string;
  createdAt: string;
  updatedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  userId: string;
  impersonatedBy?: string;
  activeOrganizationId?: string;
}

interface AccountTable {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  scope?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TenantTable {
  id: number;
  ownerUserId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  encryptedSecretPhrase: string | null;
  onboardingCompleted: number; // 0 or 1 (stored as INTEGER)
}

interface TenantPlatformTable {
  id: number;
  tenantId: number;
  platformName: string;
  encryptedApiKey: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

interface OrganizationTable {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  metadata: string | null;
}

interface MemberTable {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
}

interface InvitationTable {
  id: string;
  organizationId: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: string;
  inviterId: string;
}

interface JWKSTable {
  id: string;
  publicKey: string;
  privateKey: string;
  createdAt: string;
}

interface OrganizationSupportEmailTable {
  id: string;
  organizationId: string;
  userId: string;
  encryptedSupportEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  tenant: TenantTable;
  tenant_platforms: TenantPlatformTable;
  organization: OrganizationTable;
  member: MemberTable;
  invitation: InvitationTable;
  jwks: JWKSTable;
  organization_support_email: OrganizationSupportEmailTable;
}

// IMPORTANT: Always use an absolute path so that both
// the API routes and the layout code read the SAME file
const dbFilePath = path.join(process.cwd(), "sqlite.db");
console.log("[DB] Using DB file:", dbFilePath);

export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({
    database: new Database(dbFilePath),
  }),
});
