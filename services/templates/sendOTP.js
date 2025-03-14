const sendOTP = (fn, otp) => {
  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
  
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <title>New Assignment</title>
   
    <!--
        MS Outlook custom styles
      -->
    <!--[if mso 12]>
        <style type="text/css">
          .flexibleContainer{display:block !important; width:100% !important;}
        </style>
      <![endif]-->
    <!--[if mso 14]>
        <style type="text/css">
          .flexibleContainer{display:block !important; width:100% !important;}
        </style>
      <![endif]-->
  </head>
  
  <body bgcolor="#FFFFFF" leftmargin="0" marginwidth="0" topmargin="0" marginheight="0" offset="0">
  <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
    </div>
    <p style="font-size:1.1em">Hi,${fn}</p>
    <p>Please use this verification code to reset your password , valid for 5 minutes</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
    <p style="font-size:0.9em;">Regards,<br />Your Brand</p>
   
</div>
  </body>
  
  </html>

`;
};
module.exports = sendOTP;
