/**
 * Emergency reset for an admin who lost both their phone and backup codes.
 * Turns 2FA off for that admin; they set it up again at their next sign-in
 * (a password is still required). Needs server access, so it cannot be
 * triggered from the web.
 *
 *   node scripts/resetAdminTwoFactor.js admin@example.com           # dry run
 *   node scripts/resetAdminTwoFactor.js admin@example.com --apply   # reset
 */
const mongoose = require("mongoose");
const { v4: uuid } = require("uuid");
const { dbUrl } = require("../config/keys").host;
const Admin = require("../models/Admin.model");
const AdminAuditLog = require("../models/AdminAuditLog.model");

const email = process.argv[2]?.trim().toLowerCase();
const apply = process.argv.includes("--apply");

const run = async () => {
  if (!email || email.startsWith("--")) {
    console.log("Usage: node scripts/resetAdminTwoFactor.js <admin email> [--apply]");
    return;
  }
  await mongoose.connect(dbUrl);
  const admin = await Admin.findOne({ email }).lean();
  if (!admin) {
    console.log(`No admin with email ${email}.`);
    return;
  }
  console.log(
    `${admin.firstName} ${admin.lastName} <${admin.email}>: 2FA ${
      admin.twoFactor?.enabled ? "on" : "off"
    }.`
  );
  if (!apply) {
    console.log("Dry run. Nothing changed. Add --apply to reset.");
    return;
  }
  await Admin.updateOne({ uuid: admin.uuid }, { $unset: { twoFactor: "" } });
  await AdminAuditLog.create({
    uuid: uuid(),
    adminName: "Server script",
    action: "admin.2fa_reset",
    entityType: "admin",
    entityId: admin.uuid,
    entityName: admin.email,
  });
  console.log("2FA reset. The admin sets it up again at the next sign-in.");
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
