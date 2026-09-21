/* ============================================================
   STOCKFLOW | INVENTORY.JS
   ============================================================
   Inventory Monitoring Module

   Connected Modules:
   - Authentication
   - Products
   - Stock In
   - Stock Out
   - Categories
   - Suppliers
   - Google Apps Script API
   - Firebase-ready API layer

   HTML IDs USED:
   - pc
   - ts
   - ls
   - os
   - rows
   - alert

   API:
   - StockFlowAuth.requireAuth()
   - StockFlowAPI.listProducts()
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";


    /* ========================================================
       DOM HELPERS
       ======================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const rows =
        $("rows");


    const alertBox =
        $("alert");


    const productCount =
        $("pc");


    const totalStock =
        $("ts");


    const lowStockCount =
        $("ls");


    const outOfStockCount =
        $("os");


    /* ========================================================
       STATE
       ======================================================== */

    let inventoryProducts = [];

    let isLoading = false;

    let refreshTimer = null;


    /* ========================================================
       HTML ESCAPE
       ======================================================== */

    function esc(value) {

        return String(
            value ?? ""
        )
        .replace(
            /[&<>"']/g,
            character => ({

                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                '"':
                    "&quot;",

                "'":
                    "&#039;"

            })[character]
        );

    }


    /* ========================================================
       NUMBER FORMAT
       ======================================================== */

    function formatNumber(value) {

        const number =
            Number(value);

        if (
            Number.isNaN(number)
        ) {

            return "0";

        }

        return number.toLocaleString();

    }


    /* ========================================================
       NORMALIZE NUMBER
       ======================================================== */

    function numberValue(
        value,
        fallback = 0
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return fallback;

        }


        const number =
            Number(
                String(value)
                    .replace(/,/g, "")
            );


        return Number.isFinite(number)
            ? number
            : fallback;

    }


    /* ========================================================
       NORMALIZE PRODUCT DATA
       ======================================================== */

    function normalizeProduct(
        product
    ) {

        if (!product) {

            return {

                sku: "",
                name: "Unnamed Product",
                category: "-",
                supplier: "-",
                stock: 0,
                reorder: 5

            };

        }


        const sku =
            product.SKU ??
            product.sku ??
            product.PRODUCT_SKU ??
            product.productSku ??
            "";


        const name =
            product.NAME ??
            product.name ??
            product.PRODUCT_NAME ??
            product.productName ??
            product.PRODUCT ??
            product.product ??
            "Unnamed Product";


        const category =
            product.CATEGORY ??
            product.category ??
            product.CATEGORY_NAME ??
            product.categoryName ??
            "-";


        const supplier =
            product.SUPPLIER ??
            product.supplier ??
            product.SUPPLIER_NAME ??
            product.supplierName ??
            "-";


        const stock =
            numberValue(
                product.STOCK ??
                product.stock ??
                product.QUANTITY ??
                product.quantity ??
                product.QTY ??
                product.qty ??
                0
            );


        const reorder =
            numberValue(
                product.REORDER_LEVEL ??
                product.reorderLevel ??
                product.REORDER ??
                product.reorder ??
                5
            );


        return {

            sku:
                String(sku),

            name:
                String(name),

            category:
                String(category),

            supplier:
                String(supplier),

            stock:
                stock,

            reorder:
                reorder

        };

    }


    /* ========================================================
       PRODUCT STATUS
       ======================================================== */

    function getProductStatus(
        stock,
        reorder
    ) {

        const quantity =
            numberValue(stock);


        const reorderLevel =
            numberValue(
                reorder,
                5
            );


        if (quantity <= 0) {

            return {

                key:
                    "out",

                label:
                    "OUT OF STOCK",

                icon:
                    "fa-circle-xmark"

            };

        }


        if (
            quantity <=
            reorderLevel
        ) {

            return {

                key:
                    "low",

                label:
                    "LOW STOCK",

                icon:
                    "fa-triangle-exclamation"

            };

        }


        return {

            key:
                "active",

            label:
                "IN STOCK",

            icon:
                "fa-circle-check"

        };

    }


    /* ========================================================
       STATUS BADGE
       ======================================================== */

    function statusBadge(
        stock,
        reorder
    ) {

        const status =
            getProductStatus(
                stock,
                reorder
            );


        return `

            <span class="badge ${status.key}">

                <i class="fa-solid ${status.icon}"
                   aria-hidden="true">
                </i>

                ${esc(status.label)}

            </span>

        `;

    }


    /* ========================================================
       ALERT
       ======================================================== */

    function showAlert(
        message,
        type = "error"
    ) {

        if (!alertBox) {
            return;
        }


        alertBox.textContent =
            message || "";


        alertBox.className =
            "sf-alert";


        if (message) {

            alertBox.classList.add(
                "show"
            );


            alertBox.classList.add(
                type
            );

        }

    }


    /* ========================================================
       CLEAR ALERT
       ======================================================== */

    function clearAlert() {

        if (!alertBox) {
            return;
        }


        alertBox.textContent =
            "";


        alertBox.className =
            "sf-alert";

    }


    /* ========================================================
       LOADING STATE
       ======================================================== */

    function showLoading() {

        if (!rows) {
            return;
        }


        rows.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="sf-empty inventory-loading"
                >

                    <div class="inventory-loading-icon">

                        <i
                            class="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        ></i>

                    </div>

                    <strong>
                        Loading inventory...
                    </strong>

                    <span>
                        Retrieving the latest stock information.
                    </span>

                </td>

            </tr>

        `;

    }


    /* ========================================================
       EMPTY STATE
       ======================================================== */

    function renderEmpty() {

        if (!rows) {
            return;
        }


        rows.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="sf-empty"
                >

                    <div class="inventory-empty-icon">

                        <i
                            class="fa-solid fa-box-open"
                            aria-hidden="true"
                        ></i>

                    </div>

                    <strong>
                        No products found
                    </strong>

                    <span>
                        Add products to start monitoring
                        your inventory.
                    </span>

                    <a
                        href="products.html"
                        class="sf-btn"
                    >
                        <i
                            class="fa-solid fa-plus"
                            aria-hidden="true"
                        ></i>

                        Add Product
                    </a>

                </td>

            </tr>

        `;

    }


    /* ========================================================
       ERROR STATE
       ======================================================== */

    function renderError(
        message
    ) {

        if (!rows) {
            return;
        }


        rows.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="sf-empty inventory-error"
                >

                    <div class="inventory-error-icon">

                        <i
                            class="fa-solid fa-triangle-exclamation"
                            aria-hidden="true"
                        ></i>

                    </div>

                    <strong>
                        Unable to load inventory
                    </strong>

                    <span>
                        ${esc(
                            message ||
                            "Something went wrong while loading inventory."
                        )}
                    </span>

                    <button
                        type="button"
                        class="sf-btn"
                        data-refresh-inventory
                    >

                        <i
                            class="fa-solid fa-rotate-right"
                            aria-hidden="true"
                        ></i>

                        Try Again

                    </button>

                </td>

            </tr>

        `;


        bindRefreshButtons();

    }


    /* ========================================================
       UPDATE SUMMARY
       ======================================================== */

    function updateSummary(
        products
    ) {

        let total =
            0;

        let low =
            0;

        let out =
            0;


        products.forEach(
            product => {

                const stock =
                    numberValue(
                        product.stock
                    );


                const reorder =
                    numberValue(
                        product.reorder,
                        5
                    );


                total +=
                    stock;


                if (
                    stock <= 0
                ) {

                    out++;

                }

                else if (
                    stock <= reorder
                ) {

                    low++;

                }

            }
        );


        if (productCount) {

            productCount.textContent =
                formatNumber(
                    products.length
                );

        }


        if (totalStock) {

            totalStock.textContent =
                formatNumber(
                    total
                );

        }


        if (lowStockCount) {

            lowStockCount.textContent =
                formatNumber(
                    low
                );

        }


        if (outOfStockCount) {

            outOfStockCount.textContent =
                formatNumber(
                    out
                );

        }

    }


    /* ========================================================
       RENDER INVENTORY TABLE
       ======================================================== */

    function renderInventory(
        products
    ) {

        if (!rows) {
            return;
        }


        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {

            updateSummary([]);

            renderEmpty();

            return;

        }


        const normalizedProducts =
            products.map(
                normalizeProduct
            );


        inventoryProducts =
            normalizedProducts;


        updateSummary(
            normalizedProducts
        );


        rows.innerHTML =
            normalizedProducts
                .map(
                    product => {

                        const status =
                            getProductStatus(
                                product.stock,
                                product.reorder
                            );


                        return `

                            <tr
                                data-status="${esc(status.key)}"
                            >

                                <!-- SKU -->

                                <td>

                                    <span class="inventory-sku">

                                        ${esc(
                                            product.sku ||
                                            "—"
                                        )}

                                    </span>

                                </td>


                                <!-- PRODUCT -->

                                <td>

                                    <div class="inventory-product-cell">

                                        <div class="inventory-product-icon">

                                            <i
                                                class="fa-solid fa-box"
                                                aria-hidden="true"
                                            ></i>

                                        </div>

                                        <div class="inventory-product-info">

                                            <strong>
                                                ${esc(
                                                    product.name
                                                )}
                                            </strong>

                                            <small>
                                                ${esc(
                                                    product.sku ||
                                                    "No SKU"
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                </td>


                                <!-- CATEGORY -->

                                <td>

                                    <span class="inventory-category">

                                        ${esc(
                                            product.category ||
                                            "—"
                                        )}

                                    </span>

                                </td>


                                <!-- SUPPLIER -->

                                <td>

                                    <span class="inventory-supplier">

                                        ${esc(
                                            product.supplier ||
                                            "—"
                                        )}

                                    </span>

                                </td>


                                <!-- STOCK -->

                                <td>

                                    <strong
                                        class="inventory-stock ${status.key}"
                                    >

                                        ${formatNumber(
                                            product.stock
                                        )}

                                    </strong>

                                </td>


                                <!-- REORDER -->

                                <td>

                                    <span class="inventory-reorder">

                                        ${formatNumber(
                                            product.reorder
                                        )}

                                    </span>

                                </td>


                                <!-- STATE -->

                                <td>

                                    ${statusBadge(
                                        product.stock,
                                        product.reorder
                                    )}

                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");

    }


    /* ========================================================
       LOAD INVENTORY
       ======================================================== */

    async function loadInventory() {

        if (isLoading) {
            return false;
        }


        isLoading =
            true;


        clearAlert();


        showLoading();


        try {

            /* ------------------------------------------------
               AUTHENTICATION
               ------------------------------------------------ */

            const currentUser =
                await StockFlowAuth.requireAuth();


            if (!currentUser) {

                return false;

            }


            /* ------------------------------------------------
               API REQUEST
               ------------------------------------------------ */

            if (
                !window.StockFlowAPI ||
                typeof StockFlowAPI.listProducts !==
                    "function"
            ) {

                throw new Error(
                    "StockFlow API is not available."
                );

            }


            const response =
                await StockFlowAPI.listProducts();


            /* ------------------------------------------------
               API VALIDATION
               ------------------------------------------------ */

            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to load inventory."
                );

            }


            /* ------------------------------------------------
               SUPPORT MULTIPLE API RESPONSE FORMATS
               ------------------------------------------------ */

            const products =
                Array.isArray(
                    response.products
                )

                    ? response.products

                    : Array.isArray(
                        response.data
                    )

                        ? response.data

                        : Array.isArray(
                            response.rows
                        )

                            ? response.rows

                            : Array.isArray(
                                response.result
                            )

                                ? response.result

                                : [];


            /* ------------------------------------------------
               SAVE DATA
               ------------------------------------------------ */

            inventoryProducts =
                products.map(
                    normalizeProduct
                );


            /* ------------------------------------------------
               RENDER
               ------------------------------------------------ */

            renderInventory(
                inventoryProducts
            );


            /* ------------------------------------------------
               SUCCESS MESSAGE
               ------------------------------------------------ */

            if (
                inventoryProducts.length > 0
            ) {

                showAlert(
                    `Inventory updated. ${formatNumber(inventoryProducts.length)} product${inventoryProducts.length === 1 ? "" : "s"} loaded.`,
                    "success"
                );


                /*
                 * Automatically hide successful
                 * message after a short delay.
                 */

                window.setTimeout(
                    () => {

                        if (
                            alertBox &&
                            alertBox.classList.contains(
                                "success"
                            )
                        ) {

                            clearAlert();

                        }

                    },
                    3000
                );

            }


            return true;

        }

        catch (error) {

            console.error(
                "StockFlow inventory error:",
                error
            );


            inventoryProducts =
                [];


            updateSummary([]);


            renderError(
                error.message ||
                "Unable to load inventory."
            );


            showAlert(
                error.message ||
                "Unable to load inventory.",
                "error"
            );


            return false;

        }

        finally {

            isLoading =
                false;

        }

    }


    /* ========================================================
       REFRESH BUTTONS
       ======================================================== */

    function bindRefreshButtons() {

        const buttons =
            document.querySelectorAll(
                "[data-refresh-inventory]"
            );


        buttons.forEach(
            button => {

                if (
                    button.dataset.bound ===
                    "true"
                ) {

                    return;

                }


                button.dataset.bound =
                    "true";


                button.addEventListener(
                    "click",
                    () => {

                        loadInventory();

                    }
                );

            }
        );

    }


    /* ========================================================
       OPTIONAL REFRESH BUTTON
       ======================================================== */

    bindRefreshButtons();


    /* ========================================================
       OPTIONAL MENU BUTTON
       ======================================================== */

    const menuButton =
        document.querySelector(
            "[data-menu]"
        );


    const sidebar =
        document.querySelector(
            ".sf-side"
        );


    if (
        menuButton &&
        sidebar
    ) {

        menuButton.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );

            }
        );

    }


    /* ========================================================
       CLOSE MOBILE SIDEBAR
       ======================================================== */

    document.addEventListener(
        "click",
        event => {

            if (
                window.innerWidth > 767
            ) {

                return;

            }


            if (
                !sidebar ||
                !sidebar.classList.contains(
                    "open"
                )
            ) {

                return;

            }


            const clickedInsideSidebar =
                sidebar.contains(
                    event.target
                );


            const clickedMenu =
                menuButton &&
                menuButton.contains(
                    event.target
                );


            if (
                !clickedInsideSidebar &&
                !clickedMenu
            ) {

                sidebar.classList.remove(
                    "open"
                );

            }

        }
    );


    /* ========================================================
       ONLINE EVENT
       ======================================================== */

    window.addEventListener(
        "online",
        () => {

            loadInventory();

        }
    );


    /* ========================================================
       OFFLINE EVENT
       ======================================================== */

    window.addEventListener(
        "offline",
        () => {

            showAlert(
                "Your browser is offline. Inventory data may be unavailable.",
                "warning"
            );

        }
    );


    /* ========================================================
       AUTO REFRESH
       ======================================================== */

    function startAutoRefresh() {

        if (refreshTimer) {

            clearInterval(
                refreshTimer
            );

        }


        refreshTimer =
            window.setInterval(
                () => {

                    if (
                        document.visibilityState ===
                        "visible"
                    ) {

                        loadInventory();

                    }

                },
                60000
            );

    }


    /* ========================================================
       TAB VISIBILITY
       ======================================================== */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                /*
                 * Refresh when user returns
                 * to the inventory page.
                 */

                loadInventory();

            }

        }
    );


    /* ========================================================
       EXPOSE MODULE
       ======================================================== */

    window.StockFlowInventory = {

        load:
            loadInventory,

        refresh:
            loadInventory,

        getProducts:
            () => [
                ...inventoryProducts
            ],

        getSummary:
            () => {

                let total = 0;
                let low = 0;
                let out = 0;


                inventoryProducts.forEach(
                    product => {

                        const stock =
                            numberValue(
                                product.stock
                            );


                        const reorder =
                            numberValue(
                                product.reorder,
                                5
                            );


                        total +=
                            stock;


                        if (
                            stock <= 0
                        ) {

                            out++;

                        }

                        else if (
                            stock <= reorder
                        ) {

                            low++;

                        }

                    }
                );


                return {

                    products:
                        inventoryProducts.length,

                    totalUnits:
                        total,

                    lowStock:
                        low,

                    outOfStock:
                        out

                };

            }

    };


    /* ========================================================
       INITIAL LOAD
       ======================================================== */

    await loadInventory();


    /* ========================================================
       START AUTO REFRESH
       ======================================================== */

    startAutoRefresh();

});
