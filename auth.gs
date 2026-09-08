// ============================================================
// STOCKFLOW — AUTHENTICATION BACKEND
// File: Auth.gs
//
// Handles:
//   - Employee registration
//   - Admin registration
//   - Login
//   - Session
//   - Logout
//   - Forgot password
//   - Recovery OTP
//   - Password reset
// ============================================================


// ============================================================
// REGISTER EMPLOYEE
// ============================================================

function sfRegister(
  data,
  role
) {

  data =
    data || {};


  var name =
    sfClean(
      data.name
    );


  var username =
    sfClean(
      data.username
    );


  var password =
    String(
      data.password ||
      ""
    );


  var age =
    Number(
      data.age
    );


  var gmail =
    sfNormalizeEmail(
      data.gmail ||
      data.email
    );


  var phone =
    sfNormalizePhone(
      data.phone ||
      data.mobile ||
      data.mobileNumber
    );


  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  if (
    !name ||
    !username ||
    !password ||
    !age ||
    !gmail ||
    !phone
  ) {

    return {

      success:
        false,

      message:
        "Please complete all required fields."

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
    !sfValidEmail(
      gmail
    )
  ) {

    return {

      success:
        false,

      message:
        "Please enter a valid Gmail/email address."

    };

  }


  if (
    !sfValidPhone(
      phone
    )
  ) {

    return {

      success:
        false,

      message:
        "Please enter a valid Philippine mobile number."

    };

  }


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


  // ----------------------------------------------------------
  // Duplicate check
  // ----------------------------------------------------------

  if (
    sfFindUser(
      username
    )
  ) {

    return {

      success:
        false,

      message:
        "Username is already registered."

    };

  }


  if (
    sfFindUser(
      gmail
    )
  ) {

    return {

      success:
        false,

      message:
        "Email is already registered."

    };

  }


  if (
    sfFindUser(
      phone
    )
  ) {

    return {

      success:
        false,

      message:
        "Phone number is already registered."

    };

  }


  // ----------------------------------------------------------
  // Create account
  // ----------------------------------------------------------

  var sheet =
    sfGetUserSheet();


  var accountUid =
    sfGenerateUid();


  var now =
    new Date();


  var rowNumber =
    sheet.getLastRow() + 1;


  var values = {

    UID:
      accountUid,

    NAME:
      name,

    USERNAME:
      username,

    PASSWORD:
      sfHashPassword(
        password
      ),

    AGE:
      age,

    ACCOUNT_S:
      "PENDING",

    GMAIL:
      gmail,

    "PHONE NO.":
      phone,

    ROLE:
      role ||
      "Employee",

    VERIFIED:
      false,

    OTP:
      "",

    "OTP EXPIRES":
      "",

    "OTP ATTEMPTS":
      0,

    "OTP LOCK UNTIL":
      "",

    "OTP CHANNEL":
      "BOTH",

    "CREATED AT":
      now,

    "VERIFIED AT":
      "",

    "LAST OTP SENT":
      "",

    "LAST LOGIN":
      ""

  };


  sfWriteUserRow(
    sheet,
    rowNumber,
    values
  );


  var record = {

    sheet:
      sheet,

    row:
      rowNumber

  };


  // ----------------------------------------------------------
  // Create initial OTP
  // ----------------------------------------------------------

  var otpResult;


  try {

    otpResult =
      sfCreateOtp(
        record,
        "BOTH"
      );

  } catch (otpError) {

    // Roll back account if OTP generation fails.

    try {

      sheet.deleteRow(
        rowNumber
      );

    } catch (deleteError) {

      console.error(
        "Registration rollback failed:",
        deleteError
      );

    }


    return {

      success:
        false,

      message:
        "Registration failed while creating the verification code."

    };

  }


  // ----------------------------------------------------------
  // Return registration result
  // ----------------------------------------------------------

  return {

    success:
      true,

    uid:
      accountUid,

    username:
      username,

    name:
      name,

    email:
      gmail,

    gmail:
      gmail,

    phone:
      phone,

    role:
      role ||
      "Employee",

    verified:
      false,

    accountStatus:
      "PENDING",

    otpSent:
      true,

    demoMode:
      SF_CONFIG.DEMO_MODE,

    otp:
      otpResult.otp,

    demoOtp:
      otpResult.demoOtp,

    expiresAt:
      otpResult.expiresAt,

    message:
      "Registration successful. Please verify your account."

  };

}


// ============================================================
// WRITE USER ROW
// ============================================================

function sfWriteUserRow(
  sheet,
  rowNumber,
  values
) {

  var map =
    sfGetHeaderMap(
      sheet
    );


  Object.keys(
    values
  ).forEach(
    function (
      header
    ) {

      var column =
        map[
          header.toUpperCase()
        ];


      if (
        column
      ) {

        sheet
          .getRange(
            rowNumber,
            column
          )
          .setValue(
            values[header]
          );

      }

    }
  );

}


// ============================================================
// ADMIN REGISTRATION
// ============================================================

function sfRegisterAdmin(
  data
) {

  data =
    data || {};


  var suppliedKey =
    sfClean(
      data.adminRegistrationKey
    );


  var storedKey =
    sfScriptProperty(
      "ADMIN_REGISTRATION_KEY"
    );


  if (
    !storedKey ||
    suppliedKey !== storedKey
  ) {

    return {

      success:
        false,

      message:
        "Admin registration is restricted."

    };

  }


  return sfRegister(
    data,
    "Admin"
  );

}


// ============================================================
// LOGIN
// ============================================================

function sfLogin(
  data
) {

  data =
    data || {};


  var identity =
    data.identity ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone;


  var record =
    sfFindUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "Invalid username/email or password."

    };

  }


  var suppliedPassword =
    String(
      data.password ||
      ""
    );


  var storedPassword =
    sfClean(
      sfGetUserValue(
        record,
        "PASSWORD"
      )
    );


  var hashed =
    sfHashPassword(
      suppliedPassword
    );


  var valid =
    storedPassword ===
    hashed;


  // ----------------------------------------------------------
  // Legacy plaintext compatibility
  // ----------------------------------------------------------

  if (
    !valid &&
    storedPassword ===
    suppliedPassword
  ) {

    valid =
      true;

    // Upgrade legacy password to SHA-256.

    sfSetUserValue(
      record,
      "PASSWORD",
      hashed
    );

  }


  if (!valid) {

    return {

      success:
        false,

      message:
        "Invalid username/email or password."

    };

  }


  var status =
    sfClean(
      sfGetUserValue(
        record,
        "ACCOUNT_S"
      )
    ).toUpperCase();


  if (
    status === "DISABLED" ||
    status === "SUSPENDED" ||
    status === "BLOCKED"
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


  var user =
    sfUserObject(
      record
    );


  // ----------------------------------------------------------
  // UNVERIFIED ACCOUNT
  // ----------------------------------------------------------

  if (
    !user.verified
  ) {

    return {

      success:
        false,

      verified:
        false,

      requiresVerification:
        true,

      uid:
        user.uid,

      username:
        user.username,

      email:
        user.gmail,

      gmail:
        user.gmail,

      phone:
        user.phone,

      role:
        user.role,

      message:
        "Account is not verified. Please verify your account first."

    };

  }


  // ----------------------------------------------------------
  // VERIFIED LOGIN
  // ----------------------------------------------------------

  var token =
    sfCreateSession(
      user
    );


  sfRecordLogin(
    record
  );


  return {

    success:
      true,

    verified:
      true,

    token:
      token,

    user:
      user,

    message:
      "Login successful."

  };

}


// ============================================================
// CREATE SESSION
// ============================================================

function sfCreateSession(
  user
) {

  var token =
    Utilities.getUuid() +
    "." +
    Utilities.getUuid();


  var payload = {

    uid:
      user.uid,

    username:
      user.username,

    role:
      user.role,

    name:
      user.name,

    gmail:
      user.gmail,

    phone:
      user.phone

  };


  CacheService
    .getScriptCache()
    .put(

      "stockflow_session_" +
      token,

      JSON.stringify(
        payload
      ),

      SF_CONFIG
        .SESSION_TTL_MINUTES *
      60

    );


  return token;

}


// ============================================================
// SESSION
// ============================================================

function sfSession(
  data
) {

  data =
    data || {};


  var token =
    sfClean(
      data.token
    );


  if (!token) {

    return {

      success:
        false,

      message:
        "Session expired."

    };

  }


  var raw =
    CacheService
      .getScriptCache()
      .get(
        "stockflow_session_" +
        token
      );


  if (!raw) {

    return {

      success:
        false,

      message:
        "Session expired."

    };

  }


  try {

    return {

      success:
        true,

      user:
        JSON.parse(
          raw
        )

    };

  } catch (error) {

    return {

      success:
        false,

      message:
        "Invalid session."

    };

  }

}


// ============================================================
// REQUIRE SESSION
// ============================================================

function sfRequireSession(
  data
) {

  var result =
    sfSession(
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
// LOGOUT
// ============================================================

function sfLogout(
  data
) {

  data =
    data || {};


  var token =
    sfClean(
      data.token
    );


  if (token) {

    CacheService
      .getScriptCache()
      .remove(
        "stockflow_session_" +
        token
      );

  }


  return {

    success:
      true,

    message:
      "Logged out successfully."

  };

}


// ============================================================
// GET USER
// ============================================================

function sfGetUser(
  data
) {

  data =
    data || {};


  var identity =
    data.identity ||
    data.username ||
    data.email ||
    data.gmail ||
    data.phone ||
    data.uid;


  var record =
    sfFindUser(
      identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "User not found."

    };

  }


  return {

    success:
      true,

    user:
      sfUserObject(
        record
      )

  };

}


// ============================================================
// UPDATE STATUS
// ============================================================

function sfUpdateStatus(
  data
) {

  sfRequireSession(
    data
  );


  var record =
    sfFindUser(
      data.username ||
      data.identity
    );


  if (!record) {

    return {

      success:
        false,

      message:
        "User not found."

    };

  }


  var status =
    sfClean(
      data.status
    ).toUpperCase();


  sfSetUserValue(
    record,
    "ACCOUNT_S",
    status
  );


  return {

    success:
      true,

    message:
      "Account status updated."

  };

}


// ============================================================
// LIST USERS
// ============================================================

function sfListUsers(
  data
) {

  sfRequireSession(
    data
  );


  return {

    success:
      true,

    users:
      sfListAllUsers()

  };

}


// ============================================================
// FORGOT PASSWORD
// ============================================================
//
// Demo flow:
//
// forgotPassword
//      ↓
// Find account
//      ↓
// Generate recovery OTP
//      ↓
// Save to Sheets
//      ↓
// Firebase
//      ↓
// Return demoOtp
//      ↓
// recovery.html
// ============================================================

function sfForgotPassword(
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


  // ----------------------------------------------------------
  // Do not expose whether account exists in production.
  // For this midterm demo, the response includes demoOtp only
  // when an account actually exists.
  // ----------------------------------------------------------

  if (!record) {

    return {

      success:
        false,

      code:
        "ACCOUNT_NOT_FOUND",

      message:
        "No registered account was found."

    };

  }


  var user =
    sfUserObject(
      record
    );


  var result =
    sfCreateOtp(
      record,
      data.channel ||
      "BOTH"
    );


  return {

    success:
      true,

    uid:
      user.uid,

    username:
      user.username,

    email:
      user.gmail,

    gmail:
      user.gmail,

    phone:
      user.phone,

    channel:
      result.channel,

    expiresAt:
      result.expiresAt,

    demoMode:
      SF_CONFIG.DEMO_MODE,

    otp:
      result.otp,

    demoOtp:
      result.demoOtp,

    message:
      "Recovery code prepared."

  };

}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================
//
// This verifies the code but DOES NOT mark the account itself
// as newly registered. It simply confirms the recovery request.
// ============================================================

function sfVerifyRecoveryOtp(
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


  var expires =
    sfParseDate(
      sfGetUserValue(
        record,
        "OTP EXPIRES"
      )
    );


  var storedOtp =
    sfClean(
      sfGetUserValue(
        record,
        "OTP"
      )
    );


  var submittedOtp =
    sfClean(
      data.otp
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
        "Recovery code has expired."

    };

  }


  if (
    submittedOtp !==
    storedOtp
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

      sfSetUserValue(

        record,

        "OTP LOCK UNTIL",

        sfMinutesFromNow(
          SF_CONFIG.OTP_LOCK_MINUTES
        )

      );


      return {

        success:
          false,

        locked:
          true,

        message:
          "Too many incorrect recovery attempts. Try again later."

      };

    }


    return {

      success:
        false,

      remainingAttempts:
        SF_CONFIG.OTP_MAX_ATTEMPTS -
        attempts,

      message:
        "Invalid recovery code."

    };

  }


  // ----------------------------------------------------------
  // Correct recovery OTP
  // ----------------------------------------------------------

  return {

    success:
      true,

    verified:
      true,

    recoveryVerified:
      true,

    uid:
      sfGetUserValue(
        record,
        "UID"
      ),

    username:
      sfGetUserValue(
        record,
        "USERNAME"
      ),

    message:
      "Recovery code verified."

  };

}


// ============================================================
// RESET PASSWORD
// ============================================================

function sfResetPassword(
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
        "Unable to reset password."

    };

  }


  var submittedOtp =
    sfClean(
      data.otp
    );


  var storedOtp =
    sfClean(
      sfGetUserValue(
        record,
        "OTP"
      )
    );


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

      message:
        "Recovery code has expired."

    };

  }


  if (
    !submittedOtp ||
    submittedOtp !==
    storedOtp
  ) {

    return {

      success:
        false,

      message:
        "Invalid recovery code."

    };

  }


  var newPassword =
    String(
      data.newPassword ||
      ""
    );


  if (
    newPassword.length < 8
  ) {

    return {

      success:
        false,

      message:
        "Password must be at least 8 characters."

    };

  }


  var confirmPassword =
    String(
      data.confirmPassword ||
      data.confirmNewPassword ||
      ""
    );


  if (
    confirmPassword &&
    confirmPassword !==
    newPassword
  ) {

    return {

      success:
        false,

      message:
        "Passwords do not match."

    };

  }


  sfSetUserValue(
    record,
    "PASSWORD",
    sfHashPassword(
      newPassword
    )
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


  try {

    sfFirebasePatch(

      "otp/" +
      sfGetUserValue(
        record,
        "UID"
      ),

      {

        otp:
          null,

        otpExpires:
          null,

        recoveryCompleted:
          true,

        updatedAt:
          new Date()
            .toISOString()

      }

    );

  } catch (firebaseError) {

    console.error(
      "Firebase recovery cleanup failed:",
      firebaseError
    );

  }


  return {

    success:
      true,

    message:
      "Password reset successfully. You can now sign in."

  };

}
