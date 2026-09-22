/* ============================================================
   STOCKFLOW
   TRANSACTIONS MODULE
   ============================================================ */

(() => {
    "use strict";


    /* =========================================================
       DOM HELPERS
    ========================================================= */

    const $ = (id) => document.getElementById(id);

    const rows = $("rows");
    const alertBox = $("alert");

    const totalTransactions = $("totalTransactions");
    const stockInCount = $("stockInCount");
    const stockOutCount = $("stockOutCount");
    const totalUnits = $("totalUnits");

    const transactionCountText = $("transactionResultText");

    const searchInput = $("transactionSearch");

    const emptyState = $("emptyState");

    let allTransactions = [];
    let currentFilter = "ALL";


    /* =========================================================
       HTML ESCAPE
    ========================================================= */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================================================
       NUMBER HELPERS
    ============================================================ */

    function number(value) {

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }


    function formatNumber(value) {

        return number(value).toLocaleString(
            "en-PH",
            {
                maximumFractionDigits: 0
            }
        );
    }


    function formatCurrency(value) {

        return number(value).toLocaleString(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }


    /* =========================================================
       DATE FORMAT
    ============================================================ */

    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHTML(value);
        }

        return date.toLocaleString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    /* =========================================================
       ALERTS
    ============================================================ */

    function showAlert(message, type = "error") {

        if (!alertBox) {
            return;
        }

        alertBox.textContent = message || "";

        alertBox.className =
            `sf-alert show ${type}`;

    }


    function clearAlert() {

        if (!alertBox) {
            return;
        }

        alertBox.textContent = "";

        alertBox.className = "sf-alert";
    }


    /* =========================================================
       API REQUEST
    ============================================================ */

    async function requestTransactions(type) {

        if (
            typeof StockFlowAPI === "undefined" ||
            typeof StockFlowAPI.request !== "function"
        ) {
            throw new Error(
                "StockFlow API is not available. Check api.js."
            );
        }


        const response = await StockFlowAPI.request({

            action: "listTransactions",

            type,

            token:
                typeof StockFlowAPI.token === "function"
                    ? StockFlowAPI.token()
                    : ""

        });


        if (!response) {

            throw new Error(
                "The inventory server returned no response."
            );

        }


        if (!response.success) {

            throw new Error(
                response.message ||
                `Unable to load ${type} transactions.`
            );

        }


        /*
         * Backend returns:
         *
         * {
         *     success: true,
         *     records: [...]
         * }
         */

        return Array.isArray(response.records)
            ? response.records
            : [];
    }


    /* =========================================================
       LOAD ALL TRANSACTIONS
    ============================================================ */

    async function loadTransactions() {

        clearAlert();

        showLoading();


        try {

            /*
             * Backend requires IN or OUT.
             * Therefore ALL = combine both requests.
             */

            const [
                stockIn,
                stockOut
            ] = await Promise.all([
                requestTransactions("IN"),
                requestTransactions("OUT")
            ]);


            const normalizedIn =
                stockIn.map(record =>
                    normalizeRecord(record, "STOCK_IN")
                );


            const normalizedOut =
                stockOut.map(record =>
                    normalizeRecord(record, "STOCK_OUT")
                );


            allTransactions = [
                ...normalizedIn,
                ...normalizedOut
            ];


            sortTransactions();


            updateSummary();

            renderTransactions();

        } catch (error) {

            console.error(
                "STOCKFLOW transactions error:",
                error
            );


            allTransactions = [];

            updateSummary();

            showErrorState();

            showAlert(
                error.message ||
                "Unable to load transaction records.",
                "error"
            );

        }

    }


    /* =========================================================
       NORMALIZE RECORD
    ============================================================ */

    function normalizeRecord(record, type) {

        return {

            type,

            id:
                record.ID ||
                record.id ||
                "",

            date:
                record.DATE ||
                record.date ||
                record.CREATED_AT ||
                record.createdAt ||
                "",

            reference:
                record.REFERENCE ||
                record.reference ||
                "—",

            product:
                record.PRODUCT ||
                record.PRODUCT_NAME ||
                record.product ||
                record.productName ||
                "—",

            sku:
                record.SKU ||
                record.sku ||
                "—",

            quantity:
                number(
                    record.QTY ??
                    record.QUANTITY ??
                    record.quantity
                ),

            total:
                number(
                    record.TOTAL_COST ??
                    record.TOTAL ??
                    record.total ??
                    0
                ),

            user:
                record.CREATED_BY ||
                record.USER ||
                record.username ||
                record.user ||
                "System"

        };

    }


    /* =========================================================
       SORT
    ============================================================ */

    function sortTransactions() {

        allTransactions.sort(
            (a, b) => {

                const dateA =
                    new Date(a.date).getTime() || 0;

                const dateB =
                    new Date(b.date).getTime() || 0;

                return dateB - dateA;

            }
        );

    }


    /* =========================================================
       SUMMARY
    ============================================================ */

    function updateSummary() {

        const stockIn =
            allTransactions.filter(
                item => item.type === "STOCK_IN"
            );

        const stockOut =
            allTransactions.filter(
                item => item.type === "STOCK_OUT"
            );


        const units =
            allTransactions.reduce(
                (sum, item) =>
                    sum + number(item.quantity),
                0
            );


        if (totalTransactions) {
            totalTransactions.textContent =
                formatNumber(allTransactions.length);
        }


        if (stockInCount) {
            stockInCount.textContent =
                formatNumber(stockIn.length);
        }


        if (stockOutCount) {
            stockOutCount.textContent =
                formatNumber(stockOut.length);
        }


        if (totalUnits) {
            totalUnits.textContent =
                formatNumber(units);
        }

    }


    /* =========================================================
       FILTER
    ============================================================ */

    function getFilteredTransactions() {

        let filtered =
            [...allTransactions];


        if (currentFilter !== "ALL") {

            filtered =
                filtered.filter(
                    item =>
                        item.type === currentFilter
                );

        }


        const search =
            String(
                searchInput?.value || ""
            )
                .trim()
                .toLowerCase();


        if (search) {

            filtered =
                filtered.filter(item => {

                    return [

                        item.reference,

                        item.product,

                        item.sku,

                        item.user,

                        item.type

                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(search);

                });

        }


        return filtered;

    }


    /* =========================================================
       RENDER
    ============================================================ */

    function renderTransactions() {

        const filtered =
            getFilteredTransactions();


        if (!rows) {
            return;
        }


        if (!filtered.length) {

            rows.innerHTML = "";

            if (emptyState) {
                emptyState.hidden = false;
            }

            updateResultText(0);

            return;

        }


        if (emptyState) {
            emptyState.hidden = true;
        }


        rows.innerHTML =
            filtered
                .map(renderTransactionRow)
                .join("");


        updateResultText(
            filtered.length
        );

    }


    /* =========================================================
       TABLE ROW
    ============================================================ */

    function renderTransactionRow(item) {

        const incoming =
            item.type === "STOCK_IN";


        const typeLabel =
            incoming
                ? "STOCK IN"
                : "STOCK OUT";


        const typeClass =
            incoming
                ? "in"
                : "out";


        const initials =
            getInitials(item.user);


        return `
            <tr>

                <td>
                    ${formatDate(item.date)}
                </td>


                <td>

                    <span
                        class="transaction-type ${typeClass}"
                    >

                        <span
                            class="transaction-type-dot"
                        ></span>

                        ${typeLabel}

                    </span>

                </td>


                <td class="reference-cell">
                    ${escapeHTML(item.reference)}
                </td>


                <td class="product-cell">
                    ${escapeHTML(item.product)}
                </td>


                <td>

                    <span class="transaction-sku">
                        ${escapeHTML(item.sku)}
                    </span>

                </td>


                <td class="quantity-cell">
                    ${formatNumber(item.quantity)}
                </td>


                <td class="total-cell">
                    ${formatCurrency(item.total)}
                </td>


                <td>

                    <div class="transaction-user">

                        <span
                            class="transaction-user-avatar"
                        >
                            ${escapeHTML(initials)}
                        </span>

                        <span>
                            ${escapeHTML(item.user)}
                        </span>

                    </div>

                </td>

            </tr>
        `;

    }


    /* =========================================================
       INITIALS
    ============================================================ */

    function getInitials(name) {

        const value =
            String(name || "SF")
                .trim();


        if (!value) {
            return "SF";
        }


        const parts =
            value
                .split(/\s+/)
                .filter(Boolean);


        if (parts.length === 1) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();

        }


        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();

    }


    /* =========================================================
       RESULT TEXT
    ============================================================ */

    function updateResultText(count) {

        if (!transactionCountText) {
            return;
        }


        const total =
            allTransactions.length;


        if (!total) {

            transactionCountText.textContent =
                "No transaction records";

            return;

        }


        if (count === total) {

            transactionCountText.textContent =
                `${formatNumber(total)} transaction record${
                    total === 1 ? "" : "s"
                }`;

            return;

        }


        transactionCountText.textContent =
            `Showing ${formatNumber(count)} of ${formatNumber(total)} records`;

    }


    /* =========================================================
       LOADING STATE
    ============================================================ */

    function showLoading() {

        if (!rows) {
            return;
        }


        if (emptyState) {
            emptyState.hidden = true;
        }


        rows.innerHTML = `
            <tr>

                <td
                    colspan="8"
                    class="transaction-loading"
                >

                    <span>

                        <span class="loading-spinner"></span>

                        Loading transaction records...

                    </span>

                </td>

            </tr>
        `;

    }


    /* =========================================================
       ERROR STATE
    ============================================================ */

    function showErrorState() {

        if (!rows) {
            return;
        }


        if (emptyState) {
            emptyState.hidden = true;
        }


        rows.innerHTML = `
            <tr>

                <td
                    colspan="8"
                    class="transaction-loading"
                >

                    <span>
                        Unable to load transaction records.
                    </span>

                </td>

            </tr>
        `;


        if (transactionCountText) {

            transactionCountText.textContent =
                "Unable to load records";

        }

    }


    /* =========================================================
       FILTER BUTTONS
    ============================================================ */

    function setupFilters() {

        const buttons =
            document.querySelectorAll(
                ".transaction-filter"
            );


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    currentFilter =
                        button.dataset.filter ||
                        "ALL";


                    buttons.forEach(
                        other => {

                            const active =
                                other === button;


                            other.classList.toggle(
                                "active",
                                active
                            );


                            other.setAttribute(
                                "aria-pressed",
                                active
                                    ? "true"
                                    : "false"
                            );

                        }
                    );


                    renderTransactions();

                }
            );

        });

    }


    /* =========================================================
       SEARCH
    ============================================================ */

    function setupSearch() {

        if (!searchInput) {
            return;
        }


        searchInput.addEventListener(
            "input",
            renderTransactions
        );

    }


    /* =========================================================
       RESET
    ============================================================ */

    function resetFilter() {

        currentFilter = "ALL";


        if (searchInput) {
            searchInput.value = "";
        }


        document
            .querySelectorAll(
                ".transaction-filter"
            )
            .forEach(button => {

                const active =
                    button.dataset.filter === "ALL";


                button.classList.toggle(
                    "active",
                    active
                );


                button.setAttribute(
                    "aria-pressed",
                    active
                        ? "true"
                        : "false"
                );

            });


        renderTransactions();

    }


    /* =========================================================
       REFRESH
    ============================================================ */

    function setupRefresh() {

        const refreshButton =
            $("refreshButton");

        const bottomRefreshButton =
            $("bottomRefreshButton");


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                loadTransactions
            );

        }


        if (bottomRefreshButton) {

            bottomRefreshButton.addEventListener(
                "click",
                loadTransactions
            );

        }

    }


    /* =========================================================
       USER INFORMATION
    ============================================================ */

    function populateUser() {

        try {

            if (
                typeof StockFlowAuth === "undefined" ||
                typeof StockFlowAuth.getUser !== "function"
            ) {
                return;
            }


            const user =
                StockFlowAuth.getUser();


            if (!user) {
                return;
            }


            const name =
                user.name ||
                user.fullName ||
                user.username ||
                user.email ||
                "StockFlow User";


            const role =
                user.role ||
                user.position ||
                "Employee";


            const nameElements = [

                $("headerUserName"),
                $("sidebarUserName")

            ];


            const roleElements = [

                $("headerUserRole"),
                $("sidebarUserRole")

            ];


            nameElements.forEach(
                element => {

                    if (element) {
                        element.textContent = name;
                    }

                }
            );


            roleElements.forEach(
                element => {

                    if (element) {
                        element.textContent = role;
                    }

                }
            );


            const initials =
                getInitials(name);


            document
                .querySelectorAll(
                    ".sf-user-avatar, .sf-header-avatar"
                )
                .forEach(
                    avatar => {
                        avatar.textContent =
                            initials;
                    }
                );

        } catch (error) {

            console.warn(
                "Unable to populate user information:",
                error
            );

        }

    }


    /* =========================================================
       LOGOUT
    ============================================================ */

    function setupLogout() {

        const logoutButton =
            $("logoutButton");


        if (!logoutButton) {
            return;
        }


        logoutButton.addEventListener(
            "click",
            async () => {

                try {

                    logoutButton.disabled = true;

                    logoutButton.innerHTML =
                        "<span>↪</span><span>Signing out...</span>";


                    if (
                        typeof StockFlowAuth !== "undefined" &&
                        typeof StockFlowAuth.logout === "function"
                    ) {

                        await StockFlowAuth.logout();

                    } else {

                        sessionStorage.clear();

                        window.location.href =
                            "auth.html";

                    }

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    sessionStorage.clear();

                    window.location.href =
                        "auth.html";

                }

            }
        );

    }


    /* =========================================================
       MOBILE SIDEBAR
    ============================================================ */

    function setupMobileMenu() {

        const menuButton =
            $("mobileMenuButton");

        const sidebar =
            document.querySelector(
                ".sf-sidebar"
            );

        const overlay =
            $("sidebarOverlay");


        if (
            !menuButton ||
            !sidebar ||
            !overlay
        ) {
            return;
        }


        function openMenu() {

            sidebar.classList.add(
                "mobile-open"
            );

            overlay.hidden = false;

        }


        function closeMenu() {

            sidebar.classList.remove(
                "mobile-open"
            );

            overlay.hidden = true;

        }


        menuButton.addEventListener(
            "click",
            openMenu
        );


        overlay.addEventListener(
            "click",
            closeMenu
        );


        sidebar
            .querySelectorAll(".sf-nav-item")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeMenu
                );

            });

    }


    /* =========================================================
       RESET BUTTON
    ============================================================ */

    function setupReset() {

        const button =
            $("resetFilterButton");


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            resetFilter
        );

    }


    /* =========================================================
       AUTH CHECK
    ============================================================ */

    async function initializeAuth() {

        if (
            typeof StockFlowAuth === "undefined"
        ) {
            return true;
        }


        if (
            typeof StockFlowAuth.requireAuth !==
            "function"
        ) {
            return true;
        }


        const user =
            await StockFlowAuth.requireAuth();


        return Boolean(user);

    }


    /* =========================================================
       INITIALIZE
    ============================================================ */

    async function initialize() {

        try {

            const authenticated =
                await initializeAuth();


            if (!authenticated) {
                return;
            }


            populateUser();

            setupFilters();

            setupSearch();

            setupRefresh();

            setupReset();

            setupLogout();

            setupMobileMenu();

            await loadTransactions();

        } catch (error) {

            console.error(
                "STOCKFLOW transaction initialization error:",
                error
            );

            showAlert(
                error.message ||
                "Unable to initialize Transactions.",
                "error"
            );

        }

    }


    /* =========================================================
       START
    ============================================================ */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();
