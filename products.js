/* ============================================================
   STOCKFLOW | PRODUCTS MODULE
   ============================================================
   Products Management
   ------------------------------------------------------------
   FEATURES
   - Authentication protection
   - Load products
   - Load categories
   - Search products
   - Filter by category
   - Filter by status
   - Add product
   - Edit product
   - Delete product
   - View product details
   - Product statistics
   - Pagination
   - Loading states
   - Error handling
   - Toast notifications
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  "use strict";


  /* ==========================================================
     CONFIGURATION
     ========================================================== */

  const PAGE_SIZE = 10;

  let currentPage = 1;

  let allProducts = [];

  let filteredProducts = [];

  let categories = [];

  let selectedProduct = null;

  let editingProductId = null;


  /* ==========================================================
     DOM HELPERS
     ========================================================== */

  const $ = (selector) =>
    document.querySelector(selector);

  const $$ = (selector) =>
    document.querySelectorAll(selector);


  const byId = (id) =>
    document.getElementById(id);


  /* ==========================================================
     SAFE VALUE
     ========================================================== */

  function valueOf(...values) {

    for (const value of values) {

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {

        return value;

      }

    }

    return "";

  }


  /* ==========================================================
     ESCAPE HTML
     ========================================================== */

  function esc(value) {

    return String(value ?? "")
      .replace(
        /[&<>"']/g,
        (character) => {

          const map = {

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"

          };

          return map[character];

        }
      );

  }


  /* ==========================================================
     NUMBER
     ========================================================== */

  function number(value) {

    const parsed =
      Number(
        String(value ?? "")
          .replace(/,/g, "")
      );

    return Number.isFinite(parsed)
      ? parsed
      : 0;

  }


  /* ==========================================================
     CURRENCY
     ========================================================== */

  function currency(value) {

    return "₱" +
      number(value).toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );

  }


  /* ==========================================================
     NORMALIZE PRODUCT
     ========================================================== */

  function normalizeProduct(product) {

    product = product || {};

    return {

      id: valueOf(
        product.id,
        product.productId,
        product.ID,
        product.PRODUCT_ID,
        product.uid
      ),

      name: valueOf(
        product.name,
        product.productName,
        product.PRODUCT_NAME,
        product.NAME
      ),

      sku: valueOf(
        product.sku,
        product.SKU,
        product.productSku,
        product.PRODUCT_SKU
      ),

      category: valueOf(
        product.category,
        product.categoryName,
        product.CATEGORY,
        product.CATEGORY_NAME
      ),

      brand: valueOf(
        product.brand,
        product.BRAND
      ),

      unit: valueOf(
        product.unit,
        product.UNIT,
        "PCS"
      ),

      price: number(
        valueOf(
          product.price,
          product.sellingPrice,
          product.SELLING_PRICE,
          product.PRICE
        )
      ),

      cost: number(
        valueOf(
          product.cost,
          product.costPrice,
          product.COST_PRICE,
          product.COST
        )
      ),

      stock: number(
        valueOf(
          product.stock,
          product.currentStock,
          product.stockQty,
          product.STOCK,
          product.CURRENT_STOCK,
          product.QUANTITY
        )
      ),

      reorderLevel: number(
        valueOf(
          product.reorderLevel,
          product.REORDER_LEVEL,
          product.reorder,
          product.REORDER
        )
      ),

      status:
        String(
          valueOf(
            product.status,
            product.STATUS,
            "ACTIVE"
          )
        )
        .trim()
        .toUpperCase(),

      description: valueOf(
        product.description,
        product.DESCRIPTION
      ),

      createdAt: valueOf(
        product.createdAt,
        product.CREATED_AT,
        product.dateCreated
      ),

      updatedAt: valueOf(
        product.updatedAt,
        product.UPDATED_AT,
        product.dateUpdated
      )

    };

  }


  /* ==========================================================
     AUTHENTICATION
     ========================================================== */

  let currentUser = null;

  try {

    if (
      typeof StockFlowAuth === "undefined"
    ) {

      throw new Error(
        "Authentication module is not loaded."
      );

    }


    currentUser =
      await StockFlowAuth.requireAuth();


    if (!currentUser) {

      return;

    }


    if (
      typeof StockFlowAuth.bindUserUI ===
      "function"
    ) {

      StockFlowAuth.bindUserUI(
        currentUser
      );

    }

  }

  catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    showToast(
      error.message ||
      "Authentication failed.",
      "error"
    );

    return;

  }


  /* ==========================================================
     TOPBAR
     ========================================================== */

  byId("logoutBtn")
    ?.addEventListener(
      "click",
      () => {

        if (
          typeof StockFlowAuth !==
          "undefined" &&
          typeof StockFlowAuth.logout ===
          "function"
        ) {

          StockFlowAuth.logout();

        }

      }
    );


  byId("mobileMenuBtn")
    ?.addEventListener(
      "click",
      () => {

        document.body.classList.toggle(
          "sidebar-open"
        );

      }
    );


  byId("sidebarOverlay")
    ?.addEventListener(
      "click",
      () => {

        document.body.classList.remove(
          "sidebar-open"
        );

      }
    );


  /* ==========================================================
     INITIALIZE
     ========================================================== */

  await initialize();


  /* ==========================================================
     INITIALIZE FUNCTION
     ========================================================== */

  async function initialize() {

    setConnection(
      "CONNECTING"
    );


    try {

      await Promise.all([

        loadCategories(),

        loadProducts()

      ]);


      updateStatistics();

      applyFilters();

      setConnection(
        "CONNECTED"
      );

    }

    catch (error) {

      console.error(
        "Products initialization error:",
        error
      );

      setConnection(
        "OFFLINE"
      );

      showToast(
        error.message ||
        "Unable to connect to the inventory server.",
        "error"
      );

    }

  }


  /* ==========================================================
     CONNECTION STATUS
     ========================================================== */

  function setConnection(status) {

    const badge =
      byId("connectionBadge");

    if (!badge) return;


    const text =
      badge.querySelector(
        "span:last-child"
      );


    if (text) {

      text.textContent =
        status;

    }


    badge.classList.remove(
      "connected",
      "offline",
      "connecting"
    );


    const normalized =
      String(status)
        .toLowerCase();


    if (
      normalized ===
      "connected"
    ) {

      badge.classList.add(
        "connected"
      );

    }

    else if (
      normalized ===
      "offline"
    ) {

      badge.classList.add(
        "offline"
      );

    }

    else {

      badge.classList.add(
        "connecting"
      );

    }

  }


  /* ==========================================================
     API CALL HELPER
     ========================================================== */

  async function apiCall(
    methodName,
    ...args
  ) {

    if (
      typeof StockFlowAPI ===
      "undefined"
    ) {

      throw new Error(
        "StockFlow API is not loaded."
      );

    }


    if (
      typeof StockFlowAPI[
        methodName
      ] !== "function"
    ) {

      throw new Error(
        `API method "${methodName}" is not available.`
      );

    }


    const response =
      await StockFlowAPI[
        methodName
      ](
        ...args
      );


    if (
      response &&
      response.success === false
    ) {

      throw new Error(
        response.message ||
        "API request failed."
      );

    }


    return response || {};

  }


  /* ==========================================================
     LOAD PRODUCTS
     ========================================================== */

  async function loadProducts() {

    showTableLoading();


    try {

      let response;


      /*
       * Preferred API method:
       *
       * StockFlowAPI.products()
       *
       * Compatibility fallbacks are included so the module
       * can continue working if API.js exposes another name.
       */

      if (
        typeof StockFlowAPI.products ===
        "function"
      ) {

        response =
          await StockFlowAPI.products();

      }

      else if (
        typeof StockFlowAPI.getProducts ===
        "function"
      ) {

        response =
          await StockFlowAPI.getProducts();

      }

      else if (
        typeof StockFlowAPI.listProducts ===
        "function"
      ) {

        response =
          await StockFlowAPI.listProducts();

      }

      else {

        throw new Error(
          "Products API endpoint is not available in API.js."
        );

      }


      const rawProducts =
        response.products ||
        response.data ||
        response.items ||
        [];


      allProducts =
        Array.isArray(
          rawProducts
        )

          ? rawProducts.map(
              normalizeProduct
            )

          : [];


      filteredProducts =
        [
          ...allProducts
        ];


      updateStatistics();

      applyFilters();

    }

    catch (error) {

      console.error(
        "Load products error:",
        error
      );

      allProducts = [];

      filteredProducts = [];

      renderProducts([]);

      updateStatistics();

      throw error;

    }

  }


  /* ==========================================================
     LOAD CATEGORIES
     ========================================================== */

  async function loadCategories() {

    try {

      let response;


      if (
        typeof StockFlowAPI.categories ===
        "function"
      ) {

        response =
          await StockFlowAPI.categories();

      }

      else if (
        typeof StockFlowAPI.getCategories ===
        "function"
      ) {

        response =
          await StockFlowAPI.getCategories();

      }

      else if (
        typeof StockFlowAPI.listCategories ===
        "function"
      ) {

        response =
          await StockFlowAPI.listCategories();

      }

      else {

        /*
         * Categories API may not exist yet.
         * Product page can still operate.
         */

        categories = [];

        populateCategorySelects();

        return;

      }


      const raw =
        response.categories ||
        response.data ||
        response.items ||
        [];


      categories =
        Array.isArray(raw)
          ? raw
          : [];


      populateCategorySelects();

    }

    catch (error) {

      console.warn(
        "Category loading failed:",
        error
      );

      categories = [];

      populateCategorySelects();

    }

  }


  /* ==========================================================
     POPULATE CATEGORY SELECTS
     ========================================================== */

  function populateCategorySelects() {

    const filter =
      byId("categoryFilter");

    const form =
      byId("productCategory");


    const normalizedCategories =
      categories
        .map(
          (category) => {

            if (
              typeof category ===
              "string"
            ) {

              return category;

            }


            return valueOf(
              category.name,
              category.categoryName,
              category.CATEGORY_NAME,
              category.CATEGORY
            );

          }
        )
        .filter(Boolean);


    const uniqueCategories =
      [
        ...new Set(
          normalizedCategories
        )
      ]
      .sort(
        (a, b) =>
          String(a)
            .localeCompare(
              String(b)
            )
      );


    if (filter) {

      filter.innerHTML =
        `<option value="">All Categories</option>`;


      uniqueCategories.forEach(
        (category) => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            category;

          option.textContent =
            category;

          filter.appendChild(
            option
          );

        }
      );

    }


    if (form) {

      form.innerHTML =
        `<option value="">Select category</option>`;


      uniqueCategories.forEach(
        (category) => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            category;

          option.textContent =
            category;

          form.appendChild(
            option
          );

        }
      );

    }

  }


  /* ==========================================================
     SEARCH / FILTER
     ========================================================== */

  byId("productSearch")
    ?.addEventListener(
      "input",
      () => {

        currentPage = 1;

        applyFilters();

      }
    );


  byId("categoryFilter")
    ?.addEventListener(
      "change",
      () => {

        currentPage = 1;

        applyFilters();

      }
    );


  byId("statusFilter")
    ?.addEventListener(
      "change",
      () => {

        currentPage = 1;

        applyFilters();

      }
    );


  function applyFilters() {

    const search =
      String(
        byId("productSearch")
          ?.value ||
        ""
      )
      .trim()
      .toLowerCase();


    const category =
      String(
        byId("categoryFilter")
          ?.value ||
        ""
      )
      .trim()
      .toLowerCase();


    const status =
      String(
        byId("statusFilter")
          ?.value ||
        ""
      )
      .trim()
      .toUpperCase();


    filteredProducts =
      allProducts.filter(
        (product) => {

          const searchable = [

            product.name,

            product.sku,

            product.category,

            product.brand,

            product.description

          ]
          .join(" ")
          .toLowerCase();


          const matchesSearch =
            !search ||
            searchable.includes(
              search
            );


          const matchesCategory =
            !category ||
            product.category
              .toLowerCase() ===
            category;


          const matchesStatus =
            !status ||
            product.status ===
            status;


          return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus
          );

        }
      );


    renderProducts(
      filteredProducts
    );

    updatePagination();

  }


  /* ==========================================================
     RENDER PRODUCTS
     ========================================================== */

  function renderProducts(products) {

    const tbody =
      byId("productsTableBody");

    const empty =
      byId("emptyProducts");


    if (!tbody) return;


    if (!products.length) {

      tbody.innerHTML = "";

      if (empty) {

        empty.classList.remove(
          "hidden"
        );

      }

      updateProductCountLabel(
        0
      );

      return;

    }


    if (empty) {

      empty.classList.add(
        "hidden"
      );

    }


    const start =
      (
        currentPage -
        1
      ) *
      PAGE_SIZE;


    const pageItems =
      products.slice(
        start,
        start + PAGE_SIZE
      );


    tbody.innerHTML =
      pageItems
        .map(
          productRow
        )
        .join("");


    updateProductCountLabel(
      products.length
    );


    attachRowEvents();

  }


  /* ==========================================================
     PRODUCT TABLE ROW
     ========================================================== */

  function productRow(product) {

    const stock =
      number(
        product.stock
      );


    const reorder =
      number(
        product.reorderLevel
      );


    let stockClass =
      "stock-normal";


    let stockLabel =
      "In Stock";


    if (
      stock <= 0
    ) {

      stockClass =
        "stock-danger";

      stockLabel =
        "Out of Stock";

    }

    else if (
      stock <= reorder
    ) {

      stockClass =
        "stock-warning";

      stockLabel =
        "Low Stock";

    }


    const statusClass =
      product.status ===
      "ACTIVE"

        ? "status-active"

        : "status-inactive";


    return `

      <tr
        data-product-id="${esc(product.id)}"
      >

        <td>

          <div class="product-cell">

            <div class="product-icon">

              <i class="fa-solid fa-box"></i>

            </div>

            <div>

              <strong>
                ${esc(
                  product.name ||
                  "Unnamed Product"
                )}
              </strong>

              <small>
                ${esc(
                  product.brand ||
                  "No brand"
                )}
              </small>

            </div>

          </div>

        </td>


        <td>

          <span class="sku-text">
            ${esc(
              product.sku ||
              "—"
            )}
          </span>

        </td>


        <td>

          <span class="category-text">
            ${esc(
              product.category ||
              "Uncategorized"
            )}
          </span>

        </td>


        <td>

          <strong>
            ${currency(
              product.price
            )}
          </strong>

        </td>


        <td>

          <div class="stock-cell">

            <strong class="${stockClass}">
              ${stock.toLocaleString()}
            </strong>

            <small>
              ${esc(
                stockLabel
              )}
            </small>

          </div>

        </td>


        <td>

          <span
            class="status-badge ${statusClass}"
          >

            <span class="status-dot"></span>

            ${esc(
              product.status
            )}

          </span>

        </td>


        <td>

          <div class="row-actions">

            <button
              type="button"
              class="icon-btn view-product"
              data-id="${esc(product.id)}"
              title="View Product"
              aria-label="View Product"
            >
              <i class="fa-solid fa-eye"></i>
            </button>


            <button
              type="button"
              class="icon-btn edit-product"
              data-id="${esc(product.id)}"
              title="Edit Product"
              aria-label="Edit Product"
            >
              <i class="fa-solid fa-pen"></i>
            </button>


            <button
              type="button"
              class="icon-btn danger delete-product"
              data-id="${esc(product.id)}"
              title="Delete Product"
              aria-label="Delete Product"
            >
              <i class="fa-solid fa-trash"></i>
            </button>

          </div>

        </td>

      </tr>

    `;

  }


  /* ==========================================================
     TABLE EVENTS
     ========================================================== */

  function attachRowEvents() {

    $$(".view-product")
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              viewProduct(
                button.dataset.id
              );

            }
          );

        }
      );


    $$(".edit-product")
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              editProduct(
                button.dataset.id
              );

            }
          );

        }
      );


    $$(".delete-product")
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              deleteProduct(
                button.dataset.id
              );

            }
          );

        }
      );

  }


  /* ==========================================================
     STATISTICS
     ========================================================== */

  function updateStatistics() {

    const total =
      allProducts.length;


    const active =
      allProducts.filter(
        (product) =>
          product.status ===
          "ACTIVE"
      ).length;


    const lowStock =
      allProducts.filter(
        (product) => {

          const stock =
            number(
              product.stock
            );

          const reorder =
            number(
              product.reorderLevel
            );


          return (
            stock > 0 &&
            stock <= reorder
          );

        }
      ).length;


    const outOfStock =
      allProducts.filter(
        (product) =>
          number(
            product.stock
          ) <= 0
      ).length;


    setText(
      "totalProducts",
      total
    );

    setText(
      "activeProducts",
      active
    );

    setText(
      "lowStockProducts",
      lowStock
    );

    setText(
      "outOfStockProducts",
      outOfStock
    );

  }


  /* ==========================================================
     PRODUCT COUNT
     ========================================================== */

  function updateProductCountLabel(
    count
  ) {

    const label =
      byId(
        "productCountLabel"
      );


    if (!label) return;


    label.textContent =
      `${count} ${
        count === 1
          ? "product"
          : "products"
      }`;

  }


  /* ==========================================================
     ADD PRODUCT BUTTONS
     ========================================================== */

  byId("addProductBtn")
    ?.addEventListener(
      "click",
      () => {

        openAddProductModal();

      }
    );


  byId("emptyAddProductBtn")
    ?.addEventListener(
      "click",
      () => {

        openAddProductModal();

      }
    );


  /* ==========================================================
     OPEN ADD PRODUCT
     ========================================================== */

  function openAddProductModal() {

    editingProductId =
      null;

    selectedProduct =
      null;


    const form =
      byId("productForm");


    form?.reset();


    byId("productId")
      .value = "";


    byId("productModalTitle")
      .textContent =
      "Add Product";


    byId("saveProductText")
      .textContent =
      "Save Product";


    byId("productStatus")
      .value =
      "ACTIVE";


    byId("productUnit")
      .value =
      "PCS";


    byId("productReorder")
      .value =
      "10";


    clearFormMessages();

    openModal(
      "productModal"
    );

  }


  /* ==========================================================
     EDIT PRODUCT
     ========================================================== */

  function editProduct(id) {

    const product =
      allProducts.find(
        (item) =>
          String(item.id) ===
          String(id)
      );


    if (!product) {

      showToast(
        "Product could not be found.",
        "error"
      );

      return;

    }


    selectedProduct =
      product;


    editingProductId =
      product.id;


    byId("productModalTitle")
      .textContent =
      "Edit Product";


    byId("saveProductText")
      .textContent =
      "Update Product";


    setFormValue(
      "productId",
      product.id
    );

    setFormValue(
      "productName",
      product.name
    );

    setFormValue(
      "productSku",
      product.sku
    );

    setFormValue(
      "productCategory",
      product.category
    );

    setFormValue(
      "productBrand",
      product.brand
    );

    setFormValue(
      "productUnit",
      product.unit ||
      "PCS"
    );

    setFormValue(
      "productPrice",
      product.price
    );

    setFormValue(
      "productCost",
      product.cost
    );

    setFormValue(
      "productStock",
      product.stock
    );

    setFormValue(
      "productReorder",
      product.reorderLevel
    );

    setFormValue(
      "productStatus",
      product.status
    );

    setFormValue(
      "productDescription",
      product.description
    );


    clearFormMessages();

    openModal(
      "productModal"
    );

  }


  /* ==========================================================
     VIEW PRODUCT
     ========================================================== */

  function viewProduct(id) {

    const product =
      allProducts.find(
        (item) =>
          String(item.id) ===
          String(id)
      );


    if (!product) {

      showToast(
        "Product could not be found.",
        "error"
      );

      return;

    }


    selectedProduct =
      product;


    setText(
      "viewProductName",
      product.name ||
      "Unnamed Product"
    );


    setText(
      "viewProductSku",
      product.sku
        ? `SKU: ${product.sku}`
        : "No SKU"
    );


    setText(
      "viewProductCategory",
      product.category ||
      "Uncategorized"
    );


    setText(
      "viewProductBrand",
      product.brand ||
      "No brand"
    );


    setText(
      "viewProductPrice",
      currency(
        product.price
      )
    );


    setText(
      "viewProductCost",
      currency(
        product.cost
      )
    );


    setText(
      "viewProductStock",
      number(
        product.stock
      ).toLocaleString()
    );


    setText(
      "viewProductReorder",
      number(
        product.reorderLevel
      ).toLocaleString()
    );


    setText(
      "viewProductUnit",
      product.unit ||
      "PCS"
    );


    setText(
      "viewProductStatus",
      product.status ||
      "ACTIVE"
    );


    setText(
      "viewProductDescription",
      product.description ||
      "No description available."
    );


    openModal(
      "viewProductModal"
    );

  }


  /* ==========================================================
     VIEW -> EDIT
     ========================================================== */

  byId("viewEditProductBtn")
    ?.addEventListener(
      "click",
      () => {

        if (
          !selectedProduct
        ) {

          return;

        }


        closeModal(
          "viewProductModal"
        );


        setTimeout(
          () => {

            editProduct(
              selectedProduct.id
            );

          },
          150
        );

      }
    );


  /* ==========================================================
     PRODUCT FORM
     ========================================================== */

  byId("productForm")
    ?.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        await saveProduct();

      }
    );


  /* ==========================================================
     SAVE PRODUCT
     ========================================================== */

  async function saveProduct() {

    clearFormMessages();


    const product =
      collectFormData();


    const validation =
      validateProduct(
        product
      );


    if (!validation.valid) {

      showFormError(
        validation.message
      );

      return;

    }


    setButtonLoading(
      "saveProductBtn",
      true
    );


    try {

      let response;


      if (
        editingProductId
      ) {

        response =
          await updateProduct(
            product
          );

      }

      else {

        response =
          await createProduct(
            product
          );

      }


      if (
        response &&
        response.success === false
      ) {

        throw new Error(
          response.message ||
          "Product operation failed."
        );

      }


      showToast(
        editingProductId
          ? "Product updated successfully."
          : "Product added successfully.",
        "success"
      );


      closeModal(
        "productModal"
      );


      await loadProducts();


      setConnection(
        "CONNECTED"
      );

    }

    catch (error) {

      console.error(
        "Save product error:",
        error
      );


      showFormError(
        error.message ||
        "Unable to save product."
      );


      setConnection(
        "OFFLINE"
      );

    }

    finally {

      setButtonLoading(
        "saveProductBtn",
        false
      );

    }

  }


  /* ==========================================================
     COLLECT FORM DATA
     ========================================================== */

  function collectFormData() {

    return {

      id:
        byId("productId")
          ?.value
          .trim() ||
        "",

      productId:
        byId("productId")
          ?.value
          .trim() ||
        "",

      name:
        byId("productName")
          ?.value
          .trim() ||
        "",

      productName:
        byId("productName")
          ?.value
          .trim() ||
        "",

      sku:
        byId("productSku")
          ?.value
          .trim() ||
        "",

      productSku:
        byId("productSku")
          ?.value
          .trim() ||
        "",

      category:
        byId("productCategory")
          ?.value
          .trim() ||
        "",

      brand:
        byId("productBrand")
          ?.value
          .trim() ||
        "",

      unit:
        byId("productUnit")
          ?.value
          .trim() ||
        "PCS",

      price:
        number(
          byId("productPrice")
            ?.value
        ),

      sellingPrice:
        number(
          byId("productPrice")
            ?.value
        ),

      cost:
        number(
          byId("productCost")
            ?.value
        ),

      costPrice:
        number(
          byId("productCost")
            ?.value
        ),

      stock:
        number(
          byId("productStock")
            ?.value
        ),

      reorderLevel:
        number(
          byId("productReorder")
            ?.value
        ),

      status:
        byId("productStatus")
          ?.value
          .trim()
          .toUpperCase() ||
        "ACTIVE",

      description:
        byId("productDescription")
          ?.value
          .trim() ||
        ""

    };

  }


  /* ==========================================================
     VALIDATE PRODUCT
     ========================================================== */

  function validateProduct(
    product
  ) {

    if (!product.name) {

      return {

        valid: false,

        message:
          "Product name is required."

      };

    }


    if (!product.sku) {

      return {

        valid: false,

        message:
          "SKU is required."

      };

    }


    if (!product.category) {

      return {

        valid: false,

        message:
          "Please select a product category."

      };

    }


    if (
      product.price < 0
    ) {

      return {

        valid: false,

        message:
          "Selling price cannot be negative."

      };

    }


    if (
      product.cost < 0
    ) {

      return {

        valid: false,

        message:
          "Cost price cannot be negative."

      };

    }


    if (
      product.stock < 0
    ) {

      return {

        valid: false,

        message:
          "Stock cannot be negative."

      };

    }


    if (
      product.reorderLevel < 0
    ) {

      return {

        valid: false,

        message:
          "Reorder level cannot be negative."

      };

    }


    return {

      valid: true

    };

  }


  /* ==========================================================
     CREATE PRODUCT
     ========================================================== */

  async function createProduct(
    product
  ) {

    if (
      typeof StockFlowAPI.createProduct ===
      "function"
    ) {

      return StockFlowAPI.createProduct(
        product
      );

    }


    if (
      typeof StockFlowAPI.addProduct ===
      "function"
    ) {

      return StockFlowAPI.addProduct(
        product
      );

    }


    if (
      typeof StockFlowAPI.saveProduct ===
      "function"
    ) {

      return StockFlowAPI.saveProduct(
        product
      );

    }


    throw new Error(
      "Create product API method is not available in API.js."
    );

  }


  /* ==========================================================
     UPDATE PRODUCT
     ========================================================== */

  async function updateProduct(
    product
  ) {

    if (
      typeof StockFlowAPI.updateProduct ===
      "function"
    ) {

      return StockFlowAPI.updateProduct(
        product
      );

    }


    if (
      typeof StockFlowAPI.editProduct ===
      "function"
    ) {

      return StockFlowAPI.editProduct(
        product
      );

    }


    if (
      typeof StockFlowAPI.saveProduct ===
      "function"
    ) {

      return StockFlowAPI.saveProduct(
        product
      );

    }


    throw new Error(
      "Update product API method is not available in API.js."
    );

  }


  /* ==========================================================
     DELETE PRODUCT BUTTON
     ========================================================== */

  let productToDelete =
    null;


  async function deleteProduct(
    id
  ) {

    const product =
      allProducts.find(
        (item) =>
          String(item.id) ===
          String(id)
      );


    if (!product) {

      showToast(
        "Product could not be found.",
        "error"
      );

      return;

    }


    productToDelete =
      product;


    setText(
      "deleteProductName",
      product.name ||
      "this product"
    );


    openModal(
      "deleteModal"
    );

  }


  /* ==========================================================
     CONFIRM DELETE
     ========================================================== */

  byId("confirmDeleteBtn")
    ?.addEventListener(
      "click",
      async () => {

        if (
          !productToDelete
        ) {

          return;

        }


        const button =
          byId(
            "confirmDeleteBtn"
          );


        setButtonLoading(
          "confirmDeleteBtn",
          true
        );


        try {

          const response =
            await performDeleteProduct(
              productToDelete
            );


          if (
            response &&
            response.success === false
          ) {

            throw new Error(
              response.message ||
              "Unable to delete product."
            );

          }


          closeModal(
            "deleteModal"
          );


          showToast(
            "Product deleted successfully.",
            "success"
          );


          productToDelete =
            null;


          await loadProducts();


          setConnection(
            "CONNECTED"
          );

        }

        catch (error) {

          console.error(
            "Delete product error:",
            error
          );


          showToast(
            error.message ||
            "Unable to delete product.",
            "error"
          );


          setConnection(
            "OFFLINE"
          );

        }

        finally {

          setButtonLoading(
            "confirmDeleteBtn",
            false
          );

        }

      }
    );


  /* ==========================================================
     DELETE API
     ========================================================== */

  async function performDeleteProduct(
    product
  ) {

    if (
      typeof StockFlowAPI.deleteProduct ===
      "function"
    ) {

      return StockFlowAPI.deleteProduct(
        product.id
      );

    }


    if (
      typeof StockFlowAPI.removeProduct ===
      "function"
    ) {

      return StockFlowAPI.removeProduct(
        product.id
      );

    }


    throw new Error(
      "Delete product API method is not available in API.js."
    );

  }


  /* ==========================================================
     MODAL CONTROLS
     ========================================================== */

  byId("closeProductModalBtn")
    ?.addEventListener(
      "click",
      () => {

        closeModal(
          "productModal"
        );

      }
    );


  byId("cancelProductBtn")
    ?.addEventListener(
      "click",
      () => {

        closeModal(
          "productModal"
        );

      }
    );


  byId("cancelDeleteBtn")
    ?.addEventListener(
      "click",
      () => {

        productToDelete =
          null;

        closeModal(
          "deleteModal"
        );

      }
    );


  byId("closeViewProductBtn")
    ?.addEventListener(
      "click",
      () => {

        closeModal(
          "viewProductModal"
        );

      }
    );


  $$(".modal-backdrop")
    .forEach(
      (backdrop) => {

        backdrop.addEventListener(
          "click",
          () => {

            const modal =
              backdrop.closest(
                ".modal"
              );


            if (modal) {

              closeModal(
                modal.id
              );

            }

          }
        );

      }
    );


  function openModal(
    id
  ) {

    const modal =
      byId(id);


    if (!modal) return;


    modal.classList.add(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );


    document.body.classList.add(
      "modal-open"
    );

  }


  function closeModal(
    id
  ) {

    const modal =
      byId(id);


    if (!modal) return;


    modal.classList.remove(
      "active"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );


    if (
      !$(".modal.active")
    ) {

      document.body.classList.remove(
        "modal-open"
      );

    }

  }


  /* ==========================================================
     ESC KEY
     ========================================================== */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key !==
        "Escape"
      ) {

        return;

      }


      const activeModal =
        $(".modal.active");


      if (
        activeModal
      ) {

        closeModal(
          activeModal.id
        );

      }

    }
  );


  /* ==========================================================
     PAGINATION
     ========================================================== */

  byId("previousPageBtn")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentPage <=
          1
        ) {

          return;

        }


        currentPage--;

        renderProducts(
          filteredProducts
        );

        updatePagination();

      }
    );


  byId("nextPageBtn")
    ?.addEventListener(
      "click",
      () => {

        const totalPages =
          Math.max(
            1,
            Math.ceil(
              filteredProducts.length /
              PAGE_SIZE
            )
          );


        if (
          currentPage >=
          totalPages
        ) {

          return;

        }


        currentPage++;

        renderProducts(
          filteredProducts
        );

        updatePagination();

      }
    );


  function updatePagination() {

    const total =
      filteredProducts.length;


    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total /
          PAGE_SIZE
        )
      );


    if (
      currentPage >
      totalPages
    ) {

      currentPage =
        totalPages;

    }


    const start =
      total === 0
        ? 0
        : (
            (
              currentPage -
              1
            ) *
            PAGE_SIZE
          ) + 1;


    const end =
      Math.min(
        currentPage *
        PAGE_SIZE,
        total
      );


    const info =
      byId(
        "paginationInfo"
      );


    if (info) {

      info.textContent =
        total === 0

          ? "Showing 0 of 0 products"

          : `Showing ${start}-${end} of ${total} products`;

    }


    setText(
      "currentPage",
      currentPage
    );


    const previous =
      byId(
        "previousPageBtn"
      );


    const next =
      byId(
        "nextPageBtn"
      );


    if (previous) {

      previous.disabled =
        currentPage <= 1;

    }


    if (next) {

      next.disabled =
        currentPage >=
        totalPages;

    }

  }


  /* ==========================================================
     LOADING TABLE
     ========================================================== */

  function showTableLoading() {

    const tbody =
      byId(
        "productsTableBody"
      );


    const empty =
      byId(
        "emptyProducts"
      );


    if (empty) {

      empty.classList.add(
        "hidden"
      );

    }


    if (!tbody) return;


    tbody.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="table-loading"
        >

          <div class="loading-spinner"></div>

          <span>
            Loading products...
          </span>

        </td>

      </tr>

    `;

  }


  /* ==========================================================
     FORM MESSAGES
     ========================================================== */

  function clearFormMessages() {

    const error =
      byId(
        "productFormError"
      );


    const success =
      byId(
        "productFormSuccess"
      );


    if (error) {

      error.classList.add(
        "hidden"
      );


      const span =
        error.querySelector(
          "span"
        );


      if (span) {

        span.textContent =
          "";

      }

    }


    if (success) {

      success.classList.add(
        "hidden"
      );


      const span =
        success.querySelector(
          "span"
        );


      if (span) {

        span.textContent =
          "";

      }

    }

  }


  function showFormError(
    message
  ) {

    const box =
      byId(
        "productFormError"
      );


    if (!box) {

      showToast(
        message,
        "error"
      );

      return;

    }


    const span =
      box.querySelector(
        "span"
      );


    if (span) {

      span.textContent =
        message;

    }


    box.classList.remove(
      "hidden"
    );

  }


  /* ==========================================================
     TOAST
     ========================================================== */

  function showToast(
    message,
    type = "info"
  ) {

    const container =
      byId(
        "toastContainer"
      );


    if (!container) {

      return;

    }


    const toast =
      document.createElement(
        "div"
      );


    toast.className =
      `toast toast-${type}`;


    let icon =
      "fa-circle-info";


    if (
      type ===
      "success"
    ) {

      icon =
        "fa-circle-check";

    }

    else if (
      type ===
      "error"
    ) {

      icon =
        "fa-circle-exclamation";

    }

    else if (
      type ===
      "warning"
    ) {

      icon =
        "fa-triangle-exclamation";

    }


    toast.innerHTML = `

      <i class="fa-solid ${icon}"></i>

      <span>
        ${esc(message)}
      </span>

      <button
        type="button"
        class="toast-close"
        aria-label="Close notification"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>

    `;


    container.appendChild(
      toast
    );


    requestAnimationFrame(
      () => {

        toast.classList.add(
          "show"
        );

      }
    );


    toast
      .querySelector(
        ".toast-close"
      )
      ?.addEventListener(
        "click",
        () => {

          removeToast(
            toast
          );

        }
      );


    setTimeout(
      () => {

        removeToast(
          toast
        );

      },
      4500
    );

  }


  function removeToast(
    toast
  ) {

    if (!toast) return;


    toast.classList.remove(
      "show"
    );


    setTimeout(
      () => {

        toast.remove();

      },
      250
    );

  }


  /* ==========================================================
     BUTTON LOADING
     ========================================================== */

  function setButtonLoading(
    id,
    loading
  ) {

    const button =
      byId(id);


    if (!button) return;


    if (
      loading
    ) {

      button.dataset.originalHtml =
        button.innerHTML;


      button.disabled =
        true;


      button.innerHTML = `

        <span class="button-spinner"></span>

        <span>
          Processing...
        </span>

      `;

    }

    else {

      button.disabled =
        false;


      if (
        button.dataset.originalHtml
      ) {

        button.innerHTML =
          button.dataset.originalHtml;

      }

    }

  }


  /* ==========================================================
     SET TEXT
     ========================================================== */

  function setText(
    id,
    value
  ) {

    const element =
      byId(id);


    if (
      element
    ) {

      element.textContent =
        value ?? "";

    }

  }


  /* ==========================================================
     SET FORM VALUE
     ========================================================== */

  function setFormValue(
    id,
    value
  ) {

    const element =
      byId(id);


    if (!element) return;


    element.value =
      value ?? "";

  }


  /* ==========================================================
     INITIAL CONNECTION CHECK
     ========================================================== */

  setConnection(
    "CONNECTED"
  );

});
