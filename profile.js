/* =========================================================
   STOCKFLOW — PROFILE CONTROLLER

   Purpose:
   - Load the currently logged-in user
   - Display account information
   - Keep sidebar user information synchronized
   - Use stored login information immediately
   - Refresh user information from the backend when available
   - Handle mobile navigation
   - Handle logout

   IMPORTANT:
   - Does NOT generate OTP
   - Does NOT modify login
   - Does NOT modify registration
   - Does NOT modify authentication flow
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const sidebar =
        document.querySelector(".sf-side");

    const menuButton =
        document.querySelector("[data-menu]");

    const logoutButton =
        document.querySelector(
            "#logoutBtn, [data-logout]"
        );


    /* =====================================================
       HELPER — SAFE TEXT
    ===================================================== */

    function setText(selector, value) {

        const elements =
            document.querySelectorAll(selector);

        if (!elements.length) {
            return;
        }


        const text =
            value === null ||
            value === undefined ||
            String(value).trim() === ""
                ? "—"
                : String(value);


        elements.forEach(element => {
            element.textContent = text;
        });
    }


    /* =====================================================
       HELPER — FIRST AVAILABLE VALUE
    ===================================================== */

    function firstValue(object, keys) {

        if (
            !object ||
            typeof object !== "object"
        ) {
            return "";
        }


        for (const key of keys) {

            const value =
                object[key];


            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return value;
            }
        }


        return "";
    }


    /* =====================================================
       HELPER — NORMALIZE USER
    ===================================================== */

    function normalizeUser(rawUser) {

        if (
            !rawUser ||
            typeof rawUser !== "object"
        ) {
            return null;
        }


        let user =
            rawUser;


        /*
         * Handle:
         *
         * {
         *     user: {...}
         * }
         */

        if (
            rawUser.user &&
            typeof rawUser.user === "object"
        ) {

            user =
                rawUser.user;
        }


        /*
         * Handle:
         *
         * {
         *     data: {...}
         * }
         */

        if (
            rawUser.data &&
            typeof rawUser.data === "object"
        ) {

            if (
                rawUser.data.user &&
                typeof rawUser.data.user === "object"
            ) {

                user =
                    rawUser.data.user;

            } else {

                user =
                    rawUser.data;
            }
        }


        /*
         * Make sure we actually have a usable object.
         */

        if (
            !user ||
            typeof user !== "object" ||
            Array.isArray(user)
        ) {
            return null;
        }


        /*
         * Normalize backend/user storage fields.
         */

        const normalized = {

            uid:
                firstValue(
                    user,
                    [
                        "uid",
                        "UID",
                        "id",
                        "user_id",
                        "userId",
                        "account_id",
                        "accountId"
                    ]
                ),


            fullName:
                firstValue(
                    user,
                    [
                        "name",
                        "full_name",
                        "fullName",
                        "display_name",
                        "displayName"
                    ]
                ),


            username:
                firstValue(
                    user,
                    [
                        "username",
                        "USERNAME",
                        "user_name",
                        "userName"
                    ]
                ),


            email:
                firstValue(
                    user,
                    [
                        "email",
                        "gmail",
                        "GMAIL",
                        "email_address",
                        "emailAddress"
                    ]
                ),


            phone:
                firstValue(
                    user,
                    [
                        "phone",
                        "phone_number",
                        "phoneNumber",
                        "contact_number",
                        "contactNumber",
                        "PHONE NO."
                    ]
                ),


            age:
                firstValue(
                    user,
                    [
                        "age",
                        "AGE"
                    ]
                ),


            role:
                firstValue(
                    user,
                    [
                        "role",
                        "ROLE",
                        "user_role",
                        "userRole",
                        "account_role",
                        "accountRole"
                    ]
                ),


            status:
                firstValue(
                    user,
                    [
                        "accountStatus",
                        "account_status",
                        "ACCOUNT_S",
                        "status"
                    ]
                ),


            verified:
                firstValue(
                    user,
                    [
                        "verified",
                        "VERIFIED"
                    ]
                )
        };


        /*
         * Do not consider a completely empty object
         * to be a valid user.
         */

        const hasData =
            Boolean(
                normalized.uid ||
                normalized.fullName ||
                normalized.username ||
                normalized.email ||
                normalized.phone
            );


        return hasData
            ? normalized
            : null;
    }


    /* =====================================================
       HELPER — USER IDENTITY
    ===================================================== */

    function getUserIdentity(user) {

        if (!user) {
            return "";
        }


        /*
         * Prefer UID.
         * Then fall back to the identifiers supported
         * by the API.
         */

        return (
            String(user.uid || "").trim() ||
            String(user.username || "").trim() ||
            String(user.email || "").trim() ||
            String(user.phone || "").trim() ||
            ""
        );
    }


    /* =====================================================
       HELPER — INITIALS
    ===================================================== */

    function getInitials(name) {

        if (!name) {
            return "SF";
        }


        const parts =
            String(name)
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
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }


    /* =====================================================
       DISPLAY USER
    ===================================================== */

    function displayUser(user) {

        if (!user) {
            return;
        }


        /* -----------------------------------------------
           FULL NAME
        ------------------------------------------------ */

        const fullName =
            user.fullName ||
            "STOCKFLOW USER";


        setText(
            "[data-user-name]",
            fullName
        );


        /* -----------------------------------------------
           USERNAME
        ------------------------------------------------ */

        setText(
            "[data-user-username]",
            user.username
        );


        /* -----------------------------------------------
           ROLE
        ------------------------------------------------ */

        setText(
            "[data-user-role]",
            user.role ||
            "Employee"
        );


        /* -----------------------------------------------
           EMAIL
        ------------------------------------------------ */

        setText(
            "[data-user-email]",
            user.email
        );


        /* -----------------------------------------------
           PHONE
        ------------------------------------------------ */

        setText(
            "[data-user-phone]",
            user.phone
        );


        /* -----------------------------------------------
           AGE
        ------------------------------------------------ */

        setText(
            "[data-user-age]",
            user.age
        );


        /* -----------------------------------------------
           ACCOUNT STATUS
        ------------------------------------------------ */

        const status =
            user.status ||
            "Active";


        setText(
            "[data-user-status]",
            status
        );


        /* -----------------------------------------------
           AVATAR
        ------------------------------------------------ */

        const avatar =
            document.querySelector(
                "[data-user-avatar]"
            );


        if (avatar) {

            avatar.textContent =
                getInitials(
                    fullName
                );
        }


        /* -----------------------------------------------
           STATUS CARD
        ------------------------------------------------ */

        updateStatusCard(
            status
        );
    }


    /* =====================================================
       STATUS CARD
    ===================================================== */

    function updateStatusCard(status) {

        const title =
            document.querySelector(
                "[data-status-title]"
            );

        const message =
            document.querySelector(
                "[data-status-message]"
            );

        const indicator =
            document.querySelector(
                "[data-status-indicator]"
            );


        const normalized =
            String(
                status ||
                "Active"
            )
                .trim()
                .toLowerCase();


        const activeStatuses = [
            "active",
            "enabled",
            "verified",
            "approved"
        ];


        const isActive =
            activeStatuses.includes(
                normalized
            );


        if (isActive) {

            if (title) {

                title.textContent =
                    "Account Active";
            }


            if (message) {

                message.textContent =
                    "Your STOCKFLOW account is currently active.";
            }


            if (indicator) {

                indicator.textContent =
                    "✓";

                indicator.style.background =
                    "#e8f8ef";

                indicator.style.color =
                    "#16a05a";
            }

            return;
        }


        /*
         * Non-active account.
         */

        if (title) {

            title.textContent =
                "Account " +
                String(
                    status ||
                    "Inactive"
                );
        }


        if (message) {

            message.textContent =
                "Please check your account status.";
        }


        if (indicator) {

            indicator.textContent =
                "!";

            indicator.style.background =
                "#fff4e5";

            indicator.style.color =
                "#c77700";
        }
    }


    /* =====================================================
       REMOVE PROFILE ERROR
    ===================================================== */

    function removeProfileError() {

        const errorBox =
            document.querySelector(
                ".profile-load-error"
            );


        if (errorBox) {

            errorBox.remove();
        }
    }


    /* =====================================================
       PROFILE ERROR
    ===================================================== */

    function showProfileError(message) {

        const profileContent =
            document.querySelector(
                ".profile-content"
            );


        if (!profileContent) {
            return;
        }


        let errorBox =
            document.querySelector(
                ".profile-load-error"
            );


        if (!errorBox) {

            errorBox =
                document.createElement(
                    "div"
                );


            errorBox.className =
                "profile-load-error";


            errorBox.style.cssText = `
                margin-bottom: 16px;
                padding: 12px 14px;
                border: 1px solid #fecaca;
                border-radius: 10px;
                background: #fff5f5;
                color: #b42318;
                font-size: 12px;
                font-weight: 600;
            `;


            profileContent.prepend(
                errorBox
            );
        }


        errorBox.textContent =
            message;
    }


    /* =====================================================
       LOAD CURRENT USER
    ===================================================== */

    async function loadCurrentUser() {

        console.log(
            "STOCKFLOW PROFILE: loading current user..."
        );


        /* =================================================
           1. CHECK API
        ================================================= */

        if (
            !window.StockFlowAPI
        ) {

            console.error(
                "STOCKFLOW PROFILE: StockFlowAPI is unavailable."
            );


            showProfileError(
                "Authentication service is unavailable."
            );


            return;
        }


        /* =================================================
           2. LOAD STORED USER FIRST
        ================================================= */

        let currentUser =
            null;


        if (
            typeof window.StockFlowAPI.getStoredUser ===
            "function"
        ) {

            try {

                const storedUser =
                    window.StockFlowAPI.getStoredUser();


                console.log(
                    "STOCKFLOW PROFILE: stored user:",
                    storedUser
                );


                currentUser =
                    normalizeUser(
                        storedUser
                    );

            } catch (error) {

                console.warn(
                    "STOCKFLOW PROFILE: unable to read stored user:",
                    error
                );
            }
        }


        /* =================================================
           3. DISPLAY STORED USER IMMEDIATELY
        ================================================= */

        if (currentUser) {

            console.log(
                "STOCKFLOW PROFILE: displaying stored user."
            );


            displayUser(
                currentUser
            );


            removeProfileError();
        }


        /* =================================================
           4. VALIDATE SESSION
        ================================================= */

        /*
         * Only call session() when a token exists.
         *
         * api.js already exposes getToken().
         *
         * This avoids making a pointless session request
         * when the browser has no authentication token.
         */

        let token =
            "";


        if (
            typeof window.StockFlowAPI.getToken ===
            "function"
        ) {

            try {

                token =
                    window.StockFlowAPI.getToken();

            } catch (error) {

                console.warn(
                    "STOCKFLOW PROFILE: unable to read session token:",
                    error
                );
            }
        }


        if (
            token &&
            typeof window.StockFlowAPI.session ===
                "function"
        ) {

            try {

                console.log(
                    "STOCKFLOW PROFILE: validating session..."
                );


                const sessionResponse =
                    await window.StockFlowAPI.session();


                console.log(
                    "STOCKFLOW PROFILE: session response:",
                    sessionResponse
                );


                const sessionUser =
                    normalizeUser(
                        sessionResponse
                    );


                /*
                 * Use session data when the backend
                 * actually returned a user.
                 */

                if (sessionUser) {

                    currentUser =
                        sessionUser;


                    displayUser(
                        currentUser
                    );


                    removeProfileError();


                    console.log(
                        "STOCKFLOW PROFILE: session user loaded."
                    );
                }

            } catch (sessionError) {

                /*
                 * Session failure must NOT erase the
                 * locally stored user.
                 */

                console.warn(
                    "STOCKFLOW PROFILE: session validation failed:",
                    sessionError
                );
            }
        }


        /* =================================================
           5. REFRESH USER FROM BACKEND
        ================================================= */

        if (
            currentUser &&
            typeof window.StockFlowAPI.getUser ===
                "function"
        ) {

            const identity =
                getUserIdentity(
                    currentUser
                );


            if (identity) {

                console.log(
                    "STOCKFLOW PROFILE: refreshing user:",
                    identity
                );


                try {

                    const response =
                        await window.StockFlowAPI.getUser(
                            identity
                        );


                    console.log(
                        "STOCKFLOW PROFILE: getUser response:",
                        response
                    );


                    const serverUser =
                        normalizeUser(
                            response
                        );


                    if (serverUser) {

                        currentUser =
                            serverUser;


                        displayUser(
                            currentUser
                        );


                        removeProfileError();


                        console.log(
                            "STOCKFLOW PROFILE: fresh backend user loaded."
                        );
                    }

                } catch (serverError) {

                    /*
                     * Backend refresh is OPTIONAL.
                     *
                     * If it fails, keep the already
                     * displayed stored/session user.
                     */

                    console.warn(
                        "STOCKFLOW PROFILE: backend user refresh failed:",
                        serverError
                    );
                }
            }
        }


        /* =================================================
           6. FINAL RESULT
        ================================================= */

        if (currentUser) {

            removeProfileError();


            console.log(
                "STOCKFLOW PROFILE: profile loaded successfully.",
                currentUser
            );


            return;
        }


        /* =================================================
           7. NO USER DATA AVAILABLE
        ================================================= */

        console.error(
            "STOCKFLOW PROFILE: no authenticated user information is available."
        );


        showProfileError(
            "Unable to load your account information."
        );
    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    if (
        menuButton &&
        sidebar
    ) {

        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    sidebar.classList.toggle(
                        "open"
                    );


                menuButton.setAttribute(
                    "aria-expanded",
                    String(
                        isOpen
                    )
                );
            }
        );
    }


    /* =====================================================
       CLOSE MOBILE MENU WHEN LINK IS CLICKED
    ===================================================== */

    if (sidebar) {

        sidebar
            .querySelectorAll(
                ".sf-nav-link"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            sidebar.classList.remove(
                                "open"
                            );


                            if (menuButton) {

                                menuButton.setAttribute(
                                    "aria-expanded",
                                    "false"
                                );
                            }
                        }
                    );
                }
            );
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                if (
                    logoutButton.disabled
                ) {
                    return;
                }


                logoutButton.disabled =
                    true;


                const originalHTML =
                    logoutButton.innerHTML;


                logoutButton.innerHTML =
                    `
                        <span>...</span>
                        <span>Logging out...</span>
                    `;


                try {

                    if (
                        window.StockFlowAPI &&
                        typeof window.StockFlowAPI.logout ===
                            "function"
                    ) {

                        /*
                         * api.js handles:
                         * - server logout
                         * - token clearing
                         * - stored-user clearing
                         */

                        await window.StockFlowAPI.logout();

                    } else {

                        /*
                         * Fallback only if API is unavailable.
                         */

                        if (
                            typeof window.StockFlowAPI?.clearToken ===
                            "function"
                        ) {

                            window.StockFlowAPI.clearToken();

                        } else {

                            sessionStorage.removeItem(
                                "STOCKFLOW_TOKEN"
                            );

                            localStorage.removeItem(
                                "STOCKFLOW_TOKEN"
                            );
                        }


                        if (
                            typeof window.StockFlowAPI?.clearStoredUser ===
                            "function"
                        ) {

                            window.StockFlowAPI.clearStoredUser();

                        } else {

                            sessionStorage.removeItem(
                                "STOCKFLOW_USER"
                            );

                            localStorage.removeItem(
                                "STOCKFLOW_USER"
                            );
                        }
                    }


                    window.location.href =
                        "./login.html";

                } catch (error) {

                    console.error(
                        "STOCKFLOW PROFILE: logout failed:",
                        error
                    );


                    /*
                     * Even if the backend logout request
                     * fails, clear local authentication data.
                     */

                    try {

                        if (
                            typeof window.StockFlowAPI?.clearToken ===
                            "function"
                        ) {

                            window.StockFlowAPI.clearToken();

                        } else {

                            sessionStorage.removeItem(
                                "STOCKFLOW_TOKEN"
                            );

                            localStorage.removeItem(
                                "STOCKFLOW_TOKEN"
                            );
                        }


                        if (
                            typeof window.StockFlowAPI?.clearStoredUser ===
                            "function"
                        ) {

                            window.StockFlowAPI.clearStoredUser();

                        } else {

                            sessionStorage.removeItem(
                                "STOCKFLOW_USER"
                            );

                            localStorage.removeItem(
                                "STOCKFLOW_USER"
                            );
                        }

                    } catch (clearError) {

                        console.warn(
                            "STOCKFLOW PROFILE: local logout cleanup failed:",
                            clearError
                        );
                    }


                    /*
                     * Go back to login even if the
                     * server-side logout failed.
                     */

                    window.location.href =
                        "./login.html";
                }
            }
        );
    }


    /* =====================================================
       LOAD PROFILE
    ===================================================== */

    await loadCurrentUser();

});
