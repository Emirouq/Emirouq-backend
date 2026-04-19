const { Schema, model } = require("mongoose");

const SavedSearchSchema = new Schema(
  {
    uuid: { type: String, required: true, unique: true },
    user: { type: String, required: true, ref: "User" },
    name: { type: String },
    criteria: {
      keyword: { type: String },
      category: { type: String },
      subCategory: { type: String },
      minPrice: { type: Number },
      maxPrice: { type: Number },
      location: {
        city: { type: String },
        country: { type: String },
      },
      properties: { type: Schema.Types.Mixed },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

SavedSearchSchema.index({ user: 1, isActive: 1 });
SavedSearchSchema.index({ "criteria.category": 1, "criteria.subCategory": 1 });

module.exports = model("SavedSearch", SavedSearchSchema, "savedSearches");
