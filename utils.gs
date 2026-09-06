// ============================================================
// STOCKFLOW — UTILITY FUNCTIONS
// File: utils.gs
// Shared helper functions used by the entire backend.
// ============================================================

const SF_APP_NAME = "StockFlow";

const SF_SHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const SF_USER_SHEET = "USER";

const SF_OTP_LENGTH = 6;
const SF_OTP_EXPIRY_MINUTES = 10;
const SF_MAX_OTP_ATTEMPTS = 4;
const SF_OTP_LOCK_MINUTES = 30;
const SF_RESEND_COOLDOWN_SECONDS = 60;

const SF_SESSION_TTL_MINUTES = 480;


// ------------------------------------------------------------
// SCRIPT PROPERTIES
// ------------------------------------------------------------

function sfProp(key) {
  return (
    PropertiesService
      .getScriptProperties()
      .getProperty(key) || ""
  );
}


// ------------------------------------------------------------
// CLEAN VALUE
// ------------------------------------------------------------

function sfClean(value) {
  return String(
    value === null || value === undefined
      ? ""
      : value
  ).trim();
}


// ------------------------------------------------------------
// EMAIL
// ------------------------------------------------------------

function sfEmail(value) {
  return sfClean(value).toLowerCase();
}


function sfValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(
    sfEmail(value)
  );
}


// ------------------------------------------------------------
// PHONE
// ------------------------------------------------------------

function sfPhone(value) {

  let phone = sfClean(value)
    .replace(/[\s\-()]/g, "");

  // 09XXXXXXXXX
  if (/^09\d{9}$/.test(phone)) {
    return "+63" + phone.substring(1);
  }

  // 639XXXXXXXXX
  if (/^639\d{9}$/.test(phone)) {
    return "+" + phone;
  }

  // +639XXXXXXXXX
  if (/^\+639\d{9}$/.test(phone)) {
    return phone;
  }

  return phone;
}


function sfValidPhone(value) {
  return /^\+639\d{9}$/.test(
    sfPhone(value)
  );
}


// ------------------------------------------------------------
// UID
// ------------------------------------------------------------

function sfUid() {

  return (
    "sf_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );

}


// ------------------------------------------------------------
// OTP
// ------------------------------------------------------------

function sfGenerateOtp() {

  return String(
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );

}


// ------------------------------------------------------------
// PASSWORD HASH
// ------------------------------------------------------------

function sfHashPassword(password) {

  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(password),
      Utilities.Charset.UTF_8
    )
  );

}


// ------------------------------------------------------------
// JSON RESPONSE
// ------------------------------------------------------------

function sfJson(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


// ------------------------------------------------------------
// DATE
// ------------------------------------------------------------

function sfNow() {
  return new Date();
}


function sfMinutesFromNow(minutes) {

  return new Date(
    Date.now() +
    minutes * 60 * 1000
  );

}


// ------------------------------------------------------------
// DEMO MODE
// ------------------------------------------------------------

function sfDemoMode() {

  const value =
    sfProp("DEMO_MODE");

  if (!value) {
    return true;
  }

  return (
    String(value).toUpperCase() === "TRUE"
  );

}


// ------------------------------------------------------------
// SAFE OBJECT
// ------------------------------------------------------------

function sfSafeObject(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return {};
  }

  return value;

}


// ------------------------------------------------------------
// ERROR MESSAGE
// ------------------------------------------------------------

function sfErrorMessage(error) {

  return (
    error &&
    error.message
  )
    ? error.message
    : "Server error.";
}
