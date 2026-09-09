// ============================================================
// STOCKFLOW AUTHENTICATION BACKEND
// Google Apps Script + Google Sheets + Firebase
// ============================================================
//
// STOCKFLOW
// Phone Accessories Inventory Management System
//
// FEATURES
// ------------------------------------------------------------
// 1. Employee registration
// 2. Admin-only registration
// 3. Server-generated 6-digit OTP
// 4. Gmail OTP through Google MailApp
// 5. SMS OTP through Twilio
// 6. OTP expires after 10 minutes
// 7. OTP is single-use
// 8. Maximum 4 verification attempts
// 9. Temporary lock after 4 failed attempts
// 10. Independent email OTP cooldown
// 11. Independent phone OTP cooldown
// 12. 120-second cooldown per channel
// 13. Login
// 14. Account status
// 15. Role support
// 16. Forgot password
// 17. prepareOtp endpoint
// 18. generateOtp endpoint
// 19. resendOtp endpoint
// 20. verifyOtp endpoint
// 21. Google Sheets OTP storage
// 22. Firebase OTP storage
// 23. Backend OTP response for school-project UI
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const SHEET_NAME =
  "USER";

const APP_NAME =
  "StockFlow";


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const FIREBASE_DATABASE_URL =
  "https://midtermexamproject-default-rtdb.firebaseio.com/";


// ============================================================
// OTP CONFIGURATION
// ============================================================

const OTP_LENGTH =
  6;

const OTP_EXPIRY_MINUTES =
  10;

const MAX_OTP_ATTEMPTS =
  4;

const OTP_LOCK_MINUTES =
  30;

// Required cooldown:
// 120 seconds = 2 minutes
const RESEND_COOLDOWN_SECONDS =
  120;


// ============================================================
// SHEET HEADERS
// ============================================================
//
// ORIGINAL 19 COLUMNS
//
// 1  UID
// 2  NAME
// 3  USERNAME
// 4  PASSWORD
// 5  AGE
// 6  ACCOUNT_S
// 7  GMAIL
// 8  PHONE NO.
// 9  ROLE
// 10 VERIFIED
// 11 OTP
// 12 OTP EXPIRES
// 13 OTP ATTEMPTS
// 14 OTP LOCK UNTIL
// 15 OTP CHANNEL
// 16 CREATED AT
// 17 VERIFIED AT
// 18 LAST OTP SENT
// 19 LAST LOGIN
//
// NEW COLUMNS
//
// 20 LAST EMAIL OTP SENT
// 21 LAST PHONE OTP SENT
//
// These two additional columns make the email and phone
// cooldowns truly independent on the backend.
//
// ============================================================

const HEADERS = [

  "UID",
  "NAME",
  "USERNAME",
  "PASSWORD",
  "AGE",
  "ACCOUNT_S",
  "GMAIL",
  "PHONE NO.",
  "ROLE",
  "VERIFIED",
  "OTP",
  "OTP EXPIRES",
  "OTP ATTEMPTS",
  "OTP LOCK UNTIL",
  "OTP CHANNEL",
  "CREATED AT",
  "VERIFIED AT",
  "LAST OTP SENT",
  "LAST LOGIN",
  "LAST EMAIL OTP SENT",
  "LAST PHONE OTP SENT"

];


// ============================================================
// JSON RESPONSE
// ============================================================

function response(data) {

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

function getSheet() {

  const spreadsheet =
    SpreadsheetApp.openById(
      SHEET_ID
    );

  let sheet =
    spreadsheet.getSheetByName(
      SHEET_NAME
    );

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        SHEET_NAME
      );

  }

  ensureHeaders(sheet);

  return sheet;

}


// ============================================================
// ENSURE HEADERS
// ============================================================

function ensureHeaders(sheet) {

  const requiredColumns =
    HEADERS.length;

  if (
    sheet.getMaxColumns() <
    requiredColumns
  ) {

    sheet.insertColumnsAfter(

      sheet.getMaxColumns(),

      requiredColumns -
      sheet.getMaxColumns()

    );

  }


  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .getValues()[0];


  let changed =
    false;


  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    if (
      currentHeaders[i] !==
      HEADERS[i]
    ) {

      changed =
        true;

      break;

    }

  }


  if (changed) {

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
// GET ALL ROWS
// ============================================================

function getRows(sheet) {

  const lastRow =
    sheet.getLastRow();

  if (
    lastRow < 2
  ) {

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
// NORMALIZE
// ============================================================

function normalize(value) {

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


// ============================================================
// NORMALIZE EMAIL
// ============================================================

function normalizeEmail(value) {

  return normalize(value)
    .toLowerCase();

}


// ============================================================
// NORMALIZE PHONE
// ============================================================

function normalizePhone(value) {

  let phone =
    normalize(value)
      .replace(
        /[\s\-()]/g,
        ""
      );


  // 09123456789
  if (
    /^09\d{9}$/.test(phone)
  ) {

    return (
      "+63" +
      phone.substring(1)
    );

  }


  // 639123456789
  if (
    /^639\d{9}$/.test(phone)
  ) {

    return "+" + phone;

  }


  // +639123456789
  if (
    /^\+639\d{9}$/.test(phone)
  ) {

    return phone;

  }


  return phone;

}


// ============================================================
// VALIDATE EMAIL
// ============================================================

function validEmail(email) {

  return /^\S+@\S+\.\S+$/.test(
    email
  );

}


// ============================================================
// VALIDATE PHILIPPINE PHONE
// ============================================================

function validPhone(phone) {

  return /^\+639\d{9}$/.test(
    normalizePhone(phone)
  );

}


// ============================================================
// GENERATE UID
// ============================================================

function generateUID() {

  return (
    "sf_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );

}


// ============================================================
// GENERATE SERVER OTP
// ============================================================
//
// IMPORTANT:
//
// OTP generation happens ONLY on Apps Script.
//
// The frontend must NEVER generate the OTP.
//
// ============================================================

function generateOTP() {

  return String(
    Math.floor(
      100000 +
      Math.random() *
      900000
    )
  );

}


// ============================================================
// FIND USER
// ============================================================

function findUser(identity) {

  const sheet =
    getSheet();

  const rows =
    getRows(sheet);

  const target =
    normalize(identity)
      .toLowerCase();


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];


    const uid =
      normalize(
        row[0]
      ).toLowerCase();


    const username =
      normalize(
        row[2]
      ).toLowerCase();


    const gmail =
      normalizeEmail(
        row[6]
      );


    const phone =
      normalizePhone(
        row[7]
      ).toLowerCase();


    if (
      target === uid ||
      target === username ||
      target === gmail ||
      target === phone
    ) {

      return {

        sheet:
          sheet,

        rowNumber:
          i + 2,

        values:
          row

      };

    }

  }


  return null;

}


// ============================================================
// FIND USER BY USERNAME
// ============================================================

function findUserByUsername(
  username
) {

  return findUser(
    username
  );

}


// ============================================================
// GET SCRIPT PROPERTY
// ============================================================

function getProperty(name) {

  return PropertiesService
    .getScriptProperties()
    .getProperty(name);

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(value)

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


// ============================================================
// FIREBASE AUTH TOKEN
// ============================================================
//
// Optional.
//
// If your Firebase Realtime Database rules require an auth
// token, place the token in Script Properties as:
//
// FIREBASE_AUTH_TOKEN
//
// Otherwise the request is sent without auth.
//
// ============================================================

function getFirebaseAuthToken() {

  return (
    getProperty(
      "FIREBASE_AUTH_TOKEN"
    ) ||
    ""
  );

}


// ============================================================
// FIREBASE URL BUILDER
// ============================================================

function firebaseUrl(
  path
) {

  let base =
    FIREBASE_DATABASE_URL;

  if (
    !base.endsWith("/")
  ) {

    base += "/";

  }


  let cleanPath =
    normalize(path)
      .replace(/^\/+/, "");


  let url =
    base +
    cleanPath +
    ".json";


  const token =
    getFirebaseAuthToken();


  if (token) {

    url +=
      "?auth=" +
      encodeURIComponent(
        token
      );

  }


  return url;

}


// ============================================================
// SAVE OTP TO FIREBASE
// ============================================================
//
// The same OTP saved in Google Sheets is saved here.
//
// Firebase structure:
//
// stockflow
//   users
//     UID
//       uid
//       username
//       gmail
//       phone
//       otp
//       otpExpires
//       attempts
//       lockedUntil
//       channel
//       updatedAt
//
// ============================================================

function saveOtpToFirebase(
  found,
  otp,
  expires,
  channel
) {

  const row =
    found.values;


  const uid =
    normalize(
      row[0]
    );


  if (!uid) {

    throw new Error(
      "User UID is missing."
    );

  }


  const payload = {

    uid:
      uid,

    username:
      normalize(
        row[2]
      ),

    gmail:
      normalizeEmail(
        row[6]
      ),

    phone:
      normalizePhone(
        row[7]
      ),

    otp:
      String(otp),

    otpExpires:
      expires.toISOString(),

    attempts:
      0,

    lockedUntil:
      "",

    channel:
      normalize(channel)
        .toLowerCase(),

    updatedAt:
      new Date().toISOString()

  };


  const result =
    UrlFetchApp.fetch(

      firebaseUrl(
        "stockflow/users/" +
        encodeURIComponent(uid)
      ),

      {

        method:
          "put",

        contentType:
          "application/json",

        payload:
          JSON.stringify(
            payload
          ),

        muteHttpExceptions:
          true

      }

    );


  const statusCode =
    result.getResponseCode();


  const responseText =
    result.getContentText();


  if (
    statusCode < 200 ||
    statusCode >= 300
  ) {

    console.error(
      "Firebase OTP save error:",
      responseText
    );

    throw new Error(
      "Firebase OTP storage failed."
    );

  }


  return true;

}


// ============================================================
// UPDATE FIREBASE OTP ATTEMPTS
// ============================================================

function updateFirebaseOtpAttempts(
  found,
  attempts,
  lockedUntil
) {

  const row =
    found.values;


  const uid =
    normalize(
      row[0]
    );


  if (!uid) {

    return false;

  }


  const payload = {

    attempts:
      Number(attempts) || 0,

    lockedUntil:
      lockedUntil
        ? new Date(
            lockedUntil
          ).toISOString()
        : "",

    updatedAt:
      new Date().toISOString()

  };


  try {

    const result =
      UrlFetchApp.fetch(

        firebaseUrl(
          "stockflow/users/" +
          encodeURIComponent(uid)
        ),

        {

          method:
            "patch",

          contentType:
            "application/json",

          payload:
            JSON.stringify(
              payload
            ),

          muteHttpExceptions:
            true

        }

      );


    return (
      result.getResponseCode() >= 200 &&
      result.getResponseCode() < 300
    );

  } catch (error) {

    console.error(
      "Firebase attempt update error:",
      error
    );

    return false;

  }

}


// ============================================================
// CLEAR FIREBASE OTP
// ============================================================

function clearOtpFromFirebase(
  found
) {

  const row =
    found.values;


  const uid =
    normalize(
      row[0]
    );


  if (!uid) {

    return false;

  }


  try {

    const result =
      UrlFetchApp.fetch(

        firebaseUrl(
          "stockflow/users/" +
          encodeURIComponent(uid) +
          "/otp"
        ),

        {

          method:
            "delete",

          muteHttpExceptions:
            true

        }

      );


    return (
      result.getResponseCode() >= 200 &&
      result.getResponseCode() < 300
    );

  } catch (error) {

    console.error(
      "Firebase OTP delete error:",
      error
    );

    return false;

  }

}


// ============================================================
// MARK FIREBASE USER VERIFIED
// ============================================================

function markFirebaseUserVerified(
  found
) {

  const row =
    found.values;


  const uid =
    normalize(
      row[0]
    );


  if (!uid) {

    return false;

  }


  const payload = {

    verified:
      true,

    verifiedAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };


  try {

    const result =
      UrlFetchApp.fetch(

        firebaseUrl(
          "stockflow/users/" +
          encodeURIComponent(uid)
        ),

        {

          method:
            "patch",

          contentType:
            "application/json",

          payload:
            JSON.stringify(
              payload
            ),

          muteHttpExceptions:
            true

        }

      );


    return (
      result.getResponseCode() >= 200 &&
      result.getResponseCode() < 300
    );

  } catch (error) {

    console.error(
      "Firebase verification update error:",
      error
    );

    return false;

  }

}


// ============================================================
// SEND EMAIL OTP
// ============================================================

function sendEmailOTP(
  email,
  fullName,
  otp,
  resend
) {

  if (!email) {

    throw new Error(
      "Gmail address is missing."
    );

  }


  const subject =
    resend
      ? "StockFlow - New verification code"
      : "StockFlow - Your verification code";


  const plainText =

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
    OTP_EXPIRY_MINUTES +
    " minutes.\n\n" +

    "If you did not request this code, please ignore this message.\n\n" +

    "StockFlow Inventory System";


  const htmlBody =

    "<div style=\"" +
      "font-family:Arial,sans-serif;" +
      "max-width:560px;" +
      "margin:auto;" +
      "padding:30px;" +
      "background:#f6f9fc;" +
    "\">" +

      "<div style=\"" +
        "background:white;" +
        "border-radius:16px;" +
        "padding:30px;" +
        "border:1px solid #e2e8f0;" +
      "\">" +

        "<h2 style=\"" +
          "color:#1769e0;" +
          "margin-top:0;" +
        "\">" +

          "StockFlow" +

        "</h2>" +

        "<p>" +

          "Hello " +
          escapeHtml(
            fullName ||
            "StockFlow User"
          ) +
          "," +

        "</p>" +

        "<p>" +

          "Your verification code is:" +

        "</p>" +

        "<div style=\"" +
          "font-size:32px;" +
          "font-weight:800;" +
          "letter-spacing:8px;" +
          "text-align:center;" +
          "padding:20px;" +
          "margin:20px 0;" +
          "background:#f1f5f9;" +
          "border-radius:12px;" +
          "color:#10233f;" +
        "\">" +

          otp +

        "</div>" +

        "<p>" +

          "This code expires in <b>" +
          OTP_EXPIRY_MINUTES +
          " minutes</b>." +

        "</p>" +

        "<p style=\"" +
          "color:#64748b;" +
          "font-size:13px;" +
        "\">" +

          "If you did not request this verification code, you can ignore this email." +

        "</p>" +

        "<p>" +

          "— StockFlow" +

        "</p>" +

      "</div>" +

    "</div>";


  MailApp.sendEmail({

    to:
      email,

    subject:
      subject,

    body:
      plainText,

    htmlBody:
      htmlBody,

    name:
      APP_NAME

  });

}


// ============================================================
// SEND SMS OTP USING TWILIO
// ============================================================

function sendSMSOTP(
  phone,
  fullName,
  otp
) {

  const accountSid =
    getProperty(
      "TWILIO_ACCOUNT_SID"
    );

  const authToken =
    getProperty(
      "TWILIO_AUTH_TOKEN"
    );

  const twilioPhone =
    getProperty(
      "TWILIO_PHONE_NUMBER"
    );


  if (
    !accountSid ||
    !authToken ||
    !twilioPhone
  ) {

    throw new Error(
      "SMS service is not configured. Add Twilio credentials in Script Properties."
    );

  }


  const normalizedPhone =
    normalizePhone(
      phone
    );


  if (
    !validPhone(
      normalizedPhone
    )
  ) {

    throw new Error(
      "Invalid Philippine phone number."
    );

  }


  const url =
    "https://api.twilio.com/2010-04-01/Accounts/" +
    accountSid +
    "/Messages.json";


  const message =

    "StockFlow verification code: " +
    otp +
    ". Expires in " +
    OTP_EXPIRY_MINUTES +
    " minutes. Do not share this code.";


  const payload = {

    To:
      normalizedPhone,

    From:
      twilioPhone,

    Body:
      message

  };


  const auth =
    Utilities.base64Encode(
      accountSid +
      ":" +
      authToken
    );


  const options = {

    method:
      "post",

    payload:
      payload,

    headers: {

      Authorization:
        "Basic " +
        auth

    },

    muteHttpExceptions:
      true

  };


  const result =
    UrlFetchApp.fetch(
      url,
      options
    );


  const statusCode =
    result.getResponseCode();


  const responseText =
    result.getContentText();


  if (
    statusCode < 200 ||
    statusCode >= 300
  ) {

    console.error(
      "Twilio error:",
      responseText
    );

    throw new Error(
      "SMS could not be sent."
    );

  }


  return true;

}


// ============================================================
// SEND OTP THROUGH SELECTED CHANNEL
// ============================================================

function sendOTPByChannel(
  email,
  phone,
  fullName,
  otp,
  channel,
  resend
) {

  const normalizedChannel =
    normalize(channel)
      .toLowerCase();


  let emailSent =
    false;

  let smsSent =
    false;

  let emailError =
    null;

  let smsError =
    null;


  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (
    normalizedChannel ===
    "email"
  ) {

    try {

      sendEmailOTP(

        email,

        fullName,

        otp,

        resend

      );


      emailSent =
        true;

    } catch (error) {

      emailError =
        error &&
        error.message
          ? error.message
          : "Email could not be sent.";

    }

  }


  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (
    normalizedChannel ===
    "phone"
  ) {

    try {

      sendSMSOTP(

        phone,

        fullName,

        otp

      );


      smsSent =
        true;

    } catch (error) {

      smsError =
        error &&
        error.message
          ? error.message
          : "SMS could not be sent.";

    }

  }


  // ----------------------------------------------------------
  // BOTH
  // ----------------------------------------------------------

  if (
    normalizedChannel ===
    "both"
  ) {

    try {

      sendEmailOTP(

        email,

        fullName,

        otp,

        resend

      );


      emailSent =
        true;

    } catch (error) {

      emailError =
        error &&
        error.message
          ? error.message
          : "Email could not be sent.";

    }


    try {

      sendSMSOTP(

        phone,

        fullName,

        otp

      );


      smsSent =
        true;

    } catch (error) {

      smsError =
        error &&
        error.message
          ? error.message
          : "SMS could not be sent.";

    }

  }


  // ----------------------------------------------------------
  // NOTHING SENT
  // ----------------------------------------------------------

  if (
    !emailSent &&
    !smsSent
  ) {

    let message =
      "OTP could not be sent.";


    if (emailError) {

      message +=
        " Email: " +
        emailError;

    }


    if (smsError) {

      message +=
        " SMS: " +
        smsError;

    }


    throw new Error(
      message
    );

  }


  return {

    emailSent:
      emailSent,

    smsSent:
      smsSent,

    emailError:
      emailError,

    smsError:
      smsError,

    channel:
      normalizedChannel

  };

}


// ============================================================
// CALCULATE OTP EXPIRATION
// ============================================================

function createOtpExpiration() {

  return new Date(

    Date.now() +

    OTP_EXPIRY_MINUTES *
    60 *
    1000

  );

}


// ============================================================
// GET OTP LOCK REMAINING
// ============================================================

function getLockRemainingSeconds(
  row
) {

  const lockUntil =
    row[13]
      ? new Date(row[13])
      : null;


  if (
    !lockUntil ||
    isNaN(
      lockUntil.getTime()
    )
  ) {

    return 0;

  }


  const remaining =
    Math.ceil(

      (
        lockUntil.getTime() -
        Date.now()
      ) / 1000

    );


  return Math.max(
    0,
    remaining
  );

}


// ============================================================
// CHECK CHANNEL COOLDOWN
// ============================================================
//
// Email:
//
// Column 20
//
// Phone:
//
// Column 21
//
// ============================================================

function checkChannelCooldown(
  row,
  channel
) {

  const normalizedChannel =
    normalize(channel)
      .toLowerCase();


  let timestamp =
    null;


  if (
    normalizedChannel ===
    "email"
  ) {

    timestamp =
      row[19]
        ? new Date(row[19])
        : null;

  }


  if (
    normalizedChannel ===
    "phone"
  ) {

    timestamp =
      row[20]
        ? new Date(row[20])
        : null;

  }


  if (
    !timestamp ||
    isNaN(
      timestamp.getTime()
    )
  ) {

    return {

      allowed:
        true,

      remainingSeconds:
        0

    };

  }


  const secondsPassed =
    (
      Date.now() -
      timestamp.getTime()
    ) / 1000;


  if (
    secondsPassed >=
    RESEND_COOLDOWN_SECONDS
  ) {

    return {

      allowed:
        true,

      remainingSeconds:
        0

    };

  }


  return {

    allowed:
      false,

    remainingSeconds:
      Math.ceil(

        RESEND_COOLDOWN_SECONDS -
        secondsPassed

      )

  };

}


// ============================================================
// SAVE CHANNEL TIMESTAMP
// ============================================================

function saveChannelTimestamp(
  found,
  channel,
  dateValue
) {

  const normalizedChannel =
    normalize(channel)
      .toLowerCase();


  let column =
    18;


  if (
    normalizedChannel ===
    "email"
  ) {

    column =
      20;

  }


  if (
    normalizedChannel ===
    "phone"
  ) {

    column =
      21;

  }


  found.sheet
    .getRange(
      found.rowNumber,
      column
    )
    .setValue(
      dateValue
    );


  // Keep original LAST OTP SENT populated too.
  found.sheet
    .getRange(
      found.rowNumber,
      18
    )
    .setValue(
      dateValue
    );

}


// ============================================================
// SAVE NEW OTP
// ============================================================
//
// Saves OTP to Google Sheets first.
//
// Firebase is then synchronized using the same OTP.
//
// ============================================================

function saveOtp(
  found,
  otp,
  channel
) {

  const expires =
    createOtpExpiration();


  const sheet =
    found.sheet;


  const rowNumber =
    found.rowNumber;


  // OTP
  sheet
    .getRange(
      rowNumber,
      11
    )
    .setValue(
      otp
    );


  // OTP expiration
  sheet
    .getRange(
      rowNumber,
      12
    )
    .setValue(
      expires
    );


  // Reset attempts
  sheet
    .getRange(
      rowNumber,
      13
    )
    .setValue(
      0
    );


  // Clear lock
  sheet
    .getRange(
      rowNumber,
      14
    )
    .setValue(
      ""
    );


  // Channel
  sheet
    .getRange(
      rowNumber,
      15
    )
    .setValue(
      channel
    );


  // Channel-specific timestamp
  const now =
    new Date();


  saveChannelTimestamp(

    found,

    channel,

    now

  );


  // Firebase must contain the SAME OTP.
  try {

    saveOtpToFirebase(

      found,

      otp,

      expires,

      channel

    );

  } catch (error) {

    // Roll back Sheet OTP if Firebase failed.

    sheet
      .getRange(
        rowNumber,
        11
      )
      .setValue("");


    sheet
      .getRange(
        rowNumber,
        12
      )
      .setValue("");


    sheet
      .getRange(
        rowNumber,
        13
      )
      .setValue(0);


    sheet
      .getRange(
        rowNumber,
        14
      )
      .setValue("");


    sheet
      .getRange(
        rowNumber,
        15
      )
      .setValue("");


    throw error;

  }


  return expires;

}


// ============================================================
// CLEAR SHEET OTP
// ============================================================

function clearSheetOtp(
  found
) {

  found.sheet
    .getRange(
      found.rowNumber,
      11
    )
    .setValue("");


  found.sheet
    .getRange(
      found.rowNumber,
      12
    )
    .setValue("");


  found.sheet
    .getRange(
      found.rowNumber,
      13
    )
    .setValue(0);


  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue("");


  found.sheet
    .getRange(
      found.rowNumber,
      15
    )
    .setValue("");

}


// ============================================================
// RETURN OTP RESPONSE
// ============================================================
//
// IMPORTANT:
//
// This is the exact OTP generated by Apps Script.
//
// otp.js does NOT generate this code.
//
// ============================================================

function otpResponse(
  found,
  otp,
  channel,
  delivery,
  generated
) {

  const row =
    found.values;


  return {

    success:
      true,

    generated:
      generated !== false,

    otp:
      String(otp),

    channel:
      channel,

    uid:
      normalize(
        row[0]
      ),

    username:
      normalize(
        row[2]
      ),

    gmail:
      normalizeEmail(
        row[6]
      ),

    phone:
      normalizePhone(
        row[7]
      ),

    emailSent:
      !!delivery.emailSent,

    smsSent:
      !!delivery.smsSent,

    otpExpiresInMinutes:
      OTP_EXPIRY_MINUTES,

    cooldownSeconds:
      RESEND_COOLDOWN_SECONDS,

    message:
      channel === "email"
        ? "A new verification code was generated for your registered Gmail."
        : channel === "phone"
          ? "A new verification code was generated for your registered phone."
          : "A verification code was generated."

  };

}


// ============================================================
// REGISTER EMPLOYEE
// ============================================================
//
// OTP is NOT generated during registration.
//
// Registration creates the account.
//
// verify.html then calls prepareOtp().
//
// ============================================================

function registerUser(data) {

  const sheet =
    getSheet();


  const name =
    normalize(
      data.name
    );


  const username =
    normalize(
      data.username
    );


  const password =
    String(
      data.password ||
      ""
    );


  const age =
    Number(
      data.age
    );


  const gmail =
    normalizeEmail(
      data.gmail
    );


  const phone =
    normalizePhone(
      data.phone
    );


  if (
    !name ||
    !username ||
    !password ||
    !gmail ||
    !phone ||
    !age
  ) {

    return {

      success:
        false,

      message:
        "All required registration fields must be completed."

    };

  }


  if (
    username.length < 4 ||
    username.length > 20
  ) {

    return {

      success:
        false,

      message:
        "Username must contain 4–20 characters."

    };

  }


  if (
    age < 18 ||
    age > 100
  ) {

    return {

      success:
        false,

      message:
        "Age must be between 18 and 100."

    };

  }


  if (
    !validEmail(
      gmail
    )
  ) {

    return {

      success:
        false,

      message:
        "Please provide a valid Gmail/email address."

    };

  }


  if (
    !validPhone(
      phone
    )
  ) {

    return {

      success:
        false,

      message:
        "Please provide a valid Philippine phone number."

    };

  }


  if (
    findUser(
      username
    )
  ) {

    return {

      success:
        false,

      message:
        "Username already exists."

    };

  }


  if (
    findUser(
      gmail
    )
  ) {

    return {

      success:
        false,

      message:
        "Gmail address already exists."

    };

  }


  if (
    findUser(
      phone
    )
  ) {

    return {

      success:
        false,

      message:
        "Phone number already exists."

    };

  }


  const uid =
    generateUID();


  const now =
    new Date();


  sheet.appendRow([

    uid,

    name,

    username,

    password,

    age,

    "PENDING",

    gmail,

    phone,

    "Employee",

    false,

    "",

    "",

    0,

    "",

    "",

    now,

    "",

    "",

    "",

    "",

    ""

  ]);


  // Create basic Firebase user record.
  try {

    const firebasePayload = {

      uid:
        uid,

      name:
        name,

      username:
        username,

      age:
        age,

      gmail:
        gmail,

      phone:
        phone,

      role:
        "Employee",

      verified:
        false,

      accountStatus:
        "PENDING",

      createdAt:
        now.toISOString(),

      updatedAt:
        now.toISOString()

    };


    const result =
      UrlFetchApp.fetch(

        firebaseUrl(
          "stockflow/users/" +
          encodeURIComponent(uid)
        ),

        {

          method:
            "put",

          contentType:
            "application/json",

          payload:
            JSON.stringify(
              firebasePayload
            ),

          muteHttpExceptions:
            true

        }

      );


    if (
      result.getResponseCode() < 200 ||
      result.getResponseCode() >= 300
    ) {

      throw new Error(
        "Firebase account storage failed."
      );

    }

  } catch (error) {

    // Remove account from Sheet if Firebase account
    // creation failed.

    sheet.deleteRow(
      sheet.getLastRow()
    );


    return {

      success:
        false,

      message:
        "Registration could not be completed because Firebase storage failed."

    };

  }


  return {

    success:
      true,

    uid:
      uid,

    username:
      username,

    role:
      "Employee",

    verified:
      false,

    accountStatus:
      "PENDING",

    otpSent:
      false,

    message:
      "Registration successful. Continue to verification to receive your verification code."

  };

}


// ============================================================
// ADMIN REGISTRATION
// ============================================================

function registerAdmin(data) {

  const suppliedKey =
    String(
      data.adminRegistrationKey ||
      ""
    );


  const configuredKey =
    getProperty(
      "ADMIN_REGISTRATION_KEY"
    );


  if (
    !configuredKey ||
    suppliedKey !==
    configuredKey
  ) {

    return {

      success:
        false,

      message:
        "Admin registration is restricted to authorized administrators."

    };

  }


  const sheet =
    getSheet();


  const name =
    normalize(
      data.name
    );


  const username =
    normalize(
      data.username
    );


  const password =
    String(
      data.password ||
      ""
    );


  const age =
    Number(
      data.age
    );


  const gmail =
    normalizeEmail(
      data.gmail
    );


  const phone =
    normalizePhone(
      data.phone
    );


  if (
    !name ||
    !username ||
    !password ||
    !age ||
    !gmail ||
    !phone
  ) {

    return {

      success:
        false,

      message:
        "All required admin fields must be completed."

    };

  }


  if (
    username.length < 4 ||
    username.length > 20
  ) {

    return {

      success:
        false,

      message:
        "Username must contain 4–20 characters."

    };

  }


  if (
    age < 18 ||
    age > 100
  ) {

    return {

      success:
        false,

      message:
        "Age must be between 18 and 100."

    };

  }


  if (
    !validEmail(
      gmail
    )
  ) {

    return {

      success:
        false,

      message:
        "Invalid Gmail/email address."

    };

  }


  if (
    !validPhone(
      phone
    )
  ) {

    return {

      success:
        false,

      message:
        "Invalid Philippine phone number."

    };

  }


  if (
    findUser(
      username
    )
  ) {

    return {

      success:
        false,

      message:
        "Username already exists."

    };

  }


  if (
    findUser(
      gmail
    )
  ) {

    return {

      success:
        false,

      message:
        "Gmail address already exists."

    };

  }


  if (
    findUser(
      phone
    )
  ) {

    return {

      success:
        false,

      message:
        "Phone number already exists."

    };

  }


  const uid =
    generateUID();


  const now =
    new Date();


  sheet.appendRow([

    uid,

    name,

    username,

    password,

    age,

    "PENDING",

    gmail,

    phone,

    "Admin",

    false,

    "",

    "",

    0,

    "",

    "",

    now,

    "",

    "",

    "",

    "",

    ""

  ]);


  try {

    const firebasePayload = {

      uid:
        uid,

      name:
        name,

      username:
        username,

      age:
        age,

      gmail:
        gmail,

      phone:
        phone,

      role:
        "Admin",

      verified:
        false,

      accountStatus:
        "PENDING",

      createdAt:
        now.toISOString(),

      updatedAt:
        now.toISOString()

    };


    const result =
      UrlFetchApp.fetch(

        firebaseUrl(
          "stockflow/users/" +
          encodeURIComponent(uid)
        ),

        {

          method:
            "put",

          contentType:
            "application/json",

          payload:
            JSON.stringify(
              firebasePayload
            ),

          muteHttpExceptions:
            true

        }

      );


    if (
      result.getResponseCode() < 200 ||
      result.getResponseCode() >= 300
    ) {

      throw new Error(
        "Firebase account storage failed."
      );

    }

  } catch (error) {

    sheet.deleteRow(
      sheet.getLastRow()
    );


    return {

      success:
        false,

      message:
        "Admin registration could not be completed because Firebase storage failed."

    };

  }


  return {

    success:
      true,

    uid:
      uid,

    username:
      username,

    role:
      "Admin",

    verified:
      false,

    accountStatus:
      "PENDING",

    otpSent:
      false,

    message:
      "Admin registration successful. Continue to verification to receive your verification code."

  };

}


// ============================================================
// PREPARE OTP
// ============================================================
//
// Called by verify.html after registration.
//
// Default channel:
// EMAIL
//
// If an active OTP already exists and the selected channel
// is still cooling down, the existing OTP is returned.
//
// Otherwise a new OTP is generated.
//
// ============================================================

function prepareOtp(data) {

  const identity =
    normalize(

      data.identity ||
      data.username ||
      data.gmail ||
      data.email ||
      data.phone

    ).toLowerCase();


  if (!identity) {

    return {

      success:
        false,

      message:
        "Username, email or phone is required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success:
        false,

      message:
        "Account not found."

    };

  }


  const row =
    found.values;


  const verified =
    row[9] === true ||
    String(
      row[9]
    ).toUpperCase() ===
    "TRUE";


  if (verified) {

    return {

      success:
        false,

      verified:
        true,

      message:
        "This account is already verified."

    };

  }


  const requestedChannel =
    normalize(
      data.channel ||
      "email"
    ).toLowerCase();


  const channel =
    requestedChannel ===
    "phone"
      ? "phone"
      : "email";


  // ----------------------------------------------------------
  // CHANNEL COOLDOWN
  // ----------------------------------------------------------

  const cooldown =
    checkChannelCooldown(
      row,
      channel
    );


  // ----------------------------------------------------------
  // EXISTING ACTIVE OTP
  // ----------------------------------------------------------

  const existingOtp =
    normalize(
      row[10]
    );


  const existingExpires =
    row[11]
      ? new Date(row[11])
      : null;


  if (
    !cooldown.allowed &&
    existingOtp.length === OTP_LENGTH &&
    existingExpires &&
    !isNaN(
      existingExpires.getTime()
    ) &&
    Date.now() <
      existingExpires.getTime()
  ) {

    const existingChannel =
      normalize(
        row[14]
      ).toLowerCase();


    return {

      success:
        true,

      generated:
        false,

      otp:
        existingOtp,

      channel:
        existingChannel ||
        channel,

      uid:
        normalize(
          row[0]
        ),

      username:
        normalize(
          row[2]
        ),

      gmail:
        normalizeEmail(
          row[6]
        ),

      phone:
        normalizePhone(
          row[7]
        ),

      emailSent:
        existingChannel ===
        "email",

      smsSent:
        existingChannel ===
        "phone",

      cooldownSeconds:
        cooldown.remainingSeconds,

      otpExpiresInMinutes:
        OTP_EXPIRY_MINUTES,

      message:
        "Your current verification code is ready."

    };

  }


  // ----------------------------------------------------------
  // GENERATE NEW OTP
  // ----------------------------------------------------------

  const otp =
    generateOTP();


  // ----------------------------------------------------------
  // SAVE TO SHEETS + FIREBASE
  // ----------------------------------------------------------

  let expires;

  try {

    expires =
      saveOtp(

        found,

        otp,

        channel

      );

  } catch (error) {

    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Unable to store verification code."

    };

  }


  // ----------------------------------------------------------
  // SEND
  // ----------------------------------------------------------

  let delivery;


  try {

    delivery =
      sendOTPByChannel(

        normalizeEmail(
          row[6]
        ),

        normalizePhone(
          row[7]
        ),

        normalize(
          row[1]
        ),

        otp,

        channel,

        false

      );

  } catch (error) {

    clearSheetOtp(
      found
    );

    clearOtpFromFirebase(
      found
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Unable to send verification code."

    };

  }


  return otpResponse(

    found,

    otp,

    channel,

    delivery,

    true

  );

}


// ============================================================
// GENERATE OTP
// ============================================================
//
// Compatibility endpoint for api.js.
//
// ============================================================

function generateOtp(data) {

  return prepareOtp(
    data
  );

}


// ============================================================
// RESEND OTP
// ============================================================
//
// Email button:
//
// channel = email
//
// Phone button:
//
// channel = phone
//
// Each channel has its own 120-second cooldown.
//
// ============================================================

function resendOTP(data) {

  const identity =
    normalize(

      data.identity ||
      data.username ||
      data.gmail ||
      data.email ||
      data.phone

    ).toLowerCase();


  if (!identity) {

    return {

      success:
        false,

      message:
        "Username, email or phone is required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success:
        false,

      message:
        "Account not found."

    };

  }


  const row =
    found.values;


  const verified =
    row[9] === true ||
    String(
      row[9]
    ).toUpperCase() ===
    "TRUE";


  if (verified) {

    return {

      success:
        false,

      verified:
        true,

      message:
        "This account is already verified."

    };

  }


  // ----------------------------------------------------------
  // CHANNEL
  // ----------------------------------------------------------

  const requestedChannel =
    normalize(
      data.channel ||
      "email"
    ).toLowerCase();


  const channel =
    requestedChannel ===
    "phone"
      ? "phone"
      : "email";


  // ----------------------------------------------------------
  // CHANNEL COOLDOWN
  // ----------------------------------------------------------

  const cooldown =
    checkChannelCooldown(
      row,
      channel
    );


  if (
    !cooldown.allowed
  ) {

    return {

      success:
        false,

      cooldown:
        true,

      channel:
        channel,

      remainingSeconds:
        cooldown.remainingSeconds,

      message:
        "Please wait " +
        cooldown.remainingSeconds +
        " seconds before requesting another " +
        channel +
        " OTP."

    };

  }


  // ----------------------------------------------------------
  // NEW OTP
  // ----------------------------------------------------------

  const newOTP =
    generateOTP();


  let expires;


  try {

    expires =
      saveOtp(

        found,

        newOTP,

        channel

      );

  } catch (error) {

    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Unable to store the new verification code."

    };

  }


  // ----------------------------------------------------------
  // SEND
  // ----------------------------------------------------------

  let delivery;


  try {

    delivery =
      sendOTPByChannel(

        normalizeEmail(
          row[6]
        ),

        normalizePhone(
          row[7]
        ),

        normalize(
          row[1]
        ),

        newOTP,

        channel,

        true

      );

  } catch (error) {

    clearSheetOtp(
      found
    );

    clearOtpFromFirebase(
      found
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Unable to send a new OTP."

    };

  }


  return otpResponse(

    found,

    newOTP,

    channel,

    delivery,

    true

  );

}


// ============================================================
// REQUEST OTP
// ============================================================
//
// Compatibility endpoint used by older auth.js code.
//
// ============================================================

function requestOtp(data) {

  return resendOTP(
    data
  );

}


// ============================================================
// VERIFY OTP
// ============================================================

function verifyOTP(data) {

  const identity =
    normalize(

      data.identity ||
      data.username ||
      data.gmail ||
      data.email ||
      data.phone

    ).toLowerCase();


  const enteredOTP =
    normalize(
      data.otp
    );


  if (
    !identity ||
    !enteredOTP
  ) {

    return {

      success:
        false,

      message:
        "Username/email and OTP are required."

    };

  }


  if (
    !/^\d{6}$/.test(
      enteredOTP
    )
  ) {

    return {

      success:
        false,

      message:
        "OTP must contain exactly 6 digits."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success:
        false,

      message:
        "Account not found."

    };

  }


  const sheet =
    found.sheet;


  const rowNumber =
    found.rowNumber;


  const row =
    found.values;


  // ----------------------------------------------------------
  // CHECK LOCK
  // ----------------------------------------------------------

  const lockRemaining =
    getLockRemainingSeconds(
      row
    );


  if (
    lockRemaining > 0
  ) {

    const minutes =
      Math.ceil(
        lockRemaining / 60
      );


    return {

      success:
        false,

      locked:
        true,

      remainingSeconds:
        lockRemaining,

      message:
        "Too many incorrect OTP attempts. Try again in approximately " +
        minutes +
        " minute(s)."

    };

  }


  // ----------------------------------------------------------
  // CHECK EXPIRATION
  // ----------------------------------------------------------

  const storedOTP =
    normalize(
      row[10]
    );


  const expires =
    row[11]
      ? new Date(
          row[11]
        )
      : null;


  if (
    !storedOTP
  ) {

    return {

      success:
        false,

      expired:
        true,

      message:
        "No active verification code exists. Request a new OTP."

    };

  }


  if (
    !expires ||
    isNaN(
      expires.getTime()
    ) ||
    Date.now() >
      expires.getTime()
  ) {

    return {

      success:
        false,

      expired:
        true,

      message:
        "This verification code has expired. Request a new OTP."

    };

  }


  // ----------------------------------------------------------
  // CHECK OTP
  // ----------------------------------------------------------

  if (
    enteredOTP !==
    storedOTP
  ) {

    let attempts =
      Number(
        row[12]
      ) || 0;


    attempts++;


    if (
      attempts >=
      MAX_OTP_ATTEMPTS
    ) {

      const newLock =
        new Date(

          Date.now() +

          OTP_LOCK_MINUTES *
          60 *
          1000

        );


      sheet
        .getRange(
          rowNumber,
          13
        )
        .setValue(
          attempts
        );


      sheet
        .getRange(
          rowNumber,
          14
        )
        .setValue(
          newLock
        );


      updateFirebaseOtpAttempts(

        found,

        attempts,

        newLock

      );


      return {

        success:
          false,

        locked:
          true,

        attempts:
          attempts,

        remainingAttempts:
          0,

        lockMinutes:
          OTP_LOCK_MINUTES,

        message:
          "Too many incorrect OTP attempts. Your verification is temporarily locked for " +
          OTP_LOCK_MINUTES +
          " minutes."

      };

    }


    sheet
      .getRange(
        rowNumber,
        13
      )
      .setValue(
        attempts
      );


    updateFirebaseOtpAttempts(

      found,

      attempts,

      null

    );


    return {

      success:
        false,

      attempts:
        attempts,

      remainingAttempts:
        MAX_OTP_ATTEMPTS -
        attempts,

      message:
        "Invalid OTP. You have " +
        (
          MAX_OTP_ATTEMPTS -
          attempts
        ) +
        " attempt(s) remaining."

    };

  }


  // ----------------------------------------------------------
  // SUCCESSFUL VERIFICATION
  // ----------------------------------------------------------

  sheet
    .getRange(
      rowNumber,
      6
    )
    .setValue(
      "VERIFIED"
    );


  sheet
    .getRange(
      rowNumber,
      10
    )
    .setValue(
      true
    );


  // Clear OTP
  sheet
    .getRange(
      rowNumber,
      11
    )
    .setValue("");


  // Clear expiration
  sheet
    .getRange(
      rowNumber,
      12
    )
    .setValue("");


  // Reset attempts
  sheet
    .getRange(
      rowNumber,
      13
    )
    .setValue(
      0
    );


  // Clear lock
  sheet
    .getRange(
      rowNumber,
      14
    )
    .setValue("");


  // Verified date
  sheet
    .getRange(
      rowNumber,
      17
    )
    .setValue(
      new Date()
    );


  // Firebase verification
  markFirebaseUserVerified(
    found
  );


  // Remove Firebase OTP
  clearOtpFromFirebase(
    found
  );


  return {

    success:
      true,

    verified:
      true,

    accountStatus:
      "VERIFIED",

    uid:
      normalize(
        row[0]
      ),

    username:
      normalize(
        row[2]
      ),

    role:
      normalize(
        row[8]
      ) ||
      "Employee",

    user: {

      uid:
        normalize(
          row[0]
        ),

      name:
        normalize(
          row[1]
        ),

      username:
        normalize(
          row[2]
        ),

      age:
        row[4],

      accountStatus:
        "VERIFIED",

      gmail:
        normalizeEmail(
          row[6]
        ),

      phone:
        normalizePhone(
          row[7]
        ),

      role:
        normalize(
          row[8]
        ) ||
        "Employee"

    },

    message:
      "Account verified successfully."

  };

}


// ============================================================
// LOGIN
// ============================================================

function loginUser(data) {

  const identity =
    normalize(
      data.identity
    ).toLowerCase();


  const password =
    String(
      data.password ||
      ""
    );


  if (
    !identity ||
    !password
  ) {

    return {

      success:
        false,

      message:
        "Username/email and password are required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success:
        false,

      message:
        "Invalid username/email or password."

    };

  }


  const row =
    found.values;


  const savedPassword =
    String(
      row[3] ||
      ""
    );


  if (
    password !==
    savedPassword
  ) {

    return {

      success:
        false,

      message:
        "Invalid username/email or password."

    };

  }


  const status =
    normalize(
      row[5]
    ).toUpperCase();


  const verified =
    row[9] === true ||
    String(
      row[9]
    ).toUpperCase() ===
    "TRUE";


  // ----------------------------------------------------------
  // ACCOUNT STATUS
  // ----------------------------------------------------------

  if (
    status ===
    "SUSPENDED"
  ) {

    return {

      success:
        false,

      message:
        "This account has been suspended."

    };

  }


  if (
    status ===
    "DISABLED"
  ) {

    return {

      success:
        false,

      message:
        "This account has been disabled."

    };

  }


  if (!verified) {

    return {

      success:
        false,

      verified:
        false,

      uid:
        normalize(
          row[0]
        ),

      username:
        normalize(
          row[2]
        ),

      message:
        "Account is not verified. Please verify your OTP."

    };

  }


  // ----------------------------------------------------------
  // RECORD LOGIN
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      19
    )
    .setValue(
      new Date()
    );


  return {

    success:
      true,

    verified:
      true,

    message:
      "Login successful.",

    user: {

      uid:
        normalize(
          row[0]
        ),

      name:
        normalize(
          row[1]
        ),

      username:
        normalize(
          row[2]
        ),

      age:
        row[4],

      accountStatus:
        normalize(
          row[5]
        ),

      gmail:
        normalizeEmail(
          row[6]
        ),

      phone:
        normalizePhone(
          row[7]
        ),

      role:
        normalize(
          row[8]
        ) ||
        "Employee"

    }

  };

}


// ============================================================
// GET USER
// ============================================================

function getUser(data) {

  const identity =
    normalize(
      data.identity
    ).toLowerCase();


  if (!identity) {

    return {

      success:
        false,

      message:
        "Username, email or phone is required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success:
        false,

      message:
        "User not found."

    };

  }


  const row =
    found.values;


  return {

    success:
      true,

    user: {

      uid:
        normalize(
          row[0]
        ),

      name:
        normalize(
          row[1]
        ),

      username:
        normalize(
          row[2]
        ),

      age:
        row[4],

      accountStatus:
        normalize(
          row[5]
        ),

      gmail:
        normalizeEmail(
          row[6]
        ),

      phone:
        normalizePhone(
          row[7]
        ),

      role:
        normalize(
          row[8]
        ) ||
        "Employee",

      verified:
        row[9] === true ||
        String(
          row[9]
        ).toUpperCase() ===
        "TRUE"

    }

  };

}


// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================

function updateAccountStatus(
  data
) {

  const username =
    normalize(
      data.username
    ).toLowerCase();


  const status =
    normalize(
      data.status
    ).toUpperCase();


  const allowedStatuses = [

    "PENDING",

    "VERIFIED",

    "SUSPENDED",

    "DISABLED"

  ];


  if (
    !allowedStatuses.includes(
      status
    )
  ) {

    return {

      success:
        false,

      message:
        "Invalid account status."

    };

  }


  const found =
    findUserByUsername(
      username
    );


  if (!found) {

    return {

      success:
        false,

      message:
        "Username not found."

    };

  }


  found.sheet
    .getRange(
      found.rowNumber,
      6
    )
    .setValue(
      status
    );


  found.sheet
    .getRange(
      found.rowNumber,
      10
    )
    .setValue(
      status ===
      "VERIFIED"
    );


  return {

    success:
      true,

    message:
      "Account status updated."

  };

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

function forgotPassword(data) {

  const identity =
    normalize(
      data.identity
    ).toLowerCase();


  if (!identity) {

    return {

      success:
        false,

      message:
        "Email or username is required."

    };

  }


  const found =
    findUser(
      identity
    );


  // Do not expose whether account exists.

  if (!found) {

    return {

      success:
        true,

      message:
        "If the account exists, recovery instructions will be sent."

    };

  }


  const row =
    found.values;


  const resetOTP =
    generateOTP();


  const expires =
    createOtpExpiration();


  found.sheet
    .getRange(
      found.rowNumber,
      11
    )
    .setValue(
      resetOTP
    );


  found.sheet
    .getRange(
      found.rowNumber,
      12
    )
    .setValue(
      expires
    );


  found.sheet
    .getRange(
      found.rowNumber,
      13
    )
    .setValue(
      0
    );


  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      15
    )
    .setValue(
      "both"
    );


  const now =
    new Date();


  found.sheet
    .getRange(
      found.rowNumber,
      18
    )
    .setValue(
      now
    );


  // Firebase recovery OTP
  try {

    saveOtpToFirebase(

      found,

      resetOTP,

      expires,

      "both"

    );

  } catch (error) {

    console.error(
      "Firebase recovery OTP error:",
      error
    );

  }


  try {

    sendOTPByChannel(

      normalizeEmail(
        row[6]
      ),

      normalizePhone(
        row[7]
      ),

      normalize(
        row[1]
      ),

      resetOTP,

      "both",

      false

    );

  } catch (error) {

    console.error(
      "Recovery OTP error:",
      error.message
    );

  }


  return {

    success:
      true,

    message:
      "If the account exists, recovery instructions have been sent to the registered Gmail and phone."

  };

}


// ============================================================
// API ENTRY POINT
// ============================================================

function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      return response({

        success:
          false,

        message:
          "No request data received."

      });

    }


    const data =
      JSON.parse(
        e.postData.contents
      );


    const action =
      normalize(
        data.action
      );


    switch (
      action
    ) {

      // ------------------------------------------------------
      // EMPLOYEE REGISTRATION
      // ------------------------------------------------------

      case "register":

        return response(
          registerUser(
            data
          )
        );


      // ------------------------------------------------------
      // ADMIN REGISTRATION
      // ------------------------------------------------------

      case "registerAdmin":

        return response(
          registerAdmin(
            data
          )
        );


      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      case "login":

        return response(
          loginUser(
            data
          )
        );


      // ------------------------------------------------------
      // PREPARE OTP
      // ------------------------------------------------------

      case "prepareOtp":

        return response(
          prepareOtp(
            data
          )
        );


      // ------------------------------------------------------
      // GENERATE OTP
      // ------------------------------------------------------

      case "generateOtp":

        return response(
          generateOtp(
            data
          )
        );


      // ------------------------------------------------------
      // RESEND OTP
      // ------------------------------------------------------

      case "resendOtp":

        return response(
          resendOTP(
            data
          )
        );


      // ------------------------------------------------------
      // LEGACY REQUEST OTP
      // ------------------------------------------------------

      case "requestOtp":

        return response(
          requestOtp(
            data
          )
        );


      // ------------------------------------------------------
      // VERIFY OTP
      // ------------------------------------------------------

      case "verifyOtp":

        return response(
          verifyOTP(
            data
          )
        );


      // ------------------------------------------------------
      // GET USER
      // ------------------------------------------------------

      case "getUser":

        return response(
          getUser(
            data
          )
        );


      // ------------------------------------------------------
      // ACCOUNT STATUS
      // ------------------------------------------------------

      case "updateStatus":

        return response(
          updateAccountStatus(
            data
          )
        );


      // ------------------------------------------------------
      // FORGOT PASSWORD
      // ------------------------------------------------------

      case "forgotPassword":

        return response(
          forgotPassword(
            data
          )
        );


      // ------------------------------------------------------
      // UNKNOWN
      // ------------------------------------------------------

      default:

        return response({

          success:
            false,

          message:
            "Unknown API action: " +
            action

        });

    }

  } catch (error) {

    console.error(
      "StockFlow API Error:",
      error
    );


    return response({

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Server error."

    });

  }

}


// ============================================================
// API TEST
// ============================================================

function doGet() {

  return response({

    success:
      true,

    system:
      "StockFlow Inventory System",

    service:
      "Google Apps Script Authentication API",

    status:
      "ONLINE",

    firebase:
      FIREBASE_DATABASE_URL,

    otpLength:
      OTP_LENGTH,

    otpExpirationMinutes:
      OTP_EXPIRY_MINUTES,

    maxOtpAttempts:
      MAX_OTP_ATTEMPTS,

    otpLockMinutes:
      OTP_LOCK_MINUTES,

    resendCooldownSeconds:
      RESEND_COOLDOWN_SECONDS,

    independentChannelCooldowns:
      true,

    message:
      "StockFlow authentication backend is running."

  });

}
