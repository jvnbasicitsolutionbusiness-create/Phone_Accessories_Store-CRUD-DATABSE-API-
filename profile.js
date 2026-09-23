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
        document.querySelector("#logoutBtn, [data-logout]");


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

        if (!object || typeof object !== "object") {
            return "";
        }

        for (const key of keys) {

            const value = object[key];

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

        if (!rawUser || typeof rawUser !== "object") {
            return null;
        }

        /*
         * Some API responses may be wrapped.
         * Handle common response structures without
         * changing the backend.
         */

        let user = rawUser;

        if (
            rawUser.user &&
            typeof rawUser.user === "object"
        ) {
            user = rawUser.user;
        }

        if (
            rawUser.data &&
            typeof rawUser.data === "object"
        ) {

            if (
                rawUser.data.user &&
                typeof rawUser.data.user === "object"
            ) {
                user = rawUser.data.user;
            } else {
                user = rawUser.data;
            }
        }


        return {

            id: firstValue(
                user,
                [
                    "id",
                    "user_id",
                    "userId",
                    "account_id",
                    "accountId"
                ]
            ),

            fullName: firstValue(
                user,
                [
                    "full_name",
                    "fullName",
                    "name",
                    "display_name",
                    "displayName"
                ]
            ),

            username: firstValue(
                user,
                [
                    "username",
                    "user_name",
                    "userName"
                ]
            ),

            email: firstValue(
                user,
                [
                    "email",
                    "gmail",
                    "email_address",
                    "emailAddress"
                ]
            ),

            phone: firstValue(
                user,
                [
                    "phone",
                    "phone_number",
                    "phoneNumber",
                    "contact_number",
                    "contactNumber"
                ]
            ),

            age: firstValue(
                user,
                [
                    "age"
                ]
            ),

            role: firstValue(
                user,
                [
                    "role",
                    "user_role",
                    "userRole",
                    "account_role",
                    "accountRole"
                ]
            ),

            status: firstValue(
                user,
                [
                    "account_status",
                    "accountStatus",
                    "status"
                ]
            )
        };
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
            user.fullName || "STOCKFLOW USER";

        setText(
            "[data-user-name]",
            fullName
        );


        /* -----------------------------------------------
           USERNAME
        ------------------------------------------------ */

        setText(
            "[data-user-username]",
            user.username || "—"
        );


        /* -----------------------------------------------
           ROLE
        ------------------------------------------------ */

        const role =
            user.role || "Employee";

        setText(
            "[data-user-role]",
            role
        );


        /* -----------------------------------------------
           EMAIL
        ------------------------------------------------ */

        setText(
            "[data-user-email]",
            user.email || "—"
        );


        /* -----------------------------------------------
           PHONE
        ------------------------------------------------ */

        setText(
            "[data-user-phone]",
            user.phone || "—"
        );


        /* -----------------------------------------------
           AGE
        ------------------------------------------------ */

        setText(
            "[data-user-age]",
            user.age || "—"
        );


        /* -----------------------------------------------
           ACCOUNT STATUS
        ------------------------------------------------ */

        const status =
            user.status || "Active";

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

        updateStatusCard(status);
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
            String(status || "Active")
                .trim()
                .toLowerCase();


        const activeStatuses = [
            "active",
            "enabled",
            "verified",
            "approved"
        ];


        const isActive =
            activeStatuses.includes(normalized);


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
                indicator.textContent = "✓";

                indicator.style.background =
                    "#e8f8ef";

                indicator.style.color =
                    "#16a05a";
            }

        } else {

            if (title) {
                title.textContent =
                    "Account " +
                    String(status || "Inactive");
            }

            if (message) {
                message.textContent =
                    "Please check your account status.";
            }

            if (indicator) {
                indicator.textContent = "!";

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

        /*
         * Make sure the current session exists.
         *
         * IMPORTANT:
         * This uses the actual API object exposed
         * by api.js.
         */

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.requireSession !== "function"
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

            /*
             * 1. Verify that a valid session exists.
             */

            await window.StockFlowAPI.requireSession();


            /*
             * 2. Immediately use the locally stored user.
             *
             * This makes the profile load quickly even
             * before the server request finishes.
             */

            let storedUser = null;

            if (
                typeof window.StockFlowAPI.getStoredUser ===
                "function"
            ) {

                storedUser =
                    window.StockFlowAPI.getStoredUser();
            }


            if (storedUser) {

                const normalizedStored =
                    normalizeUser(storedUser);

                displayUser(
                    normalizedStored
                );
            }


            /*
             * 3. Request the latest user information
             *    from the backend.
             *
             * This makes sure Profile is not permanently
             * dependent on stale session information.
             */

            if (
                typeof window.StockFlowAPI.getUser ===
                "function"
            ) {

                try {

                    const response =
                        await window.StockFlowAPI.getUser();


                    const serverUser =
                        normalizeUser(response);


                    if (serverUser) {

                        displayUser(
                            serverUser
                        );
                    }

                } catch (serverError) {

                    /*
                     * If the server request fails but a stored
                     * user already exists, keep displaying it.
                     *
                     * Do not destroy the working session.
                     */

                    console.warn(
                        "Could not refresh profile from server:",
                        serverError
                    );
                }
            }


        } catch (error) {

            console.error(
                "Profile session error:",
                error
            );


            /*
             * requireSession() normally handles redirecting
             * unauthenticated users.
             *
             * We only show an error if the API did not
             * handle the situation itself.
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
                document.createElement("div");

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

            profileContent.prepend(existing);
        }


        existing.textContent =
            message;
    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    if (menuButton && sidebar) {

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
            .querySelectorAll(".sf-nav-link")
            .forEach(link => {

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
            });
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                logoutButton.disabled = true;

                const originalHTML =
                    logoutButton.innerHTML;

                logoutButton.innerHTML =
                    `
                        <span>...</span>
                        <span>Logging out...</span>
                    `;


                try {

                    /*
                     * Use the existing API logout.
                     * Do not manually generate/delete OTP data.
                     */

                    if (
                        window.StockFlowAPI &&
                        typeof window.StockFlowAPI.logout ===
                        "function"
                    ) {

                        await window.StockFlowAPI.logout();

                    } else {

                        /*
                         * Fallback only if API logout is unavailable.
                         */

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


                    /*
                     * Restore button if logout failed.
                     */

                    logoutButton.disabled = false;

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
