const { apiKey } = require("../../../config/keys").metaApi;
const _ = require("lodash");
const { MetaStats } = require("metaapi.cloud-sdk");
const MetaApi = require("metaapi.cloud-sdk").default;
const metaStats = new MetaStats(apiKey);
const api = new MetaApi(apiKey);

const connectMetaTraderAccount = async (broker, startTime) => {
  try {
    const {
      details: { login, password, server },
      broker: platform,
    } = broker;

    // Fetch all existing accounts
    const accounts =
      await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();

    // Check if an account with the same login and server already exists
    let existingAccount = accounts.find((a) => a.login === login);

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
      return await fetchMetaTraderHistoryData(accountData?.id, startTime);
      // return await getAccountTrades(accountData?.id);
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
      type: "cloud",
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

    return await fetchMetaTraderHistoryData(accountData?.id);
  } catch (error) {
    throw error;
  }
};

const fetchMetaTraderHistoryData = async (id, start) => {
  try {
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

    let startTime = new Date(start); // start from the startTime , that is pass from props
    // startTime.setDate(startTime.getDate() - 2);
    const endTime = new Date(); // Now
    let allDeals = [];
    let offset = 0; // Start from the beginning
    const limit = 1000; // Default limit
    let totalFetched = 0;

    while (true) {
      // Fetch a batch of deals
      const { deals } = await connection.getDealsByTimeRange(
        startTime,
        endTime,
        offset,
        offset + limit
      );

      // Add the fetched deals to the cumulative array
      allDeals = [...allDeals, ...deals];
      totalFetched += deals?.length;

      // Break the loop if no more deals are returned
      if (deals.length < limit) {
        break;
      }

      // Update the offset for the next batch
      offset += limit;
    }

    console.log(`Total deals fetched: ${totalFetched}`);

    return allDeals;
  } catch (error) {
    throw error;
  }
};

async function getAccountMetrics(accountId) {
  try {
    let metrics = await metaStats.getMetrics(accountId);
    return metrics;
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

async function getAccountTrades(accountId) {
  const startTime = "2024-01-01 00:00:00.000";
  const endTime = "2024-11-20 00:00:00.000";
  try {
    let trades = await metaStats.getAccountTrades(
      accountId,
      startTime,
      endTime
    );
    return trades;
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

async function getAccountOpenTrades(accountId) {
  try {
    let openTrades = await metaStats.getAccountOpenTrades(accountId);
    return openTrades;
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

module.exports = {
  connectMetaTraderAccount,
  fetchMetaTraderHistoryData,
  getAccountOpenTrades,
  getAccountTrades,
  getAccountMetrics,
};
