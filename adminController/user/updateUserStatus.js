const User = require("../../models/User.model");
const Account = require("../../models/Account.model");
const stripe = require("../../services/stripe/getStripe");
const {
  emitVerificationNotification,
} = require("../../services/notification/verificationNotifications");
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, verificationEvent, reason } = req.body;
    const [user, account] = await Promise.all([
      User.findOne({ uuid: id }),
      // fetch the accounts by created date
      Account.find({ user: id }).sort({ createdAt: 1 }),
    ]);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.isActive = isActive;
    await user.save();

    if (!isActive) {
      //at an instant cancel stripe subscription , if user has any
      if (user?.stripe?.subscriptionId) {
        await stripe.subscriptions.cancel(user.stripe.subscriptionId);
        const subscription = await stripe.subscriptions.retrieve(
          user.stripe.subscriptionId
        );
        await User.findOneAndUpdate(
          {
            uuid: id,
          },
          {
            $set: {
              "stripe.cancel_at": subscription?.cancel_at,
              "stripe.canceled_at": subscription?.canceled_at,
            },
          },
          { new: true }
        );
      }
    }
    if (isActive) {
      // activate the first account
      const [firstAccount, ...restAccounts] = account;
      await Account.findOneAndUpdate(
        {
          uuid: firstAccount?.uuid,
        },
        { $set: { status: "active" } },
        { new: true }
      );
    } else {
      // deactivate all the accounts
      await Account.updateMany(
        {
          user: id,
        },
        { $set: { status: "inactive" } }
      );
    }

    if (verificationEvent) {
      await emitVerificationNotification(user, verificationEvent, {
        initiatorId: req.user?.uuid || "system",
        initiatorRole: "admin",
        reason,
        verificationStatus: verificationEvent,
        push: true,
      });
    } else if (isActive) {
      await emitVerificationNotification(user, "account_verified", {
        initiatorId: req.user?.uuid || "system",
        initiatorRole: "admin",
        verificationStatus: "account_verified",
        push: true,
      });
    }

    res.json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateUserStatus;
