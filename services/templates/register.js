const registerTemplate = ({ name, otp }) => {
  return `<!doctype html>

<html lang="en">

  <head>

    <meta charset="UTF-8" />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>Welcome to Emirouq</title>

    <style>

      body,

      html {

        margin: 0;

        padding: 0;

        font-family: 'Inter', sans-serif;

        background-color: #f0f4f8;

      }



      .bg-zinc-50 {

        background-color: #f0f4f8;

      }



      .text-zinc-700 {

        color: #394663;

        font-weight: 500;

      }



      .text-zinc-500 {

        color: #718096;

      }



      .text-zinc-400 {

        color: #5a667b;

        font-weight: 300;

        font-size: '16px';

      }



      .shadow-md {

        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

      }



      .rounded-lg {

        border-radius: 8px;

      }



      .max-w-lg {

        max-width: 600px;

        width: 100%;

        margin: 0 auto;

      }



      .bg-white {

        background-color: #ffffff;

      }



      .border-blue-200 {

        border-color: #ebf8ff;

      }



      .p-6 {

        padding: 20px;

      }



      .mb-4 {

        margin-bottom: 16px;

      }



      .text-xl {

        font-size: 17px;

        line-height: 1.5;

        font-weight: 500;

      }



      .text-lg {

        font-size: 18px;

        line-height: 1.5;

      }



      .text-sm {

        font-size: 14px;

        line-height: 1.5;

        font-weight: 300;

        color: #394663;

      }



      .font-semibold {

        font-weight: 400;

        color: #394663;

      }



      .font-normal {

        font-weight: 400;

      }



      .font-size {

        font-size: 16px !important;

        line-height: 26px;

      }



      .text-center {

        text-align: center;

      }



      .text-left {

        text-align: left;

      }



      .text-right {

        text-align: right;

      }

      .bold {

        font-weight: 200;

        color: #454f60;

      }



      .btn {

        display: inline-block;

        background-color: #2663eb;

        color: #ffffff;

        padding: 8px 8px;

        border-radius: 8px;

        text-decoration: none;

        font-size: 16px;

        border: 1px solid #2663eb;

        cursor: pointer;

      }



      .btn:hover {

        background-color: #1c4db5;

        border-color: #1c4db5;

      }



      .footer {

        margin-top: 24px;

        font-size: 14px;

        color: #4a4f5e;

        font-weight: 300;

      }



      .flex-container {

        display: flex;

        justify-content: space-between;

        align-items: center;

        padding: 20px;

        background-color: #ffffff;

        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

        border-radius: 8px;

        margin: 0 auto;

        max-width: 600px;

      }



      .logo-container {

        width: 120px;

        margin-left: -14px;

      }



      .icons-container {

        display: flex;

        justify-content: flex-start;

        gap: 1rem;

      }



      .icon {

        width: 20px;

        height: auto;

        fill: #98a2b3;

      }



      .icon svg {

        width: 20px;

        height: 21px;

      }



      .img {

        background-size: 100px;

        background-repeat: no-repeat;
 
        background-position: center;

        background-image: url('https://emirouq.s3.me-central-1.amazonaws.com/categories/Emi-logo-19b38cc4-1273-4831-8ff3-442930077e43.png');

        height: 90px;

      }

    </style>

  </head>



  <body style="margin: 0; padding: 10px; background-color: #f0f4f8">

    <table class="bg-zinc-50" role="presentation" width="100%" cellspacing="0" cellpadding="0">

      <tr>

        <td>

          <table

            class="max-w-lg bg-white shadow-md rounded-lg border border-blue-200"

            role="presentation"

            width="100%"

            cellspacing="0"

            cellpadding="0"

          >

            <tr>

              <td class="p-6">

                <table width="100%" cellspacing="0" cellpadding="0">

                  <tr class="">

                    <td class="">

                      <div style="width: 120px">

                        <div class="img"></div>

                      </div>

                    </td>

                  </tr>

                  <tr style="height: 2rem">

                    <td class="text-zinc-700 font-semibold mb-4" style="font-size: 18px">Hi ${name},</td>

                  </tr>

                  <tr style="height: 2rem">

                    <td class="text-zinc-700 mb-4 text-xl">We can't wait to show you around.</td>

                  </tr>

                  <tr style="height: 1rem">

                    <td class="text-zinc-400 mb-4" style="font-size: 16px; line-height: 24px">

                      <strong class="bold">To complete your registration, please use the following One-Time Password (OTP):</strong>
                    </td>

                  </tr>



                  <tr style="height: 6rem">

                    <td style="text-align: center; margin-bottom: 10rem">

                      <p class="btn"> <span style="color: white">${otp}</span></p>

                    </td>

                  </tr>

                  <tr>

                    <td class="text-sm mb-4 height:2rem">

                     This OTP is valid for the next 10 minutes. Please do not share this code with anyone for security reasons.

                    </td>

                  </tr>


                </table>

              </td>

            </tr>

            <tr>

              <td class="p-6 bg-white border-t border-blue-200">

                <table width="100%" cellspacing="0" cellpadding="0">

                  <tr>

                    <td class="footer">

                      <p class="font-size" style="margin-bottom: 2rem">Welcome Aboard,<br />Emirouq</p>

                    

                      <p style="margin-bottom: 0">© 2025 Emirouq. All rights reserved</p>

                    </td>

                  </tr>

                </table>

              </td>

            </tr>

            <tr>

              <td>

                <table class="bg-white rounded-lg" role="presentation" width="600" cellspacing="0" cellpadding="0">

                  <tr>

                    <td style="padding-right: 3rem; padding-bottom: 2.4rem">

                      <table width="100%" cellspacing="0" cellpadding="0">

                        <tr>

                          <td>

                            <div style="width: 40px; margin-left: 3px">

                              <img

                                width="150"

                                src="https://emirouq.s3.me-central-1.amazonaws.com/categories/Emi-logo-19b38cc4-1273-4831-8ff3-442930077e43.png"

                                alt="Emirouq Logo"

                              />

                            </div>

                          </td>

                          <td style="text-align: right; vertical-align: middle">

                            <div class="icon-container">

                              <svg class="icon" viewBox="0 0 20 19" xmlns="http://www.w3.org/2000/svg">

                                <path

                                  class="icon-path"

                                  fill-rule="evenodd"

                                  d="M13.2879 18.3646L8.66337 11.773L2.87405 18.3646H0.424805L7.57674 10.2238L0.424805 0.03125H6.71309L11.0717 6.24377L16.5327 0.03125H18.982L12.1619 7.79498L19.5762 18.3646H13.2879ZM16.0154 16.5063H14.3665L3.93176 1.88958H5.58092L9.7601 7.74222L10.4828 8.7578L16.0154 16.5063Z"

                                  fill="#98A2B3"

                                />

                              </svg>

                              <svg class="icon" viewBox="0 0 20 21" xmlns="http://www.w3.org/2000/svg">

                                <path

                                  class="icon-path"

                                  d="M20 10.1973C20 4.67441 15.5229 0.197266 10 0.197266C4.47715 0.197266 0 4.67441 0 10.1973C0 15.1885 3.65684 19.3256 8.4375 20.0758V13.0879H5.89844V10.1973H8.4375V7.99414C8.4375 5.48789 9.93047 4.10352 12.2146 4.10352C13.3084 4.10352 14.4531 4.29883 14.4531 4.29883V6.75977H13.1922C11.95 6.75977 11.5625 7.53066 11.5625 8.32227V10.1973H14.3359L13.8926 13.0879H11.5625V20.0758C16.3432 19.3256 20 15.1885 20 10.1973Z"

                                  fill="#98A2B3"

                                />

                              </svg>

                              <svg class="icon" viewBox="0 0 20 21" xmlns="http://www.w3.org/2000/svg">

                                <path

                                  class="icon-path"

                                  d="M10 1.99805C12.6719 1.99805 12.9883 2.00977 14.0391 2.05664C15.0156 2.09961 15.543 2.26367 15.8945 2.40039C16.3594 2.58008 16.6953 2.79883 17.043 3.14648C17.3945 3.49805 17.6094 3.83008 17.7891 4.29492C17.9258 4.64648 18.0898 5.17773 18.1328 6.15039C18.1797 7.20508 18.1914 7.52148 18.1914 10.1895C18.1914 12.8613 18.1797 13.1777 18.1328 14.2285C18.0898 15.2051 17.9258 15.7324 17.7891 16.084C17.6094 16.5488 17.3906 16.8848 17.043 17.2324C16.6914 17.584 16.3594 17.7988 15.8945 17.9785C15.543 18.1152 15.0117 18.2793 14.0391 18.3223C12.9844 18.3691 12.668 18.3809 10 18.3809C7.32813 18.3809 7.01172 18.3691 5.96094 18.3223C4.98438 18.2793 4.45703 18.1152 4.10547 17.9785C3.64063 17.7988 3.30469 17.5801 2.95703 17.2324C2.60547 16.8809 2.39063 16.5488 2.21094 16.084C2.07422 15.7324 1.91016 15.2012 1.86719 14.2285C1.82031 13.1738 1.80859 12.8574 1.80859 10.1895C1.80859 7.51758 1.82031 7.20117 1.86719 6.15039C1.91016 5.17383 2.07422 4.64648 2.21094 4.29492C2.39063 3.83008 2.60938 3.49414 2.95703 3.14648C3.30859 2.79492 3.64063 2.58008 4.10547 2.40039C4.45703 2.26367 4.98828 2.09961 5.96094 2.05664C7.01172 2.00977 7.32813 1.99805 10 1.99805ZM10 0.197266C7.28516 0.197266 6.94531 0.208984 5.87891 0.255859C4.81641 0.302734 4.08594 0.474609 3.45313 0.720703C2.79297 0.978516 2.23438 1.31836 1.67969 1.87695C1.12109 2.43164 0.78125 2.99023 0.523438 3.64648C0.277344 4.2832 0.105469 5.00977 0.0585938 6.07227C0.0117188 7.14258 0 7.48242 0 10.1973C0 12.9121 0.0117188 13.252 0.0585938 14.3184C0.105469 15.3809 0.277344 16.1113 0.523438 16.7441C0.78125 17.4043 1.12109 17.9629 1.67969 18.5176C2.23438 19.0723 2.79297 19.416 3.44922 19.6699C4.08594 19.916 4.8125 20.0879 5.875 20.1348C6.94141 20.1816 7.28125 20.1934 9.99609 20.1934C12.7109 20.1934 13.0508 20.1816 14.1172 20.1348C15.1797 20.0879 15.9102 19.916 16.543 19.6699C17.1992 19.416 17.7578 19.0723 18.3125 18.5176C18.8672 17.9629 19.2109 17.4043 19.4648 16.748C19.7109 16.1113 19.8828 15.3848 19.9297 14.3223C19.9766 13.2559 19.9883 12.916 19.9883 10.2012C19.9883 7.48633 19.9766 7.14648 19.9297 6.08008C19.8828 5.01758 19.7109 4.28711 19.4648 3.6543C19.2188 2.99023 18.8789 2.43164 18.3203 1.87695C17.7656 1.32227 17.207 0.978516 16.5508 0.724609C15.9141 0.478516 15.1875 0.306641 14.125 0.259766C13.0547 0.208984 12.7148 0.197266 10 0.197266Z"

                                  fill="#98A2B3"

                                />

                                <path

                                  class="icon-path"

                                  d="M10 5.06055C7.16406 5.06055 4.86328 7.36133 4.86328 10.1973C4.86328 13.0332 7.16406 15.334 10 15.334C12.8359 15.334 15.1367 13.0332 15.1367 10.1973C15.1367 7.36133 12.8359 5.06055 10 5.06055ZM10 13.5293C8.16016 13.5293 6.66797 12.0371 6.66797 10.1973C6.66797 8.35742 8.16016 6.86523 10 6.86523C11.8398 6.86523 13.332 8.35742 13.332 10.1973C13.332 12.0371 11.8398 13.5293 10 13.5293Z"

                                  fill="#98A2B3"

                                />

                                <path

                                  class="icon-path"

                                  d="M16.5391 4.85742C16.5391 5.52149 16 6.05664 15.3398 6.05664C14.6758 6.05664 14.1406 5.51758 14.1406 4.85742C14.1406 4.19336 14.6797 3.6582 15.3398 3.6582C16 3.6582 16.5391 4.19727 16.5391 4.85742Z"

                                  fill="#98A2B3"

                                />

                              </svg>

                            </div>

                          </td>

                        </tr>

                      </table>

                    </td>

                  </tr>

                </table>

              </td>

            </tr>

          </table>

        </td>

      </tr>

    </table>

  </body>

</html>`;
};
module.exports = registerTemplate;
