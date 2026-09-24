/* =========================================================
   STOCKFLOW — ACTIVITY LOG
   Global Session + User + Profile + Logout + Notifications
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        currentUser: null,
        activities: [],
        initialized: false,
        loading: false
    };


    /* =====================================================
       DOM
    ===================================================== */

    const rows =
        document.getElementById("rows");

    const refreshButton =
        document.getElementById("refresh");

    const activityCount =
        document.getElementById("activityCount");

    const sidebar =
        document.getElementById("sidebar");

    const menuButton =
        document.getElementById("menuButton");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    const logoutButton =
        document.getElementById("logoutButton");

    const notificationButton =
        document.getElementById("notificationButton");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const closeNotifications =
        document.getElementById("closeNotifications");

    const notificationBody =
        document.getElementById("notificationBody");


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function getInitials(name) {

        const value =
            String(name || "StockFlow User")
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


    function normalizeAction(action) {

        return String(action || "")
            .trim()
            .toLowerCase();

    }


    function actionClass(action) {

        const value =
            normalizeAction(action);


        if (
            value.includes("delete") ||
            value.includes("remove") ||
            value.includes("cancel")
        ) {

            return "is-danger";

        }


        if (
            value.includes("warning") ||
            value.includes("update") ||
            value.includes("edit")
        ) {

            return "is-warning";

        }


        if (
            value.includes("add") ||
            value.includes("create") ||
            value.includes("stock in") ||
            value.includes("login") ||
            value.includes("complete")
        ) {

            return "is-success";

        }


        return "";

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

            return escapeHTML(value);

        }


        return date.toLocaleString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    /* =====================================================
       SESSION
    ===================================================== */

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
                "STOCKFLOW: Unable to read session user.",
                error
            );

            return null;

        }

    }


    function getUserName(user) {

        return (
            user?.name ||
            user?.fullName ||
            user?.full_name ||
            user?.displayName ||
            user?.username ||
            user?.email ||
            user?.gmail ||
            "STOCKFLOW USER"
        );

    }


    function getUserRole(user) {

        return (
            user?.role ||
            user?.position ||
            user?.designation ||
            user?.accountStatus ||
            user?.account_status ||
            "Employee"
        );

    }


    function getUserIdentity(user) {

        return (
            user?.username ||
            user?.email ||
            user?.gmail ||
            user?.phone ||
            user?.employeeId ||
            user?.employee_id ||
            user?.id ||
            user?.userId ||
            ""
        );

    }


    /* =====================================================
       USER DISPLAY
    ===================================================== */

    function populateUser(userOverride = null) {

        let user =
            userOverride ||
            state.currentUser ||
            getSessionUser();


        if (!user) {

            try {

                if (
                    window.StockFlowAuth &&
                    typeof window.StockFlowAuth.getUser === "function"
                ) {

                    user =
                        window.StockFlowAuth.getUser();

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW legacy user lookup failed.",
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


        state.currentUser = user;


        const name =
            getUserName(user);


        const role =
            getUserRole(user);


        const initials =
            getInitials(name);


        const displayRole =
            String(role)
                .trim()
                .toLowerCase() === "admin"
                ? "Administrator"
                : role;


        /* ---------------------------------------------
           DATA ATTRIBUTES
        --------------------------------------------- */

        document
            .querySelectorAll(
                "[data-user-name]"
            )
            .forEach(element => {

                element.textContent =
                    name;

            });


        document
            .querySelectorAll(
                "[data-user-role]"
            )
            .forEach(element => {

                element.textContent =
                    displayRole;

            });


        document
            .querySelectorAll(
                "[data-user-initials]"
            )
            .forEach(element => {

                element.textContent =
                    initials;

            });


        /* ---------------------------------------------
           COMMON IDS
        --------------------------------------------- */

        [
            "headerUserName",
            "sidebarUserName",
            "topbarUserName",
            "userName",
            "topUserName"
        ]
            .forEach(id => {

                const element =
                    $(id);

                if (element) {
                    element.textContent =
                        name;
                }

            });


        [
            "headerUserRole",
            "sidebarUserRole",
            "topbarUserRole",
            "userRole",
            "topUserRole"
        ]
            .forEach(id => {

                const element =
                    $(id);

                if (element) {
                    element.textContent =
                        displayRole;
                }

            });


        [
            "headerUserAvatar",
            "sidebarUserAvatar",
            "topbarAvatar",
            "userAvatar"
        ]
            .forEach(id => {

                const element =
                    $(id);

                if (element) {
                    element.textContent =
                        initials;
                }

            });


        /* ---------------------------------------------
           COMMON AVATAR CLASSES
        --------------------------------------------- */

        document
            .querySelectorAll(
                [
                    ".sf-user-avatar",
                    ".sf-header-avatar",
                    ".sf-sidebar-avatar",
                    ".top-user-avatar",
                    ".sidebar-user-avatar"
                ].join(",")
            )
            .forEach(element => {

                element.textContent =
                    initials;

            });


        /* ---------------------------------------------
           EMAIL
        --------------------------------------------- */

        const email =
            user?.email ||
            user?.gmail ||
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

    }


    /* =====================================================
       REFRESH USER FROM BACKEND
    ===================================================== */

    async function refreshSessionUser() {

        const sessionUser =
            getSessionUser();


        if (!sessionUser) {

            populateUser();

            return;

        }


        state.currentUser =
            sessionUser;


        const identity =
            getUserIdentity(
                sessionUser
            );


        /*
         * IMPORTANT:
         * Failure to refresh the user does NOT
         * log the user out.
         */

        if (
            identity &&
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.getUser === "function"
        ) {

            try {

                const freshUser =
                    await window.StockFlowAPI.getUser(
                        identity
                    );


                if (freshUser) {

                    state.currentUser =
                        freshUser;

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW: Unable to refresh user profile. Keeping session user.",
                    error
                );

            }

        }


        populateUser();

    }


    /* =====================================================
       PROFILE LINK
    ===================================================== */

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


        document
            .querySelectorAll(
                selectors.join(",")
            )
            .forEach(element => {

                /*
                 * Never convert logout into profile.
                 */

                if (
                    element.id ===
                    "logoutButton" ||

                    element.closest(
                        "#logoutButton"
                    ) ||

                    element.matches(
                        "[data-logout], .logout-button"
                    )
                ) {

                    return;

                }


                if (
                    element.dataset
                        .stockflowProfileBound ===
                    "true"
                ) {

                    return;

                }


                element.dataset
                    .stockflowProfileBound =
                    "true";


                if (
                    element.tagName
                        .toLowerCase() ===
                    "a"
                ) {

                    element.setAttribute(
                        "href",
                        "./profile.html"
                    );

                    return;

                }


                element.setAttribute(
                    "role",
                    "link"
                );


                element.setAttribute(
                    "tabindex",
                    "0"
                );


                element.style.cursor =
                    "pointer";


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
                            event.key ===
                                "Enter" ||
                            event.key ===
                                " "
                        ) {

                            event.preventDefault();

                            window.location.href =
                                "./profile.html";

                        }

                    }
                );

            });


        /*
         * Make user name/avatar itself clickable
         * even if the surrounding HTML has no
         * profile class.
         */

        [
            "headerUserName",
            "sidebarUserName",
            "topbarUserName",
            "userName",
            "topUserName",

            "headerUserAvatar",
            "sidebarUserAvatar",
            "topbarAvatar",
            "userAvatar"
        ]
            .forEach(id => {

                const element =
                    $(id);


                if (!element) {
                    return;
                }


                if (
                    element.dataset
                        .stockflowProfileBound ===
                    "true"
                ) {

                    return;

                }


                element.dataset
                    .stockflowProfileBound =
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


    /* =====================================================
       LOGOUT
    ===================================================== */

    function clearStockFlowSession() {

        /*
         * DO NOT CLEAR:
         * stockflow_settings
         *
         * Theme settings must remain saved.
         */

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

        if (!logoutButton) {
            return;
        }


        if (
            logoutButton.dataset
                .stockflowLogoutBound ===
            "true"
        ) {

            return;

        }


        logoutButton.dataset
            .stockflowLogoutBound =
            "true";


        logoutButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();


                const confirmed =
                    window.confirm(
                        "Are you sure you want to logout from STOCKFLOW?"
                    );


                if (!confirmed) {
                    return;
                }


                try {

                    logoutButton.disabled =
                        true;


                    logoutButton.innerHTML = `
                        <span>↪</span>
                        <span>Signing out...</span>
                    `;


                    clearStockFlowSession();


                    /*
                     * Small delay lets the UI update
                     * before navigation.
                     */

                    window.setTimeout(
                        () => {

                            window.location.replace(
                                "./auth.html"
                            );

                        },
                        150
                    );


                } catch (error) {

                    console.error(
                        "STOCKFLOW logout failed:",
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


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {

        if (!sidebar) {
            return;
        }


        sidebar.classList.add(
            "open"
        );


        sidebarOverlay?.classList.add(
            "open"
        );


        menuButton?.setAttribute(
            "aria-expanded",
            "true"
        );


        document.body.style.overflow =
            "hidden";

    }


    function closeSidebar() {

        if (!sidebar) {
            return;
        }


        sidebar.classList.remove(
            "open"
        );


        sidebarOverlay?.classList.remove(
            "open"
        );


        menuButton?.setAttribute(
            "aria-expanded",
            "false"
        );


        document.body.style.overflow =
            "";

    }


    function setupSidebar() {

        if (menuButton) {

            if (
                menuButton.dataset
                    .stockflowMenuBound !==
                "true"
            ) {

                menuButton.dataset
                    .stockflowMenuBound =
                    "true";


                menuButton.addEventListener(
                    "click",
                    () => {

                        if (
                            sidebar?.classList
                                .contains("open")
                        ) {

                            closeSidebar();

                        } else {

                            openSidebar();

                        }

                    }
                );

            }

        }


        if (sidebarOverlay) {

            if (
                sidebarOverlay.dataset
                    .stockflowOverlayBound !==
                "true"
            ) {

                sidebarOverlay.dataset
                    .stockflowOverlayBound =
                    "true";


                sidebarOverlay.addEventListener(
                    "click",
                    closeSidebar
                );

            }

        }


        document
            .querySelectorAll(
                ".sf-nav a"
            )
            .forEach(link => {

                if (
                    link.dataset
                        .stockflowNavBound ===
                    "true"
                ) {

                    return;

                }


                link.dataset
                    .stockflowNavBound =
                    "true";


                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <=
                            800
                        ) {

                            closeSidebar();

                        }

                    }
                );

            });


        if (
            document.body.dataset
                .stockflowEscapeBound !==
            "true"
        ) {

            document.body.dataset
                .stockflowEscapeBound =
                "true";


            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        closeSidebar();

                    }

                }
            );

        }

    }


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function openNotifications() {

        if (!notificationPanel) {
            return;
        }


        notificationPanel.hidden =
            false;


        notificationButton?.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    function closeNotificationPanel() {

        if (!notificationPanel) {
            return;
        }


        notificationPanel.hidden =
            true;


        notificationButton?.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    function setupNotifications() {

        if (notificationButton) {

            if (
                notificationButton.dataset
                    .stockflowNotificationBound !==
                "true"
            ) {

                notificationButton.dataset
                    .stockflowNotificationBound =
                    "true";


                notificationButton.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();


                        if (
                            notificationPanel?.hidden
                        ) {

                            openNotifications();

                        } else {

                            closeNotificationPanel();

                        }

                    }
                );

            }

        }


        if (closeNotifications) {

            if (
                closeNotifications.dataset
                    .stockflowNotificationCloseBound !==
                "true"
            ) {

                closeNotifications.dataset
                    .stockflowNotificationCloseBound =
                    "true";


                closeNotifications.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        closeNotificationPanel();

                    }
                );

            }

        }


        document.addEventListener(
            "click",
            event => {

                if (
                    !notificationPanel ||
                    notificationPanel.hidden
                ) {

                    return;

                }


                if (
                    !event.target.closest(
                        ".sf-notification"
                    )
                ) {

                    closeNotificationPanel();

                }

            }
        );

    }


    /* =====================================================
       NOTIFICATION CONTENT
    ===================================================== */

    function updateNotifications(
        activity
    ) {

        if (!notificationBody) {
            return;
        }


        const records =
            Array.isArray(activity)
                ? activity
                : [];


        if (!records.length) {

            notificationBody.innerHTML = `
                <div class="sf-notification-empty">
                    No recent activity notifications.
                </div>
            `;

            return;

        }


        const recent =
            records.slice(0, 5);


        notificationBody.innerHTML =
            recent
                .map(item => {

                    const action =
                        escapeHTML(
                            item.action ||
                            item.ACTION ||
                            "Activity"
                        );


                    const module =
                        escapeHTML(
                            item.module ||
                            item.MODULE ||
                            "System"
                        );


                    const date =
                        formatDate(
                            item.date ||
                            item.DATE ||
                            item.createdAt ||
                            item.created_at
                        );


                    return `
                        <div
                            style="
                                padding:12px 16px;
                                border-bottom:1px solid var(--sf-border, #edf1f5);
                            "
                        >

                            <strong
                                style="
                                    display:block;
                                    color:var(--sf-text, #1b2b43);
                                    font-size:11px;
                                "
                            >
                                ${action}
                            </strong>

                            <span
                                style="
                                    display:block;
                                    margin-top:3px;
                                    color:var(--sf-muted, #7b8ba1);
                                    font-size:10px;
                                "
                            >
                                ${module} · ${date}
                            </span>

                        </div>
                    `;

                })
                .join("");

    }


    /* =====================================================
       ACTIVITY RESPONSE
    ===================================================== */

    function normalizeActivityResponse(
        response
    ) {

        if (Array.isArray(response)) {
            return response;
        }


        if (
            response &&
            Array.isArray(response.data)
        ) {

            return response.data;

        }


        if (
            response &&
            Array.isArray(response.activities)
        ) {

            return response.activities;

        }


        if (
            response &&
            Array.isArray(response.records)
        ) {

            return response.records;

        }


        /*
         * Some APIs return:
         *
         * { success:true, result:[...] }
         */

        if (
            response &&
            Array.isArray(response.result)
        ) {

            return response.result;

        }


        /*
         * Some APIs return:
         *
         * { success:true, data:{ activities:[...] } }
         */

        if (
            response?.data &&
            Array.isArray(
                response.data.activities
            )
        ) {

            return response.data.activities;

        }


        return [];

    }


    /* =====================================================
       LOAD ACTIVITY
    ===================================================== */

    async function loadActivity() {

        if (!rows) {
            return;
        }


        if (state.loading) {
            return;
        }


        state.loading = true;


        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >

                    <div class="activity-loading">

                        <span class="activity-spinner"></span>

                        <span>
                            Loading activity records...
                        </span>

                    </div>

                </td>
            </tr>
        `;


        if (activityCount) {

            activityCount.textContent =
                "Loading records...";

        }


        try {

            if (
                !window.StockFlowAPI ||
                typeof window.StockFlowAPI.getActivity !==
                    "function"
            ) {

                throw new Error(
                    "StockFlowAPI.getActivity() is not available."
                );

            }


            const response =
                await window.StockFlowAPI.getActivity();


            const activities =
                normalizeActivityResponse(
                    response
                );


            state.activities =
                activities;


            renderActivity(
                activities
            );


            updateNotifications(
                activities
            );


        } catch (error) {

            console.error(
                "STOCKFLOW activity loading error:",
                error
            );


            rows.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="sf-empty"
                    >

                        Unable to load activity records.

                        <br>

                        <small>
                            ${escapeHTML(
                                error?.message ||
                                "Please try again."
                            )}
                        </small>

                    </td>
                </tr>
            `;


            if (activityCount) {

                activityCount.textContent =
                    "Activity records unavailable";

            }

        } finally {

            state.loading =
                false;

        }

    }


    /* =====================================================
       RENDER ACTIVITY
    ===================================================== */

    function renderActivity(
        activities
    ) {

        if (!rows) {
            return;
        }


        if (!activities.length) {

            rows.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="sf-empty"
                    >
                        No activity records found.
                    </td>
                </tr>
            `;


            if (activityCount) {

                activityCount.textContent =
                    "0 activity records";

            }


            return;

        }


        rows.innerHTML =
            activities
                .map(item => {

                    const date =
                        formatDate(
                            item.date ||
                            item.DATE ||
                            item.createdAt ||
                            item.created_at
                        );


                    const action =
                        item.action ||
                        item.ACTION ||
                        "—";


                    const module =
                        item.module ||
                        item.MODULE ||
                        "—";


                    const reference =
                        item.reference ||
                        item.REFERENCE ||
                        "—";


                    const user =
                        item.user ||
                        item.USER ||
                        "—";


                    const details =
                        item.details ||
                        item.DETAILS ||
                        "—";


                    const actionStyle =
                        actionClass(
                            action
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(date)}
                            </td>

                            <td>

                                <span
                                    class="activity-action ${actionStyle}"
                                >
                                    ${escapeHTML(action)}
                                </span>

                            </td>

                            <td>

                                <span
                                    class="activity-module"
                                >
                                    ${escapeHTML(module)}
                                </span>

                            </td>

                            <td>

                                <span
                                    class="activity-reference"
                                >
                                    ${escapeHTML(reference)}
                                </span>

                            </td>

                            <td>

                                <span
                                    class="activity-user"
                                >
                                    ${escapeHTML(user)}
                                </span>

                            </td>

                            <td>

                                <span
                                    class="activity-details"
                                >
                                    ${escapeHTML(details)}
                                </span>

                            </td>

                        </tr>
                    `;

                })
                .join("");


        if (activityCount) {

            activityCount.textContent =
                `${activities.length} ${
                    activities.length === 1
                        ? "activity record"
                        : "activity records"
                }`;

        }

    }


    /* =====================================================
       REFRESH
    ===================================================== */

    function setupRefresh() {

        if (!refreshButton) {
            return;
        }


        if (
            refreshButton.dataset
                .stockflowRefreshBound ===
            "true"
        ) {

            return;

        }


        refreshButton.dataset
            .stockflowRefreshBound =
            "true";


        refreshButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                if (state.loading) {
                    return;
                }


                const originalHTML =
                    `
                        <span>↻</span>
                        Refresh
                    `;


                refreshButton.disabled =
                    true;


                refreshButton.innerHTML =
                    `
                        <span>↻</span>
                        Refreshing...
                    `;


                try {

                    await loadActivity();

                } finally {

                    refreshButton.disabled =
                        false;


                    refreshButton.innerHTML =
                        originalHTML;

                }

            }
        );

    }


    /* =====================================================
       VISIBILITY SESSION REFRESH
    ===================================================== */

    function setupSessionRefresh() {

        if (
            document.body.dataset
                .stockflowVisibilityBound ===
            "true"
        ) {

            return;

        }


        document.body.dataset
            .stockflowVisibilityBound =
            "true";


        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.visibilityState !==
                    "visible"
                ) {

                    return;

                }


                const user =
                    getSessionUser();


                if (user) {

                    state.currentUser =
                        user;

                    populateUser();

                    setupUserProfileLinks();

                }

            }
        );

    }


    /* =====================================================
       AUTH INITIALIZATION
    ===================================================== */

    async function initializeAuthentication() {

        const sessionUser =
            getSessionUser();


        /*
         * Primary STOCKFLOW authentication.
         */

        if (sessionUser) {

            state.currentUser =
                sessionUser;


            populateUser();


            await refreshSessionUser();


            return true;

        }


        /*
         * Legacy compatibility only.
         *
         * IMPORTANT:
         * We do NOT call requireAuth()
         * because that can cause unwanted
         * redirects/logouts on module pages.
         */

        if (
            window.StockFlowAuth &&
            typeof window.StockFlowAuth.getUser ===
                "function"
        ) {

            try {

                const legacyUser =
                    window.StockFlowAuth.getUser();


                if (legacyUser) {

                    state.currentUser =
                        legacyUser;

                    populateUser(
                        legacyUser
                    );

                    return true;

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW legacy authentication lookup failed:",
                    error
                );

            }

        }


        /*
         * No session at all.
         */

        console.warn(
            "STOCKFLOW: No active login session."
        );


        window.location.replace(
            "./auth.html"
        );


        return false;

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initialize() {

        if (state.initialized) {
            return;
        }


        state.initialized =
            true;


        setupSidebar();

        setupLogout();

        setupNotifications();

        setupRefresh();

        setupSessionRefresh();


        const authenticated =
            await initializeAuthentication();


        if (!authenticated) {
            return;
        }


        populateUser();

        setupUserProfileLinks();


        await loadActivity();

    }


    /* =====================================================
       START
    ===================================================== */

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
