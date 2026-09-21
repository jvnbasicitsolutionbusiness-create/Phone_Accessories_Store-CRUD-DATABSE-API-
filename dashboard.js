/* ============================================================
   STOCKFLOW | DASHBOARD.JS
   ============================================================
   Dashboard Controller
   ------------------------------------------------------------
   Connected modules:
   - Products
   - Categories
   - Stock In
   - Stock Out
   - Suppliers
   - Inventory Monitoring
   - Dashboard Reports
   - Authentication
   - Google Apps Script API
   - Firebase-ready API layer

   UI:
   - Responsive sidebar
   - Hamburger menu
   - Sidebar overlay
   - Desktop sidebar collapse
   - Notification dropdown
   - ESC key controls
   - User UI
   - Dashboard refresh
   - Auto refresh
   ============================================================ */


/* ============================================================
   MAIN DASHBOARD CONTROLLER
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";


    /* ========================================================
       AUTHENTICATION
       ======================================================== */

    let currentUser = null;

    try {

        if (
            typeof StockFlowAuth === "undefined"
        ) {

            console.error(
                "StockFlowAuth is not available."
            );

            return;
        }


        currentUser =
            await StockFlowAuth.requireAuth();


        if (!currentUser) {
            return;
        }


        if (
            typeof StockFlowAuth.bindUserUI === "function"
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

        return;
    }


    /* ========================================================
       DOM HELPERS
       ======================================================== */

    const $ = (selector) =>
        document.querySelector(selector);


    const $$ = (selector) =>
        document.querySelectorAll(selector);


    const get = (id) =>
        document.getElementById(id);


    const setText = (
        id,
        value
    ) => {

        const element =
            get(id);

        if (element) {

            element.textContent =
                value ?? "0";

        }

    };


    const setHTML = (
        id,
        html
    ) => {

        const element =
            get(id);

        if (element) {

            element.innerHTML =
                html;

        }

    };


    /* ========================================================
       GLOBAL UI REFERENCES
       ======================================================== */

    const sidebar =
        get("sidebar");


    const mobileMenuBtn =
        get("mobileMenuBtn");


    const sidebarOverlay =
        get("sidebarOverlay");


    const notificationBtn =
        get("notificationBtn");


    let notificationPanel =
        get("notificationPanel");


    /* ========================================================
       SIDEBAR CONTROLLER
       ======================================================== */

    function isMobile() {

        return window.innerWidth <= 900;

    }


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
           MOBILE
           ---------------------------------------------------- */

        if (isMobile()) {

            if (
                sidebar.classList.contains(
                    "open"
                )
            ) {

                closeMobileSidebar();

            }

            else {

                openMobileSidebar();

            }

            return;
        }


        /* ----------------------------------------------------
           DESKTOP
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


    /* ========================================================
       HAMBURGER BUTTON
       ======================================================== */

    if (mobileMenuBtn) {

        mobileMenuBtn.setAttribute(
            "type",
            "button"
        );


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
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                toggleSidebar();

            }
        );

    }


    /* ========================================================
       SIDEBAR OVERLAY
       ======================================================== */

    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            () => {

                closeMobileSidebar();

            }
        );

    }


    /* ========================================================
       SIDEBAR LINKS
       ======================================================== */

    $$(".sidebar-link")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    /*
                     * Only close the sidebar on mobile.
                     * Do not interfere with navigation.
                     */

                    if (isMobile()) {

                        closeMobileSidebar();

                    }

                }
            );

        });


    /* ========================================================
       WINDOW RESIZE
       ======================================================== */

    let previousMobileState =
        isMobile();


    window.addEventListener(
        "resize",
        () => {

            const currentMobileState =
                isMobile();


            /*
             * If switching between desktop
             * and mobile, clean up the
             * previous sidebar state.
             */

            if (
                currentMobileState !==
                previousMobileState
            ) {

                closeMobileSidebar();

            }


            previousMobileState =
                currentMobileState;

        }
    );


    /* ========================================================
       LOGOUT
       ======================================================== */

    const logoutBtn =
        get("logoutBtn");


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async () => {

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
        );

    }


    /* ========================================================
       NOTIFICATION PANEL
       ======================================================== */

    function ensureNotificationPanel() {

        /*
         * If notificationPanel already exists
         * in dashboard.html, use it.
         */

        notificationPanel =
            get("notificationPanel");


        if (notificationPanel) {

            return notificationPanel;

        }


        /*
         * Fallback:
         * Create notification panel automatically.
         */

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


        notificationPanel =
            document.createElement(
                "div"
            );


        notificationPanel.id =
            "notificationPanel";


        notificationPanel.className =
            "notification-panel";


        notificationPanel.innerHTML = `

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
            notificationPanel
        );


        return notificationPanel;

    }


    function closeNotifications() {

        if (!notificationPanel) {
            return;
        }


        notificationPanel.classList.remove(
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

        if (!notificationPanel) {
            return;
        }


        notificationPanel.classList.add(
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

        if (!notificationPanel) {

            ensureNotificationPanel();

        }


        if (!notificationPanel) {
            return;
        }


        const isOpen =
            notificationPanel.classList.contains(
                "show"
            );


        if (isOpen) {

            closeNotifications();

        }

        else {

            openNotifications();

        }

    }


    if (notificationBtn) {

        notificationBtn.setAttribute(
            "type",
            "button"
        );


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
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                toggleNotifications();

            }
        );

    }


    /* ========================================================
       NOTIFICATION CLOSE BUTTON
       ======================================================== */

    document.addEventListener(
        "click",
        (event) => {

            const closeBtn =
                event.target.closest(
                    "#notificationCloseBtn"
                );


            if (closeBtn) {

                closeNotifications();

            }

        }
    );


    /* ========================================================
       CLOSE NOTIFICATION WHEN CLICKING OUTSIDE
       ======================================================== */

    document.addEventListener(
        "click",
        (event) => {

            if (!notificationPanel) {
                return;
            }


            if (
                notificationPanel.contains(
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


    /* ========================================================
       ESC KEY
       ======================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

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

            /*
             * Keep existing dashboard
             * connection classes.
             */

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
       NUMBER FORMAT
       ======================================================== */

    function formatNumber(
        value
    ) {

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
       ESCAPE HTML
       ======================================================== */

    function esc(
        value
    ) {

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
       DATE FORMATTER
       ======================================================== */

    function formatDate(
        value
    ) {

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


    /* ========================================================
       ACTIVITY ICON
       ======================================================== */

    function activityIcon(
        type
    ) {

        const value =
            String(
                type ?? ""
            )
            .toLowerCase();


        if (
            value.includes("stock in") ||
            value.includes("inbound") ||
            value.includes("receive")
        ) {

            return `
                <i class="fa-solid fa-arrow-down"></i>
            `;

        }


        if (
            value.includes("stock out") ||
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


        return `
            <i class="fa-solid fa-clock-rotate-left"></i>
        `;

    }


    /* ========================================================
       RENDER NOTIFICATIONS
       ======================================================== */

    function renderNotifications(
        stats
    ) {

        const list =
            get(
                "notificationList"
            );


        if (!list) {
            return;
        }


        const lowStock =
            Number(
                stats?.lowStock ??
                0
            );


        const outOfStock =
            Number(
                stats?.outOfStock ??
                0
            );


        const products =
            Number(
                stats?.products ??
                stats?.totalProducts ??
                0
            );


        const notifications =
            [];


        /* ----------------------------------------------------
           OUT OF STOCK
           ---------------------------------------------------- */

        if (
            outOfStock > 0
        ) {

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
                    "inventory.html"

            });

        }


        /* ----------------------------------------------------
           LOW STOCK
           ---------------------------------------------------- */

        if (
            lowStock > 0
        ) {

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
                    "inventory.html"

            });

        }


        /* ----------------------------------------------------
           NO PRODUCTS
           ---------------------------------------------------- */

        if (
            products === 0
        ) {

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
                    "products.html"

            });

        }


        /* ----------------------------------------------------
           NOTHING TO REPORT
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


        /* ----------------------------------------------------
           RENDER
           ---------------------------------------------------- */

        list.innerHTML =
            notifications
                .map(
                    item => `

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

                    `
                )
                .join("");

    }


    /* ========================================================
       RENDER RECENT TRANSACTIONS
       ======================================================== */

    function renderTransactions(
        transactions
    ) {

        const container =
            get(
                "recentTransactions"
            );


        if (!container) {
            return;
        }


        if (
            !Array.isArray(
                transactions
            ) ||
            transactions.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <i class="fa-solid fa-inbox"></i>

                    <strong>
                        No recent transactions
                    </strong>

                    <span>
                        Stock In and Stock Out
                        transactions will appear here.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            transactions
                .slice(0, 8)
                .map(
                    transaction => {

                        const product =
                            transaction.PRODUCT_NAME ||
                            transaction.productName ||
                            transaction.PRODUCT ||
                            transaction.product ||
                            transaction.NAME ||
                            transaction.name ||
                            "Inventory Item";


                        const type =
                            transaction.TYPE ||
                            transaction.type ||
                            transaction.ACTION ||
                            transaction.action ||
                            transaction.TRANSACTION_TYPE ||
                            transaction.transactionType ||
                            "Inventory Activity";


                        const quantity =
                            transaction.QUANTITY ??
                            transaction.quantity ??
                            transaction.QTY ??
                            transaction.qty ??
                            0;


                        const date =
                            transaction.DATE ||
                            transaction.date ||
                            transaction.CREATED_AT ||
                            transaction.createdAt ||
                            "";


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

                    }
                )
                .join("");

    }


    /* ========================================================
       RENDER RECENT ACTIVITY
       ======================================================== */

    function renderActivity(
        activities
    ) {

        const container =
            get(
                "recentActivity"
            );


        if (!container) {
            return;
        }


        if (
            !Array.isArray(
                activities
            ) ||
            activities.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <i class="fa-solid fa-clock-rotate-left"></i>

                    <strong>
                        No recent activity
                    </strong>

                    <span>
                        Your latest inventory activities
                        will appear here.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            activities
                .slice(0, 8)
                .map(
                    activity => {

                        const name =
                            activity.PRODUCT_NAME ||
                            activity.productName ||
                            activity.NAME ||
                            activity.name ||
                            activity.DESCRIPTION ||
                            activity.description ||
                            "Inventory activity";


                        const type =
                            activity.TYPE ||
                            activity.type ||
                            activity.ACTION ||
                            activity.action ||
                            "Activity";


                        const date =
                            activity.DATE ||
                            activity.date ||
                            activity.CREATED_AT ||
                            activity.createdAt ||
                            "";


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

                    }
                )
                .join("");

    }


    /* ========================================================
       INVENTORY OVERVIEW
       ======================================================== */

    function renderInventoryOverview(
        stats
    ) {

        const container =
            get(
                "inventoryOverview"
            );


        if (!container) {
            return;
        }


        const totalStock =
            Number(
                stats.totalStock ??
                stats.stock ??
                stats.total ??
                0
            );


        const lowStock =
            Number(
                stats.lowStock ??
                0
            );


        const outOfStock =
            Number(
                stats.outOfStock ??
                0
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
       LOAD DASHBOARD
       ======================================================== */

    async function loadDashboard() {

        try {

            setConnectionStatus(
                false,
                "Connecting to StockFlow..."
            );


            if (
                typeof StockFlowAPI ===
                "undefined"
            ) {

                throw new Error(
                    "StockFlowAPI is not available. Check API.js."
                );

            }


            if (
                typeof StockFlowAPI.dashboardStats !==
                "function"
            ) {

                throw new Error(
                    "dashboardStats() is not available in API.js."
                );

            }


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


            const stats =
                response.stats ||
                response.data ||
                response;


            /* =================================================
               MAIN COUNTERS
               ================================================= */

            const products =
                stats.products ??
                stats.totalProducts ??
                stats.productCount ??
                0;


            const categories =
                stats.categories ??
                stats.totalCategories ??
                stats.categoryCount ??
                0;


            const suppliers =
                stats.suppliers ??
                stats.totalSuppliers ??
                stats.supplierCount ??
                0;


            const totalStock =
                stats.totalStock ??
                stats.stock ??
                stats.totalUnits ??
                0;


            const stockIn =
                stats.stockIn ??
                stats.totalStockIn ??
                0;


            const stockOut =
                stats.stockOut ??
                stats.totalStockOut ??
                0;


            const lowStock =
                stats.lowStock ??
                0;


            const outOfStock =
                stats.outOfStock ??
                0;


            /* =================================================
               DASHBOARD CARDS
               ================================================= */

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


            /* =================================================
               INVENTORY OVERVIEW
               ================================================= */

            renderInventoryOverview({

                totalStock,
                lowStock,
                outOfStock

            });


            /* =================================================
               RECENT TRANSACTIONS
               ================================================= */

            renderTransactions(

                response.recentTransactions ||
                stats.recentTransactions ||
                response.transactions ||
                []

            );


            /* =================================================
               RECENT ACTIVITY
               ================================================= */

            renderActivity(

                response.recentActivity ||
                stats.recentActivity ||
                response.activity ||
                []

            );


            /* =================================================
               NOTIFICATIONS
               ================================================= */

            renderNotifications({

                products,
                lowStock,
                outOfStock

            });


            /* =================================================
               CONNECTION
               ================================================= */

            setConnectionStatus(
                true,
                "StockFlow is connected."
            );


            /* =================================================
               LAST UPDATED
               ================================================= */

            const lastUpdated =
                get(
                    "lastUpdated"
                );


            if (lastUpdated) {

                lastUpdated.textContent =
                    "Updated " +
                    new Date()
                        .toLocaleTimeString(
                            undefined,
                            {
                                hour:
                                    "numeric",

                                minute:
                                    "2-digit"
                            }
                        );

            }


            return true;

        }

        catch (error) {

            console.error(
                "Dashboard loading failed:",
                error
            );


            /* =================================================
               FALLBACK COUNTERS
               ================================================= */

            [

                "productsCount",
                "categoriesCount",
                "suppliersCount",
                "totalStockCount",
                "stockInCount",
                "stockOutCount",
                "lowStockCount",
                "outOfStockCount"

            ].forEach(
                id =>
                    setText(
                        id,
                        "—"
                    )
            );


            /* =================================================
               FALLBACK INVENTORY
               ================================================= */

            const overview =
                get(
                    "inventoryOverview"
                );


            if (overview) {

                overview.innerHTML = `

                    <div class="empty-state">

                        <i class="fa-solid fa-cloud-arrow-down"></i>

                        <strong>
                            Inventory data unavailable
                        </strong>

                        <span>
                            ${esc(
                                error.message ||
                                "Unable to connect to the database."
                            )}
                        </span>

                    </div>

                `;

            }


            /* =================================================
               CONNECTION ERROR
               ================================================= */

            setConnectionStatus(
                false,
                error.message ||
                "Unable to connect to StockFlow."
            );


            return false;

        }

    }


    /* ========================================================
       REFRESH DASHBOARD
       ======================================================== */

    async function refreshDashboard() {

        const refreshBtn =
            get(
                "refreshDashboardBtn"
            );


        const refreshBtn2 =
            get(
                "refreshBtn"
            );


        const buttons =
            [
                refreshBtn,
                refreshBtn2
            ]
            .filter(Boolean);


        buttons.forEach(
            button => {

                button.disabled =
                    true;

                button.classList.add(
                    "loading"
                );

            }
        );


        try {

            await loadDashboard();

        }

        finally {

            buttons.forEach(
                button => {

                    button.disabled =
                        false;

                    button.classList.remove(
                        "loading"
                    );

                }
            );

        }

    }


    /* ========================================================
       REFRESH BUTTONS
       ======================================================== */

    get(
        "refreshDashboardBtn"
    )
    ?.addEventListener(
        "click",
        refreshDashboard
    );


    get(
        "refreshBtn"
    )
    ?.addEventListener(
        "click",
        refreshDashboard
    );


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
            () => {

                window.location.href =
                    destination;

            }
        );

    }


    bindQuickAction(
        "addProductBtn",
        "products.html"
    );


    bindQuickAction(
        "stockInBtn",
        "stock-in.html"
    );


    bindQuickAction(
        "stockOutBtn",
        "stock-out.html"
    );


    bindQuickAction(
        "manageProductsBtn",
        "products.html"
    );


    bindQuickAction(
        "manageCategoriesBtn",
        "categories.html"
    );


    bindQuickAction(
        "manageSuppliersBtn",
        "suppliers.html"
    );


    /* ========================================================
       AUTO REFRESH
       ======================================================== */

    let refreshTimer =
        null;


    function startAutoRefresh() {

        if (refreshTimer) {

            clearInterval(
                refreshTimer
            );

        }


        refreshTimer =
            setInterval(
                () => {

                    loadDashboard();

                },
                60000
            );

    }


    /* ========================================================
       INITIAL NOTIFICATION PANEL
       ======================================================== */

    ensureNotificationPanel();


    /* ========================================================
       INITIAL DASHBOARD LOAD
       ======================================================== */

    await loadDashboard();


    /* ========================================================
       AUTO REFRESH
       ======================================================== */

    startAutoRefresh();


    /* ========================================================
       ONLINE EVENT
       ======================================================== */

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


    /* ========================================================
       OFFLINE EVENT
       ======================================================== */

    window.addEventListener(
        "offline",
        () => {

            setConnectionStatus(
                false,
                "Your browser is offline."
            );

        }
    );


    /* ========================================================
       EXPOSE DASHBOARD API
       ======================================================== */

    window.StockFlowDashboard = {

        refresh:
            refreshDashboard,

        reload:
            loadDashboard,

        currentUser:
            () => currentUser,

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

});
