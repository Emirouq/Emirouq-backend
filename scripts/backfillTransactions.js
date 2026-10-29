/**
 * One-off: creates Transaction rows for payments made before transactions were
 * recorded (the collection used to stay empty). Reads invoices and boost
 * payments from Stripe; never changes anything in Stripe.
 *
 *   node scripts/backfillTransactions.js           # dry run: only counts
 *   node scripts/backfillTransactions.js --apply   # writes the rows
 *
 * Safe to run more than once: rows are keyed by invoice / payment intent id.
 */
const mongoose = require("mongoose");
const { dbUrl } = require("../config/keys").host;
const stripe = require("../services/stripe/getStripe");
const User = require("../models/User.model");
const UserSubscription = require("../models/UserSubscription.model");
const SubscriptionPlan = require("../models/SubscriptionPlan.model");
const Transaction = require("../models/Transaction.model");
const {
  recordInvoiceTransaction,
  recordPaymentIntentTransaction,
} = require("../services/stripe/recordTransaction");

const apply = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(dbUrl);
  const counts = { invoices: 0, boosts: 0, alreadyRecorded: 0, errors: 0 };

  const subscriptions = await UserSubscription.find({}).lean();
  const customers = new Set();
  for (const sub of subscriptions) {
    customers.add(sub.customerId);
    const user = await User.findOne({ uuid: sub.user }).lean();
    const plan = await SubscriptionPlan.findOne({
      uuid: sub.subscriptionPlan?.planId,
    }).lean();
    try {
      const invoices = await stripe.invoices.list({
        subscription: sub.subscriptionId,
        limit: 100,
      });
      for (const invoice of invoices.data) {
        if (!["paid", "open", "uncollectible"].includes(invoice.status)) continue;
        if (await Transaction.exists({ invoiceId: invoice.id })) {
          counts.alreadyRecorded += 1;
          continue;
        }
        counts.invoices += 1;
        if (apply) {
          await recordInvoiceTransaction({
            invoiceId: invoice.id,
            user,
            plan: plan || {
              uuid: sub.subscriptionPlan?.planId,
              name: sub.subscriptionPlan?.name,
              categoryId: sub.subscriptionPlan?.categoryId,
            },
            userSubscriptionId: sub.uuid,
            status: invoice.status === "paid" ? "succeeded" : "failed",
          });
        }
      }
    } catch (error) {
      counts.errors += 1;
      console.warn(`Subscription ${sub.subscriptionId}: ${error.message}`);
    }
  }

  // Ad boosts: one-off payment intents carrying our postId metadata.
  const boostCustomers = await User.find({ customerId: { $exists: true, $ne: null } })
    .select("uuid customerId firstName lastName email userHandle")
    .lean();
  for (const user of boostCustomers) {
    try {
      const intents = await stripe.paymentIntents.list({
        customer: user.customerId,
        limit: 100,
      });
      for (const intent of intents.data) {
        if (!(intent.metadata?.postId || intent.metadata?.isFeaturedAd)) continue;
        // A payment sheet opened and never paid is not a transaction; only
        // record real payments and real card failures.
        const failed = !!intent.last_payment_error;
        if (intent.status !== "succeeded" && !failed) continue;
        if (await Transaction.exists({ paymentIntentId: intent.id })) {
          counts.alreadyRecorded += 1;
          continue;
        }
        counts.boosts += 1;
        if (apply) {
          await recordPaymentIntentTransaction({
            paymentIntentId: intent.id,
            user,
            status: intent.status === "succeeded" ? "succeeded" : "failed",
          });
        }
      }
    } catch (error) {
      counts.errors += 1;
      console.warn(`Customer ${user.customerId}: ${error.message}`);
    }
  }

  console.log(
    `${apply ? "Recorded" : "Would record"}: ${counts.invoices} subscription invoices, ` +
      `${counts.boosts} boost payments. Already recorded: ${counts.alreadyRecorded}. ` +
      `Errors: ${counts.errors}.`
  );
  if (!apply) console.log("Dry run. Nothing changed. Run again with --apply to write.");
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
