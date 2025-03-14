const { Schema, model } = require("mongoose");

const TagsSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    //uuid of the user
    userId: {
      type: String,
      required: true,
    },
    categoryId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

const Tags = model("Tags", TagsSchema, "tags");

module.exports = Tags;
