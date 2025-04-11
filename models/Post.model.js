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
    expirationDate: {
      type: Number,
    },
    // when user plan get expired, we will set the post expired as true
    isExpired: {
      type: Boolean,
      default: false,
    },
    addOns: [
      {
        type: {
          // Determines the type of add-on
          type: String,
          enum: ["featured", "urgent", "spotlight"],
          required: true,
        },
        durationDays: {
          // How long the add-on is active
          type: Number,
          required: true,
        },
        price: {
          // The price for the add-on
          type: Number,
          required: true,
        },
        startDate: {
          // When the add-on became active
          type: Date,
          default: Date.now,
        },
        endDate: {
          // End Date of add-on
          type: Date,
        },
        // Optional field for "Spotlight" ads to indicate placement details
        spotlightPriority: {
          type: String,
          enum: ["basic", "higher"], // As discussed earlier, use priority
          default: "basic",
        },
      },
    ],
    // Visibility is determined by add-ons
    isVisible: {
      type: Boolean,
      default: true,
    },
    adType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
  },
  { timestamps: true }
);

const Post = model("Post", PostSchema, "posts");

module.exports = Post;
