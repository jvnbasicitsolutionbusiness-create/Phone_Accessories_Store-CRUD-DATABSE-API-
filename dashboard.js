/* ============================================================
   STOCKFLOW | DASHBOARD.JS
   ============================================================
   Dashboard Controller

   FEATURES
   ------------------------------------------------------------
   ✓ Signed-in user detection
   ✓ User display in sidebar + top-right
   ✓ Clickable user profile
   ✓ Working logout
   ✓ Session validation
   ✓ Responsive sidebar
   ✓ Mobile overlay
   ✓ Notification panel
   ✓ Dashboard statistics
   ✓ Real recent transactions
   ✓ Real recent activity / audit log
   ✓ Inventory alerts
   ✓ Quick navigation
   ✓ Connection monitoring
   ✓ Manual refresh support
   ✓ Automatic refresh
   ✓ Online / offline handling
   ✓ Safe HTML rendering
   ✓ Theme-compatible UI
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const MOBILE_BREAKPOINT = 900;

    const AUTO_REFRESH_INTERVAL = 60000;

    const MAX_ITEMS = 8;


    /* ========================================================
       HELPERS
    ======================================================== */

    const get = id =>
        document.getElementById(id);


    const $$ = selector =>
        Array.from(
            document.querySelectorAll(selector)
        );


    const setText = (
        id,
        value
    ) => {

        const element =
            get(id);

        if (element) {

            element.textContent =
                value ?? "—";

        }

    };


    function esc(value) {

        return String(
            value ?? ""
        )
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


    function toNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;

    }


    function formatNumber(value) {

        return toNumber(
            value
        ).toLocaleString();

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


    function getDateValue(object) {

        return getValue(
            object,
            "DATE",
            "date",
            "CREATED_AT",
            "createdAt",
            "UPDATED_AT",
            "updatedAt",
            "timestamp",
            "TIMESTAMP"
        );

    }


    function getTime(value) {

        if (!value) {
            return 0;
        }

        const date =
            new Date(value);

        const time =
            date.getTime();

        return Number.isFinite(time)
            ? time
            : 0;

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


    function firstName(name) {

        return String(
            name || "User"
        )
            .trim()
            .split(/\s+/)[0] ||
            "User";

    }


    /* ========================================================
       STATE
    ======================================================== */

    const state = {

        currentUser: null,

        isLoading: false,

        refreshTimer: null,

        notificationPanel: null,

        previousMobileState:
            window.innerWidth <=
            MOBILE_BREAKPOINT

    };


    /* ========================================================
       DOM REFERENCES
    ======================================================== */

    const sidebar =
        get("sidebar");

    const sidebarOverlay =
        get("sidebarOverlay");

    const mobileMenuBtn =
        get("mobileMenuBtn");

    const notificationBtn =
        get("notificationBtn");

    const logoutBtn =
        get("logoutBtn");


    /* ========================================================
       SESSION HELPERS
    ======================================================== */

    function parseJSON(value) {

        if (!value) {
            return null;
        }

        if (
            typeof value ===
            "object"
        ) {

            return value;

        }

        try {

            return JSON.parse(
                value
            );

        } catch (_) {

            return null;

        }

    }


    /*
     * The existing login.js can save:
     *
     * STOCKFLOW_SESSION
     *
     * containing:
     * {
     *   success: true,
     *   token: "...",
     *   user: {...}
     * }
     *
     * This function restores that session into
     * the API client's normal storage.
     */

    function hydrateLegacySession() {

        try {

            const raw =
                sessionStorage.getItem(
                    "STOCKFLOW_SESSION"
                );

            const session =
                parseJSON(raw);

            if (!session) {
                return null;
            }


            const token =
                session.token ||
                session.data?.token ||
                session.session?.token ||
                "";


            const user =
                session.user ||
                session.data?.user ||
                session.account ||
                null;


            if (
                token &&
                window.StockFlowAPI &&
                typeof window.StockFlowAPI.saveToken ===
                    "function"
            ) {

                window.StockFlowAPI.saveToken(
                    token
                );

            }


            if (
                user &&
                window.StockFlowAPI &&
                typeof window.StockFlowAPI.saveStoredUser ===
                    "function"
            ) {

                window.StockFlowAPI.saveStoredUser(
                    user
                );

            }


            return user;

        } catch (error) {

            console.warn(
                "STOCKFLOW: Unable to restore legacy session.",
                error
            );

            return null;

        }

    }


    function getStoredUser() {

        /*
         * First restore legacy login session.
         */

        const legacyUser =
            hydrateLegacySession();


        if (legacyUser) {
            return legacyUser;
        }


        /*
         * Preferred API storage.
         */

        try {

            if (
                window.StockFlowAPI &&
                typeof window.StockFlowAPI.getStoredUser ===
                    "function"
            ) {

                const user =
                    window.StockFlowAPI.getStoredUser();

                if (user) {
                    return user;
                }

            }

        } catch (error) {

            console.warn(
                "STOCKFLOW: Unable to read stored user.",
                error
            );

        }


        /*
         * Direct STOCKFLOW_USER fallback.
         */

        try {

            const sessionUser =
                parseJSON(
                    sessionStorage.getItem(
                        "STOCKFLOW_USER"
                    )
                );

            if (sessionUser) {
                return sessionUser;
            }

        } catch (_) {}


        try {

            const localUser =
                parseJSON(
                    localStorage.getItem(
                        "STOCKFLOW_USER"
                    )
                );

            if (localUser) {
                return localUser;
            }

        } catch (_) {}


        return null;

    }


    function getUserName(user) {

        return String(

            getValue(
                user,
                "name",
                "fullName",
                "full_name",
                "displayName",
                "NAME",
                "username",
                "USERNAME",
                "email",
                "EMAIL",
                "gmail"
            ) ||

            "StockFlow User"

        );

    }


    function getUserRole(user) {

        const role =
            String(
                getValue(
                    user,
                    "role",
                    "ROLE",
                    "position",
                    "POSITION",
                    "accountRole",
                    "userRole"
                ) ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            role === "admin" ||
            role === "administrator"
        ) {

            return "Administrator";

        }


        if (
            role === "employee" ||
            role === "staff"
        ) {

            return "Employee";

        }


        return role
            ? role.charAt(0).toUpperCase() +
              role.slice(1)
            : "Employee";

    }


    function getInitials(name) {

        const parts =
            String(
                name || ""
            )
                .trim()
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
            parts[0].charAt(0) +
            parts[1].charAt(0)
        ).toUpperCase();

    }


    /* ========================================================
       USER UI
    ======================================================== */

    function renderCurrentUser(user) {

        if (!user) {
            return;
        }


        const name =
            getUserName(user);


        const role =
            getUserRole(user);


        const initials =
            getInitials(name);


        const first =
            firstName(name);


        $$("[data-user-name]")
            .forEach(
                element => {

                    element.textContent =
                        name;

                }
            );


        $$("[data-user-role]")
            .forEach(
                element => {

                    element.textContent =
                        role;

                }
            );


        $$("[data-user-initials]")
            .forEach(
                element => {

                    element.textContent =
                        initials;

                }
            );


        $$("[data-user-first-name]")
            .forEach(
                element => {

                    element.textContent =
                        first;

                }
            );

    }


    /* ========================================================
       USER PROFILE LINKS
    ======================================================== */

    function initializeUserLinks() {

        /*
         * Top-right account is already an <a>
         * pointing to profile.html.
         *
         * Sidebar account is a <div>, so make it
         * clickable as well.
         */

        const sidebarUser =
            document.querySelector(
                ".mini-user"
            );


        if (sidebarUser) {

            sidebarUser.setAttribute(
                "role",
                "link"
            );

            sidebarUser.setAttribute(
                "tabindex",
                "0"
            );

            sidebarUser.setAttribute(
                "aria-label",
                "Open profile"
            );


            sidebarUser.addEventListener(
                "click",
                event => {

                    /*
                     * Do not navigate if the user clicked
                     * an actual interactive child.
                     */

                    if (
                        event.target.closest(
                            "a, button"
                        )
                    ) {

                        return;

                    }

                    window.location.href =
                        "./profile.html";

                }
            );


            sidebarUser.addEventListener(
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

    }


    /* ========================================================
       AUTHENTICATION
    ======================================================== */

    async function initializeAuthentication() {

        const storedUser =
            getStoredUser();


        /*
         * Immediately display the signed-in user
         * before the network request finishes.
         */

        if (storedUser) {

            state.currentUser =
                storedUser;

            renderCurrentUser(
                storedUser
            );

        }


        /*
         * Require a valid API session.
         */

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.requireSession !==
                "function"
        ) {

            /*
             * If a stored user exists, allow the page
             * to continue rather than showing a blank UI.
             */

            return Boolean(
                storedUser
            );

        }


        try {

            const response =
                await window.StockFlowAPI.requireSession();


            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Session expired."
                );

            }


            const authenticatedUser =
                response.user ||
                response.data?.user ||
                storedUser;


            if (!authenticatedUser) {

                throw new Error(
                    "No authenticated user was returned."
                );

            }


            state.currentUser =
                authenticatedUser;


            renderCurrentUser(
                authenticatedUser
            );


            /*
             * Keep the authenticated user locally
             * so every page can identify the same account.
             */

            if (
                typeof window.StockFlowAPI.saveStoredUser ===
                    "function"
            ) {

                window.StockFlowAPI.saveStoredUser(
                    authenticatedUser
                );

            }


            return true;

        }

        catch (error) {

            console.warn(
                "STOCKFLOW: Session validation failed.",
                error
            );


            /*
             * If we have a local user but the server is
             * temporarily unavailable, do not immediately
             * destroy the page.
             *
             * This makes the dashboard resilient to
             * temporary backend problems.
             */

            if (storedUser) {

                return true;

            }


            window.location.href =
                "./auth.html";


            return false;

        }

    }


    /* ========================================================
       SIDEBAR
    ======================================================== */

    function isMobile() {

        return (
            window.innerWidth <=
            MOBILE_BREAKPOINT
        );

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


        document.body.classList.toggle(
            "sidebar-collapsed"
        );

    }


    function initializeSidebar() {

        if (mobileMenuBtn) {

            mobileMenuBtn.type =
                "button";


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
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            if (isMobile()) {

                                closeMobileSidebar();

                            }

                        }
                    );

                }
            );


        window.addEventListener(
            "resize",
            () => {

                const current =
                    isMobile();


                if (
                    current !==
                    state.previousMobileState
                ) {

                    closeMobileSidebar();

                }


                state.previousMobileState =
                    current;

            }
        );

    }


    /* ========================================================
       LOGOUT
    ======================================================== */

    async function handleLogout() {

        if (!logoutBtn) {
            return;
        }


        logoutBtn.disabled =
            true;


        logoutBtn.classList.add(
            "loading"
        );


        const originalHTML =
            logoutBtn.innerHTML;


        logoutBtn.innerHTML = `

            <span
                class="sf-btn-spinner"
                aria-hidden="true">
            </span>

            <span>
                Signing out...
            </span>

        `;


        try {

            /*
             * Preferred backend logout.
             */

            if (
                window.StockFlowAPI &&
                typeof window.StockFlowAPI.logout ===
                    "function"
            ) {

                try {

                    await window.StockFlowAPI.logout();

                } catch (error) {

                    /*
                     * Even if backend logout fails,
                     * continue clearing local session.
                     */

                    console.warn(
                        "STOCKFLOW: Backend logout failed.",
                        error
                    );

                }

            }


            /*
             * Clear known session storage.
             */

            try {

                sessionStorage.removeItem(
                    "STOCKFLOW_SESSION"
                );

                sessionStorage.removeItem(
                    "STOCKFLOW_USER"
                );

                sessionStorage.removeItem(
                    "STOCKFLOW_TOKEN"
                );

            } catch (_) {}


            try {

                localStorage.removeItem(
                    "STOCKFLOW_USER"
                );

                localStorage.removeItem(
                    "STOCKFLOW_TOKEN"
                );

                localStorage.removeItem(
                    "STOCKFLOW_SESSION"
                );

            } catch (_) {}


            /*
             * Clear API-managed token/user if available.
             */

            try {

                if (
                    window.StockFlowAPI &&
                    typeof window.StockFlowAPI.clearToken ===
                        "function"
                ) {

                    window.StockFlowAPI.clearToken();

                }

                if (
                    window.StockFlowAPI &&
                    typeof window.StockFlowAPI.clearStoredUser ===
                        "function"
                ) {

                    window.StockFlowAPI.clearStoredUser();

                }

            } catch (_) {}


            /*
             * Finally return to authentication.
             */

            window.location.replace(
                "./auth.html"
            );

        }

        catch (error) {

            console.error(
                "STOCKFLOW: Logout failed.",
                error
            );


            logoutBtn.disabled =
                false;


            logoutBtn.classList.remove(
                "loading"
            );


            logoutBtn.innerHTML =
                originalHTML;

        }

    }


    function initializeLogout() {

        if (!logoutBtn) {
            return;
        }


        logoutBtn.type =
            "button";


        logoutBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                handleLogout();

            }
        );

    }


    /* ========================================================
       NOTIFICATIONS
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
                    aria-label="Close notifications">

                    <i class="fa-solid fa-xmark"></i>

                </button>

            </div>


            <div
                class="notification-list"
                id="notificationList">

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

    }


    function initializeNotifications() {

        if (!notificationBtn) {
            return;
        }


        notificationBtn.type =
            "button";


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


        const closeButton =
            get("closeNotificationBtn");


        closeButton?.addEventListener(
            "click",
            closeNotifications
        );


        ensureNotificationPanel();

    }


    /* ========================================================
       CONNECTION
    ======================================================== */

    function setConnectionStatus(
        online,
        message = ""
    ) {

        const card =
            get("connectionCard");

        const icon =
            get("connectionIcon");

        const title =
            get("connectionTitle");

        const connectionMessage =
            get("connectionMessage");

        const status =
            get("connectionStatus");


        if (card) {

            card.classList.toggle(
                "offline",
                !online
            );

            card.classList.toggle(
                "online",
                online
            );

        }


        if (icon) {

            icon.className =
                online
                    ? "fa-solid fa-circle-check"
                    : "fa-solid fa-circle-xmark";

        }


        if (title) {

            title.textContent =
                online
                    ? "System Connected"
                    : "System Offline";

        }


        if (connectionMessage) {

            connectionMessage.textContent =
                message ||
                (
                    online
                        ? "StockFlow services are connected."
                        : "Unable to connect to StockFlow services."
                );

        }


        if (status) {

            status.textContent =
                online
                    ? "Online"
                    : "Offline";


            status.classList.toggle(
                "offline",
                !online
            );

        }

    }


    async function checkConnection() {

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.health !==
                "function"
        ) {

            setConnectionStatus(
                navigator.onLine,
                navigator.onLine
                    ? "StockFlow is available."
                    : "Your browser is offline."
            );

            return;

        }


        try {

            await window.StockFlowAPI.health();


            setConnectionStatus(
                true,
                "StockFlow services are connected."
            );

        }

        catch (error) {

            setConnectionStatus(
                false,
                error.message ||
                "Unable to connect to StockFlow services."
            );

        }

    }


    /* ========================================================
       ACTIVITY ICON
    ======================================================== */

    function activityIcon(
        type
    ) {

        const value =
            String(
                type || ""
            ).toLowerCase();


        if (
            value.includes("stock in") ||
            value.includes("stock-in") ||
            value.includes("inbound") ||
            value.includes("receive")
        ) {

            return "fa-solid fa-arrow-down";

        }


        if (
            value.includes("stock out") ||
            value.includes("stock-out") ||
            value.includes("outbound") ||
            value.includes("sale")
        ) {

            return "fa-solid fa-arrow-up";

        }


        if (
            value.includes("product")
        ) {

            return "fa-solid fa-box";

        }


        if (
            value.includes("category")
        ) {

            return "fa-solid fa-layer-group";

        }


        if (
            value.includes("supplier")
        ) {

            return "fa-solid fa-truck-field";

        }


        if (
            value.includes("login") ||
            value.includes("logout") ||
            value.includes("auth")
        ) {

            return "fa-solid fa-user-shield";

        }


        return "fa-solid fa-clock-rotate-left";

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

                <div class="empty-state-icon">

                    <i class="${esc(icon)}"></i>

                </div>

                <h3>
                    ${esc(title)}
                </h3>

                <p>
                    ${esc(message)}
                </p>

            </div>

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


        const products =
            toNumber(
                getValue(
                    stats,
                    "products",
                    "totalProducts",
                    "productCount"
                )
            );


        const notifications = [];


        if (outOfStock > 0) {

            notifications.push({

                icon:
                    "fa-solid fa-circle-xmark",

                type:
                    "danger",

                title:
                    `${formatNumber(outOfStock)} product${
                        outOfStock === 1
                            ? ""
                            : "s"
                    } out of stock`,

                message:
                    "Review inventory and restock unavailable products.",

                link:
                    "./inventory.html"

            });

        }


        if (lowStock > 0) {

            notifications.push({

                icon:
                    "fa-solid fa-triangle-exclamation",

                type:
                    "warning",

                title:
                    `${formatNumber(lowStock)} product${
                        lowStock === 1
                            ? ""
                            : "s"
                    } low on stock`,

                message:
                    "Review low-stock products and record stock-in.",

                link:
                    "./inventory.html"

            });

        }


        if (products === 0) {

            notifications.push({

                icon:
                    "fa-solid fa-box-open",

                type:
                    "info",

                title:
                    "No products registered",

                message:
                    "Add your first product to begin managing inventory.",

                link:
                    "./products.html"

            });

        }


        if (!notifications.length) {

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


            const dot =
                get("notificationDot");


            if (dot) {
                dot.hidden = true;
            }


            return;

        }


        list.innerHTML =
            notifications
                .map(
                    item => `

                        <a
                            href="${esc(item.link)}"
                            class="notification-item ${esc(item.type)}">

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


        const dot =
            get("notificationDot");


        if (dot) {
            dot.hidden = false;
        }

    }


    /* ========================================================
       INVENTORY ALERTS
    ======================================================== */

    function renderInventoryAlerts(
        stats
    ) {

        const container =
            get("inventoryAlerts");


        if (!container) {
            return;
        }


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


        if (
            lowStock === 0 &&
            outOfStock === 0
        ) {

            container.innerHTML =
                emptyState(
                    "fa-solid fa-circle-check",
                    "Inventory looks good",
                    "There are no low-stock or out-of-stock alerts right now."
                );

            return;

        }


        const alerts = [];


        if (outOfStock > 0) {

            alerts.push(`

                <a
                    href="./inventory.html"
                    class="inventory-alert danger">

                    <div class="inventory-alert-icon">

                        <i class="fa-solid fa-circle-xmark"></i>

                    </div>

                    <div>

                        <strong>
                            ${formatNumber(outOfStock)}
                            Out of stock
                        </strong>

                        <span>
                            Products currently have zero stock.
                        </span>

                    </div>

                    <i class="fa-solid fa-chevron-right"></i>

                </a>

            `);

        }


        if (lowStock > 0) {

            alerts.push(`

                <a
                    href="./inventory.html"
                    class="inventory-alert warning">

                    <div class="inventory-alert-icon">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                    </div>

                    <div>

                        <strong>
                            ${formatNumber(lowStock)}
                            Low stock
                        </strong>

                        <span>
                            Products are at or below reorder level.
                        </span>

                    </div>

                    <i class="fa-solid fa-chevron-right"></i>

                </a>

            `);

        }


        container.innerHTML =
            alerts.join("");

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
       RECENT TRANSACTIONS
    ======================================================== */

    function normalizeTransaction(
        transaction,
        type
    ) {

        const product =
            getValue(
                transaction,
                "PRODUCT",
                "product",
                "PRODUCT_NAME",
                "productName",
                "NAME",
                "name"
            ) ||
            "Inventory Item";


        const quantity =
            getValue(
                transaction,
                "QTY",
                "qty",
                "QUANTITY",
                "quantity"
            );


        const date =
            getDateValue(
                transaction
            );


        const createdBy =
            getValue(
                transaction,
                "CREATED_BY",
                "createdBy",
                "USERNAME",
                "username"
            );


        return {

            ...transaction,

            product,

            quantity,

            date,

            type:
                type === "IN"
                    ? "Stock In"
                    : "Stock Out",

            createdBy

        };

    }


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


        const sorted =
            transactions
                .slice()
                .sort(
                    (a, b) =>
                        getTime(
                            b.date
                        ) -
                        getTime(
                            a.date
                        )
                )
                .slice(
                    0,
                    MAX_ITEMS
                );


        container.innerHTML =
            sorted
                .map(
                    transaction => {

                        const directionClass =
                            transaction.type ===
                            "Stock In"
                                ? "in"
                                : "out";


                        const icon =
                            transaction.type ===
                            "Stock In"
                                ? "fa-arrow-down"
                                : "fa-arrow-up";


                        return `

                            <div class="activity-row">

                                <div
                                    class="activity-icon ${directionClass}">

                                    <i
                                        class="fa-solid ${icon}">
                                    </i>

                                </div>


                                <div class="activity-content">

                                    <strong>
                                        ${esc(
                                            transaction.product
                                        )}
                                    </strong>

                                    <small>
                                        ${esc(
                                            transaction.type
                                        )}

                                        ${
                                            transaction.createdBy
                                                ? " • " +
                                                  esc(
                                                      transaction.createdBy
                                                  )
                                                : ""
                                        }
                                    </small>

                                </div>


                                <div class="activity-meta">

                                    <strong>
                                        ${
                                            transaction.type ===
                                            "Stock In"
                                                ? "+"
                                                : "-"
                                        }${formatNumber(
                                            transaction.quantity
                                        )}
                                    </strong>

                                    <small>
                                        ${formatDate(
                                            transaction.date
                                        )}
                                    </small>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* ========================================================
       RECENT ACTIVITY / AUDIT LOG
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
                    "Your latest system actions will appear here."
                );

            return;

        }


        const sorted =
            activities
                .slice()
                .sort(
                    (a, b) =>
                        getTime(
                            getDateValue(b)
                        ) -
                        getTime(
                            getDateValue(a)
                        )
                )
                .slice(
                    0,
                    MAX_ITEMS
                );


        container.innerHTML =
            sorted
                .map(
                    activity => {

                        const action =
                            getValue(
                                activity,
                                "ACTION",
                                "action",
                                "TYPE",
                                "type"
                            ) ||
                            "Activity";


                        const module =
                            getValue(
                                activity,
                                "MODULE",
                                "module"
                            );


                        const details =
                            getValue(
                                activity,
                                "DETAILS",
                                "details",
                                "DESCRIPTION",
                                "description"
                            );


                        const username =
                            getValue(
                                activity,
                                "USERNAME",
                                "username",
                                "CREATED_BY",
                                "createdBy"
                            );


                        const date =
                            getDateValue(
                                activity
                            );


                        return `

                            <div class="activity-row">

                                <div class="activity-icon">

                                    <i
                                        class="${esc(
                                            activityIcon(
                                                action
                                            )
                                        )}">
                                    </i>

                                </div>


                                <div class="activity-content">

                                    <strong>
                                        ${esc(
                                            action
                                        )}
                                    </strong>

                                    <small>

                                        ${
                                            module
                                                ? esc(
                                                    module
                                                )
                                                : ""
                                        }

                                        ${
                                            details
                                                ? " • " +
                                                  esc(
                                                      details
                                                  )
                                                : ""
                                        }

                                    </small>

                                </div>


                                <div class="activity-meta">

                                    ${
                                        username
                                            ? `<strong>${esc(
                                                username
                                            )}</strong>`
                                            : ""
                                    }

                                    <small>
                                        ${formatDate(
                                            date
                                        )}
                                    </small>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /* ========================================================
       LOAD TRANSACTIONS + ACTIVITY
    ======================================================== */

    async function loadRecentData() {

        const transactions = [];

        let activities = [];


        /*
         * Stock In + Stock Out
         */

        const transactionResults =
            await Promise.allSettled([

                window.StockFlowAPI.listTransactions({
                    type: "IN"
                }),

                window.StockFlowAPI.listTransactions({
                    type: "OUT"
                })

            ]);


        transactionResults
            .forEach(
                (result, index) => {

                    if (
                        result.status !==
                        "fulfilled"
                    ) {

                        return;

                    }


                    const response =
                        result.value;


                    const records =
                        response?.records ||
                        response?.data?.records ||
                        response?.data ||
                        [];


                    if (
                        !Array.isArray(
                            records
                        )
                    ) {

                        return;

                    }


                    const type =
                        index === 0
                            ? "IN"
                            : "OUT";


                    records.forEach(
                        record => {

                            transactions.push(
                                normalizeTransaction(
                                    record,
                                    type
                                )
                            );

                        }
                    );

                }
            );


        /*
         * Activity / Audit Log
         */

        try {

            const response =
                await window.StockFlowAPI.listActivity({
                    limit: 100
                });


            activities =
                response?.activities ||
                response?.data?.activities ||
                response?.records ||
                response?.data ||
                [];


            if (
                !Array.isArray(
                    activities
                )
            ) {

                activities = [];

            }

        }

        catch (error) {

            console.warn(
                "STOCKFLOW: Unable to load activity log.",
                error
            );

        }


        renderTransactions(
            transactions
        );


        renderActivity(
            activities
        );


        return {
            transactions,
            activities
        };

    }


    /* ========================================================
       LOAD DASHBOARD
    ======================================================== */

    async function loadDashboard() {

        if (state.isLoading) {
            return false;
        }


        state.isLoading =
            true;


        try {

            setConnectionStatus(
                true,
                "Loading StockFlow data..."
            );


            if (!navigator.onLine) {

                throw new Error(
                    "Your browser is offline."
                );

            }


            if (
                !window.StockFlowAPI
            ) {

                throw new Error(
                    "StockFlowAPI is not available."
                );

            }


            if (
                typeof window.StockFlowAPI.dashboardStats !==
                    "function"
            ) {

                /*
                 * Your current api.js does not expose
                 * dashboardStats() directly.
                 *
                 * The backend action DOES exist, so use
                 * the generic inventory() method.
                 */

                if (
                    typeof window.StockFlowAPI.inventory !==
                        "function"
                ) {

                    throw new Error(
                        "Dashboard API is unavailable."
                    );

                }

            }


            /*
             * Dashboard statistics.
             */

            const statsResponse =
                typeof window.StockFlowAPI.dashboardStats ===
                    "function"

                    ? await window.StockFlowAPI.dashboardStats()

                    : await window.StockFlowAPI.inventory(
                        "dashboardStats"
                    );


            const stats =
                statsResponse?.stats ||
                statsResponse?.data?.stats ||
                statsResponse?.data ||
                statsResponse ||
                {};


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


            /*
             * Counters.
             */

            setText(
                "productsCount",
                formatNumber(
                    products
                )
            );


            setText(
                "categoriesCount",
                formatNumber(
                    categories
                )
            );


            setText(
                "suppliersCount",
                formatNumber(
                    suppliers
                )
            );


            setText(
                "totalStockCount",
                formatNumber(
                    totalStock
                )
            );


            setText(
                "lowStockCount",
                formatNumber(
                    lowStock
                )
            );


            setText(
                "outOfStockCount",
                formatNumber(
                    outOfStock
                )
            );


            renderInventoryOverview({

                totalStock,
                lowStock,
                outOfStock

            });


            renderInventoryAlerts({

                lowStock,
                outOfStock

            });


            renderNotifications({

                products,
                lowStock,
                outOfStock

            });


            /*
             * Load actual transaction/activity data.
             */

            await loadRecentData();


            /*
             * Connection.
             */

            setConnectionStatus(
                true,
                "StockFlow is connected."
            );


            /*
             * Last updated.
             */

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
                "STOCKFLOW: Dashboard loading failed.",
                error
            );


            setConnectionStatus(
                false,
                error.message ||
                "Unable to load StockFlow data."
            );


            /*
             * Do not leave the page permanently
             * showing a spinner.
             */

            const transactions =
                get("recentTransactions");


            if (transactions) {

                transactions.innerHTML =
                    emptyState(
                        "fa-solid fa-triangle-exclamation",
                        "Unable to load transactions",
                        "Use Refresh or check the StockFlow connection."
                    );

            }


            const activity =
                get("recentActivity");


            if (activity) {

                activity.innerHTML =
                    emptyState(
                        "fa-solid fa-triangle-exclamation",
                        "Unable to load activity",
                        "The activity log could not be retrieved."
                    );

            }


            return false;

        }

        finally {

            state.isLoading =
                false;

        }

    }


    /* ========================================================
       REFRESH
    ======================================================== */

    function createRefreshButton() {

        /*
         * The current dashboard HTML does not have a
         * refresh button, so we do not require one.
         *
         * If you later add:
         *
         * id="refreshDashboardBtn"
         *
         * this code automatically activates it.
         */

        const button =
            get(
                "refreshDashboardBtn"
            );


        if (!button) {
            return;
        }


        button.type =
            "button";


        button.addEventListener(
            "click",
            async () => {

                if (state.isLoading) {
                    return;
                }


                button.disabled =
                    true;


                button.classList.add(
                    "loading"
                );


                try {

                    await loadDashboard();

                }

                finally {

                    button.disabled =
                        false;


                    button.classList.remove(
                        "loading"
                    );

                }

            }
        );

    }


    /* ========================================================
       QUICK NAVIGATION
    ======================================================== */

    function initializeQuickActions() {

        /*
         * Existing dashboard quick-action links are already
         * real <a> elements, so the browser handles navigation.
         *
         * This section only ensures keyboard/accessibility
         * behavior and does not replace normal links.
         */

        $$(".quick-action")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            closeMobileSidebar();

                        }
                    );

                }
            );

    }


    /* ========================================================
       GLOBAL CONTROLS
    ======================================================== */

    function initializeGlobalControls() {

        document.addEventListener(
            "click",
            event => {

                const closeButton =
                    event.target.closest(
                        "#notificationCloseBtn, #closeNotificationBtn"
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
       ONLINE / OFFLINE
    ======================================================== */

    function initializeConnectionEvents() {

        window.addEventListener(
            "online",
            () => {

                setConnectionStatus(
                    true,
                    "Connection restored. Refreshing..."
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
       VISIBILITY
    ======================================================== */

    function initializeVisibilityHandler() {

        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState ===
                    "visible"
                ) {

                    loadDashboard();

                }

            }
        );

    }


    /* ========================================================
       AUTO REFRESH
    ======================================================== */

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


    function startAutoRefresh() {

        stopAutoRefresh();


        state.refreshTimer =
            setInterval(
                () => {

                    loadDashboard();

                },
                AUTO_REFRESH_INTERVAL
            );

    }


    /* ========================================================
       PUBLIC DASHBOARD API
    ======================================================== */

    window.StockFlowDashboard = {

        refresh:
            loadDashboard,

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
            () => {

                const panel =
                    ensureNotificationPanel();

                if (panel) {

                    panel.classList.add(
                        "show"
                    );

                }

            },

        closeNotifications,

        toggleNotifications:

            toggleNotifications,

        logout:
            handleLogout

    };


    /* ========================================================
       INITIALIZATION
    ======================================================== */

    async function initializeDashboard() {

        const authenticated =
            await initializeAuthentication();


        if (!authenticated) {
            return;
        }


        renderCurrentUser(
            state.currentUser
        );


        initializeUserLinks();

        initializeSidebar();

        initializeLogout();

        initializeNotifications();

        initializeGlobalControls();

        initializeQuickActions();

        createRefreshButton();

        initializeConnectionEvents();

        initializeVisibilityHandler();


        await checkConnection();

        await loadDashboard();


        startAutoRefresh();

    }


    /* ========================================================
       CLEANUP
    ======================================================== */

    window.addEventListener(
        "beforeunload",
        stopAutoRefresh
    );


    /* ========================================================
       START
    ======================================================== */

    initializeDashboard();

});
