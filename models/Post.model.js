const { Schema, model } = require("mongoose");

const PostSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      // required: true,
    },
    description: {
      type: String,
      // required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      // required: true,
    },
    file: {
      type: [String],
      // required: true,
    },
    rejectedReason: {
      type: String,
    },
    condition: {
      type: String,
      enum: ["new", "used"],
      // required: true,
    },
    status: {
      type: String,
      enum: ["pending", "draft", "active", "expired"],
      default: "pending",
    },
    location: {
      type: String,
      // required: true,
    },
    timePeriod: {
      type: String,
      default: "7 days",
      // required: true,
    },
    subCategory: { type: String, ref: "SubCategory", required: true },
    category: { type: String, ref: "Category", required: true },
    properties: [
      {
        name: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    // for Homepage Spotlight plan , we will update the post visibility
    visibility: {
      enum: ["basic", "featured", "higher"],
      type: String,
      default: "basic",
    },
    expirationDate: {
      type: Number,
    },
    // when user plan get expired, we will set the post expired as true
    isExpired: {
      type: Boolean,
      default: false,
    },
    //for free users, we will set the plan to free else name of the plan
    plan: {
      type: String,
    },
  },
  { timestamps: true }
);

const Post = model("Post", PostSchema, "posts");

module.exports = Post;
