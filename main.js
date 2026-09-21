/* ============================================================
   STOCKFLOW | SHARED UI CONTROLLER
   File: main.js

   RESPONSIBILITIES:
   - Current year
   - Logged-in user UI
   - Correct user role display
   - Sidebar / mobile menu
   - Active navigation
   - Logout
   - Outside-click menu closing
   - Escape-key handling
   - Network status
   - Shared toast notifications
   - Page loading
   - Button loading
   - Table accessibility
   - Responsive behavior

   IMPORTANT:
   - Does NOT perform login
   - Does NOT perform registration
   - Does NOT generate OTP
   - Does NOT verify OTP
   - Does NOT modify authentication logic
   - Uses StockFlowAuth / StockFlowAPI when available
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       HELPERS
       ========================================================= */

    const $ = (
        selector,
        parent = document
    ) => parent.querySelector(selector);


    const $$ = (
        selector,
        parent = document
    ) => [
        ...parent.querySelectorAll(selector)
    ];


    const safeString = value => {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();
    };


    const escapeHTML = value => {

        return String(value ?? "")
            .replace(
                /[&<>"']/g,
                character => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[character])
            );

    };


    /* =========================================================
       CURRENT YEAR
       ========================================================= */

    const currentYear =
        new Date().getFullYear();


    $$("[data-year]").forEach(
        element => {

            element.textContent =
                currentYear;

        }
    );


    /* =========================================================
       GET CURRENT USER
       ========================================================= */

    function getCurrentUser() {

        /*
         * Preferred:
         * Central StockFlowAuth session.
         */

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.getCurrentUser ===
                    "function"
            ) {

                const user =
                    window.StockFlowAuth.getCurrentUser();

                if (user) {
                    return user;
                }

            }

        } catch (error) {

            console.warn(
                "STOCKFLOW: Unable to read StockFlowAuth user.",
                error
            );

        }


        /*
         * Secondary:
         * StockFlowAPI stored user.
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
         * Legacy STOCKFLOW_USER.
         */

        try {

            const sessionUser =
                sessionStorage.getItem(
                    "STOCKFLOW_USER"
                );


            if (sessionUser) {

                const parsed =
                    JSON.parse(
                        sessionUser
                    );

                if (parsed) {
                    return parsed;
                }

            }

        } catch (_) {}


        try {

            const localUser =
                localStorage.getItem(
                    "STOCKFLOW_USER"
                );


            if (localUser) {

                const parsed =
                    JSON.parse(
                        localUser
                    );

                if (parsed) {
                    return parsed;
                }

            }

        } catch (_) {}


        return null;

    }


    /* =========================================================
       GET USER NAME
       ========================================================= */

    function getUserName(user) {

        if (!user) {
            return "";
        }


        return safeString(

            user.name ||

            user.fullName ||

            user.displayName ||

            [
                user.firstName,
                user.lastName
            ]
                .filter(Boolean)
                .join(" ") ||

            user.username ||

            user.email ||

            user.gmail ||

            "User"

        );

    }


    /* =========================================================
       GET USER ROLE
       ========================================================= */

    function getUserRole(user) {

        if (!user) {
            return "";
        }


        const role =
            safeString(

                user.role ||

                user.accountRole ||

                user.userRole ||

                user.type ||

                ""

            );


        /*
         * Normalize only the spelling.
         *
         * We DO NOT turn an unknown user into Admin.
         */

        const normalized =
            role.toLowerCase();


        if (
            normalized === "admin" ||
            normalized === "administrator"
        ) {

            return "Administrator";

        }


        if (
            normalized === "employee" ||
            normalized === "staff"
        ) {

            return "Employee";

        }


        /*
         * If the backend has not supplied a role,
         * do not falsely display Administrator.
         */

        return role || "Employee";

    }


    /* =========================================================
       USER INITIALS
       ========================================================= */

    function getInitials(name) {

        const value =
            safeString(name);


        if (!value) {
            return "SF";
        }


        const parts =
            value
                .split(/\s+/)
                .filter(Boolean);


        if (
            parts.length === 1
        ) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();

        }


        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        )
            .toUpperCase();

    }


    /* =========================================================
       UPDATE USER UI
       ========================================================= */

    function updateUserUI() {

        const user =
            getCurrentUser();


        if (!user) {
            return null;
        }


        const name =
            getUserName(user);


        const role =
            getUserRole(user);


        const initials =
            getInitials(name);


        /*
         * -----------------------------------------------------
         * Generic data attributes
         * -----------------------------------------------------
         */

        $$("[data-user-name]").forEach(
            element => {

                element.textContent =
                    name;

            }
        );


        $$("[data-user-role]").forEach(
            element => {

                element.textContent =
                    role;

            }
        );


        $$("[data-user-initials]").forEach(
            element => {

                element.textContent =
                    initials;

            }
        );


        /*
         * -----------------------------------------------------
         * Dashboard user area
         * -----------------------------------------------------
         */

        $$(".header-user-info strong")
            .forEach(
                element => {

                    element.textContent =
                        name;

                }
            );


        $$(".header-user-info span")
            .forEach(
                element => {

                    element.textContent =
                        role;

                }
            );


        /*
         * -----------------------------------------------------
         * Sidebar mini-user
         * -----------------------------------------------------
         */

        $$(".mini-user-info strong")
            .forEach(
                element => {

                    element.textContent =
                        name;

                }
            );


        $$(".mini-user-info span")
            .forEach(
                element => {

                    element.textContent =
                        role;

                }
            );


        /*
         * -----------------------------------------------------
         * Dashboard / module avatars
         * -----------------------------------------------------
         */

        $$(".header-user .avatar")
            .forEach(
                element => {

                    element.textContent =
                        initials;

                    element.setAttribute(
                        "aria-label",
                        `${name} profile`
                    );

                }
            );


        $$(".mini-user .avatar")
            .forEach(
                element => {

                    element.textContent =
                        initials;

                    element.setAttribute(
                        "aria-label",
                        `${name} profile`
                    );

                }
            );


        /*
         * -----------------------------------------------------
         * Generic avatar
         * -----------------------------------------------------
         */

        $$("[data-user-avatar]")
            .forEach(
                element => {

                    element.textContent =
                        initials;

                }
            );


        return {
            user,
            name,
            role,
            initials
        };

    }


    /*
     * Run once immediately.
     */

    updateUserUI();


    /*
     * Run again shortly after other authentication
     * controllers have initialized.
     */

    window.setTimeout(
        updateUserUI,
        100
    );


    window.setTimeout(
        updateUserUI,
        500
    );


    /* =========================================================
       SIDEBAR ELEMENTS
       ========================================================= */

    const sfSidebar =
        $(".sf-side");


    const dashboardSidebar =
        $(".sidebar");


    const sidebar =
        sfSidebar ||
        dashboardSidebar;


    const menuToggle =
        $("[data-menu]") ||
        $(".mobile-menu");


    const sidebarOverlay =
        $("#sidebarOverlay") ||
        $(".sidebar-overlay");


    /* =========================================================
       SIDEBAR OPEN STATE
       ========================================================= */

    function isDashboardSidebar() {

        return Boolean(
            dashboardSidebar &&
            !sfSidebar
        );

    }


    function openMenu() {

        /*
         * Module pages.
         */

        if (sfSidebar) {

            document.body.classList.add(
                "sf-menu-open"
            );

            sfSidebar.classList.add(
                "open"
            );

            sfSidebar.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        /*
         * Dashboard pages.
         */

        if (dashboardSidebar) {

            document.body.classList.add(
                "sidebar-open"
            );

            dashboardSidebar.classList.add(
                "open"
            );

            dashboardSidebar.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        /*
         * Overlay.
         */

        if (sidebarOverlay) {

            sidebarOverlay.classList.add(
                "show"
            );

            sidebarOverlay.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        if (menuToggle) {

            menuToggle.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    function closeMenu() {

        /*
         * Module pages.
         */

        document.body.classList.remove(
            "sf-menu-open"
        );


        if (sfSidebar) {

            sfSidebar.classList.remove(
                "open"
            );

            if (window.innerWidth <= 900) {

                sfSidebar.setAttribute(
                    "aria-hidden",
                    "true"
                );

            } else {

                sfSidebar.setAttribute(
                    "aria-hidden",
                    "false"
                );

            }

        }


        /*
         * Dashboard pages.
         */

        document.body.classList.remove(
            "sidebar-open"
        );


        if (dashboardSidebar) {

            dashboardSidebar.classList.remove(
                "open"
            );

            if (window.innerWidth <= 900) {

                dashboardSidebar.setAttribute(
                    "aria-hidden",
                    "true"
                );

            } else {

                dashboardSidebar.setAttribute(
                    "aria-hidden",
                    "false"
                );

            }

        }


        /*
         * Overlay.
         */

        if (sidebarOverlay) {

            sidebarOverlay.classList.remove(
                "show"
            );

            sidebarOverlay.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        if (menuToggle) {

            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    function toggleMenu() {

        const currentlyOpen =
            document.body.classList.contains(
                "sf-menu-open"
            ) ||
            document.body.classList.contains(
                "sidebar-open"
            );


        if (currentlyOpen) {

            closeMenu();

        } else {

            openMenu();

        }

    }


    /* =========================================================
       INITIAL SIDEBAR STATE
       ========================================================= */

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        menuToggle.setAttribute(
            "aria-label",
            "Toggle navigation menu"
        );

    }


    if (sidebar) {

        if (window.innerWidth <= 900) {

            sidebar.setAttribute(
                "aria-hidden",
                "true"
            );

        } else {

            sidebar.setAttribute(
                "aria-hidden",
                "false"
            );

        }

    }


    /* =========================================================
       MENU BUTTON
       ========================================================= */

    if (menuToggle) {

        menuToggle.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                toggleMenu();

            }
        );

    }


    /* =========================================================
       SIDEBAR OVERLAY
       ========================================================= */

    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeMenu();

            }
        );

    }


    /* =========================================================
       ACTIVE NAVIGATION
       ========================================================= */

    function setupActiveNavigation() {

        const navLinks = [

            ...$$(".sf-side a"),

            ...$$(".sidebar-nav a")

        ];


        if (!navLinks.length) {
            return;
        }


        const currentPath =
            window.location.pathname;


        let currentPage =
            currentPath
                .split("/")
                .pop()
                .toLowerCase();


        if (!currentPage) {
            currentPage = "index.html";
        }


        navLinks.forEach(
            link => {

                const href =
                    link.getAttribute(
                        "href"
                    ) || "";


                /*
                 * Ignore:
                 * - #
                 * - javascript:
                 * - external URLs
                 */

                if (
                    !href ||
                    href === "#" ||
                    href.startsWith(
                        "javascript:"
                    ) ||
                    href.startsWith(
                        "http://"
                    ) ||
                    href.startsWith(
                        "https://"
                    )
                ) {

                    return;

                }


                const linkPage =
                    href
                        .split("/")
                        .pop()
                        .split("?")[0]
                        .split("#")[0]
                        .toLowerCase();


                if (
                    linkPage &&
                    linkPage ===
                        currentPage
                ) {

                    link.classList.add(
                        "active"
                    );

                    link.setAttribute(
                        "aria-current",
                        "page"
                    );

                }

            }
        );


        /*
         * Close mobile menu after navigation.
         */

        navLinks.forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <= 900
                        ) {

                            closeMenu();

                        }

                    }
                );

            }
        );

    }


    setupActiveNavigation();


    /* =========================================================
       OUTSIDE CLICK
       ========================================================= */

    document.addEventListener(
        "click",
        event => {

            const mobileOpen =
                document.body.classList.contains(
                    "sf-menu-open"
                ) ||
                document.body.classList.contains(
                    "sidebar-open"
                );


            if (!mobileOpen) {
                return;
            }


            const clickedSidebar =
                sidebar &&
                sidebar.contains(
                    event.target
                );


            const clickedToggle =
                menuToggle &&
                menuToggle.contains(
                    event.target
                );


            const clickedOverlay =
                sidebarOverlay &&
                sidebarOverlay.contains(
                    event.target
                );


            if (
                !clickedSidebar &&
                !clickedToggle &&
                !clickedOverlay
            ) {

                closeMenu();

            }

        }
    );


    /* =========================================================
       ESCAPE KEY
       ========================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeMenu();


            /*
             * Close dashboard notification panel.
             */

            $$(".notification-panel.show")
                .forEach(
                    panel => {

                        panel.classList.remove(
                            "show"
                        );

                    }
                );


            /*
             * Close generic notification panels.
             */

            $$(".sf-notification-panel.show")
                .forEach(
                    panel => {

                        panel.classList.remove(
                            "show"
                        );

                    }
                );

        }
    );


    /* =========================================================
       LOGOUT
       ========================================================= */

    $$("[data-logout]").forEach(
        button => {

            /*
             * Avoid attaching duplicate handlers.
             */

            if (
                button.dataset.logoutBound ===
                "true"
            ) {
                return;
            }


            button.dataset.logoutBound =
                "true";


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();


                    if (
                        button.dataset.loggingOut ===
                        "true"
                    ) {
                        return;
                    }


                    button.dataset.loggingOut =
                        "true";


                    button.disabled =
                        true;


                    const originalHTML =
                        button.innerHTML;


                    button.innerHTML = `
                        <span
                            class="sf-btn-spinner"
                            aria-hidden="true"
                        ></span>

                        <span>
                            Signing out...
                        </span>
                    `;


                    try {

                        /*
                         * Preferred central auth controller.
                         */

                        if (
                            window.StockFlowAuth &&
                            typeof window.StockFlowAuth.logout ===
                                "function"
                        ) {

                            await window.StockFlowAuth.logout();

                        }

                        /*
                         * Fallback to API.
                         */

                        else if (
                            window.StockFlowAPI &&
                            typeof window.StockFlowAPI.logout ===
                                "function"
                        ) {

                            await window.StockFlowAPI.logout();

                        }


                        /*
                         * Clear known local session data.
                         *
                         * This is intentionally only cleanup.
                         * It does not perform authentication.
                         */

                        try {

                            sessionStorage.removeItem(
                                "STOCKFLOW_SESSION"
                            );

                            sessionStorage.removeItem(
                                "STOCKFLOW_USER"
                            );

                        } catch (_) {}


                        try {

                            localStorage.removeItem(
                                "STOCKFLOW_USER"
                            );

                        } catch (_) {}


                        /*
                         * Go back to login.
                         */

                        const config =
                            window.STOCKFLOW_CONFIG ||
                            window.CONFIG ||
                            {};


                        const routes =
                            config.ROUTES ||
                            {};


                        const loginPage =
                            routes.login ||
                            routes.LOGIN ||
                            "index.html";


                        window.location.replace(
                            loginPage
                        );

                    } catch (error) {

                        console.error(
                            "STOCKFLOW logout failed:",
                            error
                        );


                        button.disabled =
                            false;


                        button.dataset.loggingOut =
                            "false";


                        button.innerHTML =
                            originalHTML;


                        showToast(
                            "Unable to sign out. Please try again.",
                            "error"
                        );

                    }

                }
            );

        }
    );


    /* =========================================================
       NETWORK STATUS
       ========================================================= */

    function updateNetworkStatus() {

        const online =
            navigator.onLine;


        document.body.classList.toggle(
            "sf-offline",
            !online
        );


        document.body.classList.toggle(
            "sf-online",
            online
        );


        $$("[data-network-status]")
            .forEach(
                element => {

                    element.textContent =
                        online
                            ? "Online"
                            : "Offline";


                    element.classList.toggle(
                        "online",
                        online
                    );


                    element.classList.toggle(
                        "offline",
                        !online
                    );

                }
            );


        /*
         * Dashboard connection card.
         *
         * Only update the connection state.
         * Do NOT overwrite the user's role.
         */

        const connectionStatus =
            $("#connectionStatus");


        if (connectionStatus) {

            connectionStatus.textContent =
                online
                    ? "Connected"
                    : "Offline";


            connectionStatus.classList.toggle(
                "online",
                online
            );


            connectionStatus.classList.toggle(
                "offline",
                !online
            );

        }


        const footerStatus =
            $("#footerSystemStatus");


        if (footerStatus) {

            footerStatus.textContent =
                online
                    ? "Online"
                    : "Offline";

        }

    }


    updateNetworkStatus();


    window.addEventListener(
        "online",
        () => {

            updateNetworkStatus();


            showToast(
                "Connection restored.",
                "success"
            );

        }
    );


    window.addEventListener(
        "offline",
        () => {

            updateNetworkStatus();


            showToast(
                "You are currently offline.",
                "warning"
            );

        }
    );


    /* =========================================================
       TOAST CONTAINER
       ========================================================= */

    function createToastContainer() {

        let container =
            document.getElementById(
                "sfToastContainer"
            );


        if (container) {
            return container;
        }


        container =
            document.createElement(
                "div"
            );


        container.id =
            "sfToastContainer";


        container.className =
            "sf-toast-container";


        container.setAttribute(
            "aria-live",
            "polite"
        );


        container.setAttribute(
            "aria-atomic",
            "true"
        );


        document.body.appendChild(
            container
        );


        return container;

    }


    /* =========================================================
       SHOW TOAST
       ========================================================= */

    function showToast(
        message,
        type = "info",
        duration = 4000
    ) {

        if (!message) {
            return;
        }


        const container =
            createToastContainer();


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `sf-toast sf-toast-${type}`;


        const icons = {

            success: "✓",

            error: "!",

            warning: "⚠",

            info: "i"

        };


        const icon =
            icons[type] ||
            icons.info;


        toast.innerHTML = `

            <div
                class="sf-toast-icon"
                aria-hidden="true"
            >
                ${icon}
            </div>

            <div class="sf-toast-message">
                ${escapeHTML(message)}
            </div>

            <button
                type="button"
                class="sf-toast-close"
                aria-label="Close notification"
            >
                ×
            </button>

        `;


        container.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    "show"
                );

            }
        );


        let closed =
            false;


        const closeToast = () => {

            if (closed) {
                return;
            }


            closed = true;


            toast.classList.remove(
                "show"
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        };


        const closeButton =
            $(".sf-toast-close", toast);


        closeButton?.addEventListener(
            "click",
            closeToast
        );


        if (
            Number(duration) > 0
        ) {

            setTimeout(
                closeToast,
                Number(duration)
            );

        }

    }


    /* =========================================================
       PAGE LOADING
       ========================================================= */

    const pageLoader =
        $("[data-page-loader]");


    if (pageLoader) {

        window.addEventListener(
            "load",
            () => {

                pageLoader.classList.add(
                    "loaded"
                );


                setTimeout(
                    () => {

                        pageLoader.remove();

                    },
                    300
                );

            }
        );

    }


    /* =========================================================
       BUTTON LOADING
       ========================================================= */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-loading-button]"
                );


            if (!button) {
                return;
            }


            if (
                button.dataset.loading ===
                "true"
            ) {

                event.preventDefault();

                return;

            }


            button.dataset.loading =
                "true";


            button.classList.add(
                "is-loading"
            );


            button.setAttribute(
                "aria-busy",
                "true"
            );

        }
    );


    /* =========================================================
       SMOOTH SCROLL
       ========================================================= */

    $$('a[href^="#"]').forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    const targetID =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        !targetID ||
                        targetID === "#"
                    ) {
                        return;
                    }


                    /*
                     * Do not interfere with
                     * authentication hash routing.
                     */

                    if (
                        targetID === "#login" ||
                        targetID === "#register"
                    ) {
                        return;
                    }


                    let target;


                    try {

                        target =
                            document.querySelector(
                                targetID
                            );

                    } catch (_) {

                        return;

                    }


                    if (!target) {
                        return;
                    }


                    event.preventDefault();


                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }
            );

        }
    );


    /* =========================================================
       TABLE ACCESSIBILITY
       ========================================================= */

    $$(".sf-table-wrap").forEach(
        wrapper => {

            const table =
                $("table", wrapper);


            if (!table) {
                return;
            }


            wrapper.setAttribute(
                "tabindex",
                "0"
            );


            wrapper.setAttribute(
                "role",
                "region"
            );


            if (
                !wrapper.getAttribute(
                    "aria-label"
                )
            ) {

                wrapper.setAttribute(
                    "aria-label",
                    "Scrollable data table"
                );

            }

        }
    );


    /* =========================================================
       RESPONSIVE SIDEBAR
       ========================================================= */

    function handleResponsiveSidebar() {

        if (!sidebar) {
            return;
        }


        if (
            window.innerWidth > 900
        ) {

            closeMenu();


            sidebar.setAttribute(
                "aria-hidden",
                "false"
            );

        }

        else if (
            !document.body.classList.contains(
                "sf-menu-open"
            ) &&
            !document.body.classList.contains(
                "sidebar-open"
            )
        ) {

            sidebar.setAttribute(
                "aria-hidden",
                "true"
            );

        }

    }


    handleResponsiveSidebar();


    /* =========================================================
       RESIZE HANDLER
       ========================================================= */

    let resizeTimer;


    window.addEventListener(
        "resize",
        () => {

            document.body.classList.add(
                "sf-resizing"
            );


            clearTimeout(
                resizeTimer
            );


            resizeTimer =
                setTimeout(
                    () => {

                        document.body.classList.remove(
                            "sf-resizing"
                        );


                        handleResponsiveSidebar();

                    },
                    150
                );

        }
    );


    /* =========================================================
       USER UI REFRESH EVENT
       ========================================================= */

    window.addEventListener(
        "stockflow:user-updated",
        () => {

            updateUserUI();

        }
    );


    /* =========================================================
       PUBLIC STOCKFLOW UI API
       ========================================================= */

    window.StockFlowUI = {

        openMenu,

        closeMenu,

        toggleMenu,

        showToast,

        updateNetworkStatus,

        updateUserUI,

        getCurrentUser,

        getUserName,

        getUserRole,

        escapeHTML

    };


    /* =========================================================
       READY
       ========================================================= */

    document.body.classList.add(
        "sf-ui-ready"
    );


    console.log(
        "%cSTOCKFLOW UI READY",
        "font-weight:bold;"
    );

});
