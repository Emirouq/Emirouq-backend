const { Schema, model } = require("mongoose");

const executionSchema = new Schema(
  {
    //uuid
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    // for sorting the executions
    index: {
      type: Number,
      required: true,
    },
    // uuid for which account trade is added
    tradeId: {
      type: String,
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    timeZone: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },
    side: {
      type: String,
      required: true,
      enum: ["buy", "sell"],
    },
    price: {
      type: Number,
      required: true,
    },
    commission: {
      type: Number,
      required: true,
    },
    expDate: {
      type: Date,
    },
    instrument: {
      type: String,
      enum: ["call", "put"],
    },
    closePrice: {
      type: Number,
    },
    isExercised: {
      type: Boolean,
    },
    strike: {
      type: Number,
    },
    contractMultiplier: {
      type: Number,
    },
    numberOfContracts: {
      type: String,
    },
    currency: {
      code: {
        type: String,
        default: "USD",
      },
      name: {
        type: String,
        default: "US Dollar",
      },
      conversionRate: {
        type: Number,
      },
    },

    // calculations results
    currentPosition: {
      type: Number,
    },
    fifo: {
      profits: {
        type: Number,
      },
      adjusted: {
        type: Number,
      },
    },
    wa: {
      // weighted average
      profits: {
        type: Number,
      },
      adjusted: {
        type: Number,
      },
    },
    // this is a uniques Id that broker provides for each trade
    orderId: {
      type: String,
      required: true,
    },
    brokerName: {
      type: String,
      required: true,
      // enum: ["manual", "quesTrade", "interactiveBrokers"],
    },
    calculationMethod: {
      type: String,
      required: true,
      enum: ["fifo", "lifo", "wa"],
    },
    // import via{"manual", "csv", "brokerSync"}
    importVia: {
      type: String,
      required: true,
      enum: ["manual", "csv", "brokerSync"],
    },
    //uuid of category
    categories: [
      {
        type: String,
      },
    ],
    //uuid of tags
    tags: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

executionSchema.index(
  { importVia: 1, orderId: 1, accountId: 1, brokerName: 1 },
  { unique: true }
);

const Executions = model("Execution", executionSchema, "executions");

module.exports = Executions;
