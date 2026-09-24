/*******************************************************
 * STOCKFLOW INVENTORY BACKEND
 * Google Apps Script - Code.gs
 *
 * PURPOSE
 * -------
 * Backend for the STOCKFLOW Inventory Spreadsheet.
 *
 * CURRENT DATA STRUCTURE
 * ----------------------
 *
 * Categories:
 *   Stored horizontally across Row 1 of the first sheet.
 *
 *   A1 = Phone Case
 *   B1 = Phone Stand
 *   C1 = Protection Scr
 *   ...
 *
 * Suppliers:
 *   Stored as rows in the "Suppliers" sheet.
 *
 *   A = S_Name
 *   B = contact person
 *   C = email address
 *   D = phone number
 *   E = address
 *   F = active/inactive
 *
 * SUPPORTED API ACTIONS
 * ---------------------
 *   listCategories
 *   saveCategory
 *   deleteCategory
 *   listSuppliers
 *   createSupplier
 *   updateSupplier
 *   deleteSupplier
 *
 * NOTE
 * ----
 * This file is NOT the authentication backend.
 *******************************************************/


/* =====================================================
   CONFIGURATION
   ===================================================== */

// Leave empty when this script is BOUND to the
// inventory spreadsheet.
//
// For a STANDALONE Apps Script project, put the
// Inventory Spreadsheet ID here.
//
// Example:
// const SPREADSHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz";

const SPREADSHEET_ID = "";


/* =====================================================
   SHEET CONFIGURATION
   ===================================================== */

const SUPPLIERS_SHEET_NAME = "Suppliers";

const CATEGORY_ID_PREFIX = "CAT-";
const SUPPLIER_ID_PREFIX = "SUP-";

const SUPPLIER_COLUMN_COUNT = 6;

const SUPPLIER_COLUMNS = {
  NAME: 1,
  CONTACT_PERSON: 2,
  EMAIL: 3,
  PHONE: 4,
  ADDRESS: 5,
  STATUS: 6
};

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

/**
 * Returns the inventory spreadsheet.
 *
 * Bound script:
 *   Uses the active spreadsheet.
 *
 * Standalone script:
 *   Opens the spreadsheet configured above.
 */
function getInventorySpreadsheet() {

  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "No spreadsheet is available. " +
      "Bind this script to the inventory spreadsheet " +
      "or configure SPREADSHEET_ID."
    );
  }

  return spreadsheet;
}


/**
 * Returns the first sheet.
 *
 * Categories currently live on the first sheet.
 */
function getCategorySheet() {

  const spreadsheet = getInventorySpreadsheet();
  const sheets = spreadsheet.getSheets();

  if (!sheets.length) {
    throw new Error("The inventory spreadsheet has no sheets.");
  }

  return sheets[0];
}


/* =====================================================
   SUPPLIERS SHEET ACCESS
   ===================================================== */

/**
 * Returns the Suppliers sheet.
 *
 * Creates it automatically if it does not exist.
 */
function getSuppliersSheet() {

  const spreadsheet = getInventorySpreadsheet();

  let sheet = spreadsheet.getSheetByName(SUPPLIERS_SHEET_NAME);

  if (sheet) {
    return sheet;
  }

  sheet = spreadsheet.insertSheet(SUPPLIERS_SHEET_NAME);

  sheet
    .getRange(1, 1, 1, SUPPLIERS_HEADERS.length)
    .setValues([SUPPLIERS_HEADERS])
    .setFontWeight("bold");

  sheet.setFrozenRows(1);

  return sheet;
}


/* =====================================================
   REQUEST HELPERS
   ===================================================== */

/**
 * Returns the data object from an API request.
 *
 * Supports:
 *   request.data
 *   request.category
 *   request.supplier
 *   request itself
 */
function getRequestData(request) {

  if (!request || typeof request !== "object") {
    return {};
  }

  return (
    request.data ||
    request.category ||
    request.supplier ||
    request
  );
}


/**
 * Converts a value to a trimmed string.
 */
function stringValue(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}


/**
 * Normalizes a supplier status.
 *
 * Only ACTIVE and INACTIVE are accepted.
 * Anything else defaults to ACTIVE.
 */
function normalizeSupplierStatus(value) {

  const status = stringValue(value).toUpperCase();

  return status === "INACTIVE"
    ? "INACTIVE"
    : "ACTIVE";
}


/* =====================================================
   MAIN API ENTRY POINT
   ===================================================== */

/**
 * POST API endpoint.
 */
function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {
      return jsonResponse({
        success: false,
        error: "No request data received."
      });
    }

    let request;

    try {

      request = JSON.parse(
        e.postData.contents
      );

    } catch (parseError) {

      return jsonResponse({
        success: false,
        error: "Invalid JSON request."
      });
    }


    const action = stringValue(request.action);

    if (!action) {

      return jsonResponse({
        success: false,
        error: "No API action specified."
      });
    }


    return routeApiAction(action, request);


  } catch (error) {

    return jsonResponse({
      success: false,
      error: getErrorMessage(error)
    });
  }
}


/**
 * GET API endpoint.
 *
 * Useful for checking whether the deployment
 * is alive.
 */
function doGet(e) {

  return jsonResponse({
    success: true,
    message: "STOCKFLOW Inventory API is running."
  });
}


/* =====================================================
   API ROUTER
   ===================================================== */

function routeApiAction(action, request) {

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
        deleteSupplier(request)
      );

    default:

      return jsonResponse({
        success: false,
        error: "Unknown API action: " + action
      });
  }
}


/* =====================================================
   CATEGORY API
   ===================================================== */

/**
 * Returns all categories stored in Row 1.
 */
function listCategories(request) {

  const sheet = getCategorySheet();
  const lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {

    return {
      success: true,
      categories: [],
      total: 0
    };
  }


  const values = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0];


  const categories = [];


  values.forEach(function(value, index) {

    const categoryName = stringValue(value);

    if (!categoryName) {
      return;
    }

    const columnNumber = index + 1;

    categories.push({
      categoryId: CATEGORY_ID_PREFIX + columnNumber,
      categoryName: categoryName,
      description: "",
      status: "Active",
      column: columnNumber
    });

  });


  return {
    success: true,
    categories: categories,
    total: categories.length
  };
}


/**
 * Creates a new category.
 *
 * Categories are stored horizontally in Row 1.
 */
function saveCategory(request) {

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getCategorySheet();
    const data = getRequestData(request);

    const categoryName = stringValue(
      data.categoryName ||
      data.name
    );


    if (!categoryName) {

      return {
        success: false,
        error: "Category name is required."
      };
    }


    const lastColumn = sheet.getLastColumn();

    let values = [];

    if (lastColumn > 0) {

      values = sheet
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0];

    }


    const duplicate = values.some(function(value) {

      return (
        stringValue(value).toLowerCase() ===
        categoryName.toLowerCase()
      );

    });


    if (duplicate) {

      return {
        success: false,
        error: "Category already exists."
      };
    }


    const nextColumn = Math.max(
      1,
      lastColumn + 1
    );


    sheet
      .getRange(1, nextColumn)
      .setValue(categoryName)
      .setHorizontalAlignment("left");


    return {

      success: true,

      message: "Category saved successfully.",

      category: {

        categoryId:
          CATEGORY_ID_PREFIX + nextColumn,

        categoryName: categoryName,

        description: "",

        status: "Active",

        column: nextColumn

      }
    };


  } finally {

    lock.releaseLock();

  }
}


/**
 * Deletes a category column.
 *
 * Accepts:
 *   categoryId: CAT-3
 *   categoryName
 *   name
 */
function deleteCategory(request) {

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getCategorySheet();
    const data = getRequestData(request);

    const categoryId = stringValue(
      data.categoryId
    );

    const categoryName = stringValue(
      data.categoryName ||
      data.name
    );


    const lastColumn = sheet.getLastColumn();


    if (lastColumn < 1) {

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
     * First try category ID.
     */
    if (categoryId) {

      const match = categoryId.match(
        /^CAT-(\d+)$/i
      );

      if (match) {

        const columnNumber = Number(
          match[1]
        );

        if (
          columnNumber >= 1 &&
          columnNumber <= lastColumn
        ) {

          /*
           * Only accept the ID if the target
           * column actually contains a category.
           */
          if (
            stringValue(
              values[columnNumber - 1]
            )
          ) {

            columnToDelete = columnNumber;

          }
        }
      }
    }


    /*
     * If the ID didn't resolve, search by name.
     */
    if (
      columnToDelete === -1 &&
      categoryName
    ) {

      for (
        let i = 0;
        i < values.length;
        i++
      ) {

        if (
          stringValue(values[i])
            .toLowerCase() ===
          categoryName.toLowerCase()
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


    const deletedName = stringValue(
      values[columnToDelete - 1]
    );


    sheet.deleteColumn(
      columnToDelete
    );


    return {

      success: true,

      message:
        "Category deleted successfully.",

      category: {
        categoryName: deletedName
      }

    };


  } finally {

    lock.releaseLock();

  }
}


/* =====================================================
   SUPPLIER API
   ===================================================== */

/**
 * Lists all suppliers.
 */
function listSuppliers(request) {

  const sheet = getSuppliersSheet();
  const lastRow = sheet.getLastRow();


  if (lastRow < 2) {

    return {
      success: true,
      suppliers: [],
      total: 0
    };
  }


  const values = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      SUPPLIER_COLUMN_COUNT
    )
    .getValues();


  const suppliers = [];


  values.forEach(function(row, index) {

    const name = stringValue(
      row[SUPPLIER_COLUMNS.NAME - 1]
    );


    /*
     * Skip empty supplier rows.
     */
    if (!name) {
      return;
    }


    const rowNumber = index + 2;


    const status = normalizeSupplierStatus(
      row[SUPPLIER_COLUMNS.STATUS - 1]
    );


    suppliers.push({

      id:
        SUPPLIER_ID_PREFIX +
        rowNumber,

      name: name,

      contactPerson:
        stringValue(
          row[
            SUPPLIER_COLUMNS.CONTACT_PERSON - 1
          ]
        ),

      email:
        stringValue(
          row[
            SUPPLIER_COLUMNS.EMAIL - 1
          ]
        ),

      phone:
        stringValue(
          row[
            SUPPLIER_COLUMNS.PHONE - 1
          ]
        ),

      address:
        stringValue(
          row[
            SUPPLIER_COLUMNS.ADDRESS - 1
          ]
        ),

      status: status,

      row: rowNumber

    });

  });


  return {

    success: true,

    suppliers: suppliers,

    total: suppliers.length

  };
}


/**
 * Finds a supplier row by ID or name.
 *
 * Returns:
 *   1-based row number
 *   -1 when not found
 */
function findSupplierRow(
  sheet,
  id,
  name
) {

  const trimmedId = stringValue(id);


  /*
   * Search by SUP-<row>.
   */
  if (trimmedId) {

    const match = trimmedId.match(
      /^SUP-(\d+)$/i
    );


    if (match) {

      const rowNumber = Number(
        match[1]
      );

      const lastRow = sheet.getLastRow();


      if (
        rowNumber >= 2 &&
        rowNumber <= lastRow
      ) {

        const existingName =
          stringValue(
            sheet
              .getRange(
                rowNumber,
                SUPPLIER_COLUMNS.NAME
              )
              .getValue()
          );


        if (existingName) {
          return rowNumber;
        }
      }
    }
  }


  /*
   * Search by exact supplier name.
   */
  const trimmedName = stringValue(name);


  if (!trimmedName) {
    return -1;
  }


  const lastRow = sheet.getLastRow();


  if (lastRow < 2) {
    return -1;
  }


  const values = sheet
    .getRange(
      2,
      SUPPLIER_COLUMNS.NAME,
      lastRow - 1,
      1
    )
    .getValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    const existingName =
      stringValue(values[i][0]);


    if (
      existingName.toLowerCase() ===
      trimmedName.toLowerCase()
    ) {

      return i + 2;

    }
  }


  return -1;
}


/**
 * Creates a supplier.
 */
function createSupplier(request) {

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getSuppliersSheet();
    const data = getRequestData(request);


    const name = stringValue(
      data.name ||
      data.supplierName
    );


    if (!name) {

      return {
        success: false,
        error: "Supplier name is required."
      };
    }


    /*
     * Prevent duplicate supplier names.
     */
    const duplicateRow =
      findSupplierRow(
        sheet,
        "",
        name
      );


    if (duplicateRow !== -1) {

      return {
        success: false,
        error:
          "A supplier with this name already exists."
      };
    }


    const contactPerson =
      stringValue(
        data.contactPerson
      );

    const email =
      stringValue(data.email);

    const phone =
      stringValue(data.phone);

    const address =
      stringValue(data.address);

    const status =
      normalizeSupplierStatus(
        data.status
      );


    const newRow =
      Math.max(
        2,
        sheet.getLastRow() + 1
      );


    sheet
      .getRange(
        newRow,
        1,
        1,
        SUPPLIER_COLUMN_COUNT
      )
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

      message:
        "Supplier saved successfully.",

      supplier: {

        id:
          SUPPLIER_ID_PREFIX +
          newRow,

        name: name,

        contactPerson:
          contactPerson,

        email: email,

        phone: phone,

        address: address,

        status: status

      }

    };


  } finally {

    lock.releaseLock();

  }
}


/**
 * Updates an existing supplier.
 *
 * The supplier must be identified by:
 *   id = SUP-<row>
 *
 * Name is not used to locate the record here because
 * the name may itself be changing.
 */
function updateSupplier(request) {

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getSuppliersSheet();
    const data = getRequestData(request);


    const id = stringValue(
      data.id
    );


    const name = stringValue(
      data.name ||
      data.supplierName
    );


    if (!id) {

      return {
        success: false,
        error: "Supplier ID is required."
      };
    }


    if (!name) {

      return {
        success: false,
        error: "Supplier name is required."
      };
    }


    const rowNumber =
      findSupplierRow(
        sheet,
        id,
        ""
      );


    if (rowNumber === -1) {

      return {
        success: false,
        error: "Supplier not found."
      };
    }


    /*
     * Prevent changing the supplier name to the
     * name of another supplier.
     */
    const duplicateRow =
      findSupplierRow(
        sheet,
        "",
        name
      );


    if (
      duplicateRow !== -1 &&
      duplicateRow !== rowNumber
    ) {

      return {
        success: false,
        error:
          "A supplier with this name already exists."
      };
    }


    const contactPerson =
      stringValue(
        data.contactPerson
      );

    const email =
      stringValue(data.email);

    const phone =
      stringValue(data.phone);

    const address =
      stringValue(data.address);

    const status =
      normalizeSupplierStatus(
        data.status
      );


    sheet
      .getRange(
        rowNumber,
        1,
        1,
        SUPPLIER_COLUMN_COUNT
      )
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

      message:
        "Supplier updated successfully.",

      supplier: {

        id:
          SUPPLIER_ID_PREFIX +
          rowNumber,

        name: name,

        contactPerson:
          contactPerson,

        email: email,

        phone: phone,

        address: address,

        status: status

      }

    };


  } finally {

    lock.releaseLock();

  }
}


/**
 * Deletes a supplier.
 *
 * Accepts:
 *   id   = SUP-<row>
 *   name = supplier name
 */
function deleteSupplier(request) {

  const lock = LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const sheet = getSuppliersSheet();
    const data = getRequestData(request);


    const id = stringValue(
      data.id
    );

    const name = stringValue(
      data.name ||
      data.supplierName
    );


    const rowNumber =
      findSupplierRow(
        sheet,
        id,
        name
      );


    if (rowNumber === -1) {

      return {
        success: false,
        error: "Supplier not found."
      };
    }


    const deletedName =
      stringValue(
        sheet
          .getRange(
            rowNumber,
            SUPPLIER_COLUMNS.NAME
          )
          .getValue()
      );


    sheet.deleteRow(
      rowNumber
    );


    return {

      success: true,

      message:
        "Supplier deleted successfully.",

      supplier: {
        name: deletedName
      }

    };


  } finally {

    lock.releaseLock();

  }
}


/* =====================================================
   RESPONSE / ERROR HELPERS
   ===================================================== */

/**
 * Returns a JSON response suitable for
 * Google Apps Script ContentService.
 */
function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/**
 * Safely extracts an error message.
 */
function getErrorMessage(error) {

  if (
    error &&
    error.message
  ) {

    return error.message;
  }

  return String(error);
}
