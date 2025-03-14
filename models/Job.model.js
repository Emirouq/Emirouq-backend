const mongoose = require("mongoose");

const jobSchema = mongoose.Schema({
  // uuid of the user for which job is created
  user: {
    type: String,
    required: [true, "User id is required"],
  },
});

const Job = mongoose.model("Job", jobSchema, "jobsAgenda");

module.exports = Job;
