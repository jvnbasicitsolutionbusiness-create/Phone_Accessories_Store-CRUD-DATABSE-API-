/* ============================================================
   STOCKFLOW | DASHBOARD.JS
   ============================================================

   StockFlow | Phone Accessories Inventory

   RESPONSIBILITIES
   ------------------------------------------------------------
   1. Protect dashboard using StockFlowAuth
   2. Bind logged-in employee/admin/manager information
   3. Load dashboard statistics
   4. Load recent transactions
   5. Load recent activity
   6. Monitor products
   7. Monitor categories
   8. Monitor stock-in / stock-out
   9. Monitor low-stock / out-of-stock
   10. Display API connection state
   11. Support manual dashboard refresh
   12. Support mobile sidebar
   13. Support logout
   14. Prevent unsafe HTML injection
   15. Keep original UI/design untouched

   DEPENDENCIES
   ------------------------------------------------------------
   - config.js
   - API.js
   - auth.js / authentication module
   - dashboard.html
   - dashboard.css

   ============================================================ */

"use strict";


/* ============================================================
   GLOBAL DASHBOARD STATE
   ============================================================ */

const StockFlowDashboard = {

    user: null,

    stats: {

        products: 0,

        categories: 0,

        totalStock: 0,

        lowStock: 0,

        outOfStock: 0,

        stockIn: 0,

        stockOut: 0

    },

    loading: false,

    lastUpdated: null

};


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        await initializeDashboard();

    }
);


/* ============================================================
   INITIALIZE DASHBOARD
   ============================================================ */

async function initializeDashboard() {

    try {

        /*
         * ------------------------------------------------------
         * AUTHENTICATION
         * ------------------------------------------------------
         */

        if (
            !window.StockFlowAuth ||
            typeof StockFlowAuth.requireAuth !== "function"
        ) {

            console.error(
                "StockFlowAuth is not available."
            );

            showConnectionError(
                "Authentication module is unavailable."
            );

            return;

        }


        const user =
            await StockFlowAuth.requireAuth();


        /*
         * requireAuth() may redirect the user.
         * Stop execution if no user is returned.
         */

        if (!user) {

            return;

        }


        StockFlowDashboard.user =
            user;


        /*
         * ------------------------------------------------------
         * USER INTERFACE
         * ------------------------------------------------------
         */

        if (
            typeof StockFlowAuth.bindUserUI === "function"
        ) {

            StockFlowAuth.bindUserUI(
                user
            );

        }


        /*
         * ------------------------------------------------------
         * INITIAL UI EVENTS
         * ------------------------------------------------------
         */

        bindDashboardEvents();


        /*
         * ------------------------------------------------------
         * LOAD DASHBOARD
         * ------------------------------------------------------
         */

        await loadDashboard();


    }

    catch (error) {

        console.error(
            "StockFlow dashboard initialization error:",
            error
        );


        showConnectionError(
            error.message ||
            "Unable to initialize dashboard."
        );

    }

}


/* ============================================================
   BIND DASHBOARD EVENTS
   ============================================================ */

function bindDashboardEvents() {


    /*
     * ----------------------------------------------------------
     * LOGOUT
     * ----------------------------------------------------------
     */

    const logoutBtn =
        document.querySelector(
            "#logoutBtn"
        );


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();


                try {

                    if (
                        window.StockFlowAuth &&
                        typeof StockFlowAuth.logout ===
                        "function"
                    ) {

                        await StockFlowAuth.logout();

                    }

                }

                catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                }

            }
        );

    }


    /*
     * ----------------------------------------------------------
     * MOBILE MENU
     * ----------------------------------------------------------
     */

    const mobileMenuBtn =
        document.querySelector(
            "#mobileMenuBtn"
        );


    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener(
            "click",
            function () {

                document.body.classList.toggle(
                    "sidebar-open"
                );

            }
        );

    }


    /*
     * ----------------------------------------------------------
     * SIDEBAR OVERLAY
     * ----------------------------------------------------------
     */

    const sidebarOverlay =
        document.querySelector(
            "#sidebarOverlay"
        );


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            function () {

                document.body.classList.remove(
                    "sidebar-open"
                );

            }
        );

    }


    /*
     * ----------------------------------------------------------
     * CLOSE MOBILE SIDEBAR WHEN NAVIGATION IS CLICKED
     * ----------------------------------------------------------
     */

    document
        .querySelectorAll(
            ".sidebar a, .sidebar-link, .nav-link"
        )
        .forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        document.body.classList.remove(
                            "sidebar-open"
                        );

                    }
                );

            }
        );


    /*
     * ----------------------------------------------------------
     * REFRESH BUTTON
     *
     * Supports multiple possible IDs so the original HTML
     * doesn't need to be redesigned.
     * ----------------------------------------------------------
     */

    const refreshBtn =
        document.querySelector(
            "#refreshDashboard"
        ) ||
        document.querySelector(
            "#refreshBtn"
        ) ||
        document.querySelector(
            "[data-action='refresh-dashboard']"
        );


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();

                await loadDashboard();

            }
        );

    }

}


/* ============================================================
   LOAD DASHBOARD
   ============================================================ */

async function loadDashboard() {


    if (
        StockFlowDashboard.loading
    ) {

        return;

    }


    StockFlowDashboard.loading =
        true;


    setDashboardLoading(
        true
    );


    setConnectionStatus(
        "CONNECTING"
    );


    try {

        /*
         * ------------------------------------------------------
         * VERIFY API MODULE
         * ------------------------------------------------------
         */

        if (
            !window.StockFlowAPI
        ) {

            throw new Error(
                "StockFlowAPI is not available. Check API.js."
            );

        }


        /*
         * ------------------------------------------------------
         * REQUEST DASHBOARD DATA
         * ------------------------------------------------------
         */

        const response =
            await requestDashboardData();


        /*
         * ------------------------------------------------------
         * CHECK RESPONSE
         * ------------------------------------------------------
         */

        if (
            !response
        ) {

            throw new Error(
                "No response was received from the server."
            );

        }


        if (
            response.success === false
        ) {

            throw new Error(
                response.message ||
                "Unable to load dashboard data."
            );

        }


        /*
         * ------------------------------------------------------
         * NORMALIZE RESPONSE
         * ------------------------------------------------------
         */

        const normalized =
            normalizeDashboardResponse(
                response
            );


        /*
         * ------------------------------------------------------
         * SAVE STATS
         * ------------------------------------------------------
         */

        StockFlowDashboard.stats =
            normalized.stats;


        /*
         * ------------------------------------------------------
         * RENDER STATS
         * ------------------------------------------------------
         */

        renderDashboardStats(
            normalized.stats
        );


        /*
         * ------------------------------------------------------
         * RENDER INVENTORY OVERVIEW
         * ------------------------------------------------------
         */

        renderInventoryOverview(
            normalized.stats
        );


        /*
         * ------------------------------------------------------
         * RENDER RECENT TRANSACTIONS
         * ------------------------------------------------------
         */

        renderRecentTransactions(
            normalized.recentTransactions
        );


        /*
         * ------------------------------------------------------
         * RENDER RECENT ACTIVITY
         * ------------------------------------------------------
         */

        renderRecentActivity(
            normalized.recentActivity
        );


        /*
         * ------------------------------------------------------
         * CONNECTION SUCCESS
         * ------------------------------------------------------
         */

        StockFlowDashboard.lastUpdated =
            new Date();


        setConnectionStatus(
            "ONLINE"
        );


        updateLastUpdated(
            StockFlowDashboard.lastUpdated
        );


    }

    catch (error) {

        console.error(
            "Dashboard API error:",
            error
        );


        /*
         * ------------------------------------------------------
         * SHOW SAFE FALLBACK STATE
         * ------------------------------------------------------
         */

        showDashboardOfflineState(
            error
        );


    }

    finally {

        StockFlowDashboard.loading =
            false;


        setDashboardLoading(
            false
        );

    }

}


/* ============================================================
   REQUEST DASHBOARD DATA
   ============================================================ */

async function requestDashboardData() {


    /*
     * ----------------------------------------------------------
     * PRIMARY API
     * ----------------------------------------------------------
     */

    if (
        typeof StockFlowAPI.dashboardStats ===
        "function"
    ) {

        return await StockFlowAPI.dashboardStats();

    }


    /*
     * ----------------------------------------------------------
     * ALTERNATIVE API NAME
     * ----------------------------------------------------------
     */

    if (
        typeof StockFlowAPI.getDashboardStats ===
        "function"
    ) {

        return await StockFlowAPI.getDashboardStats();

    }


    /*
     * ----------------------------------------------------------
     * GENERIC API METHOD
     * ----------------------------------------------------------
     */

    if (
        typeof StockFlowAPI.request ===
        "function"
    ) {

        return await StockFlowAPI.request(
            "dashboardStats",
            {}
        );

    }


    /*
     * ----------------------------------------------------------
     * GENERIC POST METHOD
     * ----------------------------------------------------------
     */

    if (
        typeof StockFlowAPI.post ===
        "function"
    ) {

        return await StockFlowAPI.post(
            "dashboardStats",
            {}
        );

    }


    throw new Error(
        "Dashboard API method was not found in API.js."
    );

}


/* ============================================================
   NORMALIZE DASHBOARD RESPONSE
   ============================================================ */

function normalizeDashboardResponse(
    response
) {


    /*
     * Some API versions return:
     *
     * {
     *   success: true,
     *   stats: {...}
     * }
     *
     * Others:
     *
     * {
     *   success: true,
     *   data: {
     *      stats: {...}
     *   }
     * }
     */


    let stats =
        response.stats ||
        response.data?.stats ||
        response.data ||
        response;


    /*
     * ----------------------------------------------------------
     * NORMALIZE STAT VALUES
     * ----------------------------------------------------------
     */

    const normalizedStats = {

        products:
            toNumber(
                stats.products ??
                stats.totalProducts ??
                stats.productCount ??
                0
            ),


        categories:
            toNumber(
                stats.categories ??
                stats.totalCategories ??
                stats.categoryCount ??
                0
            ),


        totalStock:
            toNumber(
                stats.totalStock ??
                stats.stock ??
                stats.totalUnits ??
                stats.unitsOnHand ??
                0
            ),


        lowStock:
            toNumber(
                stats.lowStock ??
                stats.lowStockCount ??
                0
            ),


        outOfStock:
            toNumber(
                stats.outOfStock ??
                stats.outOfStockCount ??
                0
            ),


        stockIn:
            toNumber(
                stats.stockIn ??
                stats.totalStockIn ??
                stats.stockInCount ??
                0
            ),


        stockOut:
            toNumber(
                stats.stockOut ??
                stats.totalStockOut ??
                stats.stockOutCount ??
                0
            )

    };


    /*
     * ----------------------------------------------------------
     * TRANSACTIONS
     * ----------------------------------------------------------
     */

    const recentTransactions =
        response.recentTransactions ||
        response.data?.recentTransactions ||
        stats.recentTransactions ||
        [];


    /*
     * ----------------------------------------------------------
     * ACTIVITY
     * ----------------------------------------------------------
     */

    const recentActivity =
        response.recentActivity ||
        response.data?.recentActivity ||
        stats.recentActivity ||
        [];


    return {

        stats:
            normalizedStats,

        recentTransactions:
            Array.isArray(
                recentTransactions
            )
                ? recentTransactions
                : [],

        recentActivity:
            Array.isArray(
                recentActivity
            )
                ? recentActivity
                : []

    };

}


/* ============================================================
   RENDER DASHBOARD STATS
   ============================================================ */

function renderDashboardStats(
    stats
) {


    /*
     * ----------------------------------------------------------
     * PRODUCTS
     * ----------------------------------------------------------
     */

    setText(
        "productsCount",
        stats.products
    );


    /*
     * ----------------------------------------------------------
     * CATEGORIES
     * ----------------------------------------------------------
     */

    setText(
        "categoriesCount",
        stats.categories
    );


    /*
     * ----------------------------------------------------------
     * TOTAL STOCK
     * ----------------------------------------------------------
     */

    setText(
        "totalStockCount",
        stats.totalStock
    );


    /*
     * ----------------------------------------------------------
     * LOW STOCK
     * ----------------------------------------------------------
     */

    setText(
        "lowStockCount",
        stats.lowStock
    );


    /*
     * ----------------------------------------------------------
     * OUT OF STOCK
     * ----------------------------------------------------------
     */

    setText(
        "outOfStockCount",
        stats.outOfStock
    );


    /*
     * ----------------------------------------------------------
     * STOCK IN
     * ----------------------------------------------------------
     */

    setText(
        "stockInCount",
        stats.stockIn
    );


    /*
     * ----------------------------------------------------------
     * STOCK OUT
     * ----------------------------------------------------------
     */

    setText(
        "stockOutCount",
        stats.stockOut
    );

}


/* ============================================================
   INVENTORY OVERVIEW
   ============================================================ */

function renderInventoryOverview(
    stats
) {


    const container =
        document.querySelector(
            "#inventoryOverview"
        );


    if (!container) {

        return;

    }


    /*
     * ----------------------------------------------------------
     * UPDATE EXISTING ELEMENTS FIRST
     *
     * This preserves your original dashboard design.
     * ----------------------------------------------------------
     */

    setText(
        "overviewTotalStock",
        stats.totalStock
    );


    setText(
        "overviewLowStock",
        stats.lowStock
    );


    setText(
        "overviewOutOfStock",
        stats.outOfStock
    );


    /*
     * ----------------------------------------------------------
     * IF ORIGINAL HTML USES overview-grid,
     * UPDATE IT WITHOUT REPLACING THE ENTIRE DESIGN.
     * ----------------------------------------------------------
     */

    const overviewValues =
        container.querySelectorAll(
            "[data-overview-value]"
        );


    if (
        overviewValues.length
    ) {

        overviewValues.forEach(
            function (element) {

                const type =
                    element.dataset
                        .overviewValue;


                if (
                    type ===
                    "total-stock"
                ) {

                    element.textContent =
                        stats.totalStock;

                }

                else if (
                    type ===
                    "low-stock"
                ) {

                    element.textContent =
                        stats.lowStock;

                }

                else if (
                    type ===
                    "out-of-stock"
                ) {

                    element.textContent =
                        stats.outOfStock;

                }

            }
        );

    }

}


/* ============================================================
   RECENT TRANSACTIONS
   ============================================================ */

function renderRecentTransactions(
    transactions
) {


    const container =
        document.querySelector(
            "#recentTransactions"
        );


    if (!container) {

        return;

    }


    if (
        !transactions ||
        !transactions.length
    ) {

        renderEmptyState(
            container,
            "No recent transactions"
        );

        return;

    }


    /*
     * ----------------------------------------------------------
     * SORT NEWEST FIRST
     * ----------------------------------------------------------
     */

    const sorted =
        [...transactions]
            .sort(
                function (a, b) {

                    return (
                        getDateValue(b) -
                        getDateValue(a)
                    );

                }
            );


    /*
     * ----------------------------------------------------------
     * LIMIT DASHBOARD DISPLAY
     * ----------------------------------------------------------
     */

    const items =
        sorted.slice(
            0,
            8
        );


    container.innerHTML =
        items
            .map(
                function (item) {

                    return createTransactionHTML(
                        item
                    );

                }
            )
            .join("");

}


/* ============================================================
   TRANSACTION HTML
   ============================================================ */

function createTransactionHTML(
    item
) {


    const product =
        getFirstValue(
            item,
            [
                "PRODUCT_NAME",
                "productName",
                "PRODUCT",
                "product",
                "NAME",
                "name"
            ],
            "Item"
        );


    const type =
        getFirstValue(
            item,
            [
                "TYPE",
                "type",
                "TRANSACTION_TYPE",
                "transactionType",
                "ACTION",
                "action"
            ],
            "Transaction"
        );


    const quantity =
        getFirstValue(
            item,
            [
                "QUANTITY",
                "quantity",
                "QTY",
                "qty",
                "STOCK_QTY",
                "stockQty"
            ],
            ""
        );


    const date =
        getFirstValue(
            item,
            [
                "DATE",
                "date",
                "TRANSACTION_DATE",
                "transactionDate",
                "CREATED_AT",
                "createdAt",
                "CREATED",
                "created"
            ],
            ""
        );


    const normalizedType =
        String(
            type
        )
        .trim()
        .toUpperCase();


    const icon =
        normalizedType.includes(
            "IN"
        )

            ? "fa-arrow-down"

            : normalizedType.includes(
                "OUT"
            )

                ? "fa-arrow-up"

                : "fa-box";


    return `

        <div class="activity-row transaction-row">

            <div class="activity-icon">

                <i class="fa-solid ${icon}"></i>

            </div>

            <div class="activity-content">

                <b>
                    ${escapeHTML(product)}
                </b>

                <small>
                    ${escapeHTML(type)}
                    ${
                        quantity !== ""
                            ? ` · Qty: ${escapeHTML(quantity)}`
                            : ""
                    }
                </small>

            </div>

            <span class="activity-date">
                ${escapeHTML(
                    formatDate(date)
                )}
            </span>

        </div>

    `;

}


/* ============================================================
   RECENT ACTIVITY
   ============================================================ */

function renderRecentActivity(
    activities
) {


    const container =
        document.querySelector(
            "#recentActivity"
        );


    if (!container) {

        return;

    }


    if (
        !activities ||
        !activities.length
    ) {

        renderEmptyState(
            container,
            "No recent activity"
        );

        return;

    }


    const sorted =
        [...activities]
            .sort(
                function (a, b) {

                    return (
                        getDateValue(b) -
                        getDateValue(a)
                    );

                }
            );


    const items =
        sorted.slice(
            0,
            8
        );


    container.innerHTML =
        items
            .map(
                function (item) {

                    return createActivityHTML(
                        item
                    );

                }
            )
            .join("");

}


/* ============================================================
   ACTIVITY HTML
   ============================================================ */

function createActivityHTML(
    item
) {


    const title =
        getFirstValue(
            item,
            [
                "PRODUCT_NAME",
                "productName",
                "NAME",
                "name",
                "TITLE",
                "title",
                "DESCRIPTION",
                "description"
            ],
            "System activity"
        );


    const action =
        getFirstValue(
            item,
            [
                "ACTION",
                "action",
                "TYPE",
                "type",
                "ACTIVITY",
                "activity",
                "DESCRIPTION",
                "description"
            ],
            "Activity"
        );


    const user =
        getFirstValue(
            item,
            [
                "USERNAME",
                "username",
                "USER",
                "user",
                "NAME",
                "name"
            ],
            ""
        );


    const date =
        getFirstValue(
            item,
            [
                "DATE",
                "date",
                "CREATED_AT",
                "createdAt",
                "TIMESTAMP",
                "timestamp"
            ],
            ""
        );


    return `

        <div class="activity-row">

            <div class="activity-icon">

                <i class="fa-solid fa-clock-rotate-left"></i>

            </div>

            <div class="activity-content">

                <b>
                    ${escapeHTML(title)}
                </b>

                <small>

                    ${escapeHTML(action)}

                    ${
                        user
                            ? ` · ${escapeHTML(user)}`
                            : ""
                    }

                </small>

            </div>

            <span class="activity-date">
                ${escapeHTML(
                    formatDate(date)
                )}
            </span>

        </div>

    `;

}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function renderEmptyState(
    container,
    message
) {


    container.innerHTML = `

        <div class="empty-state">

            <i class="fa-solid fa-inbox"></i>

            <strong>
                ${escapeHTML(message)}
            </strong>

        </div>

    `;

}


/* ============================================================
   OFFLINE DASHBOARD STATE
   ============================================================ */

function showDashboardOfflineState(
    error
) {


    /*
     * ----------------------------------------------------------
     * DISPLAY DASHBOARD COUNTERS AS —
     * ----------------------------------------------------------
     */

    [

        "productsCount",
        "categoriesCount",
        "totalStockCount",
        "lowStockCount",
        "outOfStockCount",
        "stockInCount",
        "stockOutCount"

    ].forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    "—";

            }

        }
    );


    /*
     * ----------------------------------------------------------
     * CONNECTION BADGE
     * ----------------------------------------------------------
     */

    setConnectionStatus(
        "OFFLINE"
    );


    /*
     * ----------------------------------------------------------
     * CONNECTION MESSAGE
     * ----------------------------------------------------------
     */

    const message =
        document.querySelector(
            "#connectionMessage"
        );


    if (message) {

        message.textContent =
            error?.message ||
            "Unable to connect to StockFlow.";

    }


    /*
     * ----------------------------------------------------------
     * EMPTY TRANSACTIONS
     * ----------------------------------------------------------
     */

    const transactions =
        document.querySelector(
            "#recentTransactions"
        );


    if (transactions) {

        renderEmptyState(
            transactions,
            "Unable to load transactions"
        );

    }


    /*
     * ----------------------------------------------------------
     * EMPTY ACTIVITY
     * ----------------------------------------------------------
     */

    const activity =
        document.querySelector(
            "#recentActivity"
        );


    if (activity) {

        renderEmptyState(
            activity,
            "Unable to load activity"
        );

    }

}


/* ============================================================
   CONNECTION STATUS
   ============================================================ */

function setConnectionStatus(
    status
) {


    const badge =
        document.querySelector(
            "#connectionBadge"
        );


    if (!badge) {

        return;

    }


    const normalized =
        String(
            status || ""
        )
        .trim()
        .toUpperCase();


    badge.textContent =
        normalized;


    /*
     * ----------------------------------------------------------
     * SUPPORT BOTH CLASS NAMING SYSTEMS
     * ----------------------------------------------------------
     */

    badge.classList.remove(
        "online",
        "offline",
        "connecting",
        "connected",
        "disconnected"
    );


    if (
        normalized ===
        "ONLINE"
    ) {

        badge.classList.add(
            "online",
            "connected"
        );

    }

    else if (
        normalized ===
        "OFFLINE"
    ) {

        badge.classList.add(
            "offline",
            "disconnected"
        );

    }

    else {

        badge.classList.add(
            "connecting"
        );

    }

}


/* ============================================================
   CONNECTION ERROR
   ============================================================ */

function showConnectionError(
    message
) {


    setConnectionStatus(
        "OFFLINE"
    );


    const connectionMessage =
        document.querySelector(
            "#connectionMessage"
        );


    if (
        connectionMessage
    ) {

        connectionMessage.textContent =
            message ||
            "Connection error.";

    }

}


/* ============================================================
   DASHBOARD LOADING STATE
   ============================================================ */

function setDashboardLoading(
    loading
) {


    document.body.classList.toggle(
        "dashboard-loading",
        Boolean(
            loading
        )
    );


    /*
     * ----------------------------------------------------------
     * OPTIONAL REFRESH BUTTON
     * ----------------------------------------------------------
     */

    const refreshBtn =
        document.querySelector(
            "#refreshDashboard"
        ) ||
        document.querySelector(
            "#refreshBtn"
        );


    if (refreshBtn) {

        refreshBtn.disabled =
            Boolean(
                loading
            );


        refreshBtn.classList.toggle(
            "loading",
            Boolean(
                loading
            )
        );

    }


    /*
     * ----------------------------------------------------------
     * OPTIONAL LOADING INDICATORS
     * ----------------------------------------------------------
     */

    document
        .querySelectorAll(
            "[data-dashboard-loading]"
        )
        .forEach(
            function (element) {

                element.hidden =
                    !loading;

            }
        );

}


/* ============================================================
   LAST UPDATED
   ============================================================ */

function updateLastUpdated(
    date
) {


    if (!date) {

        return;

    }


    const elements =
        document.querySelectorAll(
            "#lastUpdated, [data-last-updated]"
        );


    elements.forEach(
        function (element) {

            element.textContent =
                formatDate(
                    date
                );

        }
    );

}


/* ============================================================
   SET TEXT
   ============================================================ */

function setText(
    id,
    value
) {


    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        value ?? 0;

}


/* ============================================================
   GET FIRST AVAILABLE VALUE
   ============================================================ */

function getFirstValue(
    object,
    keys,
    fallback
) {


    if (
        !object
    ) {

        return fallback;

    }


    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const key =
            keys[i];


        if (
            object[key] !==
            undefined &&
            object[key] !==
            null &&
            String(
                object[key]
            ).trim() !== ""
        ) {

            return object[key];

        }

    }


    return fallback;

}


/* ============================================================
   NUMBER CONVERTER
   ============================================================ */

function toNumber(
    value
) {


    if (
        typeof value ===
        "number"
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : 0;

    }


    const number =
        Number(
            String(
                value ?? ""
            )
            .replace(
                /,/g,
                ""
            )
            .trim()
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


/* ============================================================
   DATE VALUE
   ============================================================ */

function getDateValue(
    item
) {


    if (
        !item
    ) {

        return 0;

    }


    const value =
        getFirstValue(
            item,
            [
                "DATE",
                "date",
                "CREATED_AT",
                "createdAt",
                "CREATED",
                "created",
                "TIMESTAMP",
                "timestamp"
            ],
            ""
        );


    const timestamp =
        new Date(
            value
        ).getTime();


    return Number.isFinite(
        timestamp
    )
        ? timestamp
        : 0;

}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDate(
    value
) {


    if (
        !value
    ) {

        return "";

    }


    const date =
        value instanceof Date
            ? value
            : new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleString(
        undefined,
        {

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric",

            hour:
                "numeric",

            minute:
                "2-digit"

        }
    );

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(
    value
) {


    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* ============================================================
   GLOBAL REFRESH FUNCTION
   ============================================================

   Allows the HTML to call:

       onclick="refreshDashboard()"

   without needing to modify the existing design.
   ============================================================ */

window.refreshDashboard =
    async function () {

        await loadDashboard();

    };


/* ============================================================
   GLOBAL STOCKFLOW DASHBOARD API
   ============================================================ */

window.StockFlowDashboard =
    StockFlowDashboard;


/* ============================================================
   END OF DASHBOARD.JS
   ============================================================ */
