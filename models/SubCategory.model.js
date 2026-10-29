const { Schema, model } = require("mongoose");

const SubCategorySchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      ref: "Category",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Disabled categories take no new ads. Turning a category off never
    // deletes its sub-categories, fields, plans or free settings, so
    // re-enabling restores it exactly as it was.
    disabledAt: { type: Date },
    disabledBy: { type: String },
    // What happened to live ads when it was disabled: "keep" or "hide".
    disabledAdsPolicy: { type: String, enum: ["keep", "hide"] },
    logo: {
      type: String,
      required: true,
    },
    // Free category: users publish here without a plan or payment. Toggled by
    // admin at any time; ads already published keep their own terms.
    isFree: {
      type: Boolean,
      default: false,
    },
    // How long a free ad in this category stays live, in days.
    freeAdValidityDays: {
      type: Number,
      default: 30,
    },
    properties: [{ type: String, ref: "Attribute" }],
  },
  { timestamps: true }
);

const SubCategory = model("SubCategory", SubCategorySchema, "subCategories");

module.exports = SubCategory;
