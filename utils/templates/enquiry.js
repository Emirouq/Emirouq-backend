const dayjs = require("dayjs");

const EnquiryTemplate = ({ firstName, lastName, email, phone, message }) => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<!--[if (gte mso 9)|(IE)]>
  <xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"> <!-- So that mobile will display zoomed in -->
<meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- enable media queries for windows phone 8 -->
<meta name="format-detection" content="telephone=no"> <!-- disable auto telephone linking in iOS -->
<meta name="format-detection" content="date=no"> <!-- disable auto date linking in iOS -->
<meta name="format-detection" content="address=no"> <!-- disable auto address linking in iOS -->
<meta name="format-detection" content="email=no"> <!-- disable auto email linking in iOS -->
<meta name="color-scheme" content="only">
<title></title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">

<style type="text/css">
/*Basics*/
body {margin:0px !important; padding:0px !important; display:block !important; min-width:100% !important; width:100% !important; -webkit-text-size-adjust:none;}
table {border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt;}
table td {border-collapse: collapse;mso-line-height-rule:exactly;}
td img {-ms-interpolation-mode:bicubic; width:auto; max-width:auto; height:auto; margin:auto; display:block!important; border:0px;}
td p {margin:0; padding:0;}
td div {margin:0; padding:0;}
td a {text-decoration:none; color: inherit;}
/*Outlook*/
.ExternalClass {width: 100%;}
.ExternalClass,.ExternalClass p,.ExternalClass span,.ExternalClass font,.ExternalClass td,.ExternalClass div {line-height:inherit;}
.ReadMsgBody {width:100%; background-color: #ffffff;}
/* iOS black LINKS */
a[x-apple-data-detectors] {color:inherit !important; text-decoration:none !important; font-size:inherit !important; font-family:inherit !important; font-weight:inherit !important; line-height:inherit !important;} 
/*Gmail black links*/
u + #body a {color:inherit;text-decoration:none;font-size:inherit;font-family:inherit;font-weight:inherit;line-height:inherit;}
/*Buttons fix*/
.undoreset a, .undoreset a:hover {text-decoration:none !important;}
.yshortcuts a {border-bottom:none !important;}
.ios-footer a {color:#aaaaaa !important;text-decoration:none;}
/*Responsive-Tablet*/
@media only screen and (max-width: 799px) and (min-width: 601px) {
  .outer-table.row {width:640px!important;max-width:640px!important;}
  .inner-table.row {width:580px!important;max-width:580px!important;}
}
/*Responsive-Mobile*/
@media only screen and (max-width: 600px) and (min-width: 320px) {
  table.row {width: 100%!important;max-width: 100%!important;}
  td.row {width: 100%!important;max-width: 100%!important;}
  .img-responsive img {width:100%!important;max-width: 100%!important;height: auto!important;margin: auto;}
  .center-float {float: none!important;margin:auto!important;}
  .center-text{text-align: center!important;}
  .container-padding {width: 100%!important;padding-left: 15px!important;padding-right: 15px!important;}
  .container-padding10 {width: 100%!important;padding-left: 10px!important;padding-right: 10px!important;}
  .hide-mobile {display: none!important;}
  .menu-container {text-align: center !important;}
  .autoheight {height: auto!important;}
  .m-padding-10 {margin: 10px 0!important;}
  .m-padding-15 {margin: 15px 0!important;}
  .m-padding-20 {margin: 20px 0!important;}
  .m-padding-30 {margin: 30px 0!important;}
  .m-padding-40 {margin: 40px 0!important;}
  .m-padding-50 {margin: 50px 0!important;}
  .m-padding-60 {margin: 60px 0!important;}
  .m-padding-top10 {margin: 30px 0 0 0!important;}
  .m-padding-top15 {margin: 15px 0 0 0!important;}
  .m-padding-top20 {margin: 20px 0 0 0!important;}
  .m-padding-top30 {margin: 30px 0 0 0!important;}
  .m-padding-top40 {margin: 40px 0 0 0!important;}
  .m-padding-top50 {margin: 50px 0 0 0!important;}
  .m-padding-top60 {margin: 60px 0 0 0!important;}
  .m-height10 {font-size:10px!important;line-height:10px!important;height:10px!important;}
  .m-height15 {font-size:15px!important;line-height:15px!important;height:15px!important;}
  .m-height20 {font-size:20px!important;line-height:20px!important;height:20px!important;}
  .m-height25 {font-size:20px!important;line-height:25px!important;height:25px!important;}
  .m-height30 {font-size:30px!important;line-height:30px!important;height:30px!important;}
  .radius6 {border-radius: 6px!important;}
  .fade-white {background-color: rgba(255, 255, 255, 0.8)!important;}
  .rwd-on-mobile {display: inline-block!important;padding: 5px!important;}
  .center-on-mobile {text-align: center!important;}
  .rwd-col {width:100%!important;max-width:100%!important;display:inline-block!important;}
  .type48 {font-size:48px!important;line-height:58px!important;}
}
</style>
<style type="text/css" class="export-delete"> 
  .composer--mobile table.row {width: 100%!important;max-width: 100%!important;}
  .composer--mobile td.row {width: 100%!important;max-width: 100%!important;}
  .composer--mobile .img-responsive img {width:100%!important;max-width: 100%!important;height: auto!important;margin: auto;}
  .composer--mobile .center-float {float: none!important;margin:auto!important;}
  .composer--mobile .center-text{text-align: center!important;}
  .composer--mobile .container-padding {width: 100%!important;padding-left: 15px!important;padding-right: 15px!important;}
  .composer--mobile .container-padding10 {width: 100%!important;padding-left: 10px!important;padding-right: 10px!important;}
  .composer--mobile .hide-mobile {display: none!important;}
  .composer--mobile .menu-container {text-align: center !important;}
  .composer--mobile .autoheight {height: auto!important;}
  .composer--mobile .m-padding-10 {margin: 10px 0!important;}
  .composer--mobile .m-padding-15 {margin: 15px 0!important;}
  .composer--mobile .m-padding-20 {margin: 20px 0!important;}
  .composer--mobile .m-padding-30 {margin: 30px 0!important;}
  .composer--mobile .m-padding-40 {margin: 40px 0!important;}
  .composer--mobile .m-padding-50 {margin: 50px 0!important;}
  .composer--mobile .m-padding-60 {margin: 60px 0!important;}
  .composer--mobile .m-padding-top10 {margin: 30px 0 0 0!important;}
  .composer--mobile .m-padding-top15 {margin: 15px 0 0 0!important;}
  .composer--mobile .m-padding-top20 {margin: 20px 0 0 0!important;}
  .composer--mobile .m-padding-top30 {margin: 30px 0 0 0!important;}
  .composer--mobile .m-padding-top40 {margin: 40px 0 0 0!important;}
  .composer--mobile .m-padding-top50 {margin: 50px 0 0 0!important;}
  .composer--mobile .m-padding-top60 {margin: 60px 0 0 0!important;}
  .composer--mobile .m-height10 {font-size:10px!important;line-height:10px!important;height:10px!important;}
  .composer--mobile .m-height15 {font-size:15px!important;line-height:15px!important;height:15px!important;}
  .composer--mobile .m-height20 {font-srobotoize:20px!important;line-height:20px!important;height:20px!important;}
  .composer--mobile .m-height25 {font-size:20px!important;line-height:25px!important;height:25px!important;}
  .composer--mobile .m-height30 {font-size:30px!important;line-height:30px!important;height:30px!important;}
  .composer--mobile .radius6 {border-radius: 6px!important;}
  .composer--mobile .fade-white {background-color: rgba(255, 255, 255, 0.8)!important;}
  .composer--mobile .rwd-on-mobile {display: inline-block!important;padding: 5px!important;}
  .composer--mobile .center-on-mobile {text-align: center!important;}
  .composer--mobile .rwd-col {width:100%!important;max-width:100%!important;display:inline-block!important;}
  .composer--mobile .type48 {font-size:48px!important;line-height:58px!important;}

        /* Footer */
        .footer {
            text-align: center;
            font-size: 14px;
            color: #999999;
        }
        .footer p{
            color: #fff;
            font-size: 17px;
        }

        .social-links {
            margin-bottom: 20px;
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
</style>
</head>

<body data-bgcolor="Body" style="margin-top: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;" bgcolor="#000000">

<span class="preheader-text" data-preheader-text style="color: transparent; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; visibility: hidden; width: 0; display: none; mso-hide: all;"></span>

<!-- Preheader white space hack -->
<div style="display: none; max-height: 0px; overflow: hidden;">
‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌  ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ 
</div>

<div data-primary-font="Roboto Slab" data-secondary-font="Roboto" style="display:none; font-size:0px; line-height:0px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; visibility:hidden; mso-hide:all;"></div>

<table border="0" align="center" cellpadding="0" cellspacing="0" width="100%" style="width:100%;max-width:100%;">
  <tr><!-- Outer Table -->
    <td align="center" data-bgcolor="Body" bgcolor="#000000" class="container-padding" data-composer>

<table data-outer-table border="0" align="center" cellpadding="0" cellspacing="0" class="outer-table row" role="presentation" width="580" style="width:580px;max-width:580px;" data-module="black-logo">
  <!-- black-logo -->
  <tr>
    <td height="60" style="font-size:60px;line-height:60px;" data-height="Spacing top"> </td>
  </tr>
    <tr data-element="black-logo" data-label="Logo">
   <td align="center">
      <img style="width:189px;border:0px;display: inline!important;" src="https://tradelizer-marketing.vercel.app/img/images/Logo%20Dark_1.png" width="189" border="0" editable="true" data-icon data-image-edit data-url data-label="Logo" data-image-width alt="svglogo">
    </td>
  </tr>
  <tr>
    <td height="30" style="font-size:30px;line-height:30px;" data-height="Spacing bottom"> </td>
  </tr>
  <!-- black-logo -->
</table>

<table data-outer-table border="0" align="center" cellpadding="0" cellspacing="0" class="outer-table row" role="presentation" width="580" style="width:580px;max-width:580px;" data-module="black-intro-2">
  <!-- black-intro-2 -->
  <tr>
    <td height="30" style="font-size:30px;line-height:30px;" data-height="Spacing top"> </td>
  </tr>
  <tr data-element="black-intro-2-headline" data-label="Intro Headline">
    <td class="type48" data-text-style="Intro Headline" align="center" style="font-family:'Roboto Slab',Arial,Helvetica,sans-serif;font-size:40px;line-height:84px;font-weight:700;font-style:normal;color:#FFFFFF;text-decoration:none;letter-spacing:0px;">
        <singleline>
          <div mc:edit data-text-edit>
            New Enquiry Message
          </div>
        </singleline>
    </td>
  </tr>
  <tr data-element="black-intro-2-headline" data-label="Intro Headline"> 
    <td height="20" style="font-size:20px;line-height:20px;" data-height="Spacing under headline"> </td>
  </tr>
 
  
  <tr>
    <td height="30" style="font-size:30px;line-height:30px;" data-height="Spacing bottom"> </td>
  </tr>
  <!-- black-intro-2 -->
</table>



<table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" class="row" width="580" style="width:580px;max-width:580px;" data-module="black-footer">
  <!-- black-footer -->
  <tr>
    <td height="30" style="font-size:30px;line-height:30px;" data-height="Footer spacing top"> </td>
  </tr>
  
  <tr data-element="black-footer-paragraphs" data-label="Paragraphs">
    <td align="center">
      <table border="0" align="center" cellpadding="0" cellspacing="0" role="presentation" class="row" width="480" style="width:480px;max-width:480px;">
        <tr>
          <td class="center-text" data-text-style="Paragraphs" align="start" style="font-family:'Roboto',Arial,Helvetica,sans-serif;font-size:14px;line-height:24px;font-weight:400;font-style:normal;color:#999999;text-decoration:none;letter-spacing:0px;">
            <multiline>
              <div mc:edit data-text-edit style="font-size:20px;display:grid;grid-cols-1;gap:15px">
               <div style="line-height:40px;" >
                  <span style="font-size:20px">Name:</span><span style="font-size:20px;margin-inline:4px"> ${firstName} ${lastName}<span>
               </div>
              <div style="line-height:40px;" >
                  <span style="font-size:20px">Email:</span><span style="font-size:20px;margin-inline:4px"> ${email}<span>
              </div>
              <div style="line-height:40px;" >  <span style="font-size:20px">Phone:</span> <span style="font-size:20px;margin-inline:4px">${phone}</span></div>
             <div>   <span style="font-size:20px;line-height:40px;">Message:</span><br/><br/> <span style="font-size:20px">${message}</span></div>
               
              </div>
            </multiline>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr data-element="black-footer-paragraphs" data-label="Paragraphs">
    <td height="20" style="font-size:20px;line-height:20px;" data-height="Spacing above tags"> </td>
  </tr>
<table data-outer-table border="0" align="center" cellpadding="0" cellspacing="0" class="outer-table row" role="presentation" width="580" style="width:580px;max-width:580px;" data-module="black-splitter">
  <!-- black-splitter -->
  <tr>
    <td height="30" style="font-size:30px;line-height:30px;" data-height="Spacing top"> </td>
  </tr>
  <tr>
    <td align="center" height="8" data-border-color="dotted-dividers" style="font-size:8px;line-height:8px;border-top: 8px dotted #333333;"> </td>
  </tr>
  <tr>
    <td height="30" style="font-size:30px;line-height:30px;" data-height="Spacing bottom"> </td>
  </tr>
  <!-- black-splitter -->
</table>
  <tr>
    <td height="50" style="font-size:50px;line-height:50px;" data-height="Footer spacing bottom"> 
    <footer class="footer">
            <div class="social-links">
                <a href="https://www.instagram.com/officialtradelizer/" class="social-link"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/768px-Instagram_icon.png" alt="Facebook" class="social-icon"></a>
                <a href="https://x.com/tradelizerapp?s=11&t=OhR-rRwWTHVnk9633kIvKw" class="social-link"><img src="https://img.freepik.com/free-vector/new-2023-twitter-logo-x-icon-design_1017-45418.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1724630400&semt=ais_hybrid" alt="Twitter" class="social-icon"></a>
            </div>
            <p>Questions? Contact us at <a href="mailto:support@tradelizer.com">support@tradelizer.com</a></p>
            <p>&copy; ${dayjs().format(
              "YYYY"
            )} TradeLizer Inc. All Rights Reserved.</p>
            <p>
                <a href="https://www.tradelizer.com/Privacy">Privacy Policy</a> | 
                <a href="https://www.tradelizer.com/TermsAndCondition">Terms of Service</a> | 
                <a href="https://www.tradelizer.com/#contact">Contact </a>
            </p>
        </footer>
    </td>
  </tr>
  <!-- black-footer -->
</table>

    </td>

</table>
 
</body>
</html>

`;
};

module.exports = EnquiryTemplate;
