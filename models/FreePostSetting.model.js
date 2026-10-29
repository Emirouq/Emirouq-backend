const { Schema, model } = require("mongoose");

/**
 * Admin-controlled "free trial posting" settings.
 *
 * There is exactly one document, keyed by `key: "global"`. Free posting lets a
 * user publish an ad without a subscription and without touching Stripe, in all
 * categories or only in the categories / sub-categories listed here.
 */
const FreePostSettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    // "all"      -> every category and sub-category
    // "selected" -> only `categories` (whole category) and `subCategories`
    scope: {
      type: String,
      enum: ["all", "selected"],
      default: "all",
    },
    categories: [{ type: String, ref: "Category" }],
    subCategories: [{ type: String, ref: "SubCategory" }],
    // Free-post validity: the window in which users may publish free ads.
    // Unix timestamps in seconds. Empty means "no limit" on that side.
    validFrom: {
      type: Number,
      required: false,
    },
    validUntil: {
      type: Number,
      required: false,
    },
    // How long each free ad stays live once published, in days.
    adExpiryDays: {
      type: Number,
      default: 7,
    },
    // How many free ads one user may have live at the same time.
    // 0 means unlimited.
    maxActivePostsPerUser: {
      type: Number,
      default: 1,
    },
    updatedBy: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const FreePostSetting = model(
  "FreePostSetting",
  FreePostSettingSchema,
  "freePostSettings"
);

module.exports = FreePostSetting;
