const { Schema, model } = require("mongoose");

const BrokerSyncSchema = new Schema(
  {
    uuid: {
      type: String,
      required: false,
      unique: true,
    },
    //this is the user uuid
    // signifying the user who has added the broker to the system for specific account
    // so that when fetching the broker details we can fetch the details of the broker for the specific user
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: false,
      enum: ["success", "failed", "syncing"],
    },

    // for snaptrade brokers, this is set to true when the brokerage authorizations needs to be re-connected
    isDisconnected: {
      type: Boolean,
      default: false,
    },

    accountName: {
      type: String,
      required: true,
    },
    // uuid of the account
    accountId: {
      type: String,
      required: true,
    },
    broker: {
      type: String,
      required: true,
      // enum: ["interactiveBrokers", "quesTrade"],
    },
    lastSyncedAt: {
      type: Date,
      required: false,
    },
    nextSyncAt: {
      type: Date,
      required: false,
    },
    lastSuccessSyncAt: {
      type: Date,
    },
    details: {
      type: Object,
      required: false,
    },
    snapTrade: {
      accountId: { type: String },
    },
    error: {
      type: String,
      required: false,
    },
    timeZone: {
      type: String,
      required: false,
    },
    snaptrade: {
      type: Boolean,
    },
    accountInformation: {
      balance: {
        type: Number,
      },
      accountBalance: [
        {
          currency: {
            code: {
              type: String,
            },
            name: {
              type: String,
            },
          },
          cash: {
            type: Number,
          },
          buying_power: {
            type: Number,
          },
        },
      ],
      positions: [
        {
          //options || stocks
          tradeType: {
            type: String,
          },
          symbol: {
            type: String,
          },
          rawSymbol: {
            type: String,
          },
          units: {
            type: Number,
          },
          price: {
            type: Number,
          },
        },
      ],
      totalValues: {
        type: Number,
      },
      balance: {
        type: Number,
      },
    },
  },
  { timestamps: true }
);

const BrokerSync = model("BrokerSync", BrokerSyncSchema, "brokerSync");

module.exports = BrokerSync;
