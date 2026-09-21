/* =========================================================
   STOCKFLOW INVENTORY MODULE
   inventory.js

   Designed specifically for the supplied inventory.html

   Responsibilities:
   - Authentication/session compatibility
   - User information
   - Employee/Admin role display
   - Sidebar
   - Notifications
   - Connection status
   - Inventory loading
   - Statistics
   - Inventory table
   - Retry handling
   - Logout
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const connectionBadge =
        document.getElementById("connectionBadge");

    const connectionMessage =
        document.getElementById("connectionMessage");

    const userAvatar =
        document.getElementById("userAvatar");

    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");

    const topUserAvatar =
        document.getElementById("topUserAvatar");

    const topUserName =
        document.getElementById("topUserName");

    const topUserRole =
        document.getElementById("topUserRole");

    const productsCount =
        document.getElementById("pc");

    const totalStock =
        document.getElementById("ts");

    const lowStock =
        document.getElementById("ls");

    const outOfStock =
        document.getElementById("os");

    const tableBody =
        document.getElementById("rows");

    const alertBox =
        document.getElementById("alert");

    const inventoryCount =
        document.getElementById("inventoryCount");


    /* =====================================================
       STATE
       ===================================================== */

    let inventoryData = [];

    let currentUser = null;

    let isLoading = false;

    let retryTimer = null;


    /* =====================================================
       BASIC HELPERS
       ===================================================== */

    function safeString(value, fallback = "") {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        const result =
            String(value).trim();

        return result || fallback;
    }


    function normalizeRole(role) {
        const value =
            safeString(role, "")
                .toLowerCase()
                .replace(/[_-]/g, " ")
                .trim();

        if (
            value === "employee" ||
            value === "staff" ||
            value === "user"
        ) {
            return "Employee";
        }

        if (
            value === "administrator" ||
            value === "admin" ||
            value === "manager"
        ) {
            return "Administrator";
        }

        return role
            ? String(role)
            : "Employee";
    }


    function getInitials(name) {
        const clean =
            safeString(name, "StockFlow User");

        const parts =
            clean
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


    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function numberValue(value) {
        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }


    function formatNumber(value) {
        return numberValue(value)
            .toLocaleString();
    }


    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    function readStorageObject(storage, key) {
        try {
            const raw =
                storage.getItem(key);

            if (!raw) {
                return null;
            }

            try {
                return JSON.parse(raw);
            } catch {
                return raw;
            }

        } catch {
            return null;
        }
    }


    function findStoredUser() {

        const possibleKeys = [
            "stockflow_user",
            "StockFlowUser",
            "currentUser",
            "current_user",
            "loggedInUser",
            "logged_user",
            "user",
            "authUser",
            "auth_user",
            "sf_user",
            "employee",
            "sessionUser",
            "session_user"
        ];


        const storages = [
            window.localStorage,
            window.sessionStorage
        ];


        for (const storage of storages) {

            for (const key of possibleKeys) {

                const value =
                    readStorageObject(
                        storage,
                        key
                    );

                if (!value) {
                    continue;
                }


                if (
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {
                    return value;
                }
            }
        }


        /*
         * Some applications store individual fields
         * instead of one user object.
         */

        const nameKeys = [
            "username",
            "userName",
            "fullname",
            "fullName",
            "name",
            "employeeName"
        ];

        const roleKeys = [
            "role",
            "userRole",
            "accountRole",
            "account_status",
            "accountStatus"
        ];


        let foundName = "";
        let foundRole = "";


        for (const storage of storages) {

            if (!foundName) {

                for (const key of nameKeys) {

                    const value =
                        storage.getItem(key);

                    if (value) {
                        foundName = value;
                        break;
                    }
                }
            }


            if (!foundRole) {

                for (const key of roleKeys) {

                    const value =
                        storage.getItem(key);

                    if (value) {
                        foundRole = value;
                        break;
                    }
                }
            }
        }


        if (
            foundName ||
            foundRole
        ) {
            return {
                name:
                    foundName ||
                    "StockFlow User",

                role:
                    foundRole ||
                    "Employee"
            };
        }


        return null;
    }


    /* =====================================================
       NORMALIZE USER
       ===================================================== */

    function normalizeUser(rawUser) {

        if (!rawUser) {
            return null;
        }


        if (
            typeof rawUser === "string"
        ) {

            try {

                const parsed =
                    JSON.parse(rawUser);

                if (
                    parsed &&
                    typeof parsed === "object"
                ) {
                    return normalizeUser(parsed);
                }

            } catch {

                return {
                    name: rawUser,
                    role: "Employee"
                };
            }
        }


        if (
            typeof rawUser !== "object"
        ) {
            return null;
        }


        const name =
            safeString(
                rawUser.fullName ??
                rawUser.fullname ??
                rawUser.name ??
                rawUser.username ??
                rawUser.userName ??
                rawUser.employeeName ??
                rawUser.displayName,
                "StockFlow User"
            );


        const role =
            normalizeRole(
                rawUser.role ??
                rawUser.userRole ??
                rawUser.accountRole ??
                rawUser.accountStatus ??
                rawUser.account_status ??
                rawUser.type
            );


        return {
            ...rawUser,
            name,
            role
        };
    }


    /* =====================================================
       AUTHENTICATION COMPATIBILITY
       ===================================================== */

    function getAuthModule() {

        /*
         * Existing application may expose one of these.
         *
         * We DO NOT replace the existing authentication
         * system.
         */

        if (
            window.StockFlowAuth &&
            typeof window.StockFlowAuth === "object"
        ) {
            return window.StockFlowAuth;
        }


        if (
            window.StockFlowAuthUI &&
            typeof window.StockFlowAuthUI === "object"
        ) {
            return window.StockFlowAuthUI;
        }


        if (
            window.Auth &&
            typeof window.Auth === "object"
        ) {
            return window.Auth;
        }


        return null;
    }


    async function resolveCurrentUser() {

        const auth =
            getAuthModule();


        /*
         * First try the existing authentication module.
         */

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

                        const normalized =
                            normalizeUser(
                                result
                            );

                        if (normalized) {
                            return normalized;
                        }
                    }

                } catch (error) {

                    console.warn(
                        `StockFlow auth method ${method} failed:`,
                        error
                    );
                }
            }


            /*
             * Some existing StockFlowAuth objects
             * expose a direct currentUser property.
             */

            if (auth.currentUser) {

                const normalized =
                    normalizeUser(
                        auth.currentUser
                    );

                if (normalized) {
                    return normalized;
                }
            }


            if (auth.user) {

                const normalized =
                    normalizeUser(
                        auth.user
                    );

                if (normalized) {
                    return normalized;
                }
            }
        }


        /*
         * Fallback to browser session storage.
         *
         * This prevents the inventory page from showing
         * the misleading "authentication module unavailable"
         * message merely because the global auth object
         * was not exposed on this page.
         */

        const storedUser =
            findStoredUser();

        if (storedUser) {
            return normalizeUser(
                storedUser
            );
        }


        return null;
    }


    /* =====================================================
       APPLY USER UI
       ===================================================== */

    function applyUserUI(user) {

        const safeUser =
            normalizeUser(user) || {
                name: "StockFlow User",
                role: "Employee"
            };


        currentUser = safeUser;


        const displayName =
            safeString(
                safeUser.name,
                "StockFlow User"
            );


        /*
         * IMPORTANT:
         *
         * We use the ACTUAL stored role.
         *
         * We do NOT force Administrator.
         */

        const displayRole =
            normalizeRole(
                safeUser.role
            );


        const initials =
            getInitials(
                displayName
            );


        if (userName) {
            userName.textContent =
                displayName;
        }

        if (topUserName) {
            topUserName.textContent =
                displayName;
        }

        if (userRole) {
            userRole.textContent =
                displayRole;
        }

        if (topUserRole) {
            topUserRole.textContent =
                displayRole;
        }

        if (userAvatar) {
            userAvatar.textContent =
                initials;
        }

        if (topUserAvatar) {
            topUserAvatar.textContent =
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

        if (!connectionBadge) {
            return;
        }


        const isConnected =
            Boolean(connected);


        connectionBadge.classList.toggle(
            "offline",
            !isConnected
        );


        if (connectionMessage) {

            connectionMessage.textContent =
                message ||
                (
                    isConnected
                        ? "System Connected"
                        : "System Offline"
                );
        }
    }


    function setConnected() {

        setConnectionStatus(
            true,
            "System Connected"
        );
    }


    function setOffline(message) {

        setConnectionStatus(
            false,
            message ||
            "System Offline"
        );
    }


    /* =====================================================
       ALERT
       ===================================================== */

    function clearAlert() {

        if (!alertBox) {
            return;
        }

        alertBox.innerHTML = "";
        alertBox.className =
            "sf-alert";
    }


    function showAlert(
        message,
        type = "error",
        showRetry = false
    ) {

        if (!alertBox) {
            return;
        }


        alertBox.className =
            `sf-alert ${type}`;


        const icon =
            type === "success"
                ? "fa-circle-check"
                : type === "warning"
                    ? "fa-triangle-exclamation"
                    : "fa-circle-exclamation";


        alertBox.innerHTML = `
            <i
                class="fa-solid ${icon}"
                style="margin-right:8px;"
            ></i>

            <span>
                ${escapeHTML(message)}
            </span>

            ${
                showRetry
                    ? `
                        <button
                            type="button"
                            id="inventoryRetryBtn"
                            style="
                                margin-left:auto;
                                border:0;
                                background:transparent;
                                color:inherit;
                                font-weight:800;
                                cursor:pointer;
                                text-decoration:underline;
                            "
                        >
                            Try Again
                        </button>
                    `
                    : ""
            }
        `;


        if (showRetry) {

            const retryBtn =
                document.getElementById(
                    "inventoryRetryBtn"
                );

            if (retryBtn) {

                retryBtn.addEventListener(
                    "click",
                    () => {
                        loadInventory();
                    }
                );
            }
        }
    }


    /* =====================================================
       SIDEBAR
       ===================================================== */

    function openSidebar() {

        if (sidebar) {
            sidebar.classList.add("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.add("show");
        }

        document.body.classList.add(
            "sidebar-open"
        );
    }


    function closeSidebar() {

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove("show");
        }

        document.body.classList.remove(
            "sidebar-open"
        );
    }


    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener(
            "click",
            () => {

                if (
                    sidebar &&
                    sidebar.classList.contains("open")
                ) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            }
        );
    }


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );
    }


    document
        .querySelectorAll(".sf-nav-link")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <= 900
                    ) {
                        closeSidebar();
                    }
                }
            );
        });


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function closeNotifications() {

        if (!notificationPanel) {
            return;
        }

        notificationPanel.classList.remove(
            "show"
        );

        notificationPanel.classList.remove(
            "active"
        );
    }


    function toggleNotifications(event) {

        if (event) {
            event.stopPropagation();
        }

        if (!notificationPanel) {
            return;
        }


        const open =
            notificationPanel.classList.contains(
                "show"
            ) ||
            notificationPanel.classList.contains(
                "active"
            );


        closeNotifications();


        if (!open) {

            notificationPanel.classList.add(
                "show"
            );
        }
    }


    if (notificationBtn) {

        notificationBtn.addEventListener(
            "click",
            toggleNotifications
        );
    }


    if (notificationPanel) {

        notificationPanel.addEventListener(
            "click",
            event => {
                event.stopPropagation();
            }
        );
    }


    document.addEventListener(
        "click",
        event => {

            if (
                notificationPanel &&
                notificationBtn &&
                !notificationPanel.contains(event.target) &&
                !notificationBtn.contains(event.target)
            ) {
                closeNotifications();
            }
        }
    );


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        try {

            const auth =
                getAuthModule();


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

            console.warn(
                "StockFlow logout module error:",
                error
            );
        }


        /*
         * Fallback cleanup.
         *
         * Do not delete unrelated application data.
         */

        const keysToRemove = [
            "stockflow_user",
            "StockFlowUser",
            "currentUser",
            "current_user",
            "loggedInUser",
            "logged_user",
            "authUser",
            "auth_user",
            "sf_user",
            "sessionUser",
            "session_user"
        ];


        [
            window.localStorage,
            window.sessionStorage
        ].forEach(storage => {

            keysToRemove.forEach(key => {

                try {
                    storage.removeItem(key);
                } catch {
                    /* ignore */
                }
            });
        });


        window.location.href =
            "./login.html";
    }


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );
    }


    /* =====================================================
       DATA NORMALIZATION
       ===================================================== */

    function normalizeProduct(item) {

        if (!item || typeof item !== "object") {
            return null;
        }


        return {
            id:
                item.id ??
                item.product_id ??
                item.productId ??
                item.ID ??
                "",

            sku:
                item.sku ??
                item.SKU ??
                item.product_sku ??
                item.productCode ??
                item.code ??
                "—",

            name:
                item.name ??
                item.product_name ??
                item.productName ??
                item.item_name ??
                item.title ??
                "Unnamed Product",

            category:
                item.category ??
                item.category_name ??
                item.categoryName ??
                "Uncategorized",

            supplier:
                item.supplier ??
                item.supplier_name ??
                item.supplierName ??
                "—",

            stock:
                item.stock ??
                item.quantity ??
                item.qty ??
                item.current_stock ??
                item.currentStock ??
                item.stock_quantity ??
                0,

            reorder:
                item.reorder ??
                item.reorder_level ??
                item.reorderLevel ??
                item.minimum_stock ??
                item.min_stock ??
                item.minStock ??
                0
        };
    }


    function extractArray(result) {

        if (Array.isArray(result)) {
            return result;
        }


        if (!result) {
            return [];
        }


        if (Array.isArray(result.data)) {
            return result.data;
        }


        if (
            result.data &&
            Array.isArray(result.data.items)
        ) {
            return result.data.items;
        }


        if (Array.isArray(result.items)) {
            return result.items;
        }


        if (Array.isArray(result.products)) {
            return result.products;
        }


        if (Array.isArray(result.inventory)) {
            return result.inventory;
        }


        if (
            result.data &&
            Array.isArray(result.data.products)
        ) {
            return result.data.products;
        }


        if (
            result.data &&
            Array.isArray(result.data.inventory)
        ) {
            return result.data.inventory;
        }


        return [];
    }


    /* =====================================================
       API ACCESS
       ===================================================== */

    async function requestInventoryFromAPI() {

        const api =
            window.StockFlowAPI;


        if (!api) {

            throw new Error(
                "StockFlow API is not available on this page."
            );
        }


        /*
         * Try the inventory-specific methods first.
         */

        const methods = [
            "inventory",
            "getInventory",
            "inventoryList",
            "getInventoryList",
            "getCurrentInventory",
            "currentInventory",
            "products",
            "getProducts",
            "productList",
            "getProductList",
            "listProducts"
        ];


        for (const method of methods) {

            if (
                typeof api[method] !==
                "function"
            ) {
                continue;
            }


            try {

                const result =
                    await api[method]();

                const data =
                    extractArray(result);


                if (Array.isArray(data)) {
                    return data;
                }

            } catch (error) {

                console.warn(
                    `StockFlowAPI.${method} failed:`,
                    error
                );
            }
        }


        /*
         * If your API exposes a generic request method,
         * use it as a fallback.
         */

        const requestMethods = [
            "request",
            "get"
        ];


        for (const method of requestMethods) {

            if (
                typeof api[method] !==
                "function"
            ) {
                continue;
            }


            const endpoints = [
                "/inventory",
                "/api/inventory",
                "/products",
                "/api/products"
            ];


            for (const endpoint of endpoints) {

                try {

                    const result =
                        await api[method](
                            endpoint
                        );

                    const data =
                        extractArray(result);


                    if (
                        Array.isArray(data)
                    ) {
                        return data;
                    }

                } catch {
                    /* try next endpoint */
                }
            }
        }


        throw new Error(
            "No compatible inventory API method was found."
        );
    }


    /* =====================================================
       LOCAL FALLBACK
       ===================================================== */

    function getLocalProducts() {

        const keys = [
            "stockflow_products",
            "StockFlowProducts",
            "products",
            "inventory",
            "stockflow_inventory"
        ];


        const storages = [
            window.localStorage,
            window.sessionStorage
        ];


        for (const storage of storages) {

            for (const key of keys) {

                const value =
                    readStorageObject(
                        storage,
                        key
                    );


                if (Array.isArray(value)) {
                    return value;
                }


                if (
                    value &&
                    typeof value === "object"
                ) {

                    const extracted =
                        extractArray(value);

                    if (extracted.length) {
                        return extracted;
                    }
                }
            }
        }


        return [];
    }


    /* =====================================================
       INVENTORY RENDERING
       ===================================================== */

    function getStockState(
        stock,
        reorder
    ) {

        const quantity =
            numberValue(stock);

        const reorderLevel =
            numberValue(reorder);


        if (quantity <= 0) {

            return {
                label: "Out of Stock",
                className: "out"
            };
        }


        if (
            reorderLevel > 0 &&
            quantity <= reorderLevel
        ) {

            return {
                label: "Low Stock",
                className: "low"
            };
        }


        return {
            label: "Available",
            className: "good"
        };
    }


    function renderInventory() {

        if (!tableBody) {
            return;
        }


        if (!inventoryData.length) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="sf-empty"
                    >
                        <div class="inventory-empty">

                            <i
                                class="fa-solid fa-box-open"
                            ></i>

                            <strong>
                                No inventory records found
                            </strong>

                            <span>
                                Add products to your StockFlow inventory
                                to see current stock here.
                            </span>

                        </div>
                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML =
            inventoryData
                .map(item => {

                    const product =
                        normalizeProduct(item);


                    if (!product) {
                        return "";
                    }


                    const stock =
                        numberValue(
                            product.stock
                        );


                    const reorder =
                        numberValue(
                            product.reorder
                        );


                    const state =
                        getStockState(
                            stock,
                            reorder
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(product.sku)}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(product.name)}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(product.category)}
                            </td>

                            <td>
                                ${escapeHTML(product.supplier)}
                            </td>

                            <td>
                                <strong>
                                    ${formatNumber(stock)}
                                </strong>
                            </td>

                            <td>
                                ${formatNumber(reorder)}
                            </td>

                            <td>
                                <span
                                    class="state-badge ${state.className}"
                                >
                                    ${escapeHTML(state.label)}
                                </span>
                            </td>

                        </tr>
                    `;
                })
                .join("");
    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    function renderStatistics() {

        const products =
            inventoryData
                .map(normalizeProduct)
                .filter(Boolean);


        const productTotal =
            products.length;


        const units =
            products.reduce(
                (sum, item) => {

                    return (
                        sum +
                        numberValue(
                            item.stock
                        )
                    );

                },
                0
            );


        const low =
            products.filter(item => {

                const stock =
                    numberValue(
                        item.stock
                    );

                const reorder =
                    numberValue(
                        item.reorder
                    );

                return (
                    stock > 0 &&
                    reorder > 0 &&
                    stock <= reorder
                );

            }).length;


        const out =
            products.filter(item => {

                return (
                    numberValue(
                        item.stock
                    ) <= 0
                );

            }).length;


        if (productsCount) {
            productsCount.textContent =
                formatNumber(
                    productTotal
                );
        }


        if (totalStock) {
            totalStock.textContent =
                formatNumber(units);
        }


        if (lowStock) {
            lowStock.textContent =
                formatNumber(low);
        }


        if (outOfStock) {
            outOfStock.textContent =
                formatNumber(out);
        }


        if (inventoryCount) {

            inventoryCount.textContent =
                `${formatNumber(productTotal)} inventory record${
                    productTotal === 1
                        ? ""
                        : "s"
                }`;
        }
    }


    /* =====================================================
       LOAD INVENTORY
       ===================================================== */

    async function loadInventory() {

        if (isLoading) {
            return;
        }


        isLoading = true;

        clearAlert();


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="sf-empty"
                    >

                        <div class="table-loading">

                            <div
                                class="loading-spinner"
                            ></div>

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


        try {

            /*
             * First verify whether we can identify
             * the current session/user.
             */

            const user =
                await resolveCurrentUser();


            /*
             * We no longer throw:
             *
             * "StockFlow authentication module is not available"
             *
             * merely because StockFlowAuth isn't globally
             * available.
             *
             * If the existing auth module is absent,
             * stored session data can still be used.
             */

            if (user) {
                applyUserUI(user);
            } else {

                /*
                 * Keep the page usable rather than displaying
                 * Administrator by default.
                 */

                applyUserUI({
                    name: "StockFlow User",
                    role: "Employee"
                });
            }


            let data = [];


            /*
             * Primary source: StockFlowAPI.
             */

            try {

                data =
                    await requestInventoryFromAPI();

                setConnected();

            } catch (apiError) {

                console.warn(
                    "StockFlow inventory API failed:",
                    apiError
                );


                /*
                 * If API fails, check local product data.
                 */

                const localData =
                    getLocalProducts();


                if (localData.length) {

                    data =
                        localData;

                    setConnected();

                    showAlert(
                        "Inventory is using locally stored product data.",
                        "warning",
                        false
                    );

                } else {

                    /*
                     * This is a genuine data/API problem.
                     * It is NOT an authentication-module error.
                     */

                    setOffline(
                        "System Offline"
                    );


                    throw new Error(
                        apiError?.message ||
                        "Unable to connect to the inventory service."
                    );
                }
            }


            inventoryData =
                Array.isArray(data)
                    ? data
                        .map(normalizeProduct)
                        .filter(Boolean)
                    : [];


            renderStatistics();

            renderInventory();


            /*
             * If we reached here through the API,
             * connection is confirmed.
             */

            if (
                !alertBox ||
                !alertBox.textContent.trim()
            ) {
                setConnected();
            }

        } catch (error) {

            console.error(
                "StockFlow inventory loading error:",
                error
            );


            inventoryData = [];


            if (productsCount) {
                productsCount.textContent = "—";
            }

            if (totalStock) {
                totalStock.textContent = "—";
            }

            if (lowStock) {
                lowStock.textContent = "—";
            }

            if (outOfStock) {
                outOfStock.textContent = "—";
            }


            if (inventoryCount) {
                inventoryCount.textContent =
                    "Inventory unavailable";
            }


            if (tableBody) {

                tableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="sf-empty"
                        >

                            <div class="inventory-empty">

                                <i
                                    class="fa-solid fa-cloud-arrow-down"
                                ></i>

                                <strong>
                                    Unable to load inventory
                                </strong>

                                <span>
                                    StockFlow could not retrieve
                                    the current inventory data.
                                </span>

                            </div>

                        </td>
                    </tr>
                `;
            }


            showAlert(
                error?.message ||
                "Unable to load inventory data.",
                "error",
                true
            );


            /*
             * Only display Offline when there is
             * actually no usable data/API connection.
             */

            setOffline(
                "System Offline"
            );

        } finally {

            isLoading = false;
        }
    }


    /* =====================================================
       RETRY / AUTO REFRESH
       ===================================================== */

    function startAutoRefresh() {

        if (retryTimer) {
            clearInterval(retryTimer);
        }


        retryTimer =
            setInterval(
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


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        /*
         * Always make the hardcoded HTML role disappear
         * as soon as JS starts.
         *
         * The actual session role will replace it.
         */

        if (userRole) {
            userRole.textContent =
                "Employee";
        }

        if (topUserRole) {
            topUserRole.textContent =
                "Employee";
        }


        /*
         * Keep SF as the avatar.
         */

        if (userAvatar) {
            userAvatar.textContent =
                "SF";
        }

        if (topUserAvatar) {
            topUserAvatar.textContent =
                "SF";
        }


        setConnectionStatus(
            true,
            "System Connected"
        );


        await loadInventory();

        startAutoRefresh();
    }


    initialize();

});
