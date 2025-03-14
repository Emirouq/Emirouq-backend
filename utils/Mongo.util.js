const { MongoClient } = require("mongodb");
const { dbUrl, dbName } = require("../config/keys").host;

const client = new MongoClient(dbUrl);
let mongoClient;

(async () => {
  try {
    const res = await client.connect();
    mongoClient = res.db(dbName);
    console.log("Connected successfully to server");
  } catch (err) {}
})();

const getMongoClient = () => mongoClient;

module.exports = getMongoClient;
