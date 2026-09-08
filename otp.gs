// ============================================================
// STOCKFLOW — OTP BACKEND
// File: OTP.gs
//
// MIDTERM / DEMO OTP
//
// NO EMAIL
// NO SMS
// NO TWILIO
//
// OTP flow:
//
// Apps Script
//      ↓
// Generate 6-digit OTP
//      ↓
// Google Sheets
//      ↓
// Firebase
//      ↓
// Return demoOtp
//      ↓
// Frontend waits 3–5 seconds
//      ↓
// Auto-fill six OTP boxes
// ============================================================


// ============================================================
// CREATE OTP
// ============================================================

function sfCreateOtp(
  userRecord,
  channel
) {

  if (!userRecord) {

    return {

      success:
        false,

      message:
        "Account not found."

    };

  }


  var code =
    sfGenerateOtp();


  var expires =
    sfMinutesFromNow(
      SF_CONFIG.OTP_EXPIRY_MINUTES
    );


  var normalizedChannel =
    sfClean(
      channel ||
      "BOTH"
    )
    .toUpperCase();


  if (
    normalizedChannel !== "EMAIL" &&
    normalizedChannel !== "PHONE" &&
    normalizedChannel !== "BOTH"
  ) {

    normalizedChannel =
      "BOTH";

  }


  // ----------------------------------------------------------
  // Save OTP to Google Sheets
  // ----------------------------------------------------------

  sfSetUserValue(
    userRecord,
    "OTP",
    code
  );


  sfSetUserValue(
    userRecord,
    "OTP EXPIRES",
    expires
  );


  sfSetUserValue(
    userRecord,
    "OTP ATTEMPTS",
    0
  );


  sfSetUserValue(
    userRecord,
    "OTP LOCK UNTIL",
    ""
  );


  sfSetUserValue(
    userRecord,
    "OTP CHANNEL",
    normalizedChannel
  );


  sfSetUserValue(
    userRecord,
    "LAST OTP SENT",
    new Date()
  );


  // ----------------------------------------------------------
  // Get current user
  // ----------------------------------------------------------

  var user =
    sfUserObject(
      userRecord
    );


  // ----------------------------------------------------------
  // Firebase mirror
  //
  // Firebase failure must NOT destroy the registration.
  // Google Sheets remains the primary datastore.
  // ----------------------------------------------------------

  var firebaseSuccess =
    false;


  try {

    sfFirebaseSaveOtp({

      uid:
        user.uid,

      username:
        user.username,

      gmail:
        user.gmail,

      phone:
        user.phone,

      otp:
        code,

      otpExpires:
        expires.toISOString(),

      attempts:
        0,

      channel:
        normalizedChannel

    });


    firebaseSuccess =
      true;

  } catch (firebaseError) {

    console.error(
      "Firebase OTP mirror failed:",
      firebaseError
    );

  }


  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  var result = {

    success:
      true,

    uid:
      user.uid,

    username:
      user.username,

    name:
      user.name,

    email:
      user.gmail,

    gmail:
      user.gmail,

    phone:
      user.phone,

    role:
      user.role,

    verified:
      false,

    channel:
      normalizedChannel,

    expiresAt:
      expires.toISOString(),

    firebaseSynced:
      firebaseSuccess,

    demoMode:
      SF_CONFIG.DEMO_MODE,

    message:
      "Verification code prepared."

  };


  // ----------------------------------------------------------
  // DEMO OTP
  // ----------------------------------------------------------

  if (
    SF_CONFIG.DEMO_MODE
  ) {

    result.otp =
      code;

    result.demoOtp =
      code;

  }


  return result;

}


// ============================================================
// PREPARE OTP
// ============================================================
//
// Registration already creates an OTP.
//
// When verify.html opens, this function first checks whether
// a valid existing OTP is already stored.
//
// It does NOT unnecessarily replace it.
// ============================================================

function sfPrepareOtp(
  data
) {

  data =
    data || {};


  var identity =
    sfGetOtpIdentity(
      data
    );


  var record =
    sfFindUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      code:
        "ACCOUNT_NOT_FOUND",

      message:
        "Account not found."

    };

  }


  var verified =
    sfToBoolean(
      sfGetUserValue(
        record,
        "VERIFIED"
      )
    );


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


  var storedOtp =
    sfClean(
      sfGetUserValue(
        record,
        "OTP"
      )
    );


  var expiryValue =
    sfGetUserValue(
      record,
      "OTP EXPIRES"
    );


  var expiry =
    sfParseDate(
      expiryValue
    );


  // ----------------------------------------------------------
  // Existing valid OTP
  // ----------------------------------------------------------

  if (
    storedOtp &&
    /^\d{6}$/.test(
      storedOtp
    ) &&
    expiry &&
    Date.now() <
      expiry.getTime()
  ) {

    var user =
      sfUserObject(
        record
      );


    var existingResult = {

      success:
        true,

      uid:
        user.uid,

      username:
        user.username,

      name:
        user.name,

      email:
        user.gmail,

      gmail:
        user.gmail,

      phone:
        user.phone,

      role:
        user.role,

      verified:
        false,

      channel:
        sfClean(
          data.channel ||
          data.otpChannel ||
          sfGetUserValue(
            record,
            "OTP CHANNEL"
          ) ||
          "BOTH"
        ).toUpperCase(),

      expiresAt:
        expiry.toISOString(),

      demoMode:
        SF_CONFIG.DEMO_MODE,

      message:
        "Existing verification code is ready."

    };


    if (
      SF_CONFIG.DEMO_MODE
    ) {

      existingResult.otp =
        storedOtp;

      existingResult.demoOtp =
        storedOtp;

    }


    return existingResult;

  }


  // ----------------------------------------------------------
  // Missing or expired OTP
  // ----------------------------------------------------------

  return sfCreateOtp(

    record,

    data.channel ||
    data.otpChannel ||
    "BOTH"

  );

}


// ============================================================
// COMPATIBILITY ALIAS
// ============================================================

function generateOtp(
  data
) {

  return sfPrepareOtp(
    data
  );

}


// ============================================================
// GET OTP IDENTITY
// ============================================================

function sfGetOtpIdentity(
  data
) {

  data =
    data || {};


  return (
    data.identity ||
    data.uid ||
    data.userId ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone ||
    data.mobile ||
    ""
  );

}


// ============================================================
// VERIFY OTP
// ============================================================

function sfVerifyOtp(
  data
) {

  data =
    data || {};


  var identity =
    sfGetOtpIdentity(
      data
    );


  var record =
    sfFindUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      code:
        "ACCOUNT_NOT_FOUND",

      message:
        "Account not found."

    };

  }


  var user =
    sfUserObject(
      record
    );


  // ----------------------------------------------------------
  // Already verified
  // ----------------------------------------------------------

  if (
    user.verified
  ) {

    return {

      success:
        true,

      verified:
        true,

      message:
        "Account is already verified.",

      user:
        user

    };

  }


  // ----------------------------------------------------------
  // LOCK CHECK
  // ----------------------------------------------------------

  var lockUntil =
    sfParseDate(
      sfGetUserValue(
        record,
        "OTP LOCK UNTIL"
      )
    );


  if (
    lockUntil &&
    Date.now() <
      lockUntil.getTime()
  ) {

    return {

      success:
        false,

      locked:
        true,

      message:
        "OTP verification is temporarily locked for 30 minutes."

    };

  }


  // ----------------------------------------------------------
  // EXPIRATION
  // ----------------------------------------------------------

  var expires =
    sfParseDate(
      sfGetUserValue(
        record,
        "OTP EXPIRES"
      )
    );


  if (
    !expires ||
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
  // OTP FORMAT
  // ----------------------------------------------------------

  var submitted =
    sfClean(
      data.otp
    );


  if (
    !/^\d{6}$/.test(
      submitted
    )
  ) {

    return {

      success:
        false,

      message:
        "Please enter a valid six-digit verification code."

    };

  }


  var stored =
    sfClean(
      sfGetUserValue(
        record,
        "OTP"
      )
    );


  // ----------------------------------------------------------
  // INVALID OTP
  // ----------------------------------------------------------

  if (
    submitted !==
    stored
  ) {

    var attempts =
      Number(
        sfGetUserValue(
          record,
          "OTP ATTEMPTS"
        )
      ) || 0;


    attempts++;


    sfSetUserValue(
      record,
      "OTP ATTEMPTS",
      attempts
    );


    if (
      attempts >=
      SF_CONFIG.OTP_MAX_ATTEMPTS
    ) {

      var lock =
        sfMinutesFromNow(
          SF_CONFIG.OTP_LOCK_MINUTES
        );


      sfSetUserValue(
        record,
        "OTP LOCK UNTIL",
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
          "Too many incorrect attempts. Your verification is locked for 30 minutes."

      };

    }


    var remaining =
      SF_CONFIG.OTP_MAX_ATTEMPTS -
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
  // OTP CORRECT
  // ==========================================================

  sfSetUserValue(
    record,
    "ACCOUNT_S",
    "VERIFIED"
  );


  sfSetUserValue(
    record,
    "VERIFIED",
    true
  );


  sfSetUserValue(
    record,
    "OTP",
    ""
  );


  sfSetUserValue(
    record,
    "OTP EXPIRES",
    ""
  );


  sfSetUserValue(
    record,
    "OTP ATTEMPTS",
    0
  );


  sfSetUserValue(
    record,
    "OTP LOCK UNTIL",
    ""
  );


  sfSetUserValue(
    record,
    "VERIFIED AT",
    new Date()
  );


  var updatedUser =
    sfUserObject(
      record
    );


  // ----------------------------------------------------------
  // Firebase
  // ----------------------------------------------------------

  try {

    sfFirebaseMarkVerified(
      updatedUser.uid
    );

    sfFirebaseMirrorUser(
      updatedUser
    );

  } catch (firebaseError) {

    console.error(
      "Firebase verification mirror failed:",
      firebaseError
    );

  }


  return {

    success:
      true,

    verified:
      true,

    message:
      "Account verified successfully.",

    user:
      updatedUser

  };

}


// ============================================================
// COMPATIBILITY ALIAS
// ============================================================

function verifyOtp(
  data
) {

  return sfVerifyOtp(
    data
  );

}


// ============================================================
// RESEND OTP
// ============================================================

function sfResendOtp(
  data
) {

  data =
    data || {};


  var identity =
    sfGetOtpIdentity(
      data
    );


  var record =
    sfFindUser(
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


  var user =
    sfUserObject(
      record
    );


  if (
    user.verified
  ) {

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
  // Server-side cooldown
  // ----------------------------------------------------------

  var lastSent =
    sfParseDate(
      sfGetUserValue(
        record,
        "LAST OTP SENT"
      )
    );


  if (
    lastSent
  ) {

    var elapsed =
      Date.now() -
      lastSent.getTime();


    var cooldown =
      SF_CONFIG
        .OTP_RESEND_COOLDOWN_SECONDS *
      1000;


    if (
      elapsed <
      cooldown
    ) {

      var remaining =
        Math.ceil(
          (
            cooldown -
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


  return sfCreateOtp(

    record,

    data.channel ||
    data.otpChannel ||
    "BOTH"

  );

}


// ============================================================
// COMPATIBILITY ALIAS
// ============================================================

function resendOtp(
  data
) {

  return sfResendOtp(
    data
  );

}


// ============================================================
// DATE PARSER
// ============================================================

function sfParseDate(
  value
) {

  if (
    !value
  ) {

    return null;

  }


  if (
    Object.prototype
      .toString
      .call(value) ===
    "[object Date]"
  ) {

    if (
      isNaN(
        value.getTime()
      )
    ) {

      return null;

    }


    return value;

  }


  var parsed =
    new Date(
      value
    );


  if (
    isNaN(
      parsed.getTime()
    )
  ) {

    return null;

  }


  return parsed;

}
