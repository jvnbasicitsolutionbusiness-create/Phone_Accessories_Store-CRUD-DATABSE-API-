/* =========================================================
   STOCKFLOW — STOCK IN UI CONTROLLER
   =========================================================

   Handles:
   - Authenticated user detection
   - Sidebar user display
   - Clickable profile areas
   - Mobile sidebar
   - Navigation
   - Notifications
   - Logout
   - API connection status
   - Default stock-in date
   - Live stock-in preview
   - Optional activity/audit logging
   - Global theme compatibility

   NOTE:
   This file handles UI only.
   Actual Stock In database/API submission
   should remain inside stock-in.js.
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       INITIALIZATION GUARD
    ===================================================== */

    if (window.__stockFlowStockInUIInitialized) {
        return;
    }

    window.__stockFlowStockInUIInitialized = true;


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const SESSION_KEY =
        "STOCKFLOW_SESSION";


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
        "STOCKFLOW_TOKEN"
    ];


    /* =====================================================
       HELPER
    ===================================================== */

    const $ = (id) => {
        return document.getElementById(id);
    };


    /* =====================================================
       SESSION
    ===================================================== */

    const readSession = () => {

        try {

            const raw =
                sessionStorage.getItem(
                    SESSION_KEY
                );


            if (!raw) {
                return null;
            }


            const session =
                JSON.parse(raw);


            if (!session) {
                return null;
            }


            return session;

        } catch (error) {

            console.warn(
                "STOCKFLOW: Unable to read session:",
                error
            );

            return null;
        }

    };


    /* =====================================================
       EXTRACT USER FROM SESSION
    ===================================================== */

    const extractSessionUser = (
        session
    ) => {

        if (!session) {
            return null;
        }


        /* ---------------------------------------------
           Standard STOCKFLOW_SESSION structure
        --------------------------------------------- */

        if (
            session.user &&
            typeof session.user === "object"
        ) {

            return session.user;

        }


        /* ---------------------------------------------
           Possible nested data.user structure
        --------------------------------------------- */

        if (
            session.data &&
            session.data.user &&
            typeof session.data.user === "object"
        ) {

            return session.data.user;

        }


        /* ---------------------------------------------
           Possible data object
        --------------------------------------------- */

        if (
            session.data &&
            typeof session.data === "object"
        ) {

            if (
                session.data.username ||
                session.data.email ||
                session.data.gmail ||
                session.data.name ||
                session.data.fullName ||
                session.data.USERNAME ||
                session.data.NAME
            ) {

                return session.data;

            }

        }


        /* ---------------------------------------------
           Session itself may be the user object
        --------------------------------------------- */

        if (
            session.username ||
            session.email ||
            session.gmail ||
            session.name ||
            session.fullName ||
            session.USERNAME ||
            session.NAME
        ) {

            return session;

        }


        return null;

    };


    /* =====================================================
       LEGACY USER READER
    ===================================================== */

    const readLegacyUser = () => {

        for (
            const key of LEGACY_AUTH_KEYS
        ) {

            try {

                const raw =
                    localStorage.getItem(
                        key
                    ) ||
                    sessionStorage.getItem(
                        key
                    );


                if (!raw) {
                    continue;
                }


                const parsed =
                    JSON.parse(raw);


                if (
                    parsed &&
                    typeof parsed === "object"
                ) {

                    if (
                        parsed.user &&
                        typeof parsed.user === "object"
                    ) {

                        return parsed.user;

                    }


                    if (
                        parsed.data &&
                        parsed.data.user &&
                        typeof parsed.data.user === "object"
                    ) {

                        return parsed.data.user;

                    }


                    return parsed;

                }

            } catch (error) {

                /* Some old storage values may
                   not contain JSON. */

                continue;

            }

        }


        return null;

    };


    /* =====================================================
       USER IDENTITY
    ===================================================== */

    const getUserIdentity = (
        user
    ) => {

        if (!user) {
            return null;
        }


        const identity = {};


        const email =
            user.email ||
            user.EMAIL ||
            user.gmail ||
            user.GMAIL ||
            user.emailAddress;


        const username =
            user.username ||
            user.USERNAME ||
            user.user_name;


        const phone =
            user.phone ||
            user.PHONE ||
            user.phoneNumber ||
            user["PHONE NO."];


        const id =
            user.userId ||
            user.user_id ||
            user.id ||
            user.ID;


        if (email) {
            identity.email = email;
        }


        if (username) {
            identity.username = username;
        }


        if (phone) {
            identity.phone = phone;
        }


        if (id) {
            identity.userId = id;
        }


        return Object.keys(identity).length
            ? identity
            : null;

    };


    /* =====================================================
       AUTH CONTROLLER COMPATIBILITY
    ===================================================== */

    const getAuthController = () => {

        return (
            window.StockFlowAuth ||
            window.StockFlowAuthUI ||
            window.Auth ||
            null
        );

    };


    /* =====================================================
       GET CURRENT USER
    ===================================================== */

    const getCurrentUser = async () => {

        /* ---------------------------------------------
           1. PRIMARY:
              STOCKFLOW_SESSION
        --------------------------------------------- */

        const session =
            readSession();


        let user =
            extractSessionUser(
                session
            );


        /* ---------------------------------------------
           2. REFRESH USER FROM BACKEND
        --------------------------------------------- */

        if (
            user &&
            window.StockFlowAPI &&
            typeof
            window.StockFlowAPI.getUser ===
                "function"
        ) {

            try {

                const identity =
                    getUserIdentity(
                        user
                    );


                if (identity) {

                    const refreshed =
                        await
                        window.StockFlowAPI.getUser(
                            identity
                        );


                    if (
                        refreshed &&
                        typeof refreshed === "object"
                    ) {

                        /*
                         * Some API wrappers return:
                         * { user: {...} }
                         */

                        if (
                            refreshed.user &&
                            typeof refreshed.user === "object"
                        ) {

                            user =
                                refreshed.user;

                        } else {

                            user =
                                refreshed;

                        }

                    }

                }

            } catch (error) {

                /*
                 * Do not destroy a valid session
                 * just because profile refresh failed.
                 */

                console.warn(
                    "STOCKFLOW: User refresh failed. Using session user.",
                    error
                );

            }

        }


        /* ---------------------------------------------
           3. LEGACY COMPATIBILITY
        --------------------------------------------- */

        if (!user) {

            const auth =
                getAuthController();


            try {

                if (
                    auth &&
                    typeof auth.getCurrentUser ===
                        "function"
                ) {

                    user =
                        await auth.getCurrentUser();

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW: getCurrentUser() failed:",
                    error
                );

            }

        }


        if (!user) {

            const auth =
                getAuthController();


            try {

                if (
                    auth &&
                    typeof auth.getUser ===
                        "function"
                ) {

                    user =
                        await auth.getUser();

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW: getUser() failed:",
                    error
                );

            }

        }


        /* ---------------------------------------------
           4. LEGACY STORAGE
        --------------------------------------------- */

        if (!user) {

            user =
                readLegacyUser();

        }


        return user || null;

    };


    /* =====================================================
       USER INFORMATION
    ===================================================== */

    const getDisplayName = (
        user
    ) => {

        return (
            user?.name ||
            user?.fullName ||
            user?.full_name ||
            user?.displayName ||
            user?.username ||
            user?.USERNAME ||
            user?.NAME ||
            user?.email ||
            user?.EMAIL ||
            "StockFlow User"
        );

    };


    const getDisplayRole = (
        user
    ) => {

        const rawRole =
            user?.role ||
            user?.ROLE ||
            user?.position ||
            user?.POSITION ||
            user?.accountStatus ||
            user?.ACCOUNT_S;


        if (!rawRole) {
            return "Employee";
        }


        const normalized =
            String(
                rawRole
            )
                .trim()
                .toLowerCase();


        if (
            normalized === "admin" ||
            normalized === "administrator"
        ) {

            return "Administrator";

        }


        if (
            normalized === "manager" ||
            normalized === "supervisor"
        ) {

            return "Manager";

        }


        if (
            normalized === "employee" ||
            normalized === "staff" ||
            normalized === "worker"
        ) {

            return "Employee";

        }


        return String(
            rawRole
        );

    };


    const getInitials = (
        name
    ) => {

        const value =
            String(
                name || ""
            )
                .trim();


        if (!value) {
            return "SF";
        }


        const parts =
            value
                .split(/\s+/)
                .filter(Boolean);


        const initials =
            parts
                .slice(0, 2)
                .map(
                    part =>
                        part
                            .charAt(0)
                            .toUpperCase()
                )
                .join("");


        return initials || "SF";

    };


    /* =====================================================
       APPLY USER TO UI
    ===================================================== */

    const applyUser = (
        user
    ) => {

        if (!user) {
            return;
        }


        const name =
            getDisplayName(
                user
            );


        const role =
            getDisplayRole(
                user
            );


        const initials =
            getInitials(
                name
            );


        /* ---------------------------------------------
           SIDEBAR NAME
        --------------------------------------------- */

        const sidebarName =
            $("sidebarUserName");


        if (sidebarName) {

            sidebarName.textContent =
                name;

        }


        /* ---------------------------------------------
           SIDEBAR ROLE
        --------------------------------------------- */

        const sidebarRole =
            $("sidebarUserRole");


        if (sidebarRole) {

            sidebarRole.textContent =
                role;

        }


        /* ---------------------------------------------
           SIDEBAR AVATAR
        --------------------------------------------- */

        const sidebarAvatar =
            $("sidebarAvatar") ||
            document.querySelector(
                ".sidebar-user-avatar"
            );


        if (sidebarAvatar) {

            sidebarAvatar.textContent =
                initials;

        }


        /* ---------------------------------------------
           TOPBAR NAME
        --------------------------------------------- */

        const topbarName =
            $("topbarUserName");


        if (topbarName) {

            topbarName.textContent =
                name;

        }


        /* ---------------------------------------------
           TOPBAR ROLE
        --------------------------------------------- */

        const topbarRole =
            $("topbarUserRole");


        if (topbarRole) {

            topbarRole.textContent =
                role;

        }


        /* ---------------------------------------------
           TOPBAR AVATAR
        --------------------------------------------- */

        const topbarAvatar =
            $("topbarAvatar") ||
            document.querySelector(
                ".topbar .user-avatar"
            );


        if (topbarAvatar) {

            topbarAvatar.textContent =
                initials;

        }


        /* ---------------------------------------------
           STORE CURRENT USER FOR OTHER UI CODE
        --------------------------------------------- */

        window.STOCKFLOW_CURRENT_USER =
            user;

    };


    /* =====================================================
       PROFILE NAVIGATION
    ===================================================== */

    const goToProfile = () => {

        window.location.href =
            "./profile.html";

    };


    /* =====================================================
       MAKE USER AREAS CLICKABLE
    ===================================================== */

    const setupUserProfileLinks = () => {

        const selectors = [

            "[data-user-profile]",

            "#userProfile",

            "#sidebarUser",

            "#sidebarUserProfile",

            ".sidebar-user",

            ".sidebar-user-profile",

            ".sidebar-profile",

            ".top-user",

            ".topbar-user",

            ".topbar-profile",

            ".top-user-profile",

            ".user-profile"

        ];


        const elements = [];


        selectors.forEach(
            selector => {

                document
                    .querySelectorAll(
                        selector
                    )
                    .forEach(
                        element => {

                            if (
                                !elements.includes(
                                    element
                                )
                            ) {

                                elements.push(
                                    element
                                );

                            }

                        }
                    );

            }
        );


        elements.forEach(
            element => {

                /*
                 * Never turn logout into profile.
                 */

                if (
                    element.id ===
                        "logoutButton" ||
                    element.id ===
                        "logoutBtn" ||
                    element.closest(
                        "#logoutButton, #logoutBtn"
                    )
                ) {

                    return;

                }


                if (
                    element.tagName ===
                        "A"
                ) {

                    element.href =
                        "./profile.html";

                } else {

                    element.setAttribute(
                        "role",
                        "link"
                    );


                    element.setAttribute(
                        "tabindex",
                        "0"
                    );


                    if (
                        !element.dataset.stockflowProfileBound
                    ) {

                        element.addEventListener(
                            "click",
                            event => {

                                /*
                                 * Do not intercept buttons
                                 * inside the profile area.
                                 */

                                if (
                                    event.target.closest(
                                        "button"
                                    )
                                ) {

                                    return;

                                }


                                goToProfile();

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

                                    goToProfile();

                                }

                            }
                        );


                        element.dataset.stockflowProfileBound =
                            "true";

                    }

                }

            }
        );


        /* ---------------------------------------------
           Direct name/avatar fallback
        --------------------------------------------- */

        [
            $("sidebarUserName"),
            $("sidebarAvatar"),
            $("topbarUserName"),
            $("topbarAvatar")
        ]
            .filter(Boolean)
            .forEach(
                element => {

                    if (
                        element.dataset.stockflowProfileBound
                    ) {

                        return;

                    }


                    element.style.cursor =
                        "pointer";


                    element.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            goToProfile();

                        }
                    );


                    element.dataset.stockflowProfileBound =
                        "true";

                }
            );

    };


    /* =====================================================
       USER SETUP
    ===================================================== */

    const setupUserDisplay = async () => {

        const user =
            await getCurrentUser();


        if (!user) {

            /*
             * No authenticated session.
             * Send the user back to the
             * actual StockFlow authentication page.
             */

            const currentPath =
                window.location.pathname
                    .toLowerCase();


            /*
             * Avoid redirect loops if this script
             * happens to be loaded somewhere unexpected.
             */

            if (
                !currentPath.endsWith(
                    "/auth.html"
                ) &&
                !currentPath.endsWith(
                    "auth.html"
                )
            ) {

                window.location.href =
                    "./auth.html";

            }


            return null;

        }


        applyUser(
            user
        );


        setupUserProfileLinks();


        return user;

    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const sidebar =
            $("sidebar");


        const overlay =
            $("sidebarOverlay");


        const menuButton =
            $("mobileMenuBtn");


        if (
            !sidebar ||
            !menuButton
        ) {

            return;

        }


        /* -------------------------------------------------
           OPEN SIDEBAR
        ------------------------------------------------- */

        const openSidebar = () => {

            sidebar.classList.add(
                "open"
            );


            if (overlay) {

                overlay.classList.add(
                    "show"
                );

                overlay.classList.add(
                    "active"
                );

            }


            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );


            document.body.classList.add(
                "sidebar-open"
            );

        };


        /* -------------------------------------------------
           CLOSE SIDEBAR
        ------------------------------------------------- */

        const closeSidebar = () => {

            sidebar.classList.remove(
                "open"
            );


            if (overlay) {

                overlay.classList.remove(
                    "show"
                );

                overlay.classList.remove(
                    "active"
                );

            }


            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );


            document.body.classList.remove(
                "sidebar-open"
            );

        };


        /* -------------------------------------------------
           MENU BUTTON
        ------------------------------------------------- */

        menuButton.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

                    closeSidebar();

                } else {

                    openSidebar();

                }

            }
        );


        /* -------------------------------------------------
           OVERLAY
        ------------------------------------------------- */

        if (overlay) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        /* -------------------------------------------------
           NAVIGATION
        ------------------------------------------------- */

        sidebar
            .querySelectorAll(
                ".nav-item, a"
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


        /* -------------------------------------------------
           WINDOW RESIZE
        ------------------------------------------------- */

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

    };


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    const setupNotifications = () => {

        const button =
            $("notificationButton") ||
            $("notificationBtn");


        const panel =
            $("notificationPanel");


        const closeButton =
            $("closeNotification") ||
            $("closeNotificationBtn");


        if (
            !button ||
            !panel
        ) {

            return;

        }


        /* -------------------------------------------------
           CLOSE
        ------------------------------------------------- */

        const closePanel = () => {

            panel.hidden =
                true;


            button.setAttribute(
                "aria-expanded",
                "false"
            );

        };


        /* -------------------------------------------------
           TOGGLE
        ------------------------------------------------- */

        const togglePanel = () => {

            const willOpen =
                panel.hidden;


            panel.hidden =
                !willOpen;


            button.setAttribute(
                "aria-expanded",
                String(
                    willOpen
                )
            );

        };


        /* -------------------------------------------------
           BUTTON
        ------------------------------------------------- */

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                togglePanel();

            }
        );


        /* -------------------------------------------------
           CLOSE BUTTON
        ------------------------------------------------- */

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closePanel();

                }
            );

        }


        /* -------------------------------------------------
           PREVENT PANEL CLICK
        ------------------------------------------------- */

        panel.addEventListener(
            "click",
            event => {

                event.stopPropagation();

            }
        );


        /* -------------------------------------------------
           CLICK OUTSIDE
        ------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                if (
                    !panel.contains(
                        event.target
                    ) &&
                    !button.contains(
                        event.target
                    )
                ) {

                    closePanel();

                }

            }
        );

    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const clearStockFlowSession = () => {

        /* ---------------------------------------------
           Primary session
        --------------------------------------------- */

        try {

            sessionStorage.removeItem(
                SESSION_KEY
            );

        } catch (error) {

            console.warn(
                "Unable to clear STOCKFLOW_SESSION:",
                error
            );

        }


        /* ---------------------------------------------
           Legacy session/localStorage
        --------------------------------------------- */

        LEGACY_AUTH_KEYS.forEach(
            key => {

                try {

                    sessionStorage.removeItem(
                        key
                    );

                } catch (error) {
                    /* Ignore */
                }


                try {

                    localStorage.removeItem(
                        key
                    );

                } catch (error) {
                    /* Ignore */
                }

            }
        );

    };


    const setupLogout = () => {

        const button =
            $("logoutButton") ||
            $("logoutBtn");


        if (!button) {
            return;
        }


        if (
            button.dataset.stockflowLogoutBound
        ) {

            return;

        }


        button.dataset.stockflowLogoutBound =
            "true";


        button.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                const originalHTML =
                    button.innerHTML;


                button.disabled =
                    true;


                button.classList.add(
                    "loading"
                );


                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Logging out...</span>
                `;


                try {

                    const auth =
                        getAuthController();


                    /* -------------------------------------
                       TRY AUTH CONTROLLER
                    ------------------------------------- */

                    if (
                        auth &&
                        typeof auth.logout ===
                            "function"
                    ) {

                        try {

                            await auth.logout();

                        } catch (error) {

                            console.warn(
                                "STOCKFLOW auth logout returned an error:",
                                error
                            );

                        }

                    } else if (
                        auth &&
                        typeof auth.signOut ===
                            "function"
                    ) {

                        try {

                            await auth.signOut();

                        } catch (error) {

                            console.warn(
                                "STOCKFLOW auth signOut returned an error:",
                                error
                            );

                        }

                    }


                    /*
                     * Always clear our actual
                     * STOCKFLOW session.
                     */

                    clearStockFlowSession();


                    /*
                     * Redirect to the actual
                     * authentication page.
                     */

                    window.location.href =
                        "./auth.html";

                } catch (error) {

                    console.error(
                        "Logout failed:",
                        error
                    );


                    /*
                     * Even if a legacy auth
                     * controller fails, clear
                     * the StockFlow session.
                     */

                    clearStockFlowSession();


                    window.location.href =
                        "./auth.html";

                }

            }
        );

    };


    /* =====================================================
       API CONNECTION STATUS
    ===================================================== */

    const setupConnection = () => {

        const badge =
            $("connectionBadge");


        if (!badge) {
            return;
        }


        /*
         * If StockFlowAPI.health() exists,
         * test the backend.
         */

        if (
            window.StockFlowAPI &&
            typeof
            window.StockFlowAPI.health ===
                "function"
        ) {

            window.StockFlowAPI
                .health()

                .then(() => {

                    badge.classList.remove(
                        "offline"
                    );


                    badge.classList.add(
                        "online"
                    );


                    const text =
                        badge.querySelector(
                            "span:last-child"
                        );


                    if (text) {

                        text.textContent =
                            "System Connected";

                    }

                })

                .catch(error => {

                    console.warn(
                        "StockFlow API is offline:",
                        error
                    );


                    badge.classList.add(
                        "offline"
                    );


                    badge.classList.remove(
                        "online"
                    );


                    const text =
                        badge.querySelector(
                            "span:last-child"
                        );


                    if (text) {

                        text.textContent =
                            "System Offline";

                    }

                });

        }

    };


    /* =====================================================
       DEFAULT STOCK-IN DATE
    ===================================================== */

    const setupDefaultDate = () => {

        const dateInput =
            $("stockInDate");


        if (
            !dateInput ||
            dateInput.value
        ) {

            return;

        }


        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            );


        dateInput.value =
            `${year}-${month}-${day}`;


        /*
         * Trigger change so the
         * preview updates immediately.
         */

        dateInput.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );

    };


    /* =====================================================
       LIVE STOCK-IN PREVIEW
    ===================================================== */

    const setupPreview = () => {

        const product =
            $("productSelect");


        const supplier =
            $("supplierSelect");


        const quantity =
            $("quantity");


        const unitCost =
            $("unitCost");


        const reference =
            $("referenceNumber");


        const date =
            $("stockInDate");


        /*
         * If none of the preview inputs exist,
         * there is nothing to initialize.
         */

        if (
            !product &&
            !supplier &&
            !quantity &&
            !unitCost &&
            !reference &&
            !date
        ) {

            return;

        }


        /* -------------------------------------------------
           FORMAT CURRENCY
        ------------------------------------------------- */

        const formatCurrency =
            (value) => {

                const number =
                    Number(
                        value || 0
                    );


                return `₱${number.toLocaleString(
                    "en-PH",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )}`;

            };


        /* -------------------------------------------------
           UPDATE PREVIEW
        ------------------------------------------------- */

        const update = () => {

            /* ---------------------------------------------
               PRODUCT
            --------------------------------------------- */

            const previewProduct =
                $("previewProduct");


            if (previewProduct) {

                const selectedOption =
                    product?.selectedOptions?.[0];


                const productText =
                    selectedOption?.text ||
                    "No product selected";


                previewProduct.textContent =
                    product?.value
                        ? productText
                        : "No product selected";

            }


            /* ---------------------------------------------
               SUPPLIER
            --------------------------------------------- */

            const previewSupplier =
                $("previewSupplier");


            if (previewSupplier) {

                const selectedOption =
                    supplier?.selectedOptions?.[0];


                const supplierText =
                    selectedOption?.text ||
                    "No supplier selected";


                previewSupplier.textContent =
                    supplier?.value
                        ? supplierText
                        : "No supplier selected";

            }


            /* ---------------------------------------------
               QUANTITY
            --------------------------------------------- */

            const qty =
                Number(
                    quantity?.value || 0
                );


            const previewQuantity =
                $("previewQuantity");


            if (previewQuantity) {

                previewQuantity.textContent =
                    qty.toLocaleString(
                        "en-PH"
                    );

            }


            /* ---------------------------------------------
               UNIT COST
            --------------------------------------------- */

            const cost =
                Number(
                    unitCost?.value || 0
                );


            const previewUnitCost =
                $("previewUnitCost");


            if (previewUnitCost) {

                previewUnitCost.textContent =
                    formatCurrency(
                        cost
                    );

            }


            /* ---------------------------------------------
               TOTAL
            --------------------------------------------- */

            const total =
                qty * cost;


            const previewTotal =
                $("previewTotal");


            if (previewTotal) {

                previewTotal.textContent =
                    formatCurrency(
                        total
                    );

            }


            /* ---------------------------------------------
               REFERENCE
            --------------------------------------------- */

            const previewReference =
                $("previewReference");


            if (previewReference) {

                const referenceValue =
                    reference?.value
                        ?.trim() ||
                    "—";


                previewReference.textContent =
                    referenceValue;

            }


            /* ---------------------------------------------
               DATE
            --------------------------------------------- */

            const previewDate =
                $("previewDate");


            if (previewDate) {

                if (
                    date?.value
                ) {

                    const parsed =
                        new Date(
                            `${date.value}T00:00:00`
                        );


                    if (
                        !Number.isNaN(
                            parsed.getTime()
                        )
                    ) {

                        previewDate.textContent =
                            parsed.toLocaleDateString(
                                "en-PH",
                                {
                                    month: "short",
                                    day: "2-digit",
                                    year: "numeric"
                                }
                            );

                    } else {

                        previewDate.textContent =
                            "—";

                    }

                } else {

                    previewDate.textContent =
                        "—";

                }

            }

        };


        /* -------------------------------------------------
           LISTEN FOR INPUT CHANGES
        ------------------------------------------------- */

        [
            product,
            supplier,
            quantity,
            unitCost,
            reference,
            date

        ]
            .filter(Boolean)
            .forEach(
                element => {

                    element.addEventListener(
                        "input",
                        update
                    );


                    element.addEventListener(
                        "change",
                        update
                    );

                }
            );


        /*
         * Initial preview.
         */

        update();

    };


    /* =====================================================
       ACTIVITY / AUDIT LOG
    ===================================================== */

    const logStockInPageActivity = async () => {

        /*
         * Only attempt activity logging when
         * the API exposes a known activity method.
         *
         * This will never prevent the Stock In page
         * from loading.
         */

        if (!window.StockFlowAPI) {
            return;
        }


        const api =
            window.StockFlowAPI;


        const activityMethod =
            [
                "logActivity",
                "recordActivity",
                "createActivity",
                "addActivity",
                "createAuditLog"
            ]
                .find(
                    method =>
                        typeof api[method] ===
                            "function"
                );


        if (!activityMethod) {
            return;
        }


        const user =
            window.STOCKFLOW_CURRENT_USER ||
            extractSessionUser(
                readSession()
            );


        const userName =
            getDisplayName(
                user
            );


        const payload = {

            action:
                "VIEW_STOCK_IN",

            module:
                "Stock In",

            description:
                `${userName} viewed the Stock In page.`,

            user:
                userName,

            username:
                user?.username ||
                user?.USERNAME ||
                "",

            email:
                user?.email ||
                user?.EMAIL ||
                user?.gmail ||
                user?.GMAIL ||
                "",

            timestamp:
                new Date().toISOString()

        };


        try {

            await api[
                activityMethod
            ](
                payload
            );

        } catch (error) {

            /*
             * Activity logging must never
             * break the Stock In page.
             */

            console.debug(
                "STOCKFLOW: Stock In activity logging skipped:",
                error
            );

        }

    };


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        async () => {

            setupSidebar();

            setupNotifications();

            setupLogout();

            setupConnection();

            setupDefaultDate();

            setupPreview();


            /*
             * User must be loaded before
             * profile links/activity are initialized.
             */

            const user =
                await setupUserDisplay();


            /*
             * Only audit the page when
             * an authenticated user exists.
             */

            if (user) {

                await
                    logStockInPageActivity();

            }

        }
    );


})();
