/* =========================================================
   STOCKFLOW — AUTHENTICATION CONTROLLER
   File: auth.js

   Handles:
   - Login
   - Employee registration
   - Form validation
   - OTP verification
   - Session handling
   - Logout
   - Protected pages
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
       STORAGE
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
            email:
                sessionStorage.getItem(
                    STORAGE.OTP_EMAIL
                ) || "",

            phone:
                sessionStorage.getItem(
                    STORAGE.OTP_PHONE
                ) || "",

            uid:
                sessionStorage.getItem(
                    STORAGE.OTP_UID
                ) || "",

            channel:
                sessionStorage.getItem(
                    STORAGE.OTP_CHANNEL
                ) || ""
        };
    }

    function clearOtpState() {
        sessionStorage.removeItem(STORAGE.OTP_EMAIL);
        sessionStorage.removeItem(STORAGE.OTP_PHONE);
        sessionStorage.removeItem(STORAGE.OTP_UID);
        sessionStorage.removeItem(STORAGE.OTP_CHANNEL);
    }

    /* =========================================================
       USER HELPERS
       ========================================================= */

    function normalizeUser(user) {
        if (!user) return null;

        return {
            uid: user.uid || user.UID || "",
            name: user.name || user.NAME || "",
            username: user.username || user.USERNAME || "",
            email:
                user.email ||
                user.gmail ||
                user.GMAIL ||
                "",
            phone:
                user.phone ||
                user["PHONE NO."] ||
                "",
            role:
                user.role ||
                user.ROLE ||
                "Employee",
            status:
                user.status ||
                user.ACCOUNT_S ||
                "ACTIVE",
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
        )
            .trim()
            .toLowerCase();

        if (
            role === "admin" ||
            role === "administrator"
        ) {
            return "dashboard.html";
        }

        return "dashboard.html";
    }

    function redirectAfterLogin(user) {
        window.location.href =
            getRedirectByRole(user);
    }

    function isAuthenticated() {
        return Boolean(
            getToken() &&
            getUser()
        );
    }

    /* =========================================================
       MESSAGE HELPERS
       ========================================================= */

    function showMessage(message, type) {
        const selectors = [
            "#authAlert",
            "#loginAlert",
            "#registerAlert",
            "#message",
            "#loginMessage",
            "#registerMessage",
            ".auth-alert"
        ];

        let element = null;

        for (const selector of selectors) {
            element =
                document.querySelector(selector);

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

        element.textContent =
            message;

        element.className =
            "auth-message " +
            (type || "info");

        element.style.display =
            "block";
    }

    function hideMessage() {
        const selectors = [
            "#authAlert",
            "#loginAlert",
            "#registerAlert",
            "#message",
            "#loginMessage",
            "#registerMessage",
            ".auth-alert"
        ];

        selectors.forEach(
            function (selector) {
                document
                    .querySelectorAll(selector)
                    .forEach(
                        function (element) {
                            element.style.display =
                                "none";

                            element.textContent =
                                "";

                            element.classList.remove(
                                "error",
                                "success",
                                "info"
                            );
                        }
                    );
            }
        );
    }

    /* =========================================================
       BUTTON STATES
       ========================================================= */

    function setButtonLoading(
        button,
        loading,
        loadingText,
        normalText
    ) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.classList.add(
                "loading"
            );

            /*
             * textContent completely replaces the previous
             * button contents. This prevents:
             *
             * Create Employee Account
             * +
             * Creating account...
             *
             * from appearing together.
             */

            button.textContent =
                loadingText ||
                "Please wait...";
        } else {
            button.disabled = false;
            button.classList.remove(
                "loading"
            );

            button.textContent =
                normalText ||
                "Submit";
        }
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
            const result =
                await API.login({
                    email: identity,
                    username: identity,
                    password: password
                });

            if (
                !result ||
                result.success === false
            ) {
                throw new Error(
                    result?.message ||
                    "Unable to sign in."
                );
            }

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

            const user =
                normalizeUser(rawUser);

            const requiresOtp =
                result.requiresOtp === true ||
                result.requireOtp === true ||
                result.otpRequired === true ||
                result.status ===
                    "OTP_REQUIRED" ||
                result.status ===
                    "VERIFY_REQUIRED" ||
                result.verified === false ||
                (user &&
                    user.verified === false);

            if (requiresOtp) {
                saveOtpState({
                    uid:
                        user?.uid ||
                        result.uid ||
                        "",

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

                window.location.href =
                    "verify.html";

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

            saveSession(
                token,
                user
            );

            clearOtpState();

            redirectAfterLogin(
                user
            );

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
       REGISTRATION VALIDATION
       ========================================================= */

    const REGISTER_ERROR_TEXT =
        "Please fill up the form.";

    function getRegisterField(id) {
        return document.getElementById(id);
    }

    function getFieldWrapper(input) {
        if (!input) return null;

        return (
            input.closest(
                ".form-field"
            ) ||
            input.closest(
                ".password-field"
            ) ||
            input.parentElement
        );
    }

    function removeFieldError(input) {
        if (!input) return;

        input.classList.remove(
            "input-error",
            "error"
        );

        input.removeAttribute(
            "aria-invalid"
        );

        const wrapper =
            getFieldWrapper(input);

        if (!wrapper) return;

        const error =
            wrapper.querySelector(
                ".field-error-message"
            );

        if (error) {
            error.remove();
        }
    }

    function showFieldError(input) {
        if (!input) return;

        input.classList.add(
            "input-error",
            "error"
        );

        input.setAttribute(
            "aria-invalid",
            "true"
        );

        const wrapper =
            getFieldWrapper(input);

        if (!wrapper) return;

        let error =
            wrapper.querySelector(
                ".field-error-message"
            );

        if (!error) {
            error =
                document.createElement(
                    "div"
                );

            error.className =
                "field-error-message";

            error.textContent =
                REGISTER_ERROR_TEXT;

            wrapper.appendChild(
                error
            );
        }

        /*
         * Restart animation if the user clicks submit again.
         */
        input.classList.remove(
            "validation-shake"
        );

        void input.offsetWidth;

        input.classList.add(
            "validation-shake"
        );
    }

    function clearRegisterErrors() {
        const form =
            document.getElementById(
                "registerForm"
            );

        if (!form) return;

        form.querySelectorAll(
            ".input-error, .error"
        ).forEach(
            function (input) {
                input.classList.remove(
                    "input-error",
                    "error",
                    "validation-shake"
                );

                input.removeAttribute(
                    "aria-invalid"
                );
            }
        );

        form.querySelectorAll(
            ".field-error-message"
        ).forEach(
            function (element) {
                element.remove();
            }
        );
    }

    function validateRegistrationForm() {
        const form =
            document.getElementById(
                "registerForm"
            );

        if (!form) {
            return {
                valid: false,
                payload: {}
            };
        }

        clearRegisterErrors();

        const name =
            getRegisterField(
                "registerName"
            );

        const username =
            getRegisterField(
                "registerUsername"
            );

        const age =
            getRegisterField(
                "registerAge"
            );

        const email =
            getRegisterField(
                "registerEmail"
            );

        const phone =
            getRegisterField(
                "registerPhone"
            );

        const password =
            getRegisterField(
                "registerPassword"
            );

        const confirmPassword =
            getRegisterField(
                "registerConfirmPassword"
            );

        const fields = [
            name,
            username,
            age,
            email,
            phone,
            password,
            confirmPassword
        ];

        let firstInvalid = null;

        /*
         * Required field validation.
         */
        fields.forEach(
            function (field) {
                if (
                    !field ||
                    String(
                        field.value || ""
                    ).trim() === ""
                ) {
                    showFieldError(
                        field
                    );

                    if (
                        !firstInvalid
                    ) {
                        firstInvalid =
                            field;
                    }
                }
            }
        );

        /*
         * Stop here if anything is empty.
         */
        if (firstInvalid) {
            firstInvalid.focus();

            showMessage(
                REGISTER_ERROR_TEXT,
                "error"
            );

            return {
                valid: false,
                payload: {}
            };
        }

        /*
         * Email validation.
         */
        if (
            !isValidEmail(
                email.value.trim()
            )
        ) {
            showFieldError(
                email
            );

            email.focus();

            showMessage(
                "Please enter a valid Gmail/email address.",
                "error"
            );

            return {
                valid: false,
                payload: {}
            };
        }

        /*
         * Password length.
         */
        if (
            password.value.length <
            6
        ) {
            showFieldError(
                password
            );

            password.focus();

            showMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            return {
                valid: false,
                payload: {}
            };
        }

        /*
         * Password confirmation.
         */
        if (
            password.value !==
            confirmPassword.value
        ) {
            showFieldError(
                confirmPassword
            );

            confirmPassword.focus();

            showMessage(
                "Passwords do not match.",
                "error"
            );

            return {
                valid: false,
                payload: {}
            };
        }

        /*
         * Build payload directly from the actual inputs.
         *
         * This avoids depending entirely on FormData names.
         */
        const payload = {
            name:
                name.value.trim(),

            fullName:
                name.value.trim(),

            username:
                username.value.trim(),

            age:
                age.value.trim(),

            email:
                email.value.trim(),

            gmail:
                email.value.trim(),

            phone:
                phone.value.trim(),

            phoneNo:
                phone.value.trim(),

            password:
                password.value,

            role:
                "Employee"
        };

        return {
            valid: true,
            payload: payload
        };
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
            formData.password ||
            ""
        );

        const role = String(
            formData.role ||
            "Employee"
        ).trim();

        if (!name) {
            throw new Error(
                "Please fill up the form."
            );
        }

        if (!email) {
            throw new Error(
                "Please fill up the form."
            );
        }

        if (!isValidEmail(email)) {
            throw new Error(
                "Please enter a valid Gmail/email address."
            );
        }

        if (!phone) {
            throw new Error(
                "Please fill up the form."
            );
        }

        if (!password) {
            throw new Error(
                "Please fill up the form."
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

                age:
                    formData.age ||
                    "",

                username:
                    formData.username ||
                    "",

                adminKey:
                    formData.adminKey ||
                    formData.registrationKey ||
                    ""
            };

            const result =
                await API.register(
                    payload
                );

            if (
                !result ||
                result.success === false
            ) {
                throw new Error(
                    result?.message ||
                    "Registration failed."
                );
            }

            /*
             * Save information needed by verify.html.
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
             * IMPORTANT:
             *
             * Registration does not create a dashboard
             * session.
             *
             * The user must verify first.
             *
             * The 2.5 second delay is handled below.
             */
            await delay(
                2500
            );

            window.location.href =
                "verify.html";

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
       DELAY
       ========================================================= */

    function delay(milliseconds) {
        return new Promise(
            function (resolve) {
                setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    }

    /* =========================================================
       OTP VERIFICATION
       ========================================================= */

    async function verifyOtp(code) {
        const otp =
            String(code || "")
                .replace(/\D/g, "");

        if (otp.length !== 6) {
            throw new Error(
                "Please enter the 6-digit verification code."
            );
        }

        const otpState =
            getOtpState();

        try {
            const result =
                await API.verifyOtp({
                    uid:
                        otpState.uid,

                    email:
                        otpState.email,

                    phone:
                        otpState.phone,

                    otp:
                        otp
                });

            if (
                !result ||
                result.success === false
            ) {
                throw new Error(
                    result?.message ||
                    "Invalid or expired verification code."
                );
            }

            const token =
                result.token ||
                result.sessionToken ||
                result.data?.token ||
                "";

            const rawUser =
                result.user ||
                result.data?.user ||
                null;

            if (
                token &&
                rawUser
            ) {
                const user =
                    normalizeUser(
                        rawUser
                    );

                saveSession(
                    token,
                    user
                );

                clearOtpState();

                redirectAfterLogin(
                    user
                );

                return result;
            }

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
        const otpState =
            getOtpState();

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
                    uid:
                        otpState.uid,

                    email:
                        otpState.email,

                    phone:
                        otpState.phone
                });

            if (
                !result ||
                result.success === false
            ) {
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
        const token =
            getToken();

        try {
            if (
                token &&
                API.logout
            ) {
                await API.logout({
                    token:
                        token
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
        options =
            options || {};

        const redirect =
            options.redirect ||
            "auth.html#login";

        const token =
            getToken();

        const user =
            getUser();

        if (
            !token ||
            !user
        ) {
            sessionStorage.setItem(
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",
                window.location.href
            );

            window.location.replace(
                redirect
            );

            return false;
        }

        const status =
            String(
                user.status ||
                "ACTIVE"
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

        if (options.roles) {
            const allowedRoles =
                Array.isArray(
                    options.roles
                )
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
        const token =
            getToken();

        if (!token) {
            return false;
        }

        try {
            if (!API.session) {
                return true;
            }

            const result =
                await API.session({
                    token:
                        token
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
                    normalizeUser(
                        rawUser
                    );

                sessionStorage.setItem(
                    STORAGE.USER,
                    JSON.stringify(
                        user
                    )
                );
            }

            return true;

        } catch (error) {
            console.warn(
                "STOCKFLOW session validation failed:",
                error
            );

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

    function togglePassword(
        inputId,
        button
    ) {
        const input =
            document.getElementById(
                inputId
            );

        if (!input) return;

        const isPassword =
            input.type ===
            "password";

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

        if (isAuthenticated()) {
            const hash =
                window.location.hash
                    .toLowerCase();

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
            document.getElementById(
                "loginForm"
            );

        const registerForm =
            document.getElementById(
                "registerForm"
            );

        /* -----------------------------------------------------
           LOGIN
           ----------------------------------------------------- */

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
                        new FormData(
                            loginForm
                        );

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
                            "Signing in...",
                            "Sign in"
                        );

                        await login({
                            email:
                                email,

                            password:
                                password
                        });

                    } catch (error) {
                        console.error(
                            error
                        );

                    } finally {
                        /*
                         * Only restore the button if the
                         * page has not already redirected.
                         */
                        if (
                            document.body.contains(
                                submitButton
                            )
                        ) {
                            setButtonLoading(
                                submitButton,
                                false,
                                "",
                                "Sign in"
                            );
                        }
                    }
                }
            );
        }

        /* -----------------------------------------------------
           REGISTER
           ----------------------------------------------------- */

        if (registerForm) {
            registerForm.addEventListener(
                "submit",
                async function (event) {
                    event.preventDefault();

                    /*
                     * Prevent accidental double submission.
                     */
                    if (
                        registerForm.dataset.submitting ===
                        "true"
                    ) {
                        return;
                    }

                    hideMessage();

                    /*
                     * Validate BEFORE changing the button
                     * into "Creating account..."
                     */
                    const validation =
                        validateRegistrationForm();

                    if (
                        !validation.valid
                    ) {
                        return;
                    }

                    const submitButton =
                        registerForm.querySelector(
                            'button[type="submit"]'
                        );

                    registerForm.dataset.submitting =
                        "true";

                    try {
                        /*
                         * NOW the button changes.
                         */
                        setButtonLoading(
                            submitButton,
                            true,
                            "Creating account...",
                            "Create Employee Account"
                        );

                        /*
                         * API registration.
                         */
                        await register(
                            validation.payload
                        );

                        /*
                         * register() waits 2.5 seconds
                         * and redirects to verify.html.
                         */

                    } catch (error) {
                        console.error(
                            "STOCKFLOW registration submit error:",
                            error
                        );

                        /*
                         * If registration fails, allow
                         * the user to try again.
                         */
                        registerForm.dataset.submitting =
                            "false";

                        setButtonLoading(
                            submitButton,
                            false,
                            "",
                            "Create Employee Account"
                        );
                    }
                }
            );
        }

        /* -----------------------------------------------------
           CLEAR FIELD ERROR WHILE TYPING
           ----------------------------------------------------- */

        if (registerForm) {
            registerForm.addEventListener(
                "input",
                function (event) {
                    const target =
                        event.target;

                    if (
                        target.matches(
                            "input, select, textarea"
                        )
                    ) {
                        removeFieldError(
                            target
                        );
                    }

                    /*
                     * Clear global form error when the user
                     * starts correcting the form.
                     */
                    const hasErrors =
                        registerForm.querySelector(
                            ".input-error, .error"
                        );

                    if (!hasErrors) {
                        const message =
                            document.getElementById(
                                "registerMessage"
                            );

                        if (message) {
                            message.style.display =
                                "none";
                        }
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

        /*
         * IMPORTANT:
         * Your HTML uses loginPanel/registerPanel,
         * not loginView/registerView.
         */
        const loginView =
            document.getElementById(
                "loginPanel"
            );

        const registerView =
            document.getElementById(
                "registerPanel"
            );

        function showLogin() {
            if (loginView) {
                loginView.classList.remove(
                    "hidden"
                );

                loginView.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }

            if (registerView) {
                registerView.classList.add(
                    "hidden"
                );

                registerView.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }

            if (loginTab) {
                loginTab.classList.add(
                    "active"
                );

                loginTab.setAttribute(
                    "aria-selected",
                    "true"
                );
            }

            if (registerTab) {
                registerTab.classList.remove(
                    "active"
                );

                registerTab.setAttribute(
                    "aria-selected",
                    "false"
                );
            }

            if (
                window.location.hash !==
                "#login"
            ) {
                history.replaceState(
                    null,
                    "",
                    "#login"
                );
            }
        }

        function showRegister() {
            if (loginView) {
                loginView.classList.add(
                    "hidden"
                );

                loginView.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }

            if (registerView) {
                registerView.classList.remove(
                    "hidden"
                );

                registerView.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }

            if (loginTab) {
                loginTab.classList.remove(
                    "active"
                );

                loginTab.setAttribute(
                    "aria-selected",
                    "false"
                );
            }

            if (registerTab) {
                registerTab.classList.add(
                    "active"
                );

                registerTab.setAttribute(
                    "aria-selected",
                    "true"
                );
            }

            if (
                window.location.hash !==
                "#register"
            ) {
                history.replaceState(
                    null,
                    "",
                    "#register"
                );
            }
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

        document.addEventListener(
            "click",
            function (event) {
                const target =
                    event.target.closest(
                        "[data-show-auth]"
                    );

                if (!target) {
                    return;
                }

                const view =
                    target.dataset.showAuth;

                event.preventDefault();

                if (
                    view ===
                    "register"
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
                hash ===
                "#register"
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
       PASSWORD TOGGLES
       ========================================================= */

    function setupPasswordToggles() {
        document.addEventListener(
            "click",
            function (event) {
                const button =
                    event.target.closest(
                        "[data-toggle-password]"
                    );

                if (!button) {
                    return;
                }

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
       GLOBAL LOGOUT
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
       PROTECTED PAGES
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
            publicPages.includes(
                path
            )
        ) {
            return;
        }

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
            .forEach(
                function (element) {
                    element.textContent =
                        name;
                }
            );

        document
            .querySelectorAll(
                "[data-user-email]"
            )
            .forEach(
                function (element) {
                    element.textContent =
                        email;
                }
            );

        document
            .querySelectorAll(
                "[data-user-role]"
            )
            .forEach(
                function (element) {
                    element.textContent =
                        role;
                }
            );

        document
            .querySelectorAll(
                "[data-user-initials]"
            )
            .forEach(
                function (element) {
                    element.textContent =
                        getInitials(
                            name
                        );
                }
            );
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
            words[
                words.length - 1
            ][0]
        ).toUpperCase();
    }

    /* =========================================================
       HISTORY
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
        login:
            login,

        register:
            register,

        verifyOtp:
            verifyOtp,

        resendOtp:
            resendOtp,

        logout:
            logout,

        getToken:
            getToken,

        getUser:
            getUser,

        saveSession:
            saveSession,

        clearSession:
            clearSession,

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
