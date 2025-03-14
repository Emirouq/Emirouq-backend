const { Schema, model } = require("mongoose");

const tradeSchema = new Schema(
  {
    //uuid
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    tradeId: {
      type: String,
      required: true,
      unique: true,
    },
    // uuid for which account trade is added
    accountId: {
      type: String,
      required: true,
    },
    brokerName: {
      type: String,
      required: true,
      // enum: ["manual", "quesTrade", "interactiveBrokers"],
    },
    //import via{"manual", "csv", "brokerSync"}
    importVia: {
      type: String,
      required: true,
      enum: ["manual", "csv", "brokerSync"],
    },
    //current user uuid
    user: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    underlyingSymbol: {
      type: String,
    },
    tradeType: {
      type: String,
      required: true,
      enum: [
        "stocks",
        "option",
        "future",
        "forex",
        "crypto",
        "cfd",
        "futureOption",
      ],
    }, //uuid of executions
    executions: [
      {
        type: String,
        required: true,
      },
    ],
    currentPosition: {
      type: Number,
    },
    totalCommission: {
      type: Number,
    },
    openDate: {
      type: Date,
    },
    closeDate: {
      type: Date,
    },
    latestExecutionDate: {
      type: Date,
    },
    entryPrice: {
      type: Number,
    },
    exitPrice: {
      type: Number,
    },
    avgEntryPrice: {
      type: Number,
    },
    avgExitPrice: {
      type: Number,
    },
    side: {
      type: String,
      enum: ["long", "short"],
    },
    totalBuyAmount: {
      type: Number,
    },
    totalSellAmount: {
      type: Number,
    },
    adjustedCost: {
      type: Number,
    },
    adjustedProceed: {
      type: Number,
    },
    wa: {
      grossPnl: {
        type: Number,
      },
      netPnl: {
        type: Number,
      },
      netRoi: {
        type: Number,
      },
    },
    fifo: {
      grossPnl: {
        type: Number,
      },
      netPnl: {
        type: Number,
      },
      netRoi: {
        type: Number,
      },
    },
    timeZone: {
      type: String,
    },
    // grossPnl: {
    //   type: Number,
    // },
    // netPnl: {
    //   type: Number,
    // },
    // netRoi: {
    //   type: Number,
    // },
    status: {
      type: String,
      enum: ["open", "closed"],
    },
    result: {
      type: String,
      // enum: ["win", "loss"],
    },
    totalQuantity: {
      type: Number,
    },
    calculationMethod: {
      type: String,
      required: true,
      enum: ["fifo", "lifo", "wa"],
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
    // options
    expDate: {
      type: Date,
    },
    instrument: {
      type: String,
      enum: ["call", "put"],
    },
    strike: {
      type: Number,
    },
    // for forex
    pip: {
      type: Number,
    },
    contractMultiplier: {
      type: Number,
    },
    realizeRMultiple: {
      type: Number,
    },
    plannedRMultiple: {
      type: Number,
    },
    initialTarget: {
      type: Number,
    },
    tradeRisk: {
      type: Number,
    },
    profitTarget: {
      type: Number,
    },
    stopLoss: {
      type: Number,
    },
    //trade notes
    notes: {
      type: String,
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
    breakEven: {
      type: Boolean,
      default: false,
    },

    tagAssign: {
      type: Schema.Types.Mixed, // Allows a dynamic object structure
      default: {}, // Default to an empty object
    },
    // ex:
    // "tagAssign": {
    //    "tag-uuid-1": { "assignDate": "2023-10-27T10:00:00Z" },
    //    "tag-uuid-2": { "assignDate": "2023-10-27T12:30:00Z" },
    //    "tag-uuid-3": { "assignDate": "2023-10-26T15:45:00Z" }
    //    ....
    // }
  },
  {
    timestamps: true,
  }
);

const Trade = model("Trade", tradeSchema, "trades");

module.exports = Trade;
