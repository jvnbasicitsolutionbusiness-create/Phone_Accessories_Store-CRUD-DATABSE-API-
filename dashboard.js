/* ============================================================
   STOCKFLOW | DASHBOARD.JS
   ============================================================
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
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    /* ========================================================
       AUTHENTICATION
       ======================================================== */

    let currentUser = null;

    try {

        currentUser =
            await StockFlowAuth.requireAuth();

        if (!currentUser) {
            return;
        }

        StockFlowAuth.bindUserUI(currentUser);

    } catch (error) {

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


    const setText = (id, value) => {

        const element = get(id);

        if (element) {
            element.textContent =
                value ?? 0;
        }

    };


    const setHTML = (id, html) => {

        const element = get(id);

        if (element) {
            element.innerHTML = html;
        }

    };


    /* ========================================================
       SIDEBAR / MOBILE MENU
       ======================================================== */

    $("#mobileMenuBtn")?.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "sidebar-open"
            );

        }
    );


    $("#sidebarOverlay")?.addEventListener(
        "click",
        () => {

            document.body.classList.remove(
                "sidebar-open"
            );

        }
    );


    /* ========================================================
       LOGOUT
       ======================================================== */

    $("#logoutBtn")?.addEventListener(
        "click",
        async () => {

            try {

                await StockFlowAuth.logout();

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );


    /* ========================================================
       SIDEBAR NAVIGATION
       ======================================================== */

    $$(".sidebar-link").forEach(link => {

        link.addEventListener(
            "click",
            () => {

                $$(".sidebar-link")
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );

                link.classList.add(
                    "active"
                );

                document.body.classList.remove(
                    "sidebar-open"
                );

            }
        );

    });


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
       ESCAPE HTML
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
       DATE FORMATTER
       ======================================================== */

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


    /* ========================================================
       STATUS BADGE
       ======================================================== */

    function statusBadge(
        status
    ) {

        const value =
            String(
                status ?? ""
            )
            .trim()
            .toUpperCase();


        let className =
            "status-badge";


        if (
            value === "ACTIVE" ||
            value === "IN STOCK" ||
            value === "COMPLETED"
        ) {

            className +=
                " success";

        }

        else if (
            value === "LOW STOCK" ||
            value === "PENDING"
        ) {

            className +=
                " warning";

        }

        else if (
            value === "OUT OF STOCK" ||
            value === "DISABLED" ||
            value === "CANCELLED"
        ) {

            className +=
                " danger";

        }

        else {

            className +=
                " neutral";

        }


        return `
            <span class="${className}">
                ${esc(status || "Unknown")}
            </span>
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
       DASHBOARD STATS
       ======================================================== */

    async function loadDashboard() {

        try {

            setConnectionStatus(
                false,
                "Connecting to StockFlow..."
            );


            /*
             * dashboardStats() is supplied by API.js.
             *
             * API.js can retrieve the combined dashboard
             * information from Google Apps Script and/or
             * Firebase depending on the current configuration.
             */

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


            /* ------------------------------------------------
               MAIN COUNTERS
               ------------------------------------------------ */

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


            /* ------------------------------------------------
               DASHBOARD CARDS
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

            renderTransactions(

                response.recentTransactions ||
                stats.recentTransactions ||
                response.transactions ||
                []

            );


            /* ------------------------------------------------
               ACTIVITY
               ------------------------------------------------ */

            renderActivity(

                response.recentActivity ||
                stats.recentActivity ||
                response.activity ||
                []

            );


            /* ------------------------------------------------
               CONNECTION
               ------------------------------------------------ */

            setConnectionStatus(
                true,
                "StockFlow is connected."
            );


            /* ------------------------------------------------
               LAST UPDATED
               ------------------------------------------------ */

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


            /* ------------------------------------------------
               SHOW FALLBACK STATE
               ------------------------------------------------ */

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


        if (refreshBtn) {

            refreshBtn.disabled =
                true;

            refreshBtn.classList.add(
                "loading"
            );

        }


        try {

            await loadDashboard();

        }

        finally {

            if (refreshBtn) {

                refreshBtn.disabled =
                    false;

                refreshBtn.classList.remove(
                    "loading"
                );

            }

        }

    }


    /* ========================================================
       REFRESH BUTTON
       ======================================================== */

    $("#refreshDashboardBtn")
        ?.addEventListener(
            "click",
            refreshDashboard
        );


    $("#refreshBtn")
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
       INITIAL LOAD
       ======================================================== */

    await loadDashboard();


    startAutoRefresh();


    /* ========================================================
       ONLINE / OFFLINE EVENTS
       ======================================================== */

    window.addEventListener(
        "online",
        () => {

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


    /* ========================================================
       EXPOSE DASHBOARD REFRESH
       ======================================================== */

    window.StockFlowDashboard = {

        refresh:
            refreshDashboard,

        reload:
            loadDashboard,

        currentUser:
            () => currentUser

    };

});
