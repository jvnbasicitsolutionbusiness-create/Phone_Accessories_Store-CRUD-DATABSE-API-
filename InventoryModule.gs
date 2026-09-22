/* ============================================================
   STOCKFLOW — INVENTORY MODULE BACKEND
   Google Apps Script
   ============================================================
   Purpose:
   - Products CRUD
   - Categories CRUD
   - Suppliers CRUD
   - Stock In
   - Stock Out
   - Transactions
   - Dashboard statistics
   - Activity log

   IMPORTANT:
   This file is intended to be integrated into your existing
   authentication Code.gs.

   DO NOT create another doPost() if your existing Code.gs
   already has one. Instead, call inventoryDoPost_(data)
   from your MAIN router.
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const SF_INVENTORY = {

  PRODUCTS: "PRODUCTS",

  CATEGORIES: "CATEGORIES",

  SUPPLIERS: "SUPPLIERS",

  STOCK_IN: "STOCK_IN",

  STOCK_OUT: "STOCK_OUT",

  ACTIVITY_LOG: "ACTIVITY_LOG"

};


/* ============================================================
   SHEET HEADERS
   ============================================================ */

const SF_HEADERS = {

  PRODUCTS: [
    "ID",
    "SKU",
    "NAME",
    "CATEGORY_ID",
    "CATEGORY",
    "SUPPLIER_ID",
    "SUPPLIER",
    "PRICE",
    "COST",
    "STOCK",
    "REORDER_LEVEL",
    "STATUS",
    "IMAGE_URL",
    "CREATED_AT",
    "UPDATED_AT"
  ],

  CATEGORIES: [
    "ID",
    "NAME",
    "DESCRIPTION",
    "STATUS",
    "CREATED_AT",
    "UPDATED_AT"
  ],

  SUPPLIERS: [
    "ID",
    "NAME",
    "CONTACT_PERSON",
    "PHONE",
    "EMAIL",
    "ADDRESS",
    "STATUS",
    "CREATED_AT",
    "UPDATED_AT"
  ],

  STOCK_IN: [
    "ID",
    "PRODUCT_ID",
    "SKU",
    "PRODUCT",
    "QTY",
    "UNIT_COST",
    "TOTAL_COST",
    "SUPPLIER_ID",
    "SUPPLIER",
    "REFERENCE",
    "DATE",
    "REMARKS",
    "CREATED_BY",
    "CREATED_AT"
  ],

  STOCK_OUT: [
    "ID",
    "PRODUCT_ID",
    "SKU",
    "PRODUCT",
    "QTY",
    "REASON",
    "REFERENCE",
    "DATE",
    "REMARKS",
    "CREATED_BY",
    "CREATED_AT"
  ],

  ACTIVITY_LOG: [
    "ID",
    "ACTION",
    "MODULE",
    "RECORD_ID",
    "DETAILS",
    "USERNAME",
    "ROLE",
    "CREATED_AT"
  ]

};


/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

function sfJson_(data) {

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

}


function sfSuccess_(data) {

  return sfJson_(
    Object.assign(
      {
        success: true
      },
      data || {}
    )
  );

}


function sfError_(message, extra) {

  return sfJson_(
    Object.assign(
      {
        success: false,
        message: message || "Unknown server error."
      },
      extra || {}
    )
  );

}


/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function sfNow_() {

  return new Date();

}


function sfId_(prefix) {

  return prefix + "_" + Utilities.getUuid();

}


function sfText_(value) {

  return String(
    value == null ? "" : value
  ).trim();

}


function sfNum_(value) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;

}


function sfRequireFields_(object, fields) {

  return fields.every(
    function (field) {

      return sfText_(object[field]);

    }
  );

}


/* ============================================================
   SPREADSHEET ACCESS
   ============================================================

   IMPORTANT:
   If your Apps Script is bound directly to your Google Sheet,
   getActiveSpreadsheet() can work.

   If your Web App is standalone, use openById() instead.

   For now this function supports both approaches.
   ============================================================ */

function sfSpreadsheet_() {

  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (!active) {

    throw new Error(
      "StockFlow spreadsheet could not be accessed. " +
      "Make sure the Apps Script is bound to the correct Google Sheet."
    );

  }

  return active;

}


/* ============================================================
   SHEET ACCESS
   ============================================================ */

function sfSheet_(name) {

  const ss = sfSpreadsheet_();

  let sheet = ss.getSheetByName(name);

  if (!sheet) {

    sheet = ss.insertSheet(name);

  }


  const headers = SF_HEADERS[name];

  if (
    headers &&
    sheet.getLastRow() === 0
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([headers])
      .setFontWeight("bold");

    sheet.setFrozenRows(1);

  }


  return sheet;

}


/* ============================================================
   SHEET VALUES
   ============================================================ */

function sfValues_(name) {

  const sheet = sfSheet_(name);

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {

    return [];

  }


  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      SF_HEADERS[name]
        ? SF_HEADERS[name].length
        : 1
    );


  return sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      lastColumn
    )
    .getValues();

}


/* ============================================================
   HEADER MAP
   ============================================================ */

function sfMap_(headers) {

  const map = {};

  headers.forEach(
    function (header, index) {

      map[
        String(header)
          .trim()
          .toUpperCase()
      ] = index;

    }
  );

  return map;

}


/* ============================================================
   ROW DATA
   ============================================================ */

function sfRows_(name) {

  const headers =
    SF_HEADERS[name];

  const map =
    sfMap_(headers);

  return {

    sheet: sfSheet_(name),

    rows: sfValues_(name),

    map: map

  };

}


/* ============================================================
   FIND RECORD BY ID
   ============================================================ */

function sfFindById_(name, id) {

  const data =
    sfRows_(name);

  const target =
    sfText_(id);


  for (
    let i = 0;
    i < data.rows.length;
    i++
  ) {

    if (
      sfText_(
        data.rows[i][data.map.ID]
      ) === target
    ) {

      return {

        row: data.rows[i],

        rowNumber: i + 2,

        sheet: data.sheet,

        map: data.map

      };

    }

  }


  return null;

}


/* ============================================================
   WRITE ROW
   ============================================================ */

function sfWriteRow_(
  sheet,
  rowNumber,
  row
) {

  sheet
    .getRange(
      rowNumber,
      1,
      1,
      row.length
    )
    .setValues([row]);

}


/* ============================================================
   PUBLIC PRODUCT
   ============================================================ */

function sfPublicProduct_(row, map) {

  return {

    id:
      row[map.ID],

    sku:
      row[map.SKU],

    name:
      row[map.NAME],

    categoryId:
      row[map.CATEGORY_ID],

    category:
      row[map.CATEGORY],

    supplierId:
      row[map.SUPPLIER_ID],

    supplier:
      row[map.SUPPLIER],

    price:
      row[map.PRICE],

    cost:
      row[map.COST],

    stock:
      row[map.STOCK],

    reorderLevel:
      row[map.REORDER_LEVEL],

    status:
      row[map.STATUS],

    imageUrl:
      row[map.IMAGE_URL],

    createdAt:
      row[map.CREATED_AT],

    updatedAt:
      row[map.UPDATED_AT]

  };

}


/* ============================================================
   PUBLIC CATEGORY
   ============================================================ */

function sfPublicCategory_(row, map) {

  return {

    id:
      row[map.ID],

    name:
      row[map.NAME],

    description:
      row[map.DESCRIPTION],

    status:
      row[map.STATUS],

    createdAt:
      row[map.CREATED_AT],

    updatedAt:
      row[map.UPDATED_AT]

  };

}


/* ============================================================
   PUBLIC SUPPLIER
   ============================================================ */

function sfPublicSupplier_(row, map) {

  return {

    id:
      row[map.ID],

    name:
      row[map.NAME],

    contactPerson:
      row[map.CONTACT_PERSON],

    phone:
      row[map.PHONE],

    email:
      row[map.EMAIL],

    address:
      row[map.ADDRESS],

    status:
      row[map.STATUS],

    createdAt:
      row[map.CREATED_AT],

    updatedAt:
      row[map.UPDATED_AT]

  };

}


/* ============================================================
   ACTIVITY LOG
   ============================================================ */

function sfLog_(
  action,
  module,
  recordId,
  details,
  data
) {

  const sheet =
    sfSheet_(
      SF_INVENTORY.ACTIVITY_LOG
    );


  sheet.appendRow([

    sfId_("act"),

    sfText_(action),

    sfText_(module),

    sfText_(recordId),

    sfText_(details),

    sfText_(
      data &&
      (
        data.username ||
        data.createdBy
      )
    ) || "system",

    sfText_(
      data &&
      data.role
    ) || "system",

    sfNow_()

  ]);

}


/* ============================================================
   PRODUCTS — LIST
   ============================================================ */

function sfListProducts_(data) {

  const result =
    sfRows_(
      SF_INVENTORY.PRODUCTS
    );


  let products =
    result.rows.map(
      function (row) {

        return sfPublicProduct_(
          row,
          result.map
        );

      }
    );


  const query =
    sfText_(
      data && data.q
    ).toLowerCase();


  if (query) {

    products =
      products.filter(
        function (product) {

          return [

            product.sku,

            product.name,

            product.category,

            product.supplier

          ].some(
            function (value) {

              return sfText_(
                value
              )
                .toLowerCase()
                .includes(query);

            }
          );

        }
      );

  }


  return sfSuccess_({

    products: products

  });

}


/* ============================================================
   PRODUCTS — SAVE
   ============================================================ */

function sfSaveProduct_(data) {

  if (
    !sfRequireFields_(
      data,
      [
        "name",
        "sku",
        "categoryId"
      ]
    )
  ) {

    return sfError_(
      "SKU, product name and category are required."
    );

  }


  const result =
    sfRows_(
      SF_INVENTORY.PRODUCTS
    );


  const sku =
    sfText_(
      data.sku
    ).toLowerCase();


  const id =
    sfText_(
      data.id
    );


  for (
    let i = 0;
    i < result.rows.length;
    i++
  ) {

    const existingSku =
      sfText_(
        result.rows[i][result.map.SKU]
      ).toLowerCase();


    const existingId =
      sfText_(
        result.rows[i][result.map.ID]
      );


    if (
      existingSku === sku &&
      existingId !== id
    ) {

      return sfError_(
        "SKU already exists."
      );

    }

  }


  const category =
    sfFindById_(
      SF_INVENTORY.CATEGORIES,
      data.categoryId
    );


  if (!category) {

    return sfError_(
      "Selected category does not exist."
    );

  }


  const now =
    sfNow_();


  const productId =
    id ||
    sfId_("prd");


  const existing =
    id
      ? sfFindById_(
          SF_INVENTORY.PRODUCTS,
          id
        )
      : null;


  const row =
    Array(
      SF_HEADERS.PRODUCTS.length
    ).fill("");


  row[result.map.ID] =
    productId;


  row[result.map.SKU] =
    sfText_(data.sku);


  row[result.map.NAME] =
    sfText_(data.name);


  row[result.map.CATEGORY_ID] =
    category.row[
      category.map.ID
    ];


  row[result.map.CATEGORY] =
    category.row[
      category.map.NAME
    ];


  row[result.map.SUPPLIER_ID] =
    sfText_(data.supplierId);


  row[result.map.SUPPLIER] =
    sfText_(data.supplier);


  row[result.map.PRICE] =
    sfNum_(data.price);


  row[result.map.COST] =
    sfNum_(data.cost);


  row[result.map.STOCK] =
    existing
      ? sfNum_(
          existing.row[
            result.map.STOCK
          ]
        )
      : Math.max(
          0,
          sfNum_(data.stock)
        );


  row[result.map.REORDER_LEVEL] =
    Math.max(
      0,
      sfNum_(data.reorderLevel)
    );


  row[result.map.STATUS] =
    sfText_(data.status) ||
    "ACTIVE";


  row[result.map.IMAGE_URL] =
    sfText_(data.imageUrl);


  row[result.map.CREATED_AT] =
    existing
      ? existing.row[
          result.map.CREATED_AT
        ]
      : now;


  row[result.map.UPDATED_AT] =
    now;


  if (existing) {

    sfWriteRow_(
      result.sheet,
      existing.rowNumber,
      row
    );

  } else {

    result.sheet.appendRow(row);

  }


  sfLog_(
    existing
      ? "UPDATE"
      : "CREATE",

    SF_INVENTORY.PRODUCTS,

    productId,

    existing
      ? "Product updated"
      : "Product created",

    data
  );


  return sfSuccess_({

    product:
      sfPublicProduct_(
        row,
        result.map
      )

  });

}


/* ============================================================
   PRODUCTS — DELETE
   ============================================================ */

function sfDeleteProduct_(data) {

  const found =
    sfFindById_(
      SF_INVENTORY.PRODUCTS,
      data.id
    );


  if (!found) {

    return sfError_(
      "Product not found."
    );

  }


  const stock =
    sfNum_(
      found.row[
        found.map.STOCK
      ]
    );


  if (stock > 0) {

    return sfError_(
      "Cannot delete a product with remaining stock. Set it to INACTIVE instead."
    );

  }


  found.sheet.deleteRow(
    found.rowNumber
  );


  sfLog_(
    "DELETE",
    SF_INVENTORY.PRODUCTS,
    data.id,
    "Product deleted",
    data
  );


  return sfSuccess_({

    message:
      "Product deleted."

  });

}


/* ============================================================
   CATEGORIES — LIST
   ============================================================ */

function sfListCategories_() {

  const result =
    sfRows_(
      SF_INVENTORY.CATEGORIES
    );


  return sfSuccess_({

    categories:
      result.rows.map(
        function (row) {

          return sfPublicCategory_(
            row,
            result.map
          );

        }
      )

  });

}


/* ============================================================
   CATEGORIES — SAVE
   ============================================================ */

function sfSaveCategory_(data) {

  if (
    !sfText_(data.name)
  ) {

    return sfError_(
      "Category name is required."
    );

  }


  const result =
    sfRows_(
      SF_INVENTORY.CATEGORIES
    );


  const id =
    sfText_(data.id);


  const name =
    sfText_(data.name)
      .toLowerCase();


  for (
    const row of result.rows
  ) {

    if (
      sfText_(
        row[result.map.NAME]
      ).toLowerCase() === name &&
      sfText_(
        row[result.map.ID]
      ) !== id
    ) {

      return sfError_(
        "Category already exists."
      );

    }

  }


  const found =
    id
      ? sfFindById_(
          SF_INVENTORY.CATEGORIES,
          id
        )
      : null;


  const now =
    sfNow_();


  const row =
    Array(
      SF_HEADERS.CATEGORIES.length
    ).fill("");


  row[result.map.ID] =
    id || sfId_("cat");


  row[result.map.NAME] =
    sfText_(data.name);


  row[result.map.DESCRIPTION] =
    sfText_(data.description);


  row[result.map.STATUS] =
    sfText_(data.status) ||
    "ACTIVE";


  row[result.map.CREATED_AT] =
    found
      ? found.row[
          result.map.CREATED_AT
        ]
      : now;


  row[result.map.UPDATED_AT] =
    now;


  if (found) {

    sfWriteRow_(
      result.sheet,
      found.rowNumber,
      row
    );

  } else {

    result.sheet.appendRow(row);

  }


  sfLog_(
    found
      ? "UPDATE"
      : "CREATE",

    SF_INVENTORY.CATEGORIES,

    row[result.map.ID],

    found
      ? "Category updated"
      : "Category created",

    data
  );


  return sfSuccess_({

    category:
      sfPublicCategory_(
        row,
        result.map
      )

  });

}


/* ============================================================
   CATEGORIES — DELETE
   ============================================================ */

function sfDeleteCategory_(data) {

  const found =
    sfFindById_(
      SF_INVENTORY.CATEGORIES,
      data.id
    );


  if (!found) {

    return sfError_(
      "Category not found."
    );

  }


  const products =
    sfValues_(
      SF_INVENTORY.PRODUCTS
    );


  const productMap =
    sfMap_(
      SF_HEADERS.PRODUCTS
    );


  const inUse =
    products.some(
      function (row) {

        return (
          sfText_(
            row[productMap.CATEGORY_ID]
          ) ===
          sfText_(data.id)
        );

      }
    );


  if (inUse) {

    return sfError_(
      "Category is in use by products."
    );

  }


  found.sheet.deleteRow(
    found.rowNumber
  );


  sfLog_(
    "DELETE",
    SF_INVENTORY.CATEGORIES,
    data.id,
    "Category deleted",
    data
  );


  return sfSuccess_({

    message:
      "Category deleted."

  });

}


/* ============================================================
   SUPPLIERS — LIST
   ============================================================ */

function sfListSuppliers_() {

  const result =
    sfRows_(
      SF_INVENTORY.SUPPLIERS
    );


  return sfSuccess_({

    suppliers:
      result.rows.map(
        function (row) {

          return sfPublicSupplier_(
            row,
            result.map
          );

        }
      )

  });

}


/* ============================================================
   SUPPLIERS — SAVE
   ============================================================ */

function sfSaveSupplier_(data) {

  if (
    !sfText_(data.name)
  ) {

    return sfError_(
      "Supplier name is required."
    );

  }


  const result =
    sfRows_(
      SF_INVENTORY.SUPPLIERS
    );


  const id =
    sfText_(data.id);


  const found =
    id
      ? sfFindById_(
          SF_INVENTORY.SUPPLIERS,
          id
        )
      : null;


  const now =
    sfNow_();


  const row =
    Array(
      SF_HEADERS.SUPPLIERS.length
    ).fill("");


  row[result.map.ID] =
    id || sfId_("sup");


  row[result.map.NAME] =
    sfText_(data.name);


  row[result.map.CONTACT_PERSON] =
    sfText_(data.contactPerson);


  row[result.map.PHONE] =
    sfText_(data.phone);


  row[result.map.EMAIL] =
    sfText_(data.email);


  row[result.map.ADDRESS] =
    sfText_(data.address);


  row[result.map.STATUS] =
    sfText_(data.status) ||
    "ACTIVE";


  row[result.map.CREATED_AT] =
    found
      ? found.row[
          result.map.CREATED_AT
        ]
      : now;


  row[result.map.UPDATED_AT] =
    now;


  if (found) {

    sfWriteRow_(
      result.sheet,
      found.rowNumber,
      row
    );

  } else {

    result.sheet.appendRow(row);

  }


  sfLog_(
    found
      ? "UPDATE"
      : "CREATE",

    SF_INVENTORY.SUPPLIERS,

    row[result.map.ID],

    found
      ? "Supplier updated"
      : "Supplier created",

    data
  );


  return sfSuccess_({

    supplier:
      sfPublicSupplier_(
        row,
        result.map
      )

  });

}


/* ============================================================
   SUPPLIERS — DELETE
   ============================================================ */

function sfDeleteSupplier_(data) {

  const found =
    sfFindById_(
      SF_INVENTORY.SUPPLIERS,
      data.id
    );


  if (!found) {

    return sfError_(
      "Supplier not found."
    );

  }


  const products =
    sfValues_(
      SF_INVENTORY.PRODUCTS
    );


  const productMap =
    sfMap_(
      SF_HEADERS.PRODUCTS
    );


  const inUse =
    products.some(
      function (row) {

        return (
          sfText_(
            row[productMap.SUPPLIER_ID]
          ) ===
          sfText_(data.id)
        );

      }
    );


  if (inUse) {

    return sfError_(
      "Supplier is in use by products."
    );

  }


  found.sheet.deleteRow(
    found.rowNumber
  );


  sfLog_(
    "DELETE",
    SF_INVENTORY.SUPPLIERS,
    data.id,
    "Supplier deleted",
    data
  );


  return sfSuccess_({

    message:
      "Supplier deleted."

  });

}


/* ============================================================
   STOCK IN
   ============================================================ */

function sfStockIn_(data) {

  const product =
    sfFindById_(
      SF_INVENTORY.PRODUCTS,
      data.productId
    );


  const qty =
    Math.floor(
      sfNum_(data.qty)
    );


  if (!product) {

    return sfError_(
      "Product not found."
    );

  }


  if (qty <= 0) {

    return sfError_(
      "Quantity must be greater than zero."
    );

  }


  const unitCost =
    Math.max(
      0,
      sfNum_(data.unitCost)
    );


  const now =
    sfNow_();


  const result =
    sfRows_(
      SF_INVENTORY.STOCK_IN
    );


  const row =
    Array(
      SF_HEADERS.STOCK_IN.length
    ).fill("");


  row[result.map.ID] =
    sfId_("sin");


  row[result.map.PRODUCT_ID] =
    product.row[
      product.map.ID
    ];


  row[result.map.SKU] =
    product.row[
      product.map.SKU
    ];


  row[result.map.PRODUCT] =
    product.row[
      product.map.NAME
    ];


  row[result.map.QTY] =
    qty;


  row[result.map.UNIT_COST] =
    unitCost;


  row[result.map.TOTAL_COST] =
    qty * unitCost;


  row[result.map.SUPPLIER_ID] =
    sfText_(data.supplierId);


  row[result.map.SUPPLIER] =
    sfText_(data.supplier);


  row[result.map.REFERENCE] =
    sfText_(data.reference);


  row[result.map.DATE] =
    data.date
      ? new Date(data.date)
      : now;


  row[result.map.REMARKS] =
    sfText_(data.remarks);


  row[result.map.CREATED_BY] =
    sfText_(data.username) ||
    "system";


  row[result.map.CREATED_AT] =
    now;


  result.sheet.appendRow(row);


  const newStock =
    sfNum_(
      product.row[
        product.map.STOCK
      ]
    ) + qty;


  product.sheet
    .getRange(
      product.rowNumber,
      product.map.STOCK + 1
    )
    .setValue(newStock);


  product.sheet
    .getRange(
      product.rowNumber,
      product.map.COST + 1
    )
    .setValue(unitCost);


  product.sheet
    .getRange(
      product.rowNumber,
      product.map.UPDATED_AT + 1
    )
    .setValue(now);


  sfLog_(
    "STOCK_IN",
    "STOCK",
    row[result.map.ID],
    "Stock received: " +
      qty +
      " x " +
      product.row[
        product.map.NAME
      ],
    data
  );


  return sfSuccess_({

    message:
      "Stock-in recorded.",

    newStock:
      newStock

  });

}


/* ============================================================
   STOCK OUT
   ============================================================ */

function sfStockOut_(data) {

  const product =
    sfFindById_(
      SF_INVENTORY.PRODUCTS,
      data.productId
    );


  const qty =
    Math.floor(
      sfNum_(data.qty)
    );


  if (!product) {

    return sfError_(
      "Product not found."
    );

  }


  if (qty <= 0) {

    return sfError_(
      "Quantity must be greater than zero."
    );

  }


  const current =
    sfNum_(
      product.row[
        product.map.STOCK
      ]
    );


  if (qty > current) {

    return sfError_(
      "Insufficient stock. Available: " +
      current +
      "."
    );

  }


  const now =
    sfNow_();


  const result =
    sfRows_(
      SF_INVENTORY.STOCK_OUT
    );


  const row =
    Array(
      SF_HEADERS.STOCK_OUT.length
    ).fill("");


  row[result.map.ID] =
    sfId_("sout");


  row[result.map.PRODUCT_ID] =
    product.row[
      product.map.ID
    ];


  row[result.map.SKU] =
    product.row[
      product.map.SKU
    ];


  row[result.map.PRODUCT] =
    product.row[
      product.map.NAME
    ];


  row[result.map.QTY] =
    qty;


  row[result.map.REASON] =
    sfText_(data.reason) ||
    "SALE";


  row[result.map.REFERENCE] =
    sfText_(data.reference);


  row[result.map.DATE] =
    data.date
      ? new Date(data.date)
      : now;


  row[result.map.REMARKS] =
    sfText_(data.remarks);


  row[result.map.CREATED_BY] =
    sfText_(data.username) ||
    "system";


  row[result.map.CREATED_AT] =
    now;


  result.sheet.appendRow(row);


  const newStock =
    current - qty;


  product.sheet
    .getRange(
      product.rowNumber,
      product.map.STOCK + 1
    )
    .setValue(newStock);


  product.sheet
    .getRange(
      product.rowNumber,
      product.map.UPDATED_AT + 1
    )
    .setValue(now);


  sfLog_(
    "STOCK_OUT",
    "STOCK",
    row[result.map.ID],
    "Stock released: " +
      qty +
      " x " +
      product.row[
        product.map.NAME
      ],
    data
  );


  return sfSuccess_({

    message:
      "Stock-out recorded.",

    newStock:
      newStock

  });

}


/* ============================================================
   TRANSACTIONS
   ============================================================ */

function sfListTransactions_(data) {

  const type =
    sfText_(
      data && data.type
    ).toUpperCase();


  let sheetName;


  if (type === "IN") {

    sheetName =
      SF_INVENTORY.STOCK_IN;

  } else if (type === "OUT") {

    sheetName =
      SF_INVENTORY.STOCK_OUT;

  } else {

    return sfError_(
      "Transaction type must be IN or OUT."
    );

  }


  const result =
    sfRows_(sheetName);


  const records =
    result.rows.map(
      function (row) {

        const object = {};

        SF_HEADERS[
          sheetName
        ].forEach(
          function (header, index) {

            object[header] =
              row[index];

          }
        );

        return object;

      }
    );


  return sfSuccess_({

    records:
      records

  });

}


/* ============================================================
   DASHBOARD STATISTICS
   ============================================================ */

function sfDashboardStats_() {

  const products =
    sfValues_(
      SF_INVENTORY.PRODUCTS
    );


  const productMap =
    sfMap_(
      SF_HEADERS.PRODUCTS
    );


  const categories =
    sfValues_(
      SF_INVENTORY.CATEGORIES
    );


  const suppliers =
    sfValues_(
      SF_INVENTORY.SUPPLIERS
    );


  let totalStock = 0;

  let lowStock = 0;

  let outOfStock = 0;


  products.forEach(
    function (row) {

      const stock =
        sfNum_(
          row[productMap.STOCK]
        );


      const reorder =
        sfNum_(
          row[
            productMap.REORDER_LEVEL
          ]
        );


      totalStock += stock;


      if (stock === 0) {

        outOfStock++;

      } else if (
        stock <= reorder
      ) {

        lowStock++;

      }

    }
  );


  return sfSuccess_({

    stats: {

      products:
        products.length,

      categories:
        categories.length,

      suppliers:
        suppliers.length,

      totalStock:
        totalStock,

      lowStock:
        lowStock,

      outOfStock:
        outOfStock

    }

  });

}


/* ============================================================
   ACTIVITY
   ============================================================ */

function sfListActivity_() {

  const result =
    sfRows_(
      SF_INVENTORY.ACTIVITY_LOG
    );


  const rows =
    result.rows
      .slice(-200)
      .reverse();


  return sfSuccess_({

    activities:

      rows.map(
        function (row) {

          return {

            id:
              row[0],

            action:
              row[1],

            module:
              row[2],

            recordId:
              row[3],

            details:
              row[4],

            username:
              row[5],

            role:
              row[6],

            createdAt:
              row[7]

          };

        }
      )

  });

}


/* ============================================================
   INVENTORY ROUTER
   ============================================================ */

function inventoryDoPost_(data) {

  try {

    data =
      data || {};


    const action =
      sfText_(
        data.action
      );


    switch (action) {

      case "listProducts":

        return sfListProducts_(data);


      case "saveProduct":

        return sfSaveProduct_(data);


      case "deleteProduct":

        return sfDeleteProduct_(data);


      case "listCategories":

        return sfListCategories_();


      case "saveCategory":

        return sfSaveCategory_(data);


      case "deleteCategory":

        return sfDeleteCategory_(data);


      case "listSuppliers":

        return sfListSuppliers_();


      case "saveSupplier":

        return sfSaveSupplier_(data);


      case "deleteSupplier":

        return sfDeleteSupplier_(data);


      case "stockIn":

        return sfStockIn_(data);


      case "stockOut":

        return sfStockOut_(data);


      case "listTransactions":

        return sfListTransactions_(data);


      case "dashboardStats":

        return sfDashboardStats_();


      case "listActivity":

        return sfListActivity_();


      default:

        return null;

    }

  } catch (error) {

    console.error(
      "Inventory API Error:",
      error
    );


    return sfError_(
      error &&
      error.message
        ? error.message
        : "Inventory server error."
    );

  }

}
