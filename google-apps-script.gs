// ============================================================
// STOCKFLOW AUTHENTICATION API
// Google Apps Script + Google Sheets + Gmail
//
// FEATURES
// ------------------------------------------------------------
// 1. Employee registration
// 2. Gmail OTP registration verification
// 3. OTP expiration
// 4. OTP resend
// 5. Login
// 6. Forgot password
// 7. Password recovery OTP via Gmail
// 8. Recovery OTP expiration
// 9. Password reset
// 10. Protected account status handling
//
// IMPORTANT
// ------------------------------------------------------------
// - Real OTPs stay on the server.
// - Real OTPs are NEVER returned to the frontend.
// - Demo OTP can be handled separately by auth.js.
// - Password reset requires a valid recovery OTP.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_NAME = "Users";

const OTP_MINUTES = 10;

const RESEND_COOLDOWN_SECONDS = 60;

const APP_NAME = "StockFlow";


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
  "OTP_TYPE",
  "OTP_EXPIRES",
  "RESET_TOKEN",
  "RESET_EXPIRES",
  "CREATED_AT",
  "VERIFIED_AT"
];


// ============================================================
// GET SHEET
// ============================================================

function getSheet_() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    ss.getSheetByName(SHEET_NAME);

  if (!sheet) {

    sheet =
      ss.insertSheet(SHEET_NAME);

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

  const currentColumns =
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

  let different = false;

  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    if (
      current[i] !==
      HEADERS[i]
    ) {

      different = true;
      break;

    }

  }

  if (different) {

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
      .setFontWeight("bold");

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
// NORMALIZE
// ============================================================

function normalize_(value) {

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml_(value) {

  return String(value || "")
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
// GENERATE OTP
// ============================================================

function generateOTP_() {

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

function getOTPExpiration_() {

  return new Date(
    Date.now() +
    OTP_MINUTES *
    60 *
    1000
  );

}


// ============================================================
// FIND USER
// ============================================================

function findUser_(identity) {

  const sheet =
    getSheet_();

  const values =
    sheet
      .getDataRange()
      .getValues();

  const target =
    normalize_(
      identity
    ).toLowerCase();

  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const username =
      normalize_(
        values[i][1]
      ).toLowerCase();

    const gmail =
      normalize_(
        values[i][5]
      ).toLowerCase();

    const phone =
      normalize_(
        values[i][6]
      );

    if (
      target === username ||
      target === gmail ||
      target === phone
    ) {

      return {

        sheet: sheet,

        rowNumber:
          i + 1,

        values:
          values[i]

      };

    }

  }

  return null;

}


// ============================================================
// SEND OTP EMAIL
// ============================================================

function sendOTPEmail_(
  email,
  name,
  otp,
  type
) {

  if (!email) {

    throw new Error(
      "Registered Gmail address is missing."
    );

  }

  const isRecovery =
    type === "recovery";

  const subject =
    isRecovery
      ? "StockFlow - Password Recovery Code"
      : "StockFlow - Account Verification Code";


  const purpose =
    isRecovery
      ? "password recovery"
      : "account verification";


  const plainText =

    "Hello " +
    (name || "StockFlow User") +
    ",\n\n" +

    "Your StockFlow " +
    purpose +
    " code is:\n\n" +

    otp +
    "\n\n" +

    "This code expires in " +
    OTP_MINUTES +
    " minutes.\n\n" +

    "If you did not request this code, " +
    "you can safely ignore this email.\n\n" +

    "StockFlow";


  const html =

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
      escapeHtml_(
        name ||
        "StockFlow User"
      ) +
      ",</p>" +

      "<p>" +

        (
          isRecovery
            ? "We received a request to reset your StockFlow password."
            : "Please use the verification code below to verify your StockFlow account."
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
        " minutes</b>." +

      "</p>" +

      "<p style=\"" +
      "color:#64748b;" +
      "font-size:13px;" +
      "\">" +

        "Never share this verification code with anyone." +

      "</p>" +

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

    htmlBody: html,

    name: APP_NAME

  });

}


// ============================================================
// GET API
// ============================================================

function doGet(e) {

  const action =
    e &&
    e.parameter &&
    e.parameter.action
      ? e.parameter.action
      : "health";


  if (
    action ===
    "health"
  ) {

    return json_({

      success: true,

      service:
        "StockFlow Google Sheets API",

      status:
        "online"

    });

  }


  return json_({

    success: false,

    message:
      "Unknown GET action."

  });

}


// ============================================================
// POST API
// ============================================================

function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      return json_({

        success: false,

        message:
          "Request body is missing."

      });

    }


    const data =
      JSON.parse(
        e.postData.contents
      );


    const action =
      normalize_(
        data.action
      );


    switch (action) {


      // ------------------------------------------------------
      // REGISTRATION
      // ------------------------------------------------------

      case "register":

        return register_(
          data
        );


      // ------------------------------------------------------
      // VERIFY REGISTRATION OTP
      // ------------------------------------------------------

      case "verifyOtp":

        return verifyOTP_(
          data
        );


      // ------------------------------------------------------
      // RESEND REGISTRATION OTP
      // ------------------------------------------------------

      case "requestOtp":

        return resendOTP_(
          data
        );


      case "resendOtp":

        return resendOTP_(
          data
        );


      case "updateOtp":

        return resendOTP_(
          data
        );


      // ------------------------------------------------------
      // LOGIN
      // ------------------------------------------------------

      case "login":

        return login_(
          data
        );


      // ------------------------------------------------------
      // FORGOT PASSWORD
      // ------------------------------------------------------

      case "forgotPassword":

        return forgotPassword_(
          data
        );


      // ------------------------------------------------------
      // VERIFY RECOVERY OTP
      // ------------------------------------------------------

      case "verifyRecoveryOtp":

        return verifyRecoveryOTP_(
          data
        );


      // ------------------------------------------------------
      // RESET PASSWORD
      // ------------------------------------------------------

      case "resetPassword":

        return resetPassword_(
          data
        );


      // ------------------------------------------------------
      // GET USER
      // ------------------------------------------------------

      case "getUser":

        return getUser_(
          data
        );


      // ------------------------------------------------------
      // UPDATE ACCOUNT STATUS
      // ------------------------------------------------------

      case "updateStatus":

        return updateAccountStatus_(
          data
        );


      default:

        return json_({

          success: false,

          message:
            "Unknown API action."

        });

    }


  } catch (error) {

    console.error(
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
// REGISTER USER
// ============================================================

function register_(data) {

  const sheet =
    getSheet_();

  const values =
    sheet
      .getDataRange()
      .getValues();


  const name =
    normalize_(
      data.name
    );

  const username =
    normalize_(
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
    normalize_(
      data.gmail
    ).toLowerCase();

  const phone =
    normalize_(
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

    return json_({

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

    return json_({

      success: false,

      message:
        "Invalid Gmail/email address."

    });

  }


  if (
    age < 18 ||
    age > 100
  ) {

    return json_({

      success: false,

      message:
        "Age must be between 18 and 100."

    });

  }


  // ----------------------------------------------------------
  // CHECK DUPLICATES
  // ----------------------------------------------------------

  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const existingUsername =
      normalize_(
        values[i][1]
      ).toLowerCase();

    const existingEmail =
      normalize_(
        values[i][5]
      ).toLowerCase();

    const existingPhone =
      normalize_(
        values[i][6]
      );


    if (
      existingUsername ===
      username.toLowerCase()
    ) {

      return json_({

        success: false,

        message:
          "Username already exists."

      });

    }


    if (
      existingEmail ===
      gmail
    ) {

      return json_({

        success: false,

        message:
          "Email already exists."

      });

    }


    if (
      existingPhone ===
      phone
    ) {

      return json_({

        success: false,

        message:
          "Phone number already exists."

      });

    }

  }


  // ----------------------------------------------------------
  // PUBLIC REGISTRATION IS EMPLOYEE ONLY
  // ----------------------------------------------------------

  const accountStatus =
    "PENDING";


  const otp =
    generateOTP_();

  const otpExpires =
    getOTPExpiration_();


  // ----------------------------------------------------------
  // SAVE ACCOUNT
  // ----------------------------------------------------------

  sheet.appendRow([

    name,

    username,

    password,

    age,

    accountStatus,

    gmail,

    phone,

    otp,

    "registration",

    otpExpires,

    "",

    "",

    new Date(),

    ""

  ]);


  try {

    sendOTPEmail_(
      gmail,
      name,
      otp,
      "registration"
    );

  } catch (mailError) {

    sheet.deleteRow(
      sheet.getLastRow()
    );

    return json_({

      success: false,

      message:
        "Registration failed because the verification email could not be sent."

    });

  }


  return json_({

    success: true,

    message:
      "Registration successful. A verification OTP was sent to your Gmail.",

    username:
      username,

    otpSent:
      true,

    expiresIn:
      OTP_MINUTES * 60

  });

}


// ============================================================
// VERIFY REGISTRATION OTP
// ============================================================

function verifyOTP_(data) {

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

    return json_({

      success: false,

      message:
        "Username/email and OTP are required."

    });

  }


  const found =
    findUser_(
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Account not found."

    });

  }


  const row =
    found.values;


  const storedOTP =
    normalize_(
      row[7]
    );

  const otpType =
    normalize_(
      row[8]
    ).toLowerCase();

  const expires =
    row[9]
      ? new Date(
          row[9]
        )
      : null;


  if (
    otpType !==
    "registration"
  ) {

    return json_({

      success: false,

      message:
        "This OTP is not a registration verification code."

    });

  }


  if (
    !storedOTP ||
    otp !== storedOTP
  ) {

    return json_({

      success: false,

      message:
        "Invalid OTP."

    });

  }


  if (
    expires &&
    Date.now() >
    expires.getTime()
  ) {

    return json_({

      success: false,

      message:
        "This OTP has expired. Please request a new code."

    });

  }


  // ----------------------------------------------------------
  // VERIFY
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
      8,
      1,
      2
    )
    .setValues([

      [
        "",
        ""

      ]

    ]);


  found.sheet
    .getRange(
      found.rowNumber,
      10
    )
    .setValue(
      ""
    );


  found.sheet
    .getRange(
      found.rowNumber,
      14
    )
    .setValue(
      new Date()
    );


  return json_({

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

function resendOTP_(data) {

  const identity =
    normalize_(
      data.identity
    );


  if (!identity) {

    return json_({

      success: false,

      message:
        "Username or email is required."

    });

  }


  const found =
    findUser_(
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Account not found."

    });

  }


  const row =
    found.values;


  const status =
    normalize_(
      row[4]
    ).toUpperCase();


  if (
    status ===
    "VERIFIED"
  ) {

    return json_({

      success: false,

      message:
        "This account is already verified."

    });

  }


  const newOTP =
    generateOTP_();

  const expires =
    getOTPExpiration_();


  found.sheet
    .getRange(
      found.rowNumber,
      8,
      1,
      3
    )
    .setValues([

      [
        newOTP,
        "registration",
        expires
      ]

    ]);


  try {

    sendOTPEmail_(
      normalize_(
        row[5]
      ),
      normalize_(
        row[0]
      ),
      newOTP,
      "registration"
    );

  } catch (error) {

    return json_({

      success: false,

      message:
        "Unable to send the new OTP."

    });

  }


  return json_({

    success: true,

    otpSent: true,

    expiresIn:
      OTP_MINUTES * 60,

    message:
      "A new verification OTP was sent to your Gmail."

  });

}


// ============================================================
// LOGIN
// ============================================================

function login_(data) {

  const identity =
    normalize_(
      data.identity
    ).toLowerCase();

  const password =
    String(
      data.password || ""
    );


  if (
    !identity ||
    !password
  ) {

    return json_({

      success: false,

      message:
        "Username/email and password are required."

    });

  }


  const found =
    findUser_(
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  const row =
    found.values;


  const savedPassword =
    String(
      row[2] || ""
    );


  if (
    password !==
    savedPassword
  ) {

    return json_({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  const status =
    normalize_(
      row[4]
    ).toUpperCase();


  if (
    status !==
    "VERIFIED"
  ) {

    return json_({

      success: false,

      verified: false,

      message:
        "Your account is not verified yet. Please complete OTP verification first."

    });

  }


  return json_({

    success: true,

    verified: true,

    demo: false,

    message:
      "Login successful.",

    user: {

      name:
        normalize_(
          row[0]
        ),

      username:
        normalize_(
          row[1]
        ),

      age:
        row[3],

      accountStatus:
        row[4],

      gmail:
        normalize_(
          row[5]
        ),

      phone:
        normalize_(
          row[6]
        ),

      role:
        "Employee"

    }

  });

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

    return json_({

      success: false,

      message:
        "Email or phone number is required."

    });

  }


  const found =
    findUser_(
      identity
    );


  // ----------------------------------------------------------
  // DO NOT REVEAL WHETHER ACCOUNT EXISTS
  // ----------------------------------------------------------

  if (!found) {

    return json_({

      success: true,

      recoveryStarted: false,

      message:
        "If an account matches the information provided, a recovery code will be sent."

    });

  }


  const row =
    found.values;


  const email =
    normalize_(
      row[5]
    );


  if (!email) {

    return json_({

      success: true,

      recoveryStarted: false,

      message:
        "If an account matches the information provided, recovery instructions will be sent."

    });

  }


  // ----------------------------------------------------------
  // GENERATE RECOVERY OTP
  // ----------------------------------------------------------

  const otp =
    generateOTP_();

  const expires =
    getOTPExpiration_();


  // ----------------------------------------------------------
  // SAVE RECOVERY OTP
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      8,
      1,
      3
    )
    .setValues([

      [
        otp,
        "recovery",
        expires
      ]

    ]);


  try {

    sendOTPEmail_(
      email,
      normalize_(
        row[0]
      ),
      otp,
      "recovery"
    );

  } catch (error) {

    // Remove recovery OTP if email fails.

    found.sheet
      .getRange(
        found.rowNumber,
        8,
        1,
        3
      )
      .setValues([

        [
          "",
          "",
          ""
        ]

      ]);


    return json_({

      success: false,

      message:
        "Unable to send the recovery email. Please try again later."

    });

  }


  return json_({

    success: true,

    recoveryStarted: true,

    otpSent: true,

    identity:
      normalize_(
        row[1]
      ),

    expiresIn:
      OTP_MINUTES * 60,

    message:
      "A password recovery code has been sent to your registered Gmail."

  });

}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================

function verifyRecoveryOTP_(data) {

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

    return json_({

      success: false,

      message:
        "Account identity and recovery code are required."

    });

  }


  const found =
    findUser_(
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Invalid recovery code."

    });

  }


  const row =
    found.values;


  const storedOTP =
    normalize_(
      row[7]
    );

  const otpType =
    normalize_(
      row[8]
    ).toLowerCase();

  const expires =
    row[9]
      ? new Date(
          row[9]
        )
      : null;


  if (
    otpType !==
    "recovery"
  ) {

    return json_({

      success: false,

      message:
        "Invalid recovery code."

    });

  }


  if (
    !storedOTP ||
    otp !== storedOTP
  ) {

    return json_({

      success: false,

      message:
        "Invalid recovery code."

    });

  }


  if (
    expires &&
    Date.now() >
    expires.getTime()
  ) {

    return json_({

      success: false,

      message:
        "This recovery code has expired. Request a new code."

    });

  }


  // ----------------------------------------------------------
  // CREATE SHORT-LIVED RESET TOKEN
  // ----------------------------------------------------------

  const resetToken =
    Utilities
      .getUuid();


  const resetExpires =
    new Date(
      Date.now() +
      10 * 60 * 1000
    );


  found.sheet
    .getRange(
      found.rowNumber,
      11,
      1,
      2
    )
    .setValues([

      [
        resetToken,
        resetExpires
      ]

    ]);


  // ----------------------------------------------------------
  // CLEAR OTP
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      8,
      1,
      3
    )
    .setValues([

      [
        "",
        "",
        ""
      ]

    ]);


  return json_({

    success: true,

    recoveryVerified: true,

    resetToken:
      resetToken,

    expiresIn:
      10 * 60,

    message:
      "Recovery code verified. You may now create a new password."

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

  const resetToken =
    normalize_(
      data.resetToken
    );

  const newPassword =
    String(
      data.newPassword || ""
    );


  if (
    !identity ||
    !resetToken ||
    !newPassword
  ) {

    return json_({

      success: false,

      message:
        "Password reset information is incomplete."

    });

  }


  // ----------------------------------------------------------
  // PASSWORD REQUIREMENTS
  // ----------------------------------------------------------

  if (
    newPassword.length < 8
  ) {

    return json_({

      success: false,

      message:
        "Password must contain at least 8 characters."

    });

  }


  if (
    !/[A-Z]/.test(
      newPassword
    ) ||
    !/[a-z]/.test(
      newPassword
    ) ||
    !/\d/.test(
      newPassword
    ) ||
    !/[^A-Za-z0-9]/.test(
      newPassword
    )
  ) {

    return json_({

      success: false,

      message:
        "Password must include uppercase, lowercase, number and symbol."

    });

  }


  const found =
    findUser_(
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Password reset session is invalid."

    });

  }


  const row =
    found.values;


  const savedToken =
    normalize_(
      row[10]
    );

  const resetExpires =
    row[11]
      ? new Date(
          row[11]
        )
      : null;


  if (
    !savedToken ||
    savedToken !==
    resetToken
  ) {

    return json_({

      success: false,

      message:
        "Password reset session is invalid or expired."

    });

  }


  if (
    resetExpires &&
    Date.now() >
    resetExpires.getTime()
  ) {

    return json_({

      success: false,

      message:
        "Password reset session has expired. Please start recovery again."

    });

  }


  // ----------------------------------------------------------
  // SAVE NEW PASSWORD
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
  // DESTROY RESET TOKEN
  // ----------------------------------------------------------

  found.sheet
    .getRange(
      found.rowNumber,
      11,
      1,
      2
    )
    .setValues([

      [
        "",
        ""
      ]

    ]);


  return json_({

    success: true,

    passwordReset: true,

    message:
      "Password reset successfully. You can now log in."

  });

}


// ============================================================
// GET USER
// ============================================================

function getUser_(data) {

  const identity =
    normalize_(
      data.identity
    );


  const found =
    findUser_(
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "User not found."

    });

  }


  const row =
    found.values;


  return json_({

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

function updateAccountStatus_(data) {

  const username =
    normalize_(
      data.username
    ).toLowerCase();

  const status =
    normalize_(
      data.status
    ).toUpperCase();


  const allowed =
    [
      "PENDING",
      "VERIFIED",
      "SUSPENDED",
      "DISABLED"
    ];


  if (
    !allowed.includes(
      status
    )
  ) {

    return json_({

      success: false,

      message:
        "Invalid account status."

    });

  }


  const found =
    findUser_(
      username
    );


  if (!found) {

    return json_({

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


  return json_({

    success: true,

    message:
      "Account status updated."

  });

}
