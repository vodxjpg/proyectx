// /utils/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt, admin, organization, magicLink } from "better-auth/plugins"; 
import { MysqlDialect } from "kysely";
import { createPool } from "mysql2/promise";
import Database from "better-sqlite3";
import { SqliteDialect } from "kysely";
import { sendEmail } from "./emails";

const isProduction = process.env.NODE_ENV === "production";

let dialect;
if (isProduction) {
  dialect = new MysqlDialect({
    pool: createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    }),
  });
} else {
  dialect = new SqliteDialect({
    database: new Database("./sqlite.db"),
  });
}

export const auth = betterAuth({
  database: {
    dialect,
    type: isProduction ? "mysql" : "sqlite",
  },
  secret: process.env.BETTER_AUTH_SECRET,
  url: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        text: `You requested a password reset. Click the link to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify Your Email Address",
        text: `Thank you for signing up! Please verify your email by clicking this link: ${url}`,
      });
    },
  },
  plugins: [
    jwt(),
    admin({
      adminRole: ["admin", "superAdmin"],
      defaultRole: "user",
      impersonationSessionDuration: 60 * 60 * 24, // 1 day
      defaultBanReason: "No reason",
      defaultBanExpiresIn: undefined,
    }),
    organization({
      async sendInvitationEmail(data) {
        const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: "You've been invited to join an organization",
          text: `Hello!\n\nYou have been invited by ${data.inviter.user.name} (${data.inviter.user.email})\nto join the organization "${data.organization.name}".\n\nPlease click the following link to accept the invitation:\n${inviteLink}\n\nIf you did not expect this invitation, please ignore this email.`,
        });
        console.log("Invitation email sent with link:", inviteLink);
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        await sendEmail({
          to: email,
          subject: "Your Magic Link",
          text: `Click this link to log in and accept your invitation: ${url}`,
        });
      },
      expiresIn: 300, // 5 minutes
    }),
    nextCookies(),
  ],

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // NEW: databaseHooks to unset the active org ID when session is destroyed
  databaseHooks: {
    session: {
      destroy: {
        before: async (session, request) => {
          // Force activeOrganizationId to null so it doesn't linger
          session.activeOrganizationId = null;
          // Return updated session so the library knows to handle it
          return {
            data: session,
          };
        },
      },
    },
  },
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
});
