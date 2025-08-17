const { Schema, model } = require("mongoose");

const ProspectUserSchema = new Schema(
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
    firstName: {
      type: String,
      required: true,
    },
    // fullName: {
    //   type: String,
    //   required: true,
    // },
    profileImage: {
      type: String,
    },
    lastName: {
      type: String,
    },
    isEmail: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      // required: true,
      lowerCase: true,
      trim: true,
    },

    password: {
      type: String,
      required: false,
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
    oauthId: {
      type: String,
      enum: ["google", "facebook", "apple", ""],
      default: "",
    },
    userInterest: [
      {
        type: String,
      },
    ],
    favourites: [{ type: String, ref: "posts" }],

    // this is the customer id in stripe
    customerId: {
      type: String,
      // required: true,
    },
  },
  { timestamps: true }
);

const ProspectUser = model("ProspectUser", ProspectUserSchema, "prospectUser");

module.exports = ProspectUser;
