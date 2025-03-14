const mongoose = require("mongoose");

const featureSchema = mongoose.Schema({
  // feature name
  feature: {
    type: String,
  },
  // user's uuid
  seen: [
    {
      type: String,
    },
  ],
});

const Job = mongoose.model("NewFeatures", featureSchema, "newFeatures");

module.exports = Job;
