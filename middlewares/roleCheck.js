const roleCheck = async (req, res, next, roles) => {
  try {
    const { role } = req.user;
    if (roles.includes(role)) {
      return next();
    }
    throw new Error(
      "You don't have the required permissions to complete this action."
    );
  } catch (err) {
    return res.status(403).json({ message: err.message });
  }
};

module.exports = roleCheck;
