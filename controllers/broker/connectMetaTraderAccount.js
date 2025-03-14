const { apiKey } = require("../../config/keys").metaApi;
const _ = require("lodash");
const MetaApi = require("metaapi.cloud-sdk").default;

const connectMetaTraderAccount = async (req, res, next) => {
  try {
    const { type, login, password, server, platform } = req.body;
    const api = new MetaApi(apiKey);

    // Fetch all existing accounts
    const accounts =
      await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();

    // Check if an account with the same login and server already exists
    let existingAccount = accounts.find(
      (a) => a.login === login && a.type.startsWith("cloud")
    );

    //If account already present
    if (existingAccount) {
      if (existingAccount.state !== "DEPLOYED") {
        await existingAccount.deploy();
      }

      if (existingAccount.connectionStatus !== "CONNECTED") {
        console.log("Waiting for account to connect");
        await existingAccount.waitConnected();
      }

      // Extract necessary properties
      const accountData = _.pick(existingAccount, [
        "id",
        "name",
        "login",
        "server",
        "state",
        "connectionStatus",
        "type",
        "platform",
        // Add other properties you need
      ]);

      // Return the existing account
      res.json({ account: accountData, message: "Account already exists" });
      return;
    }

    let name;

    if (accounts.length === 0) {
      name = `Account-${platform}-1`;
    } else {
      name = `Account-${platform}-${
        accounts[accounts.length - 1]["name"].split(" ")[1] + 1
      }`;
    }

    // const lastAccountNumber = parseInt(accounts[accounts.length - 1]["name"].split(" ")[1]);

    // Create a new MetaTrader account at MetaApi
    const newAccount = await api.metatraderAccountApi.createAccount({
      name: name,
      type: type || "cloud",
      login,
      password,
      server,
      platform,
      magic: 1000,
    });

    console.log("Deploying account");
    await newAccount.deploy();

    if (newAccount.connectionStatus !== "CONNECTED") {
      console.log("Waiting for account to connect");
      await newAccount.waitConnected();
    }

    // Extract necessary properties
    const accountData = _.pick(newAccount, [
      "id",
      "name",
      "login",
      "server",
      "state",
      "connectionStatus",
      "type",
      "platform",
      // Add other properties you need
    ]);

    // Return the new account
    res.json({
      account: accountData,
      message: "Account created successfully",
    });
  } catch (error) {
    next(error);
  }
};

const fetchMetaTraderHistoryData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const api = new MetaApi(apiKey);

    const account = await api.metatraderAccountApi.getAccount(id);

    if (!account) {
      return res.status(404).send("Account not found");
    }

    if (account.state !== "DEPLOYED") {
      console.log("Deploying account");
      await account.deploy();
    }
    if (account.connectionStatus !== "CONNECTED") {
      console.log("Waiting for account to connect");
      await account.waitConnected();
    }

    // Use the RPC connection
    const connection = account.getRPCConnection();

    await connection.connect();

    console.log(
      "Waiting for SDK to synchronize to terminal state (may take some time depending on your history size)"
    );
    await connection.waitSynchronized(); // Wait up to 5 minutes

    const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const endTime = new Date(); // Now

    // Fetch historical trade deals by time range
    const historyDeals = await connection.getHistoryOrdersByTimeRange(
      startTime,
      endTime
    );

    return res.json({ historyDeals, message: "Data fetched successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { connectMetaTraderAccount, fetchMetaTraderHistoryData };
