const UserModel = require("../../models/User.model");
const stripe = require("../../services/stripe/getStripe");

const savePaymentMethod = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const { paymentMethodId } = req.body;
    const existingUser = await UserModel.findOne({ uuid: currentUser?.uuid });
    if (!existingUser) {
      throw new Error("User not found");
    } else if (existingUser.stripe.subscriptionStatus === "inactive") {
      throw new Error("Subscription is not active");
    }

    //check if in case customer has a default payment method
    // if no then update the default payment method
    if (existingUser?.stripe?.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(
        existingUser?.stripe?.subscriptionId
      );
      if (!subscription?.default_payment_method) {
        //first we will add attach the payment method to the customer
        //if not then the next step will gives us an error
        // that, please attach the payment method to the customer
        const paymentMethod = await stripe.paymentMethods.attach(
          paymentMethodId,
          {
            customer: existingUser.stripe.customerId,
          }
        );
        await stripe.subscriptions.update(
          existingUser?.stripe?.subscriptionId,
          {
            default_payment_method: paymentMethodId,
          }
        );
        await UserModel.findOneAndUpdate(
          { uuid: currentUser?.uuid },
          {
            $set: {
              "stripe.defaultPaymentMethod": paymentMethodId,
              "stripe.fingerPrint": paymentMethod?.card?.fingerprint,
            },
          }
        );
      } else {
        //fetch the payment method details
        // first we need to retrieve fingerprint of the card
        const {
          card: { fingerprint },
        } = await stripe.paymentMethods.retrieve(paymentMethodId);

        // here we will get all the fingerprints of the payment methods
        const paymentMethods = await stripe.customers.listPaymentMethods(
          existingUser.stripe.customerId
        );
        const allFingerprints = paymentMethods.data.map(
          (paymentMethod) => paymentMethod?.card?.fingerprint
        );
        // check if the payment method already exists
        if (!!allFingerprints.includes(fingerprint)) {
          throw new Error("Payment method already exists");
        }
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: existingUser.stripe.customerId,
        });
      }
    }

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = savePaymentMethod;
