/* =========================================================
   STOCKFLOW — ACTIVITY LOG
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       DOM
    ===================================================== */

    const rows = document.getElementById("rows");
    const refreshButton = document.getElementById("refresh");
    const activityCount = document.getElementById("activityCount");

    const sidebar = document.getElementById("sidebar");
    const menuButton = document.getElementById("menuButton");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const logoutButton = document.getElementById("logoutButton");

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

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function getInitials(name) {

        const value = String(name || "StockFlow User")
            .trim();

        if (!value) {
            return "SF";
        }

        const parts = value
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

        const value = normalizeAction(action);

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

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
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
       USER DISPLAY
    ===================================================== */

    function populateUser() {

        let user = null;

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.getUser === "function"
            ) {
                user = window.StockFlowAuth.getUser();
            }

        } catch (error) {
            console.warn(
                "STOCKFLOW user data could not be loaded.",
                error
            );
        }


        if (!user) {

            try {

                const stored =
                    sessionStorage.getItem("stockflow_user");

                if (stored) {
                    user = JSON.parse(stored);
                }

            } catch (error) {
                console.warn(error);
            }

        }


        const name =
            user?.name ||
            user?.fullName ||
            user?.full_name ||
            user?.displayName ||
            "StockFlow User";


        const role =
            user?.role ||
            user?.position ||
            user?.designation ||
            "Employee";


        document
            .querySelectorAll("[data-user-name]")
            .forEach(element => {
                element.textContent = name;
            });


        document
            .querySelectorAll("[data-user-role]")
            .forEach(element => {
                element.textContent =
                    String(role).toLowerCase() === "admin"
                        ? "Administrator"
                        : "Employee";
            });


        const initials =
            getInitials(name);


        document
            .querySelectorAll("[data-user-initials]")
            .forEach(element => {
                element.textContent = initials;
            });

    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {

        if (!sidebar) {
            return;
        }

        sidebar.classList.add("open");

        sidebarOverlay?.classList.add("open");

        menuButton?.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    function closeSidebar() {

        if (!sidebar) {
            return;
        }

        sidebar.classList.remove("open");

        sidebarOverlay?.classList.remove("open");

        menuButton?.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    menuButton?.addEventListener(
        "click",
        () => {

            if (sidebar?.classList.contains("open")) {
                closeSidebar();
            } else {
                openSidebar();
            }

        }
    );


    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );


    document
        .querySelectorAll(".sf-nav a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <= 800
                    ) {
                        closeSidebar();
                    }

                }
            );

        });


    /* =====================================================
       LOGOUT
    ===================================================== */

    logoutButton?.addEventListener(
        "click",
        () => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to logout from STOCKFLOW?"
                );

            if (!confirmed) {
                return;
            }


            try {

                if (
                    window.StockFlowAuth &&
                    typeof window.StockFlowAuth.logout === "function"
                ) {

                    window.StockFlowAuth.logout();

                    return;
                }


                sessionStorage.removeItem(
                    "stockflow_token"
                );

                sessionStorage.removeItem(
                    "stockflow_user"
                );

                window.location.href =
                    "./auth.html";

            } catch (error) {

                console.error(
                    "STOCKFLOW logout failed:",
                    error
                );

                window.location.href =
                    "./auth.html";

            }

        }
    );


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function openNotifications() {

        if (!notificationPanel) {
            return;
        }

        notificationPanel.hidden = false;

        notificationButton?.setAttribute(
            "aria-expanded",
            "true"
        );

    }


    function closeNotificationPanel() {

        if (!notificationPanel) {
            return;
        }

        notificationPanel.hidden = true;

        notificationButton?.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    notificationButton?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (notificationPanel.hidden) {
                openNotifications();
            } else {
                closeNotificationPanel();
            }

        }
    );


    closeNotifications?.addEventListener(
        "click",
        closeNotificationPanel
    );


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


    /* =====================================================
       NOTIFICATION CONTENT
    ===================================================== */

    function updateNotifications(activity) {

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
                            item.createdAt
                        );

                    return `
                        <div
                            style="
                                padding:12px 16px;
                                border-bottom:1px solid #edf1f5;
                            "
                        >
                            <strong
                                style="
                                    display:block;
                                    color:#1b2b43;
                                    font-size:11px;
                                "
                            >
                                ${action}
                            </strong>

                            <span
                                style="
                                    display:block;
                                    margin-top:3px;
                                    color:#7b8ba1;
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
       ACTIVITY DATA
    ===================================================== */

    function normalizeActivityResponse(response) {

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

        return [];

    }


    async function loadActivity() {

        if (!rows) {
            return;
        }


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
                typeof window.StockFlowAPI.getActivity !== "function"
            ) {

                throw new Error(
                    "StockFlowAPI.getActivity() is not available."
                );

            }


            const response =
                await window.StockFlowAPI.getActivity();


            const activities =
                normalizeActivityResponse(response);


            renderActivity(activities);


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
                    </td>
                </tr>
            `;


            if (activityCount) {
                activityCount.textContent =
                    "Activity records unavailable";
            }

        }

    }


    /* =====================================================
       RENDER ACTIVITY
    ===================================================== */

    function renderActivity(activities) {

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
                        actionClass(action);


                    return `
                        <tr>

                            <td>
                                ${date}
                            </td>

                            <td>
                                <span
                                    class="activity-action ${actionStyle}"
                                >
                                    ${escapeHTML(action)}
                                </span>
                            </td>

                            <td>
                                <span class="activity-module">
                                    ${escapeHTML(module)}
                                </span>
                            </td>

                            <td>
                                <span class="activity-reference">
                                    ${escapeHTML(reference)}
                                </span>
                            </td>

                            <td>
                                <span class="activity-user">
                                    ${escapeHTML(user)}
                                </span>
                            </td>

                            <td>
                                <span class="activity-details">
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

    refreshButton?.addEventListener(
        "click",
        async () => {

            refreshButton.disabled = true;

            refreshButton.innerHTML = `
                <span>↻</span>
                Refreshing...
            `;


            try {
                await loadActivity();
            } finally {

                refreshButton.disabled = false;

                refreshButton.innerHTML = `
                    <span>↻</span>
                    Refresh
                `;

            }

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    populateUser();

    loadActivity();

})();
