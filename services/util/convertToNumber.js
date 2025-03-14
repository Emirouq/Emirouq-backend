// function convertToNumber(s) {
//   console.log(s, "SSSSS");

//   if (s === null || s === "") {
//     return 0;
//   }

//   // Define the regex pattern
//   const pattern = /^\d{1,3}(,\d{3})*(\.\d+)?$/;

//   // Check if the input string matches the regex pattern
//   if (pattern.test(s)) {
//     // Remove commas from the string
//     s = s?.replace(/,/g, "");

//     // Convert to a number
//     if (s?.includes(".")) {
//       return parseFloat(s);
//     } else {
//       return parseInt(s, 10);
//     }
//   } else {
//     console.log(s, "SSSSS");

//     throw new Error("Input string is not a valid number format");
//   }
// }
function convertToNumber(s) {
  // Check for null or empty string and return 0
  if (s === null || s === "") {
    return 0;
  }

  // Check if the input is already a number
  if (typeof s === "number") {
    return s;
  }

  // Convert the input to a string if it's not already a string
  if (typeof s !== "string") {
    s = s?.toString();
  }

  // If the string contains commas, remove them and attempt to convert
  if (s?.includes(",")) {
    s = s?.replace(/,/g, "");
  }
  if (s?.includes("@")) {
    s = s?.replace(/@/g, "");
  }
  if (s?.includes("$")) {
    s = s?.replace(/\$/g, "");
  }
  if (s?.includes("USD")) {
    s = s?.replace(/USD/g, "");
  }

  // Attempt to parse the cleaned string as a float
  let parsedNumber = parseFloat(s);

  // If parsedNumber is NaN, set 0,
  if (isNaN(parsedNumber)) {
    parsedNumber = 0;
  }

  // Return the parsed number
  return parsedNumber;
}

module.exports = convertToNumber;

// console.log(convertToNumber(0));
