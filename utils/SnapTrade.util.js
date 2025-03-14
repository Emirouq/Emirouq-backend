const { Snaptrade } = require("snaptrade-typescript-sdk");
const { consumerKey, clientId } = require("../config/keys").snapTrade;
// const { v4: uuidv4 } = require("uuid");
const util = require("util");

// {
//     accountId: 'f882c5e3-6bbe-445a-86ad-8852bae8d4b0',
//     userId: '8c60f2b1-115b-4875-8cd8-d048746902cd',
//     userSecret: 'd6b21e90-24dd-4f6d-a687-f4350119b99a'
//   }

// {
//     accountId: 'ca11b605-0b44-4c76-9efd-8264af29cb01',
//     userId: 'd98007e2-3270-484f-b100-bad78c68be20',
//     userSecret: 'e94bb383-480c-422a-bc01-70f4a6254e26'
//   }

// {
//     userId: 'e9378e76-6619-4399-93e2-a472448e63fb',
//     userSecret: 'e5e0fe75-046b-4c7f-aae7-697b2e5a5adf'
//   }

// 1) Initialize a client with your clientID and consumerKey.
const snaptrade = new Snaptrade({
  consumerKey,
  clientId,
});

const listAllSnapUsers = async () => {
  const response = await snaptrade.authentication.listSnapTradeUsers();
  return response.data;
};

const registerSnapTradeUser = async (userId) => {
  const snapUser = (
    await snaptrade.authentication.registerSnapTradeUser({
      userId,
    })
  ).data;
  return snapUser;
};

const loginSnapTradeUser = async ({
  userId,
  userSecret,
  broker,
  immediateRedirect,
  customRedirect,
  reconnect,
}) => {
  const data = (
    await snaptrade.authentication.loginSnapTradeUser({
      userId,
      userSecret,
      broker,
      immediateRedirect,
      customRedirect,
      ...(reconnect && { reconnect }),
    })
  ).data;
  if (!("redirectURI" in data)) throw Error("Should have gotten redirect URI");
  return data;
};

const listUserAccounts = async ({ userId, userSecret }) => {
  const response = await snaptrade.accountInformation.listUserAccounts({
    userId,
    userSecret,
  });
  return response.data;
};

const getUserAccountHoldings = async ({ userId, userSecret, accountId }) => {
  const response = await snaptrade.accountInformation.getUserHoldings({
    userId,
    userSecret,
    accountId,
  });
  return response.data;
};

const getDetailBrokerageAuthorization = async ({
  userId,
  userSecret,
  accountId,
}) => {
  const response = await snaptrade.connections.detailBrokerageAuthorization({
    userId,
    userSecret,
    authorizationId: accountId,
  });
  return response.data;
};
const waitUntilInitialSyncCompleted = async ({
  userId,
  userSecret,
  accountId,
}) => {
  console.log("Waiting for initial sync to complete...");
  let count = 0;
  while (true) {
    const syncStatus = await getUserAccountHoldings({
      userId,
      userSecret,
      accountId,
    });
    if (count > 3) {
      console.log("Initial sync not completed after 5 attempts");
      throw Error("Error in fetching account information");
    }

    if (syncStatus.account.sync_status.transactions.initial_sync_completed) {
      console.log("Initial sync completed!");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    count++;
  }

  return true;
};

const listBrokerageAuthorizations = async ({ userId, userSecret }) => {
  const response = await snaptrade.connections.listBrokerageAuthorizations({
    userId,
    userSecret,
  });
  return response.data;
};

const listAccountActivities = async ({
  userId,
  userSecret,
  accountId,
  startDate,
  type = "BUY,SELL,OPTIONEXPIRATION,OPTIONASSIGNMENT,OPTIONEXERCISE",
}) => {
  const activities = await snaptrade.transactionsAndReporting.getActivities({
    userId,
    userSecret,
    accounts: accountId,
    type,
    ...(startDate && { startDate }),
  });
  return activities.data;
};

const getUserAccountOrders = async ({
  userId,
  userSecret,
  accountId,
  days,
}) => {
  const response = await snaptrade.accountInformation.getUserAccountOrders({
    userId,
    userSecret,
    accountId,
    state: "executed",
    days: days || 500,
  });
  return response.data;
};

const getHoldings = async ({ userId, userSecret }) => {
  const holdings = (
    await snaptrade.accountInformation.getAllUserHoldings({
      userId,
      userSecret,
    })
  ).data;
  return holdings;
};

const deleteSnapTradeUser = async (userId) => {
  const deleteResponse = (
    await snaptrade.authentication.deleteSnapTradeUser({ userId })
  ).data;

  return deleteResponse;
};

module.exports = {
  listAllSnapUsers,
  registerSnapTradeUser,
  loginSnapTradeUser,
  listUserAccounts,
  listBrokerageAuthorizations,
  listAccountActivities,
  getHoldings,
  deleteSnapTradeUser,
  getUserAccountOrders,
  getUserAccountHoldings,
  waitUntilInitialSyncCompleted,
  getDetailBrokerageAuthorization,
};
