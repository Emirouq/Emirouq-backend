const { unique } = require("agenda/dist/job/unique");
const { Schema, model } = require("mongoose");

const slugify = require("slugify");

const attributeSchema = new Schema(
  {
    uuid: { type: String, required: true, unique: true },
    category: { type: String, required: true }, // reference to Category uuid
    subCategory: { type: String, required: true }, // reference to SubCategory uuid
    label: { type: String, required: true }, // e.g. "Brand", "Model", "Color", "Size"
    //its very important to keep attributeKey unique for each attribute so that, on client side, it will help us to call the api for attribute options
    attributeKey: { type: String, required: false }, // e.g. "brand", "model", "color", "size"
    filterType: {
      type: String,
      enum: ["text", "number", "select", "checkbox"],
      required: true,
    },
    visibleInFilter: { type: Boolean, default: true },
    order: { type: Number },

    //its very important to save depends on, coz on client side, when we select brand, then only we will call the api to get models of that brand
    //if null, then its a parent attribute, e.g. "brand"
    //if not null, then its a child attribute, e.g. "model" depends on "brand"
    dependsOn: { type: String, default: null }, // attributeKey of the parent attribute, e.g. "brand" for "model"
  },
  {
    timestamps: true,
  }
);

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
