const { Schema, model } = require("mongoose");

const enquirySchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const Enquiry = model("Enquiry", enquirySchema, "enquiry");

// make this available to our users in our Node applications
module.exports = Enquiry;
