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
      // String, not Number: a Number drops a leading "+" or "0" and cannot
      // hold an E.164 value at all. Run scripts/migrate-phone-to-string.js once
      // to convert documents written by the previous schema.
      type: String,
      trim: true,
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
      lowercase: true,
      trim: true,
      // `sparse` is essential: without it every phone-only signup stores
      // `email: null` and the second one fails with E11000 on a null key.
      unique: true,
      sparse: true,
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

// `userHandle` already declares `unique: true, sparse: true` on the field, and
// a second bare index() here conflicts with it (IndexKeySpecsConflict on sync).
// Phone is an identity just like email, so it has to be unique too. `sparse`
// keeps email-only accounts (no phoneNumber field) out of the index.
UserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1, oauthId: 1 });

const User = model("User", UserSchema, "user");

module.exports = User;
