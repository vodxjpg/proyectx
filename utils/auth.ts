// utils/auth.ts

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { MysqlDialect } from "kysely";
import { createPool } from "mysql2/promise";
import Database from "better-sqlite3";
import { SqliteDialect } from "kysely";
import { sendEmail } from "./email"; // Ensure this path points to your email utility

// Detect if we're in production
const isProduction = process.env.NODE_ENV === "production";

// Create a dialect for either MySQL or SQLite
let dialect;

if (isProduction) {
  // --- PRODUCTION (MySQL) ---
  dialect = new MysqlDialect({
    pool: createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    }),
  });
} else {
  // --- LOCAL (SQLite) ---
  dialect = new SqliteDialect({
    database: new Database("./sqlite.db"),
  });
}

export const auth = betterAuth({
  // Database configuration using the correct dialect
  database: {
    dialect,
    type: isProduction ? "mysql" : "sqlite",
  },

  // Required secrets/URLs
  secret: process.env.BETTER_AUTH_SECRET,
  url: process.env.BETTER_AUTH_URL,

  // Enable Email/Password authentication with email verification requirement
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // Function to send reset password email
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        text: `You requested a password reset. Click the following link to reset your password: ${url}`,
      });
    },
  },

  // Function to send a verification email during sign-up or when required
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify Your Email Address",
        text: `Thank you for signing up! Please verify your email address by clicking the following link: ${url}`,
      });
    },
  },

  // Automatically set cookies for Next.js
  plugins: [nextCookies()],
});
