const ContactUs = ({ name, email, phone, message }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enquiry Form</title>
  <style>
    body {
      font-family: Poppins, sans-serif;
      padding: 20px;
      background: #000;
    }

    .container {
      background-color: #000000;
      width: 80%;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .inner_container {
      background-color: #F5F5F5;
      padding: 50px;
    }

    header, footer {
      text-align: center;
    }

    .email_inner_section {
      padding: 20px 0 50px 0;
    }

    hr {
      height: 5px;
      background-color: brown;
      border-color: brown;
    }

    h1 {
      color: brown;
    }

    .enquiry_submission table {
      text-align: left;
      margin-top: 50px;
    }

    .enquiry_submission table tbody tr th {
      width: 30%;
      vertical-align: top;
    }

    .enquiry_submission th, .enquiry_submission td {
      padding: 10px;
      margin: 0;
    }

    .enquiry_submission th {
      color: brown;
      font-weight: 900;
    }

    .enquiry_submission td {
      font-weight: 100;
    }

    .email_footer {
      font-size: 10px;
      color: #ffffff;
      padding: 20px 0;
    }

    .email_footer a {
      color: #ffffff;
      text-decoration: none;
    }
    .content{
        font-size:18px
    }
    @media only screen and (max-width: 500px) {
      .enquiry_submission th, .enquiry_submission td {
        display: block;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="inner_container">
      <header>
        <img src="https://tradelizer-marketing.vercel.app/img/images/Logo%20Dark_1.png" width="100px" />
        <h1>Enquiry Submission</h1>
      </header>
      <hr>
      <div class="email_content">
        <div class="email_inner_section">
          <section>
            <h3>Hi Admin, you have a new enquiry submission from ${name}.</h3>
          </section>
          <section class="enquiry_submission">
            <table>
              <tbody>
                <tr>
                  <th class='content'>Client Name</th>
                  <td class='content'>${name}</td>
                </tr>
                <tr>
                  <th class='content'>Email Address</th>
                  <td class='content'>${email}</td>
                </tr>
              <!--
                <tr>
                  <th class='content'>Contact Number</th>
                  <td>${phone}</td>
                </tr>
              -->
                <tr>
                  <th class='content'>Message</th>
                  <td class='content'>${message}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
    <footer>
      <section class="email_footer">
        <img src="https://tradelizer-marketing.vercel.app/img/images/Logo%20Dark_1.png" width="100px" />
        <!--<p>-->
        <!--  <a href="#">companylorem.com</a>-->
        <!--</p>-->
        <!--<p>Address 1, 123 Road, MY</p>-->
        <p>Copyright &copy; <script>document.write(new Date().getFullYear())</script> Tradelizer All Rights Reserved</p>
      </section>
    </footer>
  </div>
</body>
</html>
`;
};

module.exports = ContactUs;
