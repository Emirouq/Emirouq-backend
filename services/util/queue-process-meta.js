const Queue = require("bull");
const Redis = require("ioredis");
const { saveForex } = require("../saveTrades/saveForex"); // Assuming this interacts with your DB
const forexLongCal = require("../trade/forexLongCal");
const forexShortCal = require("../trade/forexShortCal");

// --------------------------------------------------------------------
//  Database Interaction (Simplified for this Example)
// --------------------------------------------------------------------

// Assume 'save' function directly interacts with your database and returns a Promise
// Make sure it properly handles asynchronous operations and returns when the save is truly complete

// In real code, you would likely use an ORM or DB driver here
async function saveToDatabase(tradeData) {
  return new Promise((resolve, reject) => {
    // Simulate saving to the database (replace with actual DB call)
    setTimeout(() => {
      saveForex(tradeData);
      // In a real database interaction, check for errors
      const success = true;
      if (success) {
        resolve({ id: Math.random().toString(36).substr(2, 9) }); // Simulate ID
      } else {
        reject(new Error("Database error"));
      }
    }, 50); // Simulate 50ms delay
  });
}

// --------------------------------------------------------------------
//  Helper Function: Chunk Array into Batches
// --------------------------------------------------------------------

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// --------------------------------------------------------------------
//  Redis Connection and Queue Setup
// --------------------------------------------------------------------

const redisOptions = {
  host: "127.0.0.1",
  port: 6379,
};

const redisClient = new Redis(redisOptions);
const tradeQueue = new Queue("metaQueue", { redis: redisClient });

// --------------------------------------------------------------------
//  Queue Processor (Handles Each Batch of Trades)
// --------------------------------------------------------------------

tradeQueue.process(async (job) => {
  const { batch } = job.data;

  try {
    // Save each individual trade in the batch
    const savePromises = batch.map((tradeData) =>
      saveToDatabase({
        ...tradeData,
        longCal: forexLongCal,
        shortCal: forexShortCal,
      })
    );
    await Promise.all(savePromises);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
});

// --------------------------------------------------------------------
//  Error Handling for Failed Jobs
// --------------------------------------------------------------------

tradeQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);
  // Implement error handling (logging, notifications, etc.)
});

// --------------------------------------------------------------------
//  Main Function: Process Forex Data and Add to Queue
// --------------------------------------------------------------------

async function processForexData(forex, batchSize, otherParams) {
  const allTrades = [];

  // Flatten the forex data into an array of *individual* trades
  Object.entries(forex).forEach(([symbol, { trades, position }]) => {
    allTrades.push({ trades, symbol, ...otherParams });
  });

  // Split the trades into batches
  const batches = chunkArray(allTrades, batchSize);

  // Add each batch as a job to the queue
  for (const batch of batches) {
    await tradeQueue.add(
      { batch }, // otherParams are already in each trade
      { attempts: 3, backoff: { type: "fixed", delay: 5000 } }
    );
  }

  console.log("All batches added to the queue.");
}

// --------------------------------------------------------------------
//  Example Forex Data and Parameters (Use your actual data)
// --------------------------------------------------------------------

// ... (Your forexData and otherParams) ...

// --------------------------------------------------------------------
//  Start Processing
// --------------------------------------------------------------------

module.exports = { processForexData };
