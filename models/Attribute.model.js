const { unique } = require("agenda/dist/job/unique");
const { Schema, model } = require("mongoose");

const slugify = require("slugify");

const attributeSchema = new Schema({
  uuid: { type: String, required: true, unique: true },
  category: { type: String, required: true }, // reference to Category uuid
  subCategory: { type: String, required: true }, // reference to SubCategory uuid
  label: { type: String, required: true }, // e.g. "Brand", "Model", "Color", "Size"
  attributeKey: { type: String, required: false }, // e.g. "brand", "model", "color", "size"
  filterType: {
    type: String,
    enum: ["text", "number", "select", "checkbox", "range"],
    required: true,
  },
  visibleInFilter: { type: Boolean, default: true },
  order: { type: Number },
});

attributeSchema.index({ label: 1, subCategory: 1 }, { unique: true });
attributeSchema.pre("save", function (next) {
  if (!this.attributeKey && this.label) {
    this.attributeKey = slugify(this.label, {
      lower: true,
      strict: true, // removes special chars
      replacement: "_",
    });
  }
  next();
});

const Attribute = model("Attribute", attributeSchema, "attributes");

module.exports = Attribute;
