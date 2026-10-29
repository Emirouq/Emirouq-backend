const { Schema, model } = require("mongoose");

/** Atomic sequences, e.g. support ticket numbers. One document per key. */
const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

module.exports = model("Counter", CounterSchema, "counters");
