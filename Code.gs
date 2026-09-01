// ============================================================
// STOCKFLOW AUTHENTICATION BACKEND
// ============================================================
// FEATURES
// ============================================================
// 1. Employee registration
// 2. Real Gmail OTP
// 3. OTP expiration
// 4. OTP verification
// 5. OTP resend
// 6. Login
// 7. Password recovery
// 8. Recovery OTP
// 9. Recovery OTP verification
// 10. Password reset
// 11. Account status management
// 12. Demo OTP: 123456
//
// IMPORTANT
// ------------------------------------------------------------
// The REAL OTP is stored server-side in Google Sheets.
// The real OTP is NEVER returned to the frontend.
//
// DEMO OTP:
// 123456
//
// Demo OTP is for prototype/demo access only.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_NAME = "USER";

const SHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const APP_NAME = "StockFlow";

const OTP_MINUTES = 10;

const DEMO_OTP = "123456";


// ============================================================
// SHEET HEADERS
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
  "OTP EXPIRES",
  "OTP PURPOSE",
  "OTP VERIFIED",
  "RECOVERY OTP",
  "RECOVERY EXPIRES",
  "RECOVERY VERIFIED",
  "CREATED AT",
  "VERIFIED AT",
  "RESET AT"

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

  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS.length
      )
      .getValues()[0];


  let needsUpdate = false;


  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    if (
      currentHeaders[i] !==
      HEADERS[i]
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
// GET ALL USER ROWS
// ============================================================

function getRows(sheet) {

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

  return normalize(
    value
  ).toLowerCase();

}


// ============================================================
// NORMALIZE PHONE
// ============================================================

function normalizePhone(value) {

  let phone =
    normalize(value)
      .replace(
        /[\s()-]/g,
        ""
      );


  // Convert Philippine
  // 09XXXXXXXXX
  // to +639XXXXXXXXX

  if (
    /^09\d{9}$/.test(phone)
  ) {

    phone =
      "+63" +
      phone.substring(1);

  }


  return phone;

}


// ============================================================
// FIND USER
// ============================================================
// Identity may be:
// - username
// - email
// - phone
// ============================================================

function findUser(identity) {

  const sheet =
    getSheet();

  const rows =
    getRows(sheet);


  const target =
    normalize(identity)
      .toLowerCase();


  const targetPhone =
    normalizePhone(identity);


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const row =
      rows[i];


    const username =
      normalize(
        row[1]
      ).toLowerCase();


    const email =
      normalize(
        row[5]
      ).toLowerCase();


    const phone =
      normalizePhone(
        row[6]
      );


    if (

      target === username ||

      target === email ||

      (
        targetPhone &&
        targetPhone === phone
      )

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
      Math.random() *
      900000
    )

  );

}


// ============================================================
// OTP EXPIRATION
// ============================================================

function getOTPExpiration() {

  return new Date(

    Date.now() +
    OTP_MINUTES *
    60 *
    1000

  );

}


// ============================================================
// EMAIL ESCAPE
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
// SEND GMAIL OTP
// ============================================================

function sendGmailOTP(
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


  let subject;


  if (
    purpose === "recovery"
  ) {

    subject =
      "StockFlow - Password Recovery Code";

  } else if (
    purpose === "resend"
  ) {

    subject =
      "StockFlow - New Verification Code";

  } else {

    subject =
      "StockFlow - Account Verification Code";

  }


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

    (
      purpose === "recovery"
        ? "Use this code to continue resetting your StockFlow password."
        : "Use this code to verify your StockFlow account."
    ) +

    "\n\n" +

    "If you did not request this code, please ignore this email.\n\n" +

    "StockFlow";


  const htmlBody =

    "<div style=\"" +
      "font-family:Arial,sans-serif;" +
      "max-width:560px;" +
      "margin:auto;" +
      "padding:20px;" +
    "\">" +

      "<h2 style=\"" +
        "color:#1769e0;" +
        "margin-bottom:20px;" +
      "\">" +

        "StockFlow" +

      "</h2>" +

      "<p>Hello " +

        escapeHtml(
          fullName ||
          "StockFlow User"
        ) +

      ",</p>" +


      "<p>" +

        (
          purpose === "recovery"
            ? "We received a request to reset your StockFlow password."
            : "Your StockFlow verification code is:"
        ) +

      "</p>" +


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


      (
        purpose === "recovery"

          ?

          "<p>" +
            "If you did not request a password reset, " +
            "you can safely ignore this email." +
          "</p>"

          :

          "<p>" +
            "If you did not request this code, " +
            "you can safely ignore this email." +
          "</p>"

      ) +


      "<p style=\"" +
        "color:#64748b;" +
        "font-size:13px;" +
      "\">" +

        "Never share your verification code with anyone." +

      "</p>" +


      "<p>— StockFlow</p>" +

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
// TEST API
// ============================================================

function doGet() {

  return response({

    success: true,

    message:
      "StockFlow Google Apps Script API is running.",

    system:
      "StockFlow Inventory System"

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

        ?

        e.postData.contents

        :

        "{}";


    const data =
      JSON.parse(raw);


    const action =
      normalize(
        data.action
      );


    switch (action) {


      // ------------------------------------------------------
      // REGISTRATION
      // ------------------------------------------------------

      case "register":

        return registerUser(data);


      // ------------------------------------------------------
      // VERIFY REGISTRATION OTP
      // ------------------------------------------------------

      case "verifyOtp":

        return verifyOTP(data);


      // ------------------------------------------------------
      // RESEND REGISTRATION OTP
      // ------------------------------------------------------

      case "resendOtp":

      case "requestOtp":

        return resendOTP(data);


      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      case "login":

        return loginUser(data);


      // ------------------------------------------------------
      // PASSWORD RECOVERY
      // ------------------------------------------------------

      case "forgotPassword":

        return forgotPassword(data);


      // ------------------------------------------------------
      // REQUEST RECOVERY OTP
      // ------------------------------------------------------

      case "requestRecoveryOtp":

        return requestRecoveryOTP(data);


      // ------------------------------------------------------
      // VERIFY RECOVERY OTP
      // ------------------------------------------------------

      case "verifyRecoveryOtp":

        return verifyRecoveryOTP(data);


      // ------------------------------------------------------
      // RESET PASSWORD
      // ------------------------------------------------------

      case "resetPassword":

        return resetPassword(data);


      // ------------------------------------------------------
      // GET USER
      // ------------------------------------------------------

      case "getUser":

        return getUser(data);


      // ------------------------------------------------------
      // UPDATE STATUS
      // ------------------------------------------------------

      case "updateStatus":

        return updateAccountStatus(data);


      default:

        return response({

          success: false,

          message:
            "Unknown API action."

        });

    }


  } catch (error) {

    console.error(error);


    return response({

      success: false,

      message:
        error.message ||
        "Server error."

    });

  }

}


// ============================================================
// REGISTER USER
// ============================================================

function registerUser(data) {

  const sheet =
    getSheet();


  const rows =
    getRows(sheet);


  const name =
    normalize(data.name);


  const username =
    normalize(data.username);


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
        "Invalid Gmail/email address."

    });

  }


  if (
    !/^(\+639\d{9})$/.test(
      phone
    )
  ) {

    return response({

      success: false,

      message:
        "Invalid Philippine phone number."

    });

  }


  // ----------------------------------------------------------
  // DUPLICATE CHECK
  // ----------------------------------------------------------

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    const existingUsername =
      normalize(
        rows[i][1]
      ).toLowerCase();


    const existingEmail =
      normalizeEmail(
        rows[i][5]
      );


    const existingPhone =
      normalizePhone(
        rows[i][6]
      );


    if (
      existingUsername ===
      username.toLowerCase()
    ) {

      return response({

        success: false,

        message:
          "Username already exists."

      });

    }


    if (
      existingEmail ===
      gmail
    ) {

      return response({

        success: false,

        message:
          "Gmail address already exists."

      });

    }


    if (
      existingPhone ===
      phone
    ) {

      return response({

        success: false,

        message:
          "Phone number already exists."

      });

    }

  }


  // ----------------------------------------------------------
  // GENERATE REAL OTP
  // ----------------------------------------------------------

  const otp =
    generateOTP();


  const expires =
    getOTPExpiration();


  const createdAt =
    new Date();


  // ----------------------------------------------------------
  // PUBLIC REGISTRATION = EMPLOYEE ONLY
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

    "registration",

    false,

    "",

    "",

    false,

    createdAt,

    "",

    ""

  ]);


  const newRow =
    sheet.getLastRow();


  try {

    sendGmailOTP(

      gmail,

      name,

      otp,

      "registration"

    );

  } catch (mailError) {

    sheet.deleteRow(
      newRow
    );

    throw new Error(

      "Registration could not be completed because the verification email could not be sent. " +

      mailError.message

    );

  }


  return response({

    success: true,

    username:
      username,

    role:
      "Employee",

    otpSent:
      true,

    demoOtp:
      DEMO_OTP,

    message:
      "Registration successful. A verification code was sent to your Gmail."

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
    findUser(identity);


  if (!found) {

    return response({

      success: false,

      message:
        "Account not found."

    });

  }


  const row =
    found.row;


  const storedOTP =
    normalize(
      row[7]
    );


  const expires =
    row[8]
      ? new Date(row[8])
      : null;


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


    found.sheet
      .getRange(
        found.rowNumber,
        11
      )
      .setValue(
        false
      );


    return response({

      success: true,

      verified: false,

      demo: true,

      accountStatus:
        "Demo",

      message:
        "Demo mode activated. Your account is not fully verified."

    });

  }


  // ----------------------------------------------------------
  // REAL OTP
  // ----------------------------------------------------------

  if (
    !storedOTP ||
    otp !== storedOTP
  ) {

    return response({

      success: false,

      message:
        "Invalid verification code."

    });

  }


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
  // ACTIVATE ACCOUNT
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      5
    )
    .setValue(
      "VERIFIED"
    );


  found.sheet
    .getRange(
      found.rowNumber,
      11
    )
    .setValue(
      true
    );


  found.sheet
    .getRange(
      found.rowNumber,
      8,
      1,
      2
    )
    .clearContent();


  found.sheet
    .getRange(
      found.rowNumber,
      16
    )
    .setValue(
      new Date()
    );


  return response({

    success: true,

    verified: true,

    demo: false,

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
    findUser(identity);


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
    status === "VERIFIED"
  ) {

    return response({

      success: false,

      message:
        "This account is already verified."

    });

  }


  const newOTP =
    generateOTP();


  const newExpiration =
    getOTPExpiration();


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
      newExpiration
    );


  found.sheet
    .getRange(
      found.rowNumber,
      10
    )
    .setValue(
      "registration"
    );


  try {

    sendGmailOTP(

      normalizeEmail(row[5]),

      normalize(row[0]),

      newOTP,

      "resend"

    );

  } catch (error) {

    throw new Error(

      "Unable to send the new verification code. " +

      error.message

    );

  }


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
// LOGIN
// ============================================================

function loginUser(data) {

  const identity =
    normalize(
      data.identity
    );


  const password =
    String(
      data.password ||
      ""
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
    findUser(identity);


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
      row[2] ||
      ""
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
    status === "DEMO"
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
  // VERIFIED ACCOUNT
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
        "VERIFIED",

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
// This is the endpoint used by your existing
// forgot-password.html.
//
// It immediately creates and sends the recovery OTP.
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
        "Email or phone number is required."

    });

  }


  const found =
    findUser(identity);


  // ----------------------------------------------------------
  // SECURITY:
// Do not reveal whether an account exists.
// ----------------------------------------------------------

  if (!found) {

    return response({

      success: true,

      recoveryStarted: false,

      message:
        "If an account matches the information provided, a recovery code will be sent."

    });

  }


  const row =
    found.row;


  const status =
    normalize(
      row[4]
    ).toUpperCase();


  // ----------------------------------------------------------
  // DISABLED ACCOUNT
  // ----------------------------------------------------------

  if (
    status ===
    "DISABLED"
  ) {

    return response({

      success: false,

      message:
        "This account is disabled. Please contact the administrator."

    });

  }


  // ----------------------------------------------------------
  // GENERATE RECOVERY OTP
  // ----------------------------------------------------------

  const recoveryOTP =
    generateOTP();


  const expiration =
    getOTPExpiration();


  found.sheet
    .getRange(
      found.rowNumber,
      12
    )
    .setValue(
      recoveryOTP
    );


  found.sheet
    .getRange(
      found.rowNumber,
      13
    )
    .setValue(
      expiration
    );


  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      false
    );


  try {

    sendGmailOTP(

      normalizeEmail(row[5]),

      normalize(row[0]),

      recoveryOTP,

      "recovery"

    );

  } catch (error) {

    found.sheet
      .getRange(
        found.rowNumber,
        12,
        1,
        3
      )
      .clearContent();


    throw new Error(

      "Recovery email could not be sent. " +

      error.message

    );

  }


  return response({

    success: true,

    recoveryStarted: true,

    otpSent: true,

    // Only tells frontend that demo exists.
    // The REAL OTP is NEVER returned.

    demoOtp:
      DEMO_OTP,

    message:
      "If the account exists, a recovery code has been sent to the registered Gmail."

  });

}


// ============================================================
// REQUEST RECOVERY OTP
// ============================================================
// This is useful if the frontend has a dedicated
// "Send code again" button.
// ============================================================

function requestRecoveryOTP(data) {

  return forgotPassword(data);

}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================

function verifyRecoveryOTP(data) {

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
        "Recovery identity and OTP are required."

    });

  }


  const found =
    findUser(identity);


  if (!found) {

    return response({

      success: false,

      message:
        "Invalid recovery request."

    });

  }


  const row =
    found.row;


  const storedOTP =
    normalize(
      row[11]
    );


  const expiration =
    row[12]
      ? new Date(row[12])
      : null;


  // ----------------------------------------------------------
  // DEMO RECOVERY
  // ----------------------------------------------------------

  if (
    otp === DEMO_OTP
  ) {

    found.sheet
      .getRange(
        found.rowNumber,
        14
      )
      .setValue(
        true
      );


    return response({

      success: true,

      demo: true,

      recoveryVerified:
        true,

      message:
        "Demo recovery verification successful."

    });

  }


  // ----------------------------------------------------------
  // REAL RECOVERY OTP
  // ----------------------------------------------------------

  if (
    !storedOTP ||
    otp !== storedOTP
  ) {

    return response({

      success: false,

      message:
        "Invalid recovery code."

    });

  }


  if (
    expiration &&
    Date.now() >
    expiration.getTime()
  ) {

    return response({

      success: false,

      message:
        "This recovery code has expired. Please request a new one."

    });

  }


  // ----------------------------------------------------------
  // MARK RECOVERY AS VERIFIED
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      true
    );


  return response({

    success: true,

    demo: false,

    recoveryVerified:
      true,

    message:
      "Recovery code verified successfully."

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
      ""
    );


  const confirmPassword =
    String(
      data.confirmPassword ||
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
  // PASSWORD VALIDATION
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


  if (
    confirmPassword &&
    newPassword !==
    confirmPassword
  ) {

    return response({

      success: false,

      message:
        "Passwords do not match."

    });

  }


  const found =
    findUser(identity);


  if (!found) {

    return response({

      success: false,

      message:
        "Unable to process password reset."

    });

  }


  const row =
    found.row;


  const recoveryVerified =
    row[13] === true;


  // ----------------------------------------------------------
  // SECURITY CHECK
  // ----------------------------------------------------------

  if (
    !recoveryVerified
  ) {

    return response({

      success: false,

      message:
        "Recovery verification is required before changing the password."

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
  // CLEAR RECOVERY DATA
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      12,
      1,
      3
    )
    .clearContent();


  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      false
    );


  found.sheet
    .getRange(
      found.rowNumber,
      17
    )
    .setValue(
      new Date()
    );


  return response({

    success: true,

    passwordReset:
      true,

    message:
      "Password reset successfully. You can now log in with your new password."

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


  if (!identity) {

    return response({

      success: false,

      message:
        "Username, email or phone is required."

    });

  }


  const found =
    findUser(identity);


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
    findUser(username);


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
