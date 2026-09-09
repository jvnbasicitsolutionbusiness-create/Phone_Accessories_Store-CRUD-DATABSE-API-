// ============================================================
// STOCKFLOW AUTHENTICATION BACKEND
// Google Apps Script + Google Sheets + Firebase
// ============================================================
//
// STOCKFLOW
// Phone Accessories Inventory Management System
//
// COMPLETE AUTHENTICATION BACKEND
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
// 24. Concurrent-request protection
// 25. Firebase synchronization
// 26. OTP rollback protection
//
// IMPORTANT
// ------------------------------------------------------------
// OTP GENERATION HAPPENS ONLY ON THE SERVER.
//
// The frontend MUST NOT use Math.random() to create OTPs.
//
// The OTP returned by this backend is the actual OTP generated
// by Google Apps Script and stored in Google Sheets/Firebase.
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

// 120 seconds = 2 minutes
const RESEND_COOLDOWN_SECONDS =
  120;


// ============================================================
// SHEET HEADERS
// ============================================================
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
// 20 LAST EMAIL OTP SENT
// 21 LAST PHONE OTP SENT
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
// COLUMN CONSTANTS
// ============================================================

const COL = {

  UID: 1,
  NAME: 2,
  USERNAME: 3,
  PASSWORD: 4,
  AGE: 5,
  ACCOUNT_STATUS: 6,
  GMAIL: 7,
  PHONE: 8,
  ROLE: 9,
  VERIFIED: 10,
  OTP: 11,
  OTP_EXPIRES: 12,
  OTP_ATTEMPTS: 13,
  OTP_LOCK_UNTIL: 14,
  OTP_CHANNEL: 15,
  CREATED_AT: 16,
  VERIFIED_AT: 17,
  LAST_OTP_SENT: 18,
  LAST_LOGIN: 19,
  LAST_EMAIL_OTP_SENT: 20,
  LAST_PHONE_OTP_SENT: 21

};


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
      String(
        currentHeaders[i] || ""
      ).trim() !==
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
// VALIDATE GMAIL
// ============================================================

function validGmail(email) {

  return (
    validEmail(email) &&
    /@gmail\.com$/i.test(email)
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
//
// UID generation is separate from OTP generation.
//
// ============================================================

function generateUID() {

  return (
    "sf_" +
    Utilities.getUuid()
      .replace(
        /-/g,
        ""
      )
  );

}


// ============================================================
// GENERATE SERVER OTP
// ============================================================
//
// IMPORTANT:
//
// This is the ONLY OTP generator.
//
// Frontend must NEVER generate an OTP.
//
// ============================================================

function generateOTP() {

  const minimum =
    100000;

  const maximum =
    999999;


  return String(
    Math.floor(
      minimum +
      Math.random() *
      (
        maximum -
        minimum +
        1
      )
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


  if (!target) {

    return null;

  }


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];


    const uid =
      normalize(
        row[COL.UID - 1]
      ).toLowerCase();


    const username =
      normalize(
        row[COL.USERNAME - 1]
      ).toLowerCase();


    const gmail =
      normalizeEmail(
        row[COL.GMAIL - 1]
      );


    const phone =
      normalizePhone(
        row[COL.PHONE - 1]
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
// BOOLEAN HELPER
// ============================================================

function isTrue(value) {

  if (
    value === true
  ) {

    return true;

  }


  return (
    normalize(value)
      .toUpperCase() ===
    "TRUE"
  );

}


// ============================================================
// DATE HELPER
// ============================================================

function validDate(value) {

  if (!value) {

    return null;

  }


  const date =
    value instanceof Date
      ? value
      : new Date(value);


  if (
    isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}


// ============================================================
// FIREBASE AUTH TOKEN
// ============================================================
//
// Optional Script Property:
//
// FIREBASE_AUTH_TOKEN
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


  const cleanPath =
    normalize(path)
      .replace(
        /^\/+/,
        ""
      );


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
// FIREBASE REQUEST
// ============================================================

function firebaseRequest(
  path,
  method,
  payload
) {

  const options = {

    method:
      method || "get",

    muteHttpExceptions:
      true

  };


  if (
    payload !== undefined &&
    payload !== null
  ) {

    options.contentType =
      "application/json";

    options.payload =
      JSON.stringify(
        payload
      );

  }


  const result =
    UrlFetchApp.fetch(

      firebaseUrl(
        path
      ),

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

    throw new Error(
      "Firebase request failed. HTTP " +
      statusCode +
      "."
    );

  }


  return {

    statusCode:
      statusCode,

    text:
      responseText

  };

}


// ============================================================
// SAVE FIREBASE USER
// ============================================================

function saveFirebaseUser(
  found,
  verifiedOverride
) {

  const row =
    found.values;


  const uid =
    normalize(
      row[COL.UID - 1]
    );


  if (!uid) {

    throw new Error(
      "User UID is missing."
    );

  }


  const payload = {

    uid:
      uid,

    name:
      normalize(
        row[COL.NAME - 1]
      ),

    username:
      normalize(
        row[COL.USERNAME - 1]
      ),

    age:
      row[COL.AGE - 1],

    gmail:
      normalizeEmail(
        row[COL.GMAIL - 1]
      ),

    phone:
      normalizePhone(
        row[COL.PHONE - 1]
      ),

    role:
      normalize(
        row[COL.ROLE - 1]
      ) ||
      "Employee",

    verified:
      verifiedOverride !== undefined
        ? Boolean(
            verifiedOverride
          )
        : isTrue(
            row[COL.VERIFIED - 1]
          ),

    accountStatus:
      normalize(
        row[COL.ACCOUNT_STATUS - 1]
      ).toUpperCase(),

    createdAt:
      validDate(
        row[COL.CREATED_AT - 1]
      )
        ? validDate(
            row[COL.CREATED_AT - 1]
          ).toISOString()
        : new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  };


  firebaseRequest(

    "stockflow/users/" +
    encodeURIComponent(
      uid
    ),

    "put",

    payload

  );


  return true;

}


// ============================================================
// SAVE OTP TO FIREBASE
// ============================================================
//
// The exact same OTP stored in Google Sheets is stored here.
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
      row[COL.UID - 1]
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
        row[COL.USERNAME - 1]
      ),

    gmail:
      normalizeEmail(
        row[COL.GMAIL - 1]
      ),

    phone:
      normalizePhone(
        row[COL.PHONE - 1]
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


  firebaseRequest(

    "stockflow/users/" +
    encodeURIComponent(
      uid
    ),

    "patch",

    payload

  );


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

  const uid =
    normalize(
      found.values[
        COL.UID - 1
      ]
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

    firebaseRequest(

      "stockflow/users/" +
      encodeURIComponent(
        uid
      ),

      "patch",

      payload

    );


    return true;

  } catch (error) {

    console.error(
      "Firebase OTP attempt update error:",
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

  const uid =
    normalize(
      found.values[
        COL.UID - 1
      ]
    );


  if (!uid) {

    return false;

  }


  try {

    firebaseRequest(

      "stockflow/users/" +
      encodeURIComponent(
        uid
      ) +
      "/otp",

      "delete"

    );


    return true;

  } catch (error) {

    console.error(
      "Firebase OTP delete error:",
      error
    );

    return false;

  }

}


// ============================================================
// CLEAR FIREBASE OTP FIELDS
// ============================================================
//
// Removes OTP-related data while preserving the user record.
//
// ============================================================

function clearFirebaseOtpFields(
  found
) {

  const uid =
    normalize(
      found.values[
        COL.UID - 1
      ]
    );


  if (!uid) {

    return false;

  }


  try {

    firebaseRequest(

      "stockflow/users/" +
      encodeURIComponent(
        uid
      ),

      "patch",

      {

        otp:
          null,

        otpExpires:
          null,

        attempts:
          0,

        lockedUntil:
          "",

        channel:
          "",

        updatedAt:
          new Date().toISOString()

      }

    );


    return true;

  } catch (error) {

    console.error(
      "Firebase OTP cleanup error:",
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

  const uid =
    normalize(
      found.values[
        COL.UID - 1
      ]
    );


  if (!uid) {

    return false;

  }


  try {

    firebaseRequest(

      "stockflow/users/" +
      encodeURIComponent(
        uid
      ),

      "patch",

      {

        verified:
          true,

        accountStatus:
          "VERIFIED",

        verifiedAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString()

      }

    );


    return true;

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


  if (!validEmail(email)) {

    throw new Error(
      "Invalid email address."
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

          escapeHtml(
            otp
          ) +

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


  return true;

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
    encodeURIComponent(
      accountSid
    ) +
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


  if (
    normalizedChannel !==
    "email" &&
    normalizedChannel !==
    "phone" &&
    normalizedChannel !==
    "both"
  ) {

    throw new Error(
      "Invalid OTP channel."
    );

  }


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
    "email" ||
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

  }


  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (
    normalizedChannel ===
    "phone" ||
    normalizedChannel ===
    "both"
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
  // NOTHING SENT
  // ----------------------------------------------------------

  if (
    !emailSent &&
    !smsSent
  ) {

    let message =
      "OTP could not be delivered.";


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
    validDate(
      row[COL.OTP_LOCK_UNTIL - 1]
    );


  if (!lockUntil) {

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
      validDate(
        row[
          COL.LAST_EMAIL_OTP_SENT - 1
        ]
      );

  }


  if (
    normalizedChannel ===
    "phone"
  ) {

    timestamp =
      validDate(
        row[
          COL.LAST_PHONE_OTP_SENT - 1
        ]
      );

  }


  if (!timestamp) {

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
    COL.LAST_OTP_SENT;


  if (
    normalizedChannel ===
    "email"
  ) {

    column =
      COL.LAST_EMAIL_OTP_SENT;

  }


  if (
    normalizedChannel ===
    "phone"
  ) {

    column =
      COL.LAST_PHONE_OTP_SENT;

  }


  found.sheet
    .getRange(
      found.rowNumber,
      column
    )
    .setValue(
      dateValue
    );


  // Keep original LAST OTP SENT populated.
  found.sheet
    .getRange(
      found.rowNumber,
      COL.LAST_OTP_SENT
    )
    .setValue(
      dateValue
    );

}


// ============================================================
// SAVE NEW OTP
// ============================================================
//
// Google Sheets and Firebase must contain the SAME OTP.
//
// If Firebase storage fails, the Sheet OTP is rolled back.
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


  const oldOtp =
    sheet.getRange(
      rowNumber,
      COL.OTP
    ).getValue();


  const oldExpires =
    sheet.getRange(
      rowNumber,
      COL.OTP_EXPIRES
    ).getValue();


  const oldAttempts =
    sheet.getRange(
      rowNumber,
      COL.OTP_ATTEMPTS
    ).getValue();


  const oldLock =
    sheet.getRange(
      rowNumber,
      COL.OTP_LOCK_UNTIL
    ).getValue();


  const oldChannel =
    sheet.getRange(
      rowNumber,
      COL.OTP_CHANNEL
    ).getValue();


  const oldLastOtpSent =
    sheet.getRange(
      rowNumber,
      COL.LAST_OTP_SENT
    ).getValue();


  const oldEmailSent =
    sheet.getRange(
      rowNumber,
      COL.LAST_EMAIL_OTP_SENT
    ).getValue();


  const oldPhoneSent =
    sheet.getRange(
      rowNumber,
      COL.LAST_PHONE_OTP_SENT
    ).getValue();


  try {

    // OTP
    sheet
      .getRange(
        rowNumber,
        COL.OTP
      )
      .setValue(
        otp
      );


    // Expiration
    sheet
      .getRange(
        rowNumber,
        COL.OTP_EXPIRES
      )
      .setValue(
        expires
      );


    // Attempts
    sheet
      .getRange(
        rowNumber,
        COL.OTP_ATTEMPTS
      )
      .setValue(
        0
      );


    // Lock
    sheet
      .getRange(
        rowNumber,
        COL.OTP_LOCK_UNTIL
      )
      .setValue(
        ""
      );


    // Channel
    sheet
      .getRange(
        rowNumber,
        COL.OTP_CHANNEL
      )
      .setValue(
        channel
      );


    // Channel timestamp
    saveChannelTimestamp(

      found,

      channel,

      new Date()

    );


    // Firebase synchronization
    saveOtpToFirebase(

      found,

      otp,

      expires,

      channel

    );


    return expires;

  } catch (error) {

    // --------------------------------------------------------
    // ROLLBACK SHEET
    // --------------------------------------------------------

    sheet
      .getRange(
        rowNumber,
        COL.OTP
      )
      .setValue(
        oldOtp
      );


    sheet
      .getRange(
        rowNumber,
        COL.OTP_EXPIRES
      )
      .setValue(
        oldExpires
      );


    sheet
      .getRange(
        rowNumber,
        COL.OTP_ATTEMPTS
      )
      .setValue(
        oldAttempts
      );


    sheet
      .getRange(
        rowNumber,
        COL.OTP_LOCK_UNTIL
      )
      .setValue(
        oldLock
      );


    sheet
      .getRange(
        rowNumber,
        COL.OTP_CHANNEL
      )
      .setValue(
        oldChannel
      );


    sheet
      .getRange(
        rowNumber,
        COL.LAST_OTP_SENT
      )
      .setValue(
        oldLastOtpSent
      );


    sheet
      .getRange(
        rowNumber,
        COL.LAST_EMAIL_OTP_SENT
      )
      .setValue(
        oldEmailSent
      );


    sheet
      .getRange(
        rowNumber,
        COL.LAST_PHONE_OTP_SENT
      )
      .setValue(
        oldPhoneSent
      );


    throw error;

  }

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
      COL.OTP
    )
    .setValue("");


  found.sheet
    .getRange(
      found.rowNumber,
      COL.OTP_EXPIRES
    )
    .setValue("");


  found.sheet
    .getRange(
      found.rowNumber,
      COL.OTP_ATTEMPTS
    )
    .setValue(0);


  found.sheet
    .getRange(
      found.rowNumber,
      COL.OTP_LOCK_UNTIL
    )
    .setValue("");


  found.sheet
    .getRange(
      found.rowNumber,
      COL.OTP_CHANNEL
    )
    .setValue("");

}


// ============================================================
// CLEAR OTP COMPLETELY
// ============================================================

function clearOtpCompletely(
  found
) {

  clearSheetOtp(
    found
  );


  clearFirebaseOtpFields(
    found
  );

}


// ============================================================
// OTP RESPONSE
// ============================================================
//
// IMPORTANT:
//
// otp is the REAL server-generated OTP.
//
// This is returned because the school-project UI requires
// automatic population of the six OTP boxes.
//
// Production systems should normally deliver the OTP through
// email/SMS and NOT expose it in the browser response.
//
// ============================================================

function otpResponse(
  found,
  otp,
  channel,
  delivery,
  generated,
  message
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
        row[
          COL.UID - 1
        ]
      ),

    username:
      normalize(
        row[
          COL.USERNAME - 1
        ]
      ),

    gmail:
      normalizeEmail(
        row[
          COL.GMAIL - 1
        ]
      ),

    phone:
      normalizePhone(
        row[
          COL.PHONE - 1
        ]
      ),

    emailSent:
      !!(
        delivery &&
        delivery.emailSent
      ),

    smsSent:
      !!(
        delivery &&
        delivery.smsSent
      ),

    otpExpiresInMinutes:
      OTP_EXPIRY_MINUTES,

    cooldownSeconds:
      RESEND_COOLDOWN_SECONDS,

    message:
      message ||
      (
        channel === "email"
          ? "A new verification code was generated for your registered Gmail."
          : channel === "phone"
            ? "A new verification code was generated for your registered phone."
            : "A verification code was generated."
      )

  };

}


// ============================================================
// REGISTRATION VALIDATION
// ============================================================

function validateRegistrationData(
  data
) {

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
      data.gmail ||
      data.email
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

      valid:
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

      valid:
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

      valid:
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

      valid:
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

      valid:
        false,

      message:
        "Please provide a valid Philippine phone number."

    };

  }


  return {

    valid:
      true,

    name:
      name,

    username:
      username,

    password:
      password,

    age:
      age,

    gmail:
      gmail,

    phone:
      phone

  };

}


// ============================================================
// CHECK DUPLICATE ACCOUNT
// ============================================================

function checkDuplicateAccount(
  username,
  gmail,
  phone
) {

  if (
    findUser(
      username
    )
  ) {

    return {

      duplicate:
        true,

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

      duplicate:
        true,

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

      duplicate:
        true,

      message:
        "Phone number already exists."

    };

  }


  return {

    duplicate:
      false

  };

}


// ============================================================
// CREATE FIREBASE ACCOUNT
// ============================================================

function createFirebaseAccount(
  found
) {

  try {

    saveFirebaseUser(
      found,
      false
    );


    return {

      success:
        true

    };

  } catch (error) {

    console.error(
      "Firebase account creation error:",
      error
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Firebase account storage failed."

    };

  }

}


// ============================================================
// REGISTER EMPLOYEE
// ============================================================
//
// Registration DOES NOT generate OTP.
//
// After successful registration, verify.html calls prepareOtp.
//
// ============================================================

function registerUser(
  data
) {

  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      30000
    );


    const validation =
      validateRegistrationData(
        data
      );


    if (
      !validation.valid
    ) {

      return {

        success:
          false,

        message:
          validation.message

      };

    }


    const duplicate =
      checkDuplicateAccount(

        validation.username,

        validation.gmail,

        validation.phone

      );


    if (
      duplicate.duplicate
    ) {

      return {

        success:
          false,

        message:
          duplicate.message

      };

    }


    const sheet =
      getSheet();


    const uid =
      generateUID();


    const now =
      new Date();


    const rowNumber =
      sheet.getLastRow() +
      1;


    sheet
      .getRange(
        rowNumber,
        1,
        1,
        HEADERS.length
      )
      .setValues([[

        uid,

        validation.name,

        validation.username,

        validation.password,

        validation.age,

        "PENDING",

        validation.gmail,

        validation.phone,

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

      ]]);


    const found = {

      sheet:
        sheet,

      rowNumber:
        rowNumber,

      values:
        sheet
          .getRange(
            rowNumber,
            1,
            1,
            HEADERS.length
          )
          .getValues()[0]

    };


    const firebaseResult =
      createFirebaseAccount(
        found
      );


    if (
      !firebaseResult.success
    ) {

      sheet.deleteRow(
        rowNumber
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
        validation.username,

      role:
        "Employee",

      verified:
        false,

      accountStatus:
        "PENDING",

      otpSent:
        false,

      redirect:
        "verify.html",

      message:
        "Registration successful. Continue to verification to receive your verification code."

    };

  } catch (error) {

    console.error(
      "Employee registration error:",
      error
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Registration failed."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (error) {

      // Nothing required.

    }

  }

}


// ============================================================
// ADMIN REGISTRATION
// ============================================================

function registerAdmin(
  data
) {

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


  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      30000
    );


    const validation =
      validateRegistrationData(
        data
      );


    if (
      !validation.valid
    ) {

      return {

        success:
          false,

        message:
          validation.message

      };

    }


    const duplicate =
      checkDuplicateAccount(

        validation.username,

        validation.gmail,

        validation.phone

      );


    if (
      duplicate.duplicate
    ) {

      return {

        success:
          false,

        message:
          duplicate.message

      };

    }


    const sheet =
      getSheet();


    const uid =
      generateUID();


    const now =
      new Date();


    const rowNumber =
      sheet.getLastRow() +
      1;


    sheet
      .getRange(
        rowNumber,
        1,
        1,
        HEADERS.length
      )
      .setValues([[

        uid,

        validation.name,

        validation.username,

        validation.password,

        validation.age,

        "PENDING",

        validation.gmail,

        validation.phone,

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

      ]]);


    const found = {

      sheet:
        sheet,

      rowNumber:
        rowNumber,

      values:
        sheet
          .getRange(
            rowNumber,
            1,
            1,
            HEADERS.length
          )
          .getValues()[0]

    };


    const firebaseResult =
      createFirebaseAccount(
        found
      );


    if (
      !firebaseResult.success
    ) {

      sheet.deleteRow(
        rowNumber
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
        validation.username,

      role:
        "Admin",

      verified:
        false,

      accountStatus:
        "PENDING",

      otpSent:
        false,

      redirect:
        "verify.html",

      message:
        "Admin registration successful. Continue to verification to receive your verification code."

    };

  } catch (error) {

    console.error(
      "Admin registration error:",
      error
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Admin registration failed."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (error) {

      // Nothing required.

    }

  }

}


// ============================================================
// RESOLVE OTP IDENTITY
// ============================================================

function resolveOtpIdentity(
  data
) {

  return normalize(

    data.identity ||

    data.username ||

    data.gmail ||

    data.email ||

    data.phone

  ).toLowerCase();

}


// ============================================================
// RESOLVE OTP CHANNEL
// ============================================================

function resolveOtpChannel(
  data
) {

  const requested =
    normalize(
      data.channel ||
      "email"
    ).toLowerCase();


  return (
    requested ===
    "phone"
  )
    ? "phone"
    : "email";

}


// ============================================================
// PREPARE OTP
// ============================================================
//
// Called by verify.html.
//
// Default channel = email.
//
// If an active OTP exists, it may be reused ONLY when the
// existing OTP belongs to the requested channel.
//
// A different channel always gets a new server-generated OTP
// once that channel's cooldown allows it.
//
// ============================================================

function prepareOtp(
  data
) {

  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      30000
    );


    const identity =
      resolveOtpIdentity(
        data
      );


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


    if (
      isTrue(
        row[
          COL.VERIFIED - 1
        ]
      )
    ) {

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
      resolveOtpChannel(
        data
      );


    // --------------------------------------------------------
    // CHECK ACCOUNT LOCK
    // --------------------------------------------------------

    const lockRemaining =
      getLockRemainingSeconds(
        row
      );


    if (
      lockRemaining > 0
    ) {

      return {

        success:
          false,

        locked:
          true,

        remainingSeconds:
          lockRemaining,

        message:
          "Verification is temporarily locked. Please try again later."

      };

    }


    // --------------------------------------------------------
    // CHECK CHANNEL COOLDOWN
    // --------------------------------------------------------

    const cooldown =
      checkChannelCooldown(

        row,

        requestedChannel

      );


    // --------------------------------------------------------
    // EXISTING OTP
    // --------------------------------------------------------

    const existingOtp =
      normalize(
        row[
          COL.OTP - 1
        ]
      );


    const existingExpires =
      validDate(
        row[
          COL.OTP_EXPIRES - 1
        ]
      );


    const existingChannel =
      normalize(
        row[
          COL.OTP_CHANNEL - 1
        ]
      ).toLowerCase();


    const existingOtpActive =

      existingOtp.length ===
      OTP_LENGTH &&

      /^\d{6}$/.test(
        existingOtp
      ) &&

      existingExpires &&

      Date.now() <
      existingExpires.getTime();


    // --------------------------------------------------------
    // REUSE ONLY SAME-CHANNEL ACTIVE OTP
    // --------------------------------------------------------

    if (
      existingOtpActive &&
      existingChannel ===
      requestedChannel &&
      !cooldown.allowed
    ) {

      return {

        success:
          true,

        generated:
          false,

        otp:
          existingOtp,

        channel:
          existingChannel,

        uid:
          normalize(
            row[
              COL.UID - 1
            ]
          ),

        username:
          normalize(
            row[
              COL.USERNAME - 1
            ]
          ),

        gmail:
          normalizeEmail(
            row[
              COL.GMAIL - 1
            ]
          ),

        phone:
          normalizePhone(
            row[
              COL.PHONE - 1
            ]
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


    // --------------------------------------------------------
    // IF CHANNEL IS COOLING DOWN AND WE CANNOT REUSE IT
    // --------------------------------------------------------

    if (
      !cooldown.allowed
    ) {

      return {

        success:
          false,

        cooldown:
          true,

        channel:
          requestedChannel,

        remainingSeconds:
          cooldown.remainingSeconds,

        message:
          "Please wait " +
          cooldown.remainingSeconds +
          " seconds before requesting another " +
          requestedChannel +
          " OTP."

      };

    }


    // --------------------------------------------------------
    // GENERATE NEW SERVER OTP
    // --------------------------------------------------------

    const otp =
      generateOTP();


    let expires;


    try {

      expires =
        saveOtp(

          found,

          otp,

          requestedChannel

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


    // --------------------------------------------------------
    // DELIVERY
    // --------------------------------------------------------

    let delivery;


    try {

      delivery =
        sendOTPByChannel(

          normalizeEmail(
            row[
              COL.GMAIL - 1
            ]
          ),

          normalizePhone(
            row[
              COL.PHONE - 1
            ]
          ),

          normalize(
            row[
              COL.NAME - 1
            ]
          ),

          otp,

          requestedChannel,

          false

        );

    } catch (error) {

      clearOtpCompletely(
        found
      );


      return {

        success:
          false,

        message:
          error &&
          error.message
            ? error.message
            : "Unable to deliver verification code."

      };

    }


    return otpResponse(

      found,

      otp,

      requestedChannel,

      delivery,

      true,

      requestedChannel ===
      "email"

        ? "A new verification code was generated for your registered Gmail."

        : "A new verification code was generated for your registered phone."

    );

  } catch (error) {

    console.error(
      "prepareOtp error:",
      error
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Unable to prepare verification code."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (error) {

      // Nothing required.

    }

  }

}


// ============================================================
// GENERATE OTP
// ============================================================
//
// Compatibility endpoint.
//
// ============================================================

function generateOtp(
  data
) {

  return prepareOtp(
    data
  );

}


// ============================================================
// RESEND OTP
// ============================================================
//
// channel=email
//
// OR
//
// channel=phone
//
// Each channel has its own independent 120-second cooldown.
//
// ============================================================

function resendOTP(
  data
) {

  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      30000
    );


    const identity =
      resolveOtpIdentity(
        data
      );


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


    if (
      isTrue(
        row[
          COL.VERIFIED - 1
        ]
      )
    ) {

      return {

        success:
          false,

        verified:
          true,

        message:
          "This account is already verified."

      };

    }


    // --------------------------------------------------------
    // CHECK LOCK
    // --------------------------------------------------------

    const lockRemaining =
      getLockRemainingSeconds(
        row
      );


    if (
      lockRemaining > 0
    ) {

      return {

        success:
          false,

        locked:
          true,

        remainingSeconds:
          lockRemaining,

        message:
          "Verification is temporarily locked. Please try again later."

      };

    }


    // --------------------------------------------------------
    // CHANNEL
    // --------------------------------------------------------

    const channel =
      resolveOtpChannel(
        data
      );


    // --------------------------------------------------------
    // COOLDOWN
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // GENERATE NEW SERVER OTP
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // SEND
    // --------------------------------------------------------

    let delivery;


    try {

      delivery =
        sendOTPByChannel(

          normalizeEmail(
            row[
              COL.GMAIL - 1
            ]
          ),

          normalizePhone(
            row[
              COL.PHONE - 1
            ]
          ),

          normalize(
            row[
              COL.NAME - 1
            ]
          ),

          newOTP,

          channel,

          true

        );

    } catch (error) {

      clearOtpCompletely(
        found
      );


      return {

        success:
          false,

        message:
          error &&
          error.message
            ? error.message
            : "Unable to deliver a new OTP."

      };

    }


    return otpResponse(

      found,

      newOTP,

      channel,

      delivery,

      true,

      channel ===
      "email"

        ? "A new verification code was generated for your registered Gmail."

        : "A new verification code was generated for your registered phone."

    );

  } catch (error) {

    console.error(
      "resendOTP error:",
      error
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "Unable to resend verification code."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (error) {

      // Nothing required.

    }

  }

}


// ============================================================
// REQUEST OTP
// ============================================================
//
// Compatibility endpoint for older auth.js.
//
// ============================================================

function requestOtp(
  data
) {

  return resendOTP(
    data
  );

}


// ============================================================
// VERIFY OTP
// ============================================================

function verifyOTP(
  data
) {

  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      30000
    );


    const identity =
      resolveOtpIdentity(
        data
      );


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


    // --------------------------------------------------------
    // RELOAD ROW AFTER LOCK
    // --------------------------------------------------------

    const row =
      sheet
        .getRange(
          rowNumber,
          1,
          1,
          HEADERS.length
        )
        .getValues()[0];


    // --------------------------------------------------------
    // ALREADY VERIFIED
    // --------------------------------------------------------

    if (
      isTrue(
        row[
          COL.VERIFIED - 1
        ]
      )
    ) {

      return {

        success:
          true,

        verified:
          true,

        uid:
          normalize(
            row[
              COL.UID - 1
            ]
          ),

        username:
          normalize(
            row[
              COL.USERNAME - 1
            ]
          ),

        role:
          normalize(
            row[
              COL.ROLE - 1
            ]
          ) ||
          "Employee",

        message:
          "Account is already verified."

      };

    }


    // --------------------------------------------------------
    // CHECK LOCK
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // CHECK EXPIRATION
    // --------------------------------------------------------

    const storedOTP =
      normalize(
        row[
          COL.OTP - 1
        ]
      );


    const expires =
      validDate(
        row[
          COL.OTP_EXPIRES - 1
        ]
      );


    if (!storedOTP) {

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


    // --------------------------------------------------------
    // CHECK OTP
    // --------------------------------------------------------

    if (
      enteredOTP !==
      storedOTP
    ) {

      let attempts =
        Number(
          row[
            COL.OTP_ATTEMPTS - 1
          ]
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
            COL.OTP_ATTEMPTS
          )
          .setValue(
            attempts
          );


        sheet
          .getRange(
            rowNumber,
            COL.OTP_LOCK_UNTIL
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
          COL.OTP_ATTEMPTS
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


    // --------------------------------------------------------
    // SUCCESSFUL VERIFICATION
    // --------------------------------------------------------

    const verifiedAt =
      new Date();


    sheet
      .getRange(
        rowNumber,
        COL.ACCOUNT_STATUS
      )
      .setValue(
        "VERIFIED"
      );


    sheet
      .getRange(
        rowNumber,
        COL.VERIFIED
      )
      .setValue(
        true
      );


    // Clear OTP
    sheet
      .getRange(
        rowNumber,
        COL.OTP
      )
      .setValue(
        ""
      );


    // Clear expiration
    sheet
      .getRange(
        rowNumber,
        COL.OTP_EXPIRES
      )
      .setValue(
        ""
      );


    // Reset attempts
    sheet
      .getRange(
        rowNumber,
        COL.OTP_ATTEMPTS
      )
      .setValue(
        0
      );


    // Clear lock
    sheet
      .getRange(
        rowNumber,
        COL.OTP_LOCK_UNTIL
      )
      .setValue(
        ""
      );


    // Clear channel
    sheet
      .getRange(
        rowNumber,
        COL.OTP_CHANNEL
      )
      .setValue(
        ""
      );


    // Verified date
    sheet
      .getRange(
        rowNumber,
        COL.VERIFIED_AT
      )
      .setValue(
        verifiedAt
      );


    // --------------------------------------------------------
    // FIREBASE
    // --------------------------------------------------------

    try {

      markFirebaseUserVerified(
        found
      );


      clearFirebaseOtpFields(
        found
      );

    } catch (firebaseError) {

      console.error(
        "Firebase verification synchronization error:",
        firebaseError
      );

      // Google Sheets is already verified.
      // Return success because verification itself succeeded.

    }


    return {

      success:
        true,

      verified:
        true,

      accountStatus:
        "VERIFIED",

      uid:
        normalize(
          row[
            COL.UID - 1
          ]
        ),

      username:
        normalize(
          row[
            COL.USERNAME - 1
          ]
        ),

      role:
        normalize(
          row[
            COL.ROLE - 1
          ]
        ) ||
        "Employee",

      user: {

        uid:
          normalize(
            row[
              COL.UID - 1
            ]
          ),

        name:
          normalize(
            row[
              COL.NAME - 1
            ]
          ),

        username:
          normalize(
            row[
              COL.USERNAME - 1
            ]
          ),

        age:
          row[
            COL.AGE - 1
          ],

        accountStatus:
          "VERIFIED",

        gmail:
          normalizeEmail(
            row[
              COL.GMAIL - 1
            ]
          ),

        phone:
          normalizePhone(
            row[
              COL.PHONE - 1
            ]
          ),

        role:
          normalize(
            row[
              COL.ROLE - 1
            ]
          ) ||
          "Employee"

      },

      message:
        "Account verified successfully."

    };

  } catch (error) {

    console.error(
      "verifyOTP error:",
      error
    );


    return {

      success:
        false,

      message:
        error &&
        error.message
          ? error.message
          : "OTP verification failed."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (error) {

      // Nothing required.

    }

  }

}


// ============================================================
// LOGIN
// ============================================================

function loginUser(
  data
) {

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
      row[
        COL.PASSWORD - 1
      ] ||
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
      row[
        COL.ACCOUNT_STATUS - 1
      ]
    ).toUpperCase();


  const verified =
    isTrue(
      row[
        COL.VERIFIED - 1
      ]
    );


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


  if (
    status ===
    "BLOCKED"
  ) {

    return {

      success:
        false,

      message:
        "This account has been blocked."

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
          row[
            COL.UID - 1
          ]
        ),

      username:
        normalize(
          row[
            COL.USERNAME - 1
          ]
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
      COL.LAST_LOGIN
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
          row[
            COL.UID - 1
          ]
        ),

      name:
        normalize(
          row[
            COL.NAME - 1
          ]
        ),

      username:
        normalize(
          row[
            COL.USERNAME - 1
          ]
        ),

      age:
        row[
          COL.AGE - 1
        ],

      accountStatus:
        normalize(
          row[
            COL.ACCOUNT_STATUS - 1
          ]
        ),

      gmail:
        normalizeEmail(
          row[
            COL.GMAIL - 1
          ]
        ),

      phone:
        normalizePhone(
          row[
            COL.PHONE - 1
          ]
        ),

      role:
        normalize(
          row[
            COL.ROLE - 1
          ]
        ) ||
        "Employee"

    }

  };

}


// ============================================================
// GET USER
// ============================================================

function getUser(
  data
) {

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
          row[
            COL.UID - 1
          ]
        ),

      name:
        normalize(
          row[
            COL.NAME - 1
          ]
        ),

      username:
        normalize(
          row[
            COL.USERNAME - 1
          ]
        ),

      age:
        row[
          COL.AGE - 1
        ],

      accountStatus:
        normalize(
          row[
            COL.ACCOUNT_STATUS - 1
          ]
        ),

      gmail:
        normalizeEmail(
          row[
            COL.GMAIL - 1
          ]
        ),

      phone:
        normalizePhone(
          row[
            COL.PHONE - 1
          ]
        ),

      role:
        normalize(
          row[
            COL.ROLE - 1
          ]
        ) ||
        "Employee",

      verified:
        isTrue(
          row[
            COL.VERIFIED - 1
          ]
        )

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

    "DISABLED",

    "BLOCKED"

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
      COL.ACCOUNT_STATUS
    )
    .setValue(
      status
    );


  found.sheet
    .getRange(
      found.rowNumber,
      COL.VERIFIED
    )
    .setValue(
      status ===
      "VERIFIED"
    );


  // Synchronize Firebase.
  try {

    markFirebaseUserVerified(
      found
    );

  } catch (error) {

    console.error(
      "Firebase account status update error:",
      error
    );

  }


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
//
// Uses BOTH registered channels.
//
// The recovery OTP is server-generated.
//
// ============================================================

function forgotPassword(
  data
) {

  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      30000
    );


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


    // Do not expose whether the account exists.

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


    // --------------------------------------------------------
    // SAVE SHEET OTP
    // --------------------------------------------------------

    found.sheet
      .getRange(
        found.rowNumber,
        COL.OTP
      )
      .setValue(
        resetOTP
      );


    found.sheet
      .getRange(
        found.rowNumber,
        COL.OTP_EXPIRES
      )
      .setValue(
        expires
      );


    found.sheet
      .getRange(
        found.rowNumber,
        COL.OTP_ATTEMPTS
      )
      .setValue(
        0
      );


    found.sheet
      .getRange(
        found.rowNumber,
        COL.OTP_LOCK_UNTIL
      )
      .setValue(
        ""
      );


    found.sheet
      .getRange(
        found.rowNumber,
        COL.OTP_CHANNEL
      )
      .setValue(
        "both"
      );


    const now =
      new Date();


    found.sheet
      .getRange(
        found.rowNumber,
        COL.LAST_OTP_SENT
      )
      .setValue(
        now
      );


    // --------------------------------------------------------
    // FIREBASE
    // --------------------------------------------------------

    try {

      saveOtpToFirebase(

        found,

        resetOTP,

        expires,

        "both"

      );

    } catch (error) {

      clearSheetOtp(
        found
      );


      return {

        success:
          true,

        message:
          "If the account exists, recovery instructions will be sent."

      };

    }


    // --------------------------------------------------------
    // DELIVERY
    // --------------------------------------------------------

    let delivery;


    try {

      delivery =
        sendOTPByChannel(

          normalizeEmail(
            row[
              COL.GMAIL - 1
            ]
          ),

          normalizePhone(
            row[
              COL.PHONE - 1
            ]
          ),

          normalize(
            row[
              COL.NAME - 1
            ]
          ),

          resetOTP,

          "both",

          false

        );

    } catch (error) {

      clearOtpCompletely(
        found
      );


      return {

        success:
          true,

        message:
          "If the account exists, recovery instructions will be sent."

      };

    }


    return {

      success:
        true,

      emailSent:
        !!delivery.emailSent,

      smsSent:
        !!delivery.smsSent,

      message:
        "If the account exists, recovery instructions have been sent to the registered Gmail and phone."

    };

  } catch (error) {

    console.error(
      "forgotPassword error:",
      error
    );


    return {

      success:
        true,

      message:
        "If the account exists, recovery instructions will be sent."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (error) {

      // Nothing required.

    }

  }

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


    let data;


    try {

      data =
        JSON.parse(
          e.postData.contents
        );

    } catch (parseError) {

      return response({

        success:
          false,

        message:
          "Invalid JSON request."

      });

    }


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
      // UNKNOWN ACTION
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

    channels:
      [

        "email",

        "phone"

      ],

    endpoints:
      [

        "register",

        "registerAdmin",

        "login",

        "prepareOtp",

        "generateOtp",

        "resendOtp",

        "requestOtp",

        "verifyOtp",

        "getUser",

        "updateStatus",

        "forgotPassword"

      ],

    message:
      "StockFlow authentication backend is running."

  });

}
