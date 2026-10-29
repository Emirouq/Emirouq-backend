/**
 * Admin role-based access control: what each module allows, and the
 * built-in roles. Permissions are strings "<module>.<action>".
 */

const ACTION_LABELS = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
};

/** Every admin module and the actions that make sense for it. */
const MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  {
    key: "users",
    label: "Users",
    actions: ["view", "create", "edit", "delete", "export"],
  },
  {
    key: "posts",
    label: "Advertisements",
    actions: ["view", "edit", "approve", "delete"],
  },
  {
    key: "categories",
    label: "Categories, fields & values",
    actions: ["view", "create", "edit", "delete"],
  },
  { key: "import", label: "Bulk import", actions: ["create"] },
  { key: "freePosting", label: "Free posting", actions: ["view", "edit"] },
  {
    key: "support",
    label: "Support & reports",
    actions: ["view", "edit", "approve"],
  },
  {
    key: "subscriptions",
    label: "Subscriptions & packages",
    actions: ["view", "create", "edit"],
  },
  // "approve" on finance = issuing refunds.
  { key: "finance", label: "Payments & transactions", actions: ["view", "export", "approve"] },
  { key: "auditLog", label: "Audit log", actions: ["view"] },
  {
    key: "staff",
    label: "Staff & roles",
    actions: ["view", "create", "edit", "delete"],
  },
];

const ALL_PERMISSIONS = MODULES.flatMap((module) =>
  module.actions.map((action) => `${module.key}.${action}`)
);

const pick = (...items) => items.flat();
const all = (moduleKey) =>
  MODULES.find((module) => module.key === moduleKey).actions.map(
    (action) => `${moduleKey}.${action}`
  );

/** Built-in roles. Super Admin always has every permission. */
const SYSTEM_ROLES = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full access, including staff and roles.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "content_admin",
    name: "Content Admin",
    description: "Categories, fields, values, bulk import and free posting.",
    permissions: pick(
      "dashboard.view",
      all("categories"),
      all("import"),
      all("freePosting"),
      "posts.view"
    ),
  },
  {
    key: "ads_category_admin",
    name: "Advertisement / Category Admin",
    description: "Reviews and moderates ads; maintains categories.",
    permissions: pick(
      "dashboard.view",
      all("posts"),
      "categories.view",
      "categories.edit",
      "support.view",
      "users.view"
    ),
  },
  {
    key: "support_admin",
    name: "Support Admin",
    description: "Handles tickets and reports, and can take down reported ads.",
    permissions: pick(
      "dashboard.view",
      all("support"),
      "users.view",
      "posts.view",
      "posts.approve"
    ),
  },
  {
    key: "finance_admin",
    name: "Finance Admin",
    description: "Subscriptions, packages, payments and exports.",
    permissions: pick(
      "dashboard.view",
      all("subscriptions"),
      all("finance"),
      "users.view"
    ),
  },
];

const SUPER_ADMIN = "super_admin";

/**
 * Permissions added to built-in roles after they were first created. Applied
 * once per role (tracked on the role), so an admin's later edits stick.
 */
const ROLE_MIGRATIONS = [
  { id: "2026-10-finance-refunds", role: "finance_admin", add: ["finance.approve"] },
];

module.exports = {
  ACTION_LABELS,
  MODULES,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  SUPER_ADMIN,
  ROLE_MIGRATIONS,
};
