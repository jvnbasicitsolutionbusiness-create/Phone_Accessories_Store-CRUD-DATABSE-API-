/* =========================================================
   STOCKFLOW — AUTHENTICATION CONTROLLER
   File: auth.js
   Purpose:
   - Login
   - Registration
   - OTP verification
   - Session handling
   - Logout
   - Protected-page authentication
   ========================================================= */

(function () {
    "use strict";

    const API = window.StockFlowAPI || window.API;

    if (!API) {
        console.error("STOCKFLOW: API module is not loaded.");
        return;
    }

    const STORAGE = {
        TOKEN: "STOCKFLOW_TOKEN",
        USER: "STOCKFLOW_USER",
        OTP_EMAIL: "STOCKFLOW_OTP_EMAIL",
        OTP_PHONE: "STOCKFLOW_OTP_PHONE",
        OTP_UID: "STOCKFLOW_OTP_UID",
        OTP_CHANNEL: "STOCKFLOW_OTP_CHANNEL"
    };

    /* =========================================================
       STORAGE HELPERS
       ========================================================= */

    function saveSession(token, user) {
        if (token) {
            sessionStorage.setItem(STORAGE.TOKEN, token);
        }

        if (user) {
            sessionStorage.setItem(
                STORAGE.USER,
                JSON.stringify(user)
            );
        }
    }

    function getToken() {
        return sessionStorage.getItem(STORAGE.TOKEN) || "";
    }

    function getUser() {
        const raw = sessionStorage.getItem(STORAGE.USER);

        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            console.error(
                "STOCKFLOW: Invalid stored user session.",
                error
            );

            sessionStorage.removeItem(STORAGE.USER);
            return null;
        }
    }

    function clearSession() {
        sessionStorage.removeItem(STORAGE.TOKEN);
        sessionStorage.removeItem(STORAGE.USER);

        clearOtpState();
    }

    function saveOtpState(data) {
        if (!data) return;

        if (data.email) {
            sessionStorage.setItem(
                STORAGE.OTP_EMAIL,
                data.email
            );
        }

        if (data.phone) {
            sessionStorage.setItem(
                STORAGE.OTP_PHONE,
                data.phone
            );
        }

        if (data.uid) {
            sessionStorage.setItem(
                STORAGE.OTP_UID,
                data.uid
            );
        }

        if (data.channel) {
            sessionStorage.setItem(
                STORAGE.OTP_CHANNEL,
                data.channel
            );
        }
    }

    function getOtpState() {
        return {
            email: sessionStorage.getItem(STORAGE.OTP_EMAIL) || "",
            phone: sessionStorage.getItem(STORAGE.OTP_PHONE) || "",
            uid: sessionStorage.getItem(STORAGE.OTP_UID) || "",
            channel: sessionStorage.getItem(STORAGE.OTP_CHANNEL) || ""
        };
    }

    function clearOtpState() {
        sessionStorage.removeItem(STORAGE.OTP_EMAIL);
        sessionStorage.removeItem(STORAGE.OTP_PHONE);
        sessionStorage.removeItem(STORAGE.OTP_UID);
        sessionStorage.removeItem(STORAGE.OTP_CHANNEL);
    }

    /* =========================================================
       UTILITY
       ========================================================= */

    function normalizeUser(user) {
        if (!user) return null;

        return {
            uid: user.uid || user.UID || "",
            name: user.name || user.NAME || "",
            username: user.username || user.USERNAME || "",
            email: user.email || user.gmail || user.GMAIL || "",
            phone: user.phone || user["PHONE NO."] || "",
            role: user.role || user.ROLE || "Employee",
            status: user.status || user.ACCOUNT_S || "ACTIVE",
            verified:
                user.verified === true ||
                user.verified === "TRUE" ||
                user.VERIFIED === true ||
                user.VERIFIED === "TRUE"
        };
    }

    function getRedirectByRole(user) {
        const role = String(
            user?.role || ""
        ).trim().toLowerCase();

        /*
         * STOCKFLOW currently uses the same dashboard
         * for normal authenticated users.
         *
         * Role-based routing can be extended later.
         */

        if (role === "admin" || role === "administrator") {
            return "dashboard.html";
        }

        if (role === "employee" || role === "staff") {
            return "dashboard.html";
        }

        return "dashboard.html";
    }

    function redirectAfterLogin(user) {
        window.location.href = getRedirectByRole(user);
    }

    function showMessage(message, type) {
        const selectors = [
            "#authAlert",
            "#loginAlert",
            "#registerAlert",
            "#message",
            ".auth-alert"
        ];

        let element = null;

        for (const selector of selectors) {
            element = document.querySelector(selector);

            if (element) {
                break;
            }
        }

        if (!element) {
            console.log(
                `[STOCKFLOW ${type || "INFO"}]`,
                message
            );
            return;
        }

        element.textContent = message;
        element.className =
            "auth-alert " +
            (type || "info");

        element.style.display = "block";
    }

    function hideMessage() {
        const selectors = [
            "#authAlert",
            "#loginAlert",
            "#registerAlert",
            "#message",
            ".auth-alert"
        ];

        selectors.forEach(function (selector) {
            const elements =
                document.querySelectorAll(selector);

            elements.forEach(function (element) {
                element.style.display = "none";
                element.textContent = "";
            });
        });
    }

    function setButtonLoading(button, loading, loadingText) {
        if (!button) return;

        if (loading) {
            button.dataset.originalText =
                button.textContent;

            button.disabled = true;
            button.classList.add("loading");

            button.textContent =
                loadingText || "Please wait...";
        } else {
            button.disabled = false;
            button.classList.remove("loading");

            if (button.dataset.originalText) {
                button.textContent =
                    button.dataset.originalText;
            }
        }
    }

    function isAuthenticated() {
        return Boolean(getToken() && getUser());
    }

    /* =========================================================
       LOGIN
       ========================================================= */

    async function login(credentials) {
        hideMessage();

        if (!credentials) {
            throw new Error(
                "Login information is required."
            );
        }

        const identity = String(
            credentials.email ||
            credentials.username ||
            credentials.identity ||
            ""
        ).trim();

        const password = String(
            credentials.password || ""
        );

        if (!identity) {
            throw new Error(
                "Please enter your email address."
            );
        }

        if (!password) {
            throw new Error(
                "Please enter your password."
            );
        }

        try {
            const result = await API.login({
                email: identity,
                username: identity,
                password: password
            });

            if (!result || result.success === false) {
                throw new Error(
                    result?.message ||
                    "Unable to sign in."
                );
            }

            /*
             * Some backend responses may return:
             * {
             *   token,
             *   user
             * }
             *
             * Others may return the user directly.
             */

            const token =
                result.token ||
                result.sessionToken ||
                result.data?.token ||
                "";

            const rawUser =
                result.user ||
                result.data?.user ||
                result.data ||
                null;

            const user = normalizeUser(rawUser);

            /*
             * If account requires OTP verification,
             * do NOT redirect to dashboard yet.
             */

            const requiresOtp =
                result.requiresOtp === true ||
                result.requireOtp === true ||
                result.otpRequired === true ||
                result.status === "OTP_REQUIRED" ||
                result.status === "VERIFY_REQUIRED" ||
                result.verified === false ||
                (user && user.verified === false);

            if (requiresOtp) {
                saveOtpState({
                    uid: user?.uid || result.uid || "",
                    email:
                        user?.email ||
                        result.email ||
                        identity,
                    phone:
                        user?.phone ||
                        result.phone ||
                        "",
                    channel:
                        result.channel ||
                        "EMAIL"
                });

                /*
                 * If the backend already created/sent the OTP,
                 * go directly to verification.
                 *
                 * Do NOT send another OTP here because that
                 * could overwrite the previous code.
                 */

                window.location.href =
                    "verify-otp.html";

                return result;
            }

            if (!token) {
                throw new Error(
                    "Login succeeded, but no session token was returned."
                );
            }

            if (!user) {
                throw new Error(
                    "Login succeeded, but account information was not returned."
                );
            }

            saveSession(token, user);
            clearOtpState();

            redirectAfterLogin(user);

            return result;

        } catch (error) {
            console.error(
                "STOCKFLOW login error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to sign in. Please try again.",
                "error"
            );

            throw error;
        }
    }

    /* =========================================================
       REGISTRATION
       ========================================================= */

    async function register(formData) {
        hideMessage();

        if (!formData) {
            throw new Error(
                "Registration information is required."
            );
        }

        const name = String(
            formData.name ||
            formData.fullName ||
            ""
        ).trim();

        const email = String(
            formData.email ||
            formData.gmail ||
            ""
        ).trim();

        const phone = String(
            formData.phone ||
            formData.phoneNo ||
            ""
        ).trim();

        const password = String(
            formData.password || ""
        );

        const role = String(
            formData.role ||
            "Employee"
        ).trim();

        if (!name) {
            throw new Error(
                "Please enter your full name."
            );
        }

        if (!email) {
            throw new Error(
                "Please enter your Gmail address."
            );
        }

        if (!isValidEmail(email)) {
            throw new Error(
                "Please enter a valid Gmail/email address."
            );
        }

        if (!phone) {
            throw new Error(
                "Please enter your phone number."
            );
        }

        if (!password) {
            throw new Error(
                "Please create a password."
            );
        }

        if (password.length < 6) {
            throw new Error(
                "Password must be at least 6 characters."
            );
        }

        try {
            const payload = {
                name: name,
                fullName: name,
                email: email,
                gmail: email,
                phone: phone,
                phoneNo: phone,
                password: password,
                role: role,

                /*
                 * Optional fields supported by the backend.
                 */

                age: formData.age || "",
                username: formData.username || "",
                adminKey:
                    formData.adminKey ||
                    formData.registrationKey ||
                    ""
            };

            const result =
                await API.register(payload);

            if (!result || result.success === false) {
                throw new Error(
                    result?.message ||
                    "Registration failed."
                );
            }

            /*
             * IMPORTANT:
             * Registration should NOT automatically create
             * an authenticated dashboard session.
             *
             * The account must verify the OTP first.
             */

            saveOtpState({
                uid:
                    result.uid ||
                    result.user?.uid ||
                    result.data?.uid ||
                    "",

                email:
                    result.email ||
                    result.user?.email ||
                    email,

                phone:
                    result.phone ||
                    result.user?.phone ||
                    phone,

                channel:
                    result.channel ||
                    "BOTH"
            });

            /*
             * Redirect to OTP verification.
             */

            window.location.href =
                "verify-otp.html";

            return result;

        } catch (error) {
            console.error(
                "STOCKFLOW registration error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to create your account.",
                "error"
            );

            throw error;
        }
    }

    /* =========================================================
       OTP VERIFICATION
       ========================================================= */

    async function verifyOtp(code) {
        const otp = String(
            code || ""
        ).replace(/\D/g, "");

        if (otp.length !== 6) {
            throw new Error(
                "Please enter the 6-digit verification code."
            );
        }

        const otpState = getOtpState();

        try {
            const result =
                await API.verifyOtp({
                    uid: otpState.uid,
                    email: otpState.email,
                    phone: otpState.phone,
                    otp: otp
                });

            if (!result || result.success === false) {
                throw new Error(
                    result?.message ||
                    "Invalid or expired verification code."
                );
            }

            /*
             * Successful OTP verification may return
             * a newly authenticated session.
             */

            const token =
                result.token ||
                result.sessionToken ||
                result.data?.token ||
                "";

            const rawUser =
                result.user ||
                result.data?.user ||
                null;

            if (token && rawUser) {
                const user =
                    normalizeUser(rawUser);

                saveSession(token, user);
                clearOtpState();

                redirectAfterLogin(user);

                return result;
            }

            /*
             * If verification succeeded but no token was
             * returned, send the user back to sign-in.
             */

            clearOtpState();

            window.location.href =
                "auth.html#login";

            return result;

        } catch (error) {
            console.error(
                "STOCKFLOW OTP verification error:",
                error
            );

            throw error;
        }
    }

    /* =========================================================
       RESEND OTP
       ========================================================= */

    async function resendOtp() {
        const otpState = getOtpState();

        if (
            !otpState.uid &&
            !otpState.email &&
            !otpState.phone
        ) {
            throw new Error(
                "Verification session could not be found. Please register or sign in again."
            );
        }

        try {
            const result =
                await API.resendOtp({
                    uid: otpState.uid,
                    email: otpState.email,
                    phone: otpState.phone
                });

            if (!result || result.success === false) {
                throw new Error(
                    result?.message ||
                    "Unable to resend verification code."
                );
            }

            saveOtpState({
                uid:
                    result.uid ||
                    otpState.uid,

                email:
                    result.email ||
                    otpState.email,

                phone:
                    result.phone ||
                    otpState.phone,

                channel:
                    result.channel ||
                    otpState.channel
            });

            return result;

        } catch (error) {
            console.error(
                "STOCKFLOW resend OTP error:",
                error
            );

            throw error;
        }
    }

    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout() {
        const token = getToken();

        try {
            if (token && API.logout) {
                await API.logout({
                    token: token
                });
            }
        } catch (error) {
            console.warn(
                "STOCKFLOW logout request failed:",
                error
            );
        } finally {
            clearSession();

            window.location.replace(
                "auth.html#login"
            );
        }
    }

    /* =========================================================
       PROTECTED PAGE
       ========================================================= */

    function requireAuth(options) {
        options = options || {};

        const redirect =
            options.redirect ||
            "auth.html#login";

        const token = getToken();
        const user = getUser();

        if (!token || !user) {
            sessionStorage.setItem(
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",
                window.location.href
            );

            window.location.replace(
                redirect
            );

            return false;
        }

        /*
         * Check account status locally.
         */

        const status =
            String(
                user.status || "ACTIVE"
            ).toUpperCase();

        if (
            status === "DISABLED" ||
            status === "BLOCKED" ||
            status === "SUSPENDED" ||
            status === "REJECTED"
        ) {
            clearSession();

            window.location.replace(
                redirect
            );

            return false;
        }

        /*
         * Optional role protection.
         */

        if (options.roles) {
            const allowedRoles =
                Array.isArray(options.roles)
                    ? options.roles
                    : [options.roles];

            const currentRole =
                String(
                    user.role || ""
                ).toLowerCase();

            const allowed =
                allowedRoles.some(
                    function (role) {
                        return (
                            String(role)
                                .toLowerCase() ===
                            currentRole
                        );
                    }
                );

            if (!allowed) {
                console.warn(
                    "STOCKFLOW: User role is not authorized for this page."
                );

                window.location.replace(
                    "dashboard.html"
                );

                return false;
            }
        }

        return true;
    }

    /* =========================================================
       SESSION VALIDATION
       ========================================================= */

    async function validateSession() {
        const token = getToken();

        if (!token) {
            return false;
        }

        try {
            if (!API.session) {
                return true;
            }

            const result =
                await API.session({
                    token: token
                });

            if (
                !result ||
                result.success === false
            ) {
                clearSession();
                return false;
            }

            const rawUser =
                result.user ||
                result.data?.user ||
                null;

            if (rawUser) {
                const user =
                    normalizeUser(rawUser);

                sessionStorage.setItem(
                    STORAGE.USER,
                    JSON.stringify(user)
                );
            }

            return true;

        } catch (error) {
            console.warn(
                "STOCKFLOW session validation failed:",
                error
            );

            /*
             * Do not immediately destroy a session because
             * a temporary network error occurred.
             */

            return Boolean(
                getToken() &&
                getUser()
            );
        }
    }

    /* =========================================================
       EMAIL VALIDATION
       ========================================================= */

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);
    }

    /* =========================================================
       PASSWORD TOGGLE
       ========================================================= */

    function togglePassword(inputId, button) {
        const input =
            document.getElementById(inputId);

        if (!input) return;

        const isPassword =
            input.type === "password";

        input.type =
            isPassword
                ? "text"
                : "password";

        if (button) {
            button.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

            button.classList.toggle(
                "active",
                isPassword
            );
        }
    }

    /* =========================================================
       AUTH PAGE INITIALIZATION
       ========================================================= */

    function initializeAuthPage() {
        /*
         * Only execute auth-page logic when auth.html
         * is actually open.
         */

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        const isAuthPage =
            path === "auth.html" ||
            path === "register.html" ||
            path === "" ||
            path === "index.html";

        if (!isAuthPage) {
            return;
        }

        /*
         * If a valid session already exists, don't leave the
         * authenticated user sitting on the login page.
         */

        if (isAuthenticated()) {
            const hash =
                window.location.hash
                    .toLowerCase();

            /*
             * Allow the user to explicitly open login
             * only when they are not authenticated.
             */

            if (
                hash !== "#login" &&
                hash !== "#register"
            ) {
                redirectAfterLogin(
                    getUser()
                );

                return;
            }
        }

        setupAuthForms();
        setupPasswordToggles();
        setupAuthTabs();
    }

    /* =========================================================
       AUTH FORMS
       ========================================================= */

    function setupAuthForms() {
        const loginForm =
            document.querySelector(
                "#loginForm"
            );

        const registerForm =
            document.querySelector(
                "#registerForm"
            );

        if (loginForm) {
            loginForm.addEventListener(
                "submit",
                async function (event) {
                    event.preventDefault();

                    const submitButton =
                        loginForm.querySelector(
                            'button[type="submit"]'
                        );

                    const form =
                        new FormData(loginForm);

                    const email =
                        form.get("email") ||
                        form.get("gmail") ||
                        form.get("username") ||
                        "";

                    const password =
                        form.get("password") ||
                        "";

                    try {
                        setButtonLoading(
                            submitButton,
                            true,
                            "Signing in..."
                        );

                        await login({
                            email: email,
                            password: password
                        });

                    } catch (error) {
                        console.error(error);
                    } finally {
                        setButtonLoading(
                            submitButton,
                            false
                        );
                    }
                }
            );
        }

        if (registerForm) {
            registerForm.addEventListener(
                "submit",
                async function (event) {
                    event.preventDefault();

                    const submitButton =
                        registerForm.querySelector(
                            'button[type="submit"]'
                        );

                    const form =
                        new FormData(
                            registerForm
                        );

                    const payload = {};

                    form.forEach(
                        function (value, key) {
                            payload[key] =
                                value;
                        }
                    );

                    try {
                        setButtonLoading(
                            submitButton,
                            true,
                            "Creating account..."
                        );

                        await register(
                            payload
                        );

                    } catch (error) {
                        console.error(error);
                    } finally {
                        setButtonLoading(
                            submitButton,
                            false
                        );
                    }
                }
            );
        }
    }

    /* =========================================================
       AUTH TABS
       ========================================================= */

    function setupAuthTabs() {
        const loginTab =
            document.querySelector(
                '[data-auth-tab="login"]'
            );

        const registerTab =
            document.querySelector(
                '[data-auth-tab="register"]'
            );

        const loginView =
            document.querySelector(
                "#loginView"
            );

        const registerView =
            document.querySelector(
                "#registerView"
            );

        function showLogin() {
            if (loginView) {
                loginView.classList.remove(
                    "hidden"
                );
            }

            if (registerView) {
                registerView.classList.add(
                    "hidden"
                );
            }

            if (loginTab) {
                loginTab.classList.add(
                    "active"
                );
            }

            if (registerTab) {
                registerTab.classList.remove(
                    "active"
                );
            }

            window.location.hash =
                "login";
        }

        function showRegister() {
            if (loginView) {
                loginView.classList.add(
                    "hidden"
                );
            }

            if (registerView) {
                registerView.classList.remove(
                    "hidden"
                );
            }

            if (loginTab) {
                loginTab.classList.remove(
                    "active"
                );
            }

            if (registerTab) {
                registerTab.classList.add(
                    "active"
                );
            }

            window.location.hash =
                "register";
        }

        if (loginTab) {
            loginTab.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    showLogin();
                }
            );
        }

        if (registerTab) {
            registerTab.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    showRegister();
                }
            );
        }

        /*
         * Support existing links such as:
         * href="#login"
         * href="#register"
         */

        document.addEventListener(
            "click",
            function (event) {
                const target =
                    event.target.closest(
                        '[data-show-auth]'
                    );

                if (!target) return;

                const view =
                    target.dataset.showAuth;

                event.preventDefault();

                if (
                    view === "register"
                ) {
                    showRegister();
                } else {
                    showLogin();
                }
            }
        );

        function loadHash() {
            const hash =
                window.location.hash
                    .toLowerCase();

            if (
                hash === "#register"
            ) {
                showRegister();
            } else {
                showLogin();
            }
        }

        window.addEventListener(
            "hashchange",
            loadHash
        );

        loadHash();
    }

    /* =========================================================
       PASSWORD TOGGLE INITIALIZATION
       ========================================================= */

    function setupPasswordToggles() {
        document.addEventListener(
            "click",
            function (event) {
                const button =
                    event.target.closest(
                        "[data-toggle-password]"
                    );

                if (!button) return;

                event.preventDefault();

                const inputId =
                    button.dataset
                        .togglePassword;

                togglePassword(
                    inputId,
                    button
                );
            }
        );
    }

    /* =========================================================
       GLOBAL EVENT HANDLERS
       ========================================================= */

    function setupGlobalLogout() {
        document.addEventListener(
            "click",
            function (event) {
                const logoutButton =
                    event.target.closest(
                        "[data-logout]"
                    );

                if (!logoutButton) {
                    return;
                }

                event.preventDefault();

                logout();
            }
        );
    }

    /* =========================================================
       AUTO SESSION CHECK FOR NON-AUTH PAGES
       ========================================================= */

    function initializeProtectedPage() {
        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        const publicPages = [
            "",
            "index.html",
            "auth.html",
            "register.html",
            "verify.html",
            "verify-otp.html",
            "forgotpassword.html"
        ];

        if (
            publicPages.includes(path)
        ) {
            return;
        }

        /*
         * Any STOCKFLOW module page is protected.
         */

        requireAuth();
    }

    /* =========================================================
       CURRENT USER UI
       ========================================================= */

    function populateCurrentUser() {
        const user =
            getUser();

        if (!user) return;

        const name =
            user.name ||
            "STOCKFLOW User";

        const email =
            user.email ||
            "";

        const role =
            user.role ||
            "Employee";

        document
            .querySelectorAll(
                "[data-user-name]"
            )
            .forEach(function (element) {
                element.textContent =
                    name;
            });

        document
            .querySelectorAll(
                "[data-user-email]"
            )
            .forEach(function (element) {
                element.textContent =
                    email;
            });

        document
            .querySelectorAll(
                "[data-user-role]"
            )
            .forEach(function (element) {
                element.textContent =
                    role;
            });

        document
            .querySelectorAll(
                "[data-user-initials]"
            )
            .forEach(function (element) {
                element.textContent =
                    getInitials(name);
            });
    }

    function getInitials(name) {
        const words =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (!words.length) {
            return "SF";
        }

        if (words.length === 1) {
            return words[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase();
    }

    /* =========================================================
       PREVENT BACK BUTTON AFTER LOGOUT
       ========================================================= */

    function setupHistoryProtection() {
        if (!isAuthenticated()) {
            return;
        }

        window.history.replaceState(
            null,
            document.title,
            window.location.href
        );
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.StockFlowAuth = {
        login: login,
        register: register,

        verifyOtp: verifyOtp,
        resendOtp: resendOtp,

        logout: logout,

        getToken: getToken,
        getUser: getUser,

        saveSession: saveSession,
        clearSession: clearSession,

        isAuthenticated:
            isAuthenticated,

        requireAuth:
            requireAuth,

        validateSession:
            validateSession,

        getOtpState:
            getOtpState,

        clearOtpState:
            clearOtpState,

        togglePassword:
            togglePassword,

        getInitials:
            getInitials
    };

    /*
     * Backward-compatible alias.
     */
    window.Auth =
        window.StockFlowAuth;

    /* =========================================================
       DOCUMENT READY
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        function () {
            initializeAuthPage();
            initializeProtectedPage();
            setupGlobalLogout();
            populateCurrentUser();
            setupHistoryProtection();
        }
    );

})();
