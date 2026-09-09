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
   - Backend business errors are NOT network errors.
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


                /* Backward-compatible keys */

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
           ERROR EXTRACTION
           =====================================================

           IMPORTANT FIX:

           Apps Script/API errors may arrive as:

           error.code
           error.errorCode
           error.response.code
           error.data.code
           error.rawResponse.code
           error.response JSON
           error.data JSON
           error.rawResponse JSON

           We inspect all supported locations before deciding
           that something is a network error.
           ===================================================== */

        function parsePossibleObject(
            value
        ) {

            if (
                !value
            ) {

                return null;

            }


            if (
                typeof value ===
                "object"
            ) {

                return value;

            }


            if (
                typeof value ===
                "string"
            ) {

                const text =
                    value.trim();


                if (
                    !text
                ) {

                    return null;

                }


                try {

                    return JSON.parse(
                        text
                    );

                } catch (error) {

                    return null;

                }

            }


            return null;

        }


        function getErrorCode(
            error
        ) {

            if (!error) {

                return "";

            }


            const directCode =
                error.code ||
                error.errorCode ||
                error.statusCode ||
                "";


            if (
                directCode
            ) {

                return String(
                    directCode
                )
                    .trim()
                    .toUpperCase();

            }


            const candidates = [

                error.response,
                error.data,
                error.rawResponse,
                error.result

            ];


            for (
                const candidate of candidates
            ) {

                const object =
                    parsePossibleObject(
                        candidate
                    );


                if (
                    object &&
                    (
                        object.code ||
                        object.errorCode
                    )
                ) {

                    return String(
                        object.code ||
                        object.errorCode
                    )
                        .trim()
                        .toUpperCase();

                }

            }


            return "";

        }


        function getErrorMessage(
            error
        ) {

            if (!error) {

                return "";

            }


            /*
             * IMPORTANT:

             * Do NOT immediately trust error.message
             * if it is a generic transport message.

             * First inspect structured backend data.
             */

            const candidates = [

                error.response,
                error.data,
                error.rawResponse,
                error.result

            ];


            for (
                const candidate of candidates
            ) {

                const object =
                    parsePossibleObject(
                        candidate
                    );


                if (
                    object &&
                    typeof object.message ===
                        "string" &&
                    object.message.trim()
                ) {

                    return object.message.trim();

                }

            }


            /*
             * Direct API error message.
             */

            if (
                typeof error.message ===
                    "string" &&
                error.message.trim()
            ) {

                return error.message.trim();

            }


            return "";

        }


        /* =====================================================
           BUSINESS ERROR MESSAGE
           ===================================================== */

        function getBusinessErrorMessage(
            code,
            messageText
        ) {

            switch (
                String(
                    code ||
                    ""
                )
                    .trim()
                    .toUpperCase()
            ) {

                case "ACCOUNT_NOT_FOUND":
                case "USER_NOT_FOUND":
                case "USER_DOES_NOT_EXIST":
                case "ACCOUNT_DOES_NOT_EXIST":

                    return (
                        messageText ||
                        "Account doesn't exist. Please consider registering first, then try again."
                    );


                case "INVALID_CREDENTIALS":
                case "INVALID_LOGIN":
                case "WRONG_PASSWORD":

                    return (
                        messageText ||
                        "Incorrect username, email, phone number, or password."
                    );


                case "ACCOUNT_LOCKED":
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


                case "ACCOUNT_BLOCKED":

                    return (
                        messageText ||
                        "This account is currently blocked."
                    );


                case "ACCOUNT_PENDING":

                    return (
                        messageText ||
                        "Your account is still pending verification."
                    );


                case "REQUIRES_VERIFICATION":
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
           DETERMINE ACTUAL NETWORK ERROR
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
             * Explicit transport/API errors.
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
             * Only the original transport error
             * should be checked for TypeError.
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

                /*
                 * Before calling this a network error,
                 * make absolutely sure there isn't a
                 * structured backend response attached.
                 */

                const backendCode =
                    getErrorCode(
                        error
                    );


                const backendMessage =
                    getErrorMessage(
                        error
                    );


                if (
                    backendCode ||
                    backendMessage
                ) {

                    return false;

                }


                return true;

            }


            /*
             * If structured backend data exists,
             * it is NOT a network error.
             */

            const structuredResponse =
                parsePossibleObject(
                    error.response
                );


            const structuredData =
                parsePossibleObject(
                    error.data
                );


            const structuredRaw =
                parsePossibleObject(
                    error.rawResponse
                );


            if (
                structuredResponse ||
                structuredData ||
                structuredRaw
            ) {

                return false;

            }


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
                        )
                            .trim()
                            .toUpperCase() ===
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
                       ========================================= */

                    const requiresVerification =
                        response.verified === false ||
                        response.requiresVerification === true ||
                        response.needsVerification === true ||
                        String(
                            response.code ||
                            ""
                        )
                            .trim()
                            .toUpperCase() ===
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
                                response
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
                       EXTRACT BACKEND ERROR
                       ========================================= */

                    const code =
                        getErrorCode(
                            error
                        );


                    const backendMessage =
                        getErrorMessage(
                            error
                        );


                    console.log(
                        "[STOCKFLOW LOGIN] Error code:",
                        code
                    );


                    console.log(
                        "[STOCKFLOW LOGIN] Error message:",
                        backendMessage
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
                       FALLBACK BUSINESS MESSAGE
                       ========================================= */

                    if (
                        backendMessage &&
                        backendMessage.trim()
                    ) {

                        showMessage(
                            backendMessage,
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
