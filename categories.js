/*******************************************************
 * STOCKFLOW INVENTORY BACKEND
 * Google Apps Script - Code.gs
 *
 * PURPOSE:
 * Backend for the separate STOCKFLOW Inventory Spreadsheet.
 *
 * CURRENT DATA:
 * Row 1 contains the product categories horizontally.
 *
 * Example:
 * A1 = Phone Case
 * B1 = Phone Stand
 * C1 = Protection Scr
 * ...
 *
 * The "Suppliers" sheet (a separate tab in this same
 * spreadsheet) stores suppliers as ROWS instead:
 *
 * A = S_Name
 * B = contact person
 * C = email address
 * D = phone number
 * E = address
 * F = active/inactive
 *
 * SUPPORTED API ACTIONS:
 * - listCategories
 * - saveCategory
 * - deleteCategory
 * - listSuppliers
 * - createSupplier
 * - updateSupplier
 * - deleteSupplier
 *
 * This file is NOT the authentication backend.
 *******************************************************/


/* =====================================================
   CONFIGURATION
   ===================================================== */

// If this Apps Script is BOUND to your inventory spreadsheet,
// you can leave this as an empty string.
//
// If this is a STANDALONE Apps Script project,
// put your Inventory Spreadsheet ID here.
//
// Example:
// const SPREADSHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz";

const SPREADSHEET_ID = "";


/* =====================================================
   SUPPLIERS SHEET NAME
   ===================================================== */

const SUPPLIERS_SHEET_NAME = "Suppliers";

const SUPPLIERS_HEADERS = [
  "S_Name",
  "contact person",
  "email address",
  "phone number",
  "address",
  "active/inactive"
];


/* =====================================================
   SPREADSHEET ACCESS
   ===================================================== */

function getInventorySpreadsheet() {

  // If this script is bound directly to the spreadsheet
  if (SPREADSHEET_ID === "") {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  // If this is a standalone Apps Script
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}


/* =====================================================
   SUPPLIERS SHEET ACCESS

   Gets the "Suppliers" tab, creating it (with headers)
   if it doesn't exist yet.
   ===================================================== */

function getSuppliersSheet() {

  const spreadsheet = getInventorySpreadsheet();

  let sheet = spreadsheet.getSheetByName(SUPPLIERS_SHEET_NAME);

  if (!sheet) {

    sheet = spreadsheet.insertSheet(SUPPLIERS_SHEET_NAME);

    sheet
      .getRange(1, 1, 1, SUPPLIERS_HEADERS.length)
      .setValues([SUPPLIERS_HEADERS]);

    sheet
      .getRange(1, 1, 1, SUPPLIERS_HEADERS.length)
      .setFontWeight("bold");

    sheet.setFrozenRows(1);

  }

  return sheet;
}


/* =====================================================
   MAIN API ENTRY POINT
   ===================================================== */

function doPost(e) {

  try {

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: "No request data received."
      });
    }

    const request = JSON.parse(e.postData.contents);

    const action = request.action;

    if (!action) {
      return jsonResponse({
        success: false,
        error: "No API action specified."
      });
    }


    /* ================================================
       API ROUTER
       ================================================ */

    switch (action) {

      case "listCategories":
        return jsonResponse(
          listCategories(request)
        );


      case "saveCategory":
        return jsonResponse(
          saveCategory(request)
        );


      case "deleteCategory":
        return jsonResponse(
          deleteCategory(request)
        );


      case "listSuppliers":
        return jsonResponse(
          listSuppliers(request)
        );


      case "createSupplier":
        return jsonResponse(
          createSupplier(request)
        );


      case "updateSupplier":
        return jsonResponse(
          updateSupplier(request)
        );


      case "deleteSupplier":
        return jsonResponse(
          deleteSupplierAction(request)
        );


      default:

        return jsonResponse({
          success: false,
          error: "Unknown API action: " + action
        });
    }


  } catch (error) {

    return jsonResponse({
      success: false,
      error: error.message || String(error)
    });
  }
}


/* =====================================================
   GET SUPPORT
   ===================================================== */

function doGet(e) {

  return jsonResponse({
    success: true,
    message: "STOCKFLOW Inventory API is running."
  });
}


/* =====================================================
   LIST CATEGORIES
   ===================================================== */

function listCategories(request) {

  const spreadsheet = getInventorySpreadsheet();

  /*
   * Use the first sheet of the inventory spreadsheet.
   *
   * Your current spreadsheet has the categories
   * horizontally across Row 1.
   */

  const sheet = spreadsheet.getSheets()[0];

  const lastColumn = sheet.getLastColumn();

  const categories = [];

  if (lastColumn === 0) {

    return {
      success: true,
      categories: []
    };

  }


  const values = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0];


  for (let i = 0; i < values.length; i++) {

    const categoryName = String(values[i] || "").trim();

    if (categoryName !== "") {

      categories.push({

        categoryId: "CAT-" + (i + 1),

        categoryName: categoryName,

        description: "",

        status: "Active",

        column: i + 1

      });

    }
  }


  return {

    success: true,

    categories: categories,

    total: categories.length

  };
}


/* =====================================================
   SAVE CATEGORY
   ===================================================== */

function saveCategory(request) {

  const spreadsheet = getInventorySpreadsheet();

  const sheet = spreadsheet.getSheets()[0];


  /*
   * Accept different possible property names so the
   * frontend remains flexible.
   */

  const data = request.data || request.category || request;


  const categoryName = String(
    data.categoryName ||
    data.name ||
    ""
  ).trim();


  if (!categoryName) {

    return {

      success: false,

      error: "Category name is required."

    };
  }


  /*
   * Read existing categories
   */

  const lastColumn = sheet.getLastColumn();

  let values = [];

  if (lastColumn > 0) {

    values = sheet
      .getRange(1, 1, 1, lastColumn)
      .getValues()[0];

  }


  /*
   * Check for duplicate category
   */

  const duplicate = values.some(function(value) {

    return String(value || "")
      .trim()
      .toLowerCase() === categoryName.toLowerCase();

  });


  if (duplicate) {

    return {

      success: false,

      error: "Category already exists."

    };
  }


  /*
   * Find the next available column
   */

  const nextColumn = lastColumn + 1;


  /*
   * Save the category into Row 1
   */

  sheet
    .getRange(1, nextColumn)
    .setValue(categoryName);


  /*
   * Optional formatting
   */

  sheet
    .getRange(1, nextColumn)
    .setHorizontalAlignment("left");


  return {

    success: true,

    message: "Category saved successfully.",

    category: {

      categoryId: "CAT-" + nextColumn,

      categoryName: categoryName,

      description: "",

      status: "Active",

      column: nextColumn

    }

  };
}


/* =====================================================
   DELETE CATEGORY
   ===================================================== */

function deleteCategory(request) {

  const spreadsheet = getInventorySpreadsheet();

  const sheet = spreadsheet.getSheets()[0];


  const data = request.data || request.category || request;


  /*
   * The frontend may provide either:
   *
   * categoryId
   * categoryName
   * name
   */

  const categoryId = String(
    data.categoryId ||
    ""
  ).trim();


  const categoryName = String(
    data.categoryName ||
    data.name ||
    ""
  ).trim();


  const lastColumn = sheet.getLastColumn();


  if (lastColumn === 0) {

    return {

      success: false,

      error: "No categories found."

    };
  }


  const values = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0];


  let columnToDelete = -1;


  /*
   * First try Category ID
   */

  if (categoryId) {

    const match = categoryId.match(/^CAT-(\d+)$/i);

    if (match) {

      const columnNumber = Number(match[1]);

      if (
        columnNumber >= 1 &&
        columnNumber <= lastColumn
      ) {

        columnToDelete = columnNumber;

      }
    }
  }


  /*
   * If ID wasn't found, search by name
   */

  if (columnToDelete === -1 && categoryName) {

    for (let i = 0; i < values.length; i++) {

      if (
        String(values[i] || "")
          .trim()
          .toLowerCase() === categoryName.toLowerCase()
      ) {

        columnToDelete = i + 1;

        break;

      }
    }
  }


  if (columnToDelete === -1) {

    return {

      success: false,

      error: "Category not found."

    };
  }


  const deletedName = String(
    values[columnToDelete - 1] || ""
  ).trim();


  /*
   * Delete the entire category column.
   *
   * This is appropriate for your CURRENT sheet because
   * categories are stored horizontally.
   */

  sheet.deleteColumn(columnToDelete);


  return {

    success: true,

    message: "Category deleted successfully.",

    category: {

      categoryName: deletedName

    }

  };
}


/* =====================================================
   LIST SUPPLIERS
   -----------------------------------------------------
   Suppliers are stored as ROWS (unlike categories,
   which are stored as columns).

   Row layout:
     A = S_Name
     B = contact person
     C = email address
     D = phone number
     E = address
     F = active/inactive

   The row number itself is used to build a stable ID,
   e.g. row 2 -> "SUP-2". This mirrors how categories
   use "CAT-" + column number.
   ===================================================== */

function listSuppliers(request) {

  const sheet = getSuppliersSheet();

  const lastRow = sheet.getLastRow();

  const suppliers = [];


  if (lastRow < 2) {

    return {

      success: true,

      suppliers: []

    };

  }


  const values = sheet
    .getRange(2, 1, lastRow - 1, 6)
    .getValues();


  for (let i = 0; i < values.length; i++) {

    const row = values[i];

    const name = String(row[0] || "").trim();


    /*
     * Skip fully empty rows.
     */

    if (!name) {
      continue;
    }


    const rowNumber = i + 2;


    const statusRaw = String(row[5] || "Active")
      .trim()
      .toUpperCase();


    const status =
      statusRaw === "INACTIVE"
        ? "INACTIVE"
        : "ACTIVE";


    suppliers.push({

      id: "SUP-" + rowNumber,

      name: name,

      contactPerson: String(row[1] || "").trim(),

      email: String(row[2] || "").trim(),

      phone: String(row[3] || "").trim(),

      address: String(row[4] || "").trim(),

      status: status,

      row: rowNumber

    });

  }


  return {

    success: true,

    suppliers: suppliers,

    total: suppliers.length

  };
}


/* =====================================================
   FIND SUPPLIER ROW

   Accepts either:
     id     -> "SUP-<rowNumber>"
     name   -> exact match on S_Name (case-insensitive)

   Returns the 1-based row number, or -1 if not found.
   ===================================================== */

function findSupplierRow(sheet, id, name) {

  const trimmedId = String(id || "").trim();

  if (trimmedId) {

    const match = trimmedId.match(/^SUP-(\d+)$/i);

    if (match) {

      const rowNumber = Number(match[1]);

      const lastRow = sheet.getLastRow();

      if (
        rowNumber >= 2 &&
        rowNumber <= lastRow
      ) {

        const existingName = String(
          sheet.getRange(rowNumber, 1).getValue() || ""
        ).trim();


        /*
         * Only trust the row number if it still
         * actually holds a supplier (not a row that
         * was deleted after this ID was generated).
         */

        if (existingName !== "") {

          return rowNumber;

        }

      }
    }
  }


  const trimmedName = String(name || "").trim();

  if (trimmedName) {

    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {

      const values = sheet
        .getRange(2, 1, lastRow - 1, 1)
        .getValues();


      for (let i = 0; i < values.length; i++) {

        const existingName = String(values[i][0] || "").trim();

        if (
          existingName.toLowerCase() ===
          trimmedName.toLowerCase()
        ) {

          return i + 2;

        }

      }
    }
  }


  return -1;
}


/* =====================================================
   CREATE SUPPLIER
   ===================================================== */

function createSupplier(request) {

  const sheet = getSuppliersSheet();


  const data = request.data || request.supplier || request;


  const name = String(
    data.name ||
    data.supplierName ||
    ""
  ).trim();


  if (!name) {

    return {

      success: false,

      error: "Supplier name is required."

    };
  }


  /*
   * Prevent duplicate supplier names.
   */

  const duplicateRow = findSupplierRow(sheet, "", name);

  if (duplicateRow !== -1) {

    return {

      success: false,

      error: "A supplier with this name already exists."

    };
  }


  const contactPerson = String(data.contactPerson || "").trim();

  const email = String(data.email || "").trim();

  const phone = String(data.phone || "").trim();

  const address = String(data.address || "").trim();

  const statusRaw = String(data.status || "ACTIVE")
    .trim()
    .toUpperCase();

  const status = statusRaw === "INACTIVE" ? "Inactive" : "Active";


  const newRow = sheet.getLastRow() + 1;


  sheet
    .getRange(newRow, 1, 1, 6)
    .setValues([[
      name,
      contactPerson,
      email,
      phone,
      address,
      status
    ]]);


  return {

    success: true,

    message: "Supplier saved successfully.",

    supplier: {

      id: "SUP-" + newRow,

      name: name,

      contactPerson: contactPerson,

      email: email,

      phone: phone,

      address: address,

      status: status.toUpperCase()

    }

  };
}


/* =====================================================
   UPDATE SUPPLIER
   ===================================================== */

function updateSupplier(request) {

  const sheet = getSuppliersSheet();


  const data = request.data || request.supplier || request;


  const id = String(data.id || "").trim();

  const name = String(
    data.name ||
    data.supplierName ||
    ""
  ).trim();


  if (!name) {

    return {

      success: false,

      error: "Supplier name is required."

    };
  }


  const rowNumber = findSupplierRow(sheet, id, "");


  if (rowNumber === -1) {

    return {

      success: false,

      error: "Supplier not found."

    };
  }


  /*
   * Prevent renaming into a duplicate of a DIFFERENT
   * existing supplier.
   */

  const duplicateRow = findSupplierRow(sheet, "", name);

  if (
    duplicateRow !== -1 &&
    duplicateRow !== rowNumber
  ) {

    return {

      success: false,

      error: "A supplier with this name already exists."

    };
  }


  const contactPerson = String(data.contactPerson || "").trim();

  const email = String(data.email || "").trim();

  const phone = String(data.phone || "").trim();

  const address = String(data.address || "").trim();

  const statusRaw = String(data.status || "ACTIVE")
    .trim()
    .toUpperCase();

  const status = statusRaw === "INACTIVE" ? "Inactive" : "Active";


  sheet
    .getRange(rowNumber, 1, 1, 6)
    .setValues([[
      name,
      contactPerson,
      email,
      phone,
      address,
      status
    ]]);


  return {

    success: true,

    message: "Supplier updated successfully.",

    supplier: {

      id: "SUP-" + rowNumber,

      name: name,

      contactPerson: contactPerson,

      email: email,

      phone: phone,

      address: address,

      status: status.toUpperCase()

    }

  };
}


/* =====================================================
   DELETE SUPPLIER

   Named "deleteSupplierAction" (rather than
   "deleteSupplier") only to avoid clashing with the
   frontend-facing case label in the switch statement
   above; behavior is otherwise the same style as
   deleteCategory.
   ===================================================== */

function deleteSupplierAction(request) {

  const sheet = getSuppliersSheet();


  const data = request.data || request.supplier || request;


  const id = String(
    data.id ||
    ""
  ).trim();


  const name = String(
    data.name ||
    ""
  ).trim();


  const rowNumber = findSupplierRow(sheet, id, name);


  if (rowNumber === -1) {

    return {

      success: false,

      error: "Supplier not found."

    };
  }


  const deletedName = String(
    sheet.getRange(rowNumber, 1).getValue() || ""
  ).trim();


  sheet.deleteRow(rowNumber);


  return {

    success: true,

    message: "Supplier deleted successfully.",

    supplier: {

      name: deletedName

    }

  };
}


/* =====================================================
   JSON RESPONSE
   ===================================================== */

function jsonResponse(data) {

  return ContentService

    .createTextOutput(
      JSON.stringify(data)
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );
}
