// /home/zodx/Desktop/proyectx/utils/db.ts

import path from "path";
import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";

/**
 * ---------------------------------------------
 * TABLE INTERFACES
 * ---------------------------------------------
 */

// -------------- Basic Auth / Platform Tables --------------
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

interface OrganizationCountriesTable {
  id: string;
  organizationId: string;
  countryCode: string;
  logistics_group: number | null; // Bigint stored as INTEGER in SQLite
  support_group: number | null;   // Bigint stored as INTEGER in SQLite
  createdAt: string;
  updatedAt: string;
}

interface OrganizationSupportEmailTable {
  id: string;
  organizationId: string;
  userId: string;
  encryptedSupportEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductCategoryTable {
  id: string;
  name: string;
  image: string | null;
  slug: string;
  organizationId: string;
  parentId: string | null;
}

// -------------- Product & E-commerce Tables --------------
interface ProductAttributeTable {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
}

interface ProductAttributeTermTable {
  id: string;
  attributeId: string;
  name: string;
  slug: string;
  organizationId: string;
}

interface ProductAttributeAssignmentTable {
  id: string;
  productId: string;
  attributeId: string;
  usedForVariation: number; // 0 or 1
  organizationId: string;
}

interface ProductTermTable {
  id: string;
  productId: string;
  attributeId: string;
  termId: string;
  organizationId: string;
}

interface ProductVariantTermTable {
  id: string;
  variantId: string;
  attributeId: string;
  termId: string;
  organizationId: string;
}

interface ProductStockTable {
  id: string;
  variantId: string;  // references product_variants(id)
  countryCode: string;
  stockLevel: number;
  visibility: number;     // 0 or 1
  manageStock: number;    // 0 or 1
  allowBackorder: number; // 0 or 1
  organizationId: string;
}

/** 
 * NEW IMAGE COLUMN:
 *  - Add `imageURL?: string | null;` to ProductTable
 *  - Add `imageURL?: string | null;` to ProductVariantTable
 */
interface ProductTable {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: 'simple' | 'variable';
  sku: string | null;
  price: number | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  imageURL?: string | null; // <--- NEW column
}

interface ProductVariantTable {
  id: string;
  productId: string;
  organizationId: string;
  sku: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  imageURL?: string | null; // <--- NEW column
}

interface ProductCategoryAssignmentTable {
  id: string;
  productId: string;
  categoryId: string;
  organizationId: string;
}

// -------------- COMBINED SCHEMA for Kysely --------------
interface DatabaseSchema {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  tenant: TenantTable;
  tenant_platforms: TenantPlatformTable;
  organization: OrganizationTable;
  organization_support_email: OrganizationSupportEmailTable;
  organization_countries: OrganizationCountriesTable;
  member: MemberTable;
  invitation: InvitationTable;
  jwks: JWKSTable;

  product_categories: ProductCategoryTable;
  product_attributes: ProductAttributeTable;
  product_attribute_terms: ProductAttributeTermTable;
  product_attribute_assignments: ProductAttributeAssignmentTable;
  product: ProductTable;
  product_variants: ProductVariantTable;
  product_category_assignments: ProductCategoryAssignmentTable;
  product_term: ProductTermTable;
  product_variant_terms: ProductVariantTermTable;
  product_stock: ProductStockTable;
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
