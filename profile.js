/* =========================================================
   STOCKFLOW — PROFILE MODULE
   Current authenticated user information

   PROFILE PAGE ONLY

   Data flow:
   Stored Session User
          ↓
   StockFlowAPI.getUser()
          ↓
   Google Apps Script
          ↓
   Google Sheet
          ↓
   Profile Information
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (selector) => {
        return document.querySelector(selector);
    };


    const getElement = (...selectors) => {

        for (const selector of selectors) {

            const element =
                document.querySelector(selector);

            if (element) {
                return element;
            }

        }

        return null;
    };


    const getValue = (
        user,
        ...keys
    ) => {

        if (!user) {
            return "—";
        }


        for (const key of keys) {

            const value =
                user?.[key];


            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {

                return String(
                    value
                ).trim();

            }

        }


        return "—";
    };


    /* =====================================================
       NORMALIZE USER RESPONSE
    ===================================================== */

    const normalizeUserResponse = (
        response
    ) => {

        if (!response) {
            return null;
        }


        /*
         * API responses may be returned as:
         *
         * {
         *     success: true,
         *     user: {...}
         * }
         *
         * or:
         *
         * {
         *     success: true,
         *     data: {...}
         * }
         *
         * or simply:
         *
         * {...user data...}
         */


        if (
            response.user &&
            typeof response.user ===
                "object"
        ) {

            return response.user;

        }


        if (
            response.data &&
            typeof response.data ===
                "object"
        ) {

            if (
                response.data.user &&
                typeof response.data.user ===
                    "object"
            ) {

                return response.data.user;

            }


            return response.data;

        }


        if (
            response.result &&
            typeof response.result ===
                "object"
        ) {

            if (
                response.result.user &&
                typeof response.result.user ===
                    "object"
            ) {

                return response.result.user;

            }


            return response.result;

        }


        return response;

    };


    /* =====================================================
       BUILD USER IDENTITY
    ===================================================== */

    const buildIdentityData = (
        user
    ) => {

        if (!user) {
            return {};
        }


        return {

            uid:
                getValue(
                    user,
                    "uid",
                    "UID",
                    "userId",
                    "USER_ID"
                ) === "—"
                    ? ""
                    : getValue(
                        user,
                        "uid",
                        "UID",
                        "userId",
                        "USER_ID"
                    ),


            username:
                getValue(
                    user,
                    "username",
                    "USERNAME",
                    "user_name",
                    "USER_NAME"
                ) === "—"
                    ? ""
                    : getValue(
                        user,
                        "username",
                        "USERNAME",
                        "user_name",
                        "USER_NAME"
                    ),


            email:
                getValue(
                    user,
                    "email",
                    "EMAIL",
                    "gmail",
                    "GMAIL"
                ) === "—"
                    ? ""
                    : getValue(
                        user,
                        "email",
                        "EMAIL",
                        "gmail",
                        "GMAIL"
                    ),


            gmail:
                getValue(
                    user,
                    "gmail",
                    "GMAIL",
                    "email",
                    "EMAIL"
                ) === "—"
                    ? ""
                    : getValue(
                        user,
                        "gmail",
                        "GMAIL",
                        "email",
                        "EMAIL"
                    ),


            phone:
                getValue(
                    user,
                    "phone",
                    "PHONE",
                    "phoneNumber",
                    "PHONE_NUMBER",
                    "mobile",
                    "MOBILE",
                    "phone_no",
                    "PHONE_NO"
                ) === "—"
                    ? ""
                    : getValue(
                        user,
                        "phone",
                        "PHONE",
                        "phoneNumber",
                        "PHONE_NUMBER",
                        "mobile",
                        "MOBILE",
                        "phone_no",
                        "PHONE_NO"
                    )

        };

    };


    /* =====================================================
       FETCH CURRENT USER
    ===================================================== */

    const fetchCurrentUser = async (
        storedUser
    ) => {

        /*
         * First make sure StockFlowAPI exists.
         */

        if (
            !window.StockFlowAPI
        ) {

            console.warn(
                "[PROFILE] StockFlowAPI is not available."
            );

            return storedUser || null;

        }


        /* -------------------------------------------------
           BUILD IDENTITY
        ------------------------------------------------- */

        const identity =
            buildIdentityData(
                storedUser
            );


        /*
         * If we don't have any useful identity,
         * don't make an empty getUser request.
         */

        const hasIdentity =
            Boolean(
                identity.uid ||
                identity.username ||
                identity.email ||
                identity.gmail ||
                identity.phone
            );


        if (!hasIdentity) {

            console.warn(
                "[PROFILE] No stored user identity available."
            );

            return storedUser || null;

        }


        /* -------------------------------------------------
           REQUEST FULL USER RECORD
        ------------------------------------------------- */

        try {

            console.log(
                "[PROFILE] Fetching current user..."
            );


            const response =
                await window.StockFlowAPI.getUser(
                    identity
                );


            console.log(
                "[PROFILE] getUser response:",
                response
            );


            const remoteUser =
                normalizeUserResponse(
                    response
                );


            /*
             * Make sure the response actually
             * contains user information.
             */

            if (
                remoteUser &&
                typeof remoteUser ===
                    "object"
            ) {

                /*
                 * Combine stored identity and
                 * remote Google Sheet data.
                 *
                 * Remote data gets priority.
                 */

                return {
                    ...storedUser,
                    ...remoteUser
                };

            }


        } catch (error) {

            console.warn(
                "[PROFILE] Unable to fetch user from API:",
                error
            );

        }


        /*
         * If the API request fails,
         * use the authenticated stored user.
         */

        return storedUser || null;

    };


    /* =====================================================
       POPULATE PROFILE
    ===================================================== */

    const populateProfile = (
        user
    ) => {

        if (!user) {

            console.warn(
                "[PROFILE] No user data available."
            );

            return;

        }


        console.log(
            "[PROFILE] Populating profile:",
            user
        );


        /* -------------------------------------------------
           FULL NAME
        ------------------------------------------------- */

        const name =
            getValue(
                user,

                "name",
                "fullName",
                "full_name",

                "NAME",
                "FULL_NAME",

                "displayName",
                "DISPLAY_NAME",

                "username",
                "USERNAME"
            );


        /* -------------------------------------------------
           ROLE
        ------------------------------------------------- */

        const role =
            getValue(
                user,

                "role",
                "ROLE",

                "position",
                "POSITION",

                "designation",
                "DESIGNATION",

                "accountRole",
                "ACCOUNT_ROLE"
            );


        /* -------------------------------------------------
           EMAIL
        ------------------------------------------------- */

        const email =
            getValue(
                user,

                "email",
                "EMAIL",

                "gmail",
                "GMAIL"
            );


        /* -------------------------------------------------
           PHONE
        ------------------------------------------------- */

        const phone =
            getValue(
                user,

                "phone",
                "PHONE",

                "phoneNumber",
                "PHONE_NUMBER",

                "phone_no",
                "PHONE_NO",

                "mobile",
                "MOBILE",

                "contactNumber",
                "CONTACT_NUMBER"
            );


        console.log(
            "[PROFILE] Display values:",
            {
                name,
                role,
                email,
                phone
            }
        );


        /* -------------------------------------------------
           ELEMENTS
        ------------------------------------------------- */

        const nameElement =
            getElement(
                "[data-user-name]"
            );


        const roleElement =
            getElement(
                "[data-user-role]"
            );


        const emailElement =
            getElement(
                "[data-user-email]"
            );


        const phoneElement =
            getElement(
                "[data-user-phone]"
            );


        /* -------------------------------------------------
           DISPLAY
        ------------------------------------------------- */

        if (nameElement) {

            nameElement.textContent =
                name;

        }


        if (roleElement) {

            roleElement.textContent =
                role;

        }


        if (emailElement) {

            emailElement.textContent =
                email;

        }


        if (phoneElement) {

            phoneElement.textContent =
                phone;

        }

    };


    /* =====================================================
       AUTHENTICATED USER
    ===================================================== */

    const initializeAuthentication = async () => {

        /*
         * We intentionally DO NOT use:
         *
         * StockFlowAuth.requireAuth()
         *
         * because the current auth.js you provided
         * exposes StockFlowAuthUI instead.
         *
         * The Profile page will use the existing
         * StockFlowAPI session/storage system.
         */


        if (
            !window.StockFlowAPI
        ) {

            console.error(
                "[PROFILE] StockFlowAPI is not available."
            );

            return null;

        }


        /* -------------------------------------------------
           GET STORED USER
        ------------------------------------------------- */

        let storedUser = null;


        try {

            if (
                typeof
                window.StockFlowAPI.getStoredUser ===
                    "function"
            ) {

                storedUser =
                    window.StockFlowAPI.getStoredUser();

            }

        } catch (error) {

            console.warn(
                "[PROFILE] Unable to read stored user:",
                error
            );

        }


        console.log(
            "[PROFILE] Stored user:",
            storedUser
        );


        /* -------------------------------------------------
           VERIFY SESSION
        ------------------------------------------------- */

        try {

            if (
                typeof
                window.StockFlowAPI.session ===
                    "function"
            ) {

                const session =
                    await window.StockFlowAPI.session();


                console.log(
                    "[PROFILE] Session response:",
                    session
                );


                /*
                 * If the session contains a user,
                 * merge it with the stored user.
                 */

                const sessionUser =
                    normalizeUserResponse(
                        session
                    );


                if (
                    sessionUser &&
                    typeof sessionUser ===
                        "object"
                ) {

                    storedUser = {

                        ...(storedUser || {}),

                        ...sessionUser

                    };

                }

            }

        } catch (error) {

            console.warn(
                "[PROFILE] Session verification failed:",
                error
            );

            /*
             * Do NOT immediately redirect.
             *
             * We still try the stored user.
             */

        }


        /* -------------------------------------------------
           IF NO USER
        ------------------------------------------------- */

        if (!storedUser) {

            console.warn(
                "[PROFILE] No authenticated user found."
            );

            return null;

        }


        /* -------------------------------------------------
           GET FULL USER RECORD
        ------------------------------------------------- */

        const fullUser =
            await fetchCurrentUser(
                storedUser
            );


        return fullUser || storedUser;

    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupMobileMenu = () => {

        const menuButton =
            document.querySelector(
                "[data-menu]"
            );


        const sidebar =
            document.querySelector(
                ".sf-side"
            );


        if (
            !menuButton ||
            !sidebar
        ) {

            return;

        }


        let overlay =
            document.querySelector(
                ".profile-sidebar-overlay"
            );


        if (!overlay) {

            overlay =
                document.createElement(
                    "div"
                );


            overlay.className =
                "profile-sidebar-overlay";


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


            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );


            document.body.style.overflow =
                "";

        };


        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    sidebar.classList.toggle(
                        "open"
                    );


                overlay.classList.toggle(
                    "show",
                    isOpen
                );


                menuButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );


                document.body.style.overflow =
                    isOpen
                        ? "hidden"
                        : "";

            }
        );


        overlay.addEventListener(
            "click",
            closeMenu
        );


        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        closeMenu
                    );

                }
            );


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

    };


    /* =====================================================
       PROFILE SIDEBAR MOBILE STYLES
    ===================================================== */

    const injectMobileStyles = () => {

        if (
            document.getElementById(
                "profileMobileStyles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "profileMobileStyles";


        style.textContent = `

            @media (max-width: 850px) {

                .sf-side {
                    position: fixed !important;
                    top: 0;
                    left: 0;

                    width: 280px !important;
                    height: 100vh !important;

                    z-index: 2000;

                    transform:
                        translateX(-100%);

                    transition:
                        transform 0.22s ease;

                    overflow-y: auto;
                }

                .sf-side.open {
                    transform:
                        translateX(0);
                }

                .sf-side .sf-nav {
                    display: flex;
                }

                .profile-sidebar-overlay {
                    position: fixed;

                    inset: 0;

                    z-index: 1900;

                    background:
                        rgba(
                            4,
                            13,
                            27,
                            0.55
                        );

                    opacity: 0;

                    visibility: hidden;

                    transition:
                        opacity 0.22s ease,
                        visibility 0.22s ease;
                }

                .profile-sidebar-overlay.show {
                    opacity: 1;

                    visibility: visible;
                }

            }

        `;


        document.head.appendChild(
            style
        );

    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const setupLogout = () => {

        const logoutButton =
            document.getElementById(
                "logoutBtn"
            );


        if (!logoutButton) {

            return;

        }


        logoutButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                try {

                    if (
                        window.StockFlowAPI &&
                        typeof
                        window.StockFlowAPI.logout ===
                            "function"
                    ) {

                        await
                            window.StockFlowAPI.logout();

                        window.location.href =
                            "auth.html";

                        return;

                    }

                } catch (error) {

                    console.warn(
                        "[PROFILE] Logout API failed:",
                        error
                    );

                }


                /*
                 * Fallback only for Profile page.
                 */

                try {

                    sessionStorage.clear();

                } catch (_) {}


                window.location.href =
                    "auth.html";

            }
        );

    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize = async () => {

        console.log(
            "[PROFILE] Initializing Profile..."
        );


        injectMobileStyles();

        setupMobileMenu();

        setupLogout();


        const user =
            await initializeAuthentication();


        if (!user) {

            console.warn(
                "[PROFILE] Profile user could not be loaded."
            );

            return;

        }


        populateProfile(
            user
        );

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
