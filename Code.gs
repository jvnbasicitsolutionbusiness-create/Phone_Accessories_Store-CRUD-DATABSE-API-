// ============================================================
// STOCKFLOW GOOGLE APPS SCRIPT BACKEND
// ============================================================
// This script:
// 1. Saves registrations to Google Sheets.
// 2. Generates and emails the REAL OTP.
// 3. Keeps the real OTP server-side.
// 4. Accepts 123456 ONLY as a DEMO verification.
// 5. Handles real verification, resend, login and recovery.
// ============================================================

const SPREADSHEET_ID =
  "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";

const SHEET_NAME = "StockFlowUsers";
const OTP_MINUTES = 10;
const DEMO_OTP = "123456";
const APP_NAME = "StockFlow";

const HEADERS = [
  "UID",
  "Full Name",
  "Username",
  "Age",
  "Gmail",
  "Phone",
  "Password",
  "Role",
  "Account Status",
  "Verified",
  "Demo",
  "OTP",
  "OTP Expires",
  "Created At",
  "Verified At"
];

function doGet() {
  return json_({
    success: true,
    service: APP_NAME,
    message: "StockFlow Apps Script API is running."
  });
}

function doPost(e) {
  try {
    const raw =
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : "{}";

    const data = JSON.parse(raw);
    const action = String(data.action || "").trim();

    switch (action) {
      case "register":
        return json_(registerUser_(data));

      case "verifyOtp":
        return json_(verifyOtp_(data));

      case "requestOtp":
        return json_(requestOtp_(data));

      case "updateOtp":
        return json_(requestOtp_(data));

      case "login":
        return json_(login_(data));

      case "forgotPassword":
        return json_(forgotPassword_(data));

      default:
        return json_({
          success: false,
          message: "Unknown action."
        });
    }
  } catch (err) {
    console.error(err);

    return json_({
      success: false,
      message: err && err.message
        ? err.message
        : "Server error."
    });
  }
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const current = sheet
    .getRange(1, 1, 1, HEADERS.length)
    .getValues()[0];

  let needsHeaders = false;

  for (let i = 0; i < HEADERS.length; i++) {
    if (current[i] !== HEADERS[i]) {
      needsHeaders = true;
      break;
    }
  }

  if (needsHeaders) {
    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS]);
    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold");
  }
}

function rows_(sheet) {
  const last = sheet.getLastRow();

  if (last < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, last - 1, HEADERS.length)
    .getValues();
}

function normalize_(value) {
  return String(value == null ? "" : value).trim();
}

function findUserRow_(identity) {
  const sheet = getSheet_();
  const rows = rows_(sheet);
  const target = normalize_(identity).toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const uid = normalize_(row[0]).toLowerCase();
    const username = normalize_(row[2]).toLowerCase();
    const gmail = normalize_(row[4]).toLowerCase();

    if (
      target === uid ||
      target === username ||
      target === gmail
    ) {
      return {
        sheet: sheet,
        rowNumber: i + 2,
        values: row
      };
    }
  }

  return null;
}

function generateOtp_() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}

function sendOtpEmail_(email, fullName, otp, isResend) {
  if (!email) {
    throw new Error("Registered Gmail address is missing.");
  }

  const subject = isResend
    ? "StockFlow - Your new verification code"
    : "StockFlow - Verify your account";

  const plain =
    "Hello " + (fullName || "StockFlow User") + ",\n\n" +
    "Your StockFlow verification code is: " + otp + "\n\n" +
    "This code expires in " + OTP_MINUTES + " minutes.\n\n" +
    "If you did not request this code, you can ignore this email.\n\n" +
    "StockFlow";

  const html =
    "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto\">" +
      "<h2 style=\"color:#1769e0\">StockFlow</h2>" +
      "<p>Hello " + escapeHtml_(fullName || "StockFlow User") + ",</p>" +
      "<p>Your verification code is:</p>" +
      "<div style=\"font-size:32px;font-weight:800;letter-spacing:8px;" +
        "padding:18px;background:#f1f5f9;border-radius:12px;" +
        "text-align:center;color:#10233f\">" +
        otp +
      "</div>" +
      "<p>This code expires in <b>" + OTP_MINUTES + " minutes</b>.</p>" +
      "<p style=\"color:#64748b;font-size:13px\">" +
        "If you did not request this code, you can ignore this email." +
      "</p>" +
      "<p>— StockFlow</p>" +
    "</div>";

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: plain,
    htmlBody: html,
    name: "StockFlow"
  });
}

function registerUser_(data) {
  const uid = normalize_(data.uid);
  const fullName = normalize_(data.name);
  const username = normalize_(data.username);
  const email = normalize_(data.gmail);
  const phone = normalize_(data.phone);
  const age = Number(data.age);
  const password = String(data.password || "");

  if (!uid || !fullName || !username || !email || !phone || !password) {
    return {
      success: false,
      message: "Missing required registration fields."
    };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return {
      success: false,
      message: "Invalid Gmail/email address."
    };
  }

  const existing = findUserRow_(username);

  if (existing) {
    return {
      success: false,
      message: "Username is already registered."
    };
  }

  const existingEmail = findUserRow_(email);

  if (existingEmail) {
    return {
      success: false,
      message: "Email is already registered."
    };
  }

  const sheet = getSheet_();
  const otp = generateOtp_();
  const expires = new Date(
    Date.now() + OTP_MINUTES * 60 * 1000
  );

  const now = new Date();

  sheet.appendRow([
    uid,
    fullName,
    username,
    age,
    email,
    phone,
    password,
    "Employee",
    "Pending Verification",
    false,
    false,
    otp,
    expires,
    now,
    ""
  ]);

  try {
    sendOtpEmail_(email, fullName, otp, false);
  } catch (mailError) {
    // Remove the row if the email could not be sent.
    sheet.deleteRow(sheet.getLastRow());

    throw new Error(
      "Registration was not completed because the verification email could not be sent. " +
      mailError.message
    );
  }

  return {
    success: true,
    uid: uid,
    otpSent: true,
    demoOtp: DEMO_OTP,
    message:
      "Registration saved. A real OTP was sent to the registered Gmail."
  };
}

function verifyOtp_(data) {
  const identity = normalize_(data.identity);
  const otp = normalize_(data.otp);

  if (!identity || !otp) {
    return {
      success: false,
      message: "Verification information is incomplete."
    };
  }

  const found = findUserRow_(identity);

  if (!found) {
    return {
      success: false,
      message: "Account was not found."
    };
  }

  const row = found.values;

  const storedOtp = normalize_(row[11]);
  const expires = row[12]
    ? new Date(row[12])
    : null;

  // ----------------------------------------------------------
  // DEMO VERIFICATION
  // ----------------------------------------------------------
  // 123456 NEVER changes the account to Verified/Active.
  // It only permits DEMO dashboard access.
  // ----------------------------------------------------------

  if (otp === DEMO_OTP) {
    found.sheet
      .getRange(found.rowNumber, 9, 1, 7)
      .setValues([[
        "Demo",
        false,
        true,
        storedOtp,
        expires,
        row[13] || new Date(),
        ""
      ]]);

    return {
      success: true,
      demo: true,
      verified: false,
      accountStatus: "Demo",
      message:
        "Demo access granted. Use the real emailed OTP to fully verify the account."
    };
  }

  // ----------------------------------------------------------
  // REAL VERIFICATION
  // ----------------------------------------------------------

  if (!storedOtp || otp !== storedOtp) {
    return {
      success: false,
      message: "Incorrect verification code."
    };
  }

  if (expires && Date.now() > expires.getTime()) {
    return {
      success: false,
      message: "This verification code has expired. Request a new one."
    };
  }

  found.sheet
    .getRange(found.rowNumber, 9, 1, 7)
    .setValues([[
      "Active",
      true,
      false,
      "",
      "",
      row[13] || new Date(),
      new Date()
    ]]);

  return {
    success: true,
    demo: false,
    verified: true,
    accountStatus: "Active",
    message: "Account verified successfully."
  };
}

function requestOtp_(data) {
  const identity = normalize_(data.identity);

  if (!identity) {
    return {
      success: false,
      message: "Account identity is required."
    };
  }

  const found = findUserRow_(identity);

  if (!found) {
    return {
      success: false,
      message: "Account was not found."
    };
  }

  const row = found.values;
  const otp = generateOtp_();
  const expires = new Date(
    Date.now() + OTP_MINUTES * 60 * 1000
  );

  found.sheet
    .getRange(found.rowNumber, 9, 1, 5)
    .setValues([[
      "Pending Verification",
      false,
      false,
      otp,
      expires
    ]]);

  sendOtpEmail_(
    normalize_(row[4]),
    normalize_(row[1]),
    otp,
    true
  );

  return {
    success: true,
    otpSent: true,
    demoOtp: DEMO_OTP,
    message:
      "A new real OTP was sent to the registered Gmail."
  };
}

function login_(data) {
  const identity = normalize_(data.identity).toLowerCase();
  const password = String(data.password || "");

  if (!identity || !password) {
    return {
      success: false,
      message: "Username/email and password are required."
    };
  }

  const found = findUserRow_(identity);

  if (!found) {
    return {
      success: false,
      message: "Invalid username/email or password."
    };
  }

  const row = found.values;

  if (String(row[6]) !== password) {
    return {
      success: false,
      message: "Invalid username/email or password."
    };
  }

  const status = normalize_(row[8]);
  const verified = row[9] === true;
  const demo = row[10] === true;

  if (!verified && !demo) {
    return {
      success: false,
      verified: false,
      demo: false,
      message: "Your account is not verified yet."
    };
  }

  return {
    success: true,
    verified: verified,
    demo: demo,
    user: {
      uid: normalize_(row[0]),
      username: normalize_(row[2]),
      name: normalize_(row[1]),
      gmail: normalize_(row[4]),
      phone: normalize_(row[5]),
      role: normalize_(row[7]) || "Employee",
      accountStatus: status
    }
  };
}

function forgotPassword_(data) {
  const identity = normalize_(data.identity);

  if (!identity) {
    return {
      success: false,
      message: "Email or username is required."
    };
  }

  const found = findUserRow_(identity);

  if (!found) {
    // Do not reveal account existence in a production system.
    return {
      success: true,
      message:
        "If the account exists, recovery instructions will be sent."
    };
  }

  // For this school prototype, do not automatically change passwords.
  // A future password-reset flow can use a separate reset token.
  return {
    success: true,
    message:
      "Recovery request accepted. Password reset can be connected in the next phase."
  };
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
