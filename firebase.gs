// ============================================================
// STOCKFLOW — FIREBASE REALTIME DATABASE
// File: firebase.gs
// ============================================================

const SF_FIREBASE_DEFAULT_URL =
  "https://midtermexamproject-default-rtdb.firebaseio.com/";


// ------------------------------------------------------------
// FIREBASE URL
// ------------------------------------------------------------

function sfFirebaseUrl() {

  return (
    sfProp("FIREBASE_DATABASE_URL") ||
    SF_FIREBASE_DEFAULT_URL
  ).replace(/\/+$/, "");

}


// ------------------------------------------------------------
// FIREBASE TOKEN
// ------------------------------------------------------------

function sfFirebaseToken() {

  return sfProp(
    "FIREBASE_DATABASE_SECRET"
  );

}


// ------------------------------------------------------------
// BUILD URL
// ------------------------------------------------------------

function sfFirebaseEndpoint(
  path
) {

  let url =
    sfFirebaseUrl() +
    "/" +
    String(path)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "") +
    ".json";

  const token =
    sfFirebaseToken();

  if (token) {

    url +=
      "?auth=" +
      encodeURIComponent(token);

  }

  return url;

}


// ------------------------------------------------------------
// WRITE TO FIREBASE
// ------------------------------------------------------------

function sfFirebasePut(
  path,
  data
) {

  try {

    const response =
      UrlFetchApp.fetch(
        sfFirebaseEndpoint(path),
        {
          method: "put",

          contentType:
            "application/json",

          payload:
            JSON.stringify(data),

          muteHttpExceptions:
            true
        }
      );

    const status =
      response.getResponseCode();

    if (
      status < 200 ||
      status >= 300
    ) {

      throw new Error(
        "Firebase write failed. HTTP " +
        status
      );

    }

    return {

      success: true

    };

  } catch (error) {

    console.error(
      "Firebase PUT error:",
      error
    );

    return {

      success: false,

      message:
        sfErrorMessage(error)

    };

  }

}


// ------------------------------------------------------------
// PATCH FIREBASE
// ------------------------------------------------------------

function sfFirebasePatch(
  path,
  data
) {

  try {

    const response =
      UrlFetchApp.fetch(
        sfFirebaseEndpoint(path),
        {
          method: "patch",

          contentType:
            "application/json",

          payload:
            JSON.stringify(data),

          muteHttpExceptions:
            true
        }
      );

    const status =
      response.getResponseCode();

    if (
      status < 200 ||
      status >= 300
    ) {

      throw new Error(
        "Firebase update failed. HTTP " +
        status
      );

    }

    return {

      success: true

    };

  } catch (error) {

    console.error(
      "Firebase PATCH error:",
      error
    );

    return {

      success: false,

      message:
        sfErrorMessage(error)

    };

  }

}


// ------------------------------------------------------------
// OTP MIRROR
// ------------------------------------------------------------

function sfFirebaseSaveOtp(
  user
) {

  if (!user || !user.uid) {

    return {
      success: false,
      message: "Missing user UID."
    };

  }

  return sfFirebasePut(
    "otp/" + user.uid,
    {

      uid:
        user.uid,

      username:
        user.username || "",

      gmail:
        user.gmail || "",

      phone:
        user.phone || "",

      otp:
        user.otp || "",

      otpExpires:
        user.otpExpires || "",

      attempts:
        Number(
          user.attempts || 0
        ),

      channel:
        user.channel || "BOTH",

      createdAt:
        new Date().toISOString()

    }
  );

}


// ------------------------------------------------------------
// USER MIRROR
// ------------------------------------------------------------

function sfFirebaseSaveUser(
  user
) {

  if (!user || !user.uid) {

    return {
      success: false,
      message: "Missing user UID."
    };

  }

  return sfFirebasePut(
    "users/" + user.uid,
    user
  );

}


// ------------------------------------------------------------
// OTP VERIFIED
// ------------------------------------------------------------

function sfFirebaseMarkVerified(
  uid
) {

  if (!uid) {
    return;
  }

  return sfFirebasePatch(
    "users/" + uid,
    {

      verified: true,

      verifiedAt:
        new Date().toISOString()

    }
  );

}
