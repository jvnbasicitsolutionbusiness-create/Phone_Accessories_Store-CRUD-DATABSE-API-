/* =========================================================
   STOCKFLOW | INVENTORY.JS
   =========================================================
   Inventory Management Controller

   Features:
   - Authenticated session detection
   - STOCKFLOW_SESSION support
   - Current signed-in user detection
   - API user refresh
   - Sidebar user display
   - Top-right user display
   - Clickable profile navigation
   - Working logout
   - Mobile sidebar
   - Notifications
   - Inventory API loading
   - Local storage fallback
   - Inventory statistics
   - Inventory table
   - Connection monitoring
   - Manual retry
   - Automatic refresh
   - Visibility refresh
   - Audit/activity support
   - Global theme compatibility
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
       CONFIGURATION
       ===================================================== */

    const MOBILE_BREAKPOINT = 900;

    const AUTO_REFRESH_INTERVAL = 60000;

    const SESSION_KEY = "STOCKFLOW_SESSION";


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const elements = {

        body:
            document.body,

        html:
            document.documentElement,


        /* -----------------------------------------------
           SIDEBAR
           ----------------------------------------------- */

        sidebar:
            document.getElementById("sidebar"),

        sidebarOverlay:
            document.getElementById("sidebarOverlay"),

        mobileMenuBtn:
            document.getElementById("mobileMenuBtn"),


        /* -----------------------------------------------
           AUTH
           ----------------------------------------------- */

        logoutBtn:
            document.getElementById("logoutBtn"),


        /* -----------------------------------------------
           NOTIFICATIONS
           ----------------------------------------------- */

        notificationBtn:
            document.getElementById("notificationBtn"),

        notificationPanel:
            document.getElementById("notificationPanel"),


        /* -----------------------------------------------
           CONNECTION
           ----------------------------------------------- */

        connectionBadge:
            document.getElementById("connectionBadge"),

        connectionMessage:
            document.getElementById("connectionMessage"),


        /* -----------------------------------------------
           SIDEBAR USER
           ----------------------------------------------- */

        userAvatar:
            document.getElementById("userAvatar"),

        userName:
            document.getElementById("userName"),

        userRole:
            document.getElementById("userRole"),


        /* -----------------------------------------------
           TOP USER
           ----------------------------------------------- */

        topUserAvatar:
            document.getElementById("topUserAvatar"),

        topUserName:
            document.getElementById("topUserName"),

        topUserRole:
            document.getElementById("topUserRole"),


        /* -----------------------------------------------
           INVENTORY STATISTICS
           ----------------------------------------------- */

        productCount:
            document.getElementById("pc"),

        totalStock:
            document.getElementById("ts"),

        lowStock:
            document.getElementById("ls"),

        outOfStock:
            document.getElementById("os"),


        /* -----------------------------------------------
           INVENTORY TABLE
           ----------------------------------------------- */

        rows:
            document.getElementById("rows"),


        /* -----------------------------------------------
           ALERT
           ----------------------------------------------- */

        alert:
            document.getElementById("alert"),


        /* -----------------------------------------------
           INVENTORY COUNT
           ----------------------------------------------- */

        inventoryCount:
            document.getElementById("inventoryCount")

    };


    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        currentUser:
            null,

        currentInventory:
            [],

        refreshTimer:
            null,

        isLoading:
            false,

        isLoggingOut:
            false,

        previousMobileState:
            window.innerWidth <= MOBILE_BREAKPOINT

    };


    /* =====================================================
       STORAGE KEYS
       ===================================================== */

    const LEGACY_AUTH_KEYS = [

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


    /* =====================================================
       GENERAL HELPERS
       ===================================================== */

    function safeString(
        value,
        fallback = ""
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return fallback;

        }


        const result =
            String(value).trim();


        return result ||
            fallback;

    }


    function escapeHTML(
        value
    ) {

        return safeString(value)
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


    function toNumber(
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
                    .replace(
                        /[^\d.-]/g,
                        ""
                    )
            );


        return Number.isFinite(number)
            ? number
            : fallback;

    }


    function formatNumber(
        value
    ) {

        return toNumber(value)
            .toLocaleString(
                "en-US"
            );

    }


    function isObject(
        value
    ) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );

    }


    function extractArray(
        data
    ) {

        if (
            Array.isArray(data)
        ) {

            return data;

        }


        if (
            !isObject(data)
        ) {

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
                Array.isArray(
                    data[key]
                )
            ) {

                return data[key];

            }

        }


        return [];

    }


    /* =====================================================
       USER HELPERS
       ===================================================== */

    function getInitials(
        name
    ) {

        const cleanName =
            safeString(
                name,
                "StockFlow User"
            );


        const parts =
            cleanName
                .split(/\s+/)
                .filter(Boolean);


        if (!parts.length) {

            return "SF";

        }


        if (
            parts.length === 1
        ) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();

        }


        return (
            parts[0][0] +
            parts[
                parts.length - 1
            ][0]
        ).toUpperCase();

    }


    function normalizeRole(
        role
    ) {

        const value =
            safeString(
                role,
                "Employee"
            ).toLowerCase();


        if (
            value.includes("admin") ||
            value.includes("manager")
        ) {

            return "Administrator";

        }


        if (
            value.includes("employee") ||
            value.includes("staff") ||
            value.includes("worker")
        ) {

            return "Employee";

        }


        return "Employee";

    }


    /* =====================================================
       AUTHENTICATION CONTROLLER
       ===================================================== */

    function getAuthController() {

        return (
            window.StockFlowAuth ||
            window.StockFlowAuthUI ||
            window.Auth ||
            null
        );

    }


    /* =====================================================
       READ MAIN STOCKFLOW SESSION
       ===================================================== */

    function readStockFlowSession() {

        try {

            const raw =
                sessionStorage.getItem(
                    SESSION_KEY
                );


            if (!raw) {

                return null;

            }


            const parsed =
                JSON.parse(raw);


            if (!parsed) {

                return null;

            }


            /*
             * Standard login structure:
             *
             * {
             *     success: true,
             *     user: {...}
             * }
             */

            if (
                isObject(parsed.user)
            ) {

                return parsed.user;

            }


            if (
                isObject(
                    parsed.data?.user
                )
            ) {

                return parsed.data.user;

            }


            if (
                isObject(
                    parsed.data
                )
            ) {

                return parsed.data;

            }


            return isObject(parsed)
                ? parsed
                : null;

        }

        catch (error) {

            console.warn(
                "STOCKFLOW_SESSION could not be read:",
                error
            );


            return null;

        }

    }


    /* =====================================================
       LEGACY STORAGE FALLBACK
       ===================================================== */

    function readLegacyStoredUser() {

        for (
            const key of LEGACY_AUTH_KEYS
        ) {

            /* ---------------------------------------------
               SESSION STORAGE
               --------------------------------------------- */

            try {

                const sessionValue =
                    sessionStorage.getItem(
                        key
                    );


                if (sessionValue) {

                    try {

                        return JSON.parse(
                            sessionValue
                        );

                    }

                    catch {

                        return {
                            name:
                                sessionValue
                        };

                    }

                }

            }

            catch {
                // Continue.
            }


            /* ---------------------------------------------
               LOCAL STORAGE
               --------------------------------------------- */

            try {

                const localValue =
                    localStorage.getItem(
                        key
                    );


                if (localValue) {

                    try {

                        return JSON.parse(
                            localValue
                        );

                    }

                    catch {

                        return {
                            name:
                                localValue
                        };

                    }

                }

            }

            catch {
                // Continue.
            }

        }


        return null;

    }


    /* =====================================================
       GET SESSION USER
       ===================================================== */

    function getSessionUser() {

        return (
            readStockFlowSession() ||
            readLegacyStoredUser()
        );

    }


    /* =====================================================
       USER IDENTITY
       ===================================================== */

    function getUserIdentity(
        user
    ) {

        if (!user) {

            return null;

        }


        const identity = {

            id:
                user.id ??
                user.user_id ??
                user.userId ??
                user.employee_id ??
                user.employeeId ??
                null,

            username:
                user.username ??
                user.user_name ??
                null,

            email:
                user.email ??
                user.gmail ??
                user.GMAIL ??
                null,

            phone:
                user.phone ??
                user.phone_number ??
                user.phoneNumber ??
                user["PHONE NO."] ??
                null

        };


        return identity;

    }


    /* =====================================================
       REFRESH USER FROM API
       ===================================================== */

    async function refreshUserFromAPI(
        sessionUser
    ) {

        const api =
            window.StockFlowAPI;


        if (
            !api ||
            typeof api.getUser !==
            "function"
        ) {

            return sessionUser;

        }


        const identity =
            getUserIdentity(
                sessionUser
            );


        if (!identity) {

            return sessionUser;

        }


        /*
         * Try the complete identity object first.
         */

        try {

            const response =
                await api.getUser(
                    identity
                );


            const refreshed =
                response?.user ||
                response?.data?.user ||
                response?.data ||
                response;


            if (
                isObject(refreshed)
            ) {

                return {

                    ...sessionUser,

                    ...refreshed

                };

            }

        }

        catch (error) {

            console.warn(
                "StockFlow user refresh failed:",
                error
            );

        }


        return sessionUser;

    }


    /* =====================================================
       AUTHENTICATED USER
       ===================================================== */

    async function requireAuthenticatedUser() {

        const auth =
            getAuthController();


        /*
         * Use the central authentication
         * controller if available.
         */

        if (
            auth &&
            typeof auth.requireAuth ===
            "function"
        ) {

            try {

                const authenticatedUser =
                    await auth.requireAuth();


                if (
                    authenticatedUser
                ) {

                    return authenticatedUser;

                }

            }

            catch (error) {

                console.warn(
                    "Central authentication check failed:",
                    error
                );

            }

        }


        /*
         * STOCKFLOW_SESSION is the actual
         * login session source.
         */

        const sessionUser =
            getSessionUser();


        if (!sessionUser) {

            window.location.href =
                "./auth.html";


            return null;

        }


        /*
         * Refresh current user information
         * from the API when possible.
         */

        const refreshedUser =
            await refreshUserFromAPI(
                sessionUser
            );


        return refreshedUser;

    }


    /* =====================================================
       APPLY USER TO UI
       ===================================================== */

    function applyUser(
        user
    ) {

        if (!user) {

            return;

        }


        state.currentUser =
            user;


        const name =
            safeString(

                user.name ||

                user.fullName ||

                user.full_name ||

                user.username ||

                user.email ||

                user.gmail ||

                user.phone ||

                "StockFlow User"

            );


        const role =
            normalizeRole(
                user.role
            );


        const initials =
            getInitials(
                name
            );


        /* ---------------------------------------------
           SIDEBAR
           --------------------------------------------- */

        if (
            elements.userName
        ) {

            elements.userName.textContent =
                name;

        }


        if (
            elements.userRole
        ) {

            elements.userRole.textContent =
                role;

        }


        if (
            elements.userAvatar
        ) {

            elements.userAvatar.textContent =
                initials;

        }


        /* ---------------------------------------------
           TOP RIGHT
           --------------------------------------------- */

        if (
            elements.topUserName
        ) {

            elements.topUserName.textContent =
                name;

        }


        if (
            elements.topUserRole
        ) {

            elements.topUserRole.textContent =
                role;

        }


        if (
            elements.topUserAvatar
        ) {

            elements.topUserAvatar.textContent =
                initials;

        }


        /*
         * Let the central authentication UI
         * controller also bind its user fields
         * when available.
         */

        const auth =
            getAuthController();


        if (
            auth &&
            typeof auth.bindUserUI ===
            "function"
        ) {

            try {

                auth.bindUserUI(
                    user
                );

            }

            catch (error) {

                console.warn(
                    "StockFlow user UI binding failed:",
                    error
                );

            }

        }

    }


    /* =====================================================
       PROFILE NAVIGATION
       ===================================================== */

    function makeProfileTarget(
        element
    ) {

        if (!element) {

            return;

        }


        /*
         * Do not interfere with an existing
         * anchor that already points to profile.
         */

        if (
            element.tagName === "A"
        ) {

            element.href =
                "./profile.html";

        }

        else {

            element.setAttribute(
                "role",
                "link"
            );

            element.setAttribute(
                "tabindex",
                "0"
            );

        }


        element.classList.add(
            "sf-profile-clickable"
        );


        const navigate =
            event => {

                /*
                 * Do not override an actual
                 * button such as logout.
                 */

                if (
                    event.target.closest(
                        "#logoutBtn"
                    )
                ) {

                    return;

                }


                if (
                    event.target.closest(
                        "a"
                    ) &&
                    event.target.closest(
                        "a"
                    ) !== element
                ) {

                    return;

                }


                event.preventDefault();

                window.location.href =
                    "./profile.html";

            };


        element.addEventListener(
            "click",
            navigate
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


    function initializeProfileLinks() {

        const sidebarCandidates = [

            elements.userAvatar,
            elements.userName

        ];


        const topCandidates = [

            elements.topUserAvatar,
            elements.topUserName

        ];


        sidebarCandidates
            .filter(Boolean)
            .forEach(
                makeProfileTarget
            );


        topCandidates
            .filter(Boolean)
            .forEach(
                makeProfileTarget
            );

    }


    /* =====================================================
       CONNECTION STATUS
       ===================================================== */

    function setConnectionStatus(
        connected,
        message = ""
    ) {

        if (
            elements.connectionBadge
        ) {

            elements.connectionBadge.classList.toggle(
                "offline",
                !connected
            );


            elements.connectionBadge.classList.toggle(
                "online",
                connected
            );


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


        if (
            elements.connectionMessage
        ) {

            elements.connectionMessage.textContent =
                connected
                    ? "SYSTEM CONNECTED"
                    : "SYSTEM OFFLINE";

        }

    }


    /* =====================================================
       ALERT SYSTEM
       ===================================================== */

    function hideAlert() {

        if (
            !elements.alert
        ) {

            return;

        }


        elements.alert.className =
            "sf-alert";


        elements.alert.innerHTML =
            "";

    }


    function showAlert(
        type,
        message,
        actionText = "",
        actionCallback = null
    ) {

        if (
            !elements.alert
        ) {

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

            <i
                class="alert-icon ${icon}"
            ></i>

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

    function isMobile() {

        return (
            window.innerWidth <=
            MOBILE_BREAKPOINT
        );

    }


    function openSidebar() {

        if (
            !elements.sidebar
        ) {

            return;

        }


        elements.sidebar.classList.add(
            "open"
        );


        if (
            elements.sidebarOverlay
        ) {

            elements.sidebarOverlay.classList.add(
                "show"
            );

        }


        elements.body.classList.add(
            "sidebar-open"
        );


        if (
            elements.mobileMenuBtn
        ) {

            elements.mobileMenuBtn.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    function closeSidebar() {

        if (
            elements.sidebar
        ) {

            elements.sidebar.classList.remove(
                "open"
            );

        }


        if (
            elements.sidebarOverlay
        ) {

            elements.sidebarOverlay.classList.remove(
                "show"
            );

        }


        elements.body.classList.remove(
            "sidebar-open"
        );


        if (
            elements.mobileMenuBtn
        ) {

            elements.mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    function toggleSidebar() {

        if (
            !elements.sidebar
        ) {

            return;

        }


        if (
            elements.sidebar.classList.contains(
                "open"
            )
        ) {

            closeSidebar();

        }

        else {

            openSidebar();

        }

    }


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function closeNotifications() {

        if (
            !elements.notificationPanel
        ) {

            return;

        }


        elements.notificationPanel.classList.remove(
            "show"
        );


        elements.notificationPanel.classList.remove(
            "active"
        );


        if (
            elements.notificationBtn
        ) {

            elements.notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    function openNotifications() {

        if (
            !elements.notificationPanel
        ) {

            return;

        }


        elements.notificationPanel.classList.add(
            "show"
        );


        if (
            elements.notificationBtn
        ) {

            elements.notificationBtn.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    function toggleNotifications(
        event
    ) {

        if (event) {

            event.stopPropagation();

        }


        if (
            !elements.notificationPanel
        ) {

            return;

        }


        const open =
            elements.notificationPanel.classList.contains(
                "show"
            ) ||
            elements.notificationPanel.classList.contains(
                "active"
            );


        if (open) {

            closeNotifications();

        }

        else {

            openNotifications();

        }

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout() {

        if (
            state.isLoggingOut
        ) {

            return;

        }


        state.isLoggingOut =
            true;


        if (
            elements.logoutBtn
        ) {

            elements.logoutBtn.disabled =
                true;

            elements.logoutBtn.classList.add(
                "loading"
            );

        }


        try {

            const auth =
                getAuthController();


            /*
             * Use central logout first.
             */

            if (
                auth &&
                typeof auth.logout ===
                "function"
            ) {

                try {

                    await auth.logout();

                }

                catch (error) {

                    console.warn(
                        "Central logout failed. Clearing local session:",
                        error
                    );

                }

            }

            else if (
                auth &&
                typeof auth.signOut ===
                "function"
            ) {

                try {

                    await auth.signOut();

                }

                catch (error) {

                    console.warn(
                        "Central signOut failed:",
                        error
                    );

                }

            }


            /*
             * Always clear the main STOCKFLOW
             * session locally as a safety measure.
             */

            try {

                sessionStorage.removeItem(
                    SESSION_KEY
                );

            }

            catch {}


            /*
             * Clear old compatibility keys.
             */

            for (
                const key of LEGACY_AUTH_KEYS
            ) {

                try {

                    localStorage.removeItem(
                        key
                    );

                }

                catch {}


                try {

                    sessionStorage.removeItem(
                        key
                    );

                }

                catch {}

            }


            /*
             * Stop inventory refresh.
             */

            if (
                state.refreshTimer
            ) {

                clearInterval(
                    state.refreshTimer
                );


                state.refreshTimer =
                    null;

            }


            /*
             * Redirect to the authentication
             * page after the session is removed.
             */

            window.location.replace(
                "./auth.html"
            );

        }

        catch (error) {

            console.error(
                "STOCKFLOW logout error:",
                error
            );


            /*
             * Even if the controller fails,
             * force-clear the local session.
             */

            try {

                sessionStorage.removeItem(
                    SESSION_KEY
                );

            }

            catch {}


            window.location.replace(
                "./auth.html"
            );

        }

    }


    /* =====================================================
       LOCAL INVENTORY FALLBACK
       ===================================================== */

    function readLocalInventory() {

        for (
            const key of PRODUCT_STORAGE_KEYS
        ) {

            let value =
                null;


            try {

                value =
                    localStorage.getItem(
                        key
                    );

            }

            catch {}


            if (!value) {

                try {

                    value =
                        sessionStorage.getItem(
                            key
                        );

                }

                catch {}

            }


            if (!value) {

                continue;

            }


            try {

                const parsed =
                    JSON.parse(
                        value
                    );


                const extracted =
                    extractArray(
                        parsed
                    );


                if (
                    extracted.length
                ) {

                    return extracted;

                }

            }

            catch {
                // Continue.
            }

        }


        return [];

    }


    /* =====================================================
       INVENTORY API
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


        /*
         * Direct methods.
         */

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
                    extractArray(
                        response
                    );


                if (
                    Array.isArray(data)
                ) {

                    return data;

                }

            }

            catch (error) {

                console.warn(
                    `Inventory API method ${method} failed:`,
                    error
                );

            }

        }


        /*
         * Generic methods.
         */

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
                        extractArray(
                            response
                        );


                    if (
                        Array.isArray(data)
                    ) {

                        return data;

                    }

                }

                catch {
                    // Continue.
                }

            }

        }


        throw new Error(
            "No compatible inventory API endpoint found."
        );

    }


    /* =====================================================
       NORMALIZE INVENTORY ITEM
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

                `SKU-${String(
                    index + 1
                ).padStart(
                    4,
                    "0"
                )}`

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


        let stockState =
            safeString(

                source.state ||

                source.status ||

                source.stock_status ||

                source.stockStatus

            ).toLowerCase();


        if (
            !stockState ||
            stockState === "available" ||
            stockState === "in stock"
        ) {

            if (
                stock <= 0
            ) {

                stockState =
                    "out";

            }

            else if (
                reorder > 0 &&
                stock <= reorder
            ) {

                stockState =
                    "low";

            }

            else {

                stockState =
                    "available";

            }

        }

        else if (
            stockState.includes(
                "out"
            )
        ) {

            stockState =
                "out";

        }

        else if (
            stockState.includes(
                "low"
            )
        ) {

            stockState =
                "low";

        }

        else {

            stockState =
                "available";

        }


        return {

            sku,

            product,

            category,

            supplier,

            stock,

            reorder,

            state:
                stockState

        };

    }


    /* =====================================================
       NORMALIZE COMPLETE INVENTORY
       ===================================================== */

    function normalizeInventory(
        records
    ) {

        if (
            !Array.isArray(records)
        ) {

            return [];

        }


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
       CALCULATE INVENTORY STATS
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
       RENDER STATISTICS
       ===================================================== */

    function renderStats(
        inventory
    ) {

        const stats =
            calculateStats(
                inventory
            );


        if (
            elements.productCount
        ) {

            elements.productCount.textContent =
                formatNumber(
                    stats.products
                );

        }


        if (
            elements.totalStock
        ) {

            elements.totalStock.textContent =
                formatNumber(
                    stats.totalUnits
                );

        }


        if (
            elements.lowStock
        ) {

            elements.lowStock.textContent =
                formatNumber(
                    stats.lowStock
                );

        }


        if (
            elements.outOfStock
        ) {

            elements.outOfStock.textContent =
                formatNumber(
                    stats.outOfStock
                );

        }


        if (
            elements.inventoryCount
        ) {

            const label =
                stats.products === 1
                    ? "inventory record"
                    : "inventory records";


            elements.inventoryCount.textContent =
                `${formatNumber(
                    stats.products
                )} ${label}`;

        }

    }


    /* =====================================================
       STOCK STATE
       ===================================================== */

    function getStockClass(
        state
    ) {

        if (
            state === "out"
        ) {

            return "out";

        }


        if (
            state === "low"
        ) {

            return "low";

        }


        return "available";

    }


    function getStateLabel(
        state
    ) {

        if (
            state === "out"
        ) {

            return "Out of Stock";

        }


        if (
            state === "low"
        ) {

            return "Low Stock";

        }


        return "Available";

    }


    /* =====================================================
       LOADING STATE
       ===================================================== */

    function renderLoading() {

        if (
            !elements.rows
        ) {

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
       EMPTY STATE
       ===================================================== */

    function renderEmpty() {

        if (
            !elements.rows
        ) {

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

                            <i
                                class="fa-solid fa-box-open"
                            ></i>

                        </div>

                        <strong>
                            No inventory records
                        </strong>

                        <span>
                            No products are currently
                            available in the inventory.
                        </span>

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       INVENTORY TABLE
       ===================================================== */

    function renderInventory(
        inventory
    ) {

        if (
            !elements.rows
        ) {

            return;

        }


        if (
            !inventory.length
        ) {

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

                                    <span
                                        class="sku-cell"
                                    >
                                        ${escapeHTML(
                                            item.sku
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="product-cell"
                                    >
                                        ${escapeHTML(
                                            item.product
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="category-cell"
                                    >
                                        ${escapeHTML(
                                            item.category
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="supplier-cell"
                                    >
                                        ${escapeHTML(
                                            item.supplier
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="stock-badge ${stateClass}"
                                    >
                                        ${formatNumber(
                                            item.stock
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="reorder-cell"
                                    >
                                        ${formatNumber(
                                            item.reorder
                                        )}
                                    </span>

                                </td>


                                <td>

                                    <span
                                        class="state-badge ${stateClass}"
                                    >
                                        ${escapeHTML(
                                            stateLabel
                                        )}
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
       AUDIT / ACTIVITY SUPPORT
       ===================================================== */

    async function auditActivity(
        action,
        description = ""
    ) {

        const api =
            window.StockFlowAPI;


        if (!api) {

            return;

        }


        const methods = [

            "logActivity",
            "createActivity",
            "recordActivity",
            "auditActivity",
            "addActivity"

        ];


        const user =
            state.currentUser ||
            {};


        const payload = {

            action,

            type:
                action,

            description,

            user_id:
                user.id ??
                user.user_id ??
                user.userId ??
                "",

            username:
                user.username ??
                "",

            user_name:
                user.name ??
                user.fullName ??
                user.full_name ??
                "",

            page:
                "inventory",

            timestamp:
                new Date().toISOString()

        };


        for (
            const method of methods
        ) {

            if (
                typeof api[method] !==
                "function"
            ) {

                continue;

            }


            try {

                await api[method](
                    payload
                );


                return;

            }

            catch (error) {

                console.warn(
                    `Inventory audit method ${method} failed:`,
                    error
                );

            }

        }

    }


    /* =====================================================
       LOAD INVENTORY
       ===================================================== */

    async function loadInventory(
        options = {}
    ) {

        const silent =
            options.silent === true;


        if (
            state.isLoading
        ) {

            return false;

        }


        state.isLoading =
            true;


        if (!silent) {

            renderLoading();

            hideAlert();

        }


        try {

            let records =
                [];

            let apiWorked =
                false;


            /*
             * PRIMARY SOURCE
             */

            try {

                records =
                    await requestInventoryFromAPI();


                apiWorked =
                    true;

            }

            catch (apiError) {

                console.warn(
                    "Inventory API unavailable:",
                    apiError
                );

            }


            /*
             * FALLBACK
             */

            if (
                !apiWorked ||
                !Array.isArray(
                    records
                )
            ) {

                records =
                    readLocalInventory();

            }


            if (
                !Array.isArray(
                    records
                )
            ) {

                records =
                    [];

            }


            state.currentInventory =
                normalizeInventory(
                    records
                );


            renderStats(
                state.currentInventory
            );


            renderInventory(
                state.currentInventory
            );


            /*
             * CONNECTION
             */

            setConnectionStatus(
                true,
                apiWorked
                    ? "Inventory API connected."
                    : "Inventory loaded from local data."
            );


            /*
             * EMPTY DATA
             */

            if (
                state.currentInventory.length ===
                0
            ) {

                if (!silent) {

                    showAlert(
                        "info",
                        "Inventory is currently empty."
                    );

                }

            }

            else {

                hideAlert();

            }


            return true;

        }

        catch (error) {

            console.error(
                "STOCKFLOW inventory loading error:",
                error
            );


            state.currentInventory =
                [];


            renderStats(
                []
            );


            renderInventory(
                []
            );


            setConnectionStatus(
                false,
                error.message ||
                "Unable to retrieve inventory data."
            );


            showAlert(
                "error",
                "Unable to retrieve inventory data.",
                "Retry",
                () =>
                    loadInventory()
            );


            return false;

        }

        finally {

            state.isLoading =
                false;

        }

    }


    /* =====================================================
       START AUTO REFRESH
       ===================================================== */

    function startAutoRefresh() {

        stopAutoRefresh();


        state.refreshTimer =
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
                AUTO_REFRESH_INTERVAL
            );

    }


    /* =====================================================
       STOP AUTO REFRESH
       ===================================================== */

    function stopAutoRefresh() {

        if (
            state.refreshTimer
        ) {

            clearInterval(
                state.refreshTimer
            );


            state.refreshTimer =
                null;

        }

    }


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    function initializeSidebarEvents() {

        if (
            elements.mobileMenuBtn
        ) {

            elements.mobileMenuBtn.type =
                "button";


            elements.mobileMenuBtn.setAttribute(
                "aria-label",
                "Toggle navigation menu"
            );


            elements.mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );


            elements.mobileMenuBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    toggleSidebar();

                }
            );

        }


        if (
            elements.sidebarOverlay
        ) {

            elements.sidebarOverlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        document
            .querySelectorAll(
                ".sf-nav-link, .sidebar-link"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            if (
                                isMobile()
                            ) {

                                closeSidebar();

                            }

                        }
                    );

                }
            );

    }


    /* =====================================================
       NOTIFICATION EVENTS
       ===================================================== */

    function initializeNotificationEvents() {

        if (
            elements.notificationBtn
        ) {

            elements.notificationBtn.type =
                "button";


            elements.notificationBtn.setAttribute(
                "aria-label",
                "Notifications"
            );


            elements.notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );


            elements.notificationBtn.addEventListener(
                "click",
                toggleNotifications
            );

        }


        if (
            elements.notificationPanel
        ) {

            elements.notificationPanel.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                }
            );

        }

    }


    /* =====================================================
       LOGOUT EVENTS
       ===================================================== */

    function initializeLogout() {

        if (
            !elements.logoutBtn
        ) {

            return;

        }


        elements.logoutBtn.type =
            "button";


        elements.logoutBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                logout();

            }
        );

    }


    /* =====================================================
       GLOBAL CLICK EVENTS
       ===================================================== */

    function initializeGlobalEvents() {

        document.addEventListener(
            "click",
            event => {

                /*
                 * Notification
                 */

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


                /*
                 * Mobile sidebar
                 */

                if (
                    isMobile() &&
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


        /*
         * Escape key.
         */

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

                closeSidebar();

            }
        );


        /*
         * Resize.
         */

        window.addEventListener(
            "resize",
            () => {

                const currentMobileState =
                    isMobile();


                if (
                    currentMobileState !==
                    state.previousMobileState
                ) {

                    closeSidebar();

                }


                state.previousMobileState =
                    currentMobileState;

            }
        );


        /*
         * Visibility refresh.
         */

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState !==
                    "visible"
                ) {

                    return;

                }


                loadInventory({
                    silent: true
                });

            }
        );


        /*
         * Online.
         */

        window.addEventListener(
            "online",
            () => {

                setConnectionStatus(
                    true,
                    "Internet connection restored."
                );


                loadInventory();

            }
        );


        /*
         * Offline.
         */

        window.addEventListener(
            "offline",
            () => {

                setConnectionStatus(
                    false,
                    "Browser is offline."
                );

            }
        );

    }


    /* =====================================================
       INITIAL USER UI
       ===================================================== */

    function initializeDefaultUserUI() {

        if (
            elements.userAvatar
        ) {

            elements.userAvatar.textContent =
                "SF";

        }


        if (
            elements.topUserAvatar
        ) {

            elements.topUserAvatar.textContent =
                "SF";

        }


        if (
            elements.userRole
        ) {

            elements.userRole.textContent =
                "Employee";

        }


        if (
            elements.topUserRole
        ) {

            elements.topUserRole.textContent =
                "Employee";

        }

    }


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function initialize() {

        initializeDefaultUserUI();


        /*
         * Require a real authenticated session.
         */

        const user =
            await requireAuthenticatedUser();


        if (!user) {

            return;

        }


        /*
         * Apply actual signed-in user.
         */

        applyUser(
            user
        );


        /*
         * Profile click behavior.
         */

        initializeProfileLinks();


        /*
         * Page controls.
         */

        initializeSidebarEvents();

        initializeNotificationEvents();

        initializeLogout();

        initializeGlobalEvents();


        /*
         * Initial connection state.
         */

        setConnectionStatus(
            navigator.onLine,
            navigator.onLine
                ? "SYSTEM CONNECTED"
                : "SYSTEM OFFLINE"
        );


        /*
         * Load inventory.
         */

        await loadInventory();


        /*
         * Record that the authenticated
         * employee opened the inventory.
         *
         * This is intentionally non-blocking.
         */

        auditActivity(
            "Inventory Viewed",
            "Opened the inventory management page."
        );


        /*
         * Automatic refresh.
         */

        startAutoRefresh();

    }


    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        stopAutoRefresh
    );


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.StockFlowInventory = {

        refresh:
            () =>
                loadInventory(),

        reload:
            () =>
                loadInventory(),

        getInventory:
            () =>
                [
                    ...state.currentInventory
                ],

        getCurrentUser:
            () =>
                state.currentUser,

        logout,

        openSidebar,

        closeSidebar,

        toggleSidebar,

        openNotifications,

        closeNotifications,

        toggleNotifications

    };


    /* =====================================================
       START
       ===================================================== */

    initialize();

});
