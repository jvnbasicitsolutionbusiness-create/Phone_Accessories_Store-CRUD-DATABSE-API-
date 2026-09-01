// ============================================================
// STOCKFLOW AUTHENTICATION BACKEND
// Google Apps Script + Google Sheets + REAL GMAIL OTP
// ============================================================
//
// FEATURES
// ------------------------------------------------------------
// 1. Public Employee Registration
// 2. Protected Admin Registration
// 3. Real Gmail OTP
// 4. OTP Expiration
// 5. OTP Resend
// 6. OTP Attempt Limit
// 7. Temporary OTP Lock
// 8. Account Verification
// 9. Secure Login
// 10. User Lookup
// 11. Account Status Management
// 12. Password SHA-256 Hashing
//
// IMPORTANT:
// ------------------------------------------------------------
// NEVER put ADMIN_REGISTRATION_KEY directly in your HTML/JS.
// Set it inside:
// Apps Script > Project Settings > Script Properties
//
// Required Script Property:
//
// ADMIN_REGISTRATION_KEY
//
// Example:
//
// ADMIN_REGISTRATION_KEY = YourVerySecretAdminKey123
//
// Optional:
//
// ADMIN_EMAILS = yourgmail@gmail.com,anotheradmin@gmail.com
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const SHEET_NAME = "USER";

const APP_NAME = "StockFlow";


// OTP SETTINGS
const OTP_LENGTH = 6;

const OTP_EXPIRATION_MINUTES = 10;

const MAX_OTP_ATTEMPTS = 4;

const OTP_LOCK_MINUTES = 30;

const RESEND_COOLDOWN_SECONDS = 60;


// ============================================================
// ACCOUNT ROLES
// ============================================================

const ROLE_EMPLOYEE = "Employee";
const ROLE_ADMIN = "Admin";


// ============================================================
// ACCOUNT STATUS
// ============================================================

const STATUS_PENDING = "PENDING";
const STATUS_VERIFIED = "VERIFIED";
const STATUS_SUSPENDED = "SUSPENDED";
const STATUS_DISABLED = "DISABLED";


// ============================================================
// SHEET HEADERS
// ============================================================
//
// Existing USER sheets with the old 8 columns will be expanded.
// ============================================================

const HEADERS = [

  "UID",
  "NAME",
  "USERNAME",
  "PASSWORD_HASH",
  "AGE",
  "ACCOUNT_STATUS",
  "GMAIL",
  "PHONE_NO",
  "ROLE",

  "OTP",
  "OTP_EXPIRES",

  "OTP_ATTEMPTS",
  "OTP_LOCK_UNTIL",
  "OTP_LAST_SENT",

  "CREATED_AT",
  "VERIFIED_AT"

];


// ============================================================
// GET SCRIPT PROPERTIES
// ============================================================

function getScriptProperties_() {

  return PropertiesService.getScriptProperties();

}


// ============================================================
// GET ADMIN REGISTRATION KEY
// ============================================================

function getAdminRegistrationKey_() {

  const key =
    getScriptProperties_()
      .getProperty("ADMIN_REGISTRATION_KEY");

  if (!key) {

    throw new Error(
      "ADMIN_REGISTRATION_KEY is not configured in Apps Script."
    );

  }

  return key.trim();

}


// ============================================================
// GET ADMIN EMAIL ALLOWLIST
// ============================================================
//
// Optional.
//
// Example Script Property:
//
// ADMIN_EMAILS
//
// yourgmail@gmail.com,admin2@gmail.com
//
// If empty, only ADMIN_REGISTRATION_KEY is required.
// ============================================================

function getAdminEmails_() {

  const value =
    getScriptProperties_()
      .getProperty("ADMIN_EMAILS");

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

}


// ============================================================
// OPEN SPREADSHEET
// ============================================================

function getSpreadsheet_() {

  return SpreadsheetApp.openById(SHEET_ID);

}


// ============================================================
// GET USER SHEET
// ============================================================

function getSheet() {

  const spreadsheet = getSpreadsheet_();

  let sheet =
    spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(SHEET_NAME);

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

  const maxColumns =
    sheet.getMaxColumns();

  if (maxColumns < requiredColumns) {

    sheet.insertColumnsAfter(
      maxColumns,
      requiredColumns - maxColumns
    );

  }


  const current =
    sheet
      .getRange(1, 1, 1, requiredColumns)
      .getValues()[0];


  let changed = false;


  for (
    let i = 0;
    i < requiredColumns;
    i++
  ) {

    if (current[i] !== HEADERS[i]) {

      changed = true;
      break;

    }

  }


  if (changed) {

    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .setValues([HEADERS]);


    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .setFontWeight("bold");

  }

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
// GET API TEST
// ============================================================

function doGet() {

  return response({

    success: true,

    system: APP_NAME,

    message:
      "StockFlow Authentication API is running."

  });

}


// ============================================================
// MAIN POST API
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
      ).trim();


    switch (action) {

      // ------------------------------------------------------
      // PUBLIC EMPLOYEE REGISTRATION
      // ------------------------------------------------------

      case "register":

        return registerEmployee_(data);


      // ------------------------------------------------------
      // PROTECTED ADMIN REGISTRATION
      // ------------------------------------------------------

      case "adminRegister":

        return registerAdmin_(data);


      // ------------------------------------------------------
      // OTP VERIFICATION
      // ------------------------------------------------------

      case "verifyOtp":

        return verifyOTP_(data);


      // ------------------------------------------------------
      // RESEND OTP
      // ------------------------------------------------------

      case "resendOtp":
      case "requestOtp":
      case "updateOtp":

        return resendOTP_(data);


      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      case "login":

        return loginUser_(data);


      // ------------------------------------------------------
      // GET USER
      // ------------------------------------------------------

      case "getUser":

        return getUser_(data);


      // ------------------------------------------------------
      // UPDATE ACCOUNT STATUS
      // ------------------------------------------------------

      case "updateStatus":

        return updateAccountStatus_(data);


      // ------------------------------------------------------
      // FORGOT PASSWORD
      // ------------------------------------------------------

      case "forgotPassword":

        return forgotPassword_(data);


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
// NORMALIZE EMAIL
// ============================================================

function normalizeEmail_(value) {

  return normalize_(value)
    .toLowerCase();

}


// ============================================================
// NORMALIZE PHONE
// ============================================================

function normalizePhone_(value) {

  return normalize_(value)
    .replace(/[\s-]/g, "");

}


// ============================================================
// GENERATE UID
// ============================================================

function generateUID_() {

  return (

    "sf_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 10)

  );

}


// ============================================================
// GENERATE 6-DIGIT OTP
// ============================================================

function generateOTP_() {

  return String(

    Math.floor(
      100000 +
      Math.random() * 900000
    )

  );

}


// ============================================================
// HASH PASSWORD
// ============================================================

function hashPassword_(password) {

  const bytes =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(password)
    );


  return bytes
    .map(function(byte) {

      const value =
        byte < 0
          ? byte + 256
          : byte;

      return (
        "0" +
        value.toString(16)
      ).slice(-2);

    })
    .join("");

}


// ============================================================
// VALIDATE EMAIL
// ============================================================

function validEmail_(email) {

  return /^\S+@\S+\.\S+$/
    .test(email);

}


// ============================================================
// VALIDATE PHONE
// ============================================================

function validPhone_(phone) {

  return /^(09\d{9}|\+639\d{9})$/
    .test(
      normalizePhone_(phone)
    );

}


// ============================================================
// VALIDATE USERNAME
// ============================================================

function validUsername_(username) {

  return /^[A-Za-z0-9_.-]{4,20}$/
    .test(username);

}


// ============================================================
// READ DATA ROWS
// ============================================================

function getRows_(sheet) {

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
// FIND USER
// ============================================================
//
// Identity can be:
// UID
// Username
// Gmail
// Phone
// ============================================================

function findUser_(identity) {

  const sheet =
    getSheet();


  const rows =
    getRows_(sheet);


  const target =
    normalize_(identity)
      .toLowerCase();


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];


    const uid =
      normalize_(row[0])
        .toLowerCase();


    const username =
      normalize_(row[2])
        .toLowerCase();


    const gmail =
      normalize_(row[6])
        .toLowerCase();


    const phone =
      normalize_(row[7])
        .toLowerCase();


    if (

      target === uid ||
      target === username ||
      target === gmail ||
      target === phone

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
// CHECK DUPLICATE USERNAME / EMAIL / PHONE
// ============================================================

function checkDuplicate_(username, gmail, phone) {

  const sheet =
    getSheet();


  const rows =
    getRows_(sheet);


  const targetUsername =
    username.toLowerCase();


  const targetEmail =
    gmail.toLowerCase();


  const targetPhone =
    normalizePhone_(phone);


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];


    const existingUsername =
      normalize_(row[2])
        .toLowerCase();


    const existingEmail =
      normalize_(row[6])
        .toLowerCase();


    const existingPhone =
      normalizePhone_(row[7]);


    if (
      existingUsername === targetUsername
    ) {

      return "Username already exists.";

    }


    if (
      existingEmail === targetEmail
    ) {

      return "Gmail address already exists.";

    }


    if (
      existingPhone === targetPhone
    ) {

      return "Phone number already exists.";

    }

  }


  return null;

}


// ============================================================
// SEND REAL GMAIL OTP
// ============================================================

function sendOTPEmail_(
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

      ? "StockFlow - Your New Verification Code"

      : "StockFlow - Verify Your Account";


  const plainText =

    "Hello " +
    (fullName || "StockFlow User") +
    ",\n\n" +

    "Your StockFlow verification code is:\n\n" +

    otp +

    "\n\n" +

    "This verification code expires in " +
    OTP_EXPIRATION_MINUTES +
    " minutes.\n\n" +

    "For your security, do not share this code with anyone.\n\n" +

    "If you did not request this code, please ignore this message.\n\n" +

    "StockFlow Inventory System";


  const htmlBody =

    "<div style=\"" +

      "font-family:Arial,sans-serif;" +
      "max-width:560px;" +
      "margin:auto;" +
      "padding:30px;" +
      "background:#f8fafc;" +

    "\">" +


      "<div style=\"" +
        "background:white;" +
        "padding:30px;" +
        "border-radius:16px;" +
        "box-shadow:0 5px 25px rgba(0,0,0,.08);" +
      "\">" +


        "<h2 style=\"" +
          "color:#1769e0;" +
          "margin-top:0;" +
        "\">" +

          "StockFlow" +

        "</h2>" +


        "<p>Hello " +

          escapeHtml_(
            fullName ||
            "StockFlow User"
          ) +

        ",</p>" +


        "<p>" +

          "Use the verification code below to continue your StockFlow account registration." +

        "</p>" +


        "<div style=\"" +

          "margin:25px 0;" +
          "padding:22px;" +
          "background:#eef5ff;" +
          "border-radius:14px;" +
          "text-align:center;" +

        "\">" +


          "<div style=\"" +

            "font-size:12px;" +
            "color:#64748b;" +
            "margin-bottom:10px;" +

          "\">" +

            "VERIFICATION CODE" +

          "</div>" +


          "<div style=\"" +

            "font-size:34px;" +
            "font-weight:800;" +
            "letter-spacing:8px;" +
            "color:#10233f;" +

          "\">" +

            otp +

          "</div>" +


        "</div>" +


        "<p>" +

          "This code expires in <b>" +

          OTP_EXPIRATION_MINUTES +

          " minutes</b>." +

        "</p>" +


        "<p style=\"" +

          "font-size:13px;" +
          "color:#64748b;" +

        "\">" +

          "For your security, never share this verification code with another person." +

        "</p>" +


        "<hr style=\"" +

          "border:0;" +
          "border-top:1px solid #e2e8f0;" +
          "margin:25px 0;" +

        "\">" +


        "<p style=\"" +

          "font-size:12px;" +
          "color:#94a3b8;" +

        "\">" +

          "StockFlow Inventory System" +

        "</p>" +


      "</div>" +

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
// ESCAPE HTML
// ============================================================

function escapeHtml_(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(
      /'/g,
      "&#039;"
    );

}


// ============================================================
// REGISTER EMPLOYEE
// ============================================================
//
// PUBLIC ENDPOINT.
//
// IMPORTANT:
// Even if somebody manually sends:
//
// role: "Admin"
//
// the backend ignores it.
//
// Every public registration becomes Employee.
// ============================================================

function registerEmployee_(data) {

  const lock =
    LockService.getScriptLock();


  lock.waitLock(10000);


  try {

    const name =
      normalize_(data.name);


    const username =
      normalize_(data.username);


    const password =
      String(data.password || "");


    const age =
      Number(data.age);


    const gmail =
      normalizeEmail_(data.gmail);


    const phone =
      normalizePhone_(data.phone);


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

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
          "All required registration fields must be completed."

      });

    }


    if (
      name.length < 2
    ) {

      return response({

        success: false,

        message:
          "Please enter a valid full name."

      });

    }


    if (
      !validUsername_(username)
    ) {

      return response({

        success: false,

        message:
          "Username must contain 4–20 valid characters."

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


    if (
      !validEmail_(gmail)
    ) {

      return response({

        success: false,

        message:
          "Please enter a valid Gmail/email address."

      });

    }


    if (
      !validPhone_(phone)
    ) {

      return response({

        success: false,

        message:
          "Please enter a valid Philippine phone number."

      });

    }


    if (
      password.length < 8
    ) {

      return response({

        success: false,

        message:
          "Password must contain at least 8 characters."

      });

    }


    // --------------------------------------------------------
    // DUPLICATE CHECK
    // --------------------------------------------------------

    const duplicate =
      checkDuplicate_(
        username,
        gmail,
        phone
      );


    if (duplicate) {

      return response({

        success: false,

        message: duplicate

      });

    }


    // --------------------------------------------------------
    // GENERATE ACCOUNT DATA
    // --------------------------------------------------------

    const uid =
      generateUID_();


    const otp =
      generateOTP_();


    const otpExpires =
      new Date(
        Date.now() +
        OTP_EXPIRATION_MINUTES *
        60 *
        1000
      );


    const now =
      new Date();


    const passwordHash =
      hashPassword_(password);


    const sheet =
      getSheet();


    // --------------------------------------------------------
    // SAVE EMPLOYEE
    // --------------------------------------------------------

    sheet.appendRow([

      uid,

      name,

      username,

      passwordHash,

      age,

      STATUS_PENDING,

      gmail,

      phone,

      ROLE_EMPLOYEE,

      otp,

      otpExpires,

      0,

      "",

      now,

      now,

      ""

    ]);


    const newRow =
      sheet.getLastRow();


    try {

      // ------------------------------------------------------
      // SEND REAL OTP TO REGISTERED GMAIL
      // ------------------------------------------------------

      sendOTPEmail_(
        gmail,
        name,
        otp,
        false
      );

    } catch (mailError) {

      // Remove account if Gmail delivery fails.

      sheet.deleteRow(
        newRow
      );


      throw new Error(

        "Registration was not completed because the verification email could not be sent. " +

        mailError.message

      );

    }


    return response({

      success: true,

      uid: uid,

      username: username,

      role: ROLE_EMPLOYEE,

      verified: false,

      accountStatus:
        STATUS_PENDING,

      otpSent: true,

      message:
        "Employee registration successful. A real verification code was sent to your Gmail."

    });


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// REGISTER ADMIN
// ============================================================
//
// PROTECTED ENDPOINT.
//
// The request MUST contain:
//
// adminKey
//
// The key is checked against Apps Script Script Properties.
//
// Optional ADMIN_EMAILS allowlist is also checked.
// ============================================================

function registerAdmin_(data) {

  const lock =
    LockService.getScriptLock();


  lock.waitLock(10000);


  try {

    const suppliedKey =
      normalize_(
        data.adminKey
      );


    // --------------------------------------------------------
    // SERVER-SIDE ADMIN KEY
    // --------------------------------------------------------

    if (!suppliedKey) {

      return response({

        success: false,

        message:
          "Admin registration is protected."

      });

    }


    const realKey =
      getAdminRegistrationKey_();


    if (
      suppliedKey !== realKey
    ) {

      return response({

        success: false,

        message:
          "Unauthorized admin registration request."

      });

    }


    // --------------------------------------------------------
    // REGISTRATION DATA
    // --------------------------------------------------------

    const name =
      normalize_(data.name);


    const username =
      normalize_(data.username);


    const password =
      String(data.password || "");


    const age =
      Number(data.age);


    const gmail =
      normalizeEmail_(data.gmail);


    const phone =
      normalizePhone_(data.phone);


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
          "All required admin registration fields must be completed."

      });

    }


    if (
      !validUsername_(username)
    ) {

      return response({

        success: false,

        message:
          "Invalid username."

      });

    }


    if (
      age < 18 ||
      age > 100
    ) {

      return response({

        success: false,

        message:
          "Admin age must be between 18 and 100."

      });

    }


    if (
      !validEmail_(gmail)
    ) {

      return response({

        success: false,

        message:
          "Invalid admin Gmail address."

      });

    }


    if (
      !validPhone_(phone)
    ) {

      return response({

        success: false,

        message:
          "Invalid phone number."

      });

    }


    if (
      password.length < 8
    ) {

      return response({

        success: false,

        message:
          "Password must contain at least 8 characters."

      });

    }


    // --------------------------------------------------------
    // OPTIONAL ADMIN EMAIL ALLOWLIST
    // --------------------------------------------------------

    const adminEmails =
      getAdminEmails_();


    if (
      adminEmails.length > 0 &&
      !adminEmails.includes(gmail)
    ) {

      return response({

        success: false,

        message:
          "This Gmail address is not authorized for admin registration."

      });

    }


    // --------------------------------------------------------
    // DUPLICATE CHECK
    // --------------------------------------------------------

    const duplicate =
      checkDuplicate_(
        username,
        gmail,
        phone
      );


    if (duplicate) {

      return response({

        success: false,

        message: duplicate

      });

    }


    // --------------------------------------------------------
    // GENERATE ADMIN ACCOUNT
    // --------------------------------------------------------

    const uid =
      generateUID_();


    const otp =
      generateOTP_();


    const otpExpires =
      new Date(

        Date.now() +
        OTP_EXPIRATION_MINUTES *
        60 *
        1000

      );


    const now =
      new Date();


    const passwordHash =
      hashPassword_(password);


    const sheet =
      getSheet();


    // --------------------------------------------------------
    // SAVE ADMIN
    // --------------------------------------------------------

    sheet.appendRow([

      uid,

      name,

      username,

      passwordHash,

      age,

      STATUS_PENDING,

      gmail,

      phone,

      ROLE_ADMIN,

      otp,

      otpExpires,

      0,

      "",

      now,

      now,

      ""

    ]);


    const newRow =
      sheet.getLastRow();


    try {

      sendOTPEmail_(
        gmail,
        name,
        otp,
        false
      );

    } catch (mailError) {

      sheet.deleteRow(
        newRow
      );


      throw new Error(

        "Admin registration was not completed because the verification email could not be sent. " +

        mailError.message

      );

    }


    return response({

      success: true,

      uid: uid,

      username: username,

      role: ROLE_ADMIN,

      verified: false,

      accountStatus:
        STATUS_PENDING,

      otpSent: true,

      message:
        "Admin registration successful. A verification code was sent to the authorized Gmail."

    });


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// VERIFY OTP
// ============================================================

function verifyOTP_(data) {

  const identity =
    normalize_(data.identity);


  const otp =
    normalize_(data.otp);


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


  if (
    !/^\d{6}$/.test(otp)
  ) {

    return response({

      success: false,

      message:
        "OTP must contain exactly 6 digits."

    });

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(10000);


  try {

    const found =
      findUser_(identity);


    if (!found) {

      return response({

        success: false,

        message:
          "Account not found."

      });

    }


    const row =
      found.values;


    const status =
      normalize_(row[5])
        .toUpperCase();


    // --------------------------------------------------------
    // ACCOUNT ALREADY VERIFIED
    // --------------------------------------------------------

    if (
      status === STATUS_VERIFIED
    ) {

      return response({

        success: false,

        message:
          "This account is already verified."

      });

    }


    // --------------------------------------------------------
    // CHECK OTP LOCK
    // --------------------------------------------------------

    const lockUntil =
      row[12]
        ? new Date(row[12])
        : null;


    if (
      lockUntil &&
      Date.now() <
      lockUntil.getTime()
    ) {

      const remaining =
        Math.ceil(

          (
            lockUntil.getTime() -
            Date.now()

          ) / 60000

        );


      return response({

        success: false,

        locked: true,

        message:

          "Too many incorrect OTP attempts. Try again in approximately " +

          remaining +

          " minute(s)."

      });

    }


    // --------------------------------------------------------
    // CHECK OTP EXPIRATION
    // --------------------------------------------------------

    const otpExpires =
      row[10]
        ? new Date(row[10])
        : null;


    if (
      !otpExpires ||
      Date.now() >
      otpExpires.getTime()
    ) {

      return response({

        success: false,

        expired: true,

        message:
          "This OTP has expired. Please request a new verification code."

      });

    }


    const storedOTP =
      normalize_(row[9]);


    // --------------------------------------------------------
    // INCORRECT OTP
    // --------------------------------------------------------

    if (
      otp !== storedOTP
    ) {

      let attempts =
        Number(row[11]) || 0;


      attempts++;


      if (
        attempts >= MAX_OTP_ATTEMPTS
      ) {

        const newLockUntil =
          new Date(

            Date.now() +
            OTP_LOCK_MINUTES *
            60 *
            1000

          );


        found.sheet
          .getRange(
            found.rowNumber,
            12,
            1,
            2
          )
          .setValues([

            [
              attempts,
              newLockUntil
            ]

          ]);


        return response({

          success: false,

          locked: true,

          message:

            "Maximum OTP attempts reached. Verification is locked for " +

            OTP_LOCK_MINUTES +

            " minutes."

        });

      }


      found.sheet
        .getRange(
          found.rowNumber,
          12
        )
        .setValue(attempts);


      return response({

        success: false,

        attemptsRemaining:
          MAX_OTP_ATTEMPTS -
          attempts,

        message:
          "Incorrect OTP. " +

          (
            MAX_OTP_ATTEMPTS -
            attempts
          ) +

          " attempt(s) remaining."

      });

    }


    // --------------------------------------------------------
    // SUCCESSFUL VERIFICATION
    // --------------------------------------------------------

    const verifiedAt =
      new Date();


    found.sheet
      .getRange(
        found.rowNumber,
        6
      )
      .setValue(
        STATUS_VERIFIED
      );


    // Clear OTP
    found.sheet
      .getRange(
        found.rowNumber,
        10
      )
      .setValue("");


    // Clear expiration
    found.sheet
      .getRange(
        found.rowNumber,
        11
      )
      .setValue("");


    // Reset attempts
    found.sheet
      .getRange(
        found.rowNumber,
        12
      )
      .setValue(0);


    // Clear lock
    found.sheet
      .getRange(
        found.rowNumber,
        13
      )
      .setValue("");


    // Save verification date
    found.sheet
      .getRange(
        found.rowNumber,
        16
      )
      .setValue(
        verifiedAt
      );


    return response({

      success: true,

      verified: true,

      demo: false,

      uid:
        normalize_(row[0]),

      username:
        normalize_(row[2]),

      role:
        normalize_(row[8]),

      accountStatus:
        STATUS_VERIFIED,

      message:
        "Account verified successfully."

    });


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// RESEND OTP
// ============================================================

function resendOTP_(data) {

  const identity =
    normalize_(data.identity);


  if (!identity) {

    return response({

      success: false,

      message:
        "Username, Gmail or phone number is required."

    });

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(10000);


  try {

    const found =
      findUser_(identity);


    if (!found) {

      return response({

        success: false,

        message:
          "Account not found."

      });

    }


    const row =
      found.values;


    const status =
      normalize_(row[5])
        .toUpperCase();


    // --------------------------------------------------------
    // ALREADY VERIFIED
    // --------------------------------------------------------

    if (
      status === STATUS_VERIFIED
    ) {

      return response({

        success: false,

        message:
          "This account is already verified."

      });

    }


    // --------------------------------------------------------
    // CHECK OTP LOCK
    // --------------------------------------------------------

    const lockUntil =
      row[12]
        ? new Date(row[12])
        : null;


    if (
      lockUntil &&
      Date.now() <
      lockUntil.getTime()
    ) {

      return response({

        success: false,

        locked: true,

        message:
          "OTP verification is temporarily locked. Try again later."

      });

    }


    // --------------------------------------------------------
    // CHECK RESEND COOLDOWN
    // --------------------------------------------------------

    const lastSent =
      row[13]
        ? new Date(row[13])
        : null;


    if (lastSent) {

      const elapsed =
        Math.floor(

          (
            Date.now() -
            lastSent.getTime()

          ) / 1000

        );


      if (
        elapsed <
        RESEND_COOLDOWN_SECONDS
      ) {

        return response({

          success: false,

          cooldown: true,

          remainingSeconds:

            RESEND_COOLDOWN_SECONDS -
            elapsed,

          message:

            "Please wait " +

            (
              RESEND_COOLDOWN_SECONDS -
              elapsed
            ) +

            " seconds before requesting another OTP."

        });

      }

    }


    // --------------------------------------------------------
    // GENERATE NEW OTP
    // --------------------------------------------------------

    const newOTP =
      generateOTP_();


    const newExpires =
      new Date(

        Date.now() +
        OTP_EXPIRATION_MINUTES *
        60 *
        1000

      );


    const now =
      new Date();


    // --------------------------------------------------------
    // UPDATE SHEET
    // --------------------------------------------------------

    found.sheet
      .getRange(
        found.rowNumber,
        6
      )
      .setValue(
        STATUS_PENDING
      );


    found.sheet
      .getRange(
        found.rowNumber,
        10,
        1,
        5
      )
      .setValues([

        [
          newOTP,
          newExpires,
          0,
          "",
          now
        ]

      ]);


    // --------------------------------------------------------
    // SEND NEW REAL OTP
    // --------------------------------------------------------

    try {

      sendOTPEmail_(
        normalize_(row[6]),
        normalize_(row[1]),
        newOTP,
        true
      );

    } catch (mailError) {

      // Do not leave a newly generated unusable OTP.

      found.sheet
        .getRange(
          found.rowNumber,
          10,
          1,
          5
        )
        .setValues([

          [
            row[9],
            row[10],
            row[11],
            row[12],
            row[13]
          ]

        ]);


      throw new Error(

        "Unable to send the new verification email. " +

        mailError.message

      );

    }


    return response({

      success: true,

      otpSent: true,

      expiresInMinutes:
        OTP_EXPIRATION_MINUTES,

      message:
        "A new verification code was sent to your registered Gmail."

    });


  } finally {

    lock.releaseLock();

  }

}


// ============================================================
// LOGIN
// ============================================================

function loginUser_(data) {

  const identity =
    normalize_(data.identity)
      .toLowerCase();


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
    findUser_(identity);


  if (!found) {

    return response({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  const row =
    found.values;


  const storedPasswordHash =
    normalize_(row[3]);


  const passwordHash =
    hashPassword_(
      password
    );


  // ----------------------------------------------------------
  // PASSWORD CHECK
  // ----------------------------------------------------------

  if (
    passwordHash !==
    storedPasswordHash
  ) {

    return response({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  // ----------------------------------------------------------
  // ACCOUNT STATUS
  // ----------------------------------------------------------

  const status =
    normalize_(row[5])
      .toUpperCase();


  if (
    status === STATUS_SUSPENDED
  ) {

    return response({

      success: false,

      message:
        "This account has been suspended."

    });

  }


  if (
    status === STATUS_DISABLED
  ) {

    return response({

      success: false,

      message:
        "This account has been disabled."

    });

  }


  if (
    status !== STATUS_VERIFIED
  ) {

    return response({

      success: false,

      verified: false,

      message:
        "Account is not verified. Please verify the OTP sent to your Gmail."

    });

  }


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  return response({

    success: true,

    verified: true,

    message:
      "Login successful.",

    user: {

      uid:
        normalize_(row[0]),

      name:
        normalize_(row[1]),

      username:
        normalize_(row[2]),

      age:
        row[4],

      accountStatus:
        normalize_(row[5]),

      gmail:
        normalize_(row[6]),

      phone:
        normalize_(row[7]),

      role:
        normalize_(row[8]) ||
        ROLE_EMPLOYEE

    }

  });

}


// ============================================================
// GET USER
// ============================================================

function getUser_(data) {

  const identity =
    normalize_(data.identity);


  if (!identity) {

    return response({

      success: false,

      message:
        "Username, Gmail or phone number is required."

    });

  }


  const found =
    findUser_(identity);


  if (!found) {

    return response({

      success: false,

      message:
        "User not found."

    });

  }


  const row =
    found.values;


  return response({

    success: true,

    user: {

      uid:
        normalize_(row[0]),

      name:
        normalize_(row[1]),

      username:
        normalize_(row[2]),

      age:
        row[4],

      accountStatus:
        normalize_(row[5]),

      gmail:
        normalize_(row[6]),

      phone:
        normalize_(row[7]),

      role:
        normalize_(row[8]) ||
        ROLE_EMPLOYEE

    }

  });

}


// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================
//
// Intended for your admin dashboard.
//
// NOTE:
// This endpoint should eventually require an authenticated
// admin session/token before allowing status changes.
// ============================================================

function updateAccountStatus_(data) {

  const username =
    normalize_(data.username)
      .toLowerCase();


  const status =
    normalize_(data.status)
      .toUpperCase();


  const allowedStatuses = [

    STATUS_PENDING,

    STATUS_VERIFIED,

    STATUS_SUSPENDED,

    STATUS_DISABLED

  ];


  if (
    !username
  ) {

    return response({

      success: false,

      message:
        "Username is required."

    });

  }


  if (
    !allowedStatuses.includes(status)
  ) {

    return response({

      success: false,

      message:
        "Invalid account status."

    });

  }


  const found =
    findUser_(username);


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
      6
    )
    .setValue(status);


  return response({

    success: true,

    message:
      "Account status updated successfully."

  });

}


// ============================================================
// FORGOT PASSWORD
// ============================================================
//
// Does not expose whether an account exists.
// ============================================================

function forgotPassword_(data) {

  const identity =
    normalize_(data.identity);


  if (!identity) {

    return response({

      success: false,

      message:
        "Email, username or phone number is required."

    });

  }


  const found =
    findUser_(identity);


  // Always return a generic message.

  if (!found) {

    return response({

      success: true,

      message:
        "If the account exists, password recovery instructions will be sent."

    });

  }


  // ----------------------------------------------------------
  // PASSWORD RESET CAN BE CONNECTED HERE.
  //
  // For the current system, we don't change the password
  // automatically.
  // ----------------------------------------------------------

  return response({

    success: true,

    message:
      "If the account exists, password recovery instructions will be sent."

  });

}


// ============================================================
// ADMIN SECURITY TEST
// ============================================================
//
// Run this manually from Apps Script to verify that the
// ADMIN_REGISTRATION_KEY exists.
// ============================================================

function testAdminConfiguration() {

  const key =
    getAdminRegistrationKey_();


  console.log(
    "ADMIN_REGISTRATION_KEY is configured."
  );


  const adminEmails =
    getAdminEmails_();


  console.log(
    "Authorized admin emails:",
    adminEmails
  );

}


// ============================================================
// TEST GMAIL
// ============================================================
//
// Run this manually once from Apps Script.
//
// Replace the email with your own Gmail.
// ============================================================

function testGmailOTP() {

  const email =
    "YOUR_GMAIL@gmail.com";


  const otp =
    generateOTP_();


  sendOTPEmail_(
    email,
    "StockFlow Admin",
    otp,
    false
  );


  console.log(
    "Test OTP sent to:",
    email
  );


  console.log(
    "OTP:",
    otp
  );

}
