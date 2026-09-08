// ============================================================
// STOCKFLOW — DATABASE LAYER
// File: Database.gs
//
// Google Sheets is the primary datastore.
//
// This file automatically makes sure the USER sheet contains
// all required headers.
//
// Existing USER data is preserved.
// Missing columns are added automatically.
// ============================================================


// ============================================================
// OPEN SPREADSHEET
// ============================================================

function sfGetSpreadsheet() {

  return SpreadsheetApp.openById(
    SF_CONFIG.SHEET_ID
  );

}


// ============================================================
// GET USER SHEET
// ============================================================

function sfGetUserSheet() {

  var ss =
    sfGetSpreadsheet();


  var sheet =
    ss.getSheetByName(
      SF_CONFIG.USER_SHEET
    );


  if (!sheet) {

    sheet =
      ss.insertSheet(
        SF_CONFIG.USER_SHEET
      );

  }


  sfEnsureUserHeaders(
    sheet
  );


  return sheet;

}


// ============================================================
// ENSURE HEADERS
// ============================================================

function sfEnsureUserHeaders(
  sheet
) {

  var required =
    SF_USER_HEADERS;


  var lastColumn =
    sheet.getLastColumn();


  var existing = [];


  if (
    lastColumn > 0
  ) {

    existing =
      sheet
        .getRange(
          1,
          1,
          1,
          lastColumn
        )
        .getValues()[0]
        .map(function (value) {

          return sfClean(
            value
          );

        });

  }


  // ----------------------------------------------------------
  // Completely empty sheet
  // ----------------------------------------------------------

  if (
    existing.length === 0 ||
    (
      existing.length === 1 &&
      !existing[0]
    )
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        required.length
      )
      .setValues([
        required
      ]);

    sheet
      .getRange(
        1,
        1,
        1,
        required.length
      )
      .setFontWeight(
        "bold"
      );

    return;

  }


  // ----------------------------------------------------------
  // Add missing headers
  // ----------------------------------------------------------

  var headerMap = {};


  existing.forEach(
    function (
      header,
      index
    ) {

      if (header) {

        headerMap[
          header.toUpperCase()
        ] =
          index + 1;

      }

    }
  );


  var nextColumn =
    existing.length;


  required.forEach(
    function (
      header
    ) {

      var key =
        header.toUpperCase();


      if (
        !headerMap[key]
      ) {

        nextColumn++;


        sheet
          .getRange(
            1,
            nextColumn
          )
          .setValue(
            header
          )
          .setFontWeight(
            "bold"
          );


        headerMap[key] =
          nextColumn;

      }

    }
  );

}


// ============================================================
// READ USER HEADERS
// ============================================================

function sfGetHeaderMap(
  sheet
) {

  var lastColumn =
    sheet.getLastColumn();


  if (
    lastColumn < 1
  ) {

    return {};

  }


  var headers =
    sheet
      .getRange(
        1,
        1,
        1,
        lastColumn
      )
      .getValues()[0];


  var map = {};


  headers.forEach(
    function (
      header,
      index
    ) {

      var cleanHeader =
        sfClean(
          header
        );


      if (cleanHeader) {

        map[
          cleanHeader.toUpperCase()
        ] =
          index + 1;

      }

    }
  );


  return map;

}


// ============================================================
// COLUMN NUMBER
// ============================================================

function sfUserColumn(
  sheet,
  header
) {

  var map =
    sfGetHeaderMap(
      sheet
    );


  return (
    map[
      String(
        header
      ).toUpperCase()
    ] ||
    0
  );

}


// ============================================================
// GET USER VALUES
// ============================================================

function sfGetUserRow(
  record
) {

  return record
    .sheet
    .getRange(
      record.row,
      1,
      1,
      record.sheet.getLastColumn()
    )
    .getValues()[0];

}


// ============================================================
// GET VALUE BY HEADER
// ============================================================

function sfGetUserValue(
  record,
  header
) {

  var column =
    sfUserColumn(
      record.sheet,
      header
    );


  if (
    !column
  ) {

    return "";

  }


  return record
    .sheet
    .getRange(
      record.row,
      column
    )
    .getValue();

}


// ============================================================
// SET VALUE BY HEADER
// ============================================================

function sfSetUserValue(
  record,
  header,
  value
) {

  var column =
    sfUserColumn(
      record.sheet,
      header
    );


  if (
    !column
  ) {

    return;

  }


  record
    .sheet
    .getRange(
      record.row,
      column
    )
    .setValue(
      value
    );

}


// ============================================================
// FIND USER
// ============================================================

function sfFindUser(
  identity
) {

  var target =
    sfClean(
      identity
    )
    .toLowerCase();


  if (!target) {

    return null;

  }


  var sheet =
    sfGetUserSheet();


  var lastRow =
    sheet.getLastRow();


  var lastColumn =
    sheet.getLastColumn();


  if (
    lastRow < 2
  ) {

    return null;

  }


  var values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .getValues();


  var map =
    sfGetHeaderMap(
      sheet
    );


  var uidColumn =
    map["UID"] || 0;

  var usernameColumn =
    map["USERNAME"] || 0;

  var gmailColumn =
    map["GMAIL"] || 0;

  var phoneColumn =
    map["PHONE NO."] || 0;


  for (
    var i = 0;
    i < values.length;
    i++
  ) {

    var row =
      values[i];


    var candidates = [];


    if (
      uidColumn
    ) {

      candidates.push(
        sfClean(
          row[
            uidColumn - 1
          ]
        )
        .toLowerCase()
      );

    }


    if (
      usernameColumn
    ) {

      candidates.push(
        sfClean(
          row[
            usernameColumn - 1
          ]
        )
        .toLowerCase()
      );

    }


    if (
      gmailColumn
    ) {

      candidates.push(
        sfNormalizeEmail(
          row[
            gmailColumn - 1
          ]
        )
      );

    }


    if (
      phoneColumn
    ) {

      candidates.push(
        sfNormalizePhone(
          row[
            phoneColumn - 1
          ]
        )
        .toLowerCase()
      );

    }


    if (
      candidates.indexOf(
        target
      ) !== -1
    ) {

      return {

        sheet:
          sheet,

        row:
          i + 2,

        values:
          row

      };

    }

  }


  return null;

}


// ============================================================
// USER OBJECT
// ============================================================

function sfUserObject(
  recordOrRow
) {

  var row;
  var sheet;


  if (
    recordOrRow &&
    recordOrRow.sheet
  ) {

    sheet =
      recordOrRow.sheet;

    row =
      sfGetUserRow(
        recordOrRow
      );

  } else {

    row =
      recordOrRow || [];

  }


  var result = {

    uid:
      sfRowValue(
        row,
        sheet,
        "UID"
      ),

    name:
      sfRowValue(
        row,
        sheet,
        "NAME"
      ),

    username:
      sfRowValue(
        row,
        sheet,
        "USERNAME"
      ),

    age:
      sfRowValue(
        row,
        sheet,
        "AGE"
      ),

    accountStatus:
      sfRowValue(
        row,
        sheet,
        "ACCOUNT_S"
      ),

    gmail:
      sfRowValue(
        row,
        sheet,
        "GMAIL"
      ),

    phone:
      sfRowValue(
        row,
        sheet,
        "PHONE NO."
      ),

    role:
      sfRowValue(
        row,
        sheet,
        "ROLE"
      ),

    verified:
      sfToBoolean(
        sfRowValue(
          row,
          sheet,
          "VERIFIED"
        )
      )

  };


  // Compatibility aliases

  result.email =
    result.gmail;

  result.userId =
    result.uid;

  return result;

}


// ============================================================
// ROW VALUE
// ============================================================

function sfRowValue(
  row,
  sheet,
  header
) {

  if (
    !row ||
    !sheet
  ) {

    return "";

  }


  var column =
    sfUserColumn(
      sheet,
      header
    );


  if (
    !column ||
    column > row.length
  ) {

    return "";

  }


  return row[
    column - 1
  ];

}


// ============================================================
// LIST USERS
// ============================================================

function sfListAllUsers() {

  var sheet =
    sfGetUserSheet();


  var lastRow =
    sheet.getLastRow();


  var result = [];


  if (
    lastRow < 2
  ) {

    return result;

  }


  for (
    var rowNumber = 2;
    rowNumber <= lastRow;
    rowNumber++
  ) {

    var record = {

      sheet:
        sheet,

      row:
        rowNumber,

      values:
        sfGetUserRow({
          sheet:
            sheet,

          row:
            rowNumber
        })

    };


    result.push(
      sfUserObject(
        record
      )
    );

  }


  return result;

}


// ============================================================
// UPDATE LAST LOGIN
// ============================================================

function sfRecordLogin(
  record
) {

  sfSetUserValue(
    record,
    "LAST LOGIN",
    new Date()
  );

}


// ============================================================
// NORMALIZATION
// ============================================================

function sfNormalizeEmail(
  value
) {

  return sfClean(
    value
  )
    .toLowerCase();

}


function sfNormalizePhone(
  value
) {

  var p =
    sfClean(
      value
    )
    .replace(
      /[\s\-()]/g,
      ""
    );


  if (
    /^09\d{9}$/.test(p)
  ) {

    return (
      "+63" +
      p.substring(1)
    );

  }


  if (
    /^639\d{9}$/.test(p)
  ) {

    return "+" + p;

  }


  if (
    /^\+639\d{9}$/.test(p)
  ) {

    return p;

  }


  return p;

}


function sfValidEmail(
  value
) {

  return /^\S+@\S+\.\S+$/
    .test(
      sfNormalizeEmail(
        value
      )
    );

}


function sfValidPhone(
  value
) {

  return /^\+639\d{9}$/
    .test(
      sfNormalizePhone(
        value
      )
    );

}


// ============================================================
// GENERIC HELPERS
// ============================================================

function sfClean(
  value
) {

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


function sfToBoolean(
  value
) {

  if (
    value === true
  ) {

    return true;

  }


  var text =
    sfClean(
      value
    ).toUpperCase();


  return (
    text === "TRUE" ||
    text === "YES" ||
    text === "1" ||
    text === "VERIFIED"
  );

}


function sfHashPassword(
  password
) {

  return Utilities
    .base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        String(password),
        Utilities.Charset.UTF_8
      )
    );

}


function sfGenerateUid() {

  return (
    "sf_" +
    Date.now() +
    "_" +
    Utilities
      .getUuid()
      .replace(
        /-/g,
        ""
      )
      .substring(
        0,
        12
      )
  );

}


function sfGenerateOtp() {

  return String(
    Math.floor(
      100000 +
      Math.random() *
      900000
    )
  );

}


function sfMinutesFromNow(
  minutes
) {

  return new Date(
    Date.now() +
    Number(minutes) *
    60000
  );

}


// ============================================================
// JSON RESPONSE
// ============================================================

function sfJson(
  data
) {

  return ContentService
    .createTextOutput(
      JSON.stringify(
        data
      )
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}
