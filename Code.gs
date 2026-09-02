/**
 * ============================================================
 * STOCKFLOW — PHONE ACCESSORIES INVENTORY MANAGEMENT SYSTEM
 * ============================================================
 *
 * FILE:
 *   code.gs
 *
 * PURPOSE:
 *   Central Google Apps Script backend for:
 *   - Registration
 *   - Login
 *   - Gmail OTP
 *   - SMS OTP via Twilio
 *   - OTP verification
 *   - OTP resend
 *   - Password recovery
 *   - Session management
 *   - User retrieval
 *   - Account status management
 *   - Inventory module dispatch
 *
 * IMPORTANT:
 *   Do NOT place Twilio credentials directly in this file.
 *
 *   Apps Script Script Properties required for SMS:
 *
 *     TWILIO_ACCOUNT_SID
 *     TWILIO_AUTH_TOKEN
 *     TWILIO_PHONE_NUMBER
 *
 *   Optional:
 *
 *     ADMIN_REGISTRATION_KEY
 *
 * ============================================================
 */


/* ============================================================
   1. STOCKFLOW CONFIGURATION
   ============================================================ */

const SF_CONFIG = {

  // Google Spreadsheet
  SHEET_ID: '1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY',
  USER_SHEET: 'USER',

  // Application
  APP_NAME: 'StockFlow',

  // OTP
  OTP_LENGTH: 6,
  OTP_EXPIRATION_MINUTES: 10,
  OTP_MAX_ATTEMPTS: 4,
  OTP_LOCK_MINUTES: 30,
  OTP_RESEND_COOLDOWN_SECONDS: 60,

  // Session
  SESSION_EXPIRATION_SECONDS: 21600, // 6 hours

  // Password
  PASSWORD_MIN_LENGTH: 6,

  // Supported OTP channels
  OTP_CHANNELS: {
    EMAIL: 'EMAIL',
    GMAIL: 'EMAIL',
    SMS: 'SMS',
    PHONE: 'SMS'
  }

};


/* ============================================================
   2. USER SHEET STRUCTURE
   ============================================================ */

const USER_HEADERS = [
  'UID',
  'NAME',
  'USERNAME',
  'PASSWORD',
  'AGE',
  'ACCOUNT_S',
  'GMAIL',
  'PHONE NO.',
  'ROLE',
  'VERIFIED',
  'OTP',
  'OTP EXPIRES',
  'OTP ATTEMPTS',
  'OTP LOCK UNTIL',
  'OTP CHANNEL',
  'CREATED AT',
  'VERIFIED AT',
  'LAST OTP SENT',
  'LAST LOGIN'
];


/* ============================================================
   3. GOOGLE SHEET HELPERS
   ============================================================ */

/**
 * Open STOCKFLOW spreadsheet.
 */
function getStockFlowSpreadsheet_() {
  return SpreadsheetApp.openById(SF_CONFIG.SHEET_ID);
}


/**
 * Get USER sheet and create it if necessary.
 */
function getUserSheet_() {

  const ss = getStockFlowSpreadsheet_();

  let sheet = ss.getSheetByName(SF_CONFIG.USER_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(SF_CONFIG.USER_SHEET);
  }

  ensureUserHeaders_(sheet);

  return sheet;
}


/**
 * Make sure USER sheet has the correct header row.
 *
 * Existing data is preserved.
 */
function ensureUserHeaders_(sheet) {

  const requiredLength = USER_HEADERS.length;

  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(1, 1, 1, requiredLength)
      .setValues([USER_HEADERS]);

    return;
  }

  const existing = sheet
    .getRange(1, 1, 1, Math.max(requiredLength, sheet.getLastColumn()))
    .getValues()[0];

  let needsUpdate = false;

  for (let i = 0; i < requiredLength; i++) {

    if (String(existing[i] || '').trim() !== USER_HEADERS[i]) {
      needsUpdate = true;
      break;
    }

  }

  if (needsUpdate) {

    sheet
      .getRange(1, 1, 1, requiredLength)
      .setValues([USER_HEADERS]);

  }

}


/**
 * Convert a sheet row into an object.
 */
function userRowToObject_(row) {

  return {

    uid: row[0] || '',
    name: row[1] || '',
    username: row[2] || '',
    password: row[3] || '',
    age: row[4] || '',
    accountStatus: row[5] || '',
    email: row[6] || '',
    phone: row[7] || '',
    role: row[8] || '',
    verified: normalizeBoolean_(row[9]),

    // OTP fields are intentionally not exposed to frontend.
    otpHash: row[10] || '',
    otpExpires: row[11] || '',
    otpAttempts: Number(row[12] || 0),
    otpLockUntil: row[13] || '',
    otpChannel: row[14] || '',

    createdAt: row[15] || '',
    verifiedAt: row[16] || '',
    lastOtpSent: row[17] || '',
    lastLogin: row[18] || ''

  };

}


/**
 * Find user by row number.
 */
function getUserByRow_(sheet, rowNumber) {

  if (rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    return null;
  }

  const row = sheet
    .getRange(rowNumber, 1, 1, USER_HEADERS.length)
    .getValues()[0];

  return {
    rowNumber: rowNumber,
    data: userRowToObject_(row)
  };

}


/**
 * Find user by email.
 *
 * Email comparison is case-insensitive.
 */
function findUserByEmail_(sheet, email) {

  const normalizedEmail = normalizeEmail_(email);

  if (!normalizedEmail) {
    return null;
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const values = sheet
    .getRange(2, 1, lastRow - 1, USER_HEADERS.length)
    .getValues();

  for (let i = 0; i < values.length; i++) {

    const rowEmail = normalizeEmail_(values[i][6]);

    if (rowEmail === normalizedEmail) {

      return {
        rowNumber: i + 2,
        data: userRowToObject_(values[i])
      };

    }

  }

  return null;

}


/**
 * Find user by username.
 */
function findUserByUsername_(sheet, username) {

  const normalizedUsername = String(username || '')
    .trim()
    .toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const values = sheet
    .getRange(2, 1, lastRow - 1, USER_HEADERS.length)
    .getValues();

  for (let i = 0; i < values.length; i++) {

    const rowUsername = String(values[i][2] || '')
      .trim()
      .toLowerCase();

    if (rowUsername === normalizedUsername) {

      return {
        rowNumber: i + 2,
        data: userRowToObject_(values[i])
      };

    }

  }

  return null;

}


/**
 * Find user by UID.
 */
function findUserByUid_(sheet, uid) {

  const target = String(uid || '').trim();

  if (!target) {
    return null;
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const values = sheet
    .getRange(2, 1, lastRow - 1, USER_HEADERS.length)
    .getValues();

  for (let i = 0; i < values.length; i++) {

    if (String(values[i][0] || '').trim() === target) {

      return {
        rowNumber: i + 2,
        data: userRowToObject_(values[i])
      };

    }

  }

  return null;

}


/* ============================================================
   4. NORMALIZATION HELPERS
   ============================================================ */

/**
 * Normalize email address.
 */
function normalizeEmail_(email) {

  return String(email || '')
    .trim()
    .toLowerCase();

}


/**
 * Normalize Philippine/international phone number.
 *
 * Examples:
 *
 * 09171234567
 *      ↓
 * +639171234567
 *
 * 639171234567
 *      ↓
 * +639171234567
 *
 * +639171234567
 *      ↓
 * +639171234567
 */
function normalizePhone_(phone) {

  let value = String(phone || '')
    .trim()
    .replace(/[()\s-]/g, '');

  if (!value) {
    return '';
  }

  // 00XXXXXXXX → +XXXXXXXX
  if (value.indexOf('00') === 0) {
    value = '+' + value.substring(2);
  }

  // Philippine local format
  if (value.indexOf('09') === 0 && value.length === 11) {
    value = '+63' + value.substring(1);
  }

  // Philippine number without +
  if (value.indexOf('639') === 0) {
    value = '+' + value;
  }

  // Generic international number without +
  if (value.indexOf('+') !== 0 && value.length >= 10) {
    value = '+' + value;
  }

  return value;

}


/**
 * Normalize OTP channel.
 */
function normalizeOtpChannel_(channel) {

  const value = String(channel || '')
    .trim()
    .toUpperCase();

  if (value === 'GMAIL' || value === 'EMAIL') {
    return 'EMAIL';
  }

  if (
    value === 'SMS' ||
    value === 'PHONE' ||
    value === 'MOBILE'
  ) {
    return 'SMS';
  }

  return '';

}


/**
 * Normalize boolean values.
 */
function normalizeBoolean_(value) {

  if (value === true) {
    return true;
  }

  const text = String(value || '')
    .trim()
    .toLowerCase();

  return (
    text === 'true' ||
    text === 'yes' ||
    text === 'verified' ||
    text === '1'
  );

}


/* ============================================================
   5. VALIDATION HELPERS
   ============================================================ */

/**
 * Validate email.
 */
function isValidEmail_(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizeEmail_(email)
  );

}


/**
 * Validate phone.
 */
function isValidPhone_(phone) {

  const value = normalizePhone_(phone);

  return /^\+[1-9]\d{7,14}$/.test(value);

}


/**
 * Validate password.
 */
function isValidPassword_(password) {

  return String(password || '').length >=
    SF_CONFIG.PASSWORD_MIN_LENGTH;

}


/* ============================================================
   6. SECURITY / HASH HELPERS
   ============================================================ */

/**
 * SHA-256 hash.
 *
 * Used for:
 * - Passwords
 * - OTP codes
 */
function sha256_(value) {

  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );

  return bytes
    .map(function(byte) {

      const v = byte < 0 ? byte + 256 : byte;

      return ('0' + v.toString(16)).slice(-2);

    })
    .join('');

}


/**
 * Generate a random OTP.
 */
function generateOtp_() {

  const max = Math.pow(10, SF_CONFIG.OTP_LENGTH);

  const min = Math.pow(10, SF_CONFIG.OTP_LENGTH - 1);

  return String(
    Math.floor(Math.random() * (max - min)) + min
  );

}


/**
 * Generate UID.
 */
function generateUid_() {

  return 'SF-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .substring(0, 16)
      .toUpperCase();

}


/**
 * Generate session token.
 */
function generateSessionToken_() {

  return Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '');

}


/* ============================================================
   7. DATE HELPERS
   ============================================================ */

function now_() {
  return new Date();
}


/**
 * Convert date to milliseconds safely.
 */
function dateToMillis_(value) {

  if (!value) {
    return 0;
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  const millis = date.getTime();

  return isNaN(millis) ? 0 : millis;

}


/* ============================================================
   8. OTP DESTINATION HELPERS
   ============================================================ */

/**
 * Mask email for frontend display.
 *
 * Example:
 *
 * student@gmail.com
 * →
 * s******@gmail.com
 */
function maskEmail_(email) {

  const value = normalizeEmail_(email);

  if (!value) {
    return '';
  }

  const parts = value.split('@');

  if (parts.length !== 2) {
    return value;
  }

  const local = parts[0];
  const domain = parts[1];

  if (local.length <= 1) {
    return '*@' + domain;
  }

  if (local.length === 2) {
    return local.charAt(0) + '*@' + domain;
  }

  return (
    local.charAt(0) +
    '*'.repeat(Math.min(local.length - 1, 6)) +
    '@' +
    domain
  );

}


/**
 * Mask phone number.
 *
 * Example:
 *
 * +639171234567
 * →
 * +63 ••• ••• 4567
 */
function maskPhone_(phone) {

  const value = normalizePhone_(phone);

  if (!value) {
    return '';
  }

  if (value.length <= 7) {
    return value;
  }

  return (
    value.substring(0, 3) +
    ' ••• ••• ' +
    value.substring(value.length - 4)
  );

}


/**
 * Return the actual destination used for the selected channel.
 */
function getOtpDestination_(user, channel) {

  if (channel === 'EMAIL') {
    return normalizeEmail_(user.email);
  }

  if (channel === 'SMS') {
    return normalizePhone_(user.phone);
  }

  return '';

}


/**
 * Return masked destination.
 */
function getMaskedDestination_(user, channel) {

  if (channel === 'EMAIL') {
    return maskEmail_(user.email);
  }

  if (channel === 'SMS') {
    return maskPhone_(user.phone);
  }

  return '';

}


/* ============================================================
   9. OTP SEND — GMAIL
   ============================================================ */

/**
 * Send OTP to the user's actual email address.
 *
 * IMPORTANT:
 *   The destination comes from user.email.
 *
 *   It NEVER sends to the string "gmail".
 */
function sendEmailOtp_(email, otp) {

  const destination = normalizeEmail_(email);

  if (!isValidEmail_(destination)) {

    return {
      success: false,
      message: 'Invalid Gmail/email address.'
    };

  }

  const subject =
    SF_CONFIG.APP_NAME +
    ' — Account Verification Code';

  const body =
    'Hello,\n\n' +

    'Your ' +
    SF_CONFIG.APP_NAME +
    ' verification code is:\n\n' +

    otp +
    '\n\n' +

    'This code expires in ' +
    SF_CONFIG.OTP_EXPIRATION_MINUTES +
    ' minutes.\n\n' +

    'If you did not request this code, you can safely ignore this email.\n\n' +

    '— ' +
    SF_CONFIG.APP_NAME +
    ' Security';

  try {

    MailApp.sendEmail({
      to: destination,
      subject: subject,
      body: body,
      name: SF_CONFIG.APP_NAME
    });

    return {
      success: true,
      destination: destination
    };

  } catch (error) {

    console.error(
      'GMAIL OTP ERROR: ' +
      error.message
    );

    return {
      success: false,
      message:
        'Unable to send the verification email. ' +
        error.message
    };

  }

}


/* ============================================================
   10. OTP SEND — TWILIO SMS
   ============================================================ */

/**
 * Send OTP through Twilio.
 *
 * Script Properties required:
 *
 * TWILIO_ACCOUNT_SID
 * TWILIO_AUTH_TOKEN
 * TWILIO_PHONE_NUMBER
 */
function sendSmsOtp_(phone, otp) {

  const destination = normalizePhone_(phone);

  if (!isValidPhone_(destination)) {

    return {
      success: false,
      message:
        'Invalid phone number. Use international format, ' +
        'for example +639171234567.'
    };

  }

  const properties =
    PropertiesService.getScriptProperties();

  const accountSid =
    String(
      properties.getProperty('TWILIO_ACCOUNT_SID') || ''
    ).trim();

  const authToken =
    String(
      properties.getProperty('TWILIO_AUTH_TOKEN') || ''
    ).trim();

  const fromNumber =
    normalizePhone_(
      properties.getProperty('TWILIO_PHONE_NUMBER') || ''
    );

  if (!accountSid) {

    return {
      success: false,
      message:
        'TWILIO_ACCOUNT_SID is not configured in Apps Script Script Properties.'
    };

  }

  if (!authToken) {

    return {
      success: false,
      message:
        'TWILIO_AUTH_TOKEN is not configured in Apps Script Script Properties.'
    };

  }

  if (!fromNumber) {

    return {
      success: false,
      message:
        'TWILIO_PHONE_NUMBER is not configured in Apps Script Script Properties.'
    };

  }

  const url =
    'https://api.twilio.com/2010-04-01/Accounts/' +
    encodeURIComponent(accountSid) +
    '/Messages.json';

  const messageBody =
    'Your ' +
    SF_CONFIG.APP_NAME +
    ' verification code is ' +
    otp +
    '. It expires in ' +
    SF_CONFIG.OTP_EXPIRATION_MINUTES +
    ' minutes.';

  const payload = {

    To: destination,
    From: fromNumber,
    Body: messageBody

  };

  const authString =
    Utilities.base64Encode(
      accountSid + ':' + authToken
    );

  const options = {

    method: 'post',

    payload: payload,

    headers: {
      Authorization: 'Basic ' + authString
    },

    muteHttpExceptions: true

  };

  try {

    const response =
      UrlFetchApp.fetch(url, options);

    const statusCode =
      response.getResponseCode();

    const responseText =
      response.getContentText();

    let responseJson = null;

    try {
      responseJson = JSON.parse(responseText);
    } catch (parseError) {
      responseJson = null;
    }

    if (statusCode >= 200 && statusCode < 300) {

      return {

        success: true,

        destination: destination,

        messageSid:
          responseJson &&
          responseJson.sid
            ? responseJson.sid
            : ''

      };

    }

    let errorMessage =
      'Twilio rejected the SMS request.';

    if (
      responseJson &&
      responseJson.message
    ) {
      errorMessage =
        responseJson.message;
    }

    console.error(
      'TWILIO ERROR ' +
      statusCode +
      ': ' +
      responseText
    );

    return {

      success: false,

      message:
        errorMessage +
        ' (HTTP ' +
        statusCode +
        ')'

    };

  } catch (error) {

    console.error(
      'TWILIO REQUEST ERROR: ' +
      error.message
    );

    return {

      success: false,

      message:
        'Unable to connect to Twilio. ' +
        error.message

    };

  }

}


/* ============================================================
   11. SEND OTP ENGINE
   ============================================================ */

/**
 * Generate, hash, store and send OTP.
 *
 * This function is the central OTP engine.
 */
function sendOtpForUser_(sheet, rowNumber, requestedChannel) {

  const userRecord =
    getUserByRow_(sheet, rowNumber);

  if (!userRecord) {

    return {
      success: false,
      message: 'User account was not found.'
    };

  }

  const user = userRecord.data;

  const channel =
    normalizeOtpChannel_(requestedChannel);

  if (!channel) {

    return {
      success: false,
      message:
        'Invalid OTP channel. Select Email or SMS.'
    };

  }

  const destination =
    getOtpDestination_(user, channel);

  if (!destination) {

    return {
      success: false,
      message:
        channel === 'EMAIL'
          ? 'No email address is registered for this account.'
          : 'No phone number is registered for this account.'
    };

  }

  if (channel === 'EMAIL') {

    if (!isValidEmail_(destination)) {

      return {
        success: false,
        message:
          'The registered email address is invalid.'
      };

    }

  }

  if (channel === 'SMS') {

    if (!isValidPhone_(destination)) {

      return {
        success: false,
        message:
          'The registered phone number is invalid.'
      };

    }

  }

  // Check resend cooldown.
  const lastOtpSentMillis =
    dateToMillis_(user.lastOtpSent);

  const secondsSinceLastSend =
    lastOtpSentMillis
      ? Math.floor(
          (Date.now() - lastOtpSentMillis) / 1000
        )
      : Infinity;

  if (
    secondsSinceLastSend <
    SF_CONFIG.OTP_RESEND_COOLDOWN_SECONDS
  ) {

    const remaining =
      SF_CONFIG.OTP_RESEND_COOLDOWN_SECONDS -
      secondsSinceLastSend;

    return {

      success: false,

      cooldown: true,

      remainingSeconds: Math.max(
        remaining,
        1
      ),

      message:
        'Please wait ' +
        Math.max(remaining, 1) +
        ' seconds before requesting another code.'

    };

  }

  // Check lock.
  const lockMillis =
    dateToMillis_(user.otpLockUntil);

  if (
    lockMillis &&
    lockMillis > Date.now()
  ) {

    const minutes =
      Math.ceil(
        (lockMillis - Date.now()) /
        60000
      );

    return {

      success: false,

      locked: true,

      message:
        'OTP verification is temporarily locked. ' +
        'Try again in approximately ' +
        minutes +
        ' minute(s).'

    };

  }

  const otp =
    generateOtp_();

  const otpHash =
    sha256_(otp);

  const expires =
    new Date(
      Date.now() +
      SF_CONFIG.OTP_EXPIRATION_MINUTES *
      60 *
      1000
    );

  /*
   * Store ONLY the OTP HASH.
   *
   * The plaintext OTP is NOT written to Google Sheets.
   */
  sheet
    .getRange(rowNumber, 11, 1, 8)
    .setValues([[
      otpHash,       // OTP
      expires,       // OTP EXPIRES
      0,             // OTP ATTEMPTS
      '',            // OTP LOCK UNTIL
      channel,       // OTP CHANNEL
      user.createdAt || now_(), // CREATED AT - preserved
      user.verifiedAt || '',    // VERIFIED AT - preserved
      now_()         // LAST OTP SENT
    ]]);

  /*
   * IMPORTANT:
   *
   * The range above starts at column 11 (OTP) and has 8 columns.
   *
   * Columns:
   * 11 OTP
   * 12 OTP EXPIRES
   * 13 OTP ATTEMPTS
   * 14 OTP LOCK UNTIL
   * 15 OTP CHANNEL
   * 16 CREATED AT
   * 17 VERIFIED AT
   * 18 LAST OTP SENT
   *
   * LAST LOGIN is column 19 and is intentionally untouched.
   */

  let delivery;

  if (channel === 'EMAIL') {

    delivery =
      sendEmailOtp_(
        destination,
        otp
      );

  } else {

    delivery =
      sendSmsOtp_(
        destination,
        otp
      );

  }

  /*
   * If delivery fails, clear the OTP hash so the
   * failed request cannot be used later.
   */
  if (!delivery.success) {

    sheet
      .getRange(rowNumber, 11, 1, 5)
      .clearContent();

    return {

      success: false,

      channel: channel,

      message:
        delivery.message ||
        'Unable to deliver OTP.'

    };

  }

  return {

    success: true,

    channel: channel,

    destination: getMaskedDestination_(
      user,
      channel
    ),

    expiresAt:
      expires.toISOString(),

    expiresInSeconds:
      SF_CONFIG.OTP_EXPIRATION_MINUTES *
      60,

    message:
      channel === 'EMAIL'
        ? 'Verification code sent to your email address.'
        : 'Verification code sent to your phone number.'

  };

}


/* ============================================================
   12. REGISTRATION
   ============================================================ */

/**
 * Register employee/user account.
 *
 * Supported payload examples:
 *
 * {
 *   name: "...",
 *   username: "...",
 *   password: "...",
 *   age: 20,
 *   gmail: "student@gmail.com",
 *   email: "student@gmail.com",
 *   phone: "09171234567",
 *   phoneNumber: "09171234567",
 *   otpChannel: "EMAIL",
 *   role: "Employee"
 * }
 */
function registerUser_(params) {

  const sheet =
    getUserSheet_();

  const name =
    String(
      params.name ||
      params.fullName ||
      ''
    ).trim();

  const username =
    String(
      params.username ||
      ''
    ).trim();

  const password =
    String(
      params.password ||
      ''
    );

  const age =
    params.age === undefined ||
    params.age === null ||
    params.age === ''
      ? ''
      : Number(params.age);

  /*
   * IMPORTANT:
   *
   * Accept both "gmail" and "email" as FIELD names,
   * but NEVER treat the value "gmail" as an email address.
   */
  const email =
    normalizeEmail_(
      params.email ||
      params.gmail ||
      params.GMAIL ||
      ''
    );

  const phone =
    normalizePhone_(
      params.phone ||
      params.phoneNumber ||
      params.mobile ||
      params['PHONE NO.'] ||
      ''
    );

  const channel =
    normalizeOtpChannel_(
      params.otpChannel ||
      params.channel ||
      params.verificationMethod ||
      'EMAIL'
    );

  const requestedRole =
    String(
      params.role ||
      'Employee'
    ).trim();

  if (!name) {

    return {
      success: false,
      message: 'Full name is required.'
    };

  }

  if (!username) {

    return {
      success: false,
      message: 'Username is required.'
    };

  }

  if (!isValidPassword_(password)) {

    return {
      success: false,
      message:
        'Password must contain at least ' +
        SF_CONFIG.PASSWORD_MIN_LENGTH +
        ' characters.'
    };

  }

  if (!isValidEmail_(email)) {

    return {
      success: false,
      message:
        'Please provide a valid Gmail/email address.'
    };

  }

  if (!isValidPhone_(phone)) {

    return {
      success: false,
      message:
        'Please provide a valid phone number.'
    };

  }

  if (!channel) {

    return {
      success: false,
      message:
        'Please select Email or SMS verification.'
    };

  }

  /*
   * Prevent duplicate email.
   */
  if (findUserByEmail_(sheet, email)) {

    return {
      success: false,
      message:
        'An account with this email address already exists.'
    };

  }

  /*
   * Prevent duplicate username.
   */
  if (findUserByUsername_(sheet, username)) {

    return {
      success: false,
      message:
        'This username is already registered.'
    };

  }

  /*
   * Validate requested role.
   *
   * Normal registration cannot create Administrator.
   */
  let role = 'Employee';

  if (
    requestedRole.toLowerCase() === 'employee'
  ) {
    role = 'Employee';
  }

  if (
    requestedRole.toLowerCase() === 'staff'
  ) {
    role = 'Staff';
  }

  if (
    requestedRole.toLowerCase() === 'admin' ||
    requestedRole.toLowerCase() === 'administrator'
  ) {

    return {

      success: false,

      message:
        'Administrator accounts cannot be created through normal registration.'

    };

  }

  const uid =
    generateUid_();

  const timestamp =
    now_();

  /*
   * Password is hashed.
   *
   * Existing legacy plaintext passwords remain
   * compatible during login through checkPassword_().
   */
  const passwordHash =
    sha256_(password);

  const row = [

    uid,              // UID
    name,             // NAME
    username,         // USERNAME
    passwordHash,     // PASSWORD
    age,              // AGE
    'PENDING',        // ACCOUNT_S
    email,            // GMAIL
    phone,            // PHONE NO.
    role,             // ROLE
    false,            // VERIFIED
    '',               // OTP
    '',               // OTP EXPIRES
    0,                // OTP ATTEMPTS
    '',               // OTP LOCK UNTIL
    '',               // OTP CHANNEL
    timestamp,        // CREATED AT
    '',               // VERIFIED AT
    '',               // LAST OTP SENT
    ''                // LAST LOGIN

  ];

  sheet.appendRow(row);

  const newRowNumber =
    sheet.getLastRow();

  /*
   * Send OTP to the user's ACTUAL destination.
   */
  const otpResult =
    sendOtpForUser_(
      sheet,
      newRowNumber,
      channel
    );

  if (!otpResult.success) {

    /*
     * Account remains pending, but OTP delivery
     * failure is returned clearly.
     */
    return {

      success: false,

      registered: true,

      uid: uid,

      message:
        'Your account was created, but the verification code could not be delivered. ' +
        otpResult.message

    };

  }

  return {

    success: true,

    registered: true,

    requiresVerification: true,

    uid: uid,

    channel:
      otpResult.channel,

    destination:
      otpResult.destination,

    expiresAt:
      otpResult.expiresAt,

    expiresInSeconds:
      otpResult.expiresInSeconds,

    message:
      otpResult.message

  };

}


/* ============================================================
   13. PASSWORD COMPATIBILITY
   ============================================================ */

/**
 * Check password.
 *
 * New accounts:
 *   stored SHA-256 hash
 *
 * Existing legacy accounts:
 *   plaintext password
 *
 * This allows existing STOCKFLOW accounts to continue working
 * while new accounts use password hashing.
 */
function checkPassword_(enteredPassword, storedPassword) {

  const entered =
    String(enteredPassword || '');

  const stored =
    String(storedPassword || '');

  if (!entered || !stored) {
    return false;
  }

  /*
   * New hashed password.
   */
  if (/^[a-f0-9]{64}$/i.test(stored)) {

    return (
      sha256_(entered) ===
      stored.toLowerCase()
    );

  }

  /*
   * Legacy plaintext compatibility.
   *
   * Once the user successfully logs in, the password
   * is upgraded to a SHA-256 hash.
   */
  return entered === stored;

}


/* ============================================================
   14. LOGIN
   ============================================================ */

/**
 * Login user.
 *
 * Accepts:
 *   username
 *   email
 *   identifier
 *
 * Password:
 *   password
 */
function loginUser_(params) {

  const sheet =
    getUserSheet_();

  const identifier =
    String(
      params.identifier ||
      params.username ||
      params.email ||
      params.gmail ||
      ''
    ).trim();

  const password =
    String(
      params.password ||
      ''
    );

  if (!identifier) {

    return {
      success: false,
      message:
        'Username or email is required.'
    };

  }

  if (!password) {

    return {
      success: false,
      message:
        'Password is required.'
    };

  }

  let userRecord = null;

  /*
   * If identifier looks like an email,
   * search email first.
   */
  if (identifier.indexOf('@') !== -1) {

    userRecord =
      findUserByEmail_(
        sheet,
        identifier
      );

  }

  /*
   * Otherwise search username.
   */
  if (!userRecord) {

    userRecord =
      findUserByUsername_(
        sheet,
        identifier
      );

  }

  if (!userRecord) {

    return {

      success: false,

      message:
        'Invalid username/email or password.'

    };

  }

  const rowNumber =
    userRecord.rowNumber;

  const user =
    userRecord.data;

  if (
    !checkPassword_(
      password,
      user.password
    )
  ) {

    return {

      success: false,

      message:
        'Invalid username/email or password.'

    };

  }

  /*
   * Account verification check.
   */
  if (!user.verified) {

    return {

      success: false,

      requiresVerification: true,

      uid: user.uid,

      email: user.email,

      phone: maskPhone_(user.phone),

      message:
        'Your account has not been verified yet.'

    };

  }

  /*
   * Account status check.
   */
  const status =
    String(
      user.accountStatus || ''
    ).trim().toUpperCase();

  if (
    status === 'INACTIVE' ||
    status === 'DISABLED' ||
    status === 'BLOCKED'
  ) {

    return {

      success: false,

      message:
        'Your account is currently ' +
        status.toLowerCase() +
        '. Please contact the administrator.'

    };

  }

  /*
   * Upgrade legacy plaintext passwords.
   */
  if (
    !/^[a-f0-9]{64}$/i.test(
      String(user.password || '')
    )
  ) {

    sheet
      .getRange(rowNumber, 4)
      .setValue(
        sha256_(password)
      );

  }

  /*
   * Update last login.
   */
  const loginTime =
    now_();

  sheet
    .getRange(rowNumber, 19)
    .setValue(loginTime);

  /*
   * Create server-side session.
   */
  const token =
    generateSessionToken_();

  const sessionData = {

    uid: user.uid,

    rowNumber: rowNumber,

    username: user.username,

    email: user.email,

    role: user.role,

    name: user.name,

    createdAt:
      Date.now()

  };

  CacheService
    .getScriptCache()
    .put(
      'SF_SESSION_' + token,
      JSON.stringify(sessionData),
      SF_CONFIG.SESSION_EXPIRATION_SECONDS
    );

  return {

    success: true,

    authenticated: true,

    token: token,

    expiresIn:
      SF_CONFIG.SESSION_EXPIRATION_SECONDS,

    user: {

      uid: user.uid,

      name: user.name,

      username: user.username,

      email: user.email,

      phone: maskPhone_(user.phone),

      role: user.role,

      accountStatus:
        user.accountStatus,

      verified: true

    },

    message:
      'Login successful.'

  };

}


/* ============================================================
   15. SESSION MANAGEMENT
   ============================================================ */

/**
 * Get session from token.
 */
function getSession_(token) {

  const cleanToken =
    String(token || '').trim();

  if (!cleanToken) {
    return null;
  }

  const cache =
    CacheService.getScriptCache();

  const raw =
    cache.get(
      'SF_SESSION_' + cleanToken
    );

  if (!raw) {
    return null;
  }

  try {

    return JSON.parse(raw);

  } catch (error) {

    return null;

  }

}


/**
 * Require a valid authenticated session.
 */
function requireSession_(params) {

  const token =
    params &&
    (
      params.token ||
      params.sessionToken
    );

  const session =
    getSession_(token);

  if (!session) {

    throw new Error(
      'AUTH_REQUIRED'
    );

  }

  return session;

}


/**
 * Destroy session.
 */
function logoutUser_(params) {

  const token =
    String(
      params.token ||
      params.sessionToken ||
      ''
    ).trim();

  if (token) {

    CacheService
      .getScriptCache()
      .remove(
        'SF_SESSION_' + token
      );

  }

  return {

    success: true,

    loggedOut: true,

    message:
      'You have been signed out.'

  };

}


/* ============================================================
   16. OTP VERIFICATION
   ============================================================ */

/**
 * Verify account OTP.
 *
 * Payload:
 *
 * {
 *   uid: "...",
 *   otp: "123456"
 * }
 */
function verifyOtp_(params) {

  const sheet =
    getUserSheet_();

  const uid =
    String(
      params.uid ||
      params.userId ||
      ''
    ).trim();

  const otp =
    String(
      params.otp ||
      params.code ||
      ''
    ).trim();

  if (!uid) {

    return {

      success: false,

      message:
        'Verification session is missing.'

    };

  }

  if (!/^\d{6}$/.test(otp)) {

    return {

      success: false,

      message:
        'Please enter the 6-digit verification code.'

    };

  }

  const userRecord =
    findUserByUid_(
      sheet,
      uid
    );

  if (!userRecord) {

    return {

      success: false,

      message:
        'Account could not be found.'

    };

  }

  const rowNumber =
    userRecord.rowNumber;

  const user =
    userRecord.data;

  /*
   * Already verified.
   */
  if (user.verified) {

    return {

      success: true,

      alreadyVerified: true,

      uid: user.uid,

      message:
        'This account is already verified.'

    };

  }

  /*
   * Lock check.
   */
  const lockMillis =
    dateToMillis_(
      user.otpLockUntil
    );

  if (
    lockMillis &&
    lockMillis > Date.now()
  ) {

    return {

      success: false,

      locked: true,

      message:
        'Too many incorrect attempts. ' +
        'Please try again later.'

    };

  }

  /*
   * Expiration check.
   */
  const expirationMillis =
    dateToMillis_(
      user.otpExpires
    );

  if (
    !expirationMillis ||
    expirationMillis < Date.now()
  ) {

    return {

      success: false,

      expired: true,

      message:
        'This verification code has expired. Please request a new code.'

    };

  }

  /*
   * Compare HASH of entered OTP.
   */
  const enteredHash =
    sha256_(otp);

  const storedHash =
    String(
      user.otpHash || ''
    ).trim().toLowerCase();

  if (
    !storedHash ||
    enteredHash !== storedHash
  ) {

    const attempts =
      Number(
        user.otpAttempts || 0
      ) + 1;

    if (
      attempts >=
      SF_CONFIG.OTP_MAX_ATTEMPTS
    ) {

      const lockUntil =
        new Date(
          Date.now() +
          SF_CONFIG.OTP_LOCK_MINUTES *
          60 *
          1000
        );

      sheet
        .getRange(rowNumber, 13)
        .setValue(attempts);

      sheet
        .getRange(rowNumber, 14)
        .setValue(lockUntil);

      return {

        success: false,

        locked: true,

        attempts: attempts,

        message:
          'Too many incorrect OTP attempts. ' +
          'Your verification is temporarily locked.'

      };

    }

    sheet
      .getRange(rowNumber, 13)
      .setValue(attempts);

    return {

      success: false,

      invalid: true,

      attempts: attempts,

      remainingAttempts:
        SF_CONFIG.OTP_MAX_ATTEMPTS -
        attempts,

      message:
        'Invalid verification code.'

    };

  }

  /*
   * SUCCESS
   *
   * Mark account as verified.
   */
  const verifiedAt =
    now_();

  sheet
    .getRange(rowNumber, 6, 1, 10)
    .setValues([[
      'ACTIVE',      // ACCOUNT_S
      user.email,    // GMAIL
      user.phone,    // PHONE
      user.role,     // ROLE
      true,          // VERIFIED
      '',            // OTP
      '',            // OTP EXPIRES
      0,             // OTP ATTEMPTS
      '',            // OTP LOCK UNTIL
      user.otpChannel // OTP CHANNEL
    ]]);

  sheet
    .getRange(rowNumber, 17)
    .setValue(verifiedAt);

  return {

    success: true,

    verified: true,

    uid: user.uid,

    message:
      'Account verified successfully. You can now sign in.'

  };

}


/* ============================================================
   17. RESEND OTP
   ============================================================ */

/**
 * Resend OTP.
 */
function resendOtp_(params) {

  const sheet =
    getUserSheet_();

  const uid =
    String(
      params.uid ||
      params.userId ||
      ''
    ).trim();

  const requestedChannel =
    params.otpChannel ||
    params.channel ||
    '';

  if (!uid) {

    return {

      success: false,

      message:
        'Account verification session is missing.'

    };

  }

  const userRecord =
    findUserByUid_(
      sheet,
      uid
    );

  if (!userRecord) {

    return {

      success: false,

      message:
        'Account could not be found.'

    };

  }

  let channel =
    normalizeOtpChannel_(
      requestedChannel
    );

  if (!channel) {

    channel =
      normalizeOtpChannel_(
        userRecord.data.otpChannel
      );

  }

  if (!channel) {
    channel = 'EMAIL';
  }

  return sendOtpForUser_(
    sheet,
    userRecord.rowNumber,
    channel
  );

}


/**
 * requestOtp alias.
 */
function requestOtp_(params) {

  return resendOtp_(params);

}


/* ============================================================
   18. GET USER
   ============================================================ */

/**
 * Get authenticated user's information.
 */
function getAuthenticatedUser_(params) {

  const session =
    requireSession_(params);

  const sheet =
    getUserSheet_();

  const userRecord =
    findUserByUid_(
      sheet,
      session.uid
    );

  if (!userRecord) {

    return {

      success: false,

      message:
        'Authenticated user no longer exists.'

    };

  }

  const user =
    userRecord.data;

  return {

    success: true,

    authenticated: true,

    user: {

      uid: user.uid,

      name: user.name,

      username: user.username,

      email: user.email,

      phone: maskPhone_(user.phone),

      role: user.role,

      accountStatus:
        user.accountStatus,

      verified:
        user.verified

    }

  };

}


/* ============================================================
   19. UPDATE ACCOUNT STATUS
   ============================================================ */

/**
 * Update account status.
 *
 * Requires authenticated session.
 *
 * For production, add role-based admin checking here.
 */
function updateUserStatus_(params) {

  const session =
    requireSession_(params);

  const sheet =
    getUserSheet_();

  const uid =
    String(
      params.uid ||
      params.userId ||
      ''
    ).trim();

  const status =
    String(
      params.status ||
      ''
    ).trim().toUpperCase();

  if (!uid) {

    return {

      success: false,

      message:
        'User ID is required.'

    };

  }

  if (
    ['ACTIVE', 'INACTIVE', 'DISABLED', 'BLOCKED', 'PENDING']
      .indexOf(status) === -1
  ) {

    return {

      success: false,

      message:
        'Invalid account status.'

    };

  }

  /*
   * Prevent ordinary users from changing their own
   * account status or another user's status.
   *
   * Administrator role is required.
   */
  if (
    String(session.role || '')
      .toLowerCase() !== 'administrator' &&
    String(session.role || '')
      .toLowerCase() !== 'admin'
  ) {

    return {

      success: false,

      message:
        'Administrator permission is required.'

    };

  }

  const userRecord =
    findUserByUid_(
      sheet,
      uid
    );

  if (!userRecord) {

    return {

      success: false,

      message:
        'User account not found.'

    };

  }

  sheet
    .getRange(userRecord.rowNumber, 6)
    .setValue(status);

  return {

    success: true,

    uid: uid,

    status: status,

    message:
      'Account status updated successfully.'

  };

}


/* ============================================================
   20. FORGOT PASSWORD
   ============================================================ */

/**
 * Request password recovery OTP.
 *
 * Payload:
 *
 * {
 *   email: "user@gmail.com",
 *   otpChannel: "EMAIL"
 * }
 */
function forgotPassword_(params) {

  const sheet =
    getUserSheet_();

  const email =
    normalizeEmail_(
      params.email ||
      params.gmail ||
      ''
    );

  if (!isValidEmail_(email)) {

    return {

      success: false,

      message:
        'Please enter a valid registered email address.'

    };

  }

  const userRecord =
    findUserByEmail_(
      sheet,
      email
    );

  /*
   * Don't reveal whether the account exists.
   */
  if (!userRecord) {

    return {

      success: true,

      message:
        'If the email is registered, a recovery code will be sent.'

    };

  }

  const channel =
    normalizeOtpChannel_(
      params.otpChannel ||
      params.channel ||
      'EMAIL'
    );

  /*
   * Recovery should preferably use email.
   * SMS is supported if the account has a phone.
   */
  return sendOtpForUser_(
    sheet,
    userRecord.rowNumber,
    channel
  );

}


/* ============================================================
   21. VERIFY RECOVERY OTP
   ============================================================ */

/**
 * Verify recovery OTP.
 *
 * Successful verification creates a temporary recovery token.
 */
function verifyRecoveryOtp_(params) {

  const sheet =
    getUserSheet_();

  const email =
    normalizeEmail_(
      params.email ||
      params.gmail ||
      ''
    );

  const otp =
    String(
      params.otp ||
      params.code ||
      ''
    ).trim();

  if (!isValidEmail_(email)) {

    return {

      success: false,

      message:
        'Invalid email address.'

    };

  }

  if (!/^\d{6}$/.test(otp)) {

    return {

      success: false,

      message:
        'Enter the 6-digit recovery code.'

    };

  }

  const userRecord =
    findUserByEmail_(
      sheet,
      email
    );

  if (!userRecord) {

    return {

      success: false,

      message:
        'Invalid recovery request.'

    };

  }

  const user =
    userRecord.data;

  const lockMillis =
    dateToMillis_(
      user.otpLockUntil
    );

  if (
    lockMillis &&
    lockMillis > Date.now()
  ) {

    return {

      success: false,

      locked: true,

      message:
        'Recovery verification is temporarily locked.'

    };

  }

  const expirationMillis =
    dateToMillis_(
      user.otpExpires
    );

  if (
    !expirationMillis ||
    expirationMillis < Date.now()
  ) {

    return {

      success: false,

      expired: true,

      message:
        'Recovery code has expired.'

    };

  }

  const enteredHash =
    sha256_(otp);

  if (
    enteredHash !==
    String(user.otpHash || '')
      .trim()
      .toLowerCase()
  ) {

    const attempts =
      Number(user.otpAttempts || 0) + 1;

    sheet
      .getRange(userRecord.rowNumber, 13)
      .setValue(attempts);

    if (
      attempts >=
      SF_CONFIG.OTP_MAX_ATTEMPTS
    ) {

      const lockUntil =
        new Date(
          Date.now() +
          SF_CONFIG.OTP_LOCK_MINUTES *
          60 *
          1000
        );

      sheet
        .getRange(userRecord.rowNumber, 14)
        .setValue(lockUntil);

      return {

        success: false,

        locked: true,

        message:
          'Too many incorrect attempts.'

      };

    }

    return {

      success: false,

      invalid: true,

      message:
        'Invalid recovery code.'

    };

  }

  /*
   * Generate short-lived recovery token.
   */
  const recoveryToken =
    generateSessionToken_();

  CacheService
    .getScriptCache()
    .put(
      'SF_RECOVERY_' + recoveryToken,
      JSON.stringify({
        uid: user.uid,
        rowNumber: userRecord.rowNumber,
        email: user.email,
        createdAt: Date.now()
      }),
      900
    );

  /*
   * Clear OTP.
   */
  sheet
    .getRange(userRecord.rowNumber, 11, 1, 4)
    .clearContent();

  return {

    success: true,

    verified: true,

    recoveryToken: recoveryToken,

    message:
      'Recovery code verified. You may now reset your password.'

  };

}


/* ============================================================
   22. RESET PASSWORD
   ============================================================ */

function resetPassword_(params) {

  const recoveryToken =
    String(
      params.recoveryToken ||
      params.token ||
      ''
    ).trim();

  const newPassword =
    String(
      params.newPassword ||
      params.password ||
      ''
    );

  if (!recoveryToken) {

    return {

      success: false,

      message:
        'Recovery session is missing.'

    };

  }

  if (!isValidPassword_(newPassword)) {

    return {

      success: false,

      message:
        'Password must contain at least ' +
        SF_CONFIG.PASSWORD_MIN_LENGTH +
        ' characters.'

    };

  }

  const cache =
    CacheService.getScriptCache();

  const raw =
    cache.get(
      'SF_RECOVERY_' + recoveryToken
    );

  if (!raw) {

    return {

      success: false,

      message:
        'Recovery session has expired. Please request a new code.'

    };

  }

  let recovery;

  try {

    recovery =
      JSON.parse(raw);

  } catch (error) {

    return {

      success: false,

      message:
        'Invalid recovery session.'

    };

  }

  const sheet =
    getUserSheet_();

  const userRecord =
    findUserByUid_(
      sheet,
      recovery.uid
    );

  if (!userRecord) {

    return {

      success: false,

      message:
        'User account could not be found.'

    };

  }

  const passwordHash =
    sha256_(newPassword);

  sheet
    .getRange(userRecord.rowNumber, 4)
    .setValue(passwordHash);

  /*
   * Remove recovery token.
   */
  cache.remove(
    'SF_RECOVERY_' + recoveryToken
  );

  return {

    success: true,

    message:
      'Password reset successfully. You can now sign in.'

  };

}


/* ============================================================
   23. INVENTORY DISPATCH
   ============================================================ */

/**
 * Pass inventory actions to InventoryModule.gs.
 *
 * Your existing inventorymodule.gs should expose:
 *
 *   SFInv_dispatch(action, params)
 */
function handleInventoryAction_(action, params) {

  if (
    typeof SFInv_dispatch !== 'function'
  ) {

    return {

      success: false,

      message:
        'Inventory backend is not available. ' +
        'Make sure inventorymodule.gs is installed.'

    };

  }

  /*
   * Inventory operations require authentication.
   */
  const session =
    requireSession_(params);

  /*
   * Attach authenticated user information.
   */
  const inventoryParams =
    Object.assign(
      {},
      params,
      {
        authenticatedUid: session.uid,
        authenticatedUsername: session.username,
        authenticatedName: session.name,
        authenticatedRole: session.role
      }
    );

  return SFInv_dispatch(
    action,
    inventoryParams
  );

}


/* ============================================================
   24. DASHBOARD STATS
   ============================================================ */

/**
 * Get inventory dashboard statistics.
 *
 * If InventoryModule.gs already provides dashboardStats,
 * this dispatches to it.
 */
function getDashboardStats_(params) {

  return handleInventoryAction_(
    'dashboardStats',
    params
  );

}


/* ============================================================
   25. MAIN ACTION ROUTER
   ============================================================ */

/**
 * Central POST endpoint.
 */
function doPost(e) {

  try {

    const body =
      e &&
      e.postData &&
      e.postData.contents
        ? e.postData.contents
        : '{}';

    let params;

    try {

      params =
        JSON.parse(body);

    } catch (parseError) {

      return jsonResponse_({
        success: false,
        message:
          'Invalid JSON request.'
      });

    }

    const action =
      String(
        params.action ||
        ''
      ).trim();

    if (!action) {

      return jsonResponse_({

        success: false,

        message:
          'No action was provided.'

      });

    }

    let result;

    switch (action) {

      /* ------------------------------------------------------
         AUTHENTICATION
         ------------------------------------------------------ */

      case 'register':
      case 'registerUser':

        result =
          registerUser_(params);

        break;


      case 'login':
      case 'signIn':

        result =
          loginUser_(params);

        break;


      case 'logout':
      case 'signOut':

        result =
          logoutUser_(params);

        break;


      case 'verifyOtp':
      case 'verifyOTP':

        result =
          verifyOtp_(params);

        break;


      case 'resendOtp':
      case 'resendOTP':

        result =
          resendOtp_(params);

        break;


      case 'requestOtp':

        result =
          requestOtp_(params);

        break;


      case 'getUser':
      case 'currentUser':
      case 'me':

        result =
          getAuthenticatedUser_(params);

        break;


      case 'updateStatus':
      case 'updateUserStatus':

        result =
          updateUserStatus_(params);

        break;


      /* ------------------------------------------------------
         PASSWORD RECOVERY
         ------------------------------------------------------ */

      case 'forgotPassword':
      case 'requestPasswordReset':

        result =
          forgotPassword_(params);

        break;


      case 'verifyRecoveryOtp':
      case 'verifyPasswordOtp':

        result =
          verifyRecoveryOtp_(params);

        break;


      case 'resetPassword':

        result =
          resetPassword_(params);

        break;


      /* ------------------------------------------------------
         INVENTORY
         ------------------------------------------------------ */

      case 'dashboardStats':
      case 'getDashboardStats':

        result =
          getDashboardStats_(params);

        break;


      case 'products':
      case 'getProducts':
      case 'createProduct':
      case 'updateProduct':
      case 'deleteProduct':

      case 'categories':
      case 'getCategories':
      case 'createCategory':
      case 'updateCategory':
      case 'deleteCategory':

      case 'suppliers':
      case 'getSuppliers':
      case 'createSupplier':
      case 'updateSupplier':
      case 'deleteSupplier':

      case 'inventory':
      case 'getInventory':

      case 'stockIn':
      case 'stockOut':

      case 'transactions':
      case 'getTransactions':

      case 'activity':
      case 'getActivity':

        result =
          handleInventoryAction_(
            action,
            params
          );

        break;


      /* ------------------------------------------------------
         UNKNOWN
         ------------------------------------------------------ */

      default:

        result = {

          success: false,

          message:
            'Unknown STOCKFLOW action: ' +
            action

        };

        break;

    }

    return jsonResponse_(
      result
    );

  } catch (error) {

    console.error(
      'STOCKFLOW doPost ERROR: ' +
      error.stack
    );

    /*
     * Never expose internal stack traces to browser.
     */
    if (
      error &&
      error.message === 'AUTH_REQUIRED'
    ) {

      return jsonResponse_({

        success: false,

        authenticated: false,

        code: 'AUTH_REQUIRED',

        message:
          'Your session has expired. Please sign in again.'

      });

    }

    return jsonResponse_({

      success: false,

      message:
        error &&
        error.message
          ? error.message
          : 'An unexpected server error occurred.'

    });

  }

}


/* ============================================================
   26. GET ENDPOINT
   ============================================================ */

/**
 * GET endpoint.
 *
 * Used for health checks.
 */
function doGet(e) {

  return jsonResponse_({

    success: true,

    app:
      SF_CONFIG.APP_NAME,

    status:
      'online',

    service:
      'Google Apps Script API',

    timestamp:
      now_().toISOString(),

    message:
      'STOCKFLOW backend is running.'

  });

}


/* ============================================================
   27. JSON RESPONSE
   ============================================================ */

/**
 * Return JSON response.
 */
function jsonResponse_(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        data || {}
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* ============================================================
   28. ADMIN REGISTRATION
   ============================================================ */

/**
 * Optional administrator registration.
 *
 * Requires:
 *
 * ADMIN_REGISTRATION_KEY
 *
 * in Script Properties.
 */
function registerAdmin_(params) {

  const properties =
    PropertiesService.getScriptProperties();

  const configuredKey =
    String(
      properties.getProperty(
        'ADMIN_REGISTRATION_KEY'
      ) || ''
    ).trim();

  const suppliedKey =
    String(
      params.adminRegistrationKey ||
      params.adminKey ||
      ''
    ).trim();

  if (!configuredKey) {

    return {

      success: false,

      message:
        'Administrator registration is not configured.'

    };

  }

  if (
    !suppliedKey ||
    suppliedKey !== configuredKey
  ) {

    return {

      success: false,

      message:
        'Invalid administrator registration key.'

    };

  }

  /*
   * Force administrator role through the
   * normal registration validation pathway.
   *
   * We duplicate the account creation here rather
   * than allowing normal public registration to create
   * administrators.
   */

  const sheet =
    getUserSheet_();

  const name =
    String(
      params.name ||
      params.fullName ||
      ''
    ).trim();

  const username =
    String(
      params.username ||
      ''
    ).trim();

  const password =
    String(
      params.password ||
      ''
    );

  const email =
    normalizeEmail_(
      params.email ||
      params.gmail ||
      ''
    );

  const phone =
    normalizePhone_(
      params.phone ||
      params.phoneNumber ||
      ''
    );

  const channel =
    normalizeOtpChannel_(
      params.otpChannel ||
      params.channel ||
      'EMAIL'
    );

  if (!name || !username) {

    return {

      success: false,

      message:
        'Name and username are required.'

    };

  }

  if (!isValidPassword_(password)) {

    return {

      success: false,

      message:
        'Password is too short.'

    };

  }

  if (!isValidEmail_(email)) {

    return {

      success: false,

      message:
        'A valid email address is required.'

    };

  }

  if (!isValidPhone_(phone)) {

    return {

      success: false,

      message:
        'A valid phone number is required.'

    };

  }

  if (findUserByEmail_(sheet, email)) {

    return {

      success: false,

      message:
        'Email address is already registered.'

    };

  }

  if (findUserByUsername_(sheet, username)) {

    return {

      success: false,

      message:
        'Username is already registered.'

    };

  }

  const uid =
    generateUid_();

  const timestamp =
    now_();

  sheet.appendRow([

    uid,

    name,

    username,

    sha256_(password),

    params.age || '',

    'PENDING',

    email,

    phone,

    'Administrator',

    false,

    '',

    '',

    0,

    '',

    '',

    timestamp,

    '',

    '',

    ''

  ]);

  const rowNumber =
    sheet.getLastRow();

  const otpResult =
    sendOtpForUser_(
      sheet,
      rowNumber,
      channel
    );

  if (!otpResult.success) {

    return {

      success: false,

      registered: true,

      uid: uid,

      message:
        'Administrator account was created, but OTP delivery failed. ' +
        otpResult.message

    };

  }

  return {

    success: true,

    registered: true,

    requiresVerification: true,

    uid: uid,

    channel:
      otpResult.channel,

    destination:
      otpResult.destination,

    expiresAt:
      otpResult.expiresAt,

    message:
      otpResult.message

  };

}


/* ============================================================
   29. MANUAL TEST FUNCTIONS
   ============================================================ */

/**
 * Test email delivery.
 *
 * IMPORTANT:
 * Change TEST_EMAIL before running.
 */
function testStockFlowEmail_() {

  const TEST_EMAIL =
    'YOUR_TEST_EMAIL@gmail.com';

  const otp =
    generateOtp_();

  const result =
    sendEmailOtp_(
      TEST_EMAIL,
      otp
    );

  console.log(result);

}


/**
 * Test SMS delivery.
 *
 * IMPORTANT:
 * Change TEST_PHONE before running.
 */
function testStockFlowSms_() {

  const TEST_PHONE =
    '+639171234567';

  const otp =
    generateOtp_();

  const result =
    sendSmsOtp_(
      TEST_PHONE,
      otp
    );

  console.log(result);

}


/**
 * Test Twilio configuration without exposing credentials.
 */
function testTwilioConfiguration_() {

  const properties =
    PropertiesService.getScriptProperties();

  const sid =
    properties.getProperty(
      'TWILIO_ACCOUNT_SID'
    );

  const token =
    properties.getProperty(
      'TWILIO_AUTH_TOKEN'
    );

  const phone =
    properties.getProperty(
      'TWILIO_PHONE_NUMBER'
    );

  console.log({

    accountSidConfigured:
      !!sid,

    authTokenConfigured:
      !!token,

    phoneConfigured:
      !!phone,

    phone:
      phone
        ? maskPhone_(phone)
        : ''

  });

}
