/* ============================================================
   STOCKFLOW — LOGIN CONTROLLER
   ============================================================

   FLOW:

   Login Form
       ↓
   Validate credentials
       ↓
   StockFlowAPI.login()
       ↓
   Google Apps Script
       ↓
   ┌───────────────────────────────┐
   │ Login result                  │
   └───────────────┬───────────────┘
                   │
          ┌────────┴────────┐
          │                 │
        SUCCESS           FAILURE
          │                 │
          ▼                 ▼
     Save session      Show backend
          │             error message
          ▼
      Dashboard

   UNVERIFIED ACCOUNT:

   Login
      ↓
   Backend says requiresVerification
      ↓
   Save verification identity
      ↓
   verify.html

   IMPORTANT:
   - This file does NOT generate OTP.
   - This file does NOT store OTP.
   - Backend controls authentication.
   - Backend controls account status.
   - Backend error messages are preserved.
   ============================================================ */


document.addEventListener(
    "DOMContentLoaded",
    () => {

        "use strict";


        /* =====================================================
           ELEMENTS
           ===================================================== */

        const form =
            document.getElementById(
                "loginForm"
            );


        const message =
            document.getElementById(
                "loginMessage"
            );


        const button =
            document.getElementById(
                "loginButton"
            );


        const identityInput =
            document.getElementById(
                "loginIdentity"
            );


        const passwordInput =
            document.getElementById(
                "loginPassword"
            );


        /*
         * login.js may exist on other pages.
         */

        if (!form) {

            return;

        }


        /* =====================================================
           REQUIRED ELEMENT CHECK
           ===================================================== */

        if (
            !message ||
            !button ||
            !identityInput ||
            !passwordInput
        ) {

            console.error(
                "STOCKFLOW Login: Required login elements are missing."
            );

            return;

        }


        /* =====================================================
           CONFIGURATION
           ===================================================== */

        const CONFIG =
            window.STOCKFLOW_CONFIG ||
            window.CONFIG ||
            {};


        const ROUTES =
            CONFIG.ROUTES ||
            {};


        const DASHBOARD_PAGE =
            ROUTES.dashboard ||
            ROUTES.DASHBOARD ||
            "dashboard.html";


        const VERIFY_PAGE =
            ROUTES.verify ||
            ROUTES.VERIFY ||
            "verify.html";


        /* =====================================================
           OTP STORAGE KEYS
           ===================================================== */

        const AUTH =
            CONFIG.AUTH ||
            {};


        const OTP_IDENTITY_KEY =
            AUTH.OTP_IDENTITY_KEY ||
            CONFIG.OTP_IDENTITY_KEY ||
            "STOCKFLOW_OTP_IDENTITY";


        const OTP_UID_KEY =
            AUTH.OTP_UID_KEY ||
            CONFIG.OTP_UID_KEY ||
            "STOCKFLOW_OTP_UID";


        const OTP_EMAIL_KEY =
            AUTH.OTP_EMAIL_KEY ||
            CONFIG.OTP_EMAIL_KEY ||
            "STOCKFLOW_OTP_EMAIL";


        const OTP_PHONE_KEY =
            AUTH.OTP_PHONE_KEY ||
            CONFIG.OTP_PHONE_KEY ||
            "STOCKFLOW_OTP_PHONE";


        const OTP_USERNAME_KEY =
            AUTH.OTP_USERNAME_KEY ||
            CONFIG.OTP_USERNAME_KEY ||
            "STOCKFLOW_OTP_USERNAME";


        /* =====================================================
           MESSAGE HELPERS
           ===================================================== */

        function clearMessage() {

            message.textContent =
                "";

            message.className =
                "auth-message";

        }


        function showMessage(
            text,
            type = "error"
        ) {

            message.textContent =
                text || "";

            message.className =
                `auth-message ${type}`;

        }


        /* =====================================================
           LOADING STATE
           ===================================================== */

        function setLoading(
            loading
        ) {

            button.disabled =
                loading;


            button.classList.toggle(
                "loading",
                loading
            );


            const text =
                button.querySelector(
                    ".button-text"
                );


            const loader =
                button.querySelector(
                    ".button-loader"
                );


            if (text) {

                text.hidden =
                    loading;

            }


            if (loader) {

                loader.hidden =
                    !loading;

            }


            button.setAttribute(
                "aria-busy",
                String(
                    loading
                )
            );

        }


        /* =====================================================
           SAVE VERIFICATION STATE
           =====================================================

           IMPORTANT:

           OTP is NOT generated here.

           OTP is NOT stored here.

           This function only stores the account identity
           required by verify.html.
           ===================================================== */

        function saveVerificationState(
            response,
            fallbackIdentity
        ) {

            response =
                response || {};


            const identity =
                response.identity ||
                response.uid ||
                response.userId ||
                response.id ||
                response.username ||
                response.email ||
                response.gmail ||
                response.phone ||
                fallbackIdentity ||
                "";


            const uid =
                response.uid ||
                response.userId ||
                response.id ||
                "";


            const email =
                response.email ||
                response.gmail ||
                "";


            const phone =
                response.phone ||
                "";


            const username =
                response.username ||
                "";


            try {

                sessionStorage.setItem(
                    OTP_IDENTITY_KEY,
                    String(
                        identity
                    )
                );


                sessionStorage.setItem(
                    OTP_UID_KEY,
                    String(
                        uid
                    )
                );


                sessionStorage.setItem(
                    OTP_EMAIL_KEY,
                    String(
                        email
                    )
                );


                sessionStorage.setItem(
                    OTP_PHONE_KEY,
                    String(
                        phone
                    )
                );


                sessionStorage.setItem(
                    OTP_USERNAME_KEY,
                    String(
                        username
                    )
                );


                /*
                 * Backward-compatible keys.
                 */

                sessionStorage.setItem(
                    "stockflow_otp_identity",
                    String(
                        identity
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_email",
                    String(
                        email
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_phone",
                    String(
                        phone
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_username",
                    String(
                        username
                    )
                );


            } catch (error) {

                console.warn(
                    "STOCKFLOW: Unable to save verification state.",
                    error
                );

            }


            return {

                identity,
                uid,
                email,
                phone,
                username

            };

        }


        /* =====================================================
           EXISTING SESSION CHECK
           ===================================================== */

        function checkExistingSession() {

            try {

                if (
                    window.StockFlowAuth &&
                    typeof window.StockFlowAuth.getCurrentUser ===
                        "function"
                ) {

                    const currentUser =
                        window.StockFlowAuth.getCurrentUser();


                    if (currentUser) {

                        window.location.replace(
                            DASHBOARD_PAGE
                        );

                        return true;

                    }

                }


                /*
                 * Compatibility fallback.
                 */

                const rawSession =
                    sessionStorage.getItem(
                        "STOCKFLOW_SESSION"
                    );


                if (rawSession) {

                    try {

                        const session =
                            JSON.parse(
                                rawSession
                            );


                        if (
                            session &&
                            (
                                session.success === true ||
                                session.authenticated === true ||
                                session.user
                            )
                        ) {

                            window.location.replace(
                                DASHBOARD_PAGE
                            );

                            return true;

                        }

                    } catch (parseError) {

                        sessionStorage.removeItem(
                            "STOCKFLOW_SESSION"
                        );

                    }

                }

            } catch (error) {

                console.warn(
                    "STOCKFLOW: Unable to check existing session.",
                    error
                );

            }


            return false;

        }


        if (
            checkExistingSession()
        ) {

            return;

        }


        /* =====================================================
           CLEAR MESSAGE WHILE TYPING
           ===================================================== */

        identityInput.addEventListener(
            "input",
            () => {

                if (
                    message.textContent
                ) {

                    clearMessage();

                }

            }
        );


        passwordInput.addEventListener(
            "input",
            () => {

                if (
                    message.textContent
                ) {

                    clearMessage();

                }

            }
        );


        /* =====================================================
           ERROR CLASSIFICATION
           ===================================================== */

        function getErrorCode(
            error
        ) {

            if (!error) {

                return "";

            }


            return String(
                error.code ||
                error.errorCode ||
                (
                    error.response &&
                    error.response.code
                ) ||
                (
                    error.data &&
                    error.data.code
                ) ||
                ""
            )
                .trim()
                .toUpperCase();

        }


        function getErrorMessage(
            error
        ) {

            if (!error) {

                return "";

            }


            /*
             * First priority:
             * StockFlowAPIError.message
             */

            if (
                typeof error.message ===
                "string" &&
                error.message.trim()
            ) {

                return error.message.trim();

            }


            /*
             * Backend response.
             */

            if (
                error.response &&
                typeof error.response ===
                    "object"
            ) {

                if (
                    typeof error.response.message ===
                        "string" &&
                    error.response.message.trim()
                ) {

                    return error.response.message.trim();

                }

            }


            /*
             * Backend data.
             */

            if (
                error.data &&
                typeof error.data ===
                    "object"
            ) {

                if (
                    typeof error.data.message ===
                        "string" &&
                    error.data.message.trim()
                ) {

                    return error.data.message.trim();

                }

            }


            return "";

        }


        /* =====================================================
           BUSINESS ERROR MESSAGE
           =====================================================

           Backend authentication errors must NEVER be
           classified as network errors.
           ===================================================== */

        function getBusinessErrorMessage(
            code,
            messageText
        ) {

            switch (code) {

                case "ACCOUNT_NOT_FOUND":

                    return (
                        messageText ||
                        "Account does not exist."
                    );


                case "USER_NOT_FOUND":

                    return (
                        messageText ||
                        "Account does not exist."
                    );


                case "INVALID_CREDENTIALS":

                    return (
                        messageText ||
                        "Incorrect username, email, phone number, or password."
                    );


                case "INVALID_LOGIN":

                    return (
                        messageText ||
                        "Incorrect username, email, phone number, or password."
                    );


                case "WRONG_PASSWORD":

                    return (
                        messageText ||
                        "Incorrect password."
                    );


                case "ACCOUNT_LOCKED":

                    return (
                        messageText ||
                        "Your account is temporarily locked. Please try again later."
                    );


                case "TEMPORARILY_LOCKED":

                    return (
                        messageText ||
                        "Your account is temporarily locked. Please try again later."
                    );


                case "ACCOUNT_DISABLED":

                    return (
                        messageText ||
                        "This account is currently disabled."
                    );


                case "ACCOUNT_SUSPENDED":

                    return (
                        messageText ||
                        "This account is currently suspended."
                    );


                case "ACCOUNT_PENDING":

                    return (
                        messageText ||
                        "Your account is still pending verification."
                    );


                case "REQUIRES_VERIFICATION":

                    return (
                        messageText ||
                        "Your account requires verification."
                    );


                case "OTP_REQUIRED":

                    return (
                        messageText ||
                        "Your account requires verification."
                    );


                default:

                    return (
                        messageText ||
                        ""
                    );

            }

        }


        /* =====================================================
           DETERMINE NETWORK ERROR
           ===================================================== */

        function isActualNetworkError(
            error
        ) {

            if (!error) {

                return false;

            }


            const code =
                getErrorCode(
                    error
                );


            /*
             * These are explicitly transport/API errors.
             */

            if (
                code === "NETWORK_ERROR" ||
                code === "TIMEOUT" ||
                code === "API_URL_MISSING" ||
                code === "API_URL_INVALID" ||
                code === "EMPTY_RESPONSE" ||
                code === "INVALID_JSON" ||
                code === "HTTP_ERROR"
            ) {

                return true;

            }


            /*
             * Native browser fetch errors.
             */

            if (
                error.name ===
                    "AbortError"
            ) {

                return true;

            }


            /*
             * Only inspect the ORIGINAL error,
             * not the user-facing backend message.
             */

            const original =
                error.originalError;


            if (
                original &&
                (
                    original.name ===
                        "TypeError" ||
                    original.name ===
                        "AbortError"
                )
            ) {

                return true;

            }


            /*
             * Do NOT classify normal backend
             * business messages as network errors.
             */

            return false;

        }


        /* =====================================================
           LOGIN SUBMIT
           ===================================================== */

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                clearMessage();


                /* =============================================
                   READ VALUES
                   ============================================= */

                const identity =
                    identityInput.value.trim();


                const password =
                    passwordInput.value;


                /* =============================================
                   VALIDATION
                   ============================================= */

                if (!identity) {

                    showMessage(
                        "Please enter your username, email or phone number.",
                        "error"
                    );


                    identityInput.focus();

                    return;

                }


                if (!password) {

                    showMessage(
                        "Please enter your password.",
                        "error"
                    );


                    passwordInput.focus();

                    return;

                }


                /* =============================================
                   LOADING
                   ============================================= */

                setLoading(
                    true
                );


                try {

                    /* =========================================
                       API CHECK
                       ========================================= */

                    if (
                        !window.StockFlowAPI ||
                        typeof window.StockFlowAPI.login !==
                            "function"
                    ) {

                        throw new Error(
                            "Login API is not available. Please check api.js."
                        );

                    }


                    /* =========================================
                       API REQUEST
                       ========================================= */

                    const response =
                        await window.StockFlowAPI.login({

                            identity:
                                identity,

                            password:
                                password

                        });


                    console.log(
                        "[STOCKFLOW LOGIN] Server response:",
                        response
                    );


                    /* =========================================
                       EMPTY RESPONSE
                       ========================================= */

                    if (!response) {

                        throw new Error(
                            "No response was received from the server."
                        );

                    }


                    /* =========================================
                       ACCOUNT LOCKED
                       ========================================= */

                    if (
                        response.locked === true ||
                        response.isLocked === true ||
                        response.accountLocked === true ||
                        String(
                            response.code ||
                            ""
                        ).toUpperCase() ===
                            "ACCOUNT_LOCKED"
                    ) {

                        showMessage(
                            response.message ||
                            "Your account is temporarily locked. Please try again later.",
                            "warning"
                        );


                        return;

                    }


                    /* =========================================
                       ACCOUNT NOT VERIFIED
                       =========================================

                       Some backends may return:

                       success: false
                       verified: false

                       Others may return:

                       success: true
                       requiresVerification: true

                       Support both.
                       ========================================= */

                    const requiresVerification =
                        response.verified === false ||
                        response.requiresVerification === true ||
                        response.needsVerification === true ||
                        String(
                            response.code ||
                            ""
                        ).toUpperCase() ===
                            "REQUIRES_VERIFICATION";


                    if (
                        requiresVerification
                    ) {

                        const verification =
                            saveVerificationState(
                                response,
                                identity
                            );


                        if (
                            !verification.identity
                        ) {

                            throw new Error(
                                "Your account requires verification, but no verification identity was returned by the server."
                            );

                        }


                        showMessage(
                            response.message ||
                            "Your account is not verified. Redirecting to verification...",
                            "warning"
                        );


                        window.setTimeout(
                            () => {

                                window.location.replace(
                                    VERIFY_PAGE
                                );

                            },
                            700
                        );


                        return;

                    }


                    /* =========================================
                       NORMAL LOGIN FAILURE
                       ========================================= */

                    if (
                        response.success !== true
                    ) {

                        const code =
                            getErrorCode(
                                response
                            );


                        const backendMessage =
                            getErrorMessage(
                                {
                                    message:
                                        response.message,

                                    response:
                                        response,

                                    data:
                                        response.data,

                                    code:
                                        code
                                }
                            );


                        const finalMessage =
                            getBusinessErrorMessage(
                                code,
                                backendMessage
                            );


                        showMessage(
                            finalMessage ||
                            "Invalid login credentials. Please check your information and try again.",
                            "error"
                        );


                        return;

                    }


                    /* =========================================
                       SAVE LOGIN SESSION
                       ========================================= */

                    if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.saveLogin ===
                            "function"
                    ) {

                        window.StockFlowAuth.saveLogin(
                            response
                        );

                    } else {

                        /*
                         * Compatibility fallback.
                         */

                        try {

                            sessionStorage.setItem(
                                "STOCKFLOW_SESSION",
                                JSON.stringify(
                                    response
                                )
                            );

                        } catch (storageError) {

                            console.warn(
                                "STOCKFLOW: Unable to save login session.",
                                storageError
                            );

                        }

                    }


                    /* =========================================
                       SUCCESS
                       ========================================= */

                    showMessage(
                        response.message ||
                        "Sign in successful. Redirecting...",
                        "success"
                    );


                    /* =========================================
                       DASHBOARD REDIRECT
                       ========================================= */

                    window.setTimeout(
                        () => {

                            window.location.replace(
                                DASHBOARD_PAGE
                            );

                        },
                        400
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "STOCKFLOW login error:",
                        error
                    );


                    /* =========================================
                       ERROR CODE
                       ========================================= */

                    const code =
                        getErrorCode(
                            error
                        );


                    /* =========================================
                       ERROR MESSAGE
                       ========================================= */

                    const backendMessage =
                        getErrorMessage(
                            error
                        );


                    /* =========================================
                       ACTUAL NETWORK/API ERROR
                       ========================================= */

                    if (
                        isActualNetworkError(
                            error
                        )
                    ) {

                        showMessage(
                            "Unable to connect to the login system right now. Please check your internet connection and make sure the Google Apps Script Web App is deployed and accessible.",
                            "error"
                        );


                        return;

                    }


                    /* =========================================
                       BACKEND BUSINESS ERROR
                       ========================================= */

                    const businessMessage =
                        getBusinessErrorMessage(
                            code,
                            backendMessage
                        );


                    if (
                        businessMessage
                    ) {

                        showMessage(
                            businessMessage,
                            "error"
                        );


                        return;

                    }


                    /* =========================================
                       UNKNOWN ERROR
                       ========================================= */

                    showMessage(
                        "Unable to sign in. Please check your information and try again.",
                        "error"
                    );

                } finally {

                    setLoading(
                        false
                    );

                }

            }
        );


        /* =====================================================
           PREVENT DOUBLE ENTER SUBMISSION
           ===================================================== */

        form.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    button.disabled
                ) {

                    event.preventDefault();

                }

            }
        );

    }
);
