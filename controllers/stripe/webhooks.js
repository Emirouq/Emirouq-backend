const util = require("util");
const stripe = require("../../services/stripe/getStripe");
const UserModel = require("../../models/User.model");
const Transaction = require("../../models/Transaction.model");
const dayjs = require("dayjs");
const { webhookSecret } = require("../../config/keys").stripe;
const { tier1, tier2, trial, usdTier1, testing, tradeLizerTesting } =
  require("../../config/keys").stripe.plans;
const { v4: uuid } = require("uuid");
const AccountModel = require("../../models/Account.model");
const { sendEmail } = require("../../services/util/sendEmail");
const { invoiceTemplate } = require("../../utils/templates/invoice");

const webhooks = async (req, res) => {
  let data;
  // making a user variable here because individual switch cases do not have block scopes
  let user;
  let eventType;
  // Check if webhook signing is configured.
  if (webhookSecret) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers["stripe-signature"];

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  console.log(
    "*************** webhook event type: ",
    eventType,
    " ***************"
  );

  switch (eventType) {
    case "customer.subscription.deleted":
      try {
        const user = await UserModel.findOneAndUpdate(
          { "stripe.customerId": data?.object?.customer },
          {
            $set: {
              "stripe.subscriptionStatus": "inactive",
              "limits.accounts": 1,
              "limits.backtesting": false,
              "limits.storage": 1,
              "limits.plan": "free",
            },
            $unset: {
              "stripe.subscriptionValidUntil": "",
              "stripe.subscriptionId": "",
              "stripe.trialEndsAt": "",
              "stripe.isTrial": "",
              "stripe.defaultPaymentMethod": "",
              "stripe.fingerPrint": "",
            },
          },
          { new: true }
        );
        const account = await AccountModel.find({ user: user?.uuid }).sort({
          createdAt: 1,
        });
        // get the first account and the rest of the accounts
        const [firstAccount, ...restAccounts] = account;
        // if there are more than one account, set the status of all accounts to inactive
        if (restAccounts)
          await AccountModel.updateMany(
            {
              uuid: {
                $in: restAccounts?.map((account) => account.uuid),
              },
            },
            { $set: { status: "inactive" } }
          );
      } catch (err) {}
      break;
    case "subscription_schedule.canceled":
      try {
        const users = await UserModel.findOneAndUpdate(
          {
            "stripe.customerId": data?.object?.customer,
          },
          {
            $set: {
              "stripe.subscriptionStatus": "inactive",
              "limits.accounts": 1,
              "limits.backtesting": false,
              "limits.storage": 1,
              "limits.plan": "free",
            },
            $unset: {
              "stripe.subscriptionValidUntil": "",
              "stripe.subscriptionId": "",
              "stripe.trialEndsAt": "",
              "stripe.isTrial": "",
              "stripe.defaultPaymentMethod": "",
              // "stripe.cancel_at": "",
              // "stripe.canceled_at": "",
            },
          },
          { new: true }
        );

        const userAccounts = await AccountModel.find({
          user: users?.uuid,
        }).sort({
          createdAt: 1,
        });
        const [first, ...rest] = userAccounts;
        if (rest) {
          await AccountModel.updateMany(
            {
              uuid: {
                $in: rest?.map((account) => account?.uuid),
              },
            },
            { $set: { status: "inactive" } }
          );
        }
      } catch (err) {}
      // Then define and call a function to handle the event subscription_schedule.canceled
      break;
    case "subscription_schedule.aborted":
      // Then define and call a function to handle the event subscription_schedule.aborted
      break;
    case "customer.subscription.created":
      break;
    case "customer.subscription.updated":
      try {
        const userDetails = await UserModel.findOne({
          "stripe.customerId": data.object.customer,
        });
        if (data.object.cancel_at_period_end) {
          await UserModel.findOneAndUpdate(
            {
              uuid: userDetails?.uuid,
            },
            {
              $set: {
                "stripe.cancel_at": data.object.cancel_at,
                "stripe.canceled_at": data.object.canceled_at,
              },
            },
            { new: true }
          );
        }
      } catch (err) {}
      break;
    case "checkout.session.completed":
      // Payment is successful and the subscription is created.
      // You should provision the subscription and save the customer ID to your database.
      break;
    case "invoice.paid":
      //   if(data.object.billing_reason === "subscription_create"){
      try {
        const subscription = await stripe.subscriptions.retrieve(
          data.object.subscription,
          {
            expand: ["discounts"],
          }
        );
        console.log(subscription, "subscription");
        // set limits for user conditionally
        const limits = {
          accounts: 1,
          backtesting: false,
          storage: 1,
          plan: "free",
        };
        const invoiceId = data.object.lines.data[0].invoice; // Invoice ID

        // Fetch the invoice using the ID
        const invoice = await stripe.invoices.retrieve(invoiceId, {
          expand: ["discounts", "charge"],
        });

        const stripeDataObject = {
          priceId: data?.object?.lines?.data?.[0]?.plan?.id,
          amount: data?.object?.lines?.data?.[0]?.plan?.amount,
        };
        const invoiceObject = {
          invoiceId: invoice?.id,
          invoicePdf: invoice?.invoice_pdf,
          hostedUrl: invoice?.hosted_invoice_url,
          invoiceDate: dayjs.unix(invoice?.created).format("MMMM DD, YYYY"),
          invoiceAmount: invoice?.amount_paid / 100,
          discount: invoice?.discounts,
          invoiceNumber: invoice?.number,
          total: invoice?.total / 100,
          subtotal: invoice?.subtotal / 100,
          invoiceNumber: invoice?.number,
          tax: invoice?.tax / 100,
          defaultPaymentMethod: invoice?.charge?.payment_method,
          fingerPrint:
            invoice?.charge?.payment_method_details?.card?.fingerprint,
          charge: invoice?.charge?.id,
        };

        if (stripeDataObject?.priceId === tier1) {
          limits.accounts = 1;
          limits.backtesting = false;
          limits.storage = 5;
          limits.plan = "basic_monthly";
        } else if (stripeDataObject?.priceId === tier2) {
          limits.accounts = 10;
          limits.backtesting = true;
          limits.storage = 10;
          limits.plan = "premium_monthly";
        } else if (stripeDataObject?.priceId === trial) {
          limits.accounts = 10;
          limits.backtesting = true;
          limits.storage = 10;
          limits.plan = "premium_monthly";
        } else if (stripeDataObject?.priceId === usdTier1) {
          limits.accounts = 1;
          limits.backtesting = false;
          limits.storage = 5;
          limits.plan = "basic_monthly";
        } else if (stripeDataObject?.priceId === testing) {
          limits.accounts = 10;
          limits.backtesting = true;
          limits.storage = 10;
          limits.plan = "premium_monthly";
        } else if (stripeDataObject?.priceId === tradeLizerTesting) {
          limits.accounts = 10;
          limits.backtesting = true;
          limits.storage = 10;
          limits.plan = "premium_monthly";
        }
        const userDetails = await UserModel.findOne({
          "stripe.customerId": subscription.customer,
        });
        console.log(
          invoiceObject.defaultPaymentMethod,
          "invoiceObject.defaultPaymentMethod"
        );
        // if the user has not used the payment method (fingerprint) before, attach the payment method to the customer
        if (
          !userDetails?.stripe?.usedFingerPrints?.includes(
            invoiceObject?.fingerPrint
          ) &&
          invoiceObject.defaultPaymentMethod
        )
          await stripe.paymentMethods.attach(
            invoiceObject?.defaultPaymentMethod,
            {
              customer: subscription.customer,
            }
          );
        console.log("save User Subscription");
        // update user to store subscription id
        const userData = await UserModel.findOneAndUpdate(
          { "stripe.customerId": subscription.customer },
          {
            $set: {
              "stripe.subscriptionId": subscription.id,
              "stripe.subscriptionStatus": "active",
              "stripe.subscriptionValidUntil": dayjs
                .unix(subscription.current_period_end)
                .toISOString(),
              "stripe.defaultPaymentMethod":
                invoiceObject?.defaultPaymentMethod,
              "stripe.fingerPrint": invoiceObject?.fingerPrint,
              limits,
              ...(stripeDataObject?.priceId === trial && {
                "stripe.isTrial": subscription.status === "trialing",
                "stripe.trialEndsAt": dayjs
                  .unix(subscription.trial_end)
                  .toISOString(),
              }),
            },
            // here we are adding the fingerprint to the usedFingerPrints array to keep track of the payment methods used by the user
            $addToSet: {
              "stripe.usedFingerPrints": invoiceObject?.fingerPrint,
            },
            $unset: {
              "stripe.cancel_at": "",
              "stripe.canceled_at": "",
              "stripe.isTrial": "",
              isTrial: "",
            },
          },
          { new: true }
        );
        if (userData?.uuid) {
          let transaction;
          transaction = await Transaction.create({
            subTotal: invoiceObject?.subtotal,
            uuid: uuid(),
            userId: userData?.uuid,
            user: {
              firstName: userData?.firstName,
              lastName: userData?.lastName,
              userHandle: userData?.userHandle?.toLowerCase(),
              email: userData?.email,
            },
            amount: data?.object?.amount_paid,
            paymentIntentId: data?.object?.payment_intent,
            subscriptionId: subscription?.id,
            customerId: subscription?.customer,
            status: "completed",
            invoicePdf: invoiceObject?.invoicePdf,
            invoiceId: invoiceObject?.invoiceId,
            discount: invoiceObject?.discount,
            invoiceNumber: invoiceObject?.invoiceNumber,
            hostedUrl: invoiceObject?.hostedUrl,
            tax: invoiceObject?.tax,
            defaultPaymentMethod: invoiceObject?.defaultPaymentMethod,
            charge: invoiceObject?.charge,
          });

          await AccountModel.updateMany(
            { user: userData.uuid },
            { $set: { status: "active" } }
          );
          if (invoiceObject?.discount?.length) {
            for (let x of invoiceObject?.discount) {
              const couponDetails = await CouponModel.findOne({
                stripeCouponId: x.coupon?.id,
              });
              if (couponDetails?.stripeCouponId) {
                couponDetails.timesRedeemed = x.coupon.times_redeemed;
                await couponDetails.save();
              }
              const couponHistoryExist = await CouponHistory.findOne({
                couponCode: x?.coupon?.id,
                user: userData?.uuid,
              });
              if (couponHistoryExist) {
                await CouponHistory.findOneAndUpdate(
                  {
                    user: userData?.uuid,
                    couponCode: x?.coupon?.id,
                  },
                  {
                    $set: {
                      isUsed: true,
                    },
                    $addToSet: {
                      transactions: transaction.uuid,
                    },
                  },
                  { new: true }
                );
              } else {
                //create coupon history
                await CouponHistory.create({
                  uuid: uuid(),
                  user: userData.uuid,
                  couponCode: x.coupon.id,
                  couponName: x.coupon.name,
                  promoCode: x.promotion_code,
                  subscriptionId: subscription.id,
                  transactions: [transaction.uuid],
                  isUsed: true,
                });
              }
            }
          }

          await sendEmail(
            [userData.email],
            `TradeLizer Invoice`,
            invoiceTemplate(invoiceObject)
            // "noreply@tradelizer.com"
          );
        }
      } catch (err) {}

      // Continue to provision the subscription as payments continue to be made.
      // Store the status in your database and check when a user accesses your service.
      // This approach helps you avoid hitting rate limits.
      break;
    case "invoice.payment_failed":
      try {
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.

        const subscriptionData = await stripe.subscriptions.retrieve(
          data?.object?.subscription,
          {
            expand: ["discounts"],
          }
        );
        const stripeCustomer = await UserModel.findOne({
          "stripe.customerId": subscriptionData?.customer,
        });
        //invoice Ids
        const id = data?.object?.lines?.data?.[0]?.invoice; // Invoice ID

        // Fetch the invoice using the ID
        const expandedInvoice = await stripe.invoices.retrieve(id, {
          expand: ["discounts", "charge"],
        });

        //here we are creating a transaction for the failed invoice payment to store the data in the database
        // this transaction will be used to show the user the failed invoice details in the future
        // charge object will return the payment method used for the invoice payment and the outcome of the payment attempt
        // outcome will have the reason for the payment failure
        const invoiceDataObject = {
          invoiceId: expandedInvoice?.id,
          invoicePdf: expandedInvoice?.invoice_pdf,
          hostedUrl: expandedInvoice?.hosted_invoice_url,
          invoiceDate: dayjs
            .unix(expandedInvoice?.created)
            .format("MMMM DD, YYYY"),
          invoiceAmount: expandedInvoice?.amount_paid / 100,
          discount: expandedInvoice?.discounts,
          invoiceNumber: expandedInvoice?.number,
          total: expandedInvoice?.total / 100,
          subtotal: expandedInvoice?.subtotal / 100,
          invoiceNumber: expandedInvoice?.number,
          tax: expandedInvoice?.tax / 100,
          defaultPaymentMethod: expandedInvoice?.charge?.payment_method,
          charge: expandedInvoice?.charge?.id,
          outcome: expandedInvoice?.charge?.outcome,
        };
        await Transaction.create({
          uuid: uuid(),
          subTotal: invoiceDataObject?.subtotal,
          userId: stripeCustomer?.uuid,
          user: {
            firstName: stripeCustomer.firstName,
            lastName: stripeCustomer.lastName,
            userHandle: stripeCustomer?.userHandle?.toLowerCase(),
            email: stripeCustomer?.email,
          },
          amount: data?.object?.amount_paid,
          paymentIntentId: data?.object?.payment_intent,
          subscriptionId: data?.object?.subscription,
          customerId: data?.object?.customer,
          status: "failed",
          invoicePdf: invoiceDataObject?.invoicePdf,
          invoiceId: invoiceDataObject?.invoiceId,
          discount: invoiceDataObject?.discount,
          invoiceNumber: invoiceDataObject?.invoiceNumber,
          hostedUrl: invoiceDataObject?.hostedUrl,
          tax: invoiceDataObject?.tax,
          defaultPaymentMethod: invoiceDataObject?.defaultPaymentMethod,
          charge: invoiceDataObject?.charge,
          outcome: invoiceDataObject?.outcome,
        });
      } catch (err) {}

      break;
    // Sent three days before the trial period ends. If the trial is less than 3 days, this event is triggered.
    case "customer.subscription.trial_will_end":
      // Then define and call a function to handle the event customer.subscription.trial_will_end
      break;
    //Sent when a subscription deleted.
    // case "customer.subscription.updated":
    case "coupon.updated":
      break;

    case "coupon.deleted":
      break;

    case "coupon.updated":
      break;

    default:
    // Unhandled event type
  }

  res.sendStatus(200);
};

module.exports = webhooks;
