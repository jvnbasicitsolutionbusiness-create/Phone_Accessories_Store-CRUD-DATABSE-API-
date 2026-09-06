// ============================================================
// STOCKFLOW — OTP BACKEND
// File: otp.gs
//
// Demo / Midterm OTP implementation.
//
// No Gmail.
// No SMS.
// No Twilio.
//
// The generated OTP is stored in Google Sheets and Firebase.
// DEMO_MODE allows the OTP to be returned to the browser so
// the verification page can automatically display it.
// ============================================================


// ------------------------------------------------------------
// CREATE OTP
// ------------------------------------------------------------

function sfCreateOtp(
  userRecord,
  channel
) {

  const code =
    sfGenerateOtp();

  const expires =
    sfMinutesFromNow(
      SF_OTP_EXPIRY_MINUTES
    );

  const normalizedChannel =
    String(
      channel || "BOTH"
    ).toUpperCase();


  userRecord.sheet
    .getRange(
      userRecord.row,
      11
    )
    .setValue(code);


  userRecord.sheet
    .getRange(
      userRecord.row,
      12
    )
    .setValue(expires);


  userRecord.sheet
    .getRange(
      userRecord.row,
      13
    )
    .setValue(0);


  userRecord.sheet
    .getRange(
      userRecord.row,
      14
    )
    .clearContent();


  userRecord.sheet
    .getRange(
      userRecord.row,
      15
    )
    .setValue(
      normalizedChannel
    );


  userRecord.sheet
    .getRange(
      userRecord.row,
      18
    )
    .setValue(
      new Date()
    );


  const values =
    userRecord.sheet
      .getRange(
        userRecord.row,
        1,
        1,
        SF_USER_HEADERS.length
      )
      .getValues()[0];


  // ----------------------------------------------------------
  // Firebase mirror
  // ----------------------------------------------------------

  sfFirebaseSaveOtp({

    uid:
      values[0],

    username:
      values[2],

    gmail:
      values[6],

    phone:
      values[7],

    otp:
      code,

    otpExpires:
      expires.toISOString(),

    attempts:
      0,

    channel:
      normalizedChannel

  });


  const result = {

    success: true,

    uid:
      values[0],

    username:
      values[2],

    email:
      values[6],

    gmail:
      values[6],

    phone:
      values[7],

    channel:
      normalizedChannel,

    expiresAt:
      expires.toISOString(),

    message:
      "Verification code prepared."

  };


  // ----------------------------------------------------------
  // MIDTERM DEMO ONLY
  // ----------------------------------------------------------

  if (sfDemoMode()) {

    result.demoOtp =
      code;

  }


  return result;

}


// ------------------------------------------------------------
// VERIFY OTP
// ------------------------------------------------------------

function verifyOtp(data) {

  const identity =
    data.identity ||
    data.uid ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone;


  const record =
    sfFindUser(identity);


  if (!record) {

    return {

      success: false,

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
    String(row[9]).toUpperCase() === "TRUE";


  if (verified) {

    return {

      success: true,

      verified: true,

      message:
        "Account is already verified.",

      user:
        sfUserObject(row)

    };

  }


  // ----------------------------------------------------------
  // Lock check
  // ----------------------------------------------------------

  const lockUntil =
    row[13]
      ? new Date(row[13])
      : null;


  if (
    lockUntil &&
    !isNaN(lockUntil) &&
    Date.now() <
      lockUntil.getTime()
  ) {

    return {

      success: false,

      locked: true,

      message:
        "OTP verification is temporarily locked. Please try again later."

    };

  }


  // ----------------------------------------------------------
  // OTP expiration
  // ----------------------------------------------------------

  const expires =
    row[11]
      ? new Date(row[11])
      : null;


  if (
    !expires ||
    isNaN(expires) ||
    Date.now() >
      expires.getTime()
  ) {

    return {

      success: false,

      expired: true,

      message:
        "This verification code has expired. Please request a new code."

    };

  }


  const submittedOtp =
    sfClean(data.otp);


  const storedOtp =
    sfClean(row[10]);


  // ----------------------------------------------------------
  // INVALID OTP
  // ----------------------------------------------------------

  if (
    submittedOtp !==
    storedOtp
  ) {

    let attempts =
      Number(row[12]) || 0;

    attempts++;


    record.sheet
      .getRange(
        record.row,
        13
      )
      .setValue(attempts);


    if (
      attempts >=
      SF_MAX_OTP_ATTEMPTS
    ) {

      const lock =
        sfMinutesFromNow(
          SF_OTP_LOCK_MINUTES
        );


      record.sheet
        .getRange(
          record.row,
          14
        )
        .setValue(lock);


      return {

        success: false,

        locked: true,

        remainingAttempts: 0,

        message:
          "Too many incorrect attempts. Your verification is temporarily locked for 30 minutes."

      };

    }


    return {

      success: false,

      remainingAttempts:
        SF_MAX_OTP_ATTEMPTS -
        attempts,

      message:
        "Invalid verification code. " +
        (
          SF_MAX_OTP_ATTEMPTS -
          attempts
        ) +
        " attempt(s) remaining."

    };

  }


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  record.sheet
    .getRange(
      record.row,
      6
    )
    .setValue(
      "VERIFIED"
    );


  record.sheet
    .getRange(
      record.row,
      10
    )
    .setValue(
      true
    );


  // Remove OTP after successful verification

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
    .setValue(0);


  record.sheet
    .getRange(
      record.row,
      14
    )
    .clearContent();


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

  sfFirebaseMarkVerified(
    row[0]
  );


  // Remove OTP mirror

  sfFirebasePatch(
    "otp/" + row[0],
    {

      otp: null,

      verified: true,

      verifiedAt:
        new Date().toISOString()

    }
  );


  return {

    success: true,

    verified: true,

    message:
      "Account verified successfully.",

    user:
      sfUserObject(
        record.sheet
          .getRange(
            record.row,
            1,
            1,
            SF_USER_HEADERS.length
          )
          .getValues()[0]
      )

  };

}


// ------------------------------------------------------------
// RESEND OTP
// ------------------------------------------------------------

function resendOtp(data) {

  const identity =
    data.identity ||
    data.uid ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone;


  const record =
    sfFindUser(identity);


  if (!record) {

    return {

      success: false,

      message:
        "Account not found."

    };

  }


  const row =
    record.values;


  const verified =
    row[9] === true ||
    String(row[9]).toUpperCase() === "TRUE";


  if (verified) {

    return {

      success: false,

      message:
        "This account is already verified."

    };

  }


  // ----------------------------------------------------------
  // RESEND COOLDOWN
  // ----------------------------------------------------------

  const lastSent =
    row[17]
      ? new Date(row[17])
      : null;


  if (
    lastSent &&
    !isNaN(lastSent)
  ) {

    const elapsed =
      Date.now() -
      lastSent.getTime();


    if (
      elapsed <
      SF_RESEND_COOLDOWN_SECONDS *
      1000
    ) {

      const remaining =
        Math.ceil(
          (
            SF_RESEND_COOLDOWN_SECONDS *
            1000 -
            elapsed
          ) / 1000
        );


      return {

        success: false,

        cooldown: true,

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
