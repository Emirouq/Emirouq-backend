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
    //update this , when webhook is called
    subscription: {
      type: String,
      ref: "Subscription",
      default: null,
    },
    //update this , when webhook is called
    subscriptionPlan: {
      plan: {
        type: String,
        required: false,
        enum: ["free", "basic", "starter", "pro", "elite", "business"],
        default: "free",
      },
      planId: {
        type: String,
        required: false,
      },
      amount: {
        type: Number,
        required: false,
      },
      currency: {
        type: String,
        required: false,
        default: "AED",
      },
      interval: {
        type: String,
        enum: ["day", "week", "month", "year"],
        required: true,
      },
      interval_count: {
        type: Number,
        required: true,
      },
      // Duration in days
      // This field is used to determine the duration of the subscription
      // ex: 7 days, 14 days, 30 days, etc.
      duration: {
        type: Number,
        required: true,
      },

      numberOfAds: {
        type: Number,
        required: true,
      },

      featuredAdBoosts: {
        type: Number,
        default: 0, // Number of "Featured Ad Boosts" included
      },

      isVerifiedBadge: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      premiumSupport: {
        type: Boolean,
        default: false,
      },
      additionalBenefits: [{ type: String }],
      //if admin can temporarily disable the plan
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    //update this , when webhook is called
    freeAdCredits: {
      type: Number,
      default: 1,
    },
    //update this , when webhook is called

    referralCredits: {
      type: Number,
      default: 0,
    },
    //update this , when webhook is called

    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    //update this , when webhook is called
    loyaltyTier: {
      type: String,
      default: "basic",
    },
    //update this , when webhook is called
    isBusinessAccount: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = model("User", UserSchema, "user");

module.exports = User;
