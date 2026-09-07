// ============================================================
// STOCKFLOW — GOOGLE APPS SCRIPT BACKEND
// File: code.gs
//
// Authentication + OTP + Password Recovery + Inventory API
//
// Google Sheets = primary application datastore
// Firebase       = OTP / verification mirror
//
// DEMO / MIDTERM MODE:
// The OTP can be returned to the browser so the verification
// page can automatically display and fill the six OTP boxes.
//
// Production note:
// DEMO_MODE should be disabled when real email/SMS delivery
// is being used.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const APP_NAME =
  "StockFlow";

const USER_SHEET =
  "USER";


// ------------------------------------------------------------
// Authentication / OTP configuration
// ------------------------------------------------------------

const OTP_LENGTH =
  6;

const OTP_EXPIRY_MINUTES =
  10;

const MAX_OTP_ATTEMPTS =
  4;

const OTP_LOCK_MINUTES =
  30;


// IMPORTANT:
// Keep this synchronized with frontend configuration.
const RESEND_COOLDOWN_SECONDS =
  120;


// ------------------------------------------------------------
// User sheet columns
// ------------------------------------------------------------

const USER_HEADERS = [
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


const SESSION_TTL_MINUTES =
  480;


// ============================================================
// COMPATIBILITY CONSTANTS FOR otp.gs
// ============================================================
//
// otp.gs uses the SF_* naming convention.
// These aliases allow both files to use the same configuration.
// ============================================================

const SF_OTP_EXPIRY_MINUTES =
  OTP_EXPIRY_MINUTES;

const SF_MAX_OTP_ATTEMPTS =
  MAX_OTP_ATTEMPTS;

const SF_OTP_LOCK_MINUTES =
  OTP_LOCK_MINUTES;

const SF_RESEND_COOLDOWN_SECONDS =
  RESEND_COOLDOWN_SECONDS;

const SF_USER_HEADERS =
  USER_HEADERS;


// ============================================================
// BASIC HELPERS
// ============================================================

function json(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


function prop(key) {

  return (
    PropertiesService
      .getScriptProperties()
      .getProperty(key) ||
    ""
  );
}


function clean(value) {

  return String(
    value == null
      ? ""
      : value
  ).trim();
}


function email(value) {

  return clean(value)
    .toLowerCase();
}


function phone(value) {

  let p =
    clean(value)
      .replace(
        /[\s\-()]/g,
        ""
      );


  if (
    /^09\d{9}$/.test(p)
  ) {

    return (
      "+63" +
      p.slice(1)
    );

  }


  if (
    /^639\d{9}$/.test(p)
  ) {

    return "+" + p;

  }


  if (
    /^\+639\d{9}$/.test(p)
  ) {

    return p;

  }


  return p;
}


function validEmail(value) {

  return /^\S+@\S+\.\S+$/
    .test(
      email(value)
    );
}


function validPhone(value) {

  return /^\+639\d{9}$/
    .test(
      phone(value)
    );
}


function uid() {

  return (
    "sf_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );
}


// ============================================================
// OTP GENERATION
// ============================================================
//
// IMPORTANT:
// This is the ONLY place where a new OTP is generated.
//
// otp.js never generates the OTP itself.
// ============================================================

function otp() {

  return String(
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );
}


// Compatibility name used by otp.gs.
function sfGenerateOtp() {

  return otp();
}


// ============================================================
// OTP / DATE HELPERS
// ============================================================

function sfMinutesFromNow(minutes) {

  return new Date(
    Date.now() +
    Number(minutes) * 60000
  );
}


function sfClean(value) {

  return clean(value);
}


// ============================================================
// PASSWORD
// ============================================================

function hashPassword(password) {

  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(password),
      Utilities.Charset.UTF_8
    )
  );
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

  return clean(value)
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
// SHEET HELPERS
// ============================================================

function sheet(
  name,
  headers
) {

  const ss =
    SpreadsheetApp.openById(
      SHEET_ID
    );


  let s =
    ss.getSheetByName(
      name
    );


  if (!s) {

    s =
      ss.insertSheet(
        name
      );
  }


  if (
    s.getMaxColumns() <
    headers.length
  ) {

    s.insertColumnsAfter(
      s.getMaxColumns(),
      headers.length -
      s.getMaxColumns()
    );
  }


  s.getRange(
    1,
    1,
    1,
    headers.length
  )
    .setValues([
      headers
    ])
    .setFontWeight(
      "bold"
    );


  return s;
}


function rows(s) {

  if (
    s.getLastRow() < 2
  ) {

    return [];
  }


  return s.getRange(
    2,
    1,
    s.getLastRow() - 1,
    s.getLastColumn()
  ).getValues();
}


// ============================================================
// USER LOOKUP
// ============================================================

function findUser(identity) {

  const s =
    sheet(
      USER_SHEET,
      USER_HEADERS
    );


  const rs =
    rows(s);


  const target =
    clean(identity)
      .toLowerCase();


  if (!target) {
    return null;
  }


  for (
    let i = 0;
    i < rs.length;
    i++
  ) {

    const r =
      rs[i];


    const matches = [
      r[0],
      r[2],
      email(r[6]),
      phone(r[7])
    ];


    if (
      matches.some(
        value =>
          String(
            value || ""
          )
            .toLowerCase() ===
          target
      )
    ) {

      return {
        sheet: s,
        row: i + 2,
        values: r
      };
    }
  }


  return null;
}


// Compatibility name used by otp.gs.
function sfFindUser(identity) {

  return findUser(identity);
}


// ============================================================
// FIREBASE COMPATIBILITY
// ============================================================
//
// If your Firebase functions already exist in another .gs file,
// these are NOT recreated here.
//
// otp.gs expects:
//   sfFirebaseSaveOtp()
//   sfFirebaseMarkVerified()
//   sfFirebasePatch()
//
// They should remain in your Firebase backend file.
// ============================================================


// ============================================================
// USER OBJECT
// ============================================================

function sfUserObject(row) {

  return {

    uid:
      row[0],

    name:
      row[1],

    username:
      row[2],

    age:
      row[4],

    accountStatus:
      row[5],

    gmail:
      row[6],

    phone:
      row[7],

    role:
      row[8],

    verified:
      row[9] === true ||
      String(
        row[9]
      ).toUpperCase() === "TRUE"

  };
}


// ============================================================
// EMAIL DELIVERY
// ============================================================

function sendEmail(
  to,
  name,
  code,
  subject
) {

  MailApp.sendEmail({

    to:
      email(to),

    subject:
      subject ||
      "StockFlow Verification Code",

    body:
      "Hello " +
      (
        name ||
        "StockFlow User"
      ) +
      ",\n\n" +

      "Your StockFlow verification code is " +
      code +
      ". It expires in " +
      OTP_EXPIRY_MINUTES +
      " minutes.\n\n" +

      "If you did not request this code, ignore this email.",

    htmlBody:
      '<div style="font-family:Arial;max-width:560px;margin:auto;padding:30px">' +

      '<h2 style="color:#1769e0">StockFlow</h2>' +

      '<p>Hello ' +
      escapeHtml(
        name ||
        "StockFlow User"
      ) +
      ',</p>' +

      '<p>Your verification code is:</p>' +

      '<div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;background:#f1f5f9;border-radius:12px">' +
      code +
      '</div>' +

      '<p>This code expires in <b>' +
      OTP_EXPIRY_MINUTES +
      ' minutes</b>.</p>' +

      '</div>',

    name:
      APP_NAME
  });
}


// ============================================================
// SMS DELIVERY
// ============================================================

function sendSms(
  to,
  code
) {

  const sid =
    prop(
      "TWILIO_ACCOUNT_SID"
    );


  const token =
    prop(
      "TWILIO_AUTH_TOKEN"
    );


  const from =
    prop(
      "TWILIO_PHONE_NUMBER"
    );


  if (
    !sid ||
    !token ||
    !from
  ) {

    throw new Error(
      "Twilio SMS is not configured in Apps Script Script Properties."
    );
  }


  const url =
    "https://api.twilio.com/2010-04-01/Accounts/" +
    sid +
    "/Messages.json";


  const response =
    UrlFetchApp.fetch(
      url,
      {

        method:
          "post",

        payload: {

          To:
            phone(to),

          From:
            from,

          Body:
            "StockFlow verification code: " +
            code +
            ". Expires in " +
            OTP_EXPIRY_MINUTES +
            " minutes. Do not share this code."

        },

        headers: {

          Authorization:
            "Basic " +
            Utilities.base64Encode(
              sid +
              ":" +
              token
            )

        },

        muteHttpExceptions:
          true
      }
    );


  const responseCode =
    response.getResponseCode();


  if (
    responseCode < 200 ||
    responseCode >= 300
  ) {

    throw new Error(
      "Twilio rejected the SMS request."
    );
  }
}


// ============================================================
// OTP DELIVERY
// ============================================================

function deliverOTP(
  user,
  code,
  subject
) {

  const result = {

    emailSent:
      false,

    smsSent:
      false,

    errors:
      []

  };


  try {

    sendEmail(
      user.gmail ||
      user.email,
      user.name,
      code,
      subject
    );

    result.emailSent =
      true;

  } catch (e) {

    result.errors.push(
      "Email: " +
      e.message
    );
  }


  try {

    sendSms(
      user.phone,
      code
    );

    result.smsSent =
      true;

  } catch (e) {

    result.errors.push(
      "SMS: " +
      e.message
    );
  }


  if (
    !result.emailSent &&
    !result.smsSent
  ) {

    throw new Error(
      result.errors.join(
        " "
      )
    );
  }


  return result;
}


// ============================================================
// DEMO MODE
// ============================================================
//
// Your existing project should define sfDemoMode() elsewhere.
//
// If it does not, this fallback checks the Script Property:
//
// DEMO_MODE = true
//
// This lets otp.js receive the actual backend-generated OTP.
// ============================================================

function sfDemoMode() {

  const value =
    prop(
      "DEMO_MODE"
    );


  return (
    value === "true" ||
    value === "TRUE" ||
    value === "1" ||
    value === "yes" ||
    value === "YES"
  );
}


// ============================================================
// REGISTER
// ============================================================

function register(
  data,
  role
) {

  data =
    data || {};


  const name =
    clean(
      data.name
    );


  const username =
    clean(
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
    email(
      data.gmail ||
      data.email
    );


  const ph =
    phone(
      data.phone
    );


  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  if (
    !name ||
    !username ||
    !password ||
    !age ||
    !validEmail(gmail) ||
    !validPhone(ph)
  ) {

    return {

      success:
        false,

      message:
        "Complete all required fields using a valid email and Philippine phone number."

    };
  }


  if (
    username.length < 4 ||
    username.length > 30
  ) {

    return {

      success:
        false,

      message:
        "Username must be 4–30 characters."

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
    findUser(username) ||
    findUser(gmail) ||
    findUser(ph)
  ) {

    return {

      success:
        false,

      message:
        "Username, email, or phone number is already registered."

    };
  }


  // ----------------------------------------------------------
  // Create account + initial OTP
  // ----------------------------------------------------------

  const s =
    sheet(
      USER_SHEET,
      USER_HEADERS
    );


  const code =
    otp();


  const now =
    new Date();


  const expires =
    new Date(
      Date.now() +
      OTP_EXPIRY_MINUTES *
      60000
    );


  const accountUid =
    uid();


  const accountRole =
    role ||
    "Employee";


  s.appendRow([

    accountUid,

    name,

    username,

    hashPassword(
      password
    ),

    age,

    "PENDING",

    gmail,

    ph,

    accountRole,

    false,

    code,

    expires,

    0,

    "",

    "BOTH",

    now,

    "",

    now,

    ""

  ]);


  const user =
    findUser(
      username
    );


  if (!user) {

    return {

      success:
        false,

      message:
        "Unable to create the user account."

    };
  }


  // ----------------------------------------------------------
  // Firebase OTP mirror
  // ----------------------------------------------------------

  try {

    if (
      typeof sfFirebaseSaveOtp ===
      "function"
    ) {

      sfFirebaseSaveOtp({

        uid:
          accountUid,

        username:
          username,

        gmail:
          gmail,

        phone:
          ph,

        otp:
          code,

        otpExpires:
          expires.toISOString(),

        attempts:
          0,

        channel:
          "BOTH"

      });
    }

  } catch (firebaseError) {

    console.error(
      "Firebase OTP mirror failed:",
      firebaseError
    );

  }


  // ----------------------------------------------------------
  // Deliver OTP
  // ----------------------------------------------------------

  try {

    const delivery =
      deliverOTP(

        {
          name:
            name,

          gmail:
            gmail,

          phone:
            ph
        },

        code,

        "StockFlow - Your verification code"

      );


    const result = {

      success:
        true,

      uid:
        accountUid,

      username:
        username,

      role:
        accountRole,

      verified:
        false,

      otpSent:
        true,

      emailSent:
        delivery.emailSent,

      smsSent:
        delivery.smsSent,

      message:
        "Registration successful. Check your registered email and/or phone for the verification code."

    };


    /*
     * DEMO MODE:
     *
     * Return the SAME OTP that was stored in the sheet and
     * Firebase.
     *
     * The verification page can then reveal/auto-fill it
     * after its 3–5 second delay.
     */
    if (
      sfDemoMode()
    ) {

      result.otp =
        code;

      result.demoOtp =
        code;
    }


    return result;


  } catch (e) {

    /*
     * Delivery failed.
     *
     * Remove the account because registration did not
     * successfully complete.
     */
    try {

      s.deleteRow(
        user.row
      );

    } catch (deleteError) {

      console.error(
        "Unable to roll back registration:",
        deleteError
      );
    }


    return {

      success:
        false,

      message:
        "Registration failed because the verification code could not be delivered: " +
        e.message

    };
  }
}


// ============================================================
// LOGIN
// ============================================================

function login(data) {

  data =
    data || {};


  const identity =
    data.identity ||
    data.username ||
    data.email;


  const f =
    findUser(
      identity
    );


  if (!f) {

    return {

      success:
        false,

      message:
        "Invalid username/email or password."

    };
  }


  const supplied =
    String(
      data.password ||
      ""
    );


  const saved =
    String(
      f.values[3] ||
      ""
    );


  const ok =
    saved ===
      hashPassword(
        supplied
      ) ||

    /*
     * Legacy plaintext compatibility.
     */
    saved ===
      supplied;


  if (!ok) {

    return {

      success:
        false,

      message:
        "Invalid username/email or password."

    };
  }


  const status =
    clean(
      f.values[5]
    ).toUpperCase();


  const verified =
    f.values[9] === true ||
    String(
      f.values[9]
    ).toUpperCase() ===
    "TRUE";


  if (
    status ===
    "SUSPENDED" ||
    status ===
    "DISABLED"
  ) {

    return {

      success:
        false,

      message:
        "This account is " +
        status.toLowerCase() +
        "."

    };
  }


  if (!verified) {

    return {

      success:
        false,

      verified:
        false,

      identity:
        f.values[2],

      message:
        "Account is not verified. Please verify the OTP sent to your registered contacts."

    };
  }


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
          f.values[0],

        username:
          f.values[2],

        role:
          f.values[8],

        name:
          f.values[1]

      }),

      SESSION_TTL_MINUTES *
      60

    );


  f.sheet
    .getRange(
      f.row,
      19
    )
    .setValue(
      new Date()
    );


  return {

    success:
      true,

    token:
      token,

    user:
      sfUserObject(
        f.values
      )

  };
}


// ============================================================
// SESSION
// ============================================================

function session(data) {

  data =
    data || {};


  const token =
    clean(
      data.token
    );


  const raw =
    token
      ? CacheService
          .getScriptCache()
          .get(
            "session_" +
            token
          )
      : "";


  if (!raw) {

    return {

      success:
        false,

      message:
        "Session expired."

    };
  }


  return {

    success:
      true,

    user:
      JSON.parse(
        raw
      )

  };
}


// ============================================================
// LOGOUT
// ============================================================

function logout(data) {

  data =
    data || {};


  if (
    data.token
  ) {

    CacheService
      .getScriptCache()
      .remove(
        "session_" +
        data.token
      );
  }


  return {

    success:
      true

  };
}


// ============================================================
// GET IDENTITY FROM REQUEST
// ============================================================
//
// otp.js sends multiple identity fields instead of necessarily
// sending data.identity.
//
// This helper makes all OTP endpoints compatible.
// ============================================================

function getOtpIdentity(data) {

  data =
    data || {};


  return (
    data.identity ||
    data.uid ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone ||
    ""
  );
}


// ============================================================
// GENERATE / PREPARE OTP
// ============================================================
//
// Used by the initial verification page.
//
// IMPORTANT:
//
// Registration already generated and stored the initial OTP.
//
// Therefore this function first checks whether a valid OTP
// already exists.
//
// If it exists:
//     return the existing OTP.
//
// If it does not exist:
//     create a new OTP.
//
// This prevents the verification page from accidentally
// replacing the OTP that was already sent during registration.
// ============================================================

function generateOtp(data) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  const record =
    findUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "Account not found."

    };
  }


  const row =
    record.values;


  // ----------------------------------------------------------
  // Already verified
  // ----------------------------------------------------------

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
  // Existing OTP
  // ----------------------------------------------------------

  const existingOtp =
    clean(
      row[10]
    );


  const existingExpiry =
    row[11]
      ? new Date(
          row[11]
        )
      : null;


  if (
    existingOtp &&
    existingOtp.length === OTP_LENGTH &&
    existingExpiry &&
    !isNaN(existingExpiry) &&
    Date.now() <
      existingExpiry.getTime()
  ) {

    const result = {

      success:
        true,

      uid:
        row[0],

      username:
        row[2],

      email:
        row[6],

      gmail:
        row[6],

      phone:
        row[7],

      channel:
        clean(
          data.channel ||
          data.otpChannel ||
          row[14] ||
          "BOTH"
        ).toUpperCase(),

      expiresAt:
        existingExpiry.toISOString(),

      message:
        "Existing verification code is ready."

    };


    if (
      sfDemoMode()
    ) {

      result.otp =
        existingOtp;

      result.demoOtp =
        existingOtp;
    }


    return result;
  }


  // ----------------------------------------------------------
  // Existing OTP is missing or expired.
  // Create a new one.
  // ----------------------------------------------------------

  return sfCreateOtp(
    record,
    data.channel ||
    data.otpChannel ||
    "BOTH"
  );
}


// ============================================================
// VERIFY OTP
// ============================================================

function verifyOtp(data) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  const record =
    findUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "Account not found."

    };
  }


  const row =
    record.values;


  // ----------------------------------------------------------
  // Already verified
  // ----------------------------------------------------------

  const verified =
    row[9] === true ||
    String(
      row[9]
    ).toUpperCase() ===
    "TRUE";


  if (verified) {

    return {

      success:
        true,

      verified:
        true,

      message:
        "Account is already verified.",

      user:
        sfUserObject(
          row
        )

    };
  }


  // ----------------------------------------------------------
  // Lock check
  // ----------------------------------------------------------

  const lockUntil =
    row[13]
      ? new Date(
          row[13]
        )
      : null;


  if (
    lockUntil &&
    !isNaN(lockUntil) &&
    Date.now() <
      lockUntil.getTime()
  ) {

    return {

      success:
        false,

      locked:
        true,

      message:
        "OTP verification is temporarily locked. Please try again later."

    };
  }


  // ----------------------------------------------------------
  // Expiration check
  // ----------------------------------------------------------

  const expires =
    row[11]
      ? new Date(
          row[11]
        )
      : null;


  if (
    !expires ||
    isNaN(expires) ||
    Date.now() >
      expires.getTime()
  ) {

    return {

      success:
        false,

      expired:
        true,

      message:
        "This verification code has expired. Please request a new code."

    };
  }


  // ----------------------------------------------------------
  // Submitted OTP
  // ----------------------------------------------------------

  const submittedOtp =
    clean(
      data.otp
    );


  const storedOtp =
    clean(
      row[10]
    );


  // ----------------------------------------------------------
  // Validate OTP format
  // ----------------------------------------------------------

  if (
    !/^\d{6}$/.test(
      submittedOtp
    )
  ) {

    return {

      success:
        false,

      message:
        "Please enter a valid six-digit verification code."

    };
  }


  // ----------------------------------------------------------
  // INVALID OTP
  // ----------------------------------------------------------

  if (
    submittedOtp !==
    storedOtp
  ) {

    let attempts =
      Number(
        row[12]
      ) || 0;


    attempts++;


    record.sheet
      .getRange(
        record.row,
        13
      )
      .setValue(
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
          60000
        );


      record.sheet
        .getRange(
          record.row,
          14
        )
        .setValue(
          lock
        );


      return {

        success:
          false,

        locked:
          true,

        remainingAttempts:
          0,

        message:
          "Too many incorrect attempts. Your verification is temporarily locked for 30 minutes."

      };
    }


    const remaining =
      MAX_OTP_ATTEMPTS -
      attempts;


    return {

      success:
        false,

      remainingAttempts:
        remaining,

      message:
        "Invalid verification code. " +
        remaining +
        " attempt(s) remaining."

    };
  }


  // ==========================================================
  // SUCCESS
  // ==========================================================

  // ----------------------------------------------------------
  // Account status
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      6
    )
    .setValue(
      "VERIFIED"
    );


  // ----------------------------------------------------------
  // Verified flag
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      10
    )
    .setValue(
      true
    );


  // ----------------------------------------------------------
  // Remove OTP
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      11
    )
    .clearContent();


  // ----------------------------------------------------------
  // Remove OTP expiration
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      12
    )
    .clearContent();


  // ----------------------------------------------------------
  // Reset attempts
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      13
    )
    .setValue(
      0
    );


  // ----------------------------------------------------------
  // Remove lock
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      14
    )
    .clearContent();


  // ----------------------------------------------------------
  // Verification timestamp
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      17
    )
    .setValue(
      new Date()
    );


  // ----------------------------------------------------------
  // Firebase
  // ----------------------------------------------------------

  try {

    if (
      typeof sfFirebaseMarkVerified ===
      "function"
    ) {

      sfFirebaseMarkVerified(
        row[0]
      );
    }


    if (
      typeof sfFirebasePatch ===
      "function"
    ) {

      sfFirebasePatch(

        "otp/" +
        row[0],

        {

          otp:
            null,

          verified:
            true,

          verifiedAt:
            new Date()
              .toISOString()

        }

      );
    }

  } catch (firebaseError) {

    console.error(
      "Firebase verification update failed:",
      firebaseError
    );
  }


  // ----------------------------------------------------------
  // Return updated user
  // ----------------------------------------------------------

  const updatedRow =
    record.sheet
      .getRange(
        record.row,
        1,
        1,
        USER_HEADERS.length
      )
      .getValues()[0];


  return {

    success:
      true,

    verified:
      true,

    message:
      "Account verified successfully.",

    user:
      sfUserObject(
        updatedRow
      )

  };
}


// ============================================================
// RESEND OTP
// ============================================================

function resendOtp(data) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  const record =
    findUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "Account not found."

    };
  }


  const row =
    record.values;


  // ----------------------------------------------------------
  // Already verified
  // ----------------------------------------------------------

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

      message:
        "This account is already verified."

    };
  }


  // ==========================================================
  // SERVER-SIDE RESEND COOLDOWN
  // ==========================================================

  const lastSent =
    row[17]
      ? new Date(
          row[17]
        )
      : null;


  if (
    lastSent &&
    !isNaN(lastSent)
  ) {

    const elapsed =
      Date.now() -
      lastSent.getTime();


    const cooldownMs =
      RESEND_COOLDOWN_SECONDS *
      1000;


    if (
      elapsed <
      cooldownMs
    ) {

      const remaining =
        Math.ceil(
          (
            cooldownMs -
            elapsed
          ) / 1000
        );


      return {

        success:
          false,

        cooldown:
          true,

        remainingSeconds:
          remaining,

        message:
          "Please wait " +
          remaining +
          " second(s) before requesting another code."

      };
    }
  }


  // ==========================================================
  // CREATE NEW OTP
  // ==========================================================

  return sfCreateOtp(

    record,

    data.channel ||
    data.otpChannel ||
    "BOTH"

  );
}


// ============================================================
// PASSWORD RECOVERY
// ============================================================

function forgotPassword(data) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  const record =
    findUser(
      identity
    );


  /*
   * Do not reveal whether an account exists.
   */
  if (!record) {

    return {

      success:
        true,

      message:
        "If the account exists, a recovery code has been sent."

    };
  }


  const row =
    record.values;


  const code =
    otp();


  const expires =
    new Date(
      Date.now() +
      OTP_EXPIRY_MINUTES *
      60000
    );


  record.sheet
    .getRange(
      record.row,
      11
    )
    .setValue(
      code
    );


  record.sheet
    .getRange(
      record.row,
      12
    )
    .setValue(
      expires
    );


  record.sheet
    .getRange(
      record.row,
      13
    )
    .setValue(
      0
    );


  record.sheet
    .getRange(
      record.row,
      14
    )
    .clearContent();


  record.sheet
    .getRange(
      record.row,
      15
    )
    .setValue(
      "BOTH"
    );


  record.sheet
    .getRange(
      record.row,
      18
    )
    .setValue(
      new Date()
    );


  try {

    deliverOTP(

      {

        name:
          row[1],

        gmail:
          row[6],

        phone:
          row[7]

      },

      code,

      "StockFlow - Password recovery code"

    );

  } catch (e) {

    console.error(
      "Password recovery delivery failed:",
      e
    );
  }


  return {

    success:
      true,

    message:
      "If the account exists, a recovery code has been sent to the registered email and phone."

  };
}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================

function verifyRecoveryOtp(data) {

  return verifyOtp(
    data
  );
}


// ============================================================
// RESET PASSWORD
// ============================================================

function resetPassword(data) {

  data =
    data || {};


  const identity =
    getOtpIdentity(
      data
    );


  const record =
    findUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "Unable to reset password."

    };
  }


  const row =
    record.values;


  const expires =
    row[11]
      ? new Date(
          row[11]
        )
      : null;


  const submittedOtp =
    clean(
      data.otp
    );


  const storedOtp =
    clean(
      row[10]
    );


  if (
    !submittedOtp ||
    submittedOtp !==
      storedOtp ||
    !expires ||
    isNaN(expires) ||
    Date.now() >
      expires.getTime()
  ) {

    return {

      success:
        false,

      message:
        "Invalid or expired recovery code."

    };
  }


  const password =
    String(
      data.newPassword ||
      ""
    );


  if (
    password.length < 8
  ) {

    return {

      success:
        false,

      message:
        "Password must be at least 8 characters."

    };
  }


  record.sheet
    .getRange(
      record.row,
      4
    )
    .setValue(
      hashPassword(
        password
      )
    );


  // ----------------------------------------------------------
  // Clear recovery OTP
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      11
    )
    .clearContent();


  record.sheet
    .getRange(
      record.row,
      12
    )
    .clearContent();


  record.sheet
    .getRange(
      record.row,
      13
    )
    .setValue(
      0
    );


  record.sheet
    .getRange(
      record.row,
      14
    )
    .clearContent();


  return {

    success:
      true,

    message:
      "Password reset successfully. You can now sign in."

  };
}


// ============================================================
// SESSION REQUIREMENT
// ============================================================

function requireSession(data) {

  const s =
    session(
      data
    );


  if (!s.success) {

    throw new Error(
      "Unauthorized"
    );
  }


  return s.user;
}


// ============================================================
// POST API
// ============================================================

function doPost(e) {

  try {

    const data =
      JSON.parse(
        e.postData.contents ||
        "{}"
      );


    const action =
      clean(
        data.action
      );


    switch (action) {


      // ======================================================
      // REGISTRATION
      // ======================================================

      case "register":

        return json(
          register(
            data,
            "Employee"
          )
        );


      case "registerAdmin":

        if (
          clean(
            data.adminRegistrationKey
          ) !==
          prop(
            "ADMIN_REGISTRATION_KEY"
          )
        ) {

          return json({

            success:
              false,

            message:
              "Admin registration is restricted."

          });
        }


        return json(
          register(
            data,
            "Admin"
          )
        );


      // ======================================================
      // AUTHENTICATION
      // ======================================================

      case "login":

        return json(
          login(
            data
          )
        );


      case "session":

        return json(
          session(
            data
          )
        );


      case "logout":

        return json(
          logout(
            data
          )
        );


      // ======================================================
      // OTP
      // ======================================================

      case "generateOtp":

        return json(
          generateOtp(
            data
          )
        );


      case "requestOtp":

        return json(
          generateOtp(
            data
          )
        );


      case "verifyOtp":

        return json(
          verifyOtp(
            data
          )
        );


      case "resendOtp":

        return json(
          resendOtp(
            data
          )
        );


      // ======================================================
      // PASSWORD RECOVERY
      // ======================================================

      case "forgotPassword":

        return json(
          forgotPassword(
            data
          )
        );


      case "verifyRecoveryOtp":

        return json(
          verifyRecoveryOtp(
            data
          )
        );


      case "resetPassword":

        return json(
          resetPassword(
            data
          )
        );


      // ======================================================
      // USER
      // ======================================================

      case "getUser": {

        const f =
          findUser(
            getOtpIdentity(
              data
            )
          );


        if (!f) {

          return json({

            success:
              false,

            message:
              "User not found."

          });
        }


        return json({

          success:
            true,

          user:
            sfUserObject(
              f.values
            )

        });
      }


      // ======================================================
      // UPDATE STATUS
      // ======================================================

      case "updateStatus": {

        requireSession(
          data
        );


        const f =
          findUser(
            data.username
          );


        if (!f) {

          return json({

            success:
              false,

            message:
              "User not found."

          });
        }


        f.sheet
          .getRange(
            f.row,
            6
          )
          .setValue(
            clean(
              data.status
            ).toUpperCase()
          );


        return json({

          success:
            true,

          message:
            "Account status updated."

        });
      }


      // ======================================================
      // LIST USERS
      // ======================================================

      case "listUsers":

        requireSession(
          data
        );


        return json(
          SFInv_listUsers()
        );


      // ======================================================
      // INVENTORY API
      // ======================================================

      default:

        return json(
          SFInv_dispatch(
            action,
            data
          )
        );
    }


  } catch (err) {

    console.error(
      "StockFlow API error:",
      err
    );


    return json({

      success:
        false,

      message:
        err.message ||
        "Server error."

    });
  }
}


// ============================================================
// GET API
// ============================================================

function doGet(e) {

  return json({

    success:
      true,

    system:
      APP_NAME +
      " Inventory System",

    status:
      "ONLINE"

  });
}
