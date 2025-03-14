const { Schema, model } = require("mongoose");

const TransactionSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    user: {
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
      userHandle: {
        type: String,
      },
      email: {
        type: String,
      },
    },
    subTotal: {
      type: Number,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: false,
    },
    subscriptionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    discount: [
      {
        type: Object,
      },
    ],
    invoiceId: {
      type: String,
    },
    invoiceNumber: {
      type: String,
    },
    invoicePdf: {
      type: String,
    },
    hostedUrl: {
      type: String,
    },
    tax: {
      type: Number,
    },
    defaultPaymentMethod: {
      type: String,
    },
    charge: {
      type: String,
    },
    refund: [
      {
        type: String,
      },
    ],
    outcome: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = model("Transaction", TransactionSchema, "transactions");
