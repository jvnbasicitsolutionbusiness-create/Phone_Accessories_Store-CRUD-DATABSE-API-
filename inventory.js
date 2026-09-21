/* ============================================================
   STOCKFLOW | INVENTORY.JS
   ============================================================
   Inventory Monitoring Module

   FIXED VERSION
   ------------------------------------------------------------
   FEATURES
   - Authentication protection
   - Employee account UI
   - System connection status
   - Working notification panel
   - Mobile sidebar
   - Product inventory loading
   - Product statistics
   - Low-stock detection
   - Out-of-stock detection
   - Loading states
   - Empty states
   - Error states
   - Manual refresh
   - Auto refresh
   - Online/offline detection
   - API response compatibility
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";


    /* ========================================================
       DOM HELPERS
       ======================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const qs = (selector) =>
        document.querySelector(selector);


    const qsa = (selector) =>
        document.querySelectorAll(selector);


    /* ========================================================
       MAIN ELEMENTS
       ======================================================== */

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

    let notificationBound = false;

    let sidebarBound = false;


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

        const parsed =
            Number(
                String(value ?? "")
                    .replace(/,/g, "")
            );


        if (
            !Number.isFinite(parsed)
        ) {

            return "0";

        }


        return parsed.toLocaleString();

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


        const parsed =
            Number(
                String(value)
                    .replace(/,/g, "")
            );


        return Number.isFinite(parsed)
            ? parsed
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

                id: "",

                sku: "",

                name:
                    "Unnamed Product",

                category:
                    "-",

                supplier:
                    "-",

                stock:
                    0,

                reorder:
                    5

            };

        }


        const id =
            product.id ??
            product.ID ??
            product.productId ??
            product.PRODUCT_ID ??
            product.uid ??
            "";


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
                product.CURRENT_STOCK ??
                product.currentStock ??
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

            id:
                String(id),

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
            numberValue(
                stock
            );


        const reorderLevel =
            numberValue(
                reorder,
                5
            );


        if (
            quantity <= 0
        ) {

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

                <i
                    class="fa-solid ${status.icon}"
                    aria-hidden="true"
                ></i>

                ${esc(
                    status.label
                )}

            </span>

        `;

    }


    /* ========================================================
       SYSTEM CONNECTION STATUS
       ======================================================== */

    function setSystemConnection(
        connected = true
    ) {

        const text =
            connected
                ? "SYSTEM CONNECTED"
                : "SYSTEM OFFLINE";


        /* ----------------------------------------------------
           Common connection elements
           ---------------------------------------------------- */

        const connectionIds = [

            "connectionStatus",

            "connectionTitle",

            "connectionMessage",

            "footerSystemStatus",

            "systemStatus",

            "systemConnectionStatus"

        ];


        connectionIds.forEach(
            id => {

                const element =
                    $(id);


                if (!element) {
                    return;
                }


                /*
                 * Do not overwrite the whole connection card.
                 * Only update text-bearing elements.
                 */

                if (
                    element.tagName ===
                    "INPUT"
                ) {

                    return;

                }


                if (
                    element.children.length === 0
                ) {

                    element.textContent =
                        text;

                    return;

                }


                const span =
                    element.querySelector(
                        "span:last-child"
                    );


                if (span) {

                    span.textContent =
                        text;

                    return;

                }


                const textNode =
                    Array.from(
                        element.childNodes
                    )
                    .find(
                        node =>
                            node.nodeType ===
                            Node.TEXT_NODE &&
                            node.textContent.trim()
                    );


                if (textNode) {

                    textNode.textContent =
                        ` ${text}`;

                }

            }
        );


        /* ----------------------------------------------------
           Connection badges
           ---------------------------------------------------- */

        const badges =
            qsa(
                "#connectionBadge, .connection-status, .system-status, .connection-badge"
            );


        badges.forEach(
            badge => {

                badge.classList.remove(
                    "connected",
                    "offline",
                    "online",
                    "system-connected",
                    "system-offline"
                );


                if (connected) {

                    badge.classList.add(
                        "connected",
                        "online",
                        "system-connected"
                    );

                }

                else {

                    badge.classList.add(
                        "offline",
                        "system-offline"
                    );

                }


                const badgeText =
                    badge.querySelector(
                        "span:last-child"
                    );


                if (badgeText) {

                    badgeText.textContent =
                        text;

                }

            }
        );


        /* ----------------------------------------------------
           Body-level system state
           ---------------------------------------------------- */

        document.body.classList.toggle(
            "system-online",
            connected
        );


        document.body.classList.toggle(
            "system-offline",
            !connected
        );

    }


    /* ========================================================
       REMOVE DUPLICATE BRAND MARK
       ======================================================== */

    function normalizeBrandLogo() {

        /*
         * The Inventory page should display only the
         * SF / StockFlow logo.
         *
         * If an old standalone S mark exists beside the
         * proper SF logo, hide the old mark.
         */

        const brandContainers =
            qsa(
                ".sf-brand, .sidebar-brand, .brand, .brand-link, .logo-container"
            );


        brandContainers.forEach(
            container => {

                const logos =
                    Array.from(
                        container.querySelectorAll(
                            "img, .brand-logo, .logo, .brand-mark, .logo-mark"
                        )
                    );


                if (
                    logos.length < 2
                ) {

                    return;

                }


                const sfLogo =
                    logos.find(
                        logo => {

                            const text =
                                (
                                    logo.alt ||
                                    logo.getAttribute(
                                        "aria-label"
                                    ) ||
                                    logo.textContent ||
                                    ""
                                )
                                .toLowerCase();


                            const src =
                                (
                                    logo.getAttribute(
                                        "src"
                                    ) ||
                                    ""
                                )
                                .toLowerCase();


                            return (
                                text.includes("sf") ||
                                text.includes("stockflow") ||
                                src.includes("sf") ||
                                src.includes("stockflow")
                            );

                        }
                    );


                if (!sfLogo) {

                    return;

                }


                logos.forEach(
                    logo => {

                        if (
                            logo ===
                            sfLogo
                        ) {

                            return;

                        }


                        const text =
                            (
                                logo.alt ||
                                logo.getAttribute(
                                    "aria-label"
                                ) ||
                                logo.textContent ||
                                ""
                            )
                            .trim()
                            .toUpperCase();


                        const src =
                            (
                                logo.getAttribute(
                                    "src"
                                ) ||
                                ""
                            )
                            .toLowerCase();


                        /*
                         * Hide obvious old S logo.
                         */

                        if (
                            text === "S" ||
                            text === "STOCKFLOW S" ||
                            src.endsWith(
                                "/s.svg"
                            ) ||
                            src.includes(
                                "logo-s"
                            )
                        ) {

                            logo.style.display =
                                "none";

                        }

                    }
                );

            }
        );

    }


    /* ========================================================
       NOTIFICATION SYSTEM
       ======================================================== */

    function initializeNotifications() {

        if (
            notificationBound
        ) {

            return;

        }


        notificationBound =
            true;


        /*
         * Support multiple possible IDs so the same
         * notification controller works with Dashboard
         * and Inventory markup.
         */

        const notificationButton =
            qs(
                "#notificationBtn, #notificationButton, [data-notifications], [data-notification-btn]"
            );


        const notificationPanel =
            qs(
                "#notificationPanel, .notification-panel"
            );


        const closeButton =
            qs(
                "#closeNotificationBtn, #notificationCloseBtn, .notification-close"
            );


        if (
            !notificationButton &&
            !notificationPanel
        ) {

            return;

        }


        /* ----------------------------------------------------
           OPEN / CLOSE
           ---------------------------------------------------- */

        function openNotifications(
            event
        ) {

            if (event) {

                event.preventDefault();

                event.stopPropagation();

            }


            if (!notificationPanel) {

                return;

            }


            notificationPanel.classList.add(
                "show"
            );


            notificationPanel.classList.add(
                "active"
            );


            notificationPanel.setAttribute(
                "aria-hidden",
                "false"
            );


            if (notificationButton) {

                notificationButton.classList.add(
                    "active"
                );


                notificationButton.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

        }


        function closeNotifications(
            event
        ) {

            if (event) {

                event.preventDefault();

                event.stopPropagation();

            }


            if (!notificationPanel) {

                return;

            }


            notificationPanel.classList.remove(
                "show"
            );


            notificationPanel.classList.remove(
                "active"
            );


            notificationPanel.setAttribute(
                "aria-hidden",
                "true"
            );


            if (notificationButton) {

                notificationButton.classList.remove(
                    "active"
                );


                notificationButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        }


        function toggleNotifications(
            event
        ) {

            if (event) {

                event.preventDefault();

                event.stopPropagation();

            }


            if (
                !notificationPanel
            ) {

                return;

            }


            const isOpen =
                notificationPanel.classList.contains(
                    "show"
                ) ||
                notificationPanel.classList.contains(
                    "active"
                );


            if (isOpen) {

                closeNotifications();

            }

            else {

                openNotifications();

            }

        }


        /* ----------------------------------------------------
           BUTTON
           ---------------------------------------------------- */

        if (
            notificationButton
        ) {

            notificationButton.setAttribute(
                "aria-expanded",
                "false"
            );


            notificationButton.addEventListener(
                "click",
                toggleNotifications
            );

        }


        /* ----------------------------------------------------
           CLOSE BUTTON
           ---------------------------------------------------- */

        if (
            closeButton
        ) {

            closeButton.addEventListener(
                "click",
                closeNotifications
            );

        }


        /* ----------------------------------------------------
           CLICK OUTSIDE
           ---------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                if (
                    !notificationPanel
                ) {

                    return;

                }


                const clickedPanel =
                    notificationPanel.contains(
                        event.target
                    );


                const clickedButton =
                    notificationButton &&
                    notificationButton.contains(
                        event.target
                    );


                if (
                    !clickedPanel &&
                    !clickedButton
                ) {

                    closeNotifications();

                }

            }
        );


        /* ----------------------------------------------------
           ESCAPE
           ---------------------------------------------------- */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                closeNotifications();

            }
        );

    }


    /* ========================================================
       NOTIFICATION DATA
       ======================================================== */

    function updateNotificationBadge() {

        const low =
            inventoryProducts.filter(
                product =>
                    numberValue(
                        product.stock
                    ) > 0 &&
                    numberValue(
                        product.stock
                    ) <=
                    numberValue(
                        product.reorder,
                        5
                    )
            ).length;


        const out =
            inventoryProducts.filter(
                product =>
                    numberValue(
                        product.stock
                    ) <= 0
            ).length;


        const total =
            low + out;


        const badges =
            qsa(
                "#notificationBadge, .notification-dot, .notification-count, [data-notification-count]"
            );


        badges.forEach(
            badge => {

                if (
                    total > 0
                ) {

                    badge.textContent =
                        total > 99
                            ? "99+"
                            : String(total);

                    badge.classList.add(
                        "has-notifications"
                    );


                    badge.style.display =
                        "";

                }

                else {

                    badge.textContent =
                        "";

                    badge.classList.remove(
                        "has-notifications"
                    );


                    /*
                     * Keep the dot hidden when
                     * there are no inventory alerts.
                     */

                    if (
                        badge.classList.contains(
                            "notification-dot"
                        )
                    ) {

                        badge.style.display =
                            "none";

                    }

                }

            }
        );

    }


    /* ========================================================
       REFRESH NOTIFICATION CONTENT
       ======================================================== */

    function updateNotificationContent() {

        const list =
            qs(
                "#notificationList, .notification-list"
            );


        if (!list) {

            return;

        }


        const lowProducts =
            inventoryProducts.filter(
                product =>
                    numberValue(
                        product.stock
                    ) > 0 &&
                    numberValue(
                        product.stock
                    ) <=
                    numberValue(
                        product.reorder,
                        5
                    )
            );


        const outProducts =
            inventoryProducts.filter(
                product =>
                    numberValue(
                        product.stock
                    ) <= 0
            );


        const notifications = [];


        outProducts.forEach(
            product => {

                notifications.push({

                    type:
                        "danger",

                    icon:
                        "fa-circle-xmark",

                    title:
                        "Out of stock",

                    message:
                        `${product.name} has no available stock.`

                });

            }
        );


        lowProducts.forEach(
            product => {

                notifications.push({

                    type:
                        "warning",

                    icon:
                        "fa-triangle-exclamation",

                    title:
                        "Low stock",

                    message:
                        `${product.name} is at ${formatNumber(product.stock)} unit${product.stock === 1 ? "" : "s"}.`

                });

            }
        );


        if (
            notifications.length === 0
        ) {

            list.innerHTML = `

                <div class="notification-empty">

                    <i
                        class="fa-solid fa-circle-check"
                        aria-hidden="true"
                    ></i>

                    <strong>
                        All caught up
                    </strong>

                    <span>
                        No inventory alerts at the moment.
                    </span>

                </div>

            `;


            return;

        }


        list.innerHTML =
            notifications
                .slice(0, 20)
                .map(
                    notification => `

                        <div class="notification-item ${esc(notification.type)}">

                            <div class="notification-icon">

                                <i
                                    class="fa-solid ${esc(notification.icon)}"
                                    aria-hidden="true"
                                ></i>

                            </div>

                            <div class="notification-content">

                                <strong>
                                    ${esc(
                                        notification.title
                                    )}
                                </strong>

                                <span>
                                    ${esc(
                                        notification.message
                                    )}
                                </span>

                            </div>

                        </div>

                    `
                )
                .join("");

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


        if (
            message
        ) {

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


        updateNotificationBadge();

        updateNotificationContent();

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

            inventoryProducts =
                [];


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

        if (
            isLoading
        ) {

            return false;

        }


        isLoading =
            true;


        clearAlert();


        showLoading();


        setSystemConnection(
            true
        );


        try {

            /* ------------------------------------------------
               AUTHENTICATION
               ------------------------------------------------ */

            if (
                typeof StockFlowAuth ===
                "undefined"
            ) {

                throw new Error(
                    "StockFlow authentication module is not available."
                );

            }


            const currentUser =
                await StockFlowAuth.requireAuth();


            if (!currentUser) {

                return false;

            }


            /*
             * Keep the registered employee account.
             * Do NOT replace the current user with an admin.
             */

            if (
                typeof StockFlowAuth.bindUserUI ===
                "function"
            ) {

                StockFlowAuth.bindUserUI(
                    currentUser
                );

            }


            /* ------------------------------------------------
               API REQUEST
               ------------------------------------------------ */

            if (
                !window.StockFlowAPI
            ) {

                throw new Error(
                    "StockFlow API is not available."
                );

            }


            let response;


            /*
             * Preferred method.
             */

            if (
                typeof StockFlowAPI.listProducts ===
                "function"
            ) {

                response =
                    await StockFlowAPI.listProducts();

            }

            /*
             * Compatibility fallback.
             */

            else if (
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

            else {

                throw new Error(
                    "Products API method is not available."
                );

            }


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

                                : Array.isArray(
                                    response.items
                                )

                                    ? response.items

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
               CONNECTION STATUS
               ------------------------------------------------ */

            setSystemConnection(
                true
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


            setSystemConnection(
                false
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
            qsa(
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
       SIDEBAR
       ======================================================== */

    function initializeSidebar() {

        if (
            sidebarBound
        ) {

            return;

        }


        sidebarBound =
            true;


        const menuButton =
            qs(
                "[data-menu], #mobileMenuBtn, .mobile-menu"
            );


        const sidebar =
            qs(
                ".sf-side, #sidebar, .sidebar"
            );


        const overlay =
            qs(
                "#sidebarOverlay, .sidebar-overlay"
            );


        if (
            menuButton &&
            sidebar
        ) {

            menuButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();


                    sidebar.classList.toggle(
                        "open"
                    );


                    document.body.classList.toggle(
                        "sidebar-open"
                    );


                    if (
                        overlay
                    ) {

                        overlay.classList.toggle(
                            "show"
                        );

                    }

                }
            );

        }


        if (
            overlay
        ) {

            overlay.addEventListener(
                "click",
                () => {

                    sidebar?.classList.remove(
                        "open"
                    );


                    document.body.classList.remove(
                        "sidebar-open"
                    );


                    overlay.classList.remove(
                        "show"
                    );

                }
            );

        }


        document.addEventListener(
            "click",
            event => {

                if (
                    window.innerWidth > 900
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


                    document.body.classList.remove(
                        "sidebar-open"
                    );


                    overlay?.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    /* ========================================================
       ONLINE EVENT
       ======================================================== */

    window.addEventListener(
        "online",
        () => {

            setSystemConnection(
                true
            );


            loadInventory();

        }
    );


    /* ========================================================
       OFFLINE EVENT
       ======================================================== */

    window.addEventListener(
        "offline",
        () => {

            setSystemConnection(
                false
            );


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

        if (
            refreshTimer
        ) {

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

                let total =
                    0;

                let low =
                    0;

                let out =
                    0;


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
                            stock <=
                            reorder
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

            },

        refreshNotifications:
            () => {

                updateNotificationBadge();

                updateNotificationContent();

            },

        setSystemConnection:
            setSystemConnection

    };


    /* ========================================================
       INITIAL UI SETUP
       ======================================================== */

    normalizeBrandLogo();

    initializeNotifications();

    initializeSidebar();

    bindRefreshButtons();


    /* ========================================================
       INITIAL CONNECTION STATE
       ======================================================== */

    setSystemConnection(
        true
    );


    /* ========================================================
       INITIAL LOAD
       ======================================================== */

    await loadInventory();


    /* ========================================================
       START AUTO REFRESH
       ======================================================== */

    startAutoRefresh();

});
