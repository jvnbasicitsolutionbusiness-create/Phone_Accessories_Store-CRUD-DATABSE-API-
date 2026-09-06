// ============================================================
// STOCKFLOW — GOOGLE SHEETS DATABASE
// File: database.gs
// ============================================================

const SF_USER_HEADERS = [
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


// ------------------------------------------------------------
// OPEN SPREADSHEET
// ------------------------------------------------------------

function sfSpreadsheet() {

  return SpreadsheetApp.openById(
    SF_SHEET_ID
  );

}


// ------------------------------------------------------------
// GET / CREATE SHEET
// ------------------------------------------------------------

function sfSheet(
  name,
  headers
) {

  const spreadsheet =
    sfSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(name);

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(name);

  }

  if (
    sheet.getMaxColumns() <
    headers.length
  ) {

    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length -
      sheet.getMaxColumns()
    );

  }

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([headers])
    .setFontWeight("bold");

  return sheet;

}


// ------------------------------------------------------------
// USER SHEET
// ------------------------------------------------------------

function sfUserSheet() {

  return sfSheet(
    SF_USER_SHEET,
    SF_USER_HEADERS
  );

}


// ------------------------------------------------------------
// GET ROWS
// ------------------------------------------------------------

function sfRows(sheet) {

  if (
    sheet.getLastRow() < 2
  ) {

    return [];

  }

  return sheet.getRange(
    2,
    1,
    sheet.getLastRow() - 1,
    sheet.getLastColumn()
  ).getValues();

}


// ------------------------------------------------------------
// FIND USER
// ------------------------------------------------------------

function sfFindUser(identity) {

  const sheet =
    sfUserSheet();

  const data =
    sfRows(sheet);

  const target =
    sfClean(identity).toLowerCase();

  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const row =
      data[i];

    const uid =
      sfClean(row[0]).toLowerCase();

    const username =
      sfClean(row[2]).toLowerCase();

    const gmail =
      sfEmail(row[6]);

    const phone =
      sfPhone(row[7]);

    if (
      uid === target ||
      username === target ||
      gmail === target ||
      phone.toLowerCase() === target
    ) {

      return {

        sheet: sheet,

        row: i + 2,

        values: row

      };

    }

  }

  return null;

}


// ------------------------------------------------------------
// USER OBJECT
// ------------------------------------------------------------

function sfUserObject(row) {

  if (!row) {
    return null;
  }

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
      String(row[9]).toUpperCase() === "TRUE"

  };

}


// ------------------------------------------------------------
// FIND USER BY USERNAME
// ------------------------------------------------------------

function sfUsernameExists(username) {

  return Boolean(
    sfFindUser(username)
  );

}


// ------------------------------------------------------------
// FIND USER BY EMAIL
// ------------------------------------------------------------

function sfEmailExists(gmail) {

  return Boolean(
    sfFindUser(gmail)
  );

}


// ------------------------------------------------------------
// FIND USER BY PHONE
// ------------------------------------------------------------

function sfPhoneExists(phone) {

  return Boolean(
    sfFindUser(phone)
  );

}
