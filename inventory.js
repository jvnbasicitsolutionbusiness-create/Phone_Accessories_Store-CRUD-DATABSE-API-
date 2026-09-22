/* =========================================================
   STOCKFLOW INVENTORY
   inventory.js
   Full replacement
   Designed specifically for inventory.html
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";


    /* =====================================================
       PREVENT DUPLICATE INITIALIZATION
       ===================================================== */

    if (window.__stockFlowInventoryInitialized) {
        return;
    }

    window.__stockFlowInventoryInitialized = true;


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const elements = {
        body: document.body,

        sidebar:
            document.getElementById("sidebar"),

        sidebarOverlay:
            document.getElementById("sidebarOverlay"),

        mobileMenuBtn:
            document.getElementById("mobileMenuBtn"),

        logoutBtn:
            document.getElementById("logoutBtn"),

        notificationBtn:
            document.getElementById("notificationBtn"),

        notificationPanel:
            document.getElementById("notificationPanel"),

        connectionBadge:
            document.getElementById("connectionBadge"),

        connectionMessage:
            document.getElementById("connectionMessage"),

        userAvatar:
            document.getElementById("userAvatar"),

        userName:
            document.getElementById("userName"),

        userRole:
            document.getElementById("userRole"),

        topUserAvatar:
            document.getElementById("topUserAvatar"),

        topUserName:
            document.getElementById("topUserName"),

        topUserRole:
            document.getElementById("topUserRole"),

        productCount:
            document.getElementById("pc"),

        totalStock:
            document.getElementById("ts"),

        lowStock:
            document.getElementById("ls"),

        outOfStock:
            document.getElementById("os"),

        rows:
            document.getElementById("rows"),

        alert:
            document.getElementById("alert"),

        inventoryCount:
            document.getElementById("inventoryCount")
    };


    /* =====================================================
       CONSTANTS
       ===================================================== */

    const AUTH_STORAGE_KEYS = [
        "stockflowUser",
        "stockflow_user",
        "currentUser",
        "current_user",
        "loggedInUser",
        "logged_in_user",
        "user",
        "authUser",
        "auth_user",
        "sessionUser",
        "session_user"
    ];

    const PRODUCT_STORAGE_KEYS = [
        "stockflowInventory",
        "stockflow_inventory",
        "inventory",
        "products",
        "stockflowProducts",
        "stockflow_products"
    ];

    let refreshTimer = null;
    let currentInventory = [];


    /* =====================================================
       UTILITY HELPERS
       ===================================================== */

    function safeString(value, fallback = "") {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        return String(value).trim() || fallback;
    }


    function escapeHTML(value) {
        return safeString(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function toNumber(value, fallback = 0) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback;
        }

        const number = Number(
            String(value)
                .replace(/,/g, "")
                .replace(/[^\d.-]/g, "")
        );

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    function formatNumber(value) {
        return toNumber(value).toLocaleString(
            "en-US"
        );
    }


    function getInitials(name) {
        const cleanName = safeString(
            name,
            "StockFlow User"
        );

        const parts = cleanName
            .split(/\s+/)
            .filter(Boolean);

        if (!parts.length) {
            return "SF";
        }

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


    /* =====================================================
       ROLE NORMALIZATION
       ===================================================== */

    function normalizeRole(role) {
        const value = safeString(
            role,
            "Employee"
        ).toLowerCase();

        /*
         * Administrator / Manager
         */
        if (
            value.includes("admin") ||
            value.includes("manager")
        ) {
            return "Administrator";
        }

        /*
         * Employee / Staff / Worker
         */
        if (
            value.includes("employee") ||
            value.includes("staff") ||
            value.includes("worker")
        ) {
            return "Employee";
        }

        /*
         * IMPORTANT:
         * Default role is Employee.
         */
        return "Employee";
    }


    function isObject(value) {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    function getAuthController() {
        return (
            window.StockFlowAuth ||
            window.StockFlowAuthUI ||
            window.Auth ||
            null
        );
    }


    function readStoredUser() {
        for (const key of AUTH_STORAGE_KEYS) {

            /* ---------------------------------------------
               LOCAL STORAGE
               --------------------------------------------- */

            try {
                const localValue =
                    localStorage.getItem(key);

                if (localValue) {

                    try {
                        return JSON.parse(
                            localValue
                        );
                    } catch {
                        return {
                            name: localValue
                        };
                    }
                }

            } catch {
                // Continue.
            }


            /* ---------------------------------------------
               SESSION STORAGE
               --------------------------------------------- */

            try {
                const sessionValue =
                    sessionStorage.getItem(key);

                if (sessionValue) {

                    try {
                        return JSON.parse(
                            sessionValue
                        );
                    } catch {
                        return {
                            name: sessionValue
                        };
                    }
                }

            } catch {
                // Continue.
            }
        }

        return null;
    }


    async function getCurrentUser() {

        const auth =
            getAuthController();


        /* -------------------------------------------------
           AUTH CONTROLLER
           ------------------------------------------------- */

        if (auth) {

            const methods = [
                "getCurrentUser",
                "currentUser",
                "getUser",
                "getLoggedInUser",
                "getSessionUser",
                "getSession"
            ];


            for (const method of methods) {

                if (
                    typeof auth[method] !==
                    "function"
                ) {
                    continue;
                }


                try {

                    const result =
                        await auth[method]();


                    if (result) {
                        return result;
                    }

                } catch {
                    // Try next method.
                }
            }
        }


        /* -------------------------------------------------
           STORAGE FALLBACK
           ------------------------------------------------- */

        return readStoredUser();
    }


    /* =====================================================
       APPLY USER
       ===================================================== */

    function applyUser(user) {

        const source =
            isObject(user)
                ? user
                : {};


        /* -------------------------------------------------
           USER NAME
           ------------------------------------------------- */

        const name =
            safeString(
                source.name ||
                source.fullName ||
                source.full_name ||
                source.username ||
                source.email ||
                source.gmail ||
                source.phone ||
                "StockFlow User"
            );


        /* -------------------------------------------------
           USER ROLE
           
           IMPORTANT:
           Only source.role is used.

           accountStatus / account_s are NOT used
           because they represent account status,
           not the employee role.
           ------------------------------------------------- */

        const role =
            normalizeRole(
                source.role ||
                "Employee"
            );


        /* -------------------------------------------------
           INITIALS
           ------------------------------------------------- */

        const initials =
            getInitials(name);


        /* -------------------------------------------------
           SIDEBAR USER
           ------------------------------------------------- */

        if (elements.userName) {
            elements.userName.textContent =
                name;
        }


        if (elements.userRole) {
            elements.userRole.textContent =
                role;
        }


        if (elements.userAvatar) {
            elements.userAvatar.textContent =
                initials;
        }


        /* -------------------------------------------------
           TOP USER
           ------------------------------------------------- */

        if (elements.topUserName) {
            elements.topUserName.textContent =
                name;
        }


        if (elements.topUserRole) {
            elements.topUserRole.textContent =
                role;
        }


        if (elements.topUserAvatar) {
            elements.topUserAvatar.textContent =
                initials;
        }
    }


    /* =====================================================
       CONNECTION STATUS
       ===================================================== */

    function setConnectionStatus(
        connected,
        message
    ) {

        if (!elements.connectionBadge) {
            return;
        }


        elements.connectionBadge.classList.toggle(
            "offline",
            !connected
        );


        if (elements.connectionMessage) {

            elements.connectionMessage.textContent =
                connected
                    ? "SYSTEM CONNECTED"
                    : "SYSTEM OFFLINE";
        }


        elements.connectionBadge.setAttribute(
            "title",
            message ||
            (
                connected
                    ? "SYSTEM CONNECTED"
                    : "SYSTEM OFFLINE"
            )
        );
    }


    function setConnected() {

        setConnectionStatus(
            true,
            "SYSTEM CONNECTED"
        );
    }


    function setOffline() {

        setConnectionStatus(
            false,
            "SYSTEM OFFLINE"
        );
    }


    /* =====================================================
       ALERT SYSTEM
       ===================================================== */

    function hideAlert() {

        if (!elements.alert) {
            return;
        }


        elements.alert.className =
            "sf-alert";


        elements.alert.innerHTML = "";
    }


    function showAlert(
        type,
        message,
        actionText = "",
        actionCallback = null
    ) {

        if (!elements.alert) {
            return;
        }


        const icons = {

            error:
                "fa-solid fa-circle-exclamation",

            warning:
                "fa-solid fa-triangle-exclamation",

            success:
                "fa-solid fa-circle-check",

            info:
                "fa-solid fa-circle-info"
        };


        const icon =
            icons[type] ||
            icons.info;


        elements.alert.className =
            `sf-alert show ${type}`;


        elements.alert.innerHTML = `

            <i class="alert-icon ${icon}"></i>

            <div class="alert-content">
                ${escapeHTML(message)}
            </div>

            ${
                actionText
                    ? `
                        <button
                            type="button"
                            class="alert-action"
                        >
                            ${escapeHTML(actionText)}
                        </button>
                    `
                    : ""
            }
        `;


        if (
            actionText &&
            typeof actionCallback ===
                "function"
        ) {

            const button =
                elements.alert.querySelector(
                    ".alert-action"
                );


            if (button) {

                button.addEventListener(
                    "click",
                    actionCallback
                );
            }
        }
    }


    /* =====================================================
       SIDEBAR
       ===================================================== */

    function openSidebar() {

        if (!elements.sidebar) {
            return;
        }


        elements.sidebar.classList.add(
            "open"
        );


        if (elements.sidebarOverlay) {

            elements.sidebarOverlay.classList.add(
                "show"
            );
        }


        elements.body.classList.add(
            "sidebar-open"
        );


        if (elements.mobileMenuBtn) {

            elements.mobileMenuBtn.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }


    function closeSidebar() {

        if (elements.sidebar) {

            elements.sidebar.classList.remove(
                "open"
            );
        }


        if (elements.sidebarOverlay) {

            elements.sidebarOverlay.classList.remove(
                "show"
            );
        }


        elements.body.classList.remove(
            "sidebar-open"
        );


        if (elements.mobileMenuBtn) {

            elements.mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }


    function toggleSidebar() {

        if (
            elements.sidebar &&
            elements.sidebar.classList.contains(
                "open"
            )
        ) {

            closeSidebar();

        } else {

            openSidebar();
        }
    }


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function closeNotifications() {

        if (!elements.notificationPanel) {
            return;
        }


        elements.notificationPanel.classList.remove(
            "show"
        );


        elements.notificationPanel.classList.remove(
            "active"
        );


        if (elements.notificationBtn) {

            elements.notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }


    function openNotifications() {

        if (!elements.notificationPanel) {
            return;
        }


        elements.notificationPanel.classList.add(
            "show"
        );


        if (elements.notificationBtn) {

            elements.notificationBtn.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }


    function toggleNotifications(event) {

        if (event) {
            event.stopPropagation();
        }


        if (!elements.notificationPanel) {
            return;
        }


        const isOpen =
            elements.notificationPanel.classList.contains(
                "show"
            ) ||
            elements.notificationPanel.classList.contains(
                "active"
            );


        if (isOpen) {

            closeNotifications();

        } else {

            openNotifications();
        }
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        const auth =
            getAuthController();


        try {

            if (
                auth &&
                typeof auth.logout ===
                    "function"
            ) {

                await auth.logout();

                return;
            }


            if (
                auth &&
                typeof auth.signOut ===
                    "function"
            ) {

                await auth.signOut();

                return;
            }

        } catch (error) {

            console.error(
                "StockFlow logout error:",
                error
            );
        }


        for (
            const key of AUTH_STORAGE_KEYS
        ) {

            try {

                localStorage.removeItem(
                    key
                );

            } catch {}


            try {

                sessionStorage.removeItem(
                    key
                );

            } catch {}
        }


        window.location.href =
            "./login.html";
    }


    /* =====================================================
       DATA STORAGE FALLBACK
       ===================================================== */

    function readLocalInventory() {

        for (
            const key of PRODUCT_STORAGE_KEYS
        ) {

            let value = null;


            try {

                value =
                    localStorage.getItem(key);

            } catch {}


            if (!value) {

                try {

                    value =
                        sessionStorage.getItem(
                            key
                        );

                } catch {}
            }


            if (!value) {
                continue;
            }


            try {

                const parsed =
                    JSON.parse(value);


                const extracted =
                    extractArray(parsed);


                if (extracted.length) {

                    return extracted;
                }

            } catch {
                // Continue.
            }
        }


        return [];
    }


    /* =====================================================
       ARRAY EXTRACTION
       ===================================================== */

    function extractArray(data) {

        if (Array.isArray(data)) {
            return data;
        }


        if (!isObject(data)) {
            return [];
        }


        const possibleKeys = [
            "data",
            "items",
            "results",
            "inventory",
            "inventories",
            "products",
            "rows",
            "records"
        ];


        for (
            const key of possibleKeys
        ) {

            if (
                Array.isArray(data[key])
            ) {

                return data[key];
            }
        }


        return [];
    }


    /* =====================================================
       API DATA REQUEST
       ===================================================== */

    async function requestInventoryFromAPI() {

        const api =
            window.StockFlowAPI ||
            window.StockFlowApi ||
            window.API ||
            window.api ||
            null;


        if (!api) {

            throw new Error(
                "StockFlow API controller not found."
            );
        }


        /* -------------------------------------------------
           DIRECT INVENTORY METHODS
           ------------------------------------------------- */

        const directMethods = [
            "getInventory",
            "getInventories",
            "fetchInventory",
            "fetchInventories",
            "listInventory",
            "listInventories"
        ];


        for (
            const method of directMethods
        ) {

            if (
                typeof api[method] !==
                "function"
            ) {
                continue;
            }


            try {

                const response =
                    await api[method]();


                const data =
                    extractArray(response);


                if (Array.isArray(data)) {

                    return data;
                }

            } catch (error) {

                console.warn(
                    `Inventory API method ${method} failed:`,
                    error
                );
            }
        }


        /* -------------------------------------------------
           GENERIC REQUEST METHODS
           ------------------------------------------------- */

        const genericMethods = [
            "request",
            "get",
            "fetch"
        ];


        const endpoints = [
            "/inventory",
            "/inventories",
            "/api/inventory",
            "/api/inventories",
            "inventory",
            "inventories"
        ];


        for (
            const method of genericMethods
        ) {

            if (
                typeof api[method] !==
                "function"
            ) {
                continue;
            }


            for (
                const endpoint of endpoints
            ) {

                try {

                    const response =
                        await api[method](
                            endpoint
                        );


                    const data =
                        extractArray(response);


                    if (
                        Array.isArray(data)
                    ) {

                        return data;
                    }

                } catch {
                    // Try next endpoint.
                }
            }
        }


        throw new Error(
            "No compatible inventory API endpoint found."
        );
    }


    /* =====================================================
       NORMALIZE INVENTORY RECORD
       ===================================================== */

    function normalizeInventoryItem(
        item,
        index
    ) {

        const source =
            isObject(item)
                ? item
                : {};


        const sku =
            safeString(
                source.sku ||
                source.SKU ||
                source.product_sku ||
                source.productSku ||
                source.code ||
                source.product_code ||
                `SKU-${String(index + 1).padStart(4, "0")}`
            );


        const product =
            safeString(
                source.product ||
                source.product_name ||
                source.productName ||
                source.name ||
                source.item_name ||
                source.itemName ||
                source.title ||
                "Unnamed Product"
            );


        const category =
            safeString(
                source.category ||
                source.category_name ||
                source.categoryName ||
                source.type ||
                "Uncategorized"
            );


        const supplier =
            safeString(
                source.supplier ||
                source.supplier_name ||
                source.supplierName ||
                source.vendor ||
                "—"
            );


        const stock =
            toNumber(
                source.stock ??
                source.quantity ??
                source.qty ??
                source.current_stock ??
                source.currentStock ??
                source.available_stock ??
                source.availableStock ??
                0
            );


        const reorder =
            toNumber(
                source.reorder ??
                source.reorder_level ??
                source.reorderLevel ??
                source.minimum_stock ??
                source.minimumStock ??
                source.min_stock ??
                source.minStock ??
                0
            );


        let state =
            safeString(
                source.state ||
                source.status ||
                source.stock_status ||
                source.stockStatus
            ).toLowerCase();


        if (
            !state ||
            state === "available" ||
            state === "in stock"
        ) {

            if (stock <= 0) {

                state = "out";

            } else if (
                reorder > 0 &&
                stock <= reorder
            ) {

                state = "low";

            } else {

                state = "available";
            }

        } else if (
            state.includes("out")
        ) {

            state = "out";

        } else if (
            state.includes("low")
        ) {

            state = "low";

        } else {

            state = "available";
        }


        return {
            sku,
            product,
            category,
            supplier,
            stock,
            reorder,
            state
        };
    }


    /* =====================================================
       NORMALIZE COMPLETE DATASET
       ===================================================== */

    function normalizeInventory(
        records
    ) {

        return records.map(
            (
                item,
                index
            ) =>
                normalizeInventoryItem(
                    item,
                    index
                )
        );
    }


    /* =====================================================
       INVENTORY CALCULATIONS
       ===================================================== */

    function calculateStats(
        inventory
    ) {

        const products =
            inventory.length;


        const totalUnits =
            inventory.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    toNumber(
                        item.stock
                    ),
                0
            );


        const lowStock =
            inventory.filter(
                item =>
                    item.state ===
                    "low"
            ).length;


        const outOfStock =
            inventory.filter(
                item =>
                    item.state ===
                    "out"
            ).length;


        return {
            products,
            totalUnits,
            lowStock,
            outOfStock
        };
    }


    /* =====================================================
       UPDATE STATISTICS
       ===================================================== */

    function renderStats(
        inventory
    ) {

        const stats =
            calculateStats(
                inventory
            );


        if (elements.productCount) {

            elements.productCount.textContent =
                formatNumber(
                    stats.products
                );
        }


        if (elements.totalStock) {

            elements.totalStock.textContent =
                formatNumber(
                    stats.totalUnits
                );
        }


        if (elements.lowStock) {

            elements.lowStock.textContent =
                formatNumber(
                    stats.lowStock
                );
        }


        if (elements.outOfStock) {

            elements.outOfStock.textContent =
                formatNumber(
                    stats.outOfStock
                );
        }


        if (elements.inventoryCount) {

            const label =
                stats.products === 1
                    ? "inventory record"
                    : "inventory records";


            elements.inventoryCount.textContent =
                `${formatNumber(stats.products)} ${label}`;
        }
    }


    /* =====================================================
       STOCK STATE HELPERS
       ===================================================== */

    function getStockClass(
        state
    ) {

        if (state === "out") {
            return "out";
        }


        if (state === "low") {
            return "low";
        }


        return "available";
    }


    function getStockLabel(
        state
    ) {

        if (state === "out") {
            return "OUT";
        }


        if (state === "low") {
            return "LOW";
        }


        return "OK";
    }


    function getStateLabel(
        state
    ) {

        if (state === "out") {
            return "Out of Stock";
        }


        if (state === "low") {
            return "Low Stock";
        }


        return "Available";
    }


    /* =====================================================
       RENDER LOADING
       ===================================================== */

    function renderLoading() {

        if (!elements.rows) {
            return;
        }


        elements.rows.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="sf-empty"
                >

                    <div class="table-loading">

                        <div class="loading-spinner"></div>

                        <strong>
                            Loading inventory...
                        </strong>

                        <span>
                            Please wait while StockFlow
                            retrieves your inventory.
                        </span>

                    </div>

                </td>

            </tr>
        `;
    }


    /* =====================================================
       RENDER EMPTY
       ===================================================== */

    function renderEmpty() {

        if (!elements.rows) {
            return;
        }


        elements.rows.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="sf-empty"
                >

                    <div class="table-empty-state">

                        <div class="empty-icon">
                            <i class="fa-solid fa-box-open"></i>
                        </div>

                        <strong>
                            No inventory records
                        </strong>

                        <span>
                            No products are currently available
                            in the inventory.
                        </span>

                    </div>

                </td>

            </tr>
        `;
    }


    /* =====================================================
       RENDER TABLE
       ===================================================== */

    function renderInventory(
        inventory
    ) {

        if (!elements.rows) {
            return;
        }


        if (!inventory.length) {

            renderEmpty();

            return;
        }


        const html =
            inventory
                .map(
                    item => {

                        const stateClass =
                            getStockClass(
                                item.state
                            );


                        const stateLabel =
                            getStateLabel(
                                item.state
                            );


                        return `

                            <tr>

                                <td>

                                    <span class="sku-cell">
                                        ${escapeHTML(item.sku)}
                                    </span>

                                </td>


                                <td>

                                    <span class="product-cell">
                                        ${escapeHTML(item.product)}
                                    </span>

                                </td>


                                <td>

                                    <span class="category-cell">
                                        ${escapeHTML(item.category)}
                                    </span>

                                </td>


                                <td>

                                    <span class="supplier-cell">
                                        ${escapeHTML(item.supplier)}
                                    </span>

                                </td>


                                <td>

                                    <span class="stock-badge ${stateClass}">
                                        ${formatNumber(item.stock)}
                                    </span>

                                </td>


                                <td>

                                    <span class="reorder-cell">
                                        ${formatNumber(item.reorder)}
                                    </span>

                                </td>


                                <td>

                                    <span class="state-badge ${stateClass}">
                                        ${escapeHTML(stateLabel)}
                                    </span>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");


        elements.rows.innerHTML =
            html;
    }


    /* =====================================================
       LOAD INVENTORY
       ===================================================== */

    async function loadInventory(
        options = {}
    ) {

        const silent =
            options.silent === true;


        if (!silent) {

            renderLoading();

            hideAlert();
        }


        try {

            let records = [];

            let apiWorked = false;


            /* ---------------------------------------------
               PRIMARY SOURCE: API
               --------------------------------------------- */

            try {

                records =
                    await requestInventoryFromAPI();


                apiWorked = true;

            } catch (apiError) {

                console.warn(
                    "Inventory API unavailable:",
                    apiError
                );
            }


            /* ---------------------------------------------
               FALLBACK: LOCAL STORAGE
               --------------------------------------------- */

            if (
                !apiWorked ||
                !Array.isArray(records)
            ) {

                records =
                    readLocalInventory();
            }


            if (!Array.isArray(records)) {

                records = [];
            }


            currentInventory =
                normalizeInventory(
                    records
                );


            renderStats(
                currentInventory
            );


            renderInventory(
                currentInventory
            );


            /* ---------------------------------------------
               CONNECTION
               --------------------------------------------- */

            if (
                apiWorked ||
                currentInventory.length >= 0
            ) {

                setConnected();
            }


            /* ---------------------------------------------
               EMPTY DATA NOTICE
               --------------------------------------------- */

            if (
                currentInventory.length === 0
            ) {

                if (!silent) {

                    showAlert(
                        "info",
                        "Inventory is currently empty."
                    );
                }

            } else {

                hideAlert();
            }


        } catch (error) {

            console.error(
                "StockFlow inventory loading error:",
                error
            );


            currentInventory = [];


            renderStats([]);


            renderInventory([]);


            setOffline();


            showAlert(
                "error",
                "Unable to retrieve inventory data.",
                "Retry",
                () =>
                    loadInventory()
            );
        }
    }


    /* =====================================================
       REFRESH
       ===================================================== */

    function startAutoRefresh() {

        if (refreshTimer) {

            clearInterval(
                refreshTimer
            );
        }


        refreshTimer =
            setInterval(
                () => {

                    if (
                        document.visibilityState ===
                        "visible"
                    ) {

                        loadInventory({
                            silent: true
                        });
                    }

                },
                60000
            );
    }


    /* =====================================================
       EVENT HANDLERS
       ===================================================== */

    /* -----------------------------------------------------
       MOBILE MENU
       ----------------------------------------------------- */

    if (elements.mobileMenuBtn) {

        elements.mobileMenuBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleSidebar();
            }
        );
    }


    /* -----------------------------------------------------
       SIDEBAR OVERLAY
       ----------------------------------------------------- */

    if (elements.sidebarOverlay) {

        elements.sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );
    }


    /* -----------------------------------------------------
       NOTIFICATIONS
       ----------------------------------------------------- */

    if (elements.notificationBtn) {

        elements.notificationBtn.addEventListener(
            "click",
            toggleNotifications
        );
    }


    if (elements.notificationPanel) {

        elements.notificationPanel.addEventListener(
            "click",
            event => {

                event.stopPropagation();
            }
        );
    }


    /* -----------------------------------------------------
       DOCUMENT CLICK
       ----------------------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            /* Notification */

            if (
                elements.notificationPanel &&
                elements.notificationBtn &&
                !elements.notificationPanel.contains(
                    event.target
                ) &&
                !elements.notificationBtn.contains(
                    event.target
                )
            ) {

                closeNotifications();
            }


            /* Sidebar */

            if (
                window.innerWidth <= 900 &&
                elements.sidebar &&
                elements.sidebar.classList.contains(
                    "open"
                ) &&
                !elements.sidebar.contains(
                    event.target
                ) &&
                !elements.mobileMenuBtn?.contains(
                    event.target
                )
            ) {

                closeSidebar();
            }
        }
    );


    /* -----------------------------------------------------
       CLOSE SIDEBAR WHEN NAVIGATION ITEM IS CLICKED
       ----------------------------------------------------- */

    document
        .querySelectorAll(
            ".sf-nav-link"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <=
                            900
                        ) {

                            closeSidebar();
                        }
                    }
                );
            }
        );


    /* -----------------------------------------------------
       LOGOUT
       ----------------------------------------------------- */

    if (elements.logoutBtn) {

        elements.logoutBtn.addEventListener(
            "click",
            async () => {

                await logout();
            }
        );
    }


    /* -----------------------------------------------------
       ESCAPE KEY
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }


            closeNotifications();

            closeSidebar();
        }
    );


    /* -----------------------------------------------------
       WINDOW RESIZE
       ----------------------------------------------------- */

    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth > 900
            ) {

                closeSidebar();
            }
        }
    );


    /* -----------------------------------------------------
       REFRESH WHEN RETURNING TO PAGE
       ----------------------------------------------------- */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                loadInventory({
                    silent: true
                });
            }
        }
    );


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function initialize() {

        /* -------------------------------------------------
           DEFAULT UI
           ------------------------------------------------- */

        if (elements.userAvatar) {

            elements.userAvatar.textContent =
                "SF";
        }


        if (elements.topUserAvatar) {

            elements.topUserAvatar.textContent =
                "SF";
        }


        /*
         * DEFAULT ROLE
         *
         * If no authenticated user is available,
         * Inventory will show Employee instead of
         * Administrator.
         */

        if (elements.userRole) {

            elements.userRole.textContent =
                "Employee";
        }


        if (elements.topUserRole) {

            elements.topUserRole.textContent =
                "Employee";
        }


        /* -------------------------------------------------
           CONNECTION
           ------------------------------------------------- */

        setConnected();


        /* -------------------------------------------------
           USER
           ------------------------------------------------- */

        try {

            const user =
                await getCurrentUser();


            if (user) {

                applyUser(user);
            }

        } catch (error) {

            console.warn(
                "Unable to resolve StockFlow user:",
                error
            );
        }


        /* -------------------------------------------------
           INVENTORY
           ------------------------------------------------- */

        await loadInventory();


        /* -------------------------------------------------
           AUTO REFRESH
           ------------------------------------------------- */

        startAutoRefresh();
    }


    /* =====================================================
       START
       ===================================================== */

    initialize();

});
