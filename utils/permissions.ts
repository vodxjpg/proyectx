// /permissions.ts
import { createAccessControl } from "better-auth/plugins/access";

/**
 * 1) Define all resources & actions your app cares about:
 *    This includes the "default" ones from Better Auth: organization, member, invitation
 *    plus any custom ones: e.g. "reports", "orders".
 */
export const statement = {
  organization: ["update", "delete"],  // from plugin docs
  member: ["create", "update", "delete"],  // from plugin docs
  invitation: ["create", "cancel"],  // from plugin docs

  // Add your custom resources
  reports: ["view", "create", "update", "delete"],
  orders: ["view", "create", "update", "delete"],
} as const;

/**
 * 2) Create the Access Control object with all statements.
 */
export const ac = createAccessControl(statement);

/**
 * 3) Define each role. By default, the plugin has "owner", "admin", and "member",
 *    but here we create our own "owner", "manager", "accountant", "employee".
 *    - "owner" => full control
 *    - "manager" => can’t delete the entire org, but can do everything else
 *    - "accountant" => partial
 *    - "employee" => minimal
 */

// The "owner" role => everything on all resources
export const ownerRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  reports: ["view", "create", "update", "delete"],
  orders: ["view", "create", "update", "delete"],
});

// The "manager" role => no organization delete, but otherwise full
export const managerRole = ac.newRole({
  organization: ["update"], // no 'delete'
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  reports: ["view", "create", "update", "delete"],
  orders: ["view", "create", "update", "delete"],
});

// The "accountant" role => let’s say they can manage "reports" but not "orders"
export const accountantRole = ac.newRole({
  organization: [],   // no update/delete org
  member: [],         // can’t manage members
  invitation: [],     // can’t create invites
  reports: ["view", "create", "update"], 
  orders: [], // no permission
});

// The "employee" role => minimal
export const employeeRole = ac.newRole({
  organization: [], 
  member: [],       
  invitation: [],
  reports: ["view"], 
  orders: ["view"],
});
