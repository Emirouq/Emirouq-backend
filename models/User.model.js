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
  },
  { timestamps: true }
);

const User = model("User", UserSchema, "user");

module.exports = User;
