const { Schema, model } = require("mongoose");

const CommentSchema = new Schema(
  {
    uuid: { type: String, required: true },
    userId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
      enum: ["pending", "draft", "active", "expired", "rejected"],
      default: "pending",
    },
    location: {
      placeId: {
        type: String,
      },
      name: {
        type: String,
      },
      street: {
        type: String,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
      },
      countryCode: {
        type: String,
      },
      state: {
        type: String,
      },
      stateCode: {
        type: String,
      },
      city: {
        type: String,
      },
    },
    geometry: {
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
    },
    timePeriod: {
      type: String,
      default: "7 days",
      // required: true,
    },
    subCategory: { type: String, ref: "SubCategory", required: false },
    category: { type: String, ref: "Category", required: true },
    properties: [
      {
        uuid: { type: String, required: true },
        label: { type: String, required: true },
        filterType: { type: String, required: true },
        dependsOn: { type: String, required: false },
        attributeKey: { type: String, required: true },
        selectedValue: { type: Schema.Types.Mixed, required: true },
      },
    ],
    viewBy: {
      type: String,
    },
    // addOns: [
    //   {
    //     type: {
    //       // Determines the type of add-on
    //       type: String,
    //       enum: ["featured", "urgent", "spotlight"],
    //       required: true,
    //     },
    //     duration: {
    //       // How long the add-on is active
    //       type: Number,
    //       required: true,
    //     },
    //     price: {
    //       // The price for the add-on
    //       type: Number,
    //       required: true,
    //     },
    //     startDate: {
    //       // When the add-on became active
    //       type: Date,
    //       default: Date.now,
    //     },
    //     endDate: {
    //       // End Date of add-on
    //       type: Date,
    //     },
    //     // Optional field for "Spotlight" ads to indicate placement details
    //     spotlightPriority: {
    //       type: String,
    //       enum: ["basic", "higher"], // As discussed earlier, use priority
    //       default: "basic",
    //     },
    //   },
    // ],

    //for sorting, if featured boost set to 1
    featuredAd: {
      isFeatured: {
        type: Boolean,
        default: false, // Default to false if not specified
      },
      price: {
        type: Number,
        default: 0, // Default to 0 if not specified
      },
      createdAt: {
        type: Number,
      },
    },
    adType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
    expirationDate: {
      type: Number, // Unix timestamp for expiration date
      required: false,
    },
    // when user plan get expired, we will set the post expired as true
    isExpired: {
      type: Boolean,
      default: false,
    },
    likes: [{ type: String }], // Array of userIds who liked the post
    comments: [CommentSchema],
    // its related to subscription, when subscription is cancelled, then we will set the post expired as true
    subscriptionId: {
      type: String,
      required: false, // Optional, can be set if the post is linked to a subscription
    },
  },
  { timestamps: true }
);

PostSchema.index({ geometry: "2dsphere" });
const Post = model("Post", PostSchema, "posts");

module.exports = Post;
