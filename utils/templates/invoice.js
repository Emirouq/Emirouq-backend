const dayjs = require("dayjs");
const toCurrency = require("../to-currency");

const invoiceTemplate = ({
  invoicePdf,
  hostedUrl,
  invoiceDate,
  invoiceNumber,
  subtotal,
  total,
  discount,
  tax,
}) => {
  return `<!DOCTYPE html>
<html>
<head>
<style>
 /* CSS Reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background-color: #000;
        }

        /* Base styles */
        body {
         font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #ffffff;
            background-color: #000;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            margin-top: 20px;
            padding: 20px 20px; /* Add top and bottom padding */
        }
email-wrapper{
    padding:40px
}


.container {
  background-color: #282828;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  text-align: center; 
   max-width: 350px;
  margin: 20px auto;
}

.logo {
  background-color: #282828;


  display: block; 
  margin: 20px auto;  
}

.logo img {
  background-color: #282828;

  max-width: 150px;
  height: auto;
  padding-bottom: 20px;
}

h2 {
  background-color: #282828;

  text-align: center;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 500; 
  color: #fff; /* Ensure h2 text is white */
}

.amount {
  background-color: #282828;

  font-size: 48px;
  font-weight: 700;
  margin-bottom: 10px;
  display: block; 
  margin: 0 auto;  
  color: #fff; /* Ensure amount text is white */
}

.paid {
  background-color: #282828;

  font-size: 14px;
  margin-bottom: 20px;
  color: #fff; /* Ensure paid text is white */
}

.download-buttons {
  background-color: #282828;

  display: block; 
  text-align: center;
  margin-bottom: 20px;
  font-size: 17px;
}

.download-button {
  background-color: #282828;
  margin: 0 10px;
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  font-size: 17px;
  underline: normal;

}

.download-button:hover {
  background-color: #282828;

  text-decoration: underline;
}

table {
  width: 100%;
  background-color: #282828;

  border-collapse: collapse; 
}

th, td {
  background-color: #282828;

  padding: 8px;
  /* No border-bottom: 1px solid #ddd; */
  color: #fff; /* Ensure table text is white */
}
.bottom th,.bottom td{
    background-color: #282828;

  padding: 8px;
  /* No border-bottom: 1px solid #ddd; */
  color: #fff; /* Ensure table text is white */
      border-bottom: 0.5px solid #aaa;
  padding: 20px 0px;
}
th { 
  background-color: #282828;

  text-align: left;
  font-size: 15px;
}
table  .discount{
  color: #aaa;
font-style: italic;
font-weight: normal;
}

td { 
  background-color: #282828;

  text-align: right;
  font-size: 15px;

}

.receipt-icon {
  background-color: #282828;

  /* display: flex; Remove flex properties */
  text-align: center;
  margin-top: 30px;
}

.receipt-icon svg {
  width: 80px;
  height: 80px;
  fill: #ddd;
}
  /* Footer */
        .footer {
            text-align: center;
            font-size: 14px;
            color: #999999;
            margin-bottom: 22px;
        }
        .footer p{
            color: #fff;
            font-size: 14px;
            margin-bottom: 20px;
        }
         .footer p a{
            color: white;
            font-size: 14px;
            underline: normal;

        }

        .social-links {
            margin-bottom: 20px;
        }

           .social-links a {
             color: white;
            underline: normal;

        }

        .social-link {
            display: inline-block;
            margin: 0 10px;
        }

        .social-icon1 {
            width: 35px;
            height: 35px;
        }

             .social-icon {
            width: 35px;
            height: 35px;
        }

        /* Responsive adjustments */
        @media only screen and (max-width: 600px) {
            .email-wrapper {
                padding: 10px;
            }

            .button {
                display: block;
                margin: 10px 0;
            }

            .invoice-table th,
            .invoice-table td {
                padding: 8px;
            }
        }

        /* Style for coupon rows */
        .discount {
            color: lightgray;
            font-size: 14px;
        }

        .discount td {
            border-bottom: 1px solid lightgray;
            padding-bottom: 5px;
        }
        emptyBox{
            height: 50px;
        }
</style>
</head>
<body>
<div class="email-wrapper">
<div class="emptyBox"/>

<div class="container">
  <div class="logo">
    <img src="https://tradelizer-marketing.vercel.app/img/images/Logo%20Dark_1.png" alt="Your Logo">
  </div>

  <div class="amount">${toCurrency(total)}USD</div>
  <div class="paid">Paid ${invoiceDate}</div>

  <div class="download-buttons">
    <a class="download-button" href=${invoicePdf} download>Download invoice</a>
    <a class="download-button" href=${hostedUrl}>Download receipt</a>
  </div>

  <table>
   
    <tr>
      <th>Invoice number</th>
      <td>${invoiceNumber}</td>
    </tr>
  
  </table>
</div>

<div class="container">
  <table class="bottom">
    <tr>
      <th>Subtotal</th>
      <td>${toCurrency(subtotal)}USD</td>
    </tr>
     ${
       discount?.length
         ? discount?.map(
             (i) => `
        <tr>
      <th class="discount">${i?.coupon?.name} (
        ${
          i?.coupon?.amount_off
            ? `${toCurrency(i?.coupon?.amount_off / 100)} off`
            : `${i?.coupon?.percent_off}% off`
        }
          
      )</th>
      <td class="discount">-${toCurrency(
        i?.coupon?.amount_off
          ? i?.coupon?.amount_off / 100
          : subtotal * (i?.coupon?.percent_off / 100)
      )}USD</td>
    </tr>
 `
           )
         : `
      <tr> 
      <th class="discount">Discount</th>
      <td class="discount">-$0.00</td>
     `
     }
        <tr>
      <th class="total">Tax</th>
      <td class="total">${toCurrency(tax)}USD</td>
    </tr>
    <tr>
      <th class="total">Total</th>
      <td class="total">${toCurrency(total)}USD</td>
    </tr>
 
  </table>
  
</div>
  <footer class="footer">
            <div class="social-links">
                <a href="https://www.instagram.com/officialtradelizer/" class="social-link"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/768px-Instagram_icon.png" alt="Facebook" class="social-icon"></a>
                <a href="https://x.com/tradelizerapp?s=11&t=OhR-rRwWTHVnk9633kIvKw" class="social-link"><img src="https://img.freepik.com/free-vector/new-2023-twitter-logo-x-icon-design_1017-45418.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1724630400&semt=ais_hybrid" alt="Twitter" class="social-icon"></a>
            </div>
            <p>Questions? Contact us at <a href="mailto:support@tradelizer.com">support@tradelizer.com</a></p>
            <p>© ${dayjs().format(
              "YYYY"
            )} TradeLizer Inc. All Rights Reserved.</p>
            <p>
                <a href="https://www.tradelizer.com/Privacy">Privacy Policy</a> | 
                <a href="https://www.tradelizer.com/TermsAndCondition">Terms of Service</a> | 
                <a href="https://www.tradelizer.com/#contact">Contact </a>
            </p>
        </footer>
        </div>
</body>
</html>
`;
};
module.exports = { invoiceTemplate };
