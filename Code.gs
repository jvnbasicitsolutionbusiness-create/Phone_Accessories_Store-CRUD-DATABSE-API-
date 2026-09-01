// ============================================================
// STOCKFLOW GOOGLE APPS SCRIPT BACKEND
// ============================================================
// VERSION: 2.0
//
// FEATURES
// ------------------------------------------------------------
// 1. Employee registration
// 2. Protected Admin registration
// 3. Real Gmail OTP
// 4. Optional real SMS OTP through Twilio
// 5. OTP expiration
// 6. Maximum 4 incorrect OTP attempts
// 7. 30-minute OTP lockout
// 8. Login authentication
// 9. Login attempt protection
// 10. Resend OTP
// 11. Forgot password
// 12. Password reset
// 13. Duplicate account protection
// 14. Server-side role assignment
//
// IMPORTANT
// ------------------------------------------------------------
// - There is NO universal demo OTP.
// - "123456" is NOT accepted.
// - Real OTPs are generated server-side.
// - Real OTPs are never returned to the frontend.
// - Admin registration requires a server-side secret key.
// - SMS requires Twilio credentials stored in Script Properties.
//
// ============================================================


// ============================================================
// BASIC CONFIGURATION
// ============================================================

const SPREADSHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const SHEET_NAME = "StockFlowUsers";

const APP_NAME = "StockFlow";


// ============================================================
// SECURITY CONFIGURATION
// ============================================================

const OTP_MINUTES = 10;

const MAX_OTP_ATTEMPTS = 4;

const OTP_LOCK_MINUTES = 30;

const MAX_LOGIN_ATTEMPTS = 5;

const LOGIN_LOCK_MINUTES = 15;

const RESET_TOKEN_MINUTES = 15;


// ============================================================
// OTP CHANNELS
// ============================================================

const OTP_CHANNEL_EMAIL = "email";

const OTP_CHANNEL_PHONE = "phone";


// ============================================================
// SHEET HEADERS
// ============================================================
//
// Existing fields are preserved.
// Additional security fields are added at the end.
//
// ============================================================

const HEADERS = [
  "UID",
  "Full Name",
  "Username",
  "Age",
  "Gmail",
  "Phone",
  "Password",
  "Role",
  "Account Status",
  "Verified",
  "OTP",
  "OTP Expires",
  "Created At",
  "Verified At",
  "OTP Attempts",
  "OTP Lock Until",
  "Login Attempts",
  "Login Lock Until",
  "OTP Channel",
  "Reset Token",
  "Reset Token Expires"
];


// ============================================================
// HTTP GET
// ============================================================

function doGet() {

  return json_({
    success: true,
    service: APP_NAME,
    status: "online",
    message: "StockFlow authentication API is running."
  });

}


// ============================================================
// HTTP POST
// ============================================================

function doPost(e) {

  try {

    const raw =
      e &&
      e.postData &&
      e.postData.contents
        ? e.postData.contents
        : "{}";

    const data = JSON.parse(raw);

    const action =
      String(data.action || "")
        .trim();

    switch (action) {

      // ------------------------------------------------------
      // EMPLOYEE REGISTRATION
      // ------------------------------------------------------

      case "register":
        return json_(
          registerEmployee_(data)
        );


      // ------------------------------------------------------
      // ADMIN REGISTRATION
      // ------------------------------------------------------

      case "adminRegister":
        return json_(
          registerAdmin_(data)
        );


      // ------------------------------------------------------
      // VERIFY OTP
      // ------------------------------------------------------

      case "verifyOtp":
        return json_(
          verifyOtp_(data)
        );


      // ------------------------------------------------------
      // RESEND / REQUEST OTP
      // ------------------------------------------------------

      case "requestOtp":
        return json_(
          requestOtp_(data)
        );


      case "updateOtp":
        return json_(
          requestOtp_(data)
        );


      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      case "login":
        return json_(
          login_(data)
        );


      // ------------------------------------------------------
      // FORGOT PASSWORD
      // ------------------------------------------------------

      case "forgotPassword":
        return json_(
          forgotPassword_(data)
        );


      // ------------------------------------------------------
      // RESET PASSWORD
      // ------------------------------------------------------

      case "resetPassword":
        return json_(
          resetPassword_(data)
        );


      // ------------------------------------------------------
      // ADMIN KEY CHECK
      // ------------------------------------------------------

      case "checkAdminRegistration":
        return json_(
          checkAdminRegistration_(data)
        );


      // ------------------------------------------------------
      // UNKNOWN ACTION
      // ------------------------------------------------------

      default:

        return json_({
          success: false,
          message: "Unknown action."
        });

    }

  } catch (error) {

    console.error(
      "DO POST ERROR:",
      error
    );

    return json_({
      success: false,
      message:
        error &&
        error.message
          ? error.message
          : "Server error."
    });

  }

}


// ============================================================
// JSON RESPONSE
// ============================================================

function json_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


// ============================================================
// GET SHEET
// ============================================================

function getSheet_() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );

  let sheet =
    ss.getSheetByName(
      SHEET_NAME
    );

  if (!sheet) {

    sheet =
      ss.insertSheet(
        SHEET_NAME
      );

  }

  ensureHeaders_(sheet);

  return sheet;

}


// ============================================================
// ENSURE HEADERS
// ============================================================

function ensureHeaders_(sheet) {

  const requiredColumns =
    HEADERS.length;

  const currentLastColumn =
    Math.max(
      sheet.getLastColumn(),
      requiredColumns
    );

  const current =
    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .getValues()[0];

  let needsUpdate = false;

  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    if (
      String(current[i] || "")
      !== HEADERS[i]
    ) {

      needsUpdate = true;
      break;

    }

  }

  if (needsUpdate) {

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS.length
      )
      .setValues([
        HEADERS
      ]);

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS.length
      )
      .setFontWeight(
        "bold"
      );

  }

}


// ============================================================
// GET ROWS
// ============================================================

function rows_(sheet) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      HEADERS.length
    )
    .getValues();

}


// ============================================================
// NORMALIZE VALUE
// ============================================================

function normalize_(value) {

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


// ============================================================
// LOWERCASE NORMALIZATION
// ============================================================

function normalizeLower_(value) {

  return normalize_(
    value
  ).toLowerCase();

}


// ============================================================
// FIND USER
// ============================================================

function findUserRow_(identity) {

  const sheet =
    getSheet_();

  const rows =
    rows_(sheet);

  const target =
    normalizeLower_(
      identity
    );

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];

    const uid =
      normalizeLower_(
        row[0]
      );

    const username =
      normalizeLower_(
        row[2]
      );

    const gmail =
      normalizeLower_(
        row[4]
      );

    const phone =
      normalizePhone_(
        row[5]
      );

    if (
      target === uid ||
      target === username ||
      target === gmail ||
      target === normalizeLower_(phone)
    ) {

      return {

        sheet: sheet,

        rowNumber: i + 2,

        values: row

      };

    }

  }

  return null;

}


// ============================================================
// FIND BY USERNAME
// ============================================================

function findUsername_(username) {

  return findUserRow_(
    username
  );

}


// ============================================================
// FIND BY EMAIL
// ============================================================

function findEmail_(email) {

  return findUserRow_(
    email
  );

}


// ============================================================
// FIND BY PHONE
// ============================================================

function findPhone_(phone) {

  const normalized =
    normalizePhone_(
      phone
    );

  const sheet =
    getSheet_();

  const rows =
    rows_(sheet);

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];

    if (
      normalizePhone_(
        row[5]
      ) === normalized
    ) {

      return {

        sheet: sheet,

        rowNumber: i + 2,

        values: row

      };

    }

  }

  return null;

}


// ============================================================
// PHONE NORMALIZATION
// ============================================================

function normalizePhone_(value) {

  let phone =
    normalize_(
      value
    ).replace(
      /[\s\-()]/g,
      ""
    );

  if (
    /^09\d{9}$/.test(
      phone
    )
  ) {

    return "+63" +
      phone.substring(1);

  }

  if (
    /^639\d{9}$/.test(
      phone
    )
  ) {

    return "+" +
      phone;

  }

  if (
    /^\+639\d{9}$/.test(
      phone
    )
  ) {

    return phone;

  }

  return phone;

}


// ============================================================
// VALID EMAIL
// ============================================================

function validEmail_(email) {

  return /^\S+@\S+\.\S+$/
    .test(
      normalize_(email)
    );

}


// ============================================================
// VALID PHONE
// ============================================================

function validPhone_(phone) {

  const normalized =
    normalizePhone_(
      phone
    );

  return /^\+639\d{9}$/
    .test(
      normalized
    );

}


// ============================================================
// VALID USERNAME
// ============================================================

function validUsername_(username) {

  return /^[A-Za-z0-9_.-]{4,20}$/
    .test(
      normalize_(username)
    );

}


// ============================================================
// VALID PASSWORD
// ============================================================

function validPassword_(password) {

  const value =
    String(
      password || ""
    );

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );

}


// ============================================================
// GENERATE UID
// ============================================================

function generateUid_(prefix) {

  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );

}


// ============================================================
// GENERATE OTP
// ============================================================

function generateOtp_() {

  return String(
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );

}


// ============================================================
// GENERATE RESET TOKEN
// ============================================================

function generateResetToken_() {

  return Utilities
    .getUuid()
    .replace(/-/g, "");

}


// ============================================================
// GET ADMIN REGISTRATION KEY
// ============================================================
//
// IMPORTANT:
// The admin key is NOT stored in the HTML.
// It is stored in Apps Script Properties.
//
// Set it once using:
//
// setAdminRegistrationKey()
//
// ============================================================

function getAdminRegistrationKey_() {

  const properties =
    PropertiesService
      .getScriptProperties();

  return normalize_(
    properties.getProperty(
      "STOCKFLOW_ADMIN_REGISTRATION_KEY"
    )
  );

}


// ============================================================
// SET ADMIN REGISTRATION KEY
// ============================================================
//
// RUN THIS MANUALLY ONCE FROM THE APPS SCRIPT EDITOR.
//
// Change the value before running.
//
// ============================================================

function setAdminRegistrationKey() {

  const key =
    "CHANGE_THIS_TO_YOUR_PRIVATE_ADMIN_KEY";

  if (
    key ===
    "CHANGE_THIS_TO_YOUR_PRIVATE_ADMIN_KEY"
  ) {

    throw new Error(
      "Change the admin registration key before running this function."
    );

  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      "STOCKFLOW_ADMIN_REGISTRATION_KEY",
      key
    );

  return "Admin registration key saved.";

}


// ============================================================
// VALIDATE ADMIN KEY
// ============================================================

function validateAdminKey_(providedKey) {

  const serverKey =
    getAdminRegistrationKey_();

  if (!serverKey) {

    throw new Error(
      "Admin registration is not configured. Set the server-side admin registration key first."
    );

  }

  return (
    normalize_(providedKey) ===
    serverKey
  );

}


// ============================================================
// SEND EMAIL OTP
// ============================================================

function sendOtpEmail_(
  email,
  fullName,
  otp,
  purpose
) {

  if (!email) {

    throw new Error(
      "Registered Gmail address is missing."
    );

  }

  let subject =
    "StockFlow - Verification Code";

  if (
    purpose ===
    "registration"
  ) {

    subject =
      "StockFlow - Verify your account";

  }

  if (
    purpose ===
    "resend"
  ) {

    subject =
      "StockFlow - New verification code";

  }

  if (
    purpose ===
    "password"
  ) {

    subject =
      "StockFlow - Password reset code";

  }

  const plain =

    "Hello " +
    (
      fullName ||
      "StockFlow User"
    ) +
    ",\n\n" +

    "Your StockFlow verification code is:\n\n" +

    otp +
    "\n\n" +

    "This code expires in " +
    OTP_MINUTES +
    " minutes.\n\n" +

    "For your security, never share this code with anyone.\n\n" +

    "If you did not request this code, you can ignore this message.\n\n" +

    "StockFlow";

  const html =

    "<div style=\"" +
      "font-family:Arial,sans-serif;" +
      "max-width:560px;" +
      "margin:auto;" +
      "padding:20px;" +
      "color:#10233f\"" +
    ">" +

      "<h2 style=\"color:#1769e0\">" +
        "StockFlow" +
      "</h2>" +

      "<p>Hello " +
        escapeHtml_(
          fullName ||
          "StockFlow User"
        ) +
      ",</p>" +

      "<p>Your verification code is:</p>" +

      "<div style=\"" +
        "font-size:32px;" +
        "font-weight:800;" +
        "letter-spacing:8px;" +
        "padding:18px;" +
        "background:#f1f5f9;" +
        "border-radius:12px;" +
        "text-align:center;" +
        "color:#10233f;" +
        "margin:20px 0;" +
      "\">" +

        otp +

      "</div>" +

      "<p>" +
        "This code expires in " +
        "<b>" +
          OTP_MINUTES +
        " minutes" +
        "</b>." +
      "</p>" +

      "<p style=\"" +
        "color:#64748b;" +
        "font-size:13px;" +
      "\">" +

        "Never share your verification code with anyone." +

      "</p>" +

      "<p style=\"" +
        "color:#64748b;" +
        "font-size:13px;" +
      "\">" +

        "If you did not request this code, you can ignore this email." +

      "</p>" +

      "<p>— StockFlow</p>" +

    "</div>";

  MailApp.sendEmail({

    to: email,

    subject: subject,

    body: plain,

    htmlBody: html,

    name: "StockFlow"

  });

}


// ============================================================
// TWILIO CONFIGURATION
// ============================================================
//
// To enable actual SMS:
//
// Apps Script > Project Settings > Script Properties
//
// Add:
//
// TWILIO_ACCOUNT_SID
// TWILIO_AUTH_TOKEN
// TWILIO_PHONE_NUMBER
//
// Example:
//
// TWILIO_PHONE_NUMBER = +1xxxxxxxxxx
//
// ============================================================

function getTwilioConfig_() {

  const properties =
    PropertiesService
      .getScriptProperties();

  return {

    accountSid:
      normalize_(
        properties.getProperty(
          "TWILIO_ACCOUNT_SID"
        )
      ),

    authToken:
      normalize_(
        properties.getProperty(
          "TWILIO_AUTH_TOKEN"
        )
      ),

    from:
      normalize_(
        properties.getProperty(
          "TWILIO_PHONE_NUMBER"
        )
      )

  };

}


// ============================================================
// CHECK SMS CONFIGURATION
// ============================================================

function isSmsConfigured_() {

  const config =
    getTwilioConfig_();

  return Boolean(
    config.accountSid &&
    config.authToken &&
    config.from
  );

}


// ============================================================
// SEND REAL SMS OTP
// ============================================================

function sendOtpSms_(
  phone,
  fullName,
  otp
) {

  if (
    !validPhone_(phone)
  ) {

    throw new Error(
      "Invalid Philippine phone number."
    );

  }

  const config =
    getTwilioConfig_();

  if (
    !config.accountSid ||
    !config.authToken ||
    !config.from
  ) {

    throw new Error(
      "SMS verification is not configured. Add the Twilio credentials to Apps Script Properties."
    );

  }

  const normalizedPhone =
    normalizePhone_(
      phone
    );

  const message =

    "StockFlow verification code: " +
    otp +
    ". Expires in " +
    OTP_MINUTES +
    " minutes. Do not share this code.";

  const url =

    "https://api.twilio.com/2010-04-01/Accounts/" +
    encodeURIComponent(
      config.accountSid
    ) +
    "/Messages.json";

  const payload = {

    To: normalizedPhone,

    From: config.from,

    Body: message

  };

  const authorization =
    Utilities
      .base64Encode(
        config.accountSid +
        ":" +
        config.authToken
      );

  const response =
    UrlFetchApp.fetch(
      url,
      {

        method: "post",

        payload: payload,

        headers: {

          Authorization:
            "Basic " +
            authorization

        },

        muteHttpExceptions: true

      }
    );

  const status =
    response.getResponseCode();

  const body =
    response.getContentText();

  if (
    status < 200 ||
    status >= 300
  ) {

    console.error(
      "TWILIO ERROR:",
      body
    );

    throw new Error(
      "Unable to send the SMS verification code."
    );

  }

  return true;

}


// ============================================================
// SEND OTP BASED ON CHANNEL
// ============================================================

function sendOtp_(
  channel,
  user,
  otp,
  purpose
) {

  const selectedChannel =
    normalizeLower_(
      channel
    );

  if (
    selectedChannel ===
    OTP_CHANNEL_PHONE
  ) {

    sendOtpSms_(
      user.phone,
      user.fullName,
      otp
    );

    return "phone";

  }

  sendOtpEmail_(
    user.email,
    user.fullName,
    otp,
    purpose
  );

  return "email";

}


// ============================================================
// EMPLOYEE REGISTRATION
// ============================================================

function registerEmployee_(data) {

  const uid =
    normalize_(
      data.uid
    ) ||
    generateUid_(
      "sf_emp"
    );

  const fullName =
    normalize_(
      data.name
    );

  const username =
    normalize_(
      data.username
    );

  const email =
    normalize_(
      data.gmail
    );

  const phone =
    normalizePhone_(
      data.phone
    );

  const age =
    Number(
      data.age
    );

  const password =
    String(
      data.password || ""
    );

  const channel =
    normalizeLower_(
      data.verificationChannel ||
      data.otpChannel ||
      "email"
    );


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
    !fullName ||
    !username ||
    !email ||
    !phone ||
    !password
  ) {

    return {

      success: false,

      message:
        "All employee registration fields are required."

    };

  }


  if (
    !validUsername_(
      username
    )
  ) {

    return {

      success: false,

      message:
        "Username must contain 4–20 valid characters."

    };

  }


  if (
    !validEmail_(
      email
    )
  ) {

    return {

      success: false,

      message:
        "Enter a valid Gmail/email address."

    };

  }


  if (
    !validPhone_(
      phone
    )
  ) {

    return {

      success: false,

      message:
        "Enter a valid Philippine phone number."

    };

  }


  if (
    age < 18 ||
    age > 100
  ) {

    return {

      success: false,

      message:
        "Age must be between 18 and 100."

    };

  }


  if (
    !validPassword_(
      password
    )
  ) {

    return {

      success: false,

      message:
        "Password must contain 8+ characters, uppercase, lowercase, number and symbol."

    };

  }


  if (
    channel !== "email" &&
    channel !== "phone"
  ) {

    return {

      success: false,

      message:
        "Invalid verification method."

    };

  }


  if (
    channel === "phone" &&
    !isSmsConfigured_()
  ) {

    return {

      success: false,

      message:
        "Phone verification is currently unavailable. Configure SMS verification first."

    };

  }


  // ----------------------------------------------------------
  // DUPLICATE CHECK
  // ----------------------------------------------------------

  if (
    findUsername_(
      username
    )
  ) {

    return {

      success: false,

      message:
        "Username is already registered."

    };

  }


  if (
    findEmail_(
      email
    )
  ) {

    return {

      success: false,

      message:
        "Email is already registered."

    };

  }


  if (
    findPhone_(
      phone
    )
  ) {

    return {

      success: false,

      message:
        "Phone number is already registered."

    };

  }


  // ----------------------------------------------------------
  // CREATE OTP
  // ----------------------------------------------------------

  const otp =
    generateOtp_();

  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60 *
      1000
    );

  const now =
    new Date();


  const sheet =
    getSheet_();


  // ----------------------------------------------------------
  // SAVE EMPLOYEE
  // ----------------------------------------------------------
  //
  // ROLE IS ALWAYS Employee.
  //
  // The frontend cannot choose Admin.
  //
  // ----------------------------------------------------------

  sheet.appendRow([

    uid,

    fullName,

    username,

    age,

    email,

    phone,

    password,

    "Employee",

    "Pending Verification",

    false,

    otp,

    expires,

    now,

    "",

    0,

    "",

    0,

    "",

    channel,

    "",

    ""

  ]);


  const rowNumber =
    sheet.getLastRow();


  try {

    sendOtp_(
      channel,

      {

        fullName:
          fullName,

        email:
          email,

        phone:
          phone

      },

      otp,

      "registration"

    );

  } catch (error) {

    sheet.deleteRow(
      rowNumber
    );

    throw new Error(

      "Registration was not completed because the verification code could not be sent. " +
      error.message

    );

  }


  return {

    success: true,

    uid: uid,

    role: "Employee",

    verified: false,

    accountStatus:
      "Pending Verification",

    otpSent: true,

    channel: channel,

    message:
      channel === "phone"
        ? "Registration saved. A real verification code was sent to your phone."
        : "Registration saved. A real verification code was sent to your Gmail."

  };

}


// ============================================================
// ADMIN REGISTRATION
// ============================================================
//
// IMPORTANT:
//
// This endpoint is separate from employee registration.
//
// The client must provide the private admin registration key.
//
// The key is validated against Apps Script Properties.
//
// ============================================================

function registerAdmin_(data) {

  const adminKey =
    normalize_(
      data.adminKey
    );


  // ----------------------------------------------------------
  // SERVER-SIDE ADMIN KEY
  // ----------------------------------------------------------

  let validKey = false;

  try {

    validKey =
      validateAdminKey_(
        adminKey
      );

  } catch (error) {

    return {

      success: false,

      message:
        error.message

    };

  }


  if (!validKey) {

    return {

      success: false,

      message:
        "Admin registration is not authorized."

    };

  }


  // ----------------------------------------------------------
  // REGISTRATION DATA
  // ----------------------------------------------------------

  const uid =
    normalize_(
      data.uid
    ) ||
    generateUid_(
      "sf_admin"
    );

  const fullName =
    normalize_(
      data.name
    );

  const username =
    normalize_(
      data.username
    );

  const email =
    normalize_(
      data.gmail
    );

  const phone =
    normalizePhone_(
      data.phone
    );

  const age =
    Number(
      data.age
    );

  const password =
    String(
      data.password || ""
    );

  const channel =
    normalizeLower_(
      data.verificationChannel ||
      data.otpChannel ||
      "email"
    );


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
    !fullName ||
    !username ||
    !email ||
    !phone ||
    !password
  ) {

    return {

      success: false,

      message:
        "All admin registration fields are required."

    };

  }


  if (
    !validUsername_(
      username
    )
  ) {

    return {

      success: false,

      message:
        "Username must contain 4–20 valid characters."

    };

  }


  if (
    !validEmail_(
      email
    )
  ) {

    return {

      success: false,

      message:
        "Enter a valid Gmail/email address."

    };

  }


  if (
    !validPhone_(
      phone
    )
  ) {

    return {

      success: false,

      message:
        "Enter a valid Philippine phone number."

    };

  }


  if (
    age < 18 ||
    age > 100
  ) {

    return {

      success: false,

      message:
        "Age must be between 18 and 100."

    };

  }


  if (
    !validPassword_(
      password
    )
  ) {

    return {

      success: false,

      message:
        "Password must contain 8+ characters, uppercase, lowercase, number and symbol."

    };

  }


  if (
    channel !== "email" &&
    channel !== "phone"
  ) {

    return {

      success: false,

      message:
        "Invalid verification method."

    };

  }


  if (
    channel === "phone" &&
    !isSmsConfigured_()
  ) {

    return {

      success: false,

      message:
        "Phone verification is not configured."

    };

  }


  // ----------------------------------------------------------
  // DUPLICATE CHECK
  // ----------------------------------------------------------

  if (
    findUsername_(
      username
    )
  ) {

    return {

      success: false,

      message:
        "Username is already registered."

    };

  }


  if (
    findEmail_(
      email
    )
  ) {

    return {

      success: false,

      message:
        "Email is already registered."

    };

  }


  if (
    findPhone_(
      phone
    )
  ) {

    return {

      success: false,

      message:
        "Phone number is already registered."

    };

  }


  // ----------------------------------------------------------
  // OTP
  // ----------------------------------------------------------

  const otp =
    generateOtp_();

  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60 *
      1000
    );

  const now =
    new Date();


  const sheet =
    getSheet_();


  // ----------------------------------------------------------
  // SAVE ADMIN
  // ----------------------------------------------------------

  sheet.appendRow([

    uid,

    fullName,

    username,

    age,

    email,

    phone,

    password,

    "Admin",

    "Pending Verification",

    false,

    otp,

    expires,

    now,

    "",

    0,

    "",

    0,

    "",

    channel,

    "",

    ""

  ]);


  const rowNumber =
    sheet.getLastRow();


  try {

    sendOtp_(
      channel,

      {

        fullName:
          fullName,

        email:
          email,

        phone:
          phone

      },

      otp,

      "registration"

    );

  } catch (error) {

    sheet.deleteRow(
      rowNumber
    );

    throw new Error(

      "Admin registration was not completed because the verification code could not be sent. " +
      error.message

    );

  }


  return {

    success: true,

    uid: uid,

    role: "Admin",

    verified: false,

    accountStatus:
      "Pending Verification",

    otpSent: true,

    channel: channel,

    message:
      "Admin registration authorized. A real verification code was sent."

  };

}


// ============================================================
// VERIFY OTP
// ============================================================

function verifyOtp_(data) {

  const identity =
    normalize_(
      data.identity
    );

  const otp =
    normalize_(
      data.otp
    );


  if (
    !identity ||
    !otp
  ) {

    return {

      success: false,

      message:
        "Verification information is incomplete."

    };

  }


  const found =
    findUserRow_(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Account was not found."

    };

  }


  const row =
    found.values;


  // ----------------------------------------------------------
  // SECURITY COLUMN VALUES
  // ----------------------------------------------------------

  let storedOtp =
    normalize_(
      row[10]
    );

  let expires =
    row[11]
      ? new Date(row[11])
      : null;

  let otpAttempts =
    Number(
      row[14] || 0
    );

  let lockUntil =
    row[15]
      ? new Date(row[15])
      : null;


  // ----------------------------------------------------------
  // CHECK OTP LOCK
  // ----------------------------------------------------------

  if (
    lockUntil &&
    Date.now() <
    lockUntil.getTime()
  ) {

    const minutes =
      Math.ceil(
        (
          lockUntil.getTime() -
          Date.now()
        ) /
        60000
      );

    return {

      success: false,

      locked: true,

      message:
        "Too many incorrect verification attempts. Try again in " +
        minutes +
        " minute(s)."

    };

  }


  // ----------------------------------------------------------
  // CLEAR EXPIRED LOCK
  // ----------------------------------------------------------

  if (
    lockUntil &&
    Date.now() >=
    lockUntil.getTime()
  ) {

    otpAttempts = 0;

    found.sheet
      .getRange(
        found.rowNumber,
        15,
        1,
        2
      )
      .setValues([
        [
          0,
          ""
        ]
      ]);

  }


  // ----------------------------------------------------------
  // OTP EXPIRATION
  // ----------------------------------------------------------

  if (
    expires &&
    Date.now() >
    expires.getTime()
  ) {

    return {

      success: false,

      message:
        "This verification code has expired. Request a new code."

    };

  }


  // ----------------------------------------------------------
  // VERIFY CODE
  // ----------------------------------------------------------

  if (
    !storedOtp ||
    otp !== storedOtp
  ) {

    otpAttempts++;

    if (
      otpAttempts >=
      MAX_OTP_ATTEMPTS
    ) {

      const newLock =
        new Date(
          Date.now() +
          OTP_LOCK_MINUTES *
          60000
        );

      found.sheet
        .getRange(
          found.rowNumber,
          15,
          1,
          2
        )
        .setValues([
          [
            otpAttempts,
            newLock
          ]
        ]);

      return {

        success: false,

        locked: true,

        message:
          "Too many incorrect verification attempts. Your account is temporarily locked for 30 minutes."

      };

    }


    found.sheet
      .getRange(
        found.rowNumber,
        15
      )
      .setValue(
        otpAttempts
      );


    const remaining =
      MAX_OTP_ATTEMPTS -
      otpAttempts;


    return {

      success: false,

      message:
        "Incorrect verification code. " +
        remaining +
        " attempt(s) remaining."

    };

  }


  // ----------------------------------------------------------
  // SUCCESSFUL VERIFICATION
  // ----------------------------------------------------------

  const role =
    normalize_(
      row[7]
    ) ||
    "Employee";


  const now =
    new Date();


  found.sheet
    .getRange(
      found.rowNumber,
      9,
      1,
      13
    )
    .setValues([
      [

        // Account Status
        "Active",

        // Verified
        true,

        // OTP
        "",

        // OTP Expires
        "",

        // Created At
        row[12] || now,

        // Verified At
        now,

        // OTP Attempts
        0,

        // OTP Lock Until
        "",

        // Login Attempts
        0,

        // Login Lock Until
        "",

        // OTP Channel
        row[18] || "email",

        // Reset Token
        "",

        // Reset Token Expires
        ""

      ]
    ]);


  return {

    success: true,

    verified: true,

    demo: false,

    role: role,

    accountStatus:
      "Active",

    message:
      "Account verified successfully."

  };

}


// ============================================================
// REQUEST / RESEND OTP
// ============================================================

function requestOtp_(data) {

  const identity =
    normalize_(
      data.identity
    );


  if (!identity) {

    return {

      success: false,

      message:
        "Account identity is required."

    };

  }


  const found =
    findUserRow_(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Account was not found."

    };

  }


  const row =
    found.values;


  // ----------------------------------------------------------
  // CHECK LOCK
  // ----------------------------------------------------------

  const lockUntil =
    row[15]
      ? new Date(row[15])
      : null;


  if (
    lockUntil &&
    Date.now() <
    lockUntil.getTime()
  ) {

    const minutes =
      Math.ceil(
        (
          lockUntil.getTime() -
          Date.now()
        ) /
        60000
      );

    return {

      success: false,

      locked: true,

      message:
        "Your verification is temporarily locked. Try again in " +
        minutes +
        " minute(s)."

    };

  }


  // ----------------------------------------------------------
  // GENERATE NEW OTP
  // ----------------------------------------------------------

  const otp =
    generateOtp_();

  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60000
    );


  const channel =
    normalizeLower_(
      row[18]
    ) ||
    "email";


  const user = {

    fullName:
      normalize_(
        row[1]
      ),

    email:
      normalize_(
        row[4]
      ),

    phone:
      normalizePhone_(
        row[5]
      )

  };


  // ----------------------------------------------------------
  // SEND OTP FIRST
  // ----------------------------------------------------------

  sendOtp_(
    channel,
    user,
    otp,
    "resend"
  );


  // ----------------------------------------------------------
  // SAVE OTP
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      9,
      1,
      8
    )
    .setValues([
      [

        "Pending Verification",

        false,

        otp,

        expires,

        row[12] ||
          new Date(),

        row[13] ||
          "",

        0,

        ""

      ]
    ]);


  return {

    success: true,

    otpSent: true,

    channel: channel,

    message:
      channel === "phone"
        ? "A new real verification code was sent to your phone."
        : "A new real verification code was sent to your Gmail."

  };

}


// ============================================================
// LOGIN
// ============================================================

function login_(data) {

  const identity =
    normalizeLower_(
      data.identity
    );

  const password =
    String(
      data.password || ""
    );


  if (
    !identity ||
    !password
  ) {

    return {

      success: false,

      message:
        "Username/email and password are required."

    };

  }


  const found =
    findUserRow_(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Invalid username/email or password."

    };

  }


  const row =
    found.values;


  // ----------------------------------------------------------
  // LOGIN LOCK
  // ----------------------------------------------------------

  const loginLockUntil =
    row[17]
      ? new Date(row[17])
      : null;


  if (
    loginLockUntil &&
    Date.now() <
    loginLockUntil.getTime()
  ) {

    const minutes =
      Math.ceil(
        (
          loginLockUntil.getTime() -
          Date.now()
        ) /
        60000
      );

    return {

      success: false,

      locked: true,

      message:
        "Too many failed login attempts. Try again in " +
        minutes +
        " minute(s)."

    };

  }


  // ----------------------------------------------------------
  // RESET EXPIRED LOCK
  // ----------------------------------------------------------

  if (
    loginLockUntil &&
    Date.now() >=
    loginLockUntil.getTime()
  ) {

    found.sheet
      .getRange(
        found.rowNumber,
        17,
        1,
        2
      )
      .setValues([
        [
          0,
          ""
        ]
      ]);

  }


  // ----------------------------------------------------------
  // PASSWORD CHECK
  // ----------------------------------------------------------

  const storedPassword =
    String(
      row[6] || ""
    );


  if (
    storedPassword !==
    password
  ) {

    let attempts =
      Number(
        row[16] || 0
      );

    attempts++;


    if (
      attempts >=
      MAX_LOGIN_ATTEMPTS
    ) {

      const newLock =
        new Date(
          Date.now() +
          LOGIN_LOCK_MINUTES *
          60000
        );


      found.sheet
        .getRange(
          found.rowNumber,
          17,
          1,
          2
        )
        .setValues([
          [
            attempts,
            newLock
          ]
        ]);


      return {

        success: false,

        locked: true,

        message:
          "Too many failed login attempts. Your account is temporarily locked."

      };

    }


    found.sheet
      .getRange(
        found.rowNumber,
        17
      )
      .setValue(
        attempts
      );


    return {

      success: false,

      message:
        "Invalid username/email or password."

    };

  }


  // ----------------------------------------------------------
  // RESET LOGIN ATTEMPTS
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      17,
      1,
      2
    )
    .setValues([
      [
        0,
        ""
      ]
    ]);


  // ----------------------------------------------------------
  // ACCOUNT VERIFICATION
  // ----------------------------------------------------------

  const verified =
    row[9] === true;

  const status =
    normalize_(
      row[8]
    );

  const role =
    normalize_(
      row[7]
    ) ||
    "Employee";


  if (!verified) {

    return {

      success: false,

      verified: false,

      demo: false,

      message:
        "Your account is not verified yet."

    };

  }


  if (
    status !==
    "Active"
  ) {

    return {

      success: false,

      verified: verified,

      message:
        "Your account is not active."

    };

  }


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  return {

    success: true,

    verified: true,

    demo: false,

    user: {

      uid:
        normalize_(
          row[0]
        ),

      username:
        normalize_(
          row[2]
        ),

      name:
        normalize_(
          row[1]
        ),

      fullName:
        normalize_(
          row[1]
        ),

      gmail:
        normalize_(
          row[4]
        ),

      email:
        normalize_(
          row[4]
        ),

      phone:
        normalizePhone_(
          row[5]
        ),

      role:
        role,

      accountStatus:
        status

    }

  };

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

function forgotPassword_(data) {

  const identity =
    normalize_(
      data.identity
    );


  if (!identity) {

    return {

      success: false,

      message:
        "Email or username is required."

    };

  }


  const found =
    findUserRow_(
      identity
    );


  // ----------------------------------------------------------
  // DO NOT REVEAL WHETHER ACCOUNT EXISTS
  // ----------------------------------------------------------

  if (!found) {

    return {

      success: true,

      message:
        "If the account exists, recovery instructions will be sent."

    };

  }


  const row =
    found.values;


  const email =
    normalize_(
      row[4]
    );


  const fullName =
    normalize_(
      row[1]
    );


  if (!email) {

    return {

      success: false,

      message:
        "No recovery email is registered for this account."

    };

  }


  // ----------------------------------------------------------
  // GENERATE RESET OTP
  // ----------------------------------------------------------

  const resetToken =
    generateResetToken_();

  const resetExpires =
    new Date(
      Date.now() +
      RESET_TOKEN_MINUTES *
      60000
    );


  // Reuse OTP field for password reset code.
  const otp =
    generateOtp_();

  const otpExpires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60000
    );


  // ----------------------------------------------------------
  // SAVE RESET INFORMATION
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      11,
      1,
      11
    )
    .setValues([
      [

        otp,

        otpExpires,

        row[12] ||
          new Date(),

        row[13] ||
          "",

        row[14] || 0,

        row[15] || "",

        row[16] || 0,

        row[17] || "",

        "email",

        resetToken,

        resetExpires

      ]
    ]);


  // ----------------------------------------------------------
  // SEND RESET EMAIL
  // ----------------------------------------------------------

  sendPasswordResetEmail_(
    email,
    fullName,
    otp
  );


  return {

    success: true,

    otpSent: true,

    message:
      "If the account exists, a password reset code has been sent to the registered Gmail."

  };

}


// ============================================================
// PASSWORD RESET EMAIL
// ============================================================

function sendPasswordResetEmail_(
  email,
  fullName,
  otp
) {

  const subject =
    "StockFlow - Password Reset Code";


  const plain =

    "Hello " +
    (
      fullName ||
      "StockFlow User"
    ) +
    ",\n\n" +

    "Your StockFlow password reset code is:\n\n" +

    otp +
    "\n\n" +

    "This code expires in " +
    OTP_MINUTES +
    " minutes.\n\n" +

    "If you did not request a password reset, ignore this message.\n\n" +

    "StockFlow";


  const html =

    "<div style=\"" +
      "font-family:Arial,sans-serif;" +
      "max-width:560px;" +
      "margin:auto;" +
      "padding:20px;" +
    "\">" +

      "<h2 style=\"color:#1769e0\">" +
        "StockFlow" +
      "</h2>" +

      "<p>Hello " +
        escapeHtml_(
          fullName ||
          "StockFlow User"
        ) +
      ",</p>" +

      "<p>Your password reset code is:</p>" +

      "<div style=\"" +
        "font-size:32px;" +
        "font-weight:800;" +
        "letter-spacing:8px;" +
        "padding:18px;" +
        "background:#f1f5f9;" +
        "border-radius:12px;" +
        "text-align:center;" +
        "color:#10233f;" +
      "\">" +

        otp +

      "</div>" +

      "<p>" +
        "This code expires in " +
        "<b>" +
          OTP_MINUTES +
          " minutes" +
        "</b>." +
      "</p>" +

      "<p style=\"" +
        "color:#64748b;" +
        "font-size:13px;" +
      "\">" +

        "If you did not request this password reset, ignore this email." +

      "</p>" +

      "<p>— StockFlow</p>" +

    "</div>";


  MailApp.sendEmail({

    to: email,

    subject: subject,

    body: plain,

    htmlBody: html,

    name: "StockFlow"

  });

}


// ============================================================
// RESET PASSWORD
// ============================================================

function resetPassword_(data) {

  const identity =
    normalize_(
      data.identity
    );

  const otp =
    normalize_(
      data.otp
    );

  const newPassword =
    String(
      data.newPassword || ""
    );


  if (
    !identity ||
    !otp ||
    !newPassword
  ) {

    return {

      success: false,

      message:
        "Password reset information is incomplete."

    };

  }


  if (
    !validPassword_(
      newPassword
    )
  ) {

    return {

      success: false,

      message:
        "New password must contain 8+ characters, uppercase, lowercase, number and symbol."

    };

  }


  const found =
    findUserRow_(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Unable to complete password reset."

    };

  }


  const row =
    found.values;


  const storedOtp =
    normalize_(
      row[10]
    );


  const otpExpires =
    row[11]
      ? new Date(row[11])
      : null;


  if (
    !storedOtp ||
    storedOtp !== otp
  ) {

    return {

      success: false,

      message:
        "Incorrect password reset code."

    };

  }


  if (
    otpExpires &&
    Date.now() >
    otpExpires.getTime()
  ) {

    return {

      success: false,

      message:
        "Password reset code has expired."

    };

  }


  // ----------------------------------------------------------
  // UPDATE PASSWORD
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      7
    )
    .setValue(
      newPassword
    );


  // ----------------------------------------------------------
  // CLEAR RESET DATA
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      11,
      1,
      11
    )
    .setValues([
      [

        "",

        "",

        row[12] ||
          new Date(),

        row[13] ||
          "",

        0,

        "",

        0,

        "",

        row[18] ||
          "email",

        "",

        ""

      ]
    ]);


  return {

    success: true,

    message:
      "Password has been reset successfully. You can now log in."

  };

}


// ============================================================
// CHECK ADMIN REGISTRATION
// ============================================================

function checkAdminRegistration_(data) {

  const adminKey =
    normalize_(
      data.adminKey
    );


  if (!adminKey) {

    return {

      success: false,

      authorized: false,

      message:
        "Admin authorization key is required."

    };

  }


  try {

    const authorized =
      validateAdminKey_(
        adminKey
      );


    return {

      success: true,

      authorized: authorized,

      message:
        authorized
          ? "Admin registration authorized."
          : "Admin registration is not authorized."

    };

  } catch (error) {

    return {

      success: false,

      authorized: false,

      message:
        error.message

    };

  }

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml_(value) {

  return String(
    value
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}
