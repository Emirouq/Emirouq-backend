// const nodeXlsx = require("node-xlsx");

// const meta5CsvRecord = (fileName) => {
//   const workSheetsFromFile = nodeXlsx.parse(fileName);
//   const sheetData = workSheetsFromFile[0].data;

//   // Function to find the start and end of a data section
//   function findSection(sheetData, sectionName, stopSectionName) {
//     let startIndex = -1;
//     let endIndex = -1;

//     for (let i = 0; i < sheetData.length; i++) {
//       const row = sheetData[i];
//       if (row[0] === sectionName) {
//         startIndex = i + 1; // Start after the section header
//       } else if (startIndex !== -1 && row[0] === stopSectionName) {
//         endIndex = i;
//         break; // End at the first empty row after the section starts
//       }
//     }
//     return { startIndex, endIndex };
//   }
//   function createDescriptiveKeys(header) {
//     let key = header?.toLowerCase();
//     if (key === "price") {
//       return "openPrice";
//     } else if (key?.toLowerCase() === "time") {
//       return "openTime";
//     } else if (key === "price_2") {
//       return "closePrice";
//     } else if (key === "time_2") {
//       return "closeTime";
//     } else if (key === "position") {
//       return "orderId";
//     } else if (key === "symbol") {
//       return "symbol";
//     } else if (key === "type") {
//       return "side";
//     } else if (key === "volume") {
//       return "quantity";
//     } else if (key === "swap") {
//       return "swap";
//     } else if (key === "commission") {
//       return "commission";
//     } else if (key === "market price") {
//       return "marketPrice";
//     } else {
//       return key;
//     }
//   }

//   // Improved function to check if a row is a valid data row
//   function isValidDataRow(row, headers) {
//     // Count data cells in unique columns
//     const uniqueDataCells = new Set();
//     for (let i = 0; i < row.length; i++) {
//       if (row[i] !== undefined) {
//         uniqueDataCells.add(headers[i]); // Add column name to set
//       }
//     }

//     // Consider a row valid if it has data in at least half of the unique columns
//     const minDataCells = Math.ceil(new Set(headers).size / 2);
//     return uniqueDataCells.size >= minDataCells;
//   }

//   // Function to create unique keys for duplicate column names
//   function createUniqueKeys(headers) {
//     const uniqueKeys = [];
//     const keyCounts = {}; // Keep track of counts for each key

//     for (const header of headers) {
//       if (header !== undefined)
//         if (keyCounts[header] === undefined) {
//           const descriptiveKeys = createDescriptiveKeys(header);
//           uniqueKeys.push(descriptiveKeys);
//           keyCounts[header] = 1;
//         } else {
//           const key = `${header}_${keyCounts[header] + 1}`;
//           const descriptiveKeys = createDescriptiveKeys(key);
//           uniqueKeys.push(descriptiveKeys);
//           keyCounts[header]++;
//         }
//     }
//     return uniqueKeys;
//   }

//   function fetchTrades(positionSection, status) {
//     let positions = [];
//     if (
//       positionSection?.startIndex !== -1 &&
//       positionSection?.endIndex !== -1
//     ) {
//       const positionHeader = sheetData[positionSection?.startIndex];
//       const uniquePositionHeader = createUniqueKeys(positionHeader); // Create unique keys
//       for (
//         let i = positionSection?.startIndex + 1;
//         i < positionSection?.endIndex;
//         i++
//       ) {
//         const row = sheetData[i];
//         // Use improved isValidDataRow function
//         if (isValidDataRow(row, positionHeader)) {
//           const position = {};
//           for (let j = 0; j < uniquePositionHeader.length; j++) {
//             position[uniquePositionHeader[j]] = row[j];
//           }
//           position.status = status;
//           positions.push(position);
//         }
//       }
//     }
//     return positions;
//   }
//   // Find "Open Positions" section
//   const openPositionsSection = findSection(sheetData, "Open Positions");
//   const openPositions = fetchTrades(openPositionsSection, "open");

//   // Find "Positions" section
//   const positionsSection = findSection(sheetData, "Positions", "Orders");
//   const positions = fetchTrades(positionsSection, "closed");

//   return [...openPositions, ...positions];
// };

// module.exports = meta5CsvRecord;

const nodeXlsx = require("node-xlsx");
const _ = require("lodash");
const dayjs = require("dayjs");
const forexCommodities = [
  "XAU", //Gold
  "XAG", //Silver
  "XPT", //Platinum
  "XPD", //Palladium
  "XRO", //Rough Rice
  "WTI", //Crude Oil
  "BRENT", //Brent Oil
  "NG", //Natural Gas
  "CORN", //Corn
  "SOY", //Soybeans
  "WHEAT", //Wheat
  "COCOA", //Cocoa
  "COFFEE", //Coffee
  "SUGAR", //Sugar
  "COTTON", //Cotton
];

const formatSymbol = {
  gold: "XAUUSD",
  silver: "XAGUSD",
  platinum: "XPTUSD",
  palladium: "XPDUSD",
  roughrice: "XROUSD",
  crudeoil: "WTIUSD",
  brentoil: "BRENTUSD",
  naturalgas: "NGUSD",
  corn: "CORNUSD",
  soybeans: "SOYUSD",
  wheat: "WHEATUSD",
  cocoa: "COCOAUSD",
  coffee: "COFFEEUSD",
  sugar: "SUGARUSD",
  cotton: "COTTONUSD",
};
const meta5CsvRecord = (fileName) => {
  const workSheetsFromFile = nodeXlsx.parse(fileName);
  const sheetData = workSheetsFromFile[0].data;

  function findDealsHeaderRow(sheetData) {
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (
        row &&
        row[0] === "Time" &&
        row[1] === "Deal" &&
        row[2] === "Symbol"
      ) {
        return i;
      }
    }
    return -1;
  }

  function fetchDeals(sheetData) {
    const dealsHeaderRowIndex = findDealsHeaderRow(sheetData);

    if (dealsHeaderRowIndex === -1) {
      return [];
    }

    const dealsHeader = sheetData[dealsHeaderRowIndex];
    const deals = [];

    for (let i = dealsHeaderRowIndex + 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) {
        continue;
      }

      const symbolColumnIndex = dealsHeader.indexOf("Symbol");
      if (symbolColumnIndex === -1 || !row[symbolColumnIndex]) {
        continue;
      }
      if (
        !row[dealsHeader.indexOf("Symbol")] ||
        !["buy", "sell"]?.includes(row[dealsHeader.indexOf("Type")]) ||
        !row[dealsHeader.indexOf("Deal")]
      )
        continue;

      const time = row[dealsHeader.indexOf("Time")] || null;
      const orderId = row[dealsHeader.indexOf("Deal")] || null;
      const symbol = row[dealsHeader.indexOf("Symbol")] || null;
      const side = row[dealsHeader.indexOf("Type")] || null;
      const quantity = row[dealsHeader.indexOf("Volume")] || 0;
      const price = row[dealsHeader.indexOf("Price")] || 0;
      const swap = row[dealsHeader.indexOf("Swap")] || 0;
      const commission = row[dealsHeader.indexOf("Commission")] || 0;

      //if symbol includes USD, then symbol will be same else it will be formatted
      const originalSymbol = symbol?.includes("USD")
        ? symbol?.replaceAll(".", "")?.toUpperCase()
        : formatSymbol[symbol?.toLowerCase()];

      const deal = {
        symbol: originalSymbol,
        underlyingSymbol: originalSymbol,
        orderId,
        assetClass: "forex",
        side,
        quantity: _.round(Math.abs(quantity), 5),
        price: _.round(Math.abs(price), 5),
        date: dayjs(time).format("YYYY-MM-DD HH:mm:ss"),
        commission: _.round(Math.abs(commission || 0), 5),
        swap: _.round(Math.abs(swap || 0), 5),
        // contractMultiplier: originalSymbol?.includes(forexCommodities)
        //   ? 100
        //   : 100000,
        contractMultiplier: 100,
        currency: {
          code: "USD",
          name: "US Dollar",
        },
      };

      deals.push(deal);
    }

    return deals;
  }

  const deals = fetchDeals(sheetData);
  return deals;
};

module.exports = meta5CsvRecord;
