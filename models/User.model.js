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
    subscription: {
      type: String,
      ref: "Subscription",
      default: null,
    },
    subscriptionPlan: {
      type: String,
      ref: "SubscriptionPlan",
      default: null,
    },

    freeAdCredits: {
      type: Number,
      default: 1,
    },

    referralCredits: {
      type: Number,
      default: 0,
    },

    loyaltyPoints: {
      type: Number,
      default: 0,
    },

    loyaltyTier: {
      type: String,
      default: "basic",
    },
    isBusinessAccount: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema, "user");

module.exports = User;
