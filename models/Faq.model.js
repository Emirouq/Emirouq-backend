const { Schema, model } = require("mongoose");

// create a schema
var faqsSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);
const Faqs = model("Faqs", faqsSchema, "faqs");

module.exports = Faqs;
