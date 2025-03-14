const quesTradeErrorList = {
  404: {
    1001: "Invalid endpoint.",
    1018: "Account number not found.",
    1019: "Symbol not found.",
    1020: "Order not found.",
    "Bad Request": "Token is invalid or expired.",
  },
  400: {
    1002: `Invalid or malformed argument.`,
    1003: `Argument length exceeds imposed limit.`,
    1004: `Missing required argument.`,
    1013: "Requesting anything other than ‘application/json’.",
    1015: "Malformed authorization header.",
    "Bad Request": "Token is invalid or expired.",
  },
  413: {
    1005: "Size of request body exceeds imposed limit.",
  },
  429: {
    1006: "Too  many requests.",
  },
  500: {
    1007: "IQ servers responded with a business error.",
    1008: "IQ servers responded with a technical error..",
    1009: "IQ servers responded with a unexpected error.",
    1021: "Unexpected error (with undefined handling).",
    "Bad Request": "IQ servers are down.",
  },
  502: {
    1010: "IQ servers are down.",
    "Bad Request": "IQ servers are down.",
  },
  503: {
    1011: "IQ servers are unavailable.",
    "Bad Request": "IQ servers are down.",
  },
};

module.exports = { quesTradeErrorList };
