// ============================================================
// STOCKFLOW | FINAL GOOGLE APPS SCRIPT BACKEND
// ============================================================
//
// StockFlow | Phone Accessories Inventory
//
// FINAL AUTHENTICATION API
//
// FEATURES
// ------------------------------------------------------------
// 1. Employee registration
// 2. Gmail OTP verification
// 3. OTP expiration
// 4. OTP attempt limit
// 5. 30-minute OTP lock
// 6. OTP resend
// 7. Login
// 8. Forgot password
// 9. Recovery OTP
// 10. Recovery token
// 11. Password reset
// 12. User lookup
// 13. Account status update
// 14. Duplicate account protection
// 15. Password hashing
// 16. Legacy USER sheet migration
//
// IMPORTANT
// ------------------------------------------------------------
// - Real OTPs are NEVER returned to the frontend.
// - OTPs are sent through Gmail.
// - Passwords are stored as SHA-256 hashes.
// - Public registration creates Employee accounts only.
// - Admin/Manager accounts should be created securely by an admin.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_NAME = "USER";

const APP_NAME =
  "StockFlow | Phone Accessories Inventory";

const OTP_MINUTES = 10;

const MAX_OTP_ATTEMPTS = 4;

const LOCK_MINUTES = 30;

const RECOVERY_TOKEN_MINUTES = 10;


// ============================================================
// SHEET HEADERS
// ============================================================

const HEADERS = [

  "ID",
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
  "OTP ATTEMPT",
  "OTP TYPE",
  "OTP CHANNEL",
  "OTP LOCKED UNTIL",
  "RECOVERY TOKEN",
  "RECOVERY EXPIRES",
  "VERIFIED AT",
  "CREATED AT"

];


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
    SpreadsheetApp.getActiveSpreadsheet();

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


  if (sheet.getLastRow() === 0) {

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

  else {

    ensureHeaders_();

    migrateLegacyRows_();

  }


  return sheet;

}


// ============================================================
// ENSURE HEADERS
// ============================================================

function ensureHeaders_() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        SHEET_NAME
      );


  if (!sheet) {

    return;

  }


  const requiredColumns =
    HEADERS.length;


  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        requiredColumns
      )
      .getValues()[0];


  let changed = false;


  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    const current =
      String(
        currentHeaders[i] || ""
      )
      .trim()
      .toUpperCase();


    if (
      current !==
      HEADERS[i].toUpperCase()
    ) {

      sheet
        .getRange(
          1,
          i + 1
        )
        .setValue(
          HEADERS[i]
        );

      changed = true;

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
      .setFontWeight(
        "bold"
      );

  }

}


// ============================================================
// HEADER MAP
// ============================================================

function headerMap_() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        SHEET_NAME
      );


  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      HEADERS.length
    );


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const map = {};


  headers.forEach(
    function(header, index) {

      const key =
        String(
          header || ""
        )
        .trim()
        .toUpperCase();


      if (key) {

        map[key] =
          index + 1;

      }

    }
  );


  return map;

}


// ============================================================
// LEGACY MIGRATION
// ============================================================
//
// Converts old USER layout:
//
// NAME
// USERNAME
// PASSWORD
// AGE
// ACCOUNT STATUS
// GMAIL
// PHONE
//
// into the new StockFlow structure.
//
// NOTE:
// Legacy passwords are detected and converted to SHA-256
// when possible.
// ============================================================

function migrateLegacyRows_() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        SHEET_NAME
      );


  if (!sheet) {

    return;

  }


  const map =
    headerMap_();


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return;

  }


  // ----------------------------------------------------------
  // If ID already exists in column A, this is already the
  // modern structure.
  // ----------------------------------------------------------

  const firstData =
    sheet
      .getRange(
        2,
        map["ID"],
        lastRow - 1,
        1
      )
      .getValues();


  let hasModernData = false;


  for (
    let i = 0;
    i < firstData.length;
    i++
  ) {

    if (
      String(
        firstData[i][0] || ""
      ).trim()
    ) {

      hasModernData = true;

      break;

    }

  }


  if (hasModernData) {

    // Still make sure blank IDs get generated.
    for (
      let i = 0;
      i < firstData.length;
      i++
    ) {

      const rowNumber =
        i + 2;


      const id =
        String(
          firstData[i][0] || ""
        ).trim();


      if (!id) {

        sheet
          .getRange(
            rowNumber,
            map["ID"]
          )
          .setValue(
            "sf_" +
            Utilities.getUuid()
          );

      }

    }


    return;

  }


  // ----------------------------------------------------------
  // Detect old layout.
  // ----------------------------------------------------------

  const oldValues =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        7
      )
      .getValues();


  oldValues.forEach(
    function(row, index) {

      const rowNumber =
        index + 2;


      const name =
        String(
          row[0] || ""
        ).trim();


      const username =
        String(
          row[1] || ""
        ).trim();


      const password =
        String(
          row[2] || ""
        );


      const age =
        Number(
          row[3] || 0
        );


      const status =
        String(
          row[4] || ""
        )
        .trim()
        .toUpperCase();


      const gmail =
        String(
          row[5] || ""
        )
        .trim()
        .toLowerCase();


      const phone =
        normalizePhone_(
          row[6]
        );


      if (
        !name ||
        !username ||
        !password
      ) {

        return;

      }


      const newRow =
        Array(
          HEADERS.length
        ).fill("");


      newRow[
        map["ID"] - 1
      ] =
        "sf_" +
        Utilities.getUuid();


      newRow[
        map["NAME"] - 1
      ] =
        name;


      newRow[
        map["USERNAME"] - 1
      ] =
        username;


      // ------------------------------------------------------
      // Hash old plain-text password.
      // ------------------------------------------------------

      newRow[
        map["PASSWORD"] - 1
      ] =
        hashPassword_(
          password
        );


      newRow[
        map["AGE"] - 1
      ] =
        age;


      newRow[
        map["ACCOUNT_S"] - 1
      ] =
        status === "VERIFIED"
          ? "ACTIVE"
          : (
              status ||
              "PENDING"
            );


      newRow[
        map["GMAIL"] - 1
      ] =
        gmail;


      newRow[
        map["PHONE NO."] - 1
      ] =
        phone;


      newRow[
        map["ROLE"] - 1
      ] =
        "Employee";


      newRow[
        map["VERIFIED"] - 1
      ] =
        status === "VERIFIED"
          ? "YES"
          : "NO";


      newRow[
        map["CREATED AT"] - 1
      ] =
        new Date();


      if (
        status === "VERIFIED"
      ) {

        newRow[
          map["VERIFIED AT"] - 1
        ] =
          new Date();

      }


      sheet
        .getRange(
          rowNumber,
          1,
          1,
          HEADERS.length
        )
        .clearContent();


      sheet
        .getRange(
          rowNumber,
          1,
          1,
          HEADERS.length
        )
        .setValues([
          newRow
        ]);

    }
  );

}


// ============================================================
// GET API
// ============================================================

function doGet(e) {

  const action =

    String(
      e &&
      e.parameter &&
      e.parameter.action ||
      "health"
    )
    .trim();


  // ----------------------------------------------------------
  // HEALTH CHECK
  // ----------------------------------------------------------

  if (
    action ===
    "health"
  ) {

    return json_({

      success: true,

      service:
        APP_NAME,

      status:
        "online",

      sheet:
        SHEET_NAME

    });

  }


  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------

  if (
    action ===
    "users"
  ) {

    const sheet =
      getSheet_();


    const map =
      headerMap_();


    const values =
      sheet
        .getDataRange()
        .getValues();


    const users =
      values
        .slice(1)
        .map(
          function(row) {

            return {

              uid:
                cell_(
                  row,
                  map["ID"]
                ),

              name:
                cell_(
                  row,
                  map["NAME"]
                ),

              username:
                cell_(
                  row,
                  map["USERNAME"]
                ),

              age:
                cell_(
                  row,
                  map["AGE"]
                ),

              accountStatus:
                cell_(
                  row,
                  map["ACCOUNT_S"]
                ),

              gmail:
                cell_(
                  row,
                  map["GMAIL"]
                ),

              phone:
                cell_(
                  row,
                  map["PHONE NO."]
                ),

              role:
                cell_(
                  row,
                  map["ROLE"]
                ),

              verified:
                String(
                  cell_(
                    row,
                    map["VERIFIED"]
                  )
                )
                .toUpperCase()
                === "YES"

            };

          }
        );


    return json_({

      success: true,

      users:
        users

    });

  }


  return json_({

    success: false,

    message:
      "Unknown GET action."

  });

}


// ============================================================
// POST ROUTER
// ============================================================

function doPost(e) {

  const lock =
    LockService
      .getScriptLock();


  try {

    lock.waitLock(
      10000
    );


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
      String(
        data.action || ""
      ).trim();


    switch (
      action
    ) {

      case "register":

        return register_(
          data
        );


      case "login":

        return login_(
          data
        );


      case "verifyOtp":

        return verifyOtp_(
          data
        );


      case "requestOtp":

        return requestOtp_(
          data
        );


      case "resendOtp":

        return requestOtp_(
          data
        );


      case "updateOtp":

        return requestOtp_(
          data
        );


      case "forgotPassword":

        return forgotPassword_(
          data
        );


      case "verifyRecoveryOtp":

        return verifyRecoveryOtp_(
          data
        );


      case "resetPassword":

        return resetPassword_(
          data
        );


      case "getUser":

        return getUser_(
          data
        );


      case "updateStatus":

        return updateAccountStatus_(
          data
        );


      default:

        return json_({

          success: false,

          message:
            "Unknown API action: " +
            action

        });

    }

  }

  catch (error) {

    return json_({

      success: false,

      message:
        error &&
        error.message
          ? error.message
          : "Server error."

    });

  }

  finally {

    try {

      lock.releaseLock();

    }

    catch (_) {}

  }

}


// ============================================================
// REGISTER
// ============================================================

function register_(data) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const name =
    String(
      data.name || ""
    ).trim();


  const username =
    String(
      data.username || ""
    ).trim();


  const password =
    String(
      data.password || ""
    );


  const age =
    Number(
      data.age || 0
    );


  const gmail =
    String(
      data.gmail || ""
    )
    .trim()
    .toLowerCase();


  const phone =
    normalizePhone_(
      data.phone || ""
    );


  // ----------------------------------------------------------
  // REQUIRED FIELDS
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // EMAIL VALIDATION
  // ----------------------------------------------------------

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(gmail)
  ) {

    return json_({

      success: false,

      message:
        "Please enter a valid Gmail/email address."

    });

  }


  // ----------------------------------------------------------
  // AGE VALIDATION
  // ----------------------------------------------------------

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
  // PASSWORD VALIDATION
  // ----------------------------------------------------------

  if (
    !passwordStrong_(
      password
    )
  ) {

    return json_({

      success: false,

      message:
        "Password must be 8+ characters with uppercase, lowercase, number and symbol."

    });

  }


  // ----------------------------------------------------------
  // DUPLICATE CHECK
  // ----------------------------------------------------------

  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const existingUsername =
      String(
        cell_(
          values[i],
          map["USERNAME"]
        ) || ""
      )
      .trim()
      .toLowerCase();


    const existingEmail =
      String(
        cell_(
          values[i],
          map["GMAIL"]
        ) || ""
      )
      .trim()
      .toLowerCase();


    const existingPhone =
      normalizePhone_(
        cell_(
          values[i],
          map["PHONE NO."]
        )
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
      existingPhone &&
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
  // USER ID
  // ----------------------------------------------------------

  const uid =
    String(
      data.uid ||
      "sf_" +
      Utilities.getUuid()
    );


  // ----------------------------------------------------------
  // OTP
  // ----------------------------------------------------------

  const otp =
    generateOtp_();


  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60000
    );


  // ----------------------------------------------------------
  // CREATE ROW
  // ----------------------------------------------------------

  const row =
    Array(
      HEADERS.length
    ).fill("");


  row[
    map["ID"] - 1
  ] =
    uid;


  row[
    map["NAME"] - 1
  ] =
    name;


  row[
    map["USERNAME"] - 1
  ] =
    username;


  // HASH PASSWORD
  row[
    map["PASSWORD"] - 1
  ] =
    hashPassword_(
      password
    );


  row[
    map["AGE"] - 1
  ] =
    age;


  row[
    map["ACCOUNT_S"] - 1
  ] =
    "PENDING";


  row[
    map["GMAIL"] - 1
  ] =
    gmail;


  row[
    map["PHONE NO."] - 1
  ] =
    phone;


  // PUBLIC REGISTRATION = EMPLOYEE
  row[
    map["ROLE"] - 1
  ] =
    "Employee";


  row[
    map["VERIFIED"] - 1
  ] =
    "NO";


  row[
    map["OTP"] - 1
  ] =
    otp;


  row[
    map["OTP EXPIRES"] - 1
  ] =
    expires;


  row[
    map["OTP ATTEMPT"] - 1
  ] =
    0;


  row[
    map["OTP TYPE"] - 1
  ] =
    "VERIFICATION";


  row[
    map["OTP CHANNEL"] - 1
  ] =
    "GMAIL";


  row[
    map["CREATED AT"] - 1
  ] =
    new Date();


  const newRowNumber =
    sheet.getLastRow() + 1;


  sheet
    .getRange(
      newRowNumber,
      1,
      1,
      row.length
    )
    .setValues([
      row
    ]);


  // ----------------------------------------------------------
  // SEND OTP
  // ----------------------------------------------------------

  const sendResult =
    sendOtp_(
      gmail,
      phone,
      otp,
      "verification",
      "GMAIL",
      name
    );


  if (
    !sendResult.success
  ) {

    // Remove account if email failed.
    sheet.deleteRow(
      newRowNumber
    );


    return json_({

      success: false,

      message:
        "Registration failed because the verification email could not be sent. " +
        sendResult.message

    });

  }


  return json_({

    success: true,

    message:
      "Registration successful. A verification code was sent to your Gmail.",

    uid:
      uid,

    verificationMethod:
      "gmail",

    destination:
      maskEmail_(
        gmail
      ),

    expiresAt:
      expires.toISOString()

  });

}


// ============================================================
// LOGIN
// ============================================================

function login_(data) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const identity =
    String(
      data.identity || ""
    )
    .trim()
    .toLowerCase();


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
      values,
      map,
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
    found.row;


  const storedPassword =
    String(
      cell_(
        row,
        map["PASSWORD"]
      ) || ""
    );


  const passwordHash =
    hashPassword_(
      password
    );


  if (
    storedPassword !==
    passwordHash
  ) {

    return json_({

      success: false,

      message:
        "Invalid username/email or password."

    });

  }


  const verified =
    String(
      cell_(
        row,
        map["VERIFIED"]
      ) || ""
    )
    .trim()
    .toUpperCase()
    === "YES";


  const status =
    String(
      cell_(
        row,
        map["ACCOUNT_S"]
      ) || ""
    )
    .trim()
    .toUpperCase();


  if (
    !verified ||
    status !== "ACTIVE"
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

    user:
      publicUser_(
        row,
        map
      )

  });

}


// ============================================================
// REQUEST / RESEND OTP
// ============================================================

function requestOtp_(data) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const identity =
    String(
      data.identity || ""
    )
    .trim()
    .toLowerCase();


  if (!identity) {

    return json_({

      success: false,

      message:
        "Username or email is required."

    });

  }


  const found =
    findUser_(
      values,
      map,
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
    found.row;


  const rowNumber =
    found.rowNumber;


  const verified =
    String(
      cell_(
        row,
        map["VERIFIED"]
      ) || ""
    )
    .toUpperCase()
    === "YES";


  if (
    verified
  ) {

    return json_({

      success: false,

      message:
        "This account is already verified."

    });

  }


  const lockedUntil =
    parseDate_(
      cell_(
        row,
        map["OTP LOCKED UNTIL"]
      )
    );


  if (
    lockedUntil &&
    lockedUntil.getTime() >
      Date.now()
  ) {

    return json_({

      success: false,

      locked: true,

      message:
        "Too many incorrect OTP attempts. Try again in 30 minutes."

    });

  }


  const gmail =
    String(
      cell_(
        row,
        map["GMAIL"]
      ) || ""
    )
    .trim()
    .toLowerCase();


  const otp =
    generateOtp_();


  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60000
    );


  const sendResult =
    sendOtp_(
      gmail,
      cell_(
        row,
        map["PHONE NO."]
      ),
      otp,
      "verification",
      "GMAIL",
      cell_(
        row,
        map["NAME"]
      )
    );


  if (
    !sendResult.success
  ) {

    return json_({

      success: false,

      message:
        sendResult.message

    });

  }


  // Save OTP only after successful email.
  sheet
    .getRange(
      rowNumber,
      map["OTP"]
    )
    .setValue(
      otp
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP EXPIRES"]
    )
    .setValue(
      expires
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP ATTEMPT"]
    )
    .setValue(
      0
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP TYPE"]
    )
    .setValue(
      "VERIFICATION"
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP CHANNEL"]
    )
    .setValue(
      "GMAIL"
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP LOCKED UNTIL"]
    )
    .clearContent();


  return json_({

    success: true,

    message:
      "A new verification code was sent to your Gmail.",

    verificationMethod:
      "gmail",

    destination:
      maskEmail_(
        gmail
      ),

    expiresAt:
      expires.toISOString()

  });

}


// ============================================================
// VERIFY ACCOUNT OTP
// ============================================================

function verifyOtp_(data) {

  return verifyCode_(
    data,
    "VERIFICATION"
  );

}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================

function verifyRecoveryOtp_(data) {

  return verifyCode_(
    data,
    "RECOVERY"
  );

}


// ============================================================
// VERIFY OTP CORE
// ============================================================

function verifyCode_(
  data,
  expectedType
) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const identity =
    String(
      data.identity || ""
    )
    .trim()
    .toLowerCase();


  const otp =
    String(
      data.otp || ""
    )
    .trim();


  if (
    !identity ||
    !otp
  ) {

    return json_({

      success: false,

      message:
        "Account identity and OTP are required."

    });

  }


  const found =
    findUser_(
      values,
      map,
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
    found.row;


  const rowNumber =
    found.rowNumber;


  // ----------------------------------------------------------
  // CHECK LOCK
  // ----------------------------------------------------------

  const lockedUntil =
    parseDate_(
      cell_(
        row,
        map["OTP LOCKED UNTIL"]
      )
    );


  if (
    lockedUntil &&
    lockedUntil.getTime() >
      Date.now()
  ) {

    return json_({

      success: false,

      locked: true,

      message:
        "Too many incorrect OTP attempts. Try again in 30 minutes."

    });

  }


  // ----------------------------------------------------------
  // CHECK OTP TYPE
  // ----------------------------------------------------------

  const storedType =
    String(
      cell_(
        row,
        map["OTP TYPE"]
      ) || ""
    )
    .trim()
    .toUpperCase();


  if (
    storedType !==
    expectedType
  ) {

    return json_({

      success: false,

      message:
        "This OTP is no longer valid."

    });

  }


  // ----------------------------------------------------------
  // CHECK EXPIRATION
  // ----------------------------------------------------------

  const expires =
    parseDate_(
      cell_(
        row,
        map["OTP EXPIRES"]
      )
    );


  if (
    !expires ||
    expires.getTime() <
      Date.now()
  ) {

    return json_({

      success: false,

      message:
        "This OTP has expired. Please request a new code."

    });

  }


  // ----------------------------------------------------------
  // CHECK OTP
  // ----------------------------------------------------------

  const storedOtp =
    String(
      cell_(
        row,
        map["OTP"]
      ) || ""
    ).trim();


  if (
    storedOtp !==
    otp
  ) {

    const attempts =
      Number(
        cell_(
          row,
          map["OTP ATTEMPT"]
        ) || 0
      ) + 1;


    sheet
      .getRange(
        rowNumber,
        map["OTP ATTEMPT"]
      )
      .setValue(
        attempts
      );


    if (
      attempts >=
      MAX_OTP_ATTEMPTS
    ) {

      const lockUntil =
        new Date(
          Date.now() +
          LOCK_MINUTES *
          60000
        );


      sheet
        .getRange(
          rowNumber,
          map["OTP LOCKED UNTIL"]
        )
        .setValue(
          lockUntil
        );


      return json_({

        success: false,

        locked: true,

        attempts:
          attempts,

        attemptsRemaining:
          0,

        message:
          "Too many incorrect OTP attempts. Your verification is locked for 30 minutes."

      });

    }


    return json_({

      success: false,

      attempts:
        attempts,

      attemptsRemaining:
        MAX_OTP_ATTEMPTS -
        attempts,

      message:
        "Invalid OTP."

    });

  }


  // ----------------------------------------------------------
  // CORRECT OTP
  // ----------------------------------------------------------

  sheet
    .getRange(
      rowNumber,
      map["OTP"]
    )
    .clearContent();


  sheet
    .getRange(
      rowNumber,
      map["OTP EXPIRES"]
    )
    .clearContent();


  sheet
    .getRange(
      rowNumber,
      map["OTP ATTEMPT"]
    )
    .setValue(
      0
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP LOCKED UNTIL"]
    )
    .clearContent();


  // ----------------------------------------------------------
  // ACCOUNT VERIFICATION
  // ----------------------------------------------------------

  if (
    expectedType ===
    "VERIFICATION"
  ) {

    sheet
      .getRange(
        rowNumber,
        map["ACCOUNT_S"]
      )
      .setValue(
        "ACTIVE"
      );


    sheet
      .getRange(
        rowNumber,
        map["VERIFIED"]
      )
      .setValue(
        "YES"
      );


    sheet
      .getRange(
        rowNumber,
        map["VERIFIED AT"]
      )
      .setValue(
        new Date()
      );


    sheet
      .getRange(
        rowNumber,
        map["OTP TYPE"]
      )
      .clearContent();


    return json_({

      success: true,

      verified: true,

      demo: false,

      message:
        "Account verified successfully.",

      user:
        publicUser_(
          row,
          map
        )

    });

  }


  // ----------------------------------------------------------
  // PASSWORD RECOVERY
  // ----------------------------------------------------------

  const recoveryToken =
    Utilities.getUuid() +
    Utilities.getUuid();


  const recoveryExpires =
    new Date(
      Date.now() +
      RECOVERY_TOKEN_MINUTES *
      60000
    );


  sheet
    .getRange(
      rowNumber,
      map["RECOVERY TOKEN"]
    )
    .setValue(
      recoveryToken
    );


  sheet
    .getRange(
      rowNumber,
      map["RECOVERY EXPIRES"]
    )
    .setValue(
      recoveryExpires
    );


  sheet
    .getRange(
      rowNumber,
      map["OTP TYPE"]
    )
    .clearContent();


  return json_({

    success: true,

    recoveryVerified:
      true,

    message:
      "Recovery code verified. You may now create a new password.",

    recoveryToken:
      recoveryToken,

    recoveryExpiresAt:
      recoveryExpires.toISOString(),

    uid:
      cell_(
        row,
        map["ID"]
      ),

    user:
      publicUser_(
        row,
        map
      )

  });

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

function forgotPassword_(data) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const identity =
    String(
      data.identity || ""
    )
    .trim()
    .toLowerCase();


  if (!identity) {

    return json_({

      success: false,

      message:
        "Email, username or phone number is required."

    });

  }


  const found =
    findUser_(
      values,
      map,
      identity
    );


  // ----------------------------------------------------------
  // SECURITY: DO NOT REVEAL ACCOUNT EXISTENCE
  // ----------------------------------------------------------

  if (!found) {

    return json_({

      success: true,

      recoveryStarted:
        false,

      message:
        "If an account matches the information provided, a recovery code will be sent."

    });

  }


  const row =
    found.row;


  const verified =
    String(
      cell_(
        row,
        map["VERIFIED"]
      ) || ""
    )
    .toUpperCase()
    === "YES";


  if (!verified) {

    return json_({

      success: true,

      recoveryStarted:
        false,

      message:
        "If an account matches the information provided, recovery instructions will be sent."

    });

  }


  const gmail =
    String(
      cell_(
        row,
        map["GMAIL"]
      ) || ""
    )
    .trim()
    .toLowerCase();


  if (!gmail) {

    return json_({

      success: true,

      recoveryStarted:
        false,

      message:
        "If an account matches the information provided, recovery instructions will be sent."

    });

  }


  // ----------------------------------------------------------
  // CHECK OTP LOCK
  // ----------------------------------------------------------

  const lockedUntil =
    parseDate_(
      cell_(
        row,
        map["OTP LOCKED UNTIL"]
      )
    );


  if (
    lockedUntil &&
    lockedUntil.getTime() >
      Date.now()
  ) {

    return json_({

      success: false,

      locked: true,

      message:
        "Too many incorrect OTP attempts. Try again in 30 minutes."

    });

  }


  const otp =
    generateOtp_();


  const expires =
    new Date(
      Date.now() +
      OTP_MINUTES *
      60000
    );


  const sendResult =
    sendOtp_(
      gmail,
      cell_(
        row,
        map["PHONE NO."]
      ),
      otp,
      "recovery",
      "GMAIL",
      cell_(
        row,
        map["NAME"]
      )
    );


  if (
    !sendResult.success
  ) {

    return json_({

      success: false,

      message:
        sendResult.message

    });

  }


  // ----------------------------------------------------------
  // SAVE RECOVERY OTP
  // ----------------------------------------------------------

  sheet
    .getRange(
      found.rowNumber,
      map["OTP"]
    )
    .setValue(
      otp
    );


  sheet
    .getRange(
      found.rowNumber,
      map["OTP EXPIRES"]
    )
    .setValue(
      expires
    );


  sheet
    .getRange(
      found.rowNumber,
      map["OTP ATTEMPT"]
    )
    .setValue(
      0
    );


  sheet
    .getRange(
      found.rowNumber,
      map["OTP TYPE"]
    )
    .setValue(
      "RECOVERY"
    );


  sheet
    .getRange(
      found.rowNumber,
      map["OTP CHANNEL"]
    )
    .setValue(
      "GMAIL"
    );


  sheet
    .getRange(
      found.rowNumber,
      map["OTP LOCKED UNTIL"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["RECOVERY TOKEN"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["RECOVERY EXPIRES"]
    )
    .clearContent();


  return json_({

    success: true,

    recoveryStarted:
      true,

    otpSent:
      true,

    uid:
      cell_(
        row,
        map["ID"]
      ),

    username:
      cell_(
        row,
        map["USERNAME"]
      ),

    verificationMethod:
      "gmail",

    destination:
      maskEmail_(
        gmail
      ),

    expiresAt:
      expires.toISOString(),

    expiresIn:
      OTP_MINUTES *
      60,

    message:
      "A password recovery code has been sent to your registered Gmail."

  });

}


// ============================================================
// RESET PASSWORD
// ============================================================

function resetPassword_(data) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const token =
    String(
      data.recoveryToken || ""
    ).trim();


  const identity =
    String(
      data.identity || ""
    )
    .trim()
    .toLowerCase();


  const newPassword =
    String(
      data.newPassword || ""
    );


  if (
    !token ||
    !identity ||
    !newPassword
  ) {

    return json_({

      success: false,

      message:
        "Password reset information is incomplete."

    });

  }


  // ----------------------------------------------------------
  // PASSWORD STRENGTH
  // ----------------------------------------------------------

  if (
    !passwordStrong_(
      newPassword
    )
  ) {

    return json_({

      success: false,

      message:
        "Password must be 8+ characters with uppercase, lowercase, number and symbol."

    });

  }


  const found =
    findUser_(
      values,
      map,
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Invalid or expired recovery session."

    });

  }


  const row =
    found.row;


  const savedToken =
    String(
      cell_(
        row,
        map["RECOVERY TOKEN"]
      ) || ""
    ).trim();


  if (
    !savedToken ||
    savedToken !==
    token
  ) {

    return json_({

      success: false,

      message:
        "Invalid or expired recovery session."

    });

  }


  const tokenExpires =
    parseDate_(
      cell_(
        row,
        map["RECOVERY EXPIRES"]
      )
    );


  if (
    !tokenExpires ||
    tokenExpires.getTime() <
      Date.now()
  ) {

    return json_({

      success: false,

      message:
        "Recovery session expired. Please start again."

    });

  }


  // ----------------------------------------------------------
  // SAVE HASHED PASSWORD
  // ----------------------------------------------------------

  sheet
    .getRange(
      found.rowNumber,
      map["PASSWORD"]
    )
    .setValue(
      hashPassword_(
        newPassword
      )
    );


  // ----------------------------------------------------------
  // DESTROY RECOVERY SESSION
  // ----------------------------------------------------------

  sheet
    .getRange(
      found.rowNumber,
      map["RECOVERY TOKEN"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["RECOVERY EXPIRES"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["OTP"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["OTP EXPIRES"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["OTP ATTEMPT"]
    )
    .setValue(
      0
    );


  sheet
    .getRange(
      found.rowNumber,
      map["OTP TYPE"]
    )
    .clearContent();


  sheet
    .getRange(
      found.rowNumber,
      map["OTP LOCKED UNTIL"]
    )
    .clearContent();


  return json_({

    success: true,

    passwordReset:
      true,

    message:
      "Password reset successfully. You can now log in."

  });

}


// ============================================================
// SEND OTP
// ============================================================

function sendOtp_(
  gmail,
  phone,
  otp,
  purpose,
  channel,
  name
) {

  channel =
    String(
      channel || "GMAIL"
    )
    .toUpperCase();


  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (
    channel ===
    "PHONE"
  ) {

    return {

      success: false,

      message:
        "Phone SMS is not connected yet. Please choose Gmail verification."

    };

  }


  gmail =
    String(
      gmail || ""
    )
    .trim()
    .toLowerCase();


  if (
    !gmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(gmail)
  ) {

    return {

      success: false,

      message:
        "No valid Gmail address is registered for this account."

    };

  }


  const isRecovery =
    purpose ===
    "recovery";


  const subject =
    isRecovery

      ? "StockFlow - Password Recovery Code"

      : "StockFlow - Account Verification Code";


  const title =
    isRecovery

      ? "Password Recovery"

      : "Account Verification";


  const plainText =

    "StockFlow | Phone Accessories Inventory\n\n" +

    "Hello " +
    (name || "StockFlow User") +
    ",\n\n" +

    title +
    "\n\n" +

    "Your 6-digit verification code is:\n\n" +

    otp +

    "\n\n" +

    "This code expires in " +
    OTP_MINUTES +
    " minutes.\n\n" +

    "Never share this code with anyone.\n\n" +

    "If you did not request this code, " +
    "you can safely ignore this email.\n\n" +

    "StockFlow";


  const safeName =
    escapeHtml_(
      name ||
      "StockFlow User"
    );


  const htmlBody =

    "<div style=\"" +
    "font-family:Arial,sans-serif;" +
    "max-width:560px;" +
    "margin:auto;" +
    "padding:28px;" +
    "\">" +

      "<div style=\"" +
      "padding:24px;" +
      "border:1px solid #e2e8f0;" +
      "border-radius:16px;" +
      "\">" +

        "<h2 style=\"" +
        "margin:0 0 6px;" +
        "color:#123b68;" +
        "\">" +

          "StockFlow" +

        "</h2>" +

        "<p style=\"" +
        "color:#64748b;" +
        "margin-top:0;" +
        "\">" +

          "Phone Accessories Inventory" +

        "</p>" +

        "<p>Hello " +
        safeName +
        ",</p>" +

        "<h3>" +
        title +
        "</h3>" +

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
        "background:#f3f7fc;" +
        "border-radius:12px;" +
        "text-align:center;" +
        "color:#1769e0;" +
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
        "font-size:12px;" +
        "color:#94a3b8;" +
        "\">" +

          "Never share this verification code with anyone." +

        "</p>" +

        "<p style=\"" +
        "font-size:12px;" +
        "color:#94a3b8;" +
        "\">" +

          "If you did not request this code, " +
          "you can safely ignore this email." +

        "</p>" +

        "<p>— StockFlow</p>" +

      "</div>" +

    "</div>";


  try {

    if (
      MailApp
        .getRemainingDailyQuota() <
      1
    ) {

      return {

        success: false,

        message:
          "The Gmail sending quota has been reached."

      };

    }


    MailApp.sendEmail({

      to:
        gmail,

      subject:
        subject,

      body:
        plainText,

      htmlBody:
        htmlBody,

      name:
        "StockFlow"

    });


    return {

      success: true

    };

  }

  catch (error) {

    return {

      success: false,

      message:
        "Gmail delivery failed: " +
        (
          error &&
          error.message
            ? error.message
            : "Unknown email error."
        )

    };

  }

}


// ============================================================
// FIND USER
// ============================================================

function findUser_(
  values,
  map,
  identity
) {

  const target =
    String(
      identity || ""
    )
    .trim()
    .toLowerCase();


  const normalizedPhone =
    normalizePhone_(
      target
    );


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    const username =
      String(
        cell_(
          values[i],
          map["USERNAME"]
        ) || ""
      )
      .trim()
      .toLowerCase();


    const gmail =
      String(
        cell_(
          values[i],
          map["GMAIL"]
        ) || ""
      )
      .trim()
      .toLowerCase();


    const phone =
      normalizePhone_(
        cell_(
          values[i],
          map["PHONE NO."]
        )
      );


    if (
      username ===
      target
    ) {

      return {

        row:
          values[i],

        rowNumber:
          i + 1

      };

    }


    if (
      gmail ===
      target
    ) {

      return {

        row:
          values[i],

        rowNumber:
          i + 1

      };

    }


    if (
      phone &&
      phone ===
      normalizedPhone
    ) {

      return {

        row:
          values[i],

        rowNumber:
          i + 1

      };

    }

  }


  return null;

}


// ============================================================
// GET USER
// ============================================================

function getUser_(data) {

  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const identity =
    String(
      data.identity || ""
    )
    .trim()
    .toLowerCase();


  const found =
    findUser_(
      values,
      map,
      identity
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "User not found."

    });

  }


  return json_({

    success: true,

    user:
      publicUser_(
        found.row,
        map
      )

  });

}


// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================
//
// Allowed:
//
// PENDING
// ACTIVE
// VERIFIED
// SUSPENDED
// DISABLED
//
// VERIFIED is converted to ACTIVE because the final
// authentication logic uses ACTIVE as the login state.
// ============================================================

function updateAccountStatus_(data) {

  const username =
    String(
      data.username || ""
    )
    .trim()
    .toLowerCase();


  let status =
    String(
      data.status || ""
    )
    .trim()
    .toUpperCase();


  if (
    status ===
    "VERIFIED"
  ) {

    status =
      "ACTIVE";

  }


  const allowed = [

    "PENDING",
    "ACTIVE",
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


  const sheet =
    getSheet_();


  const map =
    headerMap_();


  const values =
    sheet
      .getDataRange()
      .getValues();


  const found =
    findUser_(
      values,
      map,
      username
    );


  if (!found) {

    return json_({

      success: false,

      message:
        "Username not found."

    });

  }


  sheet
    .getRange(
      found.rowNumber,
      map["ACCOUNT_S"]
    )
    .setValue(
      status
    );


  // ----------------------------------------------------------
  // If account is active, mark verified.
  // ----------------------------------------------------------

  if (
    status ===
    "ACTIVE"
  ) {

    sheet
      .getRange(
        found.rowNumber,
        map["VERIFIED"]
      )
      .setValue(
        "YES"
      );

  }


  return json_({

    success: true,

    message:
      "Account status updated."

  });

}


// ============================================================
// PUBLIC USER
// ============================================================
//
// NEVER return PASSWORD.
// NEVER return OTP.
// NEVER return recovery token.
// ============================================================

function publicUser_(
  row,
  map
) {

  return {

    uid:
      cell_(
        row,
        map["ID"]
      ),

    name:
      cell_(
        row,
        map["NAME"]
      ),

    username:
      cell_(
        row,
        map["USERNAME"]
      ),

    age:
      cell_(
        row,
        map["AGE"]
      ),

    accountStatus:
      cell_(
        row,
        map["ACCOUNT_S"]
      ),

    gmail:
      cell_(
        row,
        map["GMAIL"]
      ),

    phone:
      cell_(
        row,
        map["PHONE NO."]
      ),

    role:
      cell_(
        row,
        map["ROLE"]
      )

  };

}


// ============================================================
// CELL HELPER
// ============================================================

function cell_(
  row,
  column
) {

  return column
    ? row[column - 1]
    : "";

}


// ============================================================
// OTP GENERATOR
// ============================================================

function generateOtp_() {

  return String(

    Math.floor(
      100000 +
      Math.random() *
      900000
    )

  );

}


// ============================================================
// PHONE NORMALIZER
// ============================================================

function normalizePhone_(
  value
) {

  let phone =
    String(
      value || ""
    )
    .trim()
    .replace(
      /[\s()-]/g,
      ""
    );


  if (
    phone.startsWith("09")
  ) {

    phone =
      "+63" +
      phone.substring(1);

  }


  if (
    phone.startsWith("63") &&
    !phone.startsWith("+63")
  ) {

    phone =
      "+" +
      phone;

  }


  return phone;

}


// ============================================================
// DATE PARSER
// ============================================================

function parseDate_(
  value
) {

  if (!value) {

    return null;

  }


  if (
    Object.prototype.toString
      .call(value)
      ===
      "[object Date]"
  ) {

    return isNaN(
      value.getTime()
    )
      ? null
      : value;

  }


  const date =
    new Date(
      value
    );


  return isNaN(
    date.getTime()
  )
    ? null
    : date;

}


// ============================================================
// PASSWORD STRENGTH
// ============================================================

function passwordStrong_(
  value
) {

  return (

    value.length >= 8 &&

    /[A-Z]/.test(
      value
    ) &&

    /[a-z]/.test(
      value
    ) &&

    /\d/.test(
      value
    ) &&

    /[^A-Za-z0-9]/.test(
      value
    )

  );

}


// ============================================================
// PASSWORD HASH
// ============================================================
//
// SHA-256 hash using Apps Script Utilities.
//
// The actual password is NOT stored in the sheet.
// ============================================================

function hashPassword_(
  password
) {

  const bytes =
    Utilities
      .computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        String(
          password || ""
        ),
        Utilities.Charset.UTF_8
      );


  return bytes
    .map(
      function(byte) {

        const value =
          byte < 0
            ? byte + 256
            : byte;


        return (
          value
            .toString(16)
            .padStart(
              2,
              "0"
            )
        );

      }
    )
    .join("");

}


// ============================================================
// EMAIL MASK
// ============================================================

function maskEmail_(
  email
) {

  const value =
    String(
      email || ""
    );


  const at =
    value.indexOf(
      "@"
    );


  if (
    at <= 1
  ) {

    return value;

  }


  return (

    value.charAt(0) +

    "••••" +

    value.substring(
      at - 1
    )

  );

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml_(
  value
) {

  return String(
    value || ""
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


// ============================================================
// TEST HEALTH
// ============================================================
//
// Optional manual test.
//
// Run testHealth() from Apps Script editor.
// ============================================================

function testHealth() {

  Logger.log(
    JSON.stringify({

      success: true,

      service:
        APP_NAME,

      status:
        "online",

      sheet:
        SHEET_NAME

    })
  );

}
