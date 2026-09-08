// ============================================================
// STOCKFLOW AUTHENTICATION BACKEND
// Google Apps Script + Google Sheets
//
// SINGLE COMPLETE Code.gs
//
// MIDTERM / DEMO OTP MODE
// ------------------------------------------------------------
// Google Sheets = primary database
// Firebase       = optional OTP/user mirror
//
// NO REAL GMAIL OTP
// NO REAL SMS OTP
// NO TWILIO REQUIRED
//
// The backend generates the OTP and returns it as demoOtp.
// The frontend can then auto-fill the OTP boxes in demo mode.
//
// ============================================================
//
// FEATURES
// ------------------------------------------------------------
// 1. Employee registration
// 2. Admin-only registration
// 3. Unique UID generation
// 4. UID collision protection
// 5. Exact row tracking
// 6. Google Sheets USER storage
// 7. Firebase OTP/user mirror
// 8. Demo 6-digit OTP
// 9. OTP expires after 10 minutes
// 10. OTP is single-use
// 11. Maximum 4 OTP attempts
// 12. 30-minute OTP lock
// 13. 60-second resend cooldown
// 14. Login
// 15. Account status
// 16. Role support
// 17. Forgot password
// 18. Recovery OTP
// 19. Password reset
// 20. API dispatcher
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
// DEMO MODE
// ============================================================
//
// TRUE = OTP is returned to frontend as demoOtp.
//
// For your midterm this remains TRUE.
//
// You do NOT need:
// - Gmail API
// - MailApp
// - Twilio
// - SMS provider
//
// ============================================================

const DEMO_MODE =
  true;


// ============================================================
// OTP SETTINGS
// ============================================================

const OTP_LENGTH =
  6;

const OTP_EXPIRY_MINUTES =
  10;

const MAX_OTP_ATTEMPTS =
  4;

const OTP_LOCK_MINUTES =
  30;

const RESEND_COOLDOWN_SECONDS =
  60;


// ============================================================
// SESSION SETTINGS
// ============================================================

const SESSION_TTL_MINUTES =
  480;


// ============================================================
// USER SHEET HEADERS
// ============================================================
//
// DO NOT change the order casually.
//
// Column A = UID
//
// ============================================================

const HEADERS = [

  "UID",             // A
  "NAME",            // B
  "USERNAME",        // C
  "PASSWORD",        // D
  "AGE",             // E
  "ACCOUNT_S",       // F
  "GMAIL",           // G
  "PHONE NO.",       // H
  "ROLE",            // I
  "VERIFIED",        // J
  "OTP",             // K
  "OTP EXPIRES",     // L
  "OTP ATTEMPTS",    // M
  "OTP LOCK UNTIL",  // N
  "OTP CHANNEL",     // O
  "CREATED AT",      // P
  "VERIFIED AT",     // Q
  "LAST OTP SENT",   // R
  "LAST LOGIN"       // S

];


// ============================================================
// API RESPONSE
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
// NORMALIZE GENERAL VALUE
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
// NORMALIZE PHILIPPINE PHONE
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

  return /^\S+@\S+\.\S+$/
    .test(
      normalizeEmail(email)
    );

}


// ============================================================
// VALIDATE PHILIPPINE PHONE
// ============================================================

function validPhone(phone) {

  return /^\+639\d{9}$/
    .test(
      normalizePhone(phone)
    );

}


// ============================================================
// GET SCRIPT PROPERTY
// ============================================================

function getProperty(name) {

  return PropertiesService
    .getScriptProperties()
    .getProperty(name) || "";

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(
    value == null
      ? ""
      : value
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
// HASH PASSWORD
// ============================================================
//
// Passwords are stored as SHA-256 Base64.
//
// ============================================================

function hashPassword(password) {

  return Utilities
    .base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        String(password),
        Utilities.Charset.UTF_8
      )
    );

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
// GENERATE UNIQUE UID
// ============================================================
//
// IMPORTANT:
//
// This function does NOT simply trust Date.now().
//
// It checks the USER sheet for an existing UID.
//
// A second safety layer is also provided by the registration
// Script Lock.
//
// ============================================================

function generateUID() {

  const sheet =
    getSheet();

  let candidate = "";

  let attempts = 0;

  const maximumAttempts = 100;


  do {

    attempts++;

    const timestamp =
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyyMMddHHmmssSSS"
      );

    const randomPart =
      Utilities
        .getUuid()
        .replace(
          /-/g,
          ""
        )
        .substring(
          0,
          12
        )
        .toUpperCase();

    candidate =
      "sf_" +
      timestamp +
      "_" +
      randomPart;


    if (
      !uidExists(
        sheet,
        candidate
      )
    ) {

      return candidate;

    }

  } while (
    attempts <
    maximumAttempts
  );


  throw new Error(
    "Unable to generate a unique UID."
  );

}


// ============================================================
// CHECK UID EXISTS
// ============================================================

function uidExists(
  sheet,
  candidate
) {

  const lastRow =
    sheet.getLastRow();

  if (
    lastRow < 2
  ) {

    return false;

  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();


  const target =
    normalize(
      candidate
    )
      .toLowerCase();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const existing =
      normalize(
        values[i][0]
      )
        .toLowerCase();


    if (
      existing &&
      existing === target
    ) {

      return true;

    }

  }


  return false;

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


  ensureHeaders(
    sheet
  );


  return sheet;

}


// ============================================================
// ENSURE HEADERS
// ============================================================
//
// IMPORTANT:
//
// The old implementation blindly rewrote the first 19
// headers. This version protects existing data.
//
// If the sheet is empty, it creates the correct headers.
//
// If the correct headers already exist, nothing is changed.
//
// If there are legacy names such as:
// ID
// ACCOUNT_S
// OTP ATTEMPT
//
// they are preserved.
//
// Missing required columns are added only when necessary.
//
// ============================================================

function ensureHeaders(sheet) {

  const currentLastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );


  const currentHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        currentLastColumn
      )
      .getValues()[0];


  const hasAnyHeader =
    currentHeaders.some(
      function(header) {

        return normalize(
          header
        ) !== "";

      }
    );


  // ----------------------------------------------------------
  // EMPTY SHEET
  // ----------------------------------------------------------

  if (!hasAnyHeader) {

    if (
      sheet.getMaxColumns() <
      HEADERS.length
    ) {

      sheet.insertColumnsAfter(

        sheet.getMaxColumns(),

        HEADERS.length -
        sheet.getMaxColumns()

      );

    }


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


    return;

  }


  // ----------------------------------------------------------
  // EXISTING SHEET
  // ----------------------------------------------------------

  const normalizedExisting =
    currentHeaders.map(
      function(header) {

        return normalizeHeader(
          header
        );

      }
    );


  for (
    let i = 0;
    i < HEADERS.length;
    i++
  ) {

    const required =
      HEADERS[i];


    const normalizedRequired =
      normalizeHeader(
        required
      );


    if (
      normalizedExisting
        .indexOf(
          normalizedRequired
        ) !== -1
    ) {

      continue;

    }


    // --------------------------------------------------------
    // LEGACY ALIASES
    // --------------------------------------------------------

    const aliases =
      getHeaderAliases(
        required
      );


    let aliasFound =
      false;


    for (
      let a = 0;
      a < aliases.length;
      a++
    ) {

      if (
        normalizedExisting
          .indexOf(
            normalizeHeader(
              aliases[a]
            )
          ) !== -1
      ) {

        aliasFound =
          true;

        break;

      }

    }


    if (
      aliasFound
    ) {

      continue;

    }


    // --------------------------------------------------------
    // APPEND MISSING HEADER
    // --------------------------------------------------------

    const nextColumn =
      sheet.getLastColumn() +
      1;


    if (
      nextColumn >
      sheet.getMaxColumns()
    ) {

      sheet.insertColumnAfter(
        sheet.getMaxColumns()
      );

    }


    sheet
      .getRange(
        1,
        nextColumn
      )
      .setValue(
        required
      );


    sheet
      .getRange(
        1,
        nextColumn
      )
      .setFontWeight(
        "bold"
      );


    normalizedExisting.push(
      normalizedRequired
    );

  }

}


// ============================================================
// NORMALIZE HEADER
// ============================================================

function normalizeHeader(
  value
) {

  return normalize(
    value
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      " "
    )
    .trim();

}


// ============================================================
// HEADER ALIASES
// ============================================================

function getHeaderAliases(
  header
) {

  const key =
    normalizeHeader(
      header
    );


  const aliases = {

    "UID": [
      "ID",
      "USER ID",
      "USER_ID"
    ],

    "ACCOUNT S": [
      "ACCOUNT STATUS",
      "STATUS",
      "ACCOUNT_STATUS"
    ],

    "PHONE NO": [
      "PHONE",
      "MOBILE",
      "MOBILE NUMBER",
      "PHONE NUMBER"
    ],

    "OTP ATTEMPTS": [
      "OTP ATTEMPT",
      "ATTEMPT",
      "ATTEMPTS"
    ],

    "OTP LOCK UNTIL": [
      "OTP LOCK",
      "LOCK UNTIL"
    ],

    "OTP EXPIRES": [
      "OTP EXPIRY",
      "OTP EXPIRATION",
      "OTP EXPIRE"
    ],

    "LAST OTP SENT": [
      "OTP SENT",
      "LAST SENT"
    ],

    "CREATED AT": [
      "CREATED",
      "DATE CREATED"
    ],

    "VERIFIED AT": [
      "VERIFIED DATE",
      "DATE VERIFIED"
    ],

    "LAST LOGIN": [
      "LOGIN DATE",
      "LAST LOGIN DATE"
    ]

  };


  return aliases[key] ||
    [];

}


// ============================================================
// GET COLUMN INDEX
// ============================================================
//
// Returns 1-based spreadsheet column number.
//
// ============================================================

function getColumnIndex(
  sheet,
  field
) {

  const lastColumn =
    sheet.getLastColumn();


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  const wanted =
    normalizeHeader(
      field
    );


  for (
    let i = 0;
    i < headers.length;
    i++
  ) {

    if (
      normalizeHeader(
        headers[i]
      ) === wanted
    ) {

      return i + 1;

    }

  }


  const aliases =
    getHeaderAliases(
      field
    );


  for (
    let a = 0;
    a < aliases.length;
    a++
  ) {

    const alias =
      normalizeHeader(
        aliases[a]
      );


    for (
      let i = 0;
      i < headers.length;
      i++
    ) {

      if (
        normalizeHeader(
          headers[i]
        ) === alias
      ) {

        return i + 1;

      }

    }

  }


  return 0;

}


// ============================================================
// GET ALL USER ROWS
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
      sheet.getLastColumn()
    )
    .getValues();

}


// ============================================================
// FIND USER
// ============================================================

function findUser(
  identity
) {

  const sheet =
    getSheet();

  const rows =
    getRows(
      sheet
    );


  const targetRaw =
    normalize(
      identity
    );


  if (!targetRaw) {

    return null;

  }


  const target =
    targetRaw
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
        getRowField(
          sheet,
          row,
          "UID"
        )
      )
        .toLowerCase();


    const username =
      normalize(
        getRowField(
          sheet,
          row,
          "USERNAME"
        )
      )
        .toLowerCase();


    const gmail =
      normalizeEmail(
        getRowField(
          sheet,
          row,
          "GMAIL"
        )
      );


    const phone =
      normalizePhone(
        getRowField(
          sheet,
          row,
          "PHONE NO."
        )
      )
        .toLowerCase();


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
// GET FIELD FROM ROW
// ============================================================

function getRowField(
  sheet,
  row,
  field
) {

  const column =
    getColumnIndex(
      sheet,
      field
    );


  if (
    !column
  ) {

    return "";

  }


  return row[
    column - 1
  ];

}


// ============================================================
// SET FIELD ON EXACT USER ROW
// ============================================================

function setUserField(
  sheet,
  rowNumber,
  field,
  value
) {

  let column =
    getColumnIndex(
      sheet,
      field
    );


  // ----------------------------------------------------------
  // If missing, append it.
  // ----------------------------------------------------------

  if (!column) {

    const nextColumn =
      sheet.getLastColumn() +
      1;


    if (
      nextColumn >
      sheet.getMaxColumns()
    ) {

      sheet.insertColumnAfter(
        sheet.getMaxColumns()
      );

    }


    sheet
      .getRange(
        1,
        nextColumn
      )
      .setValue(
        field
      );


    sheet
      .getRange(
        1,
        nextColumn
      )
      .setFontWeight(
        "bold"
      );


    column =
      nextColumn;

  }


  sheet
    .getRange(
      rowNumber,
      column
    )
    .setValue(
      value
    );

}


// ============================================================
// USER OBJECT
// ============================================================

function userObject(
  row,
  sheet
) {

  const verifiedValue =
    getRowField(
      sheet,
      row,
      "VERIFIED"
    );


  return {

    uid:
      normalize(
        getRowField(
          sheet,
          row,
          "UID"
        )
      ),

    name:
      normalize(
        getRowField(
          sheet,
          row,
          "NAME"
        )
      ),

    username:
      normalize(
        getRowField(
          sheet,
          row,
          "USERNAME"
        )
      ),

    age:
      getRowField(
        sheet,
        row,
        "AGE"
      ),

    accountStatus:
      normalize(
        getRowField(
          sheet,
          row,
          "ACCOUNT_S"
        )
      ),

    gmail:
      normalize(
        getRowField(
          sheet,
          row,
          "GMAIL"
        )
      ),

    email:
      normalize(
        getRowField(
          sheet,
          row,
          "GMAIL"
        )
      ),

    phone:
      normalize(
        getRowField(
          sheet,
          row,
          "PHONE NO."
        )
      ),

    role:
      normalize(
        getRowField(
          sheet,
          row,
          "ROLE"
        )
      ) ||
      "Employee",

    verified:
      verifiedValue === true ||
      String(
        verifiedValue
      )
        .toUpperCase() ===
        "TRUE"

  };

}


// ============================================================
// GENERATE SESSION
// ============================================================

function createSession(
  user
) {

  const token =
    Utilities.getUuid() +
    "." +
    Utilities.getUuid();


  CacheService
    .getScriptCache()
    .put(

      "session_" +
      token,

      JSON.stringify({

        uid:
          user.uid,

        username:
          user.username,

        name:
          user.name,

        role:
          user.role

      }),

      SESSION_TTL_MINUTES *
      60

    );


  return token;

}


// ============================================================
// GET OTP IDENTITY
// ============================================================

function getOtpIdentity(
  data
) {

  data =
    data || {};


  return (
    data.identity ||
    data.uid ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone ||
    data.phoneNumber ||
    data.mobile ||
    ""
  );

}


// ============================================================
// CREATE OTP
// ============================================================
//
// This function stores the OTP on the EXACT user row.
//
// ============================================================

function createOTPForUser(
  found,
  channel
) {

  if (
    !found ||
    !found.sheet ||
    !found.rowNumber
  ) {

    return {

      success: false,

      message:
        "Invalid user record."

    };

  }


  const code =
    generateOTP();


  const expires =
    new Date(
      Date.now() +
      OTP_EXPIRY_MINUTES *
      60 *
      1000
    );


  const normalizedChannel =
    normalize(
      channel ||
      "both"
    )
      .toLowerCase();


  // ----------------------------------------------------------
  // SAVE TO EXACT ROW
  // ----------------------------------------------------------

  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP",
    code
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP EXPIRES",
    expires
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP ATTEMPTS",
    0
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP LOCK UNTIL",
    ""
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP CHANNEL",
    normalizedChannel
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "LAST OTP SENT",
    new Date()
  );


  // ----------------------------------------------------------
  // FIREBASE OTP MIRROR
  // ----------------------------------------------------------

  try {

    if (
      typeof sfFirebaseSaveOtp ===
      "function"
    ) {

      sfFirebaseSaveOtp({

        uid:
          getRowField(
            found.sheet,
            found.values,
            "UID"
          ),

        username:
          getRowField(
            found.sheet,
            found.values,
            "USERNAME"
          ),

        gmail:
          getRowField(
            found.sheet,
            found.values,
            "GMAIL"
          ),

        phone:
          getRowField(
            found.sheet,
            found.values,
            "PHONE NO."
          ),

        otp:
          code,

        otpExpires:
          expires.toISOString(),

        attempts:
          0,

        channel:
          normalizedChannel

      });

    }

  } catch (firebaseError) {

    console.error(
      "Firebase OTP mirror failed:",
      firebaseError
    );

  }


  const result = {

    success: true,

    uid:
      getRowField(
        found.sheet,
        found.values,
        "UID"
      ),

    username:
      getRowField(
        found.sheet,
        found.values,
        "USERNAME"
      ),

    gmail:
      getRowField(
        found.sheet,
        found.values,
        "GMAIL"
      ),

    email:
      getRowField(
        found.sheet,
        found.values,
        "GMAIL"
      ),

    phone:
      getRowField(
        found.sheet,
        found.values,
        "PHONE NO."
      ),

    channel:
      normalizedChannel,

    expiresAt:
      expires.toISOString(),

    otpSent:
      true,

    emailSent:
      false,

    smsSent:
      false,

    message:
      "Verification code prepared."

  };


  // ----------------------------------------------------------
  // DEMO OTP
  // ----------------------------------------------------------

  if (
    DEMO_MODE
  ) {

    result.otp =
      code;

    result.demoOtp =
      code;

  }


  return result;

}


// ============================================================
// GET EXISTING OTP IF VALID
// ============================================================

function getExistingOtp(
  found
) {

  const otpValue =
    normalize(
      getRowField(
        found.sheet,
        found.values,
        "OTP"
      )
    );


  const expiryValue =
    getRowField(
      found.sheet,
      found.values,
      "OTP EXPIRES"
    );


  if (
    !otpValue ||
    !/^\d{6}$/.test(
      otpValue
    )
  ) {

    return null;

  }


  const expires =
    expiryValue
      ? new Date(
          expiryValue
        )
      : null;


  if (
    !expires ||
    isNaN(
      expires.getTime()
    )
  ) {

    return null;

  }


  if (
    Date.now() >=
    expires.getTime()
  ) {

    return null;

  }


  return {

    otp:
      otpValue,

    expiresAt:
      expires.toISOString()

  };

}


// ============================================================
// REGISTER EMPLOYEE
// ============================================================
//
// UNIQUE UID SAFETY:
// ------------------------------------------------------------
// A Script Lock prevents two simultaneous registrations from
// calculating the same last row / interfering with one another.
//
// The UID is checked before insertion.
//
// appendRow() is followed by the exact row number calculated
// from the locked sheet state.
//
// ============================================================

function registerUser(
  data
) {

  data =
    data || {};


  const lock =
    LockService.getScriptLock();


  try {

    lock.waitLock(
      30000
    );


    const sheet =
      getSheet();


    // --------------------------------------------------------
    // INPUT
    // --------------------------------------------------------

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
        data.phone ||
        data.phoneNumber ||
        data.mobile
      );


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

      return {

        success: false,

        message:
          "All required registration fields must be completed."

      };

    }


    if (
      username.length < 4 ||
      username.length > 20
    ) {

      return {

        success: false,

        message:
          "Username must contain 4–20 characters."

      };

    }


    if (
      !/^[A-Za-z0-9._-]+$/.test(
        username
      )
    ) {

      return {

        success: false,

        message:
          "Username may only contain letters, numbers, dots, underscores, and hyphens."

      };

    }


    if (
      password.length < 8
    ) {

      return {

        success: false,

        message:
          "Password must contain at least 8 characters."

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
      !validEmail(
        gmail
      )
    ) {

      return {

        success: false,

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

        success: false,

        message:
          "Please provide a valid Philippine phone number."

      };

    }


    // --------------------------------------------------------
    // DUPLICATE CHECK
    // --------------------------------------------------------

    if (
      findUser(
        username
      )
    ) {

      return {

        success: false,

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

        success: false,

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

        success: false,

        message:
          "Phone number already exists."

      };

    }


    // --------------------------------------------------------
    // UNIQUE UID
    // --------------------------------------------------------

    const accountUid =
      generateUID();


    const now =
      new Date();


    // --------------------------------------------------------
    // APPEND ACCOUNT
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // Password is hashed before storage.
    //
    // --------------------------------------------------------

    const rowData = [

      accountUid,

      name,

      username,

      hashPassword(
        password
      ),

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

      "both",

      now,

      "",

      "",

      ""

    ];


    sheet.appendRow(
      rowData
    );


    // --------------------------------------------------------
    // EXACT ROW NUMBER
    // --------------------------------------------------------
    //
    // Because we hold the Script Lock, another registration
    // cannot insert between appendRow() and this calculation.
    //
    // --------------------------------------------------------

    const rowNumber =
      sheet.getLastRow();


    // --------------------------------------------------------
    // VERIFY UID WAS WRITTEN TO THE EXPECTED ROW
    // --------------------------------------------------------

    const storedUid =
      normalize(
        sheet
          .getRange(
            rowNumber,
            1
          )
          .getValue()
      );


    if (
      storedUid !==
      accountUid
    ) {

      throw new Error(
        "UID row verification failed."
      );

    }


    // --------------------------------------------------------
    // FIND THE EXACT CREATED USER
    // --------------------------------------------------------

    const found =
      findUser(
        accountUid
      );


    if (!found) {

      throw new Error(
        "Created account could not be located."
      );

    }


    // --------------------------------------------------------
    // CREATE OTP
    // --------------------------------------------------------

    const otpResult =
      createOTPForUser(
        found,
        "both"
      );


    if (
      !otpResult ||
      !otpResult.success
    ) {

      throw new Error(
        "Unable to create verification code."
      );

    }


    // --------------------------------------------------------
    // FIREBASE USER MIRROR
    // --------------------------------------------------------

    try {

      if (
        typeof sfFirebaseSaveUser ===
        "function"
      ) {

        sfFirebaseSaveUser({

          uid:
            accountUid,

          name:
            name,

          username:
            username,

          age:
            age,

          accountStatus:
            "PENDING",

          gmail:
            gmail,

          phone:
            phone,

          role:
            "Employee",

          verified:
            false

        });

      }

    } catch (firebaseError) {

      console.error(
        "Firebase user mirror failed:",
        firebaseError
      );

    }


    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return {

      success: true,

      uid:
        accountUid,

      name:
        name,

      username:
        username,

      gmail:
        gmail,

      email:
        gmail,

      phone:
        phone,

      role:
        "Employee",

      verified:
        false,

      accountStatus:
        "PENDING",

      otpSent:
        true,

      emailSent:
        false,

      smsSent:
        false,

      channel:
        "both",

      expiresAt:
        otpResult.expiresAt,

      demo:
        DEMO_MODE,

      otp:
        DEMO_MODE
          ? otpResult.otp
          : undefined,

      demoOtp:
        DEMO_MODE
          ? otpResult.demoOtp
          : undefined,

      message:
        "Registration successful. Your demo verification code is ready."

    };

  } catch (error) {

    console.error(
      "registerUser error:",
      error
    );


    return {

      success: false,

      message:
        error &&
        error.message
          ? error.message
          : "Registration failed."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (lockError) {

      console.error(
        "Unable to release registration lock:",
        lockError
      );

    }

  }

}


// ============================================================
// ADMIN REGISTRATION
// ============================================================
//
// Admin registration requires:
//
// Script Property:
// ADMIN_REGISTRATION_KEY
//
// The normal registration form cannot create Admin accounts
// unless this endpoint is explicitly called with the key.
//
// ============================================================

function registerAdmin(
  data
) {

  data =
    data || {};


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

      success: false,

      message:
        "Admin registration is restricted to authorized administrators."

    };

  }


  const lock =
    LockService.getScriptLock();


  try {

    lock.waitLock(
      30000
    );


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
      !age ||
      !gmail ||
      !phone
    ) {

      return {

        success: false,

        message:
          "All required admin fields must be completed."

      };

    }


    if (
      username.length < 4 ||
      username.length > 20
    ) {

      return {

        success: false,

        message:
          "Username must contain 4–20 characters."

      };

    }


    if (
      password.length < 8
    ) {

      return {

        success: false,

        message:
          "Password must contain at least 8 characters."

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
      !validEmail(
        gmail
      )
    ) {

      return {

        success: false,

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

        success: false,

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

        success: false,

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

        success: false,

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

        success: false,

        message:
          "Phone number already exists."

      };

    }


    const accountUid =
      generateUID();


    const now =
      new Date();


    sheet.appendRow([

      accountUid,

      name,

      username,

      hashPassword(
        password
      ),

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

      "both",

      now,

      "",

      "",

      ""

    ]);


    const rowNumber =
      sheet.getLastRow();


    const storedUid =
      normalize(
        sheet
          .getRange(
            rowNumber,
            1
          )
          .getValue()
      );


    if (
      storedUid !==
      accountUid
    ) {

      throw new Error(
        "Admin UID row verification failed."
      );

    }


    const found =
      findUser(
        accountUid
      );


    if (!found) {

      throw new Error(
        "Created admin account could not be located."
      );

    }


    const otpResult =
      createOTPForUser(
        found,
        "both"
      );


    if (
      !otpResult.success
    ) {

      throw new Error(
        "Unable to create admin verification code."
      );

    }


    try {

      if (
        typeof sfFirebaseSaveUser ===
        "function"
      ) {

        sfFirebaseSaveUser({

          uid:
            accountUid,

          name:
            name,

          username:
            username,

          age:
            age,

          accountStatus:
            "PENDING",

          gmail:
            gmail,

          phone:
            phone,

          role:
            "Admin",

          verified:
            false

        });

      }

    } catch (firebaseError) {

      console.error(
        "Firebase admin mirror failed:",
        firebaseError
      );

    }


    return {

      success: true,

      uid:
        accountUid,

      name:
        name,

      username:
        username,

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

      otpSent:
        true,

      emailSent:
        false,

      smsSent:
        false,

      expiresAt:
        otpResult.expiresAt,

      demo:
        DEMO_MODE,

      otp:
        DEMO_MODE
          ? otpResult.otp
          : undefined,

      demoOtp:
        DEMO_MODE
          ? otpResult.demoOtp
          : undefined,

      message:
        "Admin registration successful. Demo verification code is ready."

    };

  } catch (error) {

    console.error(
      "registerAdmin error:",
      error
    );


    return {

      success: false,

      message:
        error &&
        error.message
          ? error.message
          : "Admin registration failed."

    };

  } finally {

    try {

      lock.releaseLock();

    } catch (lockError) {

      console.error(
        "Admin registration lock release failed:",
        lockError
      );

    }

  }

}


// ============================================================
// LOGIN
// ============================================================

function loginUser(
  data
) {

  data =
    data || {};


  const identity =
    normalize(
      data.identity ||
      data.username ||
      data.email ||
      data.gmail ||
      data.phone
    )
      .toLowerCase();


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

      success: false,

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

      success: false,

      message:
        "Invalid username/email or password."

    };

  }


  const row =
    found.values;


  const savedPassword =
    String(
      getRowField(
        found.sheet,
        row,
        "PASSWORD"
      ) ||
      ""
    );


  const hashedPassword =
    hashPassword(
      password
    );


  // ----------------------------------------------------------
  // Support old plaintext records AND new hashed records.
  // ----------------------------------------------------------

  if (
    savedPassword !==
    hashedPassword &&
    savedPassword !==
    password
  ) {

    return {

      success: false,

      message:
        "Invalid username/email or password."

    };

  }


  const status =
    normalize(
      getRowField(
        found.sheet,
        row,
        "ACCOUNT_S"
      )
    )
      .toUpperCase();


  const verifiedValue =
    getRowField(
      found.sheet,
      row,
      "VERIFIED"
    );


  const verified =
    verifiedValue === true ||
    String(
      verifiedValue
    )
      .toUpperCase() ===
      "TRUE";


  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (
    status ===
    "SUSPENDED"
  ) {

    return {

      success: false,

      message:
        "This account has been suspended."

    };

  }


  if (
    status ===
    "DISABLED"
  ) {

    return {

      success: false,

      message:
        "This account has been disabled."

    };

  }


  if (
    status ===
    "BLOCKED"
  ) {

    return {

      success: false,

      message:
        "This account has been blocked."

    };

  }


  // ----------------------------------------------------------
  // UNVERIFIED
  // ----------------------------------------------------------

  if (!verified) {

    const existingOtp =
      getExistingOtp(
        found
      );


    return {

      success: false,

      verified: false,

      requiresVerification:
        true,

      uid:
        getRowField(
          found.sheet,
          row,
          "UID"
        ),

      name:
        getRowField(
          found.sheet,
          row,
          "NAME"
        ),

      username:
        getRowField(
          found.sheet,
          row,
          "USERNAME"
        ),

      gmail:
        getRowField(
          found.sheet,
          row,
          "GMAIL"
        ),

      email:
        getRowField(
          found.sheet,
          row,
          "GMAIL"
        ),

      phone:
        getRowField(
          found.sheet,
          row,
          "PHONE NO."
        ),

      role:
        getRowField(
          found.sheet,
          row,
          "ROLE"
        ) ||
        "Employee",

      otpReady:
        !!existingOtp,

      expiresAt:
        existingOtp
          ? existingOtp.expiresAt
          : null,

      demo:
        DEMO_MODE,

      otp:
        DEMO_MODE &&
        existingOtp
          ? existingOtp.otp
          : undefined,

      demoOtp:
        DEMO_MODE &&
        existingOtp
          ? existingOtp.otp
          : undefined,

      message:
        "Account is not verified. Please verify your OTP."

    };

  }


  // ----------------------------------------------------------
  // SESSION
  // ----------------------------------------------------------

  const user =
    userObject(
      row,
      found.sheet
    );


  const token =
    createSession(
      user
    );


  // ----------------------------------------------------------
  // LAST LOGIN
  // ----------------------------------------------------------

  setUserField(
    found.sheet,
    found.rowNumber,
    "LAST LOGIN",
    new Date()
  );


  return {

    success: true,

    verified: true,

    token:
      token,

    message:
      "Login successful.",

    user:
      user

  };

}


// ============================================================
// SESSION
// ============================================================

function session(
  data
) {

  data =
    data || {};


  const token =
    normalize(
      data.token
    );


  if (!token) {

    return {

      success: false,

      message:
        "Session expired."

    };

  }


  const raw =
    CacheService
      .getScriptCache()
      .get(
        "session_" +
        token
      );


  if (!raw) {

    return {

      success: false,

      message:
        "Session expired."

    };

  }


  try {

    return {

      success: true,

      user:
        JSON.parse(
          raw
        )

    };

  } catch (error) {

    return {

      success: false,

      message:
        "Invalid session."

    };

  }

}


// ============================================================
// LOGOUT
// ============================================================

function logout(
  data
) {

  data =
    data || {};


  const token =
    normalize(
      data.token
    );


  if (token) {

    CacheService
      .getScriptCache()
      .remove(
        "session_" +
        token
      );

  }


  return {

    success: true,

    message:
      "Logged out successfully."

  };

}


// ============================================================
// VERIFY OTP
// ============================================================
//
// Successful account verification:
//
// ACCOUNT_S = VERIFIED
// VERIFIED = TRUE
// OTP cleared
// Attempts reset
// Lock cleared
//
// A new login session is also returned so the frontend can
// immediately redirect to dashboard.html.
//
// ============================================================

function verifyOTP(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
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

      success: false,

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

      success: false,

      message:
        "Please enter a valid six-digit OTP."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Account not found."

    };

  }


  const sheet =
    found.sheet;


  const row =
    found.values;


  // ----------------------------------------------------------
  // LOCK CHECK
  // ----------------------------------------------------------

  const lockValue =
    getRowField(
      sheet,
      row,
      "OTP LOCK UNTIL"
    );


  const lockUntil =
    lockValue
      ? new Date(
          lockValue
        )
      : null;


  if (
    lockUntil &&
    !isNaN(
      lockUntil.getTime()
    ) &&
    Date.now() <
      lockUntil.getTime()
  ) {

    const remaining =
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

      remainingMinutes:
        remaining,

      message:
        "Too many incorrect OTP attempts. Try again in approximately " +
        remaining +
        " minute(s)."

    };

  }


  // ----------------------------------------------------------
  // EXPIRATION
  // ----------------------------------------------------------

  const expiresValue =
    getRowField(
      sheet,
      row,
      "OTP EXPIRES"
    );


  const expires =
    expiresValue
      ? new Date(
          expiresValue
        )
      : null;


  if (
    !expires ||
    isNaN(
      expires.getTime()
    )
  ) {

    return {

      success: false,

      expired: true,

      message:
        "No active OTP exists. Request a new verification code."

    };

  }


  if (
    Date.now() >
    expires.getTime()
  ) {

    return {

      success: false,

      expired: true,

      message:
        "This verification code has expired. Request a new OTP."

    };

  }


  // ----------------------------------------------------------
  // COMPARE OTP
  // ----------------------------------------------------------

  const storedOTP =
    normalize(
      getRowField(
        sheet,
        row,
        "OTP"
      )
    );


  if (
    enteredOTP !==
    storedOTP
  ) {

    let attempts =
      Number(
        getRowField(
          sheet,
          row,
          "OTP ATTEMPTS"
        )
      ) || 0;


    attempts++;


    setUserField(
      sheet,
      found.rowNumber,
      "OTP ATTEMPTS",
      attempts
    );


    // --------------------------------------------------------
    // FOURTH FAILURE = 30 MINUTE LOCK
    // --------------------------------------------------------

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


      setUserField(
        sheet,
        found.rowNumber,
        "OTP LOCK UNTIL",
        newLock
      );


      return {

        success: false,

        locked: true,

        attempts:
          attempts,

        remainingAttempts:
          0,

        message:
          "Too many incorrect OTP attempts. Your verification is temporarily locked for " +
          OTP_LOCK_MINUTES +
          " minutes."

      };

    }


    const remaining =
      MAX_OTP_ATTEMPTS -
      attempts;


    return {

      success: false,

      attempts:
        attempts,

      remainingAttempts:
        remaining,

      message:
        "Invalid OTP. You have " +
        remaining +
        " attempt(s) remaining."

    };

  }


  // ==========================================================
  // CORRECT OTP
  // ==========================================================

  setUserField(
    sheet,
    found.rowNumber,
    "ACCOUNT_S",
    "VERIFIED"
  );


  setUserField(
    sheet,
    found.rowNumber,
    "VERIFIED",
    true
  );


  setUserField(
    sheet,
    found.rowNumber,
    "OTP",
    ""
  );


  setUserField(
    sheet,
    found.rowNumber,
    "OTP EXPIRES",
    ""
  );


  setUserField(
    sheet,
    found.rowNumber,
    "OTP ATTEMPTS",
    0
  );


  setUserField(
    sheet,
    found.rowNumber,
    "OTP LOCK UNTIL",
    ""
  );


  setUserField(
    sheet,
    found.rowNumber,
    "VERIFIED AT",
    new Date()
  );


  // ----------------------------------------------------------
  // FIREBASE
  // ----------------------------------------------------------

  const verifiedUid =
    getRowField(
      sheet,
      row,
      "UID"
    );


  try {

    if (
      typeof sfFirebaseMarkVerified ===
      "function"
    ) {

      sfFirebaseMarkVerified(
        verifiedUid
      );

    }

  } catch (firebaseError) {

    console.error(
      "Firebase verification mirror failed:",
      firebaseError
    );

  }


  // ----------------------------------------------------------
  // READ UPDATED USER
  // ----------------------------------------------------------

  const updated =
    findUser(
      verifiedUid
    );


  if (!updated) {

    return {

      success: true,

      verified: true,

      message:
        "Account verified successfully."

    };

  }


  const updatedUser =
    userObject(
      updated.values,
      updated.sheet
    );


  // ----------------------------------------------------------
  // CREATE SESSION
  // ----------------------------------------------------------

  const token =
    createSession(
      updatedUser
    );


  return {

    success: true,

    verified: true,

    accountStatus:
      "VERIFIED",

    token:
      token,

    user:
      updatedUser,

    message:
      "Account verified successfully. Redirecting to your dashboard."

  };

}


// ============================================================
// RESEND OTP
// ============================================================

function resendOTP(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  if (!identity) {

    return {

      success: false,

      message:
        "Username, Gmail, or phone number is required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Account not found."

    };

  }


  const row =
    found.values;


  // ----------------------------------------------------------
  // ALREADY VERIFIED
  // ----------------------------------------------------------

  const verifiedValue =
    getRowField(
      found.sheet,
      row,
      "VERIFIED"
    );


  const verified =
    verifiedValue === true ||
    String(
      verifiedValue
    )
      .toUpperCase() ===
      "TRUE";


  if (verified) {

    return {

      success: false,

      verified: true,

      message:
        "This account is already verified."

    };

  }


  // ----------------------------------------------------------
  // LOCK CHECK
  // ----------------------------------------------------------

  const lockValue =
    getRowField(
      found.sheet,
      row,
      "OTP LOCK UNTIL"
    );


  const lockUntil =
    lockValue
      ? new Date(
          lockValue
        )
      : null;


  if (
    lockUntil &&
    !isNaN(
      lockUntil.getTime()
    ) &&
    Date.now() <
      lockUntil.getTime()
  ) {

    return {

      success: false,

      locked: true,

      message:
        "OTP verification is temporarily locked for " +
        OTP_LOCK_MINUTES +
        " minutes."

    };

  }


  // ----------------------------------------------------------
  // COOLDOWN
  // ----------------------------------------------------------

  const lastSentValue =
    getRowField(
      found.sheet,
      row,
      "LAST OTP SENT"
    );


  const lastSent =
    lastSentValue
      ? new Date(
          lastSentValue
        )
      : null;


  if (
    lastSent &&
    !isNaN(
      lastSent.getTime()
    )
  ) {

    const elapsed =
      (
        Date.now() -
        lastSent.getTime()
      ) / 1000;


    if (
      elapsed <
      RESEND_COOLDOWN_SECONDS
    ) {

      const remaining =
        Math.ceil(
          RESEND_COOLDOWN_SECONDS -
          elapsed
        );


      return {

        success: false,

        cooldown: true,

        remainingSeconds:
          remaining,

        message:
          "Please wait " +
          remaining +
          " seconds before requesting another OTP."

      };

    }

  }


  // ----------------------------------------------------------
  // CREATE NEW OTP
  // ----------------------------------------------------------

  const result =
    createOTPForUser(

      found,

      data.channel ||
      data.otpChannel ||
      "both"

    );


  if (
    !result.success
  ) {

    return result;

  }


  return {

    success: true,

    otpSent: true,

    emailSent: false,

    smsSent: false,

    uid:
      result.uid,

    username:
      result.username,

    gmail:
      result.gmail,

    email:
      result.email,

    phone:
      result.phone,

    expiresAt:
      result.expiresAt,

    channel:
      result.channel,

    demo:
      DEMO_MODE,

    otp:
      DEMO_MODE
        ? result.otp
        : undefined,

    demoOtp:
      DEMO_MODE
        ? result.demoOtp
        : undefined,

    message:
      "A new demo verification code is ready."

  };

}


// ============================================================
// REQUEST OTP
// ============================================================
//
// Compatibility endpoint used by some existing auth.js code.
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
// PREPARE OTP
// ============================================================
//
// This is intentionally different from resend.
//
// If a valid OTP already exists, it returns that OTP instead
// of creating a second OTP.
//
// This is important after registration:
//
// register
//    ↓
// OTP already exists
//    ↓
// verify.html
//    ↓
// prepareOtp
//    ↓
// same OTP is returned
//
// ============================================================

function prepareOtp(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  if (!identity) {

    return {

      success: false,

      message:
        "Username, Gmail, or phone number is required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Account not found."

    };

  }


  const row =
    found.values;


  const verifiedValue =
    getRowField(
      found.sheet,
      row,
      "VERIFIED"
    );


  const verified =
    verifiedValue === true ||
    String(
      verifiedValue
    )
      .toUpperCase() ===
      "TRUE";


  if (verified) {

    return {

      success: false,

      verified: true,

      message:
        "This account is already verified."

    };

  }


  const existing =
    getExistingOtp(
      found
    );


  if (existing) {

    return {

      success: true,

      uid:
        getRowField(
          found.sheet,
          row,
          "UID"
        ),

      username:
        getRowField(
          found.sheet,
          row,
          "USERNAME"
        ),

      gmail:
        getRowField(
          found.sheet,
          row,
          "GMAIL"
        ),

      email:
        getRowField(
          found.sheet,
          row,
          "GMAIL"
        ),

      phone:
        getRowField(
          found.sheet,
          row,
          "PHONE NO."
        ),

      channel:
        getRowField(
          found.sheet,
          row,
          "OTP CHANNEL"
        ) ||
        "both",

      expiresAt:
        existing.expiresAt,

      otpReady:
        true,

      demo:
        DEMO_MODE,

      otp:
        DEMO_MODE
          ? existing.otp
          : undefined,

      demoOtp:
        DEMO_MODE
          ? existing.otp
          : undefined,

      message:
        "Existing verification code is ready."

    };

  }


  // If no active OTP exists, generate one.
  return createOTPForUser(
    found,
    data.channel ||
    data.otpChannel ||
    "both"
  );

}


// ============================================================
// GENERATE OTP
// ============================================================
//
// Alias used by api.js.
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
// GET USER
// ============================================================

function getUser(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  if (!identity) {

    return {

      success: false,

      message:
        "Username, email, or phone is required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "User not found."

    };

  }


  return {

    success: true,

    user:
      userObject(
        found.values,
        found.sheet
      )

  };

}


// ============================================================
// UPDATE ACCOUNT STATUS
// ============================================================

function updateAccountStatus(
  data
) {

  data =
    data || {};


  const username =
    normalize(
      data.username ||
      data.identity
    );


  const status =
    normalize(
      data.status
    )
      .toUpperCase();


  const allowedStatuses = [

    "PENDING",

    "VERIFIED",

    "ACTIVE",

    "SUSPENDED",

    "DISABLED",

    "BLOCKED"

  ];


  if (
    allowedStatuses.indexOf(
      status
    ) === -1
  ) {

    return {

      success: false,

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

      success: false,

      message:
        "Username not found."

    };

  }


  setUserField(
    found.sheet,
    found.rowNumber,
    "ACCOUNT_S",
    status
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "VERIFIED",
    status === "VERIFIED" ||
    status === "ACTIVE"
  );


  return {

    success: true,

    message:
      "Account status updated."

  };

}


// ============================================================
// FORGOT PASSWORD
// ============================================================
//
// DEMO VERSION:
//
// Generates a recovery OTP and returns demoOtp.
//
// No Gmail/SMS is actually sent.
//
// ============================================================

function forgotPassword(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  if (!identity) {

    return {

      success: false,

      message:
        "Email, username, or phone is required."

    };

  }


  const found =
    findUser(
      identity
    );


  // ----------------------------------------------------------
  // Do not reveal account existence.
  // ----------------------------------------------------------

  if (!found) {

    return {

      success: true,

      found: false,

      message:
        "If the account exists, a recovery code is available."

    };

  }


  const result =
    createOTPForUser(
      found,
      "both"
    );


  if (
    !result.success
  ) {

    return {

      success: false,

      message:
        "Unable to create recovery code."

    };

  }


  return {

    success: true,

    found: true,

    uid:
      result.uid,

    username:
      result.username,

    gmail:
      result.gmail,

    email:
      result.email,

    phone:
      result.phone,

    expiresAt:
      result.expiresAt,

    demo:
      DEMO_MODE,

    otp:
      DEMO_MODE
        ? result.otp
        : undefined,

    demoOtp:
      DEMO_MODE
        ? result.demoOtp
        : undefined,

    message:
      "Recovery code prepared."

  };

}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================
//
// IMPORTANT:
//
// Recovery OTP verification does NOT mark the account as
// verified.
//
// It only confirms that the recovery code is correct.
//
// The password reset endpoint verifies the OTP again before
// changing the password.
//
// ============================================================

function verifyRecoveryOtp(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
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

      success: false,

      message:
        "Identity and recovery code are required."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Invalid recovery request."

    };

  }


  const row =
    found.values;


  // ----------------------------------------------------------
  // LOCK
  // ----------------------------------------------------------

  const lockValue =
    getRowField(
      found.sheet,
      row,
      "OTP LOCK UNTIL"
    );


  const lockUntil =
    lockValue
      ? new Date(
          lockValue
        )
      : null;


  if (
    lockUntil &&
    !isNaN(
      lockUntil.getTime()
    ) &&
    Date.now() <
      lockUntil.getTime()
  ) {

    return {

      success: false,

      locked: true,

      message:
        "Recovery verification is temporarily locked."

    };

  }


  // ----------------------------------------------------------
  // EXPIRATION
  // ----------------------------------------------------------

  const expiryValue =
    getRowField(
      found.sheet,
      row,
      "OTP EXPIRES"
    );


  const expires =
    expiryValue
      ? new Date(
          expiryValue
        )
      : null;


  if (
    !expires ||
    isNaN(
      expires.getTime()
    ) ||
    Date.now() >
      expires.getTime()
  ) {

    return {

      success: false,

      expired: true,

      message:
        "Recovery code has expired."

    };

  }


  const storedOTP =
    normalize(
      getRowField(
        found.sheet,
        row,
        "OTP"
      )
    );


  if (
    enteredOTP !==
    storedOTP
  ) {

    let attempts =
      Number(
        getRowField(
          found.sheet,
          row,
          "OTP ATTEMPTS"
        )
      ) || 0;


    attempts++;


    setUserField(
      found.sheet,
      found.rowNumber,
      "OTP ATTEMPTS",
      attempts
    );


    if (
      attempts >=
      MAX_OTP_ATTEMPTS
    ) {

      const lock =
        new Date(
          Date.now() +
          OTP_LOCK_MINUTES *
          60 *
          1000
        );


      setUserField(
        found.sheet,
        found.rowNumber,
        "OTP LOCK UNTIL",
        lock
      );


      return {

        success: false,

        locked: true,

        remainingAttempts:
          0,

        message:
          "Too many incorrect recovery attempts. Try again in " +
          OTP_LOCK_MINUTES +
          " minutes."

      };

    }


    return {

      success: false,

      remainingAttempts:
        MAX_OTP_ATTEMPTS -
        attempts,

      message:
        "Invalid recovery code. You have " +
        (
          MAX_OTP_ATTEMPTS -
          attempts
        ) +
        " attempt(s) remaining."

    };

  }


  // ----------------------------------------------------------
  // CORRECT
  // ----------------------------------------------------------

  return {

    success: true,

    recoveryVerified:
      true,

    uid:
      getRowField(
        found.sheet,
        row,
        "UID"
      ),

    username:
      getRowField(
        found.sheet,
        row,
        "USERNAME"
      ),

    message:
      "Recovery code verified successfully."

  };

}


// ============================================================
// RESET PASSWORD
// ============================================================

function resetPassword(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  const enteredOTP =
    normalize(
      data.otp
    );


  const newPassword =
    String(
      data.newPassword ||
      ""
    );


  const confirmPassword =
    String(
      data.confirmPassword ||
      data.confirmNewPassword ||
      ""
    );


  if (
    !identity ||
    !enteredOTP
  ) {

    return {

      success: false,

      message:
        "Identity and recovery code are required."

    };

  }


  if (
    newPassword.length < 8
  ) {

    return {

      success: false,

      message:
        "Password must contain at least 8 characters."

    };

  }


  if (
    newPassword !==
    confirmPassword
  ) {

    return {

      success: false,

      message:
        "Passwords do not match."

    };

  }


  const found =
    findUser(
      identity
    );


  if (!found) {

    return {

      success: false,

      message:
        "Unable to reset password."

    };

  }


  const row =
    found.values;


  const storedOTP =
    normalize(
      getRowField(
        found.sheet,
        row,
        "OTP"
      )
    );


  const expiryValue =
    getRowField(
      found.sheet,
      row,
      "OTP EXPIRES"
    );


  const expires =
    expiryValue
      ? new Date(
          expiryValue
        )
      : null;


  if (
    enteredOTP !==
    storedOTP ||
    !expires ||
    isNaN(
      expires.getTime()
    ) ||
    Date.now() >
      expires.getTime()
  ) {

    return {

      success: false,

      message:
        "Invalid or expired recovery code."

    };

  }


  // ----------------------------------------------------------
  // UPDATE PASSWORD
  // ----------------------------------------------------------

  setUserField(
    found.sheet,
    found.rowNumber,
    "PASSWORD",
    hashPassword(
      newPassword
    )
  );


  // ----------------------------------------------------------
  // CLEAR OTP
  // ----------------------------------------------------------

  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP",
    ""
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP EXPIRES",
    ""
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP ATTEMPTS",
    0
  );


  setUserField(
    found.sheet,
    found.rowNumber,
    "OTP LOCK UNTIL",
    ""
  );


  return {

    success: true,

    message:
      "Password reset successfully. You can now sign in."

  };

}


// ============================================================
// REQUIRE SESSION
// ============================================================

function requireSession(
  data
) {

  const result =
    session(
      data
    );


  if (
    !result.success
  ) {

    throw new Error(
      "Unauthorized"
    );

  }


  return result.user;

}


// ============================================================
// API DISPATCHER
// ============================================================
//
// IMPORTANT:
//
// This is the ONLY doPost() in the project.
//
// ============================================================

function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      return response({

        success: false,

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

        success: false,

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


      // ======================================================
      // AUTHENTICATION
      // ======================================================

      case "register":

        return response(
          registerUser(
            data
          )
        );


      case "registerAdmin":

        return response(
          registerAdmin(
            data
          )
        );


      case "login":

        return response(
          loginUser(
            data
          )
        );


      case "session":

        return response(
          session(
            data
          )
        );


      case "logout":

        return response(
          logout(
            data
          )
        );


      case "getUser":

        return response(
          getUser(
            data
          )
        );


      case "updateStatus":

      case "updateAccountStatus":

        return response(
          updateAccountStatus(
            data
          )
        );


      // ======================================================
      // OTP
      // ======================================================

      case "prepareOtp":

        return response(
          prepareOtp(
            data
          )
        );


      case "generateOtp":

        return response(
          generateOtp(
            data
          )
        );


      case "verifyOtp":

        return response(
          verifyOTP(
            data
          )
        );


      case "resendOtp":

        return response(
          resendOTP(
            data
          )
        );


      case "requestOtp":

        return response(
          requestOtp(
            data
          )
        );


      // ======================================================
      // PASSWORD RECOVERY
      // ======================================================

      case "forgotPassword":

        return response(
          forgotPassword(
            data
          )
        );


      case "verifyRecoveryOtp":

        return response(
          verifyRecoveryOtp(
            data
          )
        );


      case "resetPassword":

        return response(
          resetPassword(
            data
          )
        );


      // ======================================================
      // INVENTORY COMPATIBILITY
      // ======================================================
      //
      // If your separate inventory.gs contains
      // SFInv_dispatch(), inventory actions continue to work.
      //
      // ======================================================

      default:

        if (
          typeof SFInv_dispatch ===
          "function"
        ) {

          return response(
            SFInv_dispatch(
              action,
              data
            )
          );

        }


        return response({

          success: false,

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
// GET / HEALTH CHECK
// ============================================================
//
// Open your /exec URL in a browser.
//
// Expected:
//
// {
//   "success": true,
//   "status": "ONLINE",
//   "demoMode": true
// }
//
// ============================================================

function doGet() {

  return response({

    success: true,

    system:
      "StockFlow Inventory System",

    service:
      "Google Apps Script Authentication API",

    status:
      "ONLINE",

    demoMode:
      DEMO_MODE,

    timestamp:
      new Date()
        .toISOString(),

    message:
      "StockFlow authentication backend is running."

  });

}
