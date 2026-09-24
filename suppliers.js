/* =========================================================
   STOCKFLOW — SUPPLIERS MODULE
   Supplier Management + CRUD

   GOOGLE SHEET COLUMNS
   ---------------------------------------------------------
   A = S_Name
   B = contact person
   C = email address
   D = phone number
   E = address
   F = active/inactive

   FRONTEND MODEL
   ---------------------------------------------------------
   {
       id,
       name,
       contactPerson,
       email,
       phone,
       address,
       status
   }

   STATUS VALUES
   ---------------------------------------------------------
   Active
   Inactive

   IMPORTANT
   ---------------------------------------------------------
   Load ONLY this suppliers.js.

   Do not load another duplicate Suppliers IIFE at the
   same time, otherwise multiple module states/listeners
   can exist on the same page.
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
       DOM HELPER
    ===================================================== */

    const $ = id => {

        return document.getElementById(id);

    };


    /* =====================================================
       HTML ESCAPING
    ===================================================== */

    const escapeHTML = value => {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    };


    /* =====================================================
       SUPPLIER FIELD HELPERS
       Supports both Google Sheet/API naming styles.
    ===================================================== */

    const getSupplierId = supplier => {

        return (
            supplier?.ID ??
            supplier?.id ??
            supplier?.supplierId ??
            supplier?.supplier_id ??
            supplier?._id ??
            supplier?.rowId ??
            supplier?.row ??
            supplier?.rowNumber ??
            ""
        );

    };


    const getSupplierName = supplier => {

        return (
            supplier?.S_Name ??
            supplier?.s_name ??
            supplier?.["S Name"] ??
            supplier?.["s name"] ??
            supplier?.NAME ??
            supplier?.name ??
            supplier?.supplierName ??
            ""
        );

    };


    const getContactPerson = supplier => {

        return (
            supplier?.["contact person"] ??
            supplier?.contactPerson ??
            supplier?.CONTACT_PERSON ??
            supplier?.contact_person ??
            supplier?.CONTACT ??
            supplier?.contact ??
            ""
        );

    };


    const getEmail = supplier => {

        return (
            supplier?.["email address"] ??
            supplier?.emailAddress ??
            supplier?.EMAIL_ADDRESS ??
            supplier?.EMAIL ??
            supplier?.email ??
            ""
        );

    };


    const getPhone = supplier => {

        return (
            supplier?.["phone number"] ??
            supplier?.phoneNumber ??
            supplier?.PHONE_NUMBER ??
            supplier?.PHONE ??
            supplier?.phone ??
            ""
        );

    };


    const getAddress = supplier => {

        return (
            supplier?.address ??
            supplier?.ADDRESS ??
            supplier?.["supplier address"] ??
            supplier?.supplierAddress ??
            ""
        );

    };


    const getStatus = supplier => {

        const raw =
            supplier?.["active/inactive"] ??
            supplier?.activeInactive ??
            supplier?.ACTIVE_INACTIVE ??
            supplier?.STATUS ??
            supplier?.status ??
            "Active";

        const normalized =
            String(raw)
                .trim()
                .toLowerCase();

        return normalized === "inactive"
            ? "Inactive"
            : "Active";

    };


    /* =====================================================
       NORMALIZE SUPPLIER
    ===================================================== */

    const normalizeSupplier = supplier => {

        if (!supplier) {
            return null;
        }

        return {

            id:
                getSupplierId(supplier),

            name:
                String(
                    getSupplierName(supplier)
                ).trim(),

            contactPerson:
                String(
                    getContactPerson(supplier)
                ).trim(),

            email:
                String(
                    getEmail(supplier)
                ).trim(),

            phone:
                String(
                    getPhone(supplier)
                ).trim(),

            address:
                String(
                    getAddress(supplier)
                ).trim(),

            status:
                getStatus(supplier)

        };

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

    const getUserName = user => {

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


    const getUserRole = user => {

        return (
            user?.role ||
            user?.position ||
            user?.accountStatus ||
            user?.account_status ||
            "Employee"
        );

    };


    const getUserIdentity = user => {

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


    const getInitials = name => {

        const value =
            String(name || "SF").trim();

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

    };


    /* =====================================================
       API RESPONSE NORMALIZATION
    ===================================================== */

    const extractSuppliers = response => {

        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.suppliers)) {
            return response.suppliers;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response.rows)) {
            return response.rows;
        }

        if (
            response.data &&
            Array.isArray(response.data.suppliers)
        ) {

            return response.data.suppliers;

        }

        if (
            response.result &&
            Array.isArray(response.result)
        ) {

            return response.result;

        }

        if (
            response.result &&
            Array.isArray(response.result.suppliers)
        ) {

            return response.result.suppliers;

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

        const alert = $("alert");

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
                hideAlert,
                4500
            );

    };


    const hideAlert = () => {

        const alert = $("alert");

        if (!alert) {
            return;
        }

        alert.textContent = "";

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
             */

            if (
                !user &&
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.getUser ===
                    "function"
            ) {

                try {

                    user =
                        window.StockFlowAuth.getUser();

                } catch (error) {

                    console.warn(
                        "StockFlowAuth user lookup failed:",
                        error
                    );

                }

            }

            if (!user) {
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

            [
                "headerUserName",
                "sidebarUserName",
                "topbarUserName",
                "userName",
                "topUserName"
            ]
                .map($)
                .filter(Boolean)
                .forEach(element => {

                    element.textContent =
                        name;

                });

            [
                "headerUserRole",
                "sidebarUserRole",
                "topbarUserRole",
                "userRole",
                "topUserRole"
            ]
                .map($)
                .filter(Boolean)
                .forEach(element => {

                    element.textContent =
                        role;

                });

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

            const email =
                user.email ||
                user.gmail ||
                "";

            [
                "headerUserEmail",
                "sidebarUserEmail",
                "topbarUserEmail"
            ]
                .map($)
                .filter(Boolean)
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

        document
            .querySelectorAll(
                selectors.join(",")
            )
            .forEach(element => {

                /*
                 * Never convert logout into profile.
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
                    element.tagName.toLowerCase() ===
                    "a"
                ) {

                    element.href =
                        "./profile.html";

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

                const openProfile = () => {

                    window.location.href =
                        "./profile.html";

                };

                element.addEventListener(
                    "click",
                    openProfile
                );

                element.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {

                            event.preventDefault();

                            openProfile();

                        }

                    }
                );

            });

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

        sessionKeys.forEach(key => {

            try {

                sessionStorage.removeItem(
                    key
                );

            } catch (_) {}

        });


        /*
         * Do NOT delete application settings
         * from localStorage.
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

            } catch (_) {}

        });

    };


    const setupLogout = () => {

        const button =
            $("logoutButton");

        if (!button) {
            return;
        }

        if (
            button.dataset
                .stockflowLogoutBound ===
            "true"
        ) {

            return;

        }

        button.dataset
            .stockflowLogoutBound =
            "true";

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                button.disabled =
                    true;

                button.innerHTML = `
                    <span>↪</span>
                    <span>Signing out...</span>
                `;

                clearStockFlowSession();

                window.setTimeout(
                    () => {

                        window.location.replace(
                            "./auth.html"
                        );

                    },
                    150
                );

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

        if (!button || !sidebar) {
            return;
        }

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
            .forEach(link => {

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
                        event.key === "Escape"
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

        document
            .querySelectorAll(
                [
                    "#notificationButton",
                    "#notificationsButton",
                    ".notification-button",
                    ".sf-notification-button"
                ].join(",")
            )
            .forEach(button => {

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

                    }
                );

            });

    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication =
        async () => {

            const sessionUser =
                getSessionUser();

            if (sessionUser) {

                state.currentUser =
                    sessionUser;

                populateUser();

                return true;

            }

            /*
             * Compatibility fallback only.
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

                        populateUser();

                        return true;

                    }

                } catch (error) {

                    console.warn(
                        "Legacy authentication lookup failed:",
                        error
                    );

                }

            }

            /*
             * No session.
             */

            window.location.replace(
                "./auth.html"
            );

            return false;

        };


    /* =====================================================
       REFRESH SESSION USER
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
             * Optional API profile refresh.
             *
             * If unavailable/fails, keep the existing
             * session user.
             */

            if (
                identity &&
                window.StockFlowAPI &&
                typeof window.StockFlowAPI.getUser ===
                    "function"
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
                        "Unable to refresh user profile. Keeping session user.",
                        error
                    );

                }

            }

            populateUser();

        };


    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    const loadSuppliers =
        async () => {

            if (
                !window.StockFlowAPI ||
                typeof window.StockFlowAPI.listSuppliers !==
                    "function"
            ) {

                throw new Error(
                    "Supplier API is not available."
                );

            }

            state.loading = true;

            renderLoading();

            try {

                const response =
                    await window.StockFlowAPI
                        .listSuppliers();

                if (
                    response &&
                    response.success === false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to load suppliers."
                    );

                }

                state.suppliers =
                    extractSuppliers(
                        response
                    )
                    .map(normalizeSupplier)
                    .filter(Boolean);

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

                state.loading = false;

            }

        };


    /* =====================================================
       LOADING UI
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
                    colspan="7"
                    class="sf-empty"
                >

                    <span class="sf-loading">

                        <span class="sf-spinner"></span>

                        Loading suppliers...

                    </span>

                </td>

            </tr>

        `;

    };


    /* =====================================================
       ERROR UI
    ===================================================== */

    const renderError = message => {

        const rows =
            $("rows");

        if (!rows) {
            return;
        }

        rows.innerHTML = `

            <tr>

                <td
                    colspan="7"
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

        if (!state.suppliers.length) {

            rows.innerHTML = `

                <tr>

                    <td
                        colspan="7"
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
                .map(renderSupplierRow)
                .join("");

        bindRowActions();

    };


    /* =====================================================
       SUPPLIER ROW
    ===================================================== */

    const renderSupplierRow =
        supplier => {

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

            const email =
                getEmail(
                    supplier
                ) ||
                "—";

            const phone =
                getPhone(
                    supplier
                ) ||
                "—";

            const address =
                getAddress(
                    supplier
                ) ||
                "—";

            const status =
                getStatus(
                    supplier
                );

            const statusClass =
                status === "Active"
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
                            email
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            phone
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            address
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

                        <div class="sf-actions">

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
       FIND SUPPLIER
    ===================================================== */

    const findSupplierById = id => {

        return state.suppliers.find(
            supplier =>
                String(
                    getSupplierId(
                        supplier
                    )
                ) === String(id)
        );

    };


    /* =====================================================
       ROW ACTIONS
    ===================================================== */

    const bindRowActions = () => {

        document
            .querySelectorAll(
                '[data-action="edit"]'
            )
            .forEach(button => {

                button.onclick =
                    () => {

                        const supplier =
                            findSupplierById(
                                button.dataset.id
                            );

                        if (supplier) {

                            editSupplier(
                                supplier
                            );

                        }

                    };

            });


        document
            .querySelectorAll(
                '[data-action="delete"]'
            )
            .forEach(button => {

                button.onclick =
                    () => {

                        const supplier =
                            findSupplierById(
                                button.dataset.id
                            );

                        if (supplier) {

                            deleteSupplier(
                                supplier
                            );

                        }

                    };

            });

    };


    /* =====================================================
       EDIT SUPPLIER
    ===================================================== */

    const editSupplier = supplier => {

        const normalized =
            normalizeSupplier(
                supplier
            );

        if (!normalized) {
            return;
        }

        const id =
            getSupplierId(
                normalized
            );

        /*
         * Editing requires a row/id reference.
         */

        if (!id) {

            showAlert(
                "This supplier has no row/ID reference, so it cannot be edited.",
                "error"
            );

            return;

        }

        state.editingId =
            String(id);

        if ($("id")) {

            $("id").value =
                id;

        }

        if ($("name")) {

            $("name").value =
                normalized.name;

        }

        if ($("contactPerson")) {

            $("contactPerson").value =
                normalized.contactPerson;

        }

        if ($("email")) {

            $("email").value =
                normalized.email;

        }

        if ($("phone")) {

            $("phone").value =
                normalized.phone;

        }

        if ($("address")) {

            $("address").value =
                normalized.address;

        }

        if ($("status")) {

            $("status").value =
                normalized.status;

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
                "Active";

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

    const validateSupplier = () => {

        const name =
            $("name")
                ?.value
                .trim() ||
            "";

        const contact =
            $("contactPerson")
                ?.value
                .trim() ||
            "";

        const email =
            $("email")
                ?.value
                .trim() ||
            "";

        const phone =
            $("phone")
                ?.value
                .trim() ||
            "";

        const address =
            $("address")
                ?.value
                .trim() ||
            "";

        const status =
            $("status")
                ?.value ||
            "Active";


        if (!name) {

            showAlert(
                "Supplier name is required.",
                "error"
            );

            $("name")?.focus();

            return false;

        }


        if (name.length > 100) {

            showAlert(
                "Supplier name cannot exceed 100 characters.",
                "error"
            );

            $("name")?.focus();

            return false;

        }


        if (contact.length > 100) {

            showAlert(
                "Contact person cannot exceed 100 characters.",
                "error"
            );

            $("contactPerson")?.focus();

            return false;

        }


        if (email.length > 150) {

            showAlert(
                "Email address cannot exceed 150 characters.",
                "error"
            );

            $("email")?.focus();

            return false;

        }


        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email
            )
        ) {

            showAlert(
                "Please enter a valid email address.",
                "error"
            );

            $("email")?.focus();

            return false;

        }


        if (
            phone &&
            !/^[0-9+\-\s()]{7,20}$/.test(
                phone
            )
        ) {

            showAlert(
                "Please enter a valid phone number.",
                "error"
            );

            $("phone")?.focus();

            return false;

        }


        if (address.length > 300) {

            showAlert(
                "Address cannot exceed 300 characters.",
                "error"
            );

            $("address")?.focus();

            return false;

        }


        if (
            status !== "Active" &&
            status !== "Inactive"
        ) {

            showAlert(
                "Supplier status must be Active or Inactive.",
                "error"
            );

            $("status")?.focus();

            return false;

        }


        return true;

    };


    /* =====================================================
       BUILD SUPPLIER PAYLOAD
    ===================================================== */

    const getSupplierPayload = () => {

        const id =
            $("id")?.value ||
            state.editingId ||
            "";

        const payload = {

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

            email:
                $("email")
                    ?.value
                    .trim() ||
                "",

            phone:
                $("phone")
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
                    ?.value === "Inactive"
                    ? "Inactive"
                    : "Active"

        };

        /*
         * Only send ID when editing.
         */

        if (id) {

            payload.id =
                id;

        }

        return payload;

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

            if (!validateSupplier()) {
                return;
            }

            const wasEditing =
                Boolean(
                    state.editingId
                );

            const method =
                wasEditing
                    ? "updateSupplier"
                    : "createSupplier";

            if (
                !window.StockFlowAPI ||
                typeof window.StockFlowAPI[method] !==
                    "function"
            ) {

                showAlert(
                    wasEditing
                        ? "Supplier update API is not available."
                        : "Supplier create API is not available.",
                    "error"
                );

                return;

            }

            /*
             * When editing, an ID/row reference is required.
             */

            if (wasEditing) {

                const id =
                    $("id")?.value ||
                    state.editingId ||
                    "";

                if (!id) {

                    showAlert(
                        "Supplier row/ID reference is missing.",
                        "error"
                    );

                    return;

                }

            }

            const payload =
                getSupplierPayload();

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

                        <span class="sf-spinner"></span>

                        Saving...

                    </span>

                `;

            }

            hideAlert();

            try {

                /*
                 * IMPORTANT:
                 *
                 * createSupplier()
                 * and
                 * updateSupplier()
                 *
                 * are the supported API methods.
                 */

                const response =
                    await window.StockFlowAPI[method](
                        payload
                    );

                if (
                    response &&
                    response.success === false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to save supplier."
                    );

                }

                /*
                 * Clear form immediately after the
                 * API confirms the save.
                 */

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

                /*
                 * Reload separately.
                 *
                 * A reload failure must NOT convert
                 * a successful save into a failed save.
                 */

                try {

                    await loadSuppliers();

                } catch (reloadError) {

                    console.error(
                        "Supplier saved successfully, but list reload failed:",
                        reloadError
                    );

                }

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
                    "Supplier row/ID reference is missing.",
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
                typeof window.StockFlowAPI.deleteSupplier !==
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
                    response.success === false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to delete supplier."
                    );

                }

                /*
                 * If the deleted supplier was being edited,
                 * clear the form.
                 */

                if (
                    String(
                        state.editingId
                    ) ===
                    String(id)
                ) {

                    clearForm();

                }

                showAlert(
                    response?.message ||
                    `${name} deleted successfully.`,
                    "success"
                );

                /*
                 * Reload separately so a successful delete
                 * is not overwritten by a refresh failure.
                 */

                try {

                    await loadSuppliers();

                } catch (reloadError) {

                    console.error(
                        "Supplier deleted successfully, but list reload failed:",
                        reloadError
                    );

                }

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

        [
            $("refreshButton"),
            $("bottomRefreshButton"),
            $("supplierRefreshButton")
        ]
            .filter(Boolean)
            .forEach(button => {

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
                            .catch(error => {

                                console.error(
                                    "Supplier refresh error:",
                                    error
                                );

                            });

                    }
                );

            });

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
       SESSION VISIBILITY REFRESH
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

            if (state.initialized) {
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

                await refreshSessionUser();

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
