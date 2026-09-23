/* =========================================================
   STOCKFLOW — PROFILE CONTROLLER

   Purpose:
   - Load the currently logged-in user
   - Display account information
   - Keep sidebar user information synchronized
   - Load fresh user information from the API when available
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
       HELPER — NORMALIZE USER OBJECT
    ===================================================== */

    function normalizeUser(rawUser) {

        if (
            !rawUser ||
            typeof rawUser !== "object"
        ) {
            return null;
        }


        /*
         * Handle common API response wrappers.
         */

        let user =
            rawUser;


        if (
            rawUser.user &&
            typeof rawUser.user === "object"
        ) {

            user =
                rawUser.user;
        }


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
         * Backend userToResponse() returns:
         *
         * uid
         * name
         * username
         * age
         * accountStatus
         * gmail
         * email
         * phone
         * role
         * verified
         */

        return {

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
    }


    /* =====================================================
       HELPER — GET USER IDENTITY
    ===================================================== */

    function getUserIdentity(user) {

        if (!user) {
            return "";
        }


        /*
         * Prefer UID because it is the most reliable
         * identifier returned by the backend.
         */

        return (
            user.uid ||
            user.username ||
            user.email ||
            user.phone ||
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
            user.username ||
            "—"
        );


        /* -----------------------------------------------
           ROLE
        ------------------------------------------------ */

        const role =
            user.role ||
            "Employee";

        setText(
            "[data-user-role]",
            role
        );


        /* -----------------------------------------------
           EMAIL
        ------------------------------------------------ */

        setText(
            "[data-user-email]",
            user.email ||
            "—"
        );


        /* -----------------------------------------------
           PHONE
        ------------------------------------------------ */

        setText(
            "[data-user-phone]",
            user.phone ||
            "—"
        );


        /* -----------------------------------------------
           AGE
        ------------------------------------------------ */

        setText(
            "[data-user-age]",
            user.age ||
            "—"
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
                getInitials(fullName);
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

        } else {

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
    }


    /* =====================================================
       LOAD LOGGED-IN USER
    ===================================================== */

    async function loadCurrentUser() {

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.requireSession !==
                "function"
        ) {

            console.error(
                "StockFlowAPI.requireSession() is not available."
            );

            showProfileError(
                "Authentication service is unavailable."
            );

            return;
        }


        try {

            /* ---------------------------------------------
               1. VERIFY CURRENT SESSION
            --------------------------------------------- */

            const sessionResponse =
                await window.StockFlowAPI.requireSession();


            /*
             * If the API returns the user directly through
             * the session response, use it immediately.
             */

            let currentUser =
                normalizeUser(
                    sessionResponse
                );


            /* ---------------------------------------------
               2. GET STORED LOGIN USER
            --------------------------------------------- */

            let storedUser =
                null;


            if (
                typeof window.StockFlowAPI.getStoredUser ===
                "function"
            ) {

                storedUser =
                    window.StockFlowAPI.getStoredUser();
            }


            const normalizedStoredUser =
                normalizeUser(
                    storedUser
                );


            /*
             * Prefer the session response if it contains
             * actual user data.
             *
             * Otherwise use the locally stored login user.
             */

            if (
                !currentUser ||
                (
                    !currentUser.fullName &&
                    !currentUser.username &&
                    !currentUser.email &&
                    !currentUser.uid
                )
            ) {

                currentUser =
                    normalizedStoredUser;
            }


            /* ---------------------------------------------
               3. DISPLAY LOCAL/SESSION DATA IMMEDIATELY
            --------------------------------------------- */

            if (currentUser) {

                displayUser(
                    currentUser
                );
            }


            /* ---------------------------------------------
               4. REFRESH FROM BACKEND
            --------------------------------------------- */

            if (
                typeof window.StockFlowAPI.getUser ===
                "function"
            ) {

                const identityUser =
                    currentUser ||
                    normalizedStoredUser;


                const identity =
                    getUserIdentity(
                        identityUser
                    );


                /*
                 * Only call getUser() if we actually have
                 * an identity to send.
                 */

                if (identity) {

                    try {

                        const response =
                            await window.StockFlowAPI.getUser(
                                identity
                            );


                        const serverUser =
                            normalizeUser(
                                response
                            );


                        if (serverUser) {

                            displayUser(
                                serverUser
                            );

                            /*
                             * Remove an old error if one
                             * was previously displayed.
                             */

                            const errorBox =
                                document.querySelector(
                                    ".profile-load-error"
                                );

                            if (errorBox) {

                                errorBox.remove();
                            }
                        }

                    } catch (serverError) {

                        /*
                         * IMPORTANT:
                         *
                         * A refresh failure should NOT
                         * erase the already loaded user.
                         */

                        console.warn(
                            "Could not refresh profile from server:",
                            serverError
                        );

                    }
                }
            }


            /*
             * If we successfully displayed local/session
             * information, do not show an error merely
             * because the optional refresh failed.
             */

            if (currentUser) {

                return;
            }


            /*
             * Nothing was available at all.
             */

            showProfileError(
                "Unable to load your account information."
            );

        } catch (error) {

            console.error(
                "Profile session error:",
                error
            );


            /*
             * If requireSession fails, there is no reliable
             * authenticated user to display.
             */

            if (
                !window.location.pathname.endsWith(
                    "login.html"
                )
            ) {

                showProfileError(
                    "Unable to load your account information."
                );
            }
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


        let existing =
            document.querySelector(
                ".profile-load-error"
            );


        if (!existing) {

            existing =
                document.createElement(
                    "div"
                );

            existing.className =
                "profile-load-error";

            existing.style.cssText = `
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
                existing
            );
        }


        existing.textContent =
            message;
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
                    String(isOpen)
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

                        await window.StockFlowAPI.logout();

                    } else {

                        sessionStorage.removeItem(
                            "STOCKFLOW_USER"
                        );

                        localStorage.removeItem(
                            "STOCKFLOW_USER"
                        );
                    }


                    window.location.href =
                        "./login.html";

                } catch (error) {

                    console.error(
                        "Logout failed:",
                        error
                    );


                    logoutButton.disabled =
                        false;

                    logoutButton.innerHTML =
                        originalHTML;
                }
            }
        );
    }


    /* =====================================================
       LOAD PROFILE
    ===================================================== */

    await loadCurrentUser();

});
