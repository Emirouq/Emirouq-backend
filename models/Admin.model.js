const { Schema, model } = require("mongoose");

const AdminSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      required: true,
    },
    // Role keys (models/AdminRole.model.js). Permissions are their union.
    roles: [{ type: String }],
    // false = access revoked; existing sessions stop working at once.
    isActive: { type: Boolean, default: true },
    // Staff invitation: SHA-256 of the one-time link token.
    inviteTokenHash: { type: String },
    inviteExpiresAt: { type: Date },
    invitedBy: { type: String },
    lastLoginAt: { type: Date },
    // Authenticator-app two-factor sign-in (required for every admin).
    // Secrets are encrypted (helpers/adminTwoFactor.js); backup codes are
    // stored only as SHA-256 hashes.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      enabledAt: { type: Date },
      secretEnc: { type: String },
      // Set during setup until the admin confirms a first code.
      pendingSecretEnc: { type: String },
      pendingCreatedAt: { type: Date },
      backupCodes: [
        {
          _id: false,
          hash: { type: String },
          usedAt: { type: Date },
        },
      ],
      // Last 30-second time step accepted, so a code cannot be reused.
      lastUsedStep: { type: Number },
      failedAttempts: { type: Number, default: 0 },
      lockedUntil: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = model("Admin", AdminSchema, "admin");
