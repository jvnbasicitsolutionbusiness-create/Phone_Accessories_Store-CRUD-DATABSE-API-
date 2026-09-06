// ============================================================
// STOCKFLOW — AUTHENTICATION
// File: auth.gs
// Register / Login / Session / Logout
// ============================================================


// ------------------------------------------------------------
// REGISTER EMPLOYEE
// ------------------------------------------------------------

function register(
  data,
  role
) {

  data =
    sfSafeObject(data);


  const name =
    sfClean(
      data.name ||
      (
        sfClean(data.firstName) +
        " " +
        sfClean(data.lastName)
      )
    );


  const username =
    sfClean(
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
    sfEmail(
      data.gmail ||
      data.email
    );


  const userPhone =
    sfPhone(
      data.phone
    );


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
    !name ||
    !username ||
    !password ||
    !age ||
    !sfValidEmail(gmail) ||
    !sfValidPhone(userPhone)
  ) {

    return {

      success: false,

      message:
        "Complete all required fields using a valid Gmail address and Philippine mobile number."

    };

  }


  if (
    username.length < 4 ||
    username.length > 30
  ) {

    return {

      success: false,

      message:
        "Username must be 4–30 characters."

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
    password.length < 8
  ) {

    return {

      success: false,

      message:
        "Password must be at least 8 characters."

    };

  }


  // ----------------------------------------------------------
  // DUPLICATE CHECK
  // ----------------------------------------------------------

  if (
    sfUsernameExists(username)
  ) {

    return {

      success: false,

      message:
        "Username is already registered."

    };

  }


  if (
    sfEmailExists(gmail)
  ) {

    return {

      success: false,

      message:
        "Email address is already registered."

    };

  }


  if (
    sfPhoneExists(userPhone)
  ) {

    return {

      success: false,

      message:
        "Phone number is already registered."

    };

  }


  // ----------------------------------------------------------
  // CREATE USER
  // ----------------------------------------------------------

  const sheet =
    sfUserSheet();


  const userUid =
    sfUid();


  const now =
    new Date();


  const accountRole =
    role ||
    "Employee";


  sheet.appendRow([

    userUid,

    name,

    username,

    sfHashPassword(
      password
    ),

    age,

    "PENDING",

    gmail,

    userPhone,

    accountRole,

    false,

    "",

    "",

    0,

    "",

    "BOTH",

    now,

    "",

    "",

    ""

  ]);


  const record =
    sfFindUser(username);


  if (!record) {

    return {

      success: false,

      message:
        "Unable to create the account."

    };

  }


  // ----------------------------------------------------------
  // FIREBASE USER MIRROR
  // ----------------------------------------------------------

  sfFirebaseSaveUser({

    uid:
      userUid,

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
      userPhone,

    role:
      accountRole,

    verified:
      false,

    createdAt:
      now.toISOString()

  });


  // ----------------------------------------------------------
  // GENERATE OTP
  // ----------------------------------------------------------

  const otpResult =
    sfCreateOtp(
      record,
      "BOTH"
    );


  return {

    success: true,

    uid:
      userUid,

    username:
      username,

    email:
      gmail,

    gmail:
      gmail,

    phone:
      userPhone,

    role:
      accountRole,

    verified:
      false,

    otpReady:
      true,

    demoOtp:
      otpResult.demoOtp || "",

    message:
      "Registration successful. Your demo verification code is being prepared."

  };

}


// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

function login(data) {

  data =
    sfSafeObject(data);


  const identity =
    data.identity ||
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
        "Invalid username/email or password."

    };

  }


  const row =
    record.values;


  const suppliedPassword =
    String(
      data.password || ""
    );


  const storedPassword =
    String(
      row[3] || ""
    );


  const hashedPassword =
    sfHashPassword(
      suppliedPassword
    );


  const passwordCorrect =
    storedPassword ===
    hashedPassword;


  if (!passwordCorrect) {

    return {

      success: false,

      message:
        "Invalid username/email or password."

    };

  }


  const status =
    sfClean(
      row[5]
    ).toUpperCase();


  const verified =
    row[9] === true ||
    String(
      row[9]
    ).toUpperCase() === "TRUE";


  if (
    status === "SUSPENDED" ||
    status === "DISABLED"
  ) {

    return {

      success: false,

      message:
        "This account is " +
        status.toLowerCase() +
        "."

    };

  }


  // ----------------------------------------------------------
  // NOT VERIFIED
  // ----------------------------------------------------------

  if (!verified) {

    return {

      success: false,

      successCode:
        "UNVERIFIED",

      verified: false,

      identity:
        row[2],

      uid:
        row[0],

      email:
        row[6],

      gmail:
        row[6],

      phone:
        row[7],

      username:
        row[2],

      message:
        "Account is not verified. Please complete OTP verification."

    };

  }


  // ----------------------------------------------------------
  // SESSION
  // ----------------------------------------------------------

  const token =
    Utilities.getUuid() +
    "." +
    Utilities.getUuid();


  const user =
    sfUserObject(
      row
    );


  CacheService
    .getScriptCache()
    .put(
      "session_" + token,

      JSON.stringify(
        user
      ),

      SF_SESSION_TTL_MINUTES *
      60
    );


  record.sheet
    .getRange(
      record.row,
      19
    )
    .setValue(
      new Date()
    );


  return {

    success: true,

    token:

      token,

    user:

      user

  };

}


// ------------------------------------------------------------
// SESSION
// ------------------------------------------------------------

function session(data) {

  const token =
    sfClean(
      data &&
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


  return {

    success: true,

    user:
      JSON.parse(raw)

  };

}


// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

function logout(data) {

  const token =
    sfClean(
      data &&
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

    success: true

  };

}


// ------------------------------------------------------------
// REQUIRE SESSION
// ------------------------------------------------------------

function requireSession(data) {

  const result =
    session(data);


  if (
    !result.success
  ) {

    throw new Error(
      "Unauthorized"
    );

  }


  return result.user;

}
