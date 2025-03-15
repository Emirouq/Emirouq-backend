const { Schema, model } = require("mongoose");

const PostSchema = new Schema(
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
    condition: {
      type: String,
      enum: ["new", "used"],
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    timePeriod: {
      type: String,
      default: "7 days",
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

const Post = model("Post", PostSchema, "posts");

module.exports = Post;
