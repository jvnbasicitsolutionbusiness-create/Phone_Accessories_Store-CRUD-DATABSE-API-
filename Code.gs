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
// DEMO MODE:
// Backend generates a random 6-digit OTP.
// Frontend receives demoOtp and can auto-fill the OTP boxes.
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
// FINAL DATABASE STRUCTURE:
//
// A  ID
// B  UID
// C  NAME
// D  USERNAME
// E  PASSWORD
// F  AGE
// G  ACCOUNT_S
// H  GMAIL
// I  PHONE NO.
// J  ROLE
// K  VERIFIED
// L  OTP
// M  OTP EXPIRES
// N  OTP ATTEMPTS
// O  OTP LOCK UNTIL
// P  OTP CHANNEL
// Q  CREATED AT
// R  VERIFIED AT
// S  LAST OTP SENT
// T  LAST LOGIN
//
// ============================================================

const HEADERS = [

  "ID",
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
  "LAST LOGIN"

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
// EMAIL
// ============================================================

function normalizeEmail(value) {

  return normalize(value)
    .toLowerCase();

}


function validEmail(email) {

  return /^\S+@\S+\.\S+$/
    .test(
      normalizeEmail(email)
    );

}


// ============================================================
// PHILIPPINE PHONE
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


function validPhone(phone) {

  return /^\+639\d{9}$/
    .test(
      normalizePhone(phone)
    );

}


// ============================================================
// SCRIPT PROPERTIES
// ============================================================

function getProperty(name) {

  return PropertiesService
    .getScriptProperties()
    .getProperty(name) || "";

}


// Firebase compatibility helper.
//
// Your firebase.gs expects sfProp().
//
// ============================================================

function sfProp(name) {

  return getProperty(name);

}


// Firebase compatibility helper.
//
// ============================================================

function sfErrorMessage(error) {

  if (
    error &&
    error.message
  ) {

    return String(
      error.message
    );

  }

  return String(
    error || "Unknown error."
  );

}


// ============================================================
// PASSWORD HASH
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
// OTP
// ============================================================

function generateOTP() {

  const minimum =
    Math.pow(
      10,
      OTP_LENGTH - 1
    );

  const maximum =
    Math.pow(
      10,
      OTP_LENGTH
    ) - 1;

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
// UID GENERATION
// ============================================================
//
// UID is NOT the numeric ID.
//
// Example:
//
// ID  = 1
// UID = sf_20260903...
//
// ============================================================

function generateUID() {

  const sheet =
    getSheet();

  const maximumAttempts =
    100;


  for (
    let attempt = 0;
    attempt < maximumAttempts;
    attempt++
  ) {

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


    const candidate =
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

  }


  throw new Error(
    "Unable to generate a unique UID."
  );

}


// ============================================================
// UID EXISTS
// ============================================================
//
// IMPORTANT:
//
// UID is now COLUMN B.
//
// Do NOT check column A because A is numeric ID.
//
// ============================================================

function uidExists(
  sheet,
  candidate
) {

  const uidColumn =
    getColumnIndex(
      sheet,
      "UID"
    );


  if (
    !uidColumn
  ) {

    return false;

  }


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
        uidColumn,
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
// AUTO-INCREMENT ID
// ============================================================
//
// IMPORTANT:
//
// ID is never generated using lastRow + 1.
//
// Instead:
//
// MAX(existing numeric ID) + 1
//
// This means deleting ID 3 will NOT cause the next account
// to reuse ID 3.
//
// Example:
//
// 1
// 2
// 5
//
// next = 6
//
// ============================================================

function generateNextID(
  sheet
) {

  const idColumn =
    getColumnIndex(
      sheet,
      "ID"
    );


  if (
    !idColumn
  ) {

    throw new Error(
      "ID column was not found."
    );

  }


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return 1;

  }


  const values =
    sheet
      .getRange(
        2,
        idColumn,
        lastRow - 1,
        1
      )
      .getValues();


  let maximumID =
    0;


  values.forEach(
    function(row) {

      const value =
        row[0];


      const numeric =
        Number(
          value
        );


      if (
        Number.isInteger(
          numeric
        ) &&
        numeric > maximumID
      ) {

        maximumID =
          numeric;

      }

    }
  );


  return (
    maximumID +
    1
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


  if (
    !sheet
  ) {

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
// ENSURE HEADERS
// ============================================================
//
// This version does NOT treat ID as an alias for UID.
//
// ID and UID are separate fields.
//
// ============================================================

function ensureHeaders(
  sheet
) {

  const lastColumn =
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
        lastColumn
      )
      .getValues()[0];


  const hasAnyHeader =
    currentHeaders.some(
      function(value) {

        return normalize(
          value
        ) !== "";

      }
    );


  // ----------------------------------------------------------
  // EMPTY SHEET
  // ----------------------------------------------------------

  if (
    !hasAnyHeader
  ) {

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

  const existing =
    currentHeaders.map(
      normalizeHeader
    );


  HEADERS.forEach(
    function(required) {

      const wanted =
        normalizeHeader(
          required
        );


      if (
        existing.indexOf(
          wanted
        ) !== -1
      ) {

        return;

      }


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


      existing.push(
        wanted
      );

    }
  );

}


// ============================================================
// COLUMN INDEX
// ============================================================
//
// Returns a 1-based column number.
//
// ============================================================

function getColumnIndex(
  sheet,
  field
) {

  const lastColumn =
    sheet.getLastColumn();


  if (
    lastColumn < 1
  ) {

    return 0;

  }


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


  return 0;

}


// ============================================================
// GET ROWS
// ============================================================

function getRows(
  sheet
) {

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
// GET ROW FIELD
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
// SET USER FIELD
// ============================================================

function setUserField(
  sheet,
  rowNumber,
  field,
  value
) {

  const column =
    getColumnIndex(
      sheet,
      field
    );


  if (
    !column
  ) {

    throw new Error(
      "Required column not found: " +
      field
    );

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


  if (
    !targetRaw
  ) {

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


    const id =
      normalize(
        getRowField(
          sheet,
          row,
          "ID"
        )
      )
        .toLowerCase();


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
      target === id ||
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

    id:
      Number(
        getRowField(
          sheet,
          row,
          "ID"
        )
      ) || null,

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
// SESSION
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

        id:
          user.id,

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
// OTP IDENTITY
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
    data.mobileNumber ||
    ""
  );

}


// ============================================================
// CREATE OTP FOR USER
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
  // WRITE TO EXACT USER ROW
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


  const uid =
    getRowField(
      found.sheet,
      found.values,
      "UID"
    );


  const username =
    getRowField(
      found.sheet,
      found.values,
      "USERNAME"
    );


  const gmail =
    getRowField(
      found.sheet,
      found.values,
      "GMAIL"
    );


  const phone =
    getRowField(
      found.sheet,
      found.values,
      "PHONE NO."
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
          uid,

        username:
          username,

        gmail:
          gmail,

        phone:
          phone,

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

  } catch (
    firebaseError
  ) {

    console.error(
      "Firebase OTP mirror failed:",
      firebaseError
    );

  }


  const result = {

    success: true,

    id:
      Number(
        getRowField(
          found.sheet,
          found.values,
          "ID"
        )
      ) || null,

    uid:
      uid,

    username:
      username,

    gmail:
      gmail,

    email:
      gmail,

    phone:
      phone,

    channel:
      normalizedChannel,

    expiresAt:
      expires.toISOString(),

    otpReady:
      true,

    otpSent:
      true,

    emailSent:
      false,

    smsSent:
      false,

    demo:
      DEMO_MODE,

    message:
      "Verification code prepared."

  };


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
// EXISTING OTP
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
        data.mobile ||
        data.mobileNumber
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
    // DUPLICATES
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
    // GENERATE IDs
    // --------------------------------------------------------

    const nextID =
      generateNextID(
        sheet
      );


    const accountUid =
      generateUID();


    const now =
      new Date();


    // --------------------------------------------------------
    // APPEND NEW ACCOUNT
    // --------------------------------------------------------

    const rowData = [

      nextID,

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


    if (
      rowData.length !==
      HEADERS.length
    ) {

      throw new Error(
        "Registration data/header count mismatch."
      );

    }


    sheet.appendRow(
      rowData
    );


    // --------------------------------------------------------
    // EXACT ROW
    // --------------------------------------------------------

    const rowNumber =
      sheet.getLastRow();


    // --------------------------------------------------------
    // VERIFY ID
    // --------------------------------------------------------

    const storedID =
      Number(
        sheet
          .getRange(
            rowNumber,
            getColumnIndex(
              sheet,
              "ID"
            )
          )
          .getValue()
      );


    if (
      storedID !==
      nextID
    ) {

      throw new Error(
        "ID row verification failed."
      );

    }


    // --------------------------------------------------------
    // VERIFY UID
    // --------------------------------------------------------

    const storedUid =
      normalize(
        sheet
          .getRange(
            rowNumber,
            getColumnIndex(
              sheet,
              "UID"
            )
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
    // FIND EXACT USER
    // --------------------------------------------------------

    const found =
      findUser(
        accountUid
      );


    if (
      !found
    ) {

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

          id:
            nextID,

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

    } catch (
      firebaseError
    ) {

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

      id:
        nextID,

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

      otpReady:
        true,

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

  } catch (
    error
  ) {

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

    } catch (
      lockError
    ) {

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
        data.phone ||
        data.phoneNumber
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


    const nextID =
      generateNextID(
        sheet
      );


    const accountUid =
      generateUID();


    const now =
      new Date();


    sheet.appendRow([

      nextID,

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


    const storedID =
      Number(
        sheet
          .getRange(
            rowNumber,
            getColumnIndex(
              sheet,
              "ID"
            )
          )
          .getValue()
      );


    if (
      storedID !==
      nextID
    ) {

      throw new Error(
        "Admin ID row verification failed."
      );

    }


    const storedUid =
      normalize(
        sheet
          .getRange(
            rowNumber,
            getColumnIndex(
              sheet,
              "UID"
            )
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


    if (
      !found
    ) {

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

          id:
            nextID,

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

    } catch (
      firebaseError
    ) {

      console.error(
        "Firebase admin mirror failed:",
        firebaseError
      );

    }


    return {

      success: true,

      id:
        nextID,

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

      otpReady:
        true,

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

  } catch (
    error
  ) {

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

    } catch (
      lockError
    ) {

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


  if (
    !found
  ) {

    return {

      success: false,

      message:
        "Invalid username/email or password."

    };

  }


  const savedPassword =
    String(
      getRowField(
        found.sheet,
        found.values,
        "PASSWORD"
      ) ||
      ""
    );


  const hashedPassword =
    hashPassword(
      password
    );


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
        found.values,
        "ACCOUNT_S"
      )
    )
      .toUpperCase();


  const verifiedValue =
    getRowField(
      found.sheet,
      found.values,
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
  // ACCOUNT STATUS
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

  if (
    !verified
  ) {

    const existingOtp =
      getExistingOtp(
        found
      );


    return {

      success: false,

      verified: false,

      requiresVerification:
        true,

      id:
        Number(
          getRowField(
            found.sheet,
            found.values,
            "ID"
          )
        ) || null,

      uid:
        getRowField(
          found.sheet,
          found.values,
          "UID"
        ),

      name:
        getRowField(
          found.sheet,
          found.values,
          "NAME"
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

      role:
        getRowField(
          found.sheet,
          found.values,
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
  // USER OBJECT
  // ----------------------------------------------------------

  const user =
    userObject(
      found.values,
      found.sheet
    );


  // ----------------------------------------------------------
  // SESSION
  // ----------------------------------------------------------

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


  if (
    !token
  ) {

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


  if (
    !raw
  ) {

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

  } catch (
    error
  ) {

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


  if (
    token
  ) {

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


  if (
    !found
  ) {

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
  // LOCK
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
  // COMPARE
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


  // ----------------------------------------------------------
  // CORRECT OTP
  // ----------------------------------------------------------

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


  const verifiedUid =
    getRowField(
      sheet,
      row,
      "UID"
    );


  // ----------------------------------------------------------
  // FIREBASE
  // ----------------------------------------------------------

  try {

    if (
      typeof sfFirebaseMarkVerified ===
      "function"
    ) {

      sfFirebaseMarkVerified(
        verifiedUid
      );

    }

  } catch (
    firebaseError
  ) {

    console.error(
      "Firebase verification mirror failed:",
      firebaseError
    );

  }


  // ----------------------------------------------------------
  // UPDATED USER
  // ----------------------------------------------------------

  const updated =
    findUser(
      verifiedUid
    );


  if (
    !updated
  ) {

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


  if (
    !identity
  ) {

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


  if (
    !found
  ) {

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


  if (
    verified
  ) {

    return {

      success: false,

      verified: true,

      message:
        "This account is already verified."

    };

  }


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
        "OTP verification is temporarily locked."

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

    id:
      result.id,

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

    otpReady:
      true,

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
// If an active OTP exists, reuse it.
//
// Otherwise generate a new OTP.
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


  if (
    !identity
  ) {

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


  if (
    !found
  ) {

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


  if (
    verified
  ) {

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


  if (
    existing
  ) {

    return {

      success: true,

      id:
        Number(
          getRowField(
            found.sheet,
            row,
            "ID"
          )
        ) || null,

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


  return createOTPForUser(
    found,
    data.channel ||
    data.otpChannel ||
    "both"
  );

}


// ============================================================
// GENERATE OTP ALIAS
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


  if (
    !identity
  ) {

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


  if (
    !found
  ) {

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


  if (
    !found
  ) {

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

function forgotPassword(
  data
) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  if (
    !identity
  ) {

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
  // SECURITY: DO NOT REVEAL WHETHER ACCOUNT EXISTS
  // ----------------------------------------------------------

  if (
    !found
  ) {

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

    id:
      result.id,

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

    otpReady:
      true,

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


  if (
    !/^\d{6}$/.test(
      enteredOTP
    )
  ) {

    return {

      success: false,

      message:
        "Please enter a valid six-digit recovery code."

    };

  }


  const found =
    findUser(
      identity
    );


  if (
    !found
  ) {

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


  // ----------------------------------------------------------
  // COMPARE
  // ----------------------------------------------------------

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


  return {

    success: true,

    recoveryVerified:
      true,

    id:
      Number(
        getRowField(
          found.sheet,
          row,
          "ID"
        )
      ) || null,

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
    !/^\d{6}$/.test(
      enteredOTP
    )
  ) {

    return {

      success: false,

      message:
        "Please enter a valid six-digit recovery code."

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


  if (
    !found
  ) {

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
  // PASSWORD
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
// This is the ONLY doPost() in this Code.gs.
//
// ============================================================

function doPost(
  e
) {

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

    } catch (
      parseError
    ) {

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


    if (
      !action
    ) {

      return response({

        success: false,

        message:
          "No API action specified."

      });

    }


    switch (
      action
    ) {

      // ------------------------------------------------------
      // AUTH
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // OTP
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // PASSWORD RECOVERY
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // INVENTORY
      // ------------------------------------------------------

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

  } catch (
    error
  ) {

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
// HEALTH CHECK
// ============================================================
//
// Open the /exec URL in a browser.
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
