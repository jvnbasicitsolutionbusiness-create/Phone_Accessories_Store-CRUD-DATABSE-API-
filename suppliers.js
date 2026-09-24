/* =========================================================
   STOCKFLOW — SUPPLIERS MODULE
   Supplier Management + CRUD
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        suppliers: [],

        editingId: null,

        currentUser: null,

        loading: false,

        saving: false,

        deleting: false,

        initialized: false

    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const escapeHTML = (value) => {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    };


    const getSupplierId = (
        supplier
    ) => {

        return (
            supplier?.ID ??
            supplier?.id ??
            supplier?.supplierId ??
            supplier?.supplier_id ??
            ""
        );

    };


    const getSupplierName = (
        supplier
    ) => {

        return (
            supplier?.NAME ??
            supplier?.name ??
            supplier?.supplierName ??
            ""
        );

    };


    const getContactPerson = (
        supplier
    ) => {

        return (
            supplier?.CONTACT_PERSON ??
            supplier?.contactPerson ??
            supplier?.contact_person ??
            ""
        );

    };


    const getPhone = (
        supplier
    ) => {

        return (
            supplier?.PHONE ??
            supplier?.phone ??
            ""
        );

    };


    const getEmail = (
        supplier
    ) => {

        return (
            supplier?.EMAIL ??
            supplier?.email ??
            ""
        );

    };


    const getAddress = (
        supplier
    ) => {

        return (
            supplier?.ADDRESS ??
            supplier?.address ??
            ""
        );

    };


    const getStatus = (
        supplier
    ) => {

        return String(
            supplier?.STATUS ??
            supplier?.status ??
            "ACTIVE"
        )
            .trim()
            .toUpperCase();

    };


    /* =====================================================
       SESSION USER
    ===================================================== */

    const getSessionUser = () => {

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

    };


    /* =====================================================
       USER HELPERS
    ===================================================== */

    const getUserName = (
        user
    ) => {

        return (
            user?.name ||
            user?.fullName ||
            user?.full_name ||
            user?.username ||
            user?.email ||
            user?.gmail ||
            "STOCKFLOW USER"
        );

    };


    const getUserRole = (
        user
    ) => {

        return (
            user?.role ||
            user?.position ||
            user?.accountStatus ||
            user?.account_status ||
            "Employee"
        );

    };


    const getUserIdentity = (
        user
    ) => {

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

    };


    const getInitials = (
        name
    ) => {

        const value =
            String(
                name || "SF"
            ).trim();


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
        ).toUpperCase();

    };


    /* =====================================================
       API RESPONSE NORMALIZATION
    ===================================================== */

    const extractSuppliers = (
        response
    ) => {

        if (!response) {
            return [];
        }


        if (Array.isArray(response)) {
            return response;
        }


        if (
            Array.isArray(
                response.suppliers
            )
        ) {
            return response.suppliers;
        }


        if (
            Array.isArray(
                response.data
            )
        ) {
            return response.data;
        }


        if (
            Array.isArray(
                response.rows
            )
        ) {
            return response.rows;
        }


        if (
            response.data &&
            Array.isArray(
                response.data.suppliers
            )
        ) {
            return response.data.suppliers;
        }


        return [];

    };


    /* =====================================================
       ALERT
    ===================================================== */

    const showAlert = (
        message,
        type = "success"
    ) => {

        const alert =
            $("alert");


        if (!alert) {
            return;
        }


        alert.textContent =
            message || "";


        alert.className =
            `sf-alert ${type} show`;


        window.clearTimeout(
            showAlert.timeout
        );


        showAlert.timeout =
            window.setTimeout(
                () => {

                    hideAlert();

                },
                4500
            );

    };


    const hideAlert = () => {

        const alert =
            $("alert");


        if (!alert) {
            return;
        }


        alert.textContent =
            "";


        alert.className =
            "sf-alert";

    };


    /* =====================================================
       USER INFORMATION
    ===================================================== */

    const populateUser = () => {

        try {

            let user =
                getSessionUser();


            /*
             * Compatibility fallback.
             *
             * This does NOT use requireAuth().
             */

            if (
                !user &&
                window.StockFlowAuth &&
                typeof
                window.StockFlowAuth.getUser ===
                    "function"
            ) {

                try {

                    user =
                        window.StockFlowAuth
                            .getUser();

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


            state.currentUser =
                user;


            const name =
                getUserName(user);


            const role =
                getUserRole(user);


            const initials =
                getInitials(name);


            /*
             * User names
             */

            const nameElements = [

                $("headerUserName"),

                $("sidebarUserName"),

                $("topbarUserName"),

                $("userName"),

                $("topUserName")

            ].filter(Boolean);


            nameElements.forEach(
                element => {

                    element.textContent =
                        name;

                }
            );


            /*
             * User roles
             */

            const roleElements = [

                $("headerUserRole"),

                $("sidebarUserRole"),

                $("topbarUserRole"),

                $("userRole"),

                $("topUserRole")

            ].filter(Boolean);


            roleElements.forEach(
                element => {

                    element.textContent =
                        role;

                }
            );


            /*
             * User avatars
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
                .forEach(
                    avatar => {

                        avatar.textContent =
                            initials;

                    }
                );


            /*
             * Optional email
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
                .forEach(
                    element => {

                        if (email) {

                            element.textContent =
                                email;

                        }

                    }
                );

        } catch (error) {

            console.warn(
                "Unable to populate user information:",
                error
            );

        }

    };


    /* =====================================================
       USER PROFILE LINKS
    ===================================================== */

    const setupUserProfileLinks = () => {

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


        elements.forEach(
            element => {

                /*
                 * Never turn logout into profile.
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

            }
        );


        /*
         * Fallback:
         * make direct name/avatar elements
         * clickable if the HTML does not
         * provide a user-profile wrapper.
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


        clickableIds.forEach(
            id => {

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

            }
        );

    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const clearStockFlowSession = () => {

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


        sessionKeys.forEach(
            key => {

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

            }
        );


        /*
         * Remove only legacy authentication
         * keys from localStorage.
         *
         * DO NOT remove:
         *
         * stockflow_settings
         *
         * because that contains the
         * selected application theme.
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


        localKeys.forEach(
            key => {

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

            }
        );

    };


    const setupLogout = () => {

        const logoutButton =
            $("logoutButton");


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
            async event => {

                event.preventDefault();


                if (
                    state.deleting ||
                    state.saving
                ) {

                    /*
                     * Logout is still allowed,
                     * but don't interrupt a form
                     * operation unexpectedly.
                     */

                }


                try {

                    logoutButton.disabled =
                        true;


                    logoutButton.innerHTML =
                        `
                        <span>↪</span>
                        <span>Signing out...</span>
                        `;


                    /*
                     * Use STOCKFLOW_SESSION as
                     * the actual application
                     * session source.
                     */

                    clearStockFlowSession();


                    setTimeout(
                        () => {

                            window.location.replace(
                                "./auth.html"
                            );

                        },
                        150
                    );

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

    };


    /* =====================================================
       SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const button =
            document.querySelector(
                "[data-menu]"
            );


        const sidebar =
            document.querySelector(
                ".sf-side"
            );


        if (
            !button ||
            !sidebar
        ) {

            return;

        }


        /*
         * Prevent duplicate overlays.
         */

        let overlay =
            document.querySelector(
                ".sf-mobile-overlay"
            );


        if (!overlay) {

            overlay =
                document.createElement(
                    "div"
                );


            overlay.className =
                "sf-mobile-overlay";


            document.body.appendChild(
                overlay
            );

        }


        const openMenu = () => {

            sidebar.classList.add(
                "open"
            );


            overlay.classList.add(
                "show"
            );


            document.body.style.overflow =
                "hidden";

        };


        const closeMenu = () => {

            sidebar.classList.remove(
                "open"
            );


            overlay.classList.remove(
                "show"
            );


            document.body.style.overflow =
                "";

        };


        if (
            button.dataset
                .stockflowMenuBound !==
            "true"
        ) {

            button.dataset
                .stockflowMenuBound =
                "true";


            button.addEventListener(
                "click",
                () => {

                    if (
                        sidebar.classList.contains(
                            "open"
                        )
                    ) {

                        closeMenu();

                    } else {

                        openMenu();

                    }

                }
            );

        }


        if (
            overlay.dataset
                .stockflowOverlayBound !==
            "true"
        ) {

            overlay.dataset
                .stockflowOverlayBound =
                "true";


            overlay.addEventListener(
                "click",
                closeMenu
            );

        }


        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    if (
                        link.dataset
                            .stockflowSidebarBound ===
                        "true"
                    ) {

                        return;

                    }


                    link.dataset
                        .stockflowSidebarBound =
                        "true";


                    link.addEventListener(
                        "click",
                        closeMenu
                    );

                }
            );


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

                        closeMenu();

                    }

                }
            );

        }

    };


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    const setupNotifications = () => {

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
                    button.dataset
                        .stockflowNotificationBound ===
                    "true"
                ) {

                    return;

                }


                button.dataset
                    .stockflowNotificationBound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const panel =
                            document.querySelector(
                                "#notificationPanel, .notification-panel, .sf-notification-panel"
                            );


                        if (panel) {

                            panel.hidden =
                                !panel.hidden;


                            return;

                        }


                        showAlert(
                            "No new notifications.",
                            "success"
                        );


                        window.setTimeout(
                            hideAlert,
                            2500
                        );

                    }
                );

            }
        );

    };


    /* =====================================================
       API AUTH REFRESH
    ===================================================== */

    const refreshSessionUser =
        async () => {

            const sessionUser =
                getSessionUser();


            if (!sessionUser) {
                return;
            }


            state.currentUser =
                sessionUser;


            const identity =
                getUserIdentity(
                    sessionUser
                );


            /*
             * Refresh the profile only if
             * the API exposes getUser().
             *
             * If it fails, KEEP the existing
             * session user.
             */

            if (
                identity &&
                window.StockFlowAPI &&
                typeof
                window.StockFlowAPI.getUser ===
                    "function"
            ) {

                try {

                    const freshUser =
                        await window.StockFlowAPI
                            .getUser(
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

        };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication =
        async () => {

            /*
             * PRIMARY AUTH SOURCE:
             *
             * STOCKFLOW_SESSION
             *
             * We intentionally do NOT call:
             *
             * StockFlowAuth.requireAuth()
             *
             * because that can conflict with the
             * current login/session architecture
             * and unexpectedly redirect the user.
             */

            const sessionUser =
                getSessionUser();


            if (sessionUser) {

                state.currentUser =
                    sessionUser;


                /*
                 * Optional user refresh.
                 *
                 * Failure does not log the user out.
                 */

                await refreshSessionUser();


                return true;

            }


            /*
             * Compatibility fallback only.
             */

            if (
                window.StockFlowAuth &&
                typeof
                window.StockFlowAuth.getUser ===
                    "function"
            ) {

                try {

                    const legacyUser =
                        window.StockFlowAuth
                            .getUser();


                    if (legacyUser) {

                        state.currentUser =
                            legacyUser;


                        populateUser();


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
             * No authenticated session.
             *
             * Redirect to LOGIN.
             *
             * Never redirect to dashboard.
             */

            console.warn(
                "STOCKFLOW: No active login session."
            );


            window.location.replace(
                "./auth.html"
            );


            return false;

        };


    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    const loadSuppliers =
        async () => {

            if (
                !window.StockFlowAPI ||
                typeof
                window.StockFlowAPI.listSuppliers !==
                    "function"
            ) {

                throw new Error(
                    "Supplier API is not available."
                );

            }


            state.loading =
                true;


            renderLoading();


            try {

                const response =
                    await window.StockFlowAPI
                        .listSuppliers();


                if (
                    response &&
                    response.success ===
                        false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to load suppliers."
                    );

                }


                state.suppliers =
                    extractSuppliers(
                        response
                    );


                renderSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow suppliers load error:",
                    error
                );


                renderError(
                    error.message ||
                    "Unable to load suppliers."
                );


                showAlert(
                    error.message ||
                    "Unable to load suppliers.",
                    "error"
                );


                throw error;


            } finally {

                state.loading =
                    false;

            }

        };


    /* =====================================================
       LOADING STATE
    ===================================================== */

    const renderLoading = () => {

        const rows =
            $("rows");


        if (!rows) {
            return;
        }


        rows.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="sf-empty"
                >

                    <span
                        class="sf-loading"
                    >

                        <span
                            class="sf-spinner"
                        ></span>

                        Loading suppliers...

                    </span>

                </td>

            </tr>

        `;

    };


    /* =====================================================
       ERROR STATE
    ===================================================== */

    const renderError = (
        message
    ) => {

        const rows =
            $("rows");


        if (!rows) {
            return;
        }


        rows.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="sf-empty"
                >

                    <strong>
                        Unable to load suppliers.
                    </strong>

                    <br>

                    <span>
                        ${escapeHTML(
                            message ||
                            "Please try again."
                        )}
                    </span>

                </td>

            </tr>

        `;

    };


    /* =====================================================
       RENDER SUPPLIERS
    ===================================================== */

    const renderSuppliers = () => {

        const rows =
            $("rows");


        if (!rows) {
            return;
        }


        if (
            !state.suppliers.length
        ) {

            rows.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="sf-empty"
                    >

                        No suppliers found.

                    </td>

                </tr>

            `;


            return;

        }


        rows.innerHTML =
            state.suppliers
                .map(
                    renderSupplierRow
                )
                .join("");


        bindRowActions();

    };


    /* =====================================================
       SUPPLIER ROW
    ===================================================== */

    const renderSupplierRow =
        (supplier) => {

            const id =
                getSupplierId(
                    supplier
                );


            const name =
                getSupplierName(
                    supplier
                ) ||
                "Unnamed Supplier";


            const contact =
                getContactPerson(
                    supplier
                ) ||
                "—";


            const phone =
                getPhone(
                    supplier
                ) ||
                "—";


            const email =
                getEmail(
                    supplier
                ) ||
                "—";


            const status =
                getStatus(
                    supplier
                );


            const statusClass =
                status === "ACTIVE"
                    ? "active"
                    : "inactive";


            return `

                <tr>

                    <td>

                        <strong>
                            ${escapeHTML(
                                name
                            )}
                        </strong>

                    </td>


                    <td>
                        ${escapeHTML(
                            contact
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            phone
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            email
                        )}
                    </td>


                    <td>

                        <span
                            class="sf-status ${statusClass}"
                        >

                            ${escapeHTML(
                                status
                            )}

                        </span>

                    </td>


                    <td>

                        <div
                            class="sf-actions"
                        >

                            <button
                                type="button"
                                class="sf-action"
                                data-action="edit"
                                data-id="${escapeHTML(
                                    id
                                )}"
                                title="Edit supplier"
                                aria-label="Edit ${escapeHTML(
                                    name
                                )}"
                            >
                                ✎
                            </button>


                            <button
                                type="button"
                                class="sf-action delete"
                                data-action="delete"
                                data-id="${escapeHTML(
                                    id
                                )}"
                                title="Delete supplier"
                                aria-label="Delete ${escapeHTML(
                                    name
                                )}"
                            >
                                ×
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        };


    /* =====================================================
       ROW ACTIONS
    ===================================================== */

    const bindRowActions = () => {

        document
            .querySelectorAll(
                '[data-action="edit"]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const supplier =
                                state.suppliers.find(
                                    item =>
                                        String(
                                            getSupplierId(
                                                item
                                            )
                                        ) ===
                                        String(
                                            button.dataset
                                                .id
                                        )
                                );


                            if (supplier) {

                                editSupplier(
                                    supplier
                                );

                            }

                        }
                    );

                }
            );


        document
            .querySelectorAll(
                '[data-action="delete"]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const supplier =
                                state.suppliers.find(
                                    item =>
                                        String(
                                            getSupplierId(
                                                item
                                            )
                                        ) ===
                                        String(
                                            button.dataset
                                                .id
                                        )
                                );


                            if (supplier) {

                                deleteSupplier(
                                    supplier
                                );

                            }

                        }
                    );

                }
            );

    };


    /* =====================================================
       EDIT SUPPLIER
    ===================================================== */

    const editSupplier =
        (supplier) => {

            state.editingId =
                String(
                    getSupplierId(
                        supplier
                    )
                );


            if ($("id")) {

                $("id").value =
                    getSupplierId(
                        supplier
                    );

            }


            if ($("name")) {

                $("name").value =
                    getSupplierName(
                        supplier
                    );

            }


            if ($("contactPerson")) {

                $("contactPerson").value =
                    getContactPerson(
                        supplier
                    );

            }


            if ($("phone")) {

                $("phone").value =
                    getPhone(
                        supplier
                    );

            }


            if ($("email")) {

                $("email").value =
                    getEmail(
                        supplier
                    );

            }


            if ($("address")) {

                $("address").value =
                    getAddress(
                        supplier
                    );

            }


            if ($("status")) {

                $("status").value =
                    getStatus(
                        supplier
                    );

            }


            const saveButton =
                $("saveButton");


            if (saveButton) {

                saveButton.textContent =
                    "Update Supplier";

            }


            document
                .querySelector(
                    ".sf-card form"
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


            $("name")?.focus();

        };


    /* =====================================================
       CLEAR FORM
    ===================================================== */

    const clearForm = () => {

        const form =
            $("supplierForm");


        if (!form) {
            return;
        }


        form.reset();


        if ($("id")) {

            $("id").value =
                "";

        }


        if ($("status")) {

            $("status").value =
                "ACTIVE";

        }


        state.editingId =
            null;


        const saveButton =
            $("saveButton");


        if (saveButton) {

            saveButton.textContent =
                "Save Supplier";

        }


        hideAlert();

    };


    /* =====================================================
       VALIDATION
    ===================================================== */

    const validateSupplier =
        () => {

            const name =
                $("name")
                    ?.value
                    .trim() ||
                "";


            const phone =
                $("phone")
                    ?.value
                    .trim() ||
                "";


            const email =
                $("email")
                    ?.value
                    .trim() ||
                "";


            if (!name) {

                showAlert(
                    "Supplier name is required.",
                    "error"
                );


                $("name")?.focus();


                return false;

            }


            if (
                name.length >
                100
            ) {

                showAlert(
                    "Supplier name cannot exceed 100 characters.",
                    "error"
                );


                $("name")?.focus();


                return false;

            }


            if (
                phone &&
                !/^[0-9+\-\s()]{7,20}$/
                    .test(phone)
            ) {

                showAlert(
                    "Please enter a valid phone number.",
                    "error"
                );


                $("phone")?.focus();


                return false;

            }


            if (
                email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(email)
            ) {

                showAlert(
                    "Please enter a valid email address.",
                    "error"
                );


                $("email")?.focus();


                return false;

            }


            return true;

        };


    /* =====================================================
       SAVE SUPPLIER
    ===================================================== */

    const saveSupplier =
        async event => {

            event.preventDefault();


            if (state.saving) {
                return;
            }


            if (
                !validateSupplier()
            ) {

                return;

            }


            if (
                !window.StockFlowAPI ||
                typeof
                window.StockFlowAPI
                    .saveSupplier !==
                    "function"
            ) {

                showAlert(
                    "Supplier save API is not available.",
                    "error"
                );


                return;

            }


            const payload = {

                id:
                    $("id")?.value ||
                    state.editingId ||
                    "",


                name:
                    $("name")
                        ?.value
                        .trim() ||
                    "",


                contactPerson:
                    $("contactPerson")
                        ?.value
                        .trim() ||
                    "",


                phone:
                    $("phone")
                        ?.value
                        .trim() ||
                    "",


                email:
                    $("email")
                        ?.value
                        .trim() ||
                    "",


                address:
                    $("address")
                        ?.value
                        .trim() ||
                    "",


                status:
                    $("status")
                        ?.value ||
                    "ACTIVE"

            };


            const wasEditing =
                Boolean(
                    state.editingId
                );


            state.saving =
                true;


            const button =
                $("saveButton");


            const originalText =
                wasEditing
                    ? "Update Supplier"
                    : "Save Supplier";


            if (button) {

                button.disabled =
                    true;


                button.innerHTML = `

                    <span class="sf-loading">

                        <span
                            class="sf-spinner"
                        ></span>

                        Saving...

                    </span>

                `;

            }


            hideAlert();


            try {

                /*
                 * Existing supplier API
                 * is intentionally preserved.
                 */

                const response =
                    await window.StockFlowAPI
                        .saveSupplier(
                            payload
                        );


                if (
                    response &&
                    response.success ===
                        false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to save supplier."
                    );

                }


                clearForm();


                showAlert(
                    response?.message ||
                    (
                        wasEditing
                            ? "Supplier updated successfully."
                            : "Supplier saved successfully."
                    ),
                    "success"
                );


                await loadSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow supplier save error:",
                    error
                );


                showAlert(
                    error.message ||
                    "Unable to save supplier.",
                    "error"
                );


            } finally {

                state.saving =
                    false;


                if (button) {

                    button.disabled =
                        false;


                    button.textContent =
                        originalText;

                }

            }

        };


    /* =====================================================
       DELETE SUPPLIER
    ===================================================== */

    const deleteSupplier =
        async supplier => {

            if (state.deleting) {
                return;
            }


            const id =
                getSupplierId(
                    supplier
                );


            const name =
                getSupplierName(
                    supplier
                ) ||
                "this supplier";


            if (!id) {

                showAlert(
                    "Supplier ID is missing.",
                    "error"
                );


                return;

            }


            const confirmed =
                window.confirm(
                    `Delete ${name}?\n\nThis action cannot be undone.`
                );


            if (!confirmed) {
                return;
            }


            if (
                !window.StockFlowAPI ||
                typeof
                window.StockFlowAPI
                    .deleteSupplier !==
                    "function"
            ) {

                showAlert(
                    "Supplier delete API is not available.",
                    "error"
                );


                return;

            }


            state.deleting =
                true;


            try {

                const response =
                    await window.StockFlowAPI
                        .deleteSupplier(
                            id
                        );


                if (
                    response &&
                    response.success ===
                        false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to delete supplier."
                    );

                }


                showAlert(
                    response?.message ||
                    `${name} deleted successfully.`,
                    "success"
                );


                await loadSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow supplier delete error:",
                    error
                );


                showAlert(
                    error.message ||
                    "Unable to delete supplier.",
                    "error"
                );


            } finally {

                state.deleting =
                    false;

            }

        };


    /* =====================================================
       REFRESH BUTTON
    ===================================================== */

    const setupRefresh = () => {

        const buttons = [

            $("refreshButton"),

            $("bottomRefreshButton"),

            $("supplierRefreshButton")

        ].filter(Boolean);


        buttons.forEach(
            button => {

                if (
                    button.dataset
                        .stockflowRefreshBound ===
                    "true"
                ) {

                    return;

                }


                button.dataset
                    .stockflowRefreshBound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        loadSuppliers()
                            .catch(
                                error => {

                                    console.error(
                                        "Supplier refresh error:",
                                        error
                                    );

                                }
                            );

                    }
                );

            }
        );

    };


    /* =====================================================
       EVENTS
    ===================================================== */

    const setupEvents = () => {

        const form =
            $("supplierForm");


        if (
            form &&
            form.dataset
                .stockflowFormBound !==
            "true"
        ) {

            form.dataset
                .stockflowFormBound =
                "true";


            form.addEventListener(
                "submit",
                saveSupplier
            );

        }


        const clearButton =
            $("clearButton");


        if (
            clearButton &&
            clearButton.dataset
                .stockflowClearBound !==
            "true"
        ) {

            clearButton.dataset
                .stockflowClearBound =
                "true";


            clearButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    clearForm();

                }
            );

        }

    };


    /* =====================================================
       SESSION CHANGE / VISIBILITY
    ===================================================== */

    const setupSessionRefresh = () => {

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

                }

            }
        );

    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize =
        async () => {

            if (
                state.initialized
            ) {

                return;

            }


            state.initialized =
                true;


            setupSidebar();

            setupEvents();

            setupRefresh();

            setupLogout();

            setupUserProfileLinks();

            setupNotifications();

            setupSessionRefresh();


            try {

                const authenticated =
                    await initializeAuthentication();


                if (!authenticated) {

                    return;

                }


                /*
                 * Refresh user UI after
                 * authentication.
                 */

                populateUser();

                setupUserProfileLinks();


                await loadSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow Suppliers initialization error:",
                    error
                );


                showAlert(
                    error.message ||
                    "Unable to initialize Suppliers.",
                    "error"
                );

            }

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
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();

    }

})();
