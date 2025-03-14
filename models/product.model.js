const { Schema, model } = require("mongoose");

const ProductSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    img: {
      type: [String],
      required: true,
    },
    subCategory: { type: String, ref: "SubCategory", required: true },
    properties: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Product = model("Product", ProductSchema, "products");

module.exports = Product;
