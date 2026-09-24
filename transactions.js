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

    const transactionCountText =
        $("transactionResultText");

    const searchInput =
        $("transactionSearch");

    const emptyState =
        $("emptyState");


    let allTransactions = [];

    let currentFilter = "ALL";

    let currentUser = null;

    let initialized = false;


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
    ========================================================= */

    function number(value) {

        const parsed =
            Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;

    }


    function formatNumber(value) {

        return number(value)
            .toLocaleString(
                "en-PH",
                {
                    maximumFractionDigits: 0
                }
            );

    }


    function formatCurrency(value) {

        return number(value)
            .toLocaleString(
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


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

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
            `sf-alert show ${type}`;

    }


    function clearAlert() {

        if (!alertBox) {
            return;
        }


        alertBox.textContent =
            "";


        alertBox.className =
            "sf-alert";

    }


    /* =========================================================
       SESSION USER
       ============================================================ */

    function getSessionUser() {

        try {

            const raw =
                sessionStorage.getItem(
                    "STOCKFLOW_SESSION"
                );


            if (!raw) {
                return null;
            }


            const session =
                JSON.parse(raw);


            if (!session) {
                return null;
            }


            return (
                session.user ||
                session.data?.user ||
                session.profile ||
                null
            );

        } catch (error) {

            console.warn(
                "STOCKFLOW: unable to read session user.",
                error
            );

            return null;

        }

    }


    /* =========================================================
       USER IDENTITY
    ============================================================ */

    function getUserIdentity(user) {

        if (!user) {
            return "";
        }


        return (
            user.username ||
            user.email ||
            user.gmail ||
            user.phone ||
            user.employeeId ||
            user.employee_id ||
            user.id ||
            user.userId ||
            ""
        );

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
       USER NAME
    ============================================================ */

    function getUserName(user) {

        if (!user) {
            return "STOCKFLOW USER";
        }


        return (
            user.name ||
            user.fullName ||
            user.full_name ||
            user.username ||
            user.email ||
            user.gmail ||
            "STOCKFLOW USER"
        );

    }


    /* =========================================================
       USER ROLE
    ============================================================ */

    function getUserRole(user) {

        if (!user) {
            return "Employee";
        }


        return (
            user.role ||
            user.position ||
            user.accountStatus ||
            user.account_status ||
            "Employee"
        );

    }


    /* =========================================================
       USER UI ELEMENTS
    ============================================================ */

    function getUserNameElements() {

        return [
            $("headerUserName"),
            $("sidebarUserName"),
            $("topbarUserName"),
            $("userName"),
            $("topUserName")
        ].filter(Boolean);

    }


    function getUserRoleElements() {

        return [
            $("headerUserRole"),
            $("sidebarUserRole"),
            $("topbarUserRole"),
            $("userRole"),
            $("topUserRole")
        ].filter(Boolean);

    }


    /* =========================================================
       POPULATE USER
    ============================================================ */

    function populateUser() {

        try {

            let user =
                getSessionUser();


            /*
             * Keep compatibility with the existing
             * StockFlowAuth system if it exists.
             */

            if (
                !user &&
                typeof StockFlowAuth !== "undefined" &&
                typeof StockFlowAuth.getUser ===
                    "function"
            ) {

                try {

                    user =
                        StockFlowAuth.getUser();

                } catch (error) {

                    console.warn(
                        "StockFlowAuth user lookup failed:",
                        error
                    );

                }

            }


            if (!user) {

                console.warn(
                    "STOCKFLOW: No active session user found."
                );

                return;

            }


            currentUser =
                user;


            const name =
                getUserName(user);


            const role =
                getUserRole(user);


            const initials =
                getInitials(name);


            /*
             * Name
             */

            getUserNameElements()
                .forEach(element => {

                    element.textContent =
                        name;

                });


            /*
             * Role
             */

            getUserRoleElements()
                .forEach(element => {

                    element.textContent =
                        role;

                });


            /*
             * Avatar
             */

            document
                .querySelectorAll(
                    [
                        ".sf-user-avatar",
                        ".sf-header-avatar",
                        ".sf-sidebar-avatar",
                        "#headerUserAvatar",
                        "#sidebarUserAvatar",
                        "#topbarAvatar",
                        "#userAvatar"
                    ].join(",")
                )
                .forEach(avatar => {

                    avatar.textContent =
                        initials;

                });


            /*
             * Optional email / employee fields
             */

            const email =
                user.email ||
                user.gmail ||
                "";


            document
                .querySelectorAll(
                    [
                        "#headerUserEmail",
                        "#sidebarUserEmail",
                        "#topbarUserEmail"
                    ].join(",")
                )
                .forEach(element => {

                    if (email) {
                        element.textContent =
                            email;
                    }

                });


        } catch (error) {

            console.warn(
                "Unable to populate user information:",
                error
            );

        }

    }


    /* =========================================================
       USER PROFILE CLICK
    ============================================================ */

    function setupUserProfileLinks() {

        const selectors = [
            "[data-user-profile]",
            "#userProfile",
            "#topUserProfile",
            "#headerUserProfile",
            "#sidebarUserProfile",
            ".topbar-user",
            ".top-user-profile",
            ".sidebar-user",
            ".sf-user-profile",
            ".user-profile"
        ];


        const elements =
            document.querySelectorAll(
                selectors.join(",")
            );


        elements.forEach(element => {

            /*
             * Do not convert logout controls into
             * profile links.
             */

            if (
                element.id === "logoutButton" ||
                element.closest("#logoutButton") ||
                element.matches(
                    "[data-logout], .logout-button"
                )
            ) {
                return;
            }


            /*
             * Avoid duplicate handlers.
             */

            if (
                element.dataset.stockflowProfileBound ===
                "true"
            ) {
                return;
            }


            element.dataset.stockflowProfileBound =
                "true";


            /*
             * If it is already an anchor,
             * simply point it to profile.
             */

            if (
                element.tagName.toLowerCase() ===
                "a"
            ) {

                element.setAttribute(
                    "href",
                    "./profile.html"
                );

            } else {

                element.setAttribute(
                    "role",
                    "link"
                );

                element.setAttribute(
                    "tabindex",
                    "0"
                );


                element.addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "./profile.html";

                    }
                );


                element.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {

                            event.preventDefault();

                            window.location.href =
                                "./profile.html";

                        }

                    }
                );

            }

        });


        /*
         * Extra protection for user name/avatar
         * when the surrounding container is not
         * marked correctly in the HTML.
         */

        const clickableIds = [
            "headerUserName",
            "sidebarUserName",
            "topbarUserName",
            "userName",
            "headerUserAvatar",
            "sidebarUserAvatar",
            "topbarAvatar",
            "userAvatar"
        ];


        clickableIds.forEach(id => {

            const element =
                $(id);


            if (!element) {
                return;
            }


            if (
                element.dataset.stockflowProfileBound ===
                "true"
            ) {
                return;
            }


            element.dataset.stockflowProfileBound =
                "true";


            element.style.cursor =
                "pointer";


            element.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "./profile.html";

                }
            );

        });

    }


    /* =========================================================
       LOGOUT
    ============================================================ */

    function clearStockFlowSession() {

        const sessionKeys = [

            "STOCKFLOW_SESSION",

            "STOCKFLOW_TOKEN",

            "stockflow_auth",

            "stockflow_user",

            "AUTH_TOKEN",

            "TOKEN",

            "authToken",

            "accessToken"

        ];


        sessionKeys.forEach(key => {

            try {

                sessionStorage.removeItem(
                    key
                );

            } catch (error) {

                console.warn(
                    `Unable to remove session key ${key}:`,
                    error
                );

            }

        });


        /*
         * Clear legacy localStorage authentication
         * keys only.
         *
         * IMPORTANT:
         * stockflow_settings is NOT removed.
         * Therefore the user's selected theme
         * remains saved.
         */

        const localKeys = [

            "STOCKFLOW_TOKEN",

            "stockflow_auth",

            "stockflow_user",

            "AUTH_TOKEN",

            "TOKEN",

            "authToken",

            "accessToken"

        ];


        localKeys.forEach(key => {

            try {

                localStorage.removeItem(
                    key
                );

            } catch (error) {

                console.warn(
                    `Unable to remove local key ${key}:`,
                    error
                );

            }

        });

    }


    function setupLogout() {

        const logoutButton =
            $("logoutButton");


        if (!logoutButton) {
            return;
        }


        if (
            logoutButton.dataset.stockflowLogoutBound ===
            "true"
        ) {
            return;
        }


        logoutButton.dataset.stockflowLogoutBound =
            "true";


        logoutButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                try {

                    logoutButton.disabled =
                        true;


                    logoutButton.innerHTML =
                        "<span>↪</span><span>Signing out...</span>";


                    /*
                     * DO NOT use StockFlowAuth.logout()
                     * here as the primary logout.
                     *
                     * The actual application login
                     * session is STOCKFLOW_SESSION.
                     */

                    clearStockFlowSession();


                    /*
                     * Small delay allows the button
                     * state to visibly update.
                     */

                    setTimeout(() => {

                        window.location.replace(
                            "./auth.html"
                        );

                    }, 150);

                } catch (error) {

                    console.error(
                        "STOCKFLOW logout error:",
                        error
                    );


                    clearStockFlowSession();


                    window.location.replace(
                        "./auth.html"
                    );

                }

            }
        );

    }


    /* =========================================================
       API REQUEST
    ============================================================ */

    async function requestTransactions(type) {

        if (
            typeof StockFlowAPI === "undefined" ||
            typeof StockFlowAPI.request !==
                "function"
        ) {

            throw new Error(
                "StockFlow API is not available. Check api.js."
            );

        }


        const response =
            await StockFlowAPI.request({

                action:
                    "listTransactions",

                type,

                token:
                    typeof StockFlowAPI.token ===
                        "function"
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


        return Array.isArray(
            response.records
        )
            ? response.records
            : [];

    }


    /* =========================================================
       LOAD ALL TRANSACTIONS
    ============================================================ */

    async function loadTransactions() {

        clearAlert();

        showLoading();


        const refreshButtons = [

            $("refreshButton"),
            $("bottomRefreshButton")

        ].filter(Boolean);


        refreshButtons.forEach(button => {

            button.disabled =
                true;

        });


        try {

            /*
             * Backend requires IN or OUT.
             *
             * Therefore ALL combines both.
             */

            const [
                stockIn,
                stockOut
            ] = await Promise.all([

                requestTransactions("IN"),

                requestTransactions("OUT")

            ]);


            const normalizedIn =
                stockIn.map(
                    record =>
                        normalizeRecord(
                            record,
                            "STOCK_IN"
                        )
                );


            const normalizedOut =
                stockOut.map(
                    record =>
                        normalizeRecord(
                            record,
                            "STOCK_OUT"
                        )
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

        } finally {

            refreshButtons.forEach(button => {

                button.disabled =
                    false;

            });

        }

    }


    /* =========================================================
       NORMALIZE RECORD
    ============================================================ */

    function normalizeRecord(
        record,
        type
    ) {

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
                    new Date(a.date)
                        .getTime() || 0;


                const dateB =
                    new Date(b.date)
                        .getTime() || 0;


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
                item =>
                    item.type ===
                    "STOCK_IN"
            );


        const stockOut =
            allTransactions.filter(
                item =>
                    item.type ===
                    "STOCK_OUT"
            );


        const units =
            allTransactions.reduce(
                (sum, item) =>
                    sum +
                    number(
                        item.quantity
                    ),
                0
            );


        if (totalTransactions) {

            totalTransactions.textContent =
                formatNumber(
                    allTransactions.length
                );

        }


        if (stockInCount) {

            stockInCount.textContent =
                formatNumber(
                    stockIn.length
                );

        }


        if (stockOutCount) {

            stockOutCount.textContent =
                formatNumber(
                    stockOut.length
                );

        }


        if (totalUnits) {

            totalUnits.textContent =
                formatNumber(
                    units
                );

        }

    }


    /* =========================================================
       FILTER
    ============================================================ */

    function getFilteredTransactions() {

        let filtered =
            [...allTransactions];


        if (
            currentFilter !==
            "ALL"
        ) {

            filtered =
                filtered.filter(
                    item =>
                        item.type ===
                        currentFilter
                );

        }


        const search =
            String(
                searchInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        if (search) {

            filtered =
                filtered.filter(
                    item => {

                        return [

                            item.reference,

                            item.product,

                            item.sku,

                            item.user,

                            item.type

                        ]
                            .join(" ")
                            .toLowerCase()
                            .includes(
                                search
                            );

                    }
                );

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

            rows.innerHTML =
                "";


            if (emptyState) {

                emptyState.hidden =
                    false;

            }


            updateResultText(0);

            return;

        }


        if (emptyState) {

            emptyState.hidden =
                true;

        }


        rows.innerHTML =
            filtered
                .map(
                    renderTransactionRow
                )
                .join("");


        updateResultText(
            filtered.length
        );

    }


    /* =========================================================
       TABLE ROW
    ============================================================ */

    function renderTransactionRow(
        item
    ) {

        const incoming =
            item.type ===
            "STOCK_IN";


        const typeLabel =
            incoming
                ? "STOCK IN"
                : "STOCK OUT";


        const typeClass =
            incoming
                ? "in"
                : "out";


        const initials =
            getInitials(
                item.user
            );


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
                    ${escapeHTML(
                        item.reference
                    )}
                </td>


                <td class="product-cell">
                    ${escapeHTML(
                        item.product
                    )}
                </td>


                <td>

                    <span
                        class="transaction-sku"
                    >
                        ${escapeHTML(
                            item.sku
                        )}
                    </span>

                </td>


                <td class="quantity-cell">
                    ${formatNumber(
                        item.quantity
                    )}
                </td>


                <td class="total-cell">
                    ${formatCurrency(
                        item.total
                    )}
                </td>


                <td>

                    <div
                        class="transaction-user"
                    >

                        <span
                            class="transaction-user-avatar"
                        >
                            ${escapeHTML(
                                initials
                            )}
                        </span>

                        <span>
                            ${escapeHTML(
                                item.user
                            )}
                        </span>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =========================================================
       RESULT TEXT
    ============================================================ */

    function updateResultText(
        count
    ) {

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
                    total === 1
                        ? ""
                        : "s"
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

            emptyState.hidden =
                true;

        }


        rows.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="transaction-loading"
                >

                    <span>

                        <span
                            class="loading-spinner"
                        ></span>

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

            emptyState.hidden =
                true;

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

            if (
                button.dataset.stockflowFilterBound ===
                "true"
            ) {
                return;
            }


            button.dataset.stockflowFilterBound =
                "true";


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    currentFilter =
                        button.dataset.filter ||
                        "ALL";


                    buttons.forEach(
                        other => {

                            const active =
                                other ===
                                button;


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


        if (
            searchInput.dataset.stockflowSearchBound ===
            "true"
        ) {
            return;
        }


        searchInput.dataset.stockflowSearchBound =
            "true";


        searchInput.addEventListener(
            "input",
            renderTransactions
        );

    }


    /* =========================================================
       RESET FILTER
    ============================================================ */

    function resetFilter() {

        currentFilter =
            "ALL";


        if (searchInput) {

            searchInput.value =
                "";

        }


        document
            .querySelectorAll(
                ".transaction-filter"
            )
            .forEach(button => {

                const active =
                    button.dataset.filter ===
                    "ALL";


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

        const refreshButtons = [

            $("refreshButton"),

            $("bottomRefreshButton")

        ].filter(Boolean);


        refreshButtons.forEach(
            button => {

                if (
                    button.dataset.stockflowRefreshBound ===
                    "true"
                ) {
                    return;
                }


                button.dataset.stockflowRefreshBound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        loadTransactions();

                    }
                );

            }
        );

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


        if (
            button.dataset.stockflowResetBound ===
            "true"
        ) {
            return;
        }


        button.dataset.stockflowResetBound =
            "true";


        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                resetFilter();

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


        if (
            menuButton.dataset.stockflowMenuBound ===
            "true"
        ) {
            return;
        }


        menuButton.dataset.stockflowMenuBound =
            "true";


        function openMenu() {

            sidebar.classList.add(
                "mobile-open"
            );


            overlay.hidden =
                false;

        }


        function closeMenu() {

            sidebar.classList.remove(
                "mobile-open"
            );


            overlay.hidden =
                true;

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
            .querySelectorAll(
                ".sf-nav-item"
            )
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeMenu
                );

            });

    }


    /* =========================================================
       NOTIFICATION ICON
    ============================================================ */

    function setupNotifications() {

        const notificationButtons =
            document.querySelectorAll(
                [
                    "#notificationButton",
                    "#notificationsButton",
                    ".notification-button",
                    ".sf-notification-button"
                ].join(",")
            );


        notificationButtons.forEach(
            button => {

                if (
                    button.dataset.stockflowNotificationBound ===
                    "true"
                ) {
                    return;
                }


                button.dataset.stockflowNotificationBound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        /*
                         * If a notification panel
                         * already exists, toggle it.
                         */

                        const panel =
                            document.querySelector(
                                "#notificationPanel, .notification-panel, .sf-notification-panel"
                            );


                        if (panel) {

                            panel.hidden =
                                !panel.hidden;


                            return;

                        }


                        /*
                         * Otherwise provide a
                         * lightweight feedback message.
                         */

                        showAlert(
                            "No new notifications.",
                            "success"
                        );


                        setTimeout(
                            clearAlert,
                            2500
                        );

                    }
                );

            }
        );

    }


    /* =========================================================
       AUTH / SESSION INITIALIZATION
    ============================================================ */

    async function initializeAuth() {

        /*
         * IMPORTANT:
         *
         * Do NOT call StockFlowAuth.requireAuth()
         * here.
         *
         * The current STOCKFLOW application login
         * stores the active user in:
         *
         * STOCKFLOW_SESSION
         *
         * Calling another auth guard here can cause
         * the page to redirect unexpectedly.
         */


        const sessionUser =
            getSessionUser();


        if (sessionUser) {

            currentUser =
                sessionUser;


            /*
             * Optional server refresh.
             *
             * Failure here must NOT log the user out.
             */

            const identity =
                getUserIdentity(
                    sessionUser
                );


            if (
                identity &&
                typeof StockFlowAPI !==
                    "undefined" &&
                typeof StockFlowAPI.getUser ===
                    "function"
            ) {

                try {

                    const freshUser =
                        await StockFlowAPI.getUser(
                            identity
                        );


                    if (freshUser) {

                        currentUser =
                            freshUser;

                    }

                } catch (error) {

                    console.warn(
                        "STOCKFLOW: user refresh failed. Keeping session user.",
                        error
                    );

                }

            }


            return true;

        }


        /*
         * Compatibility fallback only.
         *
         * This does NOT call requireAuth(),
         * because that is the redirect source
         * we are avoiding.
         */

        if (
            typeof StockFlowAuth !==
                "undefined" &&
            typeof StockFlowAuth.getUser ===
                "function"
        ) {

            try {

                const legacyUser =
                    StockFlowAuth.getUser();


                if (legacyUser) {

                    currentUser =
                        legacyUser;

                    return true;

                }

            } catch (error) {

                console.warn(
                    "Legacy StockFlowAuth user lookup failed:",
                    error
                );

            }

        }


        /*
         * No active session.
         *
         * Redirect ONLY to the actual login page,
         * never to dashboard.
         */

        console.warn(
            "STOCKFLOW: No active login session."
        );


        window.location.replace(
            "./auth.html"
        );


        return false;

    }


    /* =========================================================
       INITIALIZE
    ============================================================ */

    async function initialize() {

        if (initialized) {
            return;
        }


        initialized =
            true;


        try {

            const authenticated =
                await initializeAuth();


            if (!authenticated) {
                return;
            }


            populateUser();

            setupUserProfileLinks();

            setupFilters();

            setupSearch();

            setupRefresh();

            setupReset();

            setupLogout();

            setupMobileMenu();

            setupNotifications();


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
       PAGE VISIBILITY REFRESH
    ============================================================ */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                /*
                 * Refresh user UI from the
                 * current session without
                 * triggering an auth redirect.
                 */

                const user =
                    getSessionUser();


                if (user) {

                    currentUser =
                        user;

                    populateUser();

                }

            }

        }
    );


    /* =========================================================
       START
    ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();

    }

})();
