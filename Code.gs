// ============================================================
// STOCKFLOW AUTHENTICATION BACKEND
// GOOGLE APPS SCRIPT + GOOGLE SHEETS
// ============================================================
//
// FEATURES
// ------------------------------------------------------------
// 1. Employee registration
// 2. Real Gmail registration OTP
// 3. Registration OTP expiration
// 4. Registration OTP resend
// 5. Demo OTP: 123456
// 6. Account verification
// 7. Login
// 8. Forgot password
// 9. Real Gmail password-reset OTP
// 10. Password-reset OTP expiration
// 11. Password-reset OTP resend
// 12. Password-reset OTP attempt limit
// 13. Password update
// 14. Reset OTP invalidated after successful reset
// 15. Safe forgot-password response
//
// IMPORTANT
// ------------------------------------------------------------
// The REAL OTP is never returned to the frontend.
// The demo OTP 123456 is intentionally supported for school/demo use.
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_NAME = "USER";

const SHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const APP_NAME = "StockFlow";


// ------------------------------------------------------------
// OTP SETTINGS
// ------------------------------------------------------------

const OTP_MINUTES = 10;

const OTP_RESEND_SECONDS = 60;

const MAX_OTP_ATTEMPTS = 4;

const DEMO_OTP = "123456";


// ============================================================
// SHEET HEADERS
// ============================================================
//
// Existing fields:
// NAME
// USERNAME
// PASSWORD
// AGE
// ACCOUNT_S
// GMAIL
// PHONE NO.
// OTP
//
// New authentication/recovery fields:
// OTP_EXPIRES
// OTP_ATTEMPTS
// OTP_CHANNEL
// CREATED_AT
// VERIFIED_AT
// RESET_OTP
// RESET_OTP_EXPIRES
// RESET_OTP_ATTEMPTS
// RESET_OTP_CHANNEL
// RESET_REQUESTED_AT
// RESET_VERIFIED
//
// ============================================================

const HEADERS = [

  "NAME",
  "USERNAME",
  "PASSWORD",
  "AGE",
  "ACCOUNT_S",
  "GMAIL",
  "PHONE NO.",
  "OTP",

  "OTP_EXPIRES",
  "OTP_ATTEMPTS",
  "OTP_CHANNEL",

  "CREATED_AT",
  "VERIFIED_AT",

  "RESET_OTP",
  "RESET_OTP_EXPIRES",
  "RESET_OTP_ATTEMPTS",
  "RESET_OTP_CHANNEL",
  "RESET_REQUESTED_AT",
  "RESET_VERIFIED"

];


// ============================================================
// GET SPREADSHEET
// ============================================================

function getSpreadsheet() {

  return SpreadsheetApp.openById(
    SHEET_ID
  );

}


// ============================================================
// GET SHEET
// ============================================================

function getSheet() {

  const spreadsheet =
    getSpreadsheet();

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


  const currentLastColumn =
    sheet.getLastColumn();


  // ----------------------------------------------------------
  // Completely empty sheet
  // ----------------------------------------------------------

  if (
    sheet.getLastRow() === 0 ||
    currentLastColumn === 0
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .setValues([
        HEADERS
      ]);

    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .setFontWeight("bold");

    return;

  }


  // ----------------------------------------------------------
  // Read existing headers
  // ----------------------------------------------------------

  const existingHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        Math.max(
          currentLastColumn,
          requiredColumns
        )
      )
      .getValues()[0];


  // ----------------------------------------------------------
  // Add missing headers
  // ----------------------------------------------------------

  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    const existing =
      String(
        existingHeaders[i] || ""
      ).trim();


    if (
      existing !== HEADERS[i]
    ) {

      sheet
        .getRange(
          1,
          i + 1
        )
        .setValue(
          HEADERS[i]
        );

    }

  }


  sheet
    .getRange(
      1,
      1,
      1,
      HEADERS.length
    )
    .setFontWeight("bold");

}


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
// GET API
// ============================================================

function doGet(e) {

  return response({

    success: true,

    service: APP_NAME,

    message:
      "StockFlow Authentication API is running."

  });

}


// ============================================================
// POST API
// ============================================================

function doPost(e) {

  try {

    const raw =
      e &&
      e.postData &&
      e.postData.contents
        ? e.postData.contents
        : "{}";


    const data =
      JSON.parse(raw);


    const action =
      String(
        data.action || ""
      )
      .trim();


    switch (action) {


      // ======================================================
      // REGISTRATION
      // ======================================================

      case "register":

        return registerUser(data);


      // ======================================================
      // REGISTRATION OTP
      // ======================================================

      case "verifyOtp":

        return verifyOTP(data);


      case "resendOtp":

        return resendOTP(data);


      case "requestOtp":

        return resendOTP(data);


      case "updateOtp":

        return resendOTP(data);


      // ======================================================
      // LOGIN
      // ======================================================

      case "login":

        return loginUser(data);


      // ======================================================
      // USER
      // ======================================================

      case "getUser":

        return getUser(data);


      case "updateStatus":

        return updateAccountStatus(data);


      // ======================================================
      // PASSWORD RECOVERY
      // ======================================================

      case "forgotPassword":

        return forgotPassword(data);


      case "requestResetOtp":

        return requestResetOTP(data);


      case "verifyResetOtp":

        return verifyResetOTP(data);


      case "resetPassword":

        return resetPassword(data);


      case "resendResetOtp":

        return resendResetOTP(data);


      default:

        return response({

          success: false,

          message:
            "Unknown API action."

        });

    }


  } catch (error) {

    console.error(
      "API ERROR:",
      error
    );


    return response({

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
// LOWERCASE NORMALIZE
// ============================================================

function normalizeLower(value) {

  return normalize(
    value
  ).toLowerCase();

}


// ============================================================
// FIND USER
// ============================================================
//
// Identity can be:
// USERNAME
// GMAIL
// PHONE NUMBER
//
// ============================================================

function findUser(identity) {

  const sheet =
    getSheet();


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return null;

  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        HEADERS.length
      )
      .getValues();


  const target =
    normalizeLower(
      identity
    );


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const row =
      values[i];


    const username =
      normalizeLower(
        row[1]
      );


    const email =
      normalizeLower(
        row[5]
      );


    const phone =
      normalize(
        row[6]
      );


    if (

      target === username ||

      target === email ||

      target === phone

    ) {

      return {

        sheet: sheet,

        rowNumber:
          i + 2,

        row: row

      };

    }

  }


  return null;

}


// ============================================================
// GENERATE OTP
// ============================================================

function generateOTP() {

  return String(

    Math.floor(
      100000 +
      Math.random() * 900000
    )

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
      .substring(
        2,
        8
      )

  );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

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
// SEND REGISTRATION OTP EMAIL
// ============================================================

function sendRegistrationOTPEmail(
  email,
  fullName,
  otp,
  isResend
) {

  if (!email) {

    throw new Error(
      "Registered Gmail address is missing."
    );

  }


  const subject =
    isResend

      ? "StockFlow - New verification code"

      : "StockFlow - Verify your account";


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
    OTP_MINUTES +
    " minutes.\n\n" +

    "If you did not request this code, " +
    "you can safely ignore this email.\n\n" +

    "StockFlow";


  const htmlBody =

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

        escapeHTML(
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

      "\">" +

        otp +

      "</div>" +


      "<p>This code expires in <b>" +

        OTP_MINUTES +

        " minutes</b>.</p>" +


      "<p style=\"" +

        "color:#64748b;" +
        "font-size:13px;" +

      "\">" +

        "If you did not request this code, " +
        "you can safely ignore this email." +

      "</p>" +


      "<p>— StockFlow</p>" +

    "</div>";


  MailApp.sendEmail({

    to: email,

    subject: subject,

    body: plainText,

    htmlBody: htmlBody,

    name: APP_NAME

  });

}


// ============================================================
// SEND PASSWORD RESET OTP EMAIL
// ============================================================

function sendResetOTPEmail(
  email,
  fullName,
  otp,
  isResend
) {

  if (!email) {

    throw new Error(
      "Registered Gmail address is missing."
    );

  }


  const subject =

    isResend

      ? "StockFlow - New password reset code"

      : "StockFlow - Password reset code";


  const plainText =

    "Hello " +

    (
      fullName ||
      "StockFlow User"
    ) +

    ",\n\n" +

    "We received a request to reset your StockFlow password.\n\n" +

    "Your password reset verification code is:\n\n" +

    otp +

    "\n\n" +

    "This code expires in " +

    OTP_MINUTES +

    " minutes.\n\n" +

    "If you did not request a password reset, " +

    "please ignore this email and keep your current password.\n\n" +

    "StockFlow";


  const htmlBody =

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

        escapeHTML(
          fullName ||
          "StockFlow User"
        ) +

      ",</p>" +


      "<p>" +

        "We received a request to reset your StockFlow password." +

      "</p>" +


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


      "<p>This code expires in <b>" +

        OTP_MINUTES +

        " minutes</b>.</p>" +


      "<p style=\"" +

        "color:#64748b;" +
        "font-size:13px;" +

      "\">" +

        "If you did not request a password reset, " +
        "you can safely ignore this email. " +
        "Your current password will remain unchanged." +

      "</p>" +


      "<p>— StockFlow</p>" +

    "</div>";


  MailApp.sendEmail({

    to: email,

    subject: subject,

    body: plainText,

    htmlBody: htmlBody,

    name: APP_NAME

  });

}


// ============================================================
// REGISTER USER
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
      data.password || ""
    );


  const age =
    Number(
      data.age
    );


  const gmail =
    normalizeLower(
      data.gmail ||
      data.email
    );


  const phone =
    normalize(
      data.phone
    );


  const role =
    "Employee";


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (

    !name ||

    !username ||

    !password ||

    !gmail ||

    !phone ||

    !age

  ) {

    return response({

      success: false,

      message:
        "All required fields must be completed."

    });

  }


  if (
    !/^\S+@\S+\.\S+$/.test(
      gmail
    )
  ) {

    return response({

      success: false,

      message:
        "Enter a valid Gmail/email address."

    });

  }


  if (
    age < 18 ||
    age > 100
  ) {

    return response({

      success: false,

      message:
        "Age must be between 18 and 100."

    });

  }


  // ----------------------------------------------------------
  // PASSWORD VALIDATION
  // ----------------------------------------------------------

  if (
    password.length < 8
  ) {

    return response({

      success: false,

      message:
        "Password must contain at least 8 characters."

    });

  }


  // ----------------------------------------------------------
  // CHECK DUPLICATES
  // ----------------------------------------------------------

  const existingUsername =
    findUser(
      username
    );


  if (existingUsername) {

    return response({

      success: false,

      message:
        "Username already exists."

    });

  }


  const existingEmail =
    findUser(
      gmail
    );


  if (existingEmail) {

    return response({

      success: false,

      message:
        "Gmail address already exists."

    });

  }


  const existingPhone =
    findUser(
      phone
    );


  if (existingPhone) {

    return response({

      success: false,

      message:
        "Phone number already exists."

    });

  }


  // ----------------------------------------------------------
  // GENERATE OTP
  // ----------------------------------------------------------

  const otp =
    generateOTP();


  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60 *
      1000
    );


  const createdAt =
    new Date();


  // ----------------------------------------------------------
  // APPEND USER
  // ----------------------------------------------------------

  sheet.appendRow([

    name,

    username,

    password,

    age,

    "PENDING",

    gmail,

    phone,

    otp,

    expires,

    0,

    "gmail",

    createdAt,

    "",

    "",

    "",

    0,

    "",

    "",

    false

  ]);


  // ----------------------------------------------------------
  // SEND REAL OTP
  // ----------------------------------------------------------

  try {

    sendRegistrationOTPEmail(

      gmail,

      name,

      otp,

      false

    );

  } catch (mailError) {

    const lastRow =
      sheet.getLastRow();

    sheet.deleteRow(
      lastRow
    );


    throw new Error(

      "Registration could not be completed because the verification email could not be sent. " +

      mailError.message

    );

  }


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  return response({

    success: true,

    message:
      "Registration successful. A verification code was sent to your Gmail.",

    username:
      username,

    uid:
      data.uid ||
      generateUID(),

    otpSent:
      true,

    // Demo code is intentionally provided.
    demoOtp:
      DEMO_OTP

  });

}


// ============================================================
// VERIFY REGISTRATION OTP
// ============================================================

function verifyOTP(data) {

  const identity =
    normalize(
      data.identity
    );


  const otp =
    normalize(
      data.otp
    );


  if (
    !identity ||
    !otp
  ) {

    return response({

      success: false,

      message:
        "Username/email and OTP are required."

    });

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return response({

      success: false,

      message:
        "Account not found."

    });

  }


  const row =
    found.row;


  const currentStatus =
    normalize(
      row[4]
    ).toUpperCase();


  // ----------------------------------------------------------
  // DEMO OTP
  // ----------------------------------------------------------

  if (
    otp === DEMO_OTP
  ) {

    found.sheet
      .getRange(
        found.rowNumber,
        5
      )
      .setValue(
        "DEMO"
      );


    return response({

      success: true,

      demo: true,

      verified: false,

      accountStatus:
        "Demo",

      message:
        "Demo access granted. Your account is not fully verified."

    });

  }


  // ----------------------------------------------------------
  // CHECK OTP ATTEMPTS
  // ----------------------------------------------------------

  const attempts =
    Number(
      row[9] || 0
    );


  if (
    attempts >=
    MAX_OTP_ATTEMPTS
  ) {

    return response({

      success: false,

      message:
        "Too many incorrect OTP attempts. Please request a new verification code."

    });

  }


  // ----------------------------------------------------------
  // CHECK EXPIRATION
  // ----------------------------------------------------------

  const expires =
    row[8]
      ? new Date(
          row[8]
        )
      : null;


  if (
    expires &&
    Date.now() >
      expires.getTime()
  ) {

    return response({

      success: false,

      message:
        "This verification code has expired. Please request a new one."

    });

  }


  // ----------------------------------------------------------
  // CHECK OTP
  // ----------------------------------------------------------

  const storedOTP =
    normalize(
      row[7]
    );


  if (
    otp !== storedOTP
  ) {

    const newAttempts =
      attempts + 1;


    found.sheet
      .getRange(
        found.rowNumber,
        10
      )
      .setValue(
        newAttempts
      );


    const remaining =
      Math.max(
        0,
        MAX_OTP_ATTEMPTS -
        newAttempts
      );


    return response({

      success: false,

      attempts:
        newAttempts,

      remainingAttempts:
        remaining,

      message:
        remaining > 0

          ? "Invalid OTP. " +
            remaining +
            " attempt(s) remaining."

          : "Too many incorrect OTP attempts. Please request a new code."

    });

  }


  // ----------------------------------------------------------
  // VERIFY ACCOUNT
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      5
    )
    .setValue(
      "VERIFIED"
    );


  // Clear registration OTP

  found.sheet
    .getRange(
      found.rowNumber,
      8
    )
    .setValue(
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      9
    )
    .setValue(
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      10
    )
    .setValue(
      0
    );


  found.sheet
    .getRange(
      found.rowNumber,
      13
    )
    .setValue(
      new Date()
    );


  return response({

    success: true,

    demo: false,

    verified: true,

    accountStatus:
      "VERIFIED",

    message:
      "Account verified successfully."

  });

}


// ============================================================
// RESEND REGISTRATION OTP
// ============================================================

function resendOTP(data) {

  const identity =
    normalize(
      data.identity
    );


  if (!identity) {

    return response({

      success: false,

      message:
        "Username or Gmail is required."

    });

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return response({

      success: false,

      message:
        "Account not found."

    });

  }


  const row =
    found.row;


  const status =
    normalize(
      row[4]
    ).toUpperCase();


  if (
    status ===
    "VERIFIED"
  ) {

    return response({

      success: false,

      message:
        "This account is already verified."

    });

  }


  const newOTP =
    generateOTP();


  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60 *
      1000
    );


  found.sheet
    .getRange(
      found.rowNumber,
      8
    )
    .setValue(
      newOTP
    );


  found.sheet
    .getRange(
      found.rowNumber,
      9
    )
    .setValue(
      expires
    );


  found.sheet
    .getRange(
      found.rowNumber,
      10
    )
    .setValue(
      0
    );


  found.sheet
    .getRange(
      found.rowNumber,
      11
    )
    .setValue(
      "gmail"
    );


  // ----------------------------------------------------------
  // SEND EMAIL
  // ----------------------------------------------------------

  sendRegistrationOTPEmail(

    normalizeLower(
      row[5]
    ),

    normalize(
      row[0]
    ),

    newOTP,

    true

  );


  return response({

    success: true,

    otpSent: true,

    demoOtp:
      DEMO_OTP,

    message:
      "A new verification code was sent to your Gmail."

  });

}


// ============================================================
// LOGIN USER
// ============================================================

function loginUser(data) {

  const identity =
    normalizeLower(
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

    return response({

      success: false,

      message:
        "Username/email and password are required."

    });

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return response({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  const row =
    found.row;


  const savedPassword =
    String(
      row[2] || ""
    );


  if (
    password !==
    savedPassword
  ) {

    return response({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  const status =
    normalize(
      row[4]
    ).toUpperCase();


  // ----------------------------------------------------------
  // DEMO ACCOUNT
  // ----------------------------------------------------------

  if (
    status ===
    "DEMO"
  ) {

    return response({

      success: true,

      verified: false,

      demo: true,

      message:
        "Demo login successful.",

      user: {

        name:
          row[0],

        username:
          row[1],

        age:
          row[3],

        accountStatus:
          "Demo",

        gmail:
          row[5],

        phone:
          row[6],

        role:
          "Employee"

      }

    });

  }


  // ----------------------------------------------------------
  // UNVERIFIED
  // ----------------------------------------------------------

  if (
    status !==
    "VERIFIED"
  ) {

    return response({

      success: false,

      verified: false,

      demo: false,

      message:
        "Account is not verified. Please verify your OTP."

    });

  }


  // ----------------------------------------------------------
  // LOGIN SUCCESS
  // ----------------------------------------------------------

  return response({

    success: true,

    verified: true,

    demo: false,

    message:
      "Login successful.",

    user: {

      name:
        row[0],

      username:
        row[1],

      age:
        row[3],

      accountStatus:
        row[4],

      gmail:
        row[5],

      phone:
        row[6],

      role:
        "Employee"

    }

  });

}


// ============================================================
// FORGOT PASSWORD
// ============================================================
//
// This endpoint intentionally does not reveal whether the
// account exists.
//
// Frontend can call:
// action: "forgotPassword"
// identity: email / username / phone
//
// ============================================================

function forgotPassword(data) {

  const identity =
    normalize(
      data.identity
    );


  if (!identity) {

    return response({

      success: false,

      message:
        "Email, username, or phone number is required."

    });

  }


  const found =
    findUser(
      identity
    );


  // ----------------------------------------------------------
  // SECURITY RESPONSE
  // ----------------------------------------------------------

  if (!found) {

    return response({

      success: true,

      recoveryStarted: false,

      message:
        "If an account matches the information provided, a password reset code will be sent."

    });

  }


  const row =
    found.row;


  const email =
    normalizeLower(
      row[5]
    );


  // ----------------------------------------------------------
  // REQUIRE REGISTERED EMAIL
  // ----------------------------------------------------------

  if (!email) {

    return response({

      success: true,

      recoveryStarted: false,

      message:
        "If an account matches the information provided, recovery instructions will be sent."

    });

  }


  // ----------------------------------------------------------
  // GENERATE RESET OTP
  // ----------------------------------------------------------

  const resetOTP =
    generateOTP();


  const resetExpires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60 *
      1000
    );


  // ----------------------------------------------------------
  // SAVE RESET INFORMATION
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      resetOTP
    );


  found.sheet
    .getRange(
      found.rowNumber,
      15
    )
    .setValue(
      resetExpires
    );


  found.sheet
    .getRange(
      found.rowNumber,
      16
    )
    .setValue(
      0
    );


  found.sheet
    .getRange(
      found.rowNumber,
      17
    )
    .setValue(
      "gmail"
    );


  found.sheet
    .getRange(
      found.rowNumber,
      18
    )
    .setValue(
      new Date()
    );


  found.sheet
    .getRange(
      found.rowNumber,
      19
    )
    .setValue(
      false
    );


  // ----------------------------------------------------------
  // SEND RESET EMAIL
  // ----------------------------------------------------------

  try {

    sendResetOTPEmail(

      email,

      normalize(
        row[0]
      ),

      resetOTP,

      false

    );

  } catch (mailError) {

    // Clear reset OTP if email fails.

    found.sheet
      .getRange(
        found.rowNumber,
        14,
        1,
        6
      )
      .clearContent();


    throw new Error(

      "Unable to send the password reset email. " +

      mailError.message

    );

  }


  return response({

    success: true,

    recoveryStarted: true,

    otpSent: true,

    // Demo OTP remains available for school prototype.
    demoOtp:
      DEMO_OTP,

    message:
      "If the account exists, a password reset code has been sent to the registered Gmail."

  });

}


// ============================================================
// REQUEST RESET OTP
// ============================================================
//
// Alias endpoint for frontend compatibility.
//
// ============================================================

function requestResetOTP(data) {

  return forgotPassword(
    data
  );

}


// ============================================================
// VERIFY RESET OTP
// ============================================================

function verifyResetOTP(data) {

  const identity =
    normalize(
      data.identity
    );


  const otp =
    normalize(
      data.otp
    );


  if (
    !identity ||
    !otp
  ) {

    return response({

      success: false,

      message:
        "Email/username and reset OTP are required."

    });

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return response({

      success: false,

      message:
        "Invalid or expired reset code."

    });

  }


  const row =
    found.row;


  // ----------------------------------------------------------
  // DEMO OTP
  // ----------------------------------------------------------
  //
  // Demo OTP allows the prototype to continue to the
  // password-reset screen.
  //
  // The account is NOT automatically verified.
  //
  // ----------------------------------------------------------

  if (
    otp ===
    DEMO_OTP
  ) {

    found.sheet
      .getRange(
        found.rowNumber,
        19
      )
      .setValue(
        true
      );


    return response({

      success: true,

      demo: true,

      resetVerified: true,

      message:
        "Demo password-reset verification accepted."

    });

  }


  // ----------------------------------------------------------
  // CHECK ATTEMPTS
  // ----------------------------------------------------------

  const attempts =
    Number(
      row[15] || 0
    );


  if (
    attempts >=
    MAX_OTP_ATTEMPTS
  ) {

    return response({

      success: false,

      message:
        "Too many incorrect reset-code attempts. Please request a new code."

    });

  }


  // ----------------------------------------------------------
  // CHECK EXPIRATION
  // ----------------------------------------------------------

  const expires =
    row[14]
      ? new Date(
          row[14]
        )
      : null;


  if (
    !expires ||
    Date.now() >
      expires.getTime()
  ) {

    return response({

      success: false,

      message:
        "This password reset code has expired. Please request a new one."

    });

  }


  // ----------------------------------------------------------
  // CHECK OTP
  // ----------------------------------------------------------

  const savedOTP =
    normalize(
      row[13]
    );


  if (
    otp !==
    savedOTP
  ) {

    const newAttempts =
      attempts + 1;


    found.sheet
      .getRange(
        found.rowNumber,
        16
      )
      .setValue(
        newAttempts
      );


    const remaining =
      Math.max(
        0,
        MAX_OTP_ATTEMPTS -
        newAttempts
      );


    return response({

      success: false,

      attempts:
        newAttempts,

      remainingAttempts:
        remaining,

      message:
        remaining > 0

          ? "Incorrect reset code. " +
            remaining +
            " attempt(s) remaining."

          : "Too many incorrect attempts. Please request a new reset code."

    });

  }


  // ----------------------------------------------------------
  // RESET OTP VERIFIED
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      19
    )
    .setValue(
      true
    );


  return response({

    success: true,

    demo: false,

    resetVerified: true,

    message:
      "Reset code verified successfully."

  });

}


// ============================================================
// RESEND PASSWORD RESET OTP
// ============================================================

function resendResetOTP(data) {

  const identity =
    normalize(
      data.identity
    );


  if (!identity) {

    return response({

      success: false,

      message:
        "Email, username, or phone number is required."

    });

  }


  const found =
    findUser(
      identity
    );


  // ----------------------------------------------------------
  // Do not reveal account existence
  // ----------------------------------------------------------

  if (!found) {

    return response({

      success: true,

      message:
        "If the account exists, a new reset code will be sent."

    });

  }


  const row =
    found.row;


  const email =
    normalizeLower(
      row[5]
    );


  if (!email) {

    return response({

      success: true,

      message:
        "If the account exists, a new reset code will be sent."

    });

  }


  // ----------------------------------------------------------
  // GENERATE NEW OTP
  // ----------------------------------------------------------

  const resetOTP =
    generateOTP();


  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60 *
      1000
    );


  // ----------------------------------------------------------
  // SAVE NEW RESET OTP
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      resetOTP
    );


  found.sheet
    .getRange(
      found.rowNumber,
      15
    )
    .setValue(
      expires
    );


  found.sheet
    .getRange(
      found.rowNumber,
      16
    )
    .setValue(
      0
    );


  found.sheet
    .getRange(
      found.rowNumber,
      17
    )
    .setValue(
      "gmail"
    );


  found.sheet
    .getRange(
      found.rowNumber,
      18
    )
    .setValue(
      new Date()
    );


  found.sheet
    .getRange(
      found.rowNumber,
      19
    )
    .setValue(
      false
    );


  // ----------------------------------------------------------
  // SEND EMAIL
  // ----------------------------------------------------------

  sendResetOTPEmail(

    email,

    normalize(
      row[0]
    ),

    resetOTP,

    true

  );


  return response({

    success: true,

    otpSent: true,

    demoOtp:
      DEMO_OTP,

    message:
      "A new password reset code has been sent to your Gmail."

  });

}


// ============================================================
// RESET PASSWORD
// ============================================================

function resetPassword(data) {

  const identity =
    normalize(
      data.identity
    );


  const newPassword =
    String(
      data.newPassword ||
      data.password ||
      ""
    );


  if (
    !identity ||
    !newPassword
  ) {

    return response({

      success: false,

      message:
        "Account identity and new password are required."

    });

  }


  // ----------------------------------------------------------
  // PASSWORD REQUIREMENTS
  // ----------------------------------------------------------

  if (
    newPassword.length < 8
  ) {

    return response({

      success: false,

      message:
        "Password must contain at least 8 characters."

    });

  }


  if (
    !/[A-Z]/.test(
      newPassword
    )
  ) {

    return response({

      success: false,

      message:
        "Password must contain at least one uppercase letter."

    });

  }


  if (
    !/[a-z]/.test(
      newPassword
    )
  ) {

    return response({

      success: false,

      message:
        "Password must contain at least one lowercase letter."

    });

  }


  if (
    !/\d/.test(
      newPassword
    )
  ) {

    return response({

      success: false,

      message:
        "Password must contain at least one number."

    });

  }


  if (
    !/[^A-Za-z0-9]/.test(
      newPassword
    )
  ) {

    return response({

      success: false,

      message:
        "Password must contain at least one special character."

    });

  }


  // ----------------------------------------------------------
  // FIND USER
  // ----------------------------------------------------------

  const found =
    findUser(
      identity
    );


  if (!found) {

    return response({

      success: false,

      message:
        "Unable to reset password."

    });

  }


  const row =
    found.row;


  // ----------------------------------------------------------
  // CHECK RESET VERIFICATION
  // ----------------------------------------------------------

  const resetVerified =
    row[18] === true;


  if (
    !resetVerified
  ) {

    return response({

      success: false,

      message:
        "Please verify the password reset code first."

    });

  }


  // ----------------------------------------------------------
  // UPDATE PASSWORD
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      3
    )
    .setValue(
      newPassword
    );


  // ----------------------------------------------------------
  // INVALIDATE RESET OTP
  // ----------------------------------------------------------

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
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      16
    )
    .setValue(
      0
    );


  found.sheet
    .getRange(
      found.rowNumber,
      17
    )
    .setValue(
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      18
    )
    .setValue(
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      19
    )
    .setValue(
      false
    );


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  return response({

    success: true,

    message:
      "Password has been reset successfully. You can now log in with your new password."

  });

}


// ============================================================
// GET USER
// ============================================================

function getUser(data) {

  const identity =
    normalize(
      data.identity
    );


  const found =
    findUser(
      identity
    );


  if (!found) {

    return response({

      success: false,

      message:
        "User not found."

    });

  }


  const row =
    found.row;


  return response({

    success: true,

    user: {

      name:
        row[0],

      username:
        row[1],

      age:
        row[3],

      accountStatus:
        row[4],

      gmail:
        row[5],

      phone:
        row[6],

      role:
        "Employee"

    }

  });

}


// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================

function updateAccountStatus(data) {

  const username =
    normalizeLower(
      data.username
    );


  const status =
    normalize(
      data.status
    ).toUpperCase();


  const allowedStatuses = [

    "PENDING",

    "VERIFIED",

    "DEMO",

    "SUSPENDED",

    "DISABLED"

  ];


  if (
    !allowedStatuses.includes(
      status
    )
  ) {

    return response({

      success: false,

      message:
        "Invalid account status."

    });

  }


  const found =
    findUser(
      username
    );


  if (!found) {

    return response({

      success: false,

      message:
        "Username not found."

    });

  }


  found.sheet
    .getRange(
      found.rowNumber,
      5
    )
    .setValue(
      status
    );


  return response({

    success: true,

    message:
      "Account status updated."

  });

}
