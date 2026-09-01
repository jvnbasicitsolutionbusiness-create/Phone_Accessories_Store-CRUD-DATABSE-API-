/* =========================================================
   AUTH.JS
   Resident Authentication & Session Manager
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEYS = {
        USER: "brsp_current_user",
        TOKEN: "brsp_auth_token",
        SESSION: "brsp_session",
        ROLE: "brsp_user_role"
    };

    const DEFAULT_LOGIN_PAGE = "login.html";
    const DEFAULT_DASHBOARD_PAGE = "dashboard.html";

    const Auth = {

        /* =====================================================
           INITIALIZATION
           ===================================================== */

        init() {
            this.restoreSession();
            this.protectPage();
        },


        /* =====================================================
           SESSION
           ===================================================== */

        saveSession(sessionData) {
            if (!sessionData) return false;

            try {
                const user =
                    sessionData.user ||
                    sessionData.account ||
                    sessionData.profile ||
                    sessionData;

                const token =
                    sessionData.token ||
                    sessionData.accessToken ||
                    sessionData.idToken ||
                    "";

                const role =
                    sessionData.role ||
                    user.role ||
                    user.userRole ||
                    "resident";

                localStorage.setItem(
                    STORAGE_KEYS.USER,
                    JSON.stringify(user)
                );

                localStorage.setItem(
                    STORAGE_KEYS.ROLE,
                    String(role)
                );

                if (token) {
                    localStorage.setItem(
                        STORAGE_KEYS.TOKEN,
                        String(token)
                    );
                }

                localStorage.setItem(
                    STORAGE_KEYS.SESSION,
                    JSON.stringify({
                        authenticated: true,
                        loginAt: new Date().toISOString()
                    })
                );

                return true;

            } catch (error) {
                console.error("Unable to save authentication session:", error);
                return false;
            }
        },


        restoreSession() {
            try {
                const session = localStorage.getItem(
                    STORAGE_KEYS.SESSION
                );

                const user = localStorage.getItem(
                    STORAGE_KEYS.USER
                );

                if (!session || !user) {
                    return false;
                }

                const parsedSession = JSON.parse(session);

                if (parsedSession.authenticated !== true) {
                    this.clearSession();
                    return false;
                }

                return true;

            } catch (error) {
                console.error("Unable to restore session:", error);
                this.clearSession();
                return false;
            }
        },


        isAuthenticated() {
            try {
                const session = localStorage.getItem(
                    STORAGE_KEYS.SESSION
                );

                const user = localStorage.getItem(
                    STORAGE_KEYS.USER
                );

                if (!session || !user) {
                    return false;
                }

                const parsedSession = JSON.parse(session);

                return parsedSession.authenticated === true;

            } catch (error) {
                return false;
            }
        },


        getCurrentUser() {
            try {
                const user = localStorage.getItem(
                    STORAGE_KEYS.USER
                );

                if (!user) {
                    return null;
                }

                return JSON.parse(user);

            } catch (error) {
                console.error("Unable to read current user:", error);
                return null;
            }
        },


        getToken() {
            return localStorage.getItem(
                STORAGE_KEYS.TOKEN
            ) || "";
        },


        getRole() {
            const user = this.getCurrentUser();

            return (
                localStorage.getItem(STORAGE_KEYS.ROLE) ||
                user?.role ||
                user?.userRole ||
                "resident"
            ).toLowerCase();
        },


        getSession() {
            try {
                const session = localStorage.getItem(
                    STORAGE_KEYS.SESSION
                );

                return session
                    ? JSON.parse(session)
                    : null;

            } catch (error) {
                return null;
            }
        },


        /* =====================================================
           PAGE PROTECTION
           ===================================================== */

        protectPage(options = {}) {

            const requireAuth =
                options.requireAuth !== false;

            if (!requireAuth) {
                return true;
            }

            if (!this.isAuthenticated()) {
                this.redirectToLogin();
                return false;
            }

            return true;
        },


        redirectToLogin() {

            const currentPage =
                window.location.pathname.split("/").pop();

            if (
                currentPage === DEFAULT_LOGIN_PAGE ||
                currentPage === "" ||
                currentPage === "/"
            ) {
                return;
            }

            const returnUrl =
                encodeURIComponent(
                    window.location.href
                );

            window.location.href =
                `${DEFAULT_LOGIN_PAGE}?returnUrl=${returnUrl}`;
        },


        /* =====================================================
           ROLE PROTECTION
           ===================================================== */

        requireRole(allowedRoles = []) {

            if (!this.isAuthenticated()) {
                this.redirectToLogin();
                return false;
            }

            if (!Array.isArray(allowedRoles)) {
                allowedRoles = [allowedRoles];
            }

            const currentRole = this.getRole();

            const normalizedRoles =
                allowedRoles.map(role =>
                    String(role).toLowerCase()
                );

            if (
                normalizedRoles.length > 0 &&
                !normalizedRoles.includes(currentRole)
            ) {
                console.warn(
                    `Access denied for role: ${currentRole}`
                );

                this.redirectToDashboard();
                return false;
            }

            return true;
        },


        /* =====================================================
           LOGOUT
           ===================================================== */

        async logout(options = {}) {

            const redirect =
                options.redirect !== false;

            const redirectPage =
                options.redirectPage ||
                DEFAULT_LOGIN_PAGE;

            try {

                /*
                 * If API.js provides a server-side logout method,
                 * use it before clearing the local session.
                 */
                if (
                    window.API &&
                    typeof window.API.logout === "function"
                ) {
                    try {
                        await window.API.logout();
                    } catch (apiError) {
                        console.warn(
                            "Server logout request failed:",
                            apiError
                        );
                    }
                }

            } finally {

                this.clearSession();

                if (redirect) {
                    window.location.href = redirectPage;
                }
            }
        },


        clearSession() {

            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });

            /*
             * Remove common temporary authentication values.
             */
            [
                "otp",
                "otpCode",
                "verificationCode",
                "pendingVerification",
                "loginEmail",
                "registrationData",
                "authUser"
            ].forEach(key => {
                sessionStorage.removeItem(key);
                localStorage.removeItem(key);
            });
        },


        /* =====================================================
           DASHBOARD REDIRECT
           ===================================================== */

        redirectToDashboard() {

            window.location.href =
                DEFAULT_DASHBOARD_PAGE;
        },


        /* =====================================================
           USER INFORMATION
           ===================================================== */

        getUserId() {

            const user = this.getCurrentUser();

            if (!user) {
                return "";
            }

            return (
                user.id ||
                user.userId ||
                user.accountId ||
                user.residentId ||
                user.resident_id ||
                ""
            );
        },


        getUserName() {

            const user = this.getCurrentUser();

            if (!user) {
                return "Resident";
            }

            return (
                user.fullName ||
                user.full_name ||
                user.name ||
                [
                    user.firstName,
                    user.middleName,
                    user.lastName
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim() ||
                "Resident"
            );
        },


        getUserEmail() {

            const user = this.getCurrentUser();

            return (
                user?.email ||
                user?.emailAddress ||
                ""
            );
        },


        getUserPhone() {

            const user = this.getCurrentUser();

            return (
                user?.phone ||
                user?.phoneNumber ||
                user?.mobile ||
                ""
            );
        },


        /* =====================================================
           AUTHORIZATION HEADER
           ===================================================== */

        getAuthorizationHeader() {

            const token = this.getToken();

            if (!token) {
                return {};
            }

            return {
                Authorization: `Bearer ${token}`
            };
        },


        /* =====================================================
           API AUTHENTICATION CHECK
           ===================================================== */

        async verifySession() {

            if (!this.isAuthenticated()) {
                return false;
            }

            /*
             * If API.js exposes a session verification function,
             * verify against the backend.
             */
            if (
                window.API &&
                typeof window.API.verifySession === "function"
            ) {
                try {

                    const response =
                        await window.API.verifySession();

                    if (
                        response &&
                        response.success === false
                    ) {
                        this.clearSession();
                        return false;
                    }

                } catch (error) {

                    console.warn(
                        "Backend session verification unavailable:",
                        error
                    );

                    /*
                     * Do not immediately log the resident out
                     * just because the backend verification
                     * endpoint is temporarily unavailable.
                     */
                }
            }

            return true;
        },


        /* =====================================================
           HANDLE LOGIN RESPONSE
           ===================================================== */

        handleLoginSuccess(response) {

            if (!response) {
                return false;
            }

            const success =
                response.success !== false;

            if (!success) {
                return false;
            }

            const sessionData =
                response.data ||
                response.result ||
                response;

            return this.saveSession(sessionData);
        },


        /* =====================================================
           AUTHENTICATION EVENTS
           ===================================================== */

        onLogin(callback) {

            window.addEventListener(
                "auth:login",
                event => {

                    if (
                        typeof callback === "function"
                    ) {
                        callback(
                            event.detail || {}
                        );
                    }
                }
            );
        },


        onLogout(callback) {

            window.addEventListener(
                "auth:logout",
                event => {

                    if (
                        typeof callback === "function"
                    ) {
                        callback(
                            event.detail || {}
                        );
                    }
                }
            );
        },


        dispatchLoginEvent(user) {

            window.dispatchEvent(
                new CustomEvent(
                    "auth:login",
                    {
                        detail: { user }
                    }
                )
            );
        },


        dispatchLogoutEvent() {

            window.dispatchEvent(
                new CustomEvent(
                    "auth:logout",
                    {
                        detail: {}
                    }
                )
            );
        }
    };


    /* =========================================================
       GLOBAL ACCESS
       ========================================================= */

    window.Auth = Auth;


    /* =========================================================
       AUTO INITIALIZATION
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();

            /*
             * Login/register pages should remain accessible
             * without authentication.
             */
            const publicPages = [
                "login.html",
                "register.html",
                "registration.html",
                "verify.html",
                "otp.html",
                "forgot-password.html",
                "reset-password.html"
            ];

            if (!publicPages.includes(currentPage)) {
                Auth.init();
            }
        }
    );

})();
