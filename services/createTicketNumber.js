const SupportTicket = require("../models/Support.model");

const createTicketNumber = async () => {
  // creating unique ride booking number
  const allTickets = await SupportTicket.find({})
    .sort({ createdAt: -1 })
    .limit(1);

  let bookingNumber = "EMQ0001";

  if (allTickets?.length != 0 && allTickets[0].bookingNo) {
    let startingIndex;

    if (allTickets[0].bookingNo?.toString()?.includes("M")) {
      if (allTickets[0].bookingNo?.toString()?.includes("9999")) {
        startingIndex = "EMQ";
      } else {
        startingIndex = "EMQ";
      }
    } else if (allTickets[0].bookingNo?.toString()?.includes("N")) {
      startingIndex = "EMQ";
    }

    const prevBookingNo = allTickets[0].bookingNo.toString().slice(4);

    bookingNumber = parseInt(prevBookingNo) + 1;

    if ((bookingNumber.toString().length = 1)) {
      bookingNumber = startingIndex + bookingNumber.toString().padStart(4, "0");
    } else if ((bookingNumber.toString().length = 2)) {
      bookingNumber = startingIndex + bookingNumber.toString().padStart(3, "0");
    } else if ((bookingNumber.toString().length = 3)) {
      bookingNumber = startingIndex + bookingNumber.toString().padStart(2, "0");
    } else if ((bookingNumber.toString().length = 4)) {
      bookingNumber = startingIndex + bookingNumber.toString().padStart(1, "0");
    }
  } else {
    bookingNumber = "EMQ0001";
  }

  console.log("prevbookingn umber", bookingNumber);

  return bookingNumber;
};

module.exports = createTicketNumber;
