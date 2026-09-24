/* =========================================================
   STOCKFLOW — PROFILE CONTROLLER

   Purpose:
   - Load the currently logged-in user
   - Display account information
   - Show loading skeletons INSIDE profile fields
   - Keep sidebar user area normal
   - Refresh user information from backend
   - Handle mobile navigation
   - Handle logout

   IMPORTANT:
   - Does NOT generate OTP
   - Does NOT modify login
   - Does NOT modify registration
   - Does NOT modify verification
   - Does NOT use the nonexistent backend "session" action
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
       LOADING STATE
    ===================================================== */

    function showProfileLoading() {

        /*
         * IMPORTANT:
         *
         * Loading belongs INSIDE the profile
         * information fields.
         *
         * It must NOT replace the sidebar
         * user information.
         */

        const loadingSelectors = [
            "[data-user-name]",
            "[data-user-username]",
            "[data-user-role]",
            "[data-user-email]",
            "[data-user-phone]",
            "[data-user-age]",
            "[data-user-status]"
        ];


        loadingSelectors.forEach(selector => {

            document
                .querySelectorAll(selector)
                .forEach(element => {

                    /*
                     * Do not put "Loading..."
                     * into the sidebar.
                     *
                     * Only the actual profile
                     * information values receive
                     * the loading state.
                     */

                    if (
                        element.closest(".sf-sidebar-user") ||
                        element.closest(".sf-sidebar-footer")
                    ) {
                        return;
                    }


                    element.classList.add(
                        "profile-field-loading"
                    );


                    /*
                     * Save original content so
                     * it can be restored if needed.
                     */

                    if (
                        !element.dataset.profileOriginal
                    ) {

                        element.dataset.profileOriginal =
                            element.textContent;
                    }


                    element.textContent = "";

                });

        });
    }


    /* =====================================================
       REMOVE LOADING STATE
    ===================================================== */

    function removeProfileLoading() {

        document
            .querySelectorAll(
                ".profile-field-loading"
            )
            .forEach(element => {

                element.classList.remove(
                    "profile-field-loading"
                );

            });
    }


    /* =====================================================
       SAFE TEXT
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

            /*
             * Never allow profile loading
             * to remain after real data arrives.
             */

            element.classList.remove(
                "profile-field-loading"
            );


            element.textContent =
                text;

        });
    }


    /* =====================================================
       FIRST AVAILABLE VALUE
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
       NORMALIZE USER
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
         * Backend response:
         *
         * {
         *     success: true,
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
         * Generic data wrapper
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


        if (
            !user ||
            typeof user !== "object" ||
            Array.isArray(user)
        ) {

            return null;
        }


        const normalized = {

            uid:
                firstValue(
                    user,
                    [
                        "uid",
                        "UID",
                        "id",
                        "userId",
                        "user_id",
                        "accountId",
                        "account_id"
                    ]
                ),


            fullName:
                firstValue(
                    user,
                    [
                        "name",
                        "fullName",
                        "full_name",
                        "displayName",
                        "display_name",
                        "NAME"
                    ]
                ),


            username:
                firstValue(
                    user,
                    [
                        "username",
                        "USERNAME",
                        "userName",
                        "user_name"
                    ]
                ),


            email:
                firstValue(
                    user,
                    [
                        "email",
                        "gmail",
                        "GMAIL",
                        "EMAIL",
                        "emailAddress",
                        "email_address"
                    ]
                ),


            phone:
                firstValue(
                    user,
                    [
                        "phone",
                        "PHONE NO.",
                        "phoneNumber",
                        "phone_number",
                        "contactNumber",
                        "contact_number"
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
                        "userRole",
                        "user_role",
                        "accountRole",
                        "account_role"
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
         * Make sure this is actually a user.
         */

        if (
            !normalized.uid &&
            !normalized.username &&
            !normalized.email &&
            !normalized.phone &&
            !normalized.fullName
        ) {

            return null;
        }


        return normalized;
    }


    /* =====================================================
       GET USER IDENTITY
    ===================================================== */

    function getUserIdentity(user) {

        if (!user) {
            return "";
        }


        return (
            String(
                user.uid || ""
            ).trim() ||

            String(
                user.username || ""
            ).trim() ||

            String(
                user.email || ""
            ).trim() ||

            String(
                user.phone || ""
            ).trim() ||

            ""
        );
    }


    /* =====================================================
       GET INITIALS
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


        const fullName =
            user.fullName ||
            user.username ||
            "STOCKFLOW USER";


        /*
         * Remove profile loading state
         */

        removeProfileLoading();


        /*
         * PROFILE INFORMATION
         */

        setText(
            "[data-user-name]",
            fullName
        );


        setText(
            "[data-user-username]",
            user.username
        );


        setText(
            "[data-user-role]",
            user.role ||
            "Employee"
        );


        setText(
            "[data-user-email]",
            user.email
        );


        setText(
            "[data-user-phone]",
            user.phone
        );


        setText(
            "[data-user-age]",
            user.age
        );


        const status =
            user.status ||
            "Active";


        setText(
            "[data-user-status]",
            status
        );


        /*
         * SIDEBAR USER
         *
         * Only update the sidebar with
         * the real user information.
         */

        setText(
            ".sf-sidebar-user [data-user-name]",
            fullName
        );


        setText(
            ".sf-sidebar-user [data-user-role]",
            user.role ||
            "Employee"
        );


        /*
         * AVATAR
         */

        const avatars =
            document.querySelectorAll(
                "[data-user-avatar], .sf-sidebar-avatar"
            );


        avatars.forEach(avatar => {

            avatar.textContent =
                getInitials(
                    fullName
                );

        });


        /*
         * STATUS CARD
         */

        updateStatusCard(
            status
        );
    }


    /* =====================================================
       UPDATE STATUS CARD
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


        const active =
            [
                "active",
                "verified",
                "approved",
                "enabled"
            ].includes(
                normalized
            );


        if (active) {

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


        if (title) {

            title.textContent =
                "Account " +
                (
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
       SHOW PROFILE ERROR
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
       LOAD LOGGED-IN USER
    ===================================================== */

    async function loadCurrentUser() {

        console.log(
            "STOCKFLOW PROFILE: starting profile load..."
        );


        /*
         * START WITH PROFILE SKELETONS
         *
         * These appear in the account information
         * cards, NOT in the sidebar.
         */

        showProfileLoading();


        /*
         * CHECK API
         */

        if (!window.StockFlowAPI) {

            console.error(
                "STOCKFLOW PROFILE: StockFlowAPI is unavailable."
            );


            removeProfileLoading();


            showProfileError(
                "Authentication service is unavailable."
            );


            return;
        }


        let currentUser =
            null;


        /* =================================================
           1. STOCKFLOW AUTH USER
        ================================================= */

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.user ===
                    "function"
            ) {

                currentUser =
                    normalizeUser(
                        window.StockFlowAuth.user()
                    );


                console.log(
                    "STOCKFLOW PROFILE: StockFlowAuth.user():",
                    currentUser
                );

            }

        } catch (error) {

            console.warn(
                "STOCKFLOW PROFILE: unable to read StockFlowAuth user:",
                error
            );

        }


        /* =================================================
           2. API STORED USER
        ================================================= */

        if (!currentUser) {

            try {

                if (
                    typeof window.StockFlowAPI.getStoredUser ===
                    "function"
                ) {

                    currentUser =
                        normalizeUser(
                            window.StockFlowAPI.getStoredUser()
                        );


                    console.log(
                        "STOCKFLOW PROFILE: StockFlowAPI stored user:",
                        currentUser
                    );

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW PROFILE: unable to read API stored user:",
                    error
                );

            }

        }


        /* =================================================
           3. DIRECT SESSION STORAGE
        ================================================= */

        if (!currentUser) {

            try {

                const rawUser =
                    sessionStorage.getItem(
                        "stockflow_user"
                    );


                if (rawUser) {

                    currentUser =
                        normalizeUser(
                            JSON.parse(
                                rawUser
                            )
                        );

                }


                if (!currentUser) {

                    const uppercaseUser =
                        sessionStorage.getItem(
                            "STOCKFLOW_USER"
                        );


                    if (uppercaseUser) {

                        currentUser =
                            normalizeUser(
                                JSON.parse(
                                    uppercaseUser
                                )
                            );

                    }

                }


                console.log(
                    "STOCKFLOW PROFILE: direct storage user:",
                    currentUser
                );

            } catch (error) {

                console.warn(
                    "STOCKFLOW PROFILE: direct storage read failed:",
                    error
                );

            }

        }


        /* =================================================
           4. DISPLAY LOCAL USER IMMEDIATELY
        ================================================= */

        if (currentUser) {

            displayUser(
                currentUser
            );


            removeProfileError();


            console.log(
                "STOCKFLOW PROFILE: local user displayed."
            );

        }


        /* =================================================
           5. BACKEND REFRESH
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


            console.log(
                "STOCKFLOW PROFILE: backend identity:",
                identity
            );


            if (identity) {

                try {

                    const response =
                        await window.StockFlowAPI.getUser(
                            identity
                        );


                    console.log(
                        "STOCKFLOW PROFILE: backend getUser response:",
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
                            "STOCKFLOW PROFILE: backend user loaded successfully."
                        );

                    }

                } catch (error) {

                    /*
                     * Do NOT erase already loaded
                     * profile information.
                     */

                    console.warn(
                        "STOCKFLOW PROFILE: backend refresh failed:",
                        error
                    );

                }

            }

        }


        /* =================================================
           6. FINAL RESULT
        ================================================= */

        if (currentUser) {

            removeProfileLoading();

            removeProfileError();


            console.log(
                "STOCKFLOW PROFILE: profile loaded successfully.",
                currentUser
            );


            return;

        }


        /* =================================================
           7. NOTHING FOUND
        ================================================= */

        removeProfileLoading();


        console.error(
            "STOCKFLOW PROFILE: no user found in authentication storage."
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
            event => {

                event.preventDefault();


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
       CLOSE MOBILE MENU
    ===================================================== */

    if (sidebar) {

        sidebar
            .querySelectorAll(
                ".sf-nav-link, a"
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


                logoutButton.innerHTML = `
                    <span>...</span>
                    <span>Logging out...</span>
                `;


                try {

                    if (
                        window.StockFlowAPI &&
                        typeof window.StockFlowAPI.logout ===
                            "function"
                    ) {

                        await window.StockFlowAPI.logout();

                    } else {

                        sessionStorage.removeItem(
                            "STOCKFLOW_TOKEN"
                        );

                        localStorage.removeItem(
                            "STOCKFLOW_TOKEN"
                        );

                        sessionStorage.removeItem(
                            "STOCKFLOW_USER"
                        );

                        localStorage.removeItem(
                            "STOCKFLOW_USER"
                        );

                        sessionStorage.removeItem(
                            "stockflow_user"
                        );

                        localStorage.removeItem(
                            "stockflow_user"
                        );

                    }


                    window.location.href =
                        "./login.html";

                } catch (error) {

                    console.error(
                        "STOCKFLOW PROFILE: logout request failed:",
                        error
                    );


                    try {

                        if (
                            window.StockFlowAPI &&
                            typeof window.StockFlowAPI.clearToken ===
                                "function"
                        ) {

                            window.StockFlowAPI.clearToken();

                        }

                    } catch (_) {}


                    try {

                        if (
                            window.StockFlowAPI &&
                            typeof window.StockFlowAPI.clearStoredUser ===
                                "function"
                        ) {

                            window.StockFlowAPI.clearStoredUser();

                        }

                    } catch (_) {}


                    sessionStorage.removeItem(
                        "stockflow_user"
                    );

                    localStorage.removeItem(
                        "stockflow_user"
                    );


                    window.location.href =
                        "./login.html";

                }

            }
        );

    }


    /* =====================================================
       START
    ===================================================== */

    await loadCurrentUser();

});
