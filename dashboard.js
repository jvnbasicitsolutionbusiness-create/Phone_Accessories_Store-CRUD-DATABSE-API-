/* ============================================================
   STOCKFLOW | DASHBOARD.JS
   ============================================================
   Dashboard Controller
   ------------------------------------------------------------
   Features:
   - Authentication
   - Responsive sidebar
   - Mobile sidebar overlay
   - Desktop sidebar collapse
   - Notification panel
   - Dashboard statistics
   - Inventory overview
   - Recent transactions
   - Recent activity
   - Quick actions
   - Connection monitoring
   - Manual refresh
   - Automatic refresh
   - Online / Offline handling
   - Safe HTML rendering
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* ========================================================
       CONFIGURATION
       ======================================================== */

    const MOBILE_BREAKPOINT = 900;
    const AUTO_REFRESH_INTERVAL = 60000;
    const MAX_ACTIVITY_ITEMS = 8;


    /* ========================================================
       DOM HELPERS
       ======================================================== */

    const get = (id) =>
        document.getElementById(id);

    const $ = (selector) =>
        document.querySelector(selector);

    const $$ = (selector) =>
        Array.from(document.querySelectorAll(selector));


    const setText = (id, value) => {
        const element = get(id);

        if (element) {
            element.textContent =
                value ?? "0";
        }
    };


    const setHTML = (id, html) => {
        const element = get(id);

        if (element) {
            element.innerHTML = html;
        }
    };


    /* ========================================================
       SECURITY / FORMAT HELPERS
       ======================================================== */

    function esc(value) {

        return String(value ?? "")
            .replace(
                /[&<>"']/g,
                character => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[character]
            );

    }


    function toNumber(value, fallback = 0) {

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;

    }


    function formatNumber(value) {

        return toNumber(value)
            .toLocaleString();

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return esc(value);
        }

        return date.toLocaleString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );

    }


    function getValue(
        object,
        ...keys
    ) {

        if (!object) {
            return "";
        }

        for (const key of keys) {

            const value =
                object[key];

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                return value;
            }

        }

        return "";

    }


    /* ========================================================
       STATE
       ======================================================== */

    const state = {

        currentUser: null,

        isLoading: false,

        refreshTimer: null,

        previousMobileState:
            window.innerWidth <= MOBILE_BREAKPOINT,

        notificationPanel: null

    };


    /* ========================================================
       DOM REFERENCES
       ======================================================== */

    const sidebar =
        get("sidebar");

    const mobileMenuBtn =
        get("mobileMenuBtn");

    const sidebarOverlay =
        get("sidebarOverlay");

    const notificationBtn =
        get("notificationBtn");

    const logoutBtn =
        get("logoutBtn");


    /* ========================================================
       AUTHENTICATION
       ======================================================== */

    async function initializeAuthentication() {

        try {

            if (
                typeof StockFlowAuth ===
                "undefined"
            ) {

                throw new Error(
                    "StockFlowAuth is not available."
                );

            }


            state.currentUser =
                await StockFlowAuth.requireAuth();


            if (!state.currentUser) {
                return false;
            }


            if (
                typeof StockFlowAuth.bindUserUI ===
                "function"
            ) {

                StockFlowAuth.bindUserUI(
                    state.currentUser
                );

            }


            return true;

        }

        catch (error) {

            console.error(
                "StockFlow authentication error:",
                error
            );

            return false;

        }

    }


    /* ========================================================
       RESPONSIVE HELPERS
       ======================================================== */

    function isMobile() {

        return (
            window.innerWidth <=
            MOBILE_BREAKPOINT
        );

    }


    /* ========================================================
       SIDEBAR CONTROLLER
       ======================================================== */

    function openMobileSidebar() {

        if (!sidebar) {
            return;
        }

        sidebar.classList.add(
            "open"
        );

        document.body.classList.add(
            "sidebar-open"
        );

        if (sidebarOverlay) {

            sidebarOverlay.classList.add(
                "show"
            );

        }

        if (mobileMenuBtn) {

            mobileMenuBtn.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    function closeMobileSidebar() {

        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

        }

        document.body.classList.remove(
            "sidebar-open"
        );

        if (sidebarOverlay) {

            sidebarOverlay.classList.remove(
                "show"
            );

        }

        if (mobileMenuBtn) {

            mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    function toggleSidebar() {

        if (!sidebar) {
            return;
        }


        /* ----------------------------------------------------
           MOBILE SIDEBAR
           ---------------------------------------------------- */

        if (isMobile()) {

            if (
                sidebar.classList.contains(
                    "open"
                )
            ) {

                closeMobileSidebar();

            } else {

                openMobileSidebar();

            }

            return;

        }


        /* ----------------------------------------------------
           DESKTOP SIDEBAR
           ---------------------------------------------------- */

        document.body.classList.toggle(
            "sidebar-collapsed"
        );


        const collapsed =
            document.body.classList.contains(
                "sidebar-collapsed"
            );


        if (mobileMenuBtn) {

            mobileMenuBtn.setAttribute(
                "aria-expanded",
                String(!collapsed)
            );

        }

    }


    function initializeSidebar() {

        if (mobileMenuBtn) {

            mobileMenuBtn.type =
                "button";

            mobileMenuBtn.setAttribute(
                "aria-label",
                "Toggle navigation menu"
            );

            mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );


            mobileMenuBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    toggleSidebar();

                }
            );

        }


        if (sidebarOverlay) {

            sidebarOverlay.addEventListener(
                "click",
                closeMobileSidebar
            );

        }


        $$(".sidebar-link")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    () => {

                        if (isMobile()) {
                            closeMobileSidebar();
                        }

                    }
                );

            });


        window.addEventListener(
            "resize",
            handleResize
        );

    }


    function handleResize() {

        const currentMobileState =
            isMobile();


        if (
            currentMobileState !==
            state.previousMobileState
        ) {

            closeMobileSidebar();

        }


        state.previousMobileState =
            currentMobileState;

    }


    /* ========================================================
       LOGOUT
       ======================================================== */

    function initializeLogout() {

        if (!logoutBtn) {
            return;
        }


        logoutBtn.type =
            "button";


        logoutBtn.addEventListener(
            "click",
            handleLogout
        );

    }


    async function handleLogout() {

        try {

            logoutBtn.disabled =
                true;

            logoutBtn.classList.add(
                "loading"
            );


            if (
                typeof StockFlowAuth !==
                    "undefined" &&
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


            logoutBtn.disabled =
                false;

            logoutBtn.classList.remove(
                "loading"
            );

        }

    }


    /* ========================================================
       NOTIFICATION PANEL
       ======================================================== */

    function ensureNotificationPanel() {

        if (
            state.notificationPanel
        ) {

            return state.notificationPanel;

        }


        const existing =
            get("notificationPanel");


        if (existing) {

            state.notificationPanel =
                existing;

            return existing;

        }


        if (!notificationBtn) {
            return null;
        }


        const wrapper =
            notificationBtn.closest(
                ".notification-wrapper"
            );


        if (!wrapper) {
            return null;
        }


        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "notificationPanel";


        panel.className =
            "notification-panel";


        panel.innerHTML = `

            <div class="notification-header">

                <div>

                    <strong>
                        Notifications
                    </strong>

                    <span>
                        StockFlow alerts
                    </span>

                </div>

                <button
                    type="button"
                    class="notification-close"
                    id="notificationCloseBtn"
                    aria-label="Close notifications"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div
                class="notification-list"
                id="notificationList"
            >

                <div class="notification-empty">

                    <i class="fa-regular fa-bell-slash"></i>

                    <strong>
                        No notifications
                    </strong>

                    <span>
                        You're all caught up.
                    </span>

                </div>

            </div>

        `;


        wrapper.appendChild(
            panel
        );


        state.notificationPanel =
            panel;


        return panel;

    }


    function closeNotifications() {

        const panel =
            state.notificationPanel ||
            get("notificationPanel");


        if (!panel) {
            return;
        }


        panel.classList.remove(
            "show"
        );


        if (notificationBtn) {

            notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    function openNotifications() {

        const panel =
            ensureNotificationPanel();


        if (!panel) {
            return;
        }


        panel.classList.add(
            "show"
        );


        if (notificationBtn) {

            notificationBtn.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    function toggleNotifications() {

        const panel =
            ensureNotificationPanel();


        if (!panel) {
            return;
        }


        const open =
            panel.classList.contains(
                "show"
            );


        if (open) {

            closeNotifications();

        } else {

            openNotifications();

        }

    }


    function initializeNotifications() {

        if (!notificationBtn) {
            return;
        }


        notificationBtn.type =
            "button";


        notificationBtn.setAttribute(
            "aria-label",
            "Notifications"
        );


        notificationBtn.setAttribute(
            "aria-expanded",
            "false"
        );


        notificationBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                toggleNotifications();

            }
        );


        ensureNotificationPanel();

    }


    /* ========================================================
       GLOBAL CLICK / KEYBOARD CONTROLS
       ======================================================== */

    function initializeGlobalControls() {

        document.addEventListener(
            "click",
            event => {

                const closeButton =
                    event.target.closest(
                        "#notificationCloseBtn"
                    );


                if (closeButton) {

                    closeNotifications();

                    return;

                }


                const panel =
                    state.notificationPanel;


                if (!panel) {
                    return;
                }


                if (
                    panel.contains(
                        event.target
                    )
                ) {

                    return;

                }


                if (
                    notificationBtn &&
                    notificationBtn.contains(
                        event.target
                    )
                ) {

                    return;

                }


                closeNotifications();

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                closeMobileSidebar();

                closeNotifications();

            }
        );

    }


    /* ========================================================
       CONNECTION STATUS
       ======================================================== */

    function setConnectionStatus(
        online,
        message = ""
    ) {

        const badge =
            get("connectionBadge");

        const connectionMessage =
            get("connectionMessage");


        if (badge) {

            badge.textContent =
                online
                    ? "ONLINE"
                    : "OFFLINE";


            badge.classList.toggle(
                "online",
                online
            );


            badge.classList.toggle(
                "offline",
                !online
            );

        }


        if (connectionMessage) {

            connectionMessage.textContent =
                message ||
                (
                    online
                        ? "Connected to StockFlow services."
                        : "Unable to connect to StockFlow services."
                );

        }

    }


    /* ========================================================
       EMPTY STATE
       ======================================================== */

    function emptyState(
        icon,
        title,
        message
    ) {

        return `

            <div class="empty-state">

                <i class="${esc(icon)}"></i>

                <strong>
                    ${esc(title)}
                </strong>

                <span>
                    ${esc(message)}
                </span>

            </div>

        `;

    }


    /* ========================================================
       ACTIVITY ICON
       ======================================================== */

    function activityIcon(
        type
    ) {

        const value =
            String(
                type ?? ""
            ).toLowerCase();


        if (
            value.includes("stock in") ||
            value.includes("stock-in") ||
            value.includes("inbound") ||
            value.includes("receive")
        ) {

            return `
                <i class="fa-solid fa-arrow-down"></i>
            `;

        }


        if (
            value.includes("stock out") ||
            value.includes("stock-out") ||
            value.includes("outbound") ||
            value.includes("sale")
        ) {

            return `
                <i class="fa-solid fa-arrow-up"></i>
            `;

        }


        if (
            value.includes("product")
        ) {

            return `
                <i class="fa-solid fa-box"></i>
            `;

        }


        if (
            value.includes("category")
        ) {

            return `
                <i class="fa-solid fa-layer-group"></i>
            `;

        }


        if (
            value.includes("supplier")
        ) {

            return `
                <i class="fa-solid fa-truck-field"></i>
            `;

        }


        if (
            value.includes("login") ||
            value.includes("logout") ||
            value.includes("auth")
        ) {

            return `
                <i class="fa-solid fa-user-shield"></i>
            `;

        }


        return `
            <i class="fa-solid fa-clock-rotate-left"></i>
        `;

    }


    /* ========================================================
       NOTIFICATIONS
       ======================================================== */

    function renderNotifications(
        stats
    ) {

        const list =
            get("notificationList");


        if (!list) {
            return;
        }


        const products =
            toNumber(
                getValue(
                    stats,
                    "products",
                    "totalProducts",
                    "productCount"
                )
            );


        const lowStock =
            toNumber(
                getValue(
                    stats,
                    "lowStock",
                    "lowStockCount"
                )
            );


        const outOfStock =
            toNumber(
                getValue(
                    stats,
                    "outOfStock",
                    "outOfStockCount"
                )
            );


        const notifications = [];


        /* ----------------------------------------------------
           OUT OF STOCK
           ---------------------------------------------------- */

        if (outOfStock > 0) {

            notifications.push({

                icon:
                    "fa-solid fa-circle-xmark",

                type:
                    "danger",

                title:
                    `${formatNumber(outOfStock)} product${outOfStock === 1 ? "" : "s"} out of stock`,

                message:
                    "Restock these products to keep inventory available.",

                link:
                    "./inventory.html"

            });

        }


        /* ----------------------------------------------------
           LOW STOCK
           ---------------------------------------------------- */

        if (lowStock > 0) {

            notifications.push({

                icon:
                    "fa-solid fa-triangle-exclamation",

                type:
                    "warning",

                title:
                    `${formatNumber(lowStock)} product${lowStock === 1 ? "" : "s"} low on stock`,

                message:
                    "Review inventory levels and consider a stock-in.",

                link:
                    "./inventory.html"

            });

        }


        /* ----------------------------------------------------
           NO PRODUCTS
           ---------------------------------------------------- */

        if (products === 0) {

            notifications.push({

                icon:
                    "fa-solid fa-box-open",

                type:
                    "info",

                title:
                    "No products registered",

                message:
                    "Start by adding your first product.",

                link:
                    "./products.html"

            });

        }


        /* ----------------------------------------------------
           ALL CLEAR
           ---------------------------------------------------- */

        if (
            notifications.length === 0
        ) {

            list.innerHTML = `

                <div class="notification-empty">

                    <i class="fa-regular fa-circle-check"></i>

                    <strong>
                        All caught up
                    </strong>

                    <span>
                        No inventory alerts right now.
                    </span>

                </div>

            `;

            return;

        }


        list.innerHTML =
            notifications
                .map(item => `

                    <a
                        href="${esc(item.link)}"
                        class="notification-item ${esc(item.type)}"
                    >

                        <div class="notification-icon">

                            <i class="${esc(item.icon)}"></i>

                        </div>

                        <div class="notification-content">

                            <strong>
                                ${esc(item.title)}
                            </strong>

                            <span>
                                ${esc(item.message)}
                            </span>

                        </div>

                    </a>

                `)
                .join("");

    }


    /* ========================================================
       RECENT TRANSACTIONS
       ======================================================== */

    function renderTransactions(
        transactions
    ) {

        const container =
            get("recentTransactions");


        if (!container) {
            return;
        }


        if (
            !Array.isArray(
                transactions
            ) ||
            transactions.length === 0
        ) {

            container.innerHTML =
                emptyState(
                    "fa-solid fa-inbox",
                    "No recent transactions",
                    "Stock In and Stock Out transactions will appear here."
                );

            return;

        }


        container.innerHTML =
            transactions
                .slice(
                    0,
                    MAX_ACTIVITY_ITEMS
                )
                .map(transaction => {

                    const product =
                        getValue(
                            transaction,
                            "PRODUCT_NAME",
                            "productName",
                            "PRODUCT",
                            "product",
                            "NAME",
                            "name"
                        ) ||
                        "Inventory Item";


                    const type =
                        getValue(
                            transaction,
                            "TYPE",
                            "type",
                            "ACTION",
                            "action",
                            "TRANSACTION_TYPE",
                            "transactionType"
                        ) ||
                        "Inventory Activity";


                    const quantity =
                        getValue(
                            transaction,
                            "QUANTITY",
                            "quantity",
                            "QTY",
                            "qty"
                        );


                    const date =
                        getValue(
                            transaction,
                            "DATE",
                            "date",
                            "CREATED_AT",
                            "createdAt",
                            "UPDATED_AT",
                            "updatedAt"
                        );


                    return `

                        <div class="activity-row">

                            <div class="activity-icon">

                                ${activityIcon(type)}

                            </div>

                            <div class="activity-content">

                                <strong>
                                    ${esc(product)}
                                </strong>

                                <small>
                                    ${esc(type)}
                                </small>

                            </div>

                            <div class="activity-meta">

                                <strong>
                                    ${formatNumber(quantity)}
                                </strong>

                                <small>
                                    ${formatDate(date)}
                                </small>

                            </div>

                        </div>

                    `;

                })
                .join("");

    }


    /* ========================================================
       RECENT ACTIVITY
       ======================================================== */

    function renderActivity(
        activities
    ) {

        const container =
            get("recentActivity");


        if (!container) {
            return;
        }


        if (
            !Array.isArray(
                activities
            ) ||
            activities.length === 0
        ) {

            container.innerHTML =
                emptyState(
                    "fa-solid fa-clock-rotate-left",
                    "No recent activity",
                    "Your latest inventory activities will appear here."
                );

            return;

        }


        container.innerHTML =
            activities
                .slice(
                    0,
                    MAX_ACTIVITY_ITEMS
                )
                .map(activity => {

                    const name =
                        getValue(
                            activity,
                            "PRODUCT_NAME",
                            "productName",
                            "NAME",
                            "name",
                            "DESCRIPTION",
                            "description"
                        ) ||
                        "Inventory activity";


                    const type =
                        getValue(
                            activity,
                            "TYPE",
                            "type",
                            "ACTION",
                            "action"
                        ) ||
                        "Activity";


                    const date =
                        getValue(
                            activity,
                            "DATE",
                            "date",
                            "CREATED_AT",
                            "createdAt",
                            "UPDATED_AT",
                            "updatedAt"
                        );


                    return `

                        <div class="activity-row">

                            <div class="activity-icon">

                                ${activityIcon(type)}

                            </div>

                            <div class="activity-content">

                                <strong>
                                    ${esc(name)}
                                </strong>

                                <small>
                                    ${esc(type)}
                                </small>

                            </div>

                            <div class="activity-meta">

                                <small>
                                    ${formatDate(date)}
                                </small>

                            </div>

                        </div>

                    `;

                })
                .join("");

    }


    /* ========================================================
       INVENTORY OVERVIEW
       ======================================================== */

    function renderInventoryOverview(
        stats
    ) {

        const container =
            get("inventoryOverview");


        if (!container) {
            return;
        }


        const totalStock =
            toNumber(
                getValue(
                    stats,
                    "totalStock",
                    "stock",
                    "totalUnits"
                )
            );


        const lowStock =
            toNumber(
                getValue(
                    stats,
                    "lowStock",
                    "lowStockCount"
                )
            );


        const outOfStock =
            toNumber(
                getValue(
                    stats,
                    "outOfStock",
                    "outOfStockCount"
                )
            );


        container.innerHTML = `

            <div class="overview-grid">

                <div class="overview-item">

                    <div class="overview-icon">

                        <i class="fa-solid fa-boxes-stacked"></i>

                    </div>

                    <div>

                        <strong>
                            ${formatNumber(totalStock)}
                        </strong>

                        <span>
                            Units on hand
                        </span>

                    </div>

                </div>


                <div class="overview-item">

                    <div class="overview-icon">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                    </div>

                    <div>

                        <strong>
                            ${formatNumber(lowStock)}
                        </strong>

                        <span>
                            Low stock
                        </span>

                    </div>

                </div>


                <div class="overview-item">

                    <div class="overview-icon">

                        <i class="fa-solid fa-circle-xmark"></i>

                    </div>

                    <div>

                        <strong>
                            ${formatNumber(outOfStock)}
                        </strong>

                        <span>
                            Out of stock
                        </span>

                    </div>

                </div>

            </div>

        `;

    }


    /* ========================================================
       RESET DASHBOARD
       ======================================================== */

    function resetDashboard() {

        const counters = [

            "productsCount",
            "categoriesCount",
            "suppliersCount",
            "totalStockCount",
            "stockInCount",
            "stockOutCount",
            "lowStockCount",
            "outOfStockCount"

        ];


        counters.forEach(
            id => setText(id, "—")
        );


        const overview =
            get("inventoryOverview");


        if (overview) {

            overview.innerHTML =
                emptyState(
                    "fa-solid fa-cloud-arrow-down",
                    "Inventory data unavailable",
                    "Unable to load the latest inventory information."
                );

        }

    }


    /* ========================================================
       API VALIDATION
       ======================================================== */

    function validateDashboardAPI() {

        if (
            typeof StockFlowAPI ===
            "undefined"
        ) {

            throw new Error(
                "StockFlowAPI is not available. Check api.js."
            );

        }


        if (
            typeof StockFlowAPI.dashboardStats !==
            "function"
        ) {

            throw new Error(
                "dashboardStats() is not available in api.js."
            );

        }

    }


    /* ========================================================
       LOAD DASHBOARD
       ======================================================== */

    async function loadDashboard(
        options = {}
    ) {

        const {
            silent = false
        } = options;


        /* ----------------------------------------------------
           PREVENT DUPLICATE REQUESTS
           ---------------------------------------------------- */

        if (state.isLoading) {
            return false;
        }


        state.isLoading =
            true;


        try {

            if (!silent) {

                setConnectionStatus(
                    false,
                    "Connecting to StockFlow..."
                );

            }


            if (!navigator.onLine) {

                throw new Error(
                    "Your browser is offline."
                );

            }


            validateDashboardAPI();


            const response =
                await StockFlowAPI.dashboardStats();


            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to load dashboard information."
                );

            }


            /* ------------------------------------------------
               NORMALIZE RESPONSE
               ------------------------------------------------ */

            const stats =
                response.stats ||
                response.data ||
                response;


            /* ------------------------------------------------
               MAIN STATISTICS
               ------------------------------------------------ */

            const products =
                toNumber(
                    getValue(
                        stats,
                        "products",
                        "totalProducts",
                        "productCount"
                    )
                );


            const categories =
                toNumber(
                    getValue(
                        stats,
                        "categories",
                        "totalCategories",
                        "categoryCount"
                    )
                );


            const suppliers =
                toNumber(
                    getValue(
                        stats,
                        "suppliers",
                        "totalSuppliers",
                        "supplierCount"
                    )
                );


            const totalStock =
                toNumber(
                    getValue(
                        stats,
                        "totalStock",
                        "stock",
                        "totalUnits"
                    )
                );


            const stockIn =
                toNumber(
                    getValue(
                        stats,
                        "stockIn",
                        "totalStockIn"
                    )
                );


            const stockOut =
                toNumber(
                    getValue(
                        stats,
                        "stockOut",
                        "totalStockOut"
                    )
                );


            const lowStock =
                toNumber(
                    getValue(
                        stats,
                        "lowStock",
                        "lowStockCount"
                    )
                );


            const outOfStock =
                toNumber(
                    getValue(
                        stats,
                        "outOfStock",
                        "outOfStockCount"
                    )
                );


            /* ------------------------------------------------
               DASHBOARD COUNTERS
               ------------------------------------------------ */

            setText(
                "productsCount",
                formatNumber(products)
            );


            setText(
                "categoriesCount",
                formatNumber(categories)
            );


            setText(
                "suppliersCount",
                formatNumber(suppliers)
            );


            setText(
                "totalStockCount",
                formatNumber(totalStock)
            );


            setText(
                "stockInCount",
                formatNumber(stockIn)
            );


            setText(
                "stockOutCount",
                formatNumber(stockOut)
            );


            setText(
                "lowStockCount",
                formatNumber(lowStock)
            );


            setText(
                "outOfStockCount",
                formatNumber(outOfStock)
            );


            /* ------------------------------------------------
               INVENTORY OVERVIEW
               ------------------------------------------------ */

            renderInventoryOverview({

                totalStock,
                lowStock,
                outOfStock

            });


            /* ------------------------------------------------
               TRANSACTIONS
               ------------------------------------------------ */

            const transactions =
                response.recentTransactions ||
                stats.recentTransactions ||
                response.transactions ||
                [];


            renderTransactions(
                transactions
            );


            /* ------------------------------------------------
               ACTIVITY
               ------------------------------------------------ */

            const activities =
                response.recentActivity ||
                stats.recentActivity ||
                response.activity ||
                [];


            renderActivity(
                activities
            );


            /* ------------------------------------------------
               NOTIFICATIONS
               ------------------------------------------------ */

            renderNotifications({

                products,
                lowStock,
                outOfStock

            });


            /* ------------------------------------------------
               CONNECTION STATUS
               ------------------------------------------------ */

            setConnectionStatus(
                true,
                "StockFlow is connected."
            );


            /* ------------------------------------------------
               LAST UPDATED
               ------------------------------------------------ */

            const lastUpdated =
                get("lastUpdated");


            if (lastUpdated) {

                lastUpdated.textContent =
                    `Updated ${
                        new Date()
                            .toLocaleTimeString(
                                undefined,
                                {
                                    hour: "numeric",
                                    minute: "2-digit"
                                }
                            )
                    }`;

            }


            return true;

        }

        catch (error) {

            console.error(
                "Dashboard loading failed:",
                error
            );


            resetDashboard();


            setConnectionStatus(
                false,
                error.message ||
                "Unable to connect to StockFlow."
            );


            return false;

        }

        finally {

            state.isLoading =
                false;

        }

    }


    /* ========================================================
       REFRESH BUTTON STATE
       ======================================================== */

    function setRefreshButtonsLoading(
        loading
    ) {

        const buttons = [

            get("refreshDashboardBtn"),
            get("refreshBtn")

        ].filter(Boolean);


        buttons.forEach(button => {

            button.disabled =
                loading;


            button.classList.toggle(
                "loading",
                loading
            );

        });

    }


    /* ========================================================
       MANUAL REFRESH
       ======================================================== */

    async function refreshDashboard() {

        if (state.isLoading) {
            return false;
        }


        setRefreshButtonsLoading(
            true
        );


        try {

            return await loadDashboard();

        }

        finally {

            setRefreshButtonsLoading(
                false
            );

        }

    }


    /* ========================================================
       REFRESH BUTTONS
       ======================================================== */

    function initializeRefreshButtons() {

        const refreshButtons = [

            "refreshDashboardBtn",
            "refreshBtn"

        ];


        refreshButtons.forEach(
            id => {

                const button =
                    get(id);


                if (!button) {
                    return;
                }


                button.type =
                    "button";


                button.addEventListener(
                    "click",
                    refreshDashboard
                );

            }
        );

    }


    /* ========================================================
       QUICK ACTIONS
       ======================================================== */

    function bindQuickAction(
        id,
        destination
    ) {

        const button =
            get(id);


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                window.location.href =
                    destination;

            }
        );

    }


    function initializeQuickActions() {

        bindQuickAction(
            "addProductBtn",
            "./products.html"
        );


        bindQuickAction(
            "stockInBtn",
            "./stock-in.html"
        );


        bindQuickAction(
            "stockOutBtn",
            "./stock-out.html"
        );


        bindQuickAction(
            "manageProductsBtn",
            "./products.html"
        );


        bindQuickAction(
            "manageCategoriesBtn",
            "./categories.html"
        );


        bindQuickAction(
            "manageSuppliersBtn",
            "./suppliers.html"
        );

    }


    /* ========================================================
       AUTO REFRESH
       ======================================================== */

    function stopAutoRefresh() {

        if (state.refreshTimer) {

            clearInterval(
                state.refreshTimer
            );

            state.refreshTimer =
                null;

        }

    }


    function startAutoRefresh() {

        stopAutoRefresh();


        state.refreshTimer =
            setInterval(
                () => {

                    /*
                     * Silent refresh prevents the dashboard
                     * from showing a fake "Connecting..."
                     * state every 60 seconds.
                     */

                    loadDashboard({
                        silent: true
                    });

                },
                AUTO_REFRESH_INTERVAL
            );

    }


    /* ========================================================
       ONLINE / OFFLINE EVENTS
       ======================================================== */

    function initializeConnectionEvents() {

        window.addEventListener(
            "online",
            () => {

                setConnectionStatus(
                    true,
                    "Internet connection restored. Refreshing..."
                );


                loadDashboard();

            }
        );


        window.addEventListener(
            "offline",
            () => {

                setConnectionStatus(
                    false,
                    "Your browser is offline."
                );

            }
        );

    }


    /* ========================================================
       VISIBILITY CHANGE
       ======================================================== */

    function initializeVisibilityHandler() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState !==
                    "visible"
                ) {

                    return;

                }


                /*
                 * Refresh when the user returns
                 * to the dashboard.
                 */

                loadDashboard({
                    silent: true
                });

            }
        );

    }


    /* ========================================================
       CLEANUP
       ======================================================== */

    window.addEventListener(
        "beforeunload",
        stopAutoRefresh
    );


    /* ========================================================
       PUBLIC DASHBOARD API
       ======================================================== */

    function exposeDashboardAPI() {

        window.StockFlowDashboard = {

            refresh:
                refreshDashboard,

            reload:
                loadDashboard,

            currentUser:
                () => state.currentUser,

            openSidebar:
                openMobileSidebar,

            closeSidebar:
                closeMobileSidebar,

            toggleSidebar:
                toggleSidebar,

            openNotifications:
                openNotifications,

            closeNotifications:
                closeNotifications,

            toggleNotifications:
                toggleNotifications

        };

    }


    /* ========================================================
       INITIALIZE DASHBOARD
       ======================================================== */

    async function initializeDashboard() {

        const authenticated =
            await initializeAuthentication();


        if (!authenticated) {
            return;
        }


        initializeSidebar();

        initializeLogout();

        initializeNotifications();

        initializeGlobalControls();

        initializeRefreshButtons();

        initializeQuickActions();

        initializeConnectionEvents();

        initializeVisibilityHandler();


        exposeDashboardAPI();


        /* ----------------------------------------------------
           INITIAL LOAD
           ---------------------------------------------------- */

        await loadDashboard();


        /* ----------------------------------------------------
           AUTO REFRESH
           ---------------------------------------------------- */

        startAutoRefresh();

    }


    /* ========================================================
       START
       ======================================================== */

    initializeDashboard();

});
