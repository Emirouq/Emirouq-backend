const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: Number,
      // required: true,
    },
    // firstName: {
    //   type: String,
    //   required: true,
    // },
    fullName: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
    },
    // lastName: {
    //   type: String,
    //   required: true,
    // },
    isEmail: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      // required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
    },
    userHandle: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["customer"],
      default: "customer",
    },
    userInterest: [
      {
        type: String,
      },
    ],
    // user post visibility will be set to featured
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // user is verified
    isVerified: {
      type: Boolean,
      default: false,
    },
    //to allow user to add a urgent tag to their post
    urgentTag: {
      type: Boolean,
      default: false,
    },
    // we will set the post visibility to higher
    homePageSpotlight: {
      type: Boolean,
      default: false,
    },
    plans: {
      subscription: {
        plan: {
          type: String,
          default: "free",
        },
        duration: {
          type: String,
        },
        numberOfAds: {
          type: Mixed,
          default: 1,
        },
        price: {
          type: Number,
        },
        currency: {
          type: String,
        },
        featureAdBoost: {
          type: Boolean,
          default: false,
        },
        numberOfBoost: {
          type: Number,
        },
        visibility: {
          enum: ["basic", "featured", "higher"],
          type: String,
        },
        prioritySupport: {
          type: Boolean,
          default: false,
        },
        premiumSupport: {
          type: Boolean,
          default: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema, "user");

module.exports = User;
