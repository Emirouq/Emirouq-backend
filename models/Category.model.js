const { Schema, model } = require("mongoose");

const CategorySchema = new Schema(
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
    logo: {
      type: String,
      required: true,
    },
    // isActive: {
    //   type: Boolean,
    //   default: true,
    // },
    // properties: [
    //   {
    //     type: String,
    //     required: true,
    //   },
    // ],
    planId: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

const Category = model("Category", CategorySchema, "categories");

module.exports = Category;
