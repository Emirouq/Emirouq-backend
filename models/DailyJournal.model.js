const { Schema, model } = require("mongoose");

// create a schema
var dailyJournalSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    // date of the journal in format YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    type: {
      enums: ["diary", "pre-market", "post-market"],
      type: String,
      default: "diary",
      required: true,
    },
    attachments: [
      {
        uuid: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);
const DailyJournal = model("DailyJournal", dailyJournalSchema, "dailyJournal");

module.exports = DailyJournal;
