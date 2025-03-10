-- User table with tenantId and a composite unique constraint (tenantId, email)
create table "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null,
  "emailVerified" integer not null,
  "image" text,
  "createdAt" date not null,
  "updatedAt" date not null,
  UNIQUE("tenantId", "email")
);

-- Session table now includes tenantId for fast filtering by tenant
create table "session" (
  "id" text not null primary key,
  "expiresAt" date not null,
  "token" text not null unique,
  "createdAt" date not null,
  "updatedAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id")
);

-- Account table now includes tenantId as well.
create table "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id"),
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

-- Verification table now includes tenantId to ensure tokens are scoped per tenant.
create table "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" date not null,
  "createdAt" date,
  "updatedAt" date
);
