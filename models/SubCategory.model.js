const { Schema, model, Types } = require("mongoose");

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
    // logo: {
    //   type: String,
    //   required: true,
    // },
    category: {
      type: String,
      ref: "Category",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    properties: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const SubCategory = model("SubCategory", SubCategorySchema, "subCategories");

module.exports = SubCategory;
