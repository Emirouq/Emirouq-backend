const { Schema, model } = require("mongoose");

const uploadSchema = new Schema({
  preview: {
    url: {
      type: String,
    },
    type: {
      type: String,
      enum: ["image", "audio", "video"],
    },
  },
  thumbnail: {
    url: {
      type: String,
    },
    type: {
      type: String,
      enum: ["image", "audio", "video"],
    },
  },
  description: {
    type: String,
  },
});

const universitySchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    index: {
      type: Number,
      default: 1,
    },
    section: {
      type: String,
      required: true,
    },
    data: [
      {
        type: uploadSchema,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const University = model("University", universitySchema, "university");

module.exports = University;
