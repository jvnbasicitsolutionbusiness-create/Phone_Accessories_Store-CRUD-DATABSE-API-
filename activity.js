/* =========================================================
   STOCKFLOW — ACTIVITY LOG MODULE
   Loads and displays system activity records
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        activities: [],
        loading: false
    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const escapeHTML = (value) => {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };


    const getValue = (item, ...keys) => {

        for (const key of keys) {

            if (
                item &&
                item[key] !== undefined &&
                item[key] !== null &&
                item[key] !== ""
            ) {
                return item[key];
            }
        }

        return "";
    };


    /* =====================================================
       DATE FORMAT
    ===================================================== */

    const formatDate = (value) => {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHTML(String(value));
        }

        return date.toLocaleDateString(
            "en-PH",
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        );
    };


    const formatTime = (value) => {

        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleTimeString(
            "en-PH",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    };


    /* =====================================================
       EXTRACT API DATA
    ===================================================== */

    const extractActivities = (response) => {

        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.activities)) {
            return response.activities;
        }

        if (Array.isArray(response.activity)) {
            return response.activity;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response.rows)) {
            return response.rows;
        }

        return [];
    };


    /* =====================================================
       GET ACTIVITY FIELDS
    ===================================================== */

    const getActivityDate = (activity) => {

        return getValue(
            activity,
            "DATE",
            "date",
            "CREATED_AT",
            "createdAt",
            "created"
        );
    };


    const getActivityAction = (activity) => {

        return getValue(
            activity,
            "ACTION",
            "action",
            "TYPE",
            "type"
        ) || "SYSTEM ACTION";
    };


    const getActivityModule = (activity) => {

        return getValue(
            activity,
            "MODULE",
            "module"
        ) || "SYSTEM";
    };


    const getActivityReference = (activity) => {

        return getValue(
            activity,
            "REFERENCE",
            "reference",
            "REF",
            "ref"
        ) || "—";
    };


    const getActivityUser = (activity) => {

        return getValue(
            activity,
            "USER",
            "user",
            "USERNAME",
            "username",
            "EMAIL",
            "email"
        ) || "System";
    };


    const getActivityDetails = (activity) => {

        return getValue(
            activity,
            "DETAILS",
            "details",
            "DESCRIPTION",
            "description"
        ) || "—";
    };


    /* =====================================================
       USER INITIALS
    ===================================================== */

    const getInitials = (name) => {

        const value =
            String(name || "System").trim();

        const parts =
            value
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2);

        const initials =
            parts
                .map(
                    part =>
                        part.charAt(0).toUpperCase()
                )
                .join("");

        return initials || "S";
    };


    /* =====================================================
       LOADING STATE
    ===================================================== */

    const showLoading = () => {

        const body = $("rows");

        if (!body) {
            return;
        }

        body.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    <span class="activity-loading">
                        <span class="activity-spinner"></span>
                        Loading activity records...
                    </span>
                </td>
            </tr>
        `;
    };


    /* =====================================================
       EMPTY STATE
    ===================================================== */

    const showEmpty = () => {

        const body = $("rows");

        if (!body) {
            return;
        }

        body.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    No activity records found.
                </td>
            </tr>
        `;
    };


    /* =====================================================
       ERROR STATE
    ===================================================== */

    const showError = (message) => {

        const body = $("rows");

        if (!body) {
            return;
        }

        body.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty activity-error"
                >
                    ${escapeHTML(
                        message ||
                        "Unable to load activity records."
                    )}
                </td>
            </tr>
        `;
    };


    /* =====================================================
       RENDER ACTIVITY
    ===================================================== */

    const renderActivities = () => {

        const body = $("rows");

        if (!body) {
            return;
        }

        if (!state.activities.length) {
            showEmpty();
            return;
        }

        body.innerHTML =
            state.activities
                .map(renderActivityRow)
                .join("");
    };


    const renderActivityRow = (activity) => {

        const date =
            getActivityDate(activity);

        const action =
            getActivityAction(activity);

        const module =
            getActivityModule(activity);

        const reference =
            getActivityReference(activity);

        const user =
            getActivityUser(activity);

        const details =
            getActivityDetails(activity);

        return `
            <tr>

                <td>
                    <div class="activity-date">

                        <strong>
                            ${formatDate(date)}
                        </strong>

                        <span>
                            ${escapeHTML(
                                formatTime(date)
                            )}
                        </span>

                    </div>
                </td>


                <td>
                    <span class="activity-action">
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
                    <div class="activity-user">

                        <div class="activity-user-avatar">
                            ${escapeHTML(
                                getInitials(user)
                            )}
                        </div>

                        <span class="activity-user-name">
                            ${escapeHTML(user)}
                        </span>

                    </div>
                </td>


                <td>
                    <div class="activity-details">
                        ${escapeHTML(details)}
                    </div>
                </td>

            </tr>
        `;
    };


    /* =====================================================
       LOAD ACTIVITY
    ===================================================== */

    const loadActivity = async () => {

        if (state.loading) {
            return;
        }

        state.loading = true;

        showLoading();

        try {

            if (
                !window.StockFlowAPI
            ) {
                throw new Error(
                    "StockFlow API is not available."
                );
            }


            /*
             * Expected API method:
             * StockFlowAPI.listActivity()
             */

            if (
                typeof window.StockFlowAPI.listActivity !==
                "function"
            ) {
                throw new Error(
                    "Activity Log API is not available."
                );
            }


            const response =
                await window.StockFlowAPI.listActivity();


            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to load activity records."
                );
            }


            state.activities =
                extractActivities(response);


            renderActivities();

        } catch (error) {

            console.error(
                "STOCKFLOW Activity Log error:",
                error
            );

            state.activities = [];

            showError(
                error.message ||
                "Unable to load activity records."
            );

        } finally {

            state.loading = false;
        }
    };


    /* =====================================================
       REFRESH
    ===================================================== */

    const setupRefresh = () => {

        const button = $("refresh");

        if (!button) {
            return;
        }

        button.addEventListener(
            "click",
            async () => {

                if (state.loading) {
                    return;
                }

                const originalText =
                    button.innerHTML;

                button.disabled = true;

                button.innerHTML =
                    "↻ Refreshing...";

                try {

                    await loadActivity();

                    showToast(
                        "Activity log refreshed.",
                        "success"
                    );

                } finally {

                    button.disabled = false;

                    button.innerHTML =
                        originalText;
                }
            }
        );
    };


    /* =====================================================
       TOAST
    ===================================================== */

    const showToast = (
        message,
        type = "success"
    ) => {

        let container =
            document.querySelector(
                ".activity-toast-container"
            );

        if (!container) {

            container =
                document.createElement("div");

            container.className =
                "activity-toast-container";

            document.body.appendChild(
                container
            );
        }


        const toast =
            document.createElement("div");

        toast.className =
            "activity-toast";

        toast.textContent =
            message || "";


        if (type === "error") {

            toast.style.color =
                "#b42318";

            toast.style.background =
                "#fff8f7";

            toast.style.borderColor =
                "#f1c7c2";
        }


        container.appendChild(toast);


        window.setTimeout(() => {

            toast.style.opacity = "0";

            toast.style.transform =
                "translateY(8px)";

            window.setTimeout(() => {
                toast.remove();
            }, 180);

        }, 2600);
    };


    /* =====================================================
       SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const sidebar =
            $("sidebar");

        const menuButton =
            $("menuButton");

        if (
            !sidebar ||
            !menuButton
        ) {
            return;
        }


        let overlay =
            document.querySelector(
                ".activity-sidebar-overlay"
            );


        if (!overlay) {

            overlay =
                document.createElement("div");

            overlay.className =
                "activity-sidebar-overlay";

            Object.assign(
                overlay.style,
                {
                    position: "fixed",
                    inset: "0",
                    background:
                        "rgba(8, 26, 51, 0.28)",
                    zIndex: "999",
                    display: "none"
                }
            );

            document.body.appendChild(
                overlay
            );
        }


        const closeSidebar = () => {

            sidebar.classList.remove(
                "is-open"
            );

            document.body.classList.remove(
                "activity-sidebar-open"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            overlay.style.display =
                "none";
        };


        const openSidebar = () => {

            sidebar.classList.add(
                "is-open"
            );

            document.body.classList.add(
                "activity-sidebar-open"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );

            overlay.style.display =
                "block";
        };


        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    sidebar.classList.contains(
                        "is-open"
                    );

                if (isOpen) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            }
        );


        overlay.addEventListener(
            "click",
            closeSidebar
        );


        sidebar
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );
            });


        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 850
                ) {
                    closeSidebar();
                }
            }
        );
    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication =
        async () => {

            if (
                !window.StockFlowAuth ||
                typeof window.StockFlowAuth.requireAuth !==
                "function"
            ) {
                return true;
            }

            try {

                const user =
                    await window.StockFlowAuth.requireAuth();

                return Boolean(user);

            } catch (error) {

                console.error(
                    "Activity authentication error:",
                    error
                );

                return false;
            }
        };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize = async () => {

        setupSidebar();

        setupRefresh();


        const authenticated =
            await initializeAuthentication();


        if (!authenticated) {
            return;
        }


        await loadActivity();
    };


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();
