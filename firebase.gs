// ============================================================
// STOCKFLOW — FIREBASE REALTIME DATABASE
// File: firebase.gs
//
// Google Apps Script -> Firebase Realtime Database
//
// MIDTERM / DEMO VERSION
// ------------------------------------------------------------
// Google Sheets = PRIMARY DATABASE
// Firebase      = MIRROR / SECONDARY DATABASE
//
// Stores:
//   /users/{UID}
//   /otp/{UID}
//
// IMPORTANT:
// - Passwords are NEVER stored in Firebase.
// - Firebase failures do NOT stop registration.
// - Firebase errors are logged clearly.
// - Uses the same getProperty() function from Code.gs.
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SF_FIREBASE_DEFAULT_URL =
  "https://midtermexamproject-default-rtdb.firebaseio.com/";


// ============================================================
// GET FIREBASE DATABASE URL
// ============================================================

function sfFirebaseUrl() {

  let url = "";

  try {

    if (
      typeof getProperty === "function"
    ) {

      url =
        getProperty(
          "FIREBASE_DATABASE_URL"
        );

    }

  } catch (error) {

    console.error(
      "Unable to read FIREBASE_DATABASE_URL:",
      error
    );

  }


  if (!url) {

    url =
      SF_FIREBASE_DEFAULT_URL;

  }


  return String(url)
    .trim()
    .replace(/\/+$/, "");

}


// ============================================================
// GET FIREBASE AUTH TOKEN
// ============================================================
//
// Optional.
//
// For a midterm/demo project, this can remain empty IF your
// Firebase Realtime Database rules allow the Apps Script
// request to write.
//
// If your rules require authentication, put the appropriate
// credential in Script Properties as:
//
// FIREBASE_DATABASE_SECRET
//
// ============================================================

function sfFirebaseToken() {

  try {

    if (
      typeof getProperty === "function"
    ) {

      return String(
        getProperty(
          "FIREBASE_DATABASE_SECRET"
        ) || ""
      ).trim();

    }

  } catch (error) {

    console.error(
      "Unable to read Firebase authentication token:",
      error
    );

  }


  return "";

}


// ============================================================
// FIREBASE ENDPOINT
// ============================================================

function sfFirebaseEndpoint(
  path
) {

  let cleanPath =
    String(
      path || ""
    )
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");


  let url =
    sfFirebaseUrl();


  if (cleanPath) {

    url +=
      "/" +
      cleanPath;

  }


  // Firebase REST API requires .json
  url +=
    ".json";


  const token =
    sfFirebaseToken();


  if (token) {

    url +=
      "?auth=" +
      encodeURIComponent(
        token
      );

  }


  return url;

}


// ============================================================
// FIREBASE ERROR MESSAGE
// ============================================================

function sfErrorMessage(
  error
) {

  if (!error) {

    return "Unknown Firebase error.";

  }


  if (
    error.message
  ) {

    return String(
      error.message
    );

  }


  return String(
    error
  );

}


// ============================================================
// PARSE FIREBASE RESPONSE
// ============================================================

function sfFirebaseResponseData(
  response
) {

  if (!response) {

    return null;

  }


  const text =
    response
      .getContentText();


  if (!text) {

    return null;

  }


  try {

    return JSON.parse(
      text
    );

  } catch (error) {

    return text;

  }

}


// ============================================================
// FIREBASE PUT
// ============================================================
//
// PUT creates or completely replaces the specified node.
//
// Example:
//
// /users/sf_123
//
// ============================================================

function sfFirebasePut(
  path,
  data
) {

  const url =
    sfFirebaseEndpoint(
      path
    );


  try {

    const response =
      UrlFetchApp.fetch(
        url,
        {
          method:
            "put",

          contentType:
            "application/json",

          payload:
            JSON.stringify(
              data
            ),

          muteHttpExceptions:
            true,

          followRedirects:
            true
        }
      );


    const status =
      response.getResponseCode();


    const responseText =
      response.getContentText();


    console.log(
      "Firebase PUT",
      path,
      "HTTP",
      status,
      responseText
    );


    if (
      status < 200 ||
      status >= 300
    ) {

      return {

        success:
          false,

        status:
          status,

        path:
          path,

        message:
          "Firebase PUT failed. HTTP " +
          status,

        response:
          responseText

      };

    }


    return {

      success:
        true,

      status:
        status,

      path:
        path,

      data:
        sfFirebaseResponseData(
          response
        )

    };

  } catch (error) {

    console.error(
      "Firebase PUT exception:",
      error
    );


    return {

      success:
        false,

      status:
        0,

      path:
        path,

      message:
        sfErrorMessage(
          error
        )

    };

  }

}


// ============================================================
// FIREBASE PATCH
// ============================================================
//
// PATCH updates only the specified properties.
//
// ============================================================

function sfFirebasePatch(
  path,
  data
) {

  const url =
    sfFirebaseEndpoint(
      path
    );


  try {

    const response =
      UrlFetchApp.fetch(
        url,
        {
          method:
            "patch",

          contentType:
            "application/json",

          payload:
            JSON.stringify(
              data
            ),

          muteHttpExceptions:
            true,

          followRedirects:
            true
        }
      );


    const status =
      response.getResponseCode();


    const responseText =
      response.getContentText();


    console.log(
      "Firebase PATCH",
      path,
      "HTTP",
      status,
      responseText
    );


    if (
      status < 200 ||
      status >= 300
    ) {

      return {

        success:
          false,

        status:
          status,

        path:
          path,

        message:
          "Firebase PATCH failed. HTTP " +
          status,

        response:
          responseText

      };

    }


    return {

      success:
        true,

      status:
        status,

      path:
        path,

      data:
        sfFirebaseResponseData(
          response
        )

    };

  } catch (error) {

    console.error(
      "Firebase PATCH exception:",
      error
    );


    return {

      success:
        false,

      status:
        0,

      path:
        path,

      message:
        sfErrorMessage(
          error
        )

    };

  }

}


// ============================================================
// FIREBASE GET
// ============================================================
//
// Useful for testing the connection.
//
// ============================================================

function sfFirebaseGet(
  path
) {

  const url =
    sfFirebaseEndpoint(
      path
    );


  try {

    const response =
      UrlFetchApp.fetch(
        url,
        {
          method:
            "get",

          muteHttpExceptions:
            true,

          followRedirects:
            true
        }
      );


    const status =
      response.getResponseCode();


    const responseText =
      response.getContentText();


    console.log(
      "Firebase GET",
      path,
      "HTTP",
      status,
      responseText
    );


    if (
      status < 200 ||
      status >= 300
    ) {

      return {

        success:
          false,

        status:
          status,

        path:
          path,

        message:
          "Firebase GET failed. HTTP " +
          status,

        response:
          responseText

      };

    }


    return {

      success:
        true,

      status:
        status,

      path:
        path,

      data:
        sfFirebaseResponseData(
          response
        )

    };

  } catch (error) {

    console.error(
      "Firebase GET exception:",
      error
    );


    return {

      success:
        false,

      status:
        0,

      path:
        path,

      message:
        sfErrorMessage(
          error
        )

    };

  }

}


// ============================================================
// SAVE USER TO FIREBASE
// ============================================================
//
// Firebase:
//
// /users/{UID}
//
// IMPORTANT:
// Password is intentionally NOT included.
//
// ============================================================

function sfFirebaseSaveUser(
  user
) {

  if (
    !user ||
    !user.uid
  ) {

    return {

      success:
        false,

      message:
        "Missing Firebase user UID."

    };

  }


  const uid =
    String(
      user.uid
    )
      .trim();


  const firebaseUser = {

    uid:
      uid,

    id:
      user.id ||
      "",

    name:
      user.name ||
      "",

    username:
      user.username ||
      "",

    age:
      user.age ||
      "",

    accountStatus:
      user.accountStatus ||
      "PENDING",

    gmail:
      user.gmail ||
      user.email ||
      "",

    phone:
      user.phone ||
      "",

    role:
      user.role ||
      "Employee",

    verified:
      user.verified === true,

    createdAt:
      user.createdAt ||
      new Date().toISOString()

  };


  return sfFirebasePut(
    "users/" +
    encodeURIComponent(uid),
    firebaseUser
  );

}


// ============================================================
// SAVE OTP TO FIREBASE
// ============================================================
//
// Firebase:
//
// /otp/{UID}
//
// ============================================================

function sfFirebaseSaveOtp(
  user
) {

  if (
    !user ||
    !user.uid
  ) {

    return {

      success:
        false,

      message:
        "Missing Firebase OTP UID."

    };

  }


  const uid =
    String(
      user.uid
    )
      .trim();


  const otpData = {

    uid:
      uid,

    username:
      user.username ||
      "",

    gmail:
      user.gmail ||
      user.email ||
      "",

    phone:
      user.phone ||
      "",

    otp:
      user.otp ||
      "",

    otpExpires:
      user.otpExpires ||
      "",

    attempts:
      Number(
        user.attempts ||
        0
      ),

    channel:
      user.channel ||
      "both",

    createdAt:
      new Date()
        .toISOString()

  };


  return sfFirebasePut(
    "otp/" +
    encodeURIComponent(uid),
    otpData
  );

}


// ============================================================
// MARK USER VERIFIED
// ============================================================

function sfFirebaseMarkVerified(
  uid
) {

  if (!uid) {

    return {

      success:
        false,

      message:
        "Missing UID."

    };

  }


  const cleanUid =
    String(
      uid
    )
      .trim();


  return sfFirebasePatch(

    "users/" +
    encodeURIComponent(
      cleanUid
    ),

    {

      verified:
        true,

      accountStatus:
        "VERIFIED",

      verifiedAt:
        new Date()
          .toISOString()

    }

  );

}


// ============================================================
// DELETE OTP FROM FIREBASE
// ============================================================
//
// Used after successful OTP verification.
//
// ============================================================

function sfFirebaseDeleteOtp(
  uid
) {

  if (!uid) {

    return {

      success:
        false,

      message:
        "Missing UID."

    };

  }


  const url =
    sfFirebaseEndpoint(
      "otp/" +
      encodeURIComponent(
        String(uid)
      )
    );


  try {

    const response =
      UrlFetchApp.fetch(
        url,
        {
          method:
            "delete",

          muteHttpExceptions:
            true,

          followRedirects:
            true
        }
      );


    const status =
      response.getResponseCode();


    const responseText =
      response.getContentText();


    console.log(
      "Firebase DELETE OTP",
      uid,
      "HTTP",
      status,
      responseText
    );


    if (
      status < 200 ||
      status >= 300
    ) {

      return {

        success:
          false,

        status:
          status,

        message:
          "Firebase OTP delete failed. HTTP " +
          status,

        response:
          responseText

      };

    }


    return {

      success:
        true,

      status:
        status

    };

  } catch (error) {

    console.error(
      "Firebase DELETE OTP exception:",
      error
    );


    return {

      success:
        false,

      status:
        0,

      message:
        sfErrorMessage(
          error
        )

    };

  }

}


// ============================================================
// FIREBASE CONNECTION TEST
// ============================================================
//
// You can run:
//
// testFirebaseConnection()
//
// from Apps Script.
//
// ============================================================

function testFirebaseConnection() {

  console.log(
    "=========================================="
  );

  console.log(
    "STOCKFLOW FIREBASE CONNECTION TEST"
  );

  console.log(
    "=========================================="
  );


  console.log(
    "Firebase URL:",
    sfFirebaseUrl()
  );


  const result =
    sfFirebaseGet(
      ""
    );


  console.log(
    "Firebase result:",
    JSON.stringify(
      result
    )
  );


  return result;

}


// ============================================================
// FIREBASE WRITE TEST
// ============================================================
//
// You can run:
//
// testFirebaseWrite()
//
// from Apps Script.
//
// This creates:
//
// /stockflow_test
//
// ============================================================

function testFirebaseWrite() {

  const testData = {

    system:
      "STOCKFLOW",

    test:
      true,

    message:
      "Firebase connection test successful.",

    timestamp:
      new Date()
        .toISOString()

  };


  const result =
    sfFirebasePut(
      "stockflow_test",
      testData
    );


  console.log(
    "Firebase write test:",
    JSON.stringify(
      result
    )
  );


  return result;

}


// ============================================================
// END OF firebase.gs
// ============================================================
