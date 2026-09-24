/* =========================================================
   STOCKFLOW — PROFILE CONTROLLER

   Phone Accessories Inventory Management System

   PURPOSE:
   - Read the currently signed-in user from STOCKFLOW_SESSION
   - Load fresh account information from Google Apps Script
   - Display the latest USER-sheet information
   - Show loading skeletons INSIDE profile fields
   - Keep sidebar user information normal
   - Automatically show the newly signed-in account
   - Handle mobile navigation
   - Handle logout

   IMPORTANT:
   - Does NOT generate OTP
   - Does NOT modify login
   - Does NOT modify registration
   - Does NOT modify verification
   - Does NOT require StockFlowAuth
   - Does NOT create a second authentication system
========================================================= */


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        "use strict";


        /* =====================================================
           CONFIGURATION
        ===================================================== */

        const SESSION_KEY =
            "STOCKFLOW_SESSION";


        /* =====================================================
           ELEMENTS
        ===================================================== */

        const sidebar =
            document.querySelector(
                ".sf-side"
            );


        const menuButton =
            document.querySelector(
                "[data-menu]"
            );


        const logoutButton =
            document.querySelector(
                "#logoutBtn, [data-logout]"
            );


        /* =====================================================
           LOADING STATE
        ===================================================== */

        function showProfileLoading() {

            /*
             * Loading belongs ONLY inside the
             * profile information fields.
             *
             * It must never replace the
             * sidebar user information.
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


            loadingSelectors.forEach(
                selector => {

                    document
                        .querySelectorAll(
                            selector
                        )
                        .forEach(
                            element => {

                                /*
                                 * Sidebar should stay normal.
                                 */

                                if (
                                    element.closest(
                                        ".sf-sidebar-user"
                                    ) ||
                                    element.closest(
                                        ".sf-sidebar-footer"
                                    )
                                ) {

                                    return;

                                }


                                element.classList.add(
                                    "profile-field-loading"
                                );


                                /*
                                 * Preserve original
                                 * content if needed.
                                 */

                                if (
                                    !element.dataset
                                        .profileOriginal
                                ) {

                                    element.dataset
                                        .profileOriginal =
                                        element.textContent;

                                }


                                /*
                                 * Clear text so the
                                 * CSS skeleton can show.
                                 */

                                element.textContent = "";

                            }
                        );

                }
            );

        }


        /* =====================================================
           REMOVE LOADING STATE
        ===================================================== */

        function removeProfileLoading() {

            document
                .querySelectorAll(
                    ".profile-field-loading"
                )
                .forEach(
                    element => {

                        element.classList.remove(
                            "profile-field-loading"
                        );

                    }
                );

        }


        /* =====================================================
           SAFE TEXT
        ===================================================== */

        function setText(
            selector,
            value
        ) {

            const elements =
                document.querySelectorAll(
                    selector
                );


            if (
                !elements.length
            ) {

                return;

            }


            const text =
                value === null ||
                value === undefined ||
                String(value).trim() === ""

                    ? "—"

                    : String(value);


            elements.forEach(
                element => {

                    element.classList.remove(
                        "profile-field-loading"
                    );


                    element.textContent =
                        text;

                }
            );

        }


        /* =====================================================
           FIRST AVAILABLE VALUE
        ===================================================== */

        function firstValue(
            object,
            keys
        ) {

            if (
                !object ||
                typeof object !== "object"
            ) {

                return "";

            }


            for (
                const key of keys
            ) {

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

        function normalizeUser(
            rawUser
        ) {

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
             *   success: true,
             *   user: {...}
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
             *   data: {
             *      user: {...}
             *   }
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
             * Make sure we actually have
             * identifiable account information.
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
           READ SIGNED-IN SESSION
        ===================================================== */

        function getLoginSession() {

            /*
             * Primary source:
             *
             * login.js saves the successful
             * login response here.
             */

            let raw =
                null;


            try {

                raw =
                    sessionStorage.getItem(
                        SESSION_KEY
                    );

            } catch (
                error
            ) {

                console.warn(
                    "STOCKFLOW PROFILE: unable to read sessionStorage:",
                    error
                );

            }


            /*
             * Optional localStorage fallback.
             *
             * This does NOT create authentication.
             * It only supports sessions that may
             * have been stored there by another
             * existing STOCKFLOW component.
             */

            if (!raw) {

                try {

                    raw =
                        localStorage.getItem(
                            SESSION_KEY
                        );

                } catch (
                    error
                ) {

                    console.warn(
                        "STOCKFLOW PROFILE: unable to read localStorage:",
                        error
                    );

                }

            }


            if (!raw) {

                return null;

            }


            try {

                return JSON.parse(
                    raw
                );

            } catch (
                error
            ) {

                console.error(
                    "STOCKFLOW PROFILE: invalid STOCKFLOW_SESSION:",
                    error
                );


                return null;

            }

        }


        /* =====================================================
           GET SIGNED-IN USER FROM SESSION
        ===================================================== */

        function getSignedInUser() {

            const session =
                getLoginSession();


            if (!session) {

                return null;

            }


            /*
             * Normal successful login:
             *
             * {
             *     success: true,
             *     verified: true,
             *     token: "...",
             *     user: {...}
             * }
             */

            if (
                session.user &&
                typeof session.user === "object"
            ) {

                return normalizeUser(
                    session.user
                );

            }


            /*
             * Backward compatibility:
             *
             * In case the session itself
             * contains the user fields.
             */

            return normalizeUser(
                session
            );

        }


        /* =====================================================
           GET USER IDENTITY
        ===================================================== */

        function getUserIdentity(
            user
        ) {

            if (!user) {

                return "";

            }


            /*
             * UID is preferred because it is
             * unique and comes directly from
             * the USER sheet.
             */

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

        function getInitials(
            name
        ) {

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


            if (
                parts.length === 1
            ) {

                return parts[0]
                    .substring(
                        0,
                        2
                    )
                    .toUpperCase();

            }


            return (

                parts[0].charAt(0) +

                parts[
                    parts.length - 1
                ].charAt(0)

            ).toUpperCase();

        }


        /* =====================================================
           DISPLAY USER
        ===================================================== */

        function displayUser(
            user
        ) {

            if (!user) {

                return;

            }


            const fullName =
                user.fullName ||
                user.username ||
                "STOCKFLOW USER";


            /*
             * Remove loading state.
             */

            removeProfileLoading();


            /* ---------------------------------------------
               PROFILE INFORMATION
            --------------------------------------------- */

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


            /* ---------------------------------------------
               SIDEBAR USER
            --------------------------------------------- */

            setText(
                ".sf-sidebar-user [data-user-name]",
                fullName
            );


            setText(
                ".sf-sidebar-user [data-user-role]",
                user.role ||
                "Employee"
            );


            /* ---------------------------------------------
               AVATAR
            --------------------------------------------- */

            const avatars =
                document.querySelectorAll(
                    "[data-user-avatar], .sf-sidebar-avatar"
                );


            avatars.forEach(
                avatar => {

                    avatar.textContent =
                        getInitials(
                            fullName
                        );

                }
            );


            /* ---------------------------------------------
               STATUS CARD
            --------------------------------------------- */

            updateStatusCard(
                status
            );

        }


        /* =====================================================
           UPDATE STATUS CARD
        ===================================================== */

        function updateStatusCard(
            status
        ) {

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

        function showProfileError(
            message
        ) {

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


            /* ---------------------------------------------
               START SKELETON
            --------------------------------------------- */

            showProfileLoading();


            removeProfileError();


            /* ---------------------------------------------
               CHECK API
            --------------------------------------------- */

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


            /* ---------------------------------------------
               GET CURRENT LOGIN SESSION
            --------------------------------------------- */

            let currentUser =
                getSignedInUser();


            console.log(
                "STOCKFLOW PROFILE: signed-in session user:",
                currentUser
            );


            /* ---------------------------------------------
               NO SESSION
            --------------------------------------------- */

            if (!currentUser) {

                removeProfileLoading();


                console.error(
                    "STOCKFLOW PROFILE: no signed-in user found."
                );


                showProfileError(
                    "Unable to load your account information."
                );


                return;

            }


            /* ---------------------------------------------
               DISPLAY SESSION USER FIRST
            --------------------------------------------- */

            displayUser(
                currentUser
            );


            removeProfileError();


            console.log(
                "STOCKFLOW PROFILE: signed-in user displayed."
            );


            /* ---------------------------------------------
               BACKEND REFRESH
            --------------------------------------------- */

            if (
                typeof window.StockFlowAPI.getUser !==
                "function"
            ) {

                console.warn(
                    "STOCKFLOW PROFILE: StockFlowAPI.getUser() is unavailable."
                );


                return;

            }


            const identity =
                getUserIdentity(
                    currentUser
                );


            console.log(
                "STOCKFLOW PROFILE: refreshing user from USER sheet using:",
                identity
            );


            if (!identity) {

                console.warn(
                    "STOCKFLOW PROFILE: no valid user identity available."
                );


                return;

            }


            try {

                /*
                 * This is the important part:
                 *
                 * profile.js asks the existing
                 * Google Apps Script backend for
                 * the currently signed-in user's
                 * latest USER-sheet information.
                 */

                const response =
                    await window.StockFlowAPI.getUser(
                        {
                            uid:
                                currentUser.uid,

                            username:
                                currentUser.username,

                            email:
                                currentUser.email,

                            phone:
                                currentUser.phone,

                            identity:
                                identity
                        }
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
                        "STOCKFLOW PROFILE: fresh USER-sheet data loaded successfully.",
                        currentUser
                    );

                } else {

                    /*
                     * Do NOT erase the user information
                     * already obtained from the login session.
                     */

                    console.warn(
                        "STOCKFLOW PROFILE: backend returned no usable user object."
                    );

                }

            } catch (
                error
            ) {

                /*
                 * Important:
                 *
                 * A backend refresh failure must NOT
                 * turn an already valid signed-in
                 * profile into:
                 *
                 * "Unable to load your account information."
                 *
                 * The session user remains displayed.
                 */

                console.warn(
                    "STOCKFLOW PROFILE: backend refresh failed:",
                    error
                );

            }


            /* ---------------------------------------------
               FINALIZE
            --------------------------------------------- */

            removeProfileLoading();


            removeProfileError();


            console.log(
                "STOCKFLOW PROFILE: profile load complete."
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

                        /*
                         * Use the existing API logout.
                         *
                         * api.js already clears its
                         * authentication storage.
                         */

                        if (
                            window.StockFlowAPI &&
                            typeof window.StockFlowAPI.logout ===
                                "function"
                        ) {

                            await window.StockFlowAPI.logout();

                        }


                    } catch (
                        error
                    ) {

                        console.warn(
                            "STOCKFLOW PROFILE: logout request failed:",
                            error
                        );

                    }


                    /*
                     * Always clear the actual login
                     * session used by login.js.
                     *
                     * This is important because the
                     * profile is now based on
                     * STOCKFLOW_SESSION.
                     */

                    try {

                        sessionStorage.removeItem(
                            "STOCKFLOW_SESSION"
                        );

                    } catch (_) {}


                    try {

                        localStorage.removeItem(
                            "STOCKFLOW_SESSION"
                        );

                    } catch (_) {}


                    /*
                     * Also clear existing legacy
                     * STOCKFLOW storage.
                     */

                    try {

                        sessionStorage.removeItem(
                            "STOCKFLOW_TOKEN"
                        );

                        sessionStorage.removeItem(
                            "STOCKFLOW_USER"
                        );

                        sessionStorage.removeItem(
                            "stockflow_user"
                        );

                    } catch (_) {}


                    try {

                        localStorage.removeItem(
                            "STOCKFLOW_TOKEN"
                        );

                        localStorage.removeItem(
                            "STOCKFLOW_USER"
                        );

                        localStorage.removeItem(
                            "stockflow_user"
                        );

                    } catch (_) {}


                    /*
                     * Return to login.
                     */

                    window.location.href =
                        "./login.html";

                }
            );

        }


        /* =====================================================
           START
        ===================================================== */

        await loadCurrentUser();

    }
);
