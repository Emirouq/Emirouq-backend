const UserModel = require("../../models/User.model");
const Transaction = require("../../models/Transaction.model");
const stripe = require("../../services/stripe/getStripe");
const {
  emitPaymentNotification,
  NotificationEventType,
} = require("../../services/notification/paymentNotifications");

const refundPayment = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser.stripe.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }
    const subscription = await stripe.subscriptions.retrieve(
      existingUser.stripe.subscriptionId,
    );
    const refund = await stripe.refunds.create({
      payment_intent: subscription.default_payment_method,
      amount: 1000,
    });

    await emitPaymentNotification(
      existingUser,
      NotificationEventType.REFUND_INITIATED,
      {
        contextId: refund?.id,
        contextType: "payment",
        amount: refund?.amount / 100,
        currency: refund?.currency,
        refundId: refund?.id,
        paymentIntentId: refund?.payment_intent,
        data: {
          refundStatus: refund?.status,
        },
      },
    );

    if (refund?.status === "succeeded") {
      await emitPaymentNotification(
        existingUser,
        NotificationEventType.REFUND_COMPLETED,
        {
          contextId: refund?.id,
          contextType: "payment",
          amount: refund?.amount / 100,
          currency: refund?.currency,
          refundId: refund?.id,
          paymentIntentId: refund?.payment_intent,
          data: {
            refundStatus: refund?.status,
          },
        },
      );
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = refundPayment;
