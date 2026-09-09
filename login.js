/* ============================================================
   STOCKFLOW — LOGIN CONTROLLER
   ============================================================

   LOGIN FLOW:

   Login Form
       ↓
   Validate credentials
       ↓
   StockFlowAPI.login()
       ↓
   Google Apps Script
       ↓
   ┌───────────────────────────────────────────┐
   │ Backend login response                    │
   └──────────────────────┬────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
           SUCCESS              VERIFICATION REQUIRED
              │                       │
              ▼                       ▼
        Save session          Save verification state
              │                       │
              ▼                       ▼
         dashboard.html          verify.html


   IMPORTANT:

   - This file NEVER generates OTP.
   - This file NEVER stores OTP.
   - Backend controls authentication.
   - Backend controls account status.
   - Backend controls verification requirements.
   - Backend controls OTP generation and delivery.
   - Backend business errors are NOT automatically network errors.
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
           AUTH CONFIGURATION
           ===================================================== */

        const AUTH =
            CONFIG.AUTH ||
            {};


        /* =====================================================
           VERIFICATION STORAGE KEYS
           ===================================================== */

        /*
         * Current / legacy OTP keys.
         */

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


        /*
         * New verification-flow keys.
         *
         * These are also written so verify.js can read
         * the login verification state directly.
         */

        const VERIFICATION_STATE_KEY =
            "STOCKFLOW_VERIFICATION_STATE";


        const VERIFICATION_IDENTITY_KEY =
            "STOCKFLOW_VERIFICATION_IDENTITY";


        const VERIFICATION_UID_KEY =
            "STOCKFLOW_VERIFICATION_UID";


        const VERIFICATION_USERNAME_KEY =
            "STOCKFLOW_VERIFICATION_USERNAME";


        const VERIFICATION_EMAIL_KEY =
            "STOCKFLOW_VERIFICATION_EMAIL";


        const VERIFICATION_GMAIL_KEY =
            "STOCKFLOW_VERIFICATION_GMAIL";


        const VERIFICATION_PHONE_KEY =
            "STOCKFLOW_VERIFICATION_PHONE";


        const VERIFICATION_CHANNEL_KEY =
            "STOCKFLOW_VERIFICATION_CHANNEL";


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
           BUTTON LOADING STATE
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
           SAFE STRING
           ===================================================== */

        function safeString(
            value
        ) {

            if (
                value === null ||
                value === undefined
            ) {

                return "";

            }


            return String(
                value
            ).trim();

        }


        /* =====================================================
           PARSE POSSIBLE OBJECT
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


                if (!text) {

                    return null;

                }


                try {

                    return JSON.parse(
                        text
                    );

                } catch (
                    parseError
                ) {

                    return null;

                }

            }


            return null;

        }


        /* =====================================================
           GET RESPONSE OBJECT
           ===================================================== */

        function getResponseObject(
            response
        ) {

            if (
                !response
            ) {

                return null;

            }


            if (
                typeof response ===
                "object"
            ) {

                return response;

            }


            return parsePossibleObject(
                response
            );

        }


        /* =====================================================
           GET ERROR CODE
           ===================================================== */

        function getErrorCode(
            error
        ) {

            if (!error) {

                return "";

            }


            /*
             * Direct error fields.
             */

            const directCode =
                error.code ||
                error.errorCode ||
                error.statusCode ||
                "";


            if (
                directCode
            ) {

                return safeString(
                    directCode
                )
                    .toUpperCase();

            }


            /*
             * Possible structured backend
             * response locations.
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
                    (
                        object.code ||
                        object.errorCode
                    )
                ) {

                    return safeString(
                        object.code ||
                        object.errorCode
                    )
                        .toUpperCase();

                }

            }


            return "";

        }


        /* =====================================================
           GET ERROR MESSAGE
           ===================================================== */

        function getErrorMessage(
            error
        ) {

            if (!error) {

                return "";

            }


            /*
             * Inspect structured backend
             * response first.
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
             * Direct error message.
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
           EXTRACT BACKEND CODE FROM RESPONSE
           ===================================================== */

        function getResponseCode(
            response
        ) {

            const object =
                getResponseObject(
                    response
                );


            if (!object) {

                return "";

            }


            return safeString(
                object.code ||
                object.errorCode ||
                object.statusCode ||
                ""
            )
                .toUpperCase();

        }


        /* =====================================================
           EXTRACT BACKEND MESSAGE FROM RESPONSE
           ===================================================== */

        function getResponseMessage(
            response
        ) {

            const object =
                getResponseObject(
                    response
                );


            if (!object) {

                return "";

            }


            if (
                typeof object.message ===
                    "string"
            ) {

                return object.message.trim();

            }


            if (
                typeof object.error ===
                    "string"
            ) {

                return object.error.trim();

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

            const normalizedCode =
                safeString(
                    code
                )
                    .toUpperCase();


            switch (
                normalizedCode
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

                case "INVALID_PASSWORD":

                    return (
                        messageText ||
                        "Incorrect username, email, phone number, or password."
                    );


                case "ACCOUNT_LOCKED":

                case "TEMPORARILY_LOCKED":

                case "LOGIN_LOCKED":

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

                case "VERIFICATION_REQUIRED":

                    return (
                        messageText ||
                        "Your account requires verification."
                    );


                case "INVALID_INPUT":

                case "MISSING_FIELDS":

                    return (
                        messageText ||
                        "Please enter your login information correctly."
                    );


                case "RATE_LIMITED":

                case "TOO_MANY_REQUESTS":

                    return (
                        messageText ||
                        "Too many requests. Please wait a moment and try again."
                    );


                case "SERVER_ERROR":

                case "INTERNAL_ERROR":

                    return (
                        messageText ||
                        "The login system encountered a server error. Please try again later."
                    );


                default:

                    return (
                        messageText ||
                        ""
                    );

            }

        }


        /* =====================================================
           ACTUAL NETWORK ERROR DETECTION
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
                code === "HTTP_ERROR" ||
                code === "FETCH_ERROR"
            ) {

                return true;

            }


            /*
             * Native browser abort.
             */

            if (
                error.name ===
                    "AbortError"
            ) {

                return true;

            }


            /*
             * Wrapped native transport error.
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
                 * If structured backend information
                 * exists, this is not treated as a
                 * network error.
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
             * Structured backend response means
             * the request reached the backend.
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
           SAVE VERIFICATION STATE
           =====================================================

           This is used when the backend says that the
           account exists but still requires verification.

           NO OTP IS SAVED HERE.
           */

        function saveVerificationState(
            response,
            fallbackIdentity
        ) {

            response =
                getResponseObject(
                    response
                ) || {};


            /*
             * Some backends return user information
             * inside response.user.
             */

            const nestedUser =
                parsePossibleObject(
                    response.user
                ) || {};


            /*
             * Identity priority.
             */

            const identity =
                safeString(
                    response.identity ||
                    response.loginIdentity ||
                    response.uid ||
                    response.userId ||
                    response.id ||
                    response.username ||
                    response.email ||
                    response.gmail ||
                    response.phone ||
                    nestedUser.identity ||
                    nestedUser.username ||
                    nestedUser.email ||
                    nestedUser.gmail ||
                    nestedUser.phone ||
                    fallbackIdentity ||
                    ""
                );


            const uid =
                safeString(
                    response.uid ||
                    response.userId ||
                    response.id ||
                    nestedUser.uid ||
                    nestedUser.userId ||
                    nestedUser.id ||
                    ""
                );


            const email =
                safeString(
                    response.email ||
                    response.gmail ||
                    nestedUser.email ||
                    nestedUser.gmail ||
                    ""
                );


            const phone =
                safeString(
                    response.phone ||
                    response.phoneNumber ||
                    response.mobile ||
                    response.mobileNumber ||
                    nestedUser.phone ||
                    nestedUser.phoneNumber ||
                    nestedUser.mobile ||
                    nestedUser.mobileNumber ||
                    ""
                );


            const username =
                safeString(
                    response.username ||
                    response.userName ||
                    nestedUser.username ||
                    nestedUser.userName ||
                    ""
                );


            /*
             * Backend may provide a preferred verification
             * channel. Default to email because StockFlow's
             * registration flow initially sends email OTP.
             */

            const channel =
                safeString(
                    response.channel ||
                    response.verificationChannel ||
                    response.otpChannel ||
                    "email"
                )
                    .toLowerCase();


            const verificationState = {

                identity:
                    identity,

                uid:
                    uid,

                username:
                    username,

                email:
                    email,

                gmail:
                    email,

                phone:
                    phone,

                channel:
                    channel,

                requiresVerification:
                    true,

                createdAt:
                    Date.now()

            };


            try {

                /* =============================================
                   MAIN VERIFICATION STATE
                   ============================================= */

                sessionStorage.setItem(
                    VERIFICATION_STATE_KEY,
                    JSON.stringify(
                        verificationState
                    )
                );


                /* =============================================
                   NEW VERIFICATION KEYS
                   ============================================= */

                sessionStorage.setItem(
                    VERIFICATION_IDENTITY_KEY,
                    identity
                );


                sessionStorage.setItem(
                    VERIFICATION_UID_KEY,
                    uid
                );


                sessionStorage.setItem(
                    VERIFICATION_USERNAME_KEY,
                    username
                );


                sessionStorage.setItem(
                    VERIFICATION_EMAIL_KEY,
                    email
                );


                sessionStorage.setItem(
                    VERIFICATION_GMAIL_KEY,
                    email
                );


                sessionStorage.setItem(
                    VERIFICATION_PHONE_KEY,
                    phone
                );


                sessionStorage.setItem(
                    VERIFICATION_CHANNEL_KEY,
                    channel
                );


                /* =============================================
                   LEGACY OTP KEYS
                   ============================================= */

                sessionStorage.setItem(
                    OTP_IDENTITY_KEY,
                    identity
                );


                sessionStorage.setItem(
                    OTP_UID_KEY,
                    uid
                );


                sessionStorage.setItem(
                    OTP_EMAIL_KEY,
                    email
                );


                sessionStorage.setItem(
                    OTP_PHONE_KEY,
                    phone
                );


                sessionStorage.setItem(
                    OTP_USERNAME_KEY,
                    username
                );


                /* =============================================
                   BACKWARD-COMPATIBLE LOWERCASE KEYS
                   ============================================= */

                sessionStorage.setItem(
                    "stockflow_otp_identity",
                    identity
                );


                sessionStorage.setItem(
                    "stockflow_otp_email",
                    email
                );


                sessionStorage.setItem(
                    "stockflow_otp_phone",
                    phone
                );


                sessionStorage.setItem(
                    "stockflow_otp_username",
                    username
                );


            } catch (
                storageError
            ) {

                console.warn(
                    "STOCKFLOW: Unable to save verification state.",
                    storageError
                );

            }


            return {

                identity:
                    identity,

                uid:
                    uid,

                email:
                    email,

                phone:
                    phone,

                username:
                    username,

                channel:
                    channel

            };

        }


        /* =====================================================
           CHECK EXISTING SESSION
           ===================================================== */

        function checkExistingSession() {

            try {

                /*
                 * First use the centralized authentication
                 * controller when available.
                 */

                if (
                    window.StockFlowAuth &&
                    typeof window.StockFlowAuth.getCurrentUser ===
                        "function"
                ) {

                    const currentUser =
                        window.StockFlowAuth.getCurrentUser();


                    if (
                        currentUser
                    ) {

                        window.location.replace(
                            DASHBOARD_PAGE
                        );


                        return true;

                    }

                }


                /*
                 * Backward-compatible session.
                 */

                const rawSession =
                    sessionStorage.getItem(
                        "STOCKFLOW_SESSION"
                    );


                if (
                    rawSession
                ) {

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

                    } catch (
                        parseError
                    ) {

                        sessionStorage.removeItem(
                            "STOCKFLOW_SESSION"
                        );

                    }

                }

            } catch (
                error
            ) {

                console.warn(
                    "STOCKFLOW: Unable to check existing session.",
                    error
                );

            }


            return false;

        }


        /* =====================================================
           EXISTING SESSION
           ===================================================== */

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
           LOGIN SUBMIT
           ===================================================== */

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                /*
                 * Prevent accidental double submission.
                 */

                if (
                    button.disabled
                ) {

                    return;

                }


                clearMessage();


                /* =================================================
                   READ VALUES
                   ================================================= */

                const identity =
                    identityInput.value.trim();


                const password =
                    passwordInput.value;


                /* =================================================
                   VALIDATION
                   ================================================= */

                if (
                    !identity
                ) {

                    showMessage(
                        "Please enter your username, email or phone number.",
                        "error"
                    );


                    identityInput.focus();


                    return;

                }


                if (
                    !password
                ) {

                    showMessage(
                        "Please enter your password.",
                        "error"
                    );


                    passwordInput.focus();


                    return;

                }


                /* =================================================
                   LOADING
                   ================================================= */

                setLoading(
                    true
                );


                try {

                    /* =============================================
                       API AVAILABILITY
                       ============================================= */

                    if (
                        !window.StockFlowAPI ||
                        typeof window.StockFlowAPI.login !==
                            "function"
                    ) {

                        const apiError =
                            new Error(
                                "Login API is not available. Please check api.js."
                            );


                        apiError.code =
                            "API_URL_MISSING";


                        throw apiError;

                    }


                    /* =============================================
                       API REQUEST
                       ============================================= */

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


                    /* =============================================
                       EMPTY RESPONSE
                       ============================================= */

                    if (
                        !response
                    ) {

                        const emptyError =
                            new Error(
                                "No response was received from the server."
                            );


                        emptyError.code =
                            "EMPTY_RESPONSE";


                        throw emptyError;

                    }


                    const result =
                        getResponseObject(
                            response
                        ) || {};


                    const responseCode =
                        getResponseCode(
                            result
                        );


                    const responseMessage =
                        getResponseMessage(
                            result
                        );


                    /* =============================================
                       ACCOUNT LOCKED
                       ============================================= */

                    if (
                        result.locked === true ||
                        result.isLocked === true ||
                        result.accountLocked === true ||
                        responseCode ===
                            "ACCOUNT_LOCKED" ||
                        responseCode ===
                            "TEMPORARILY_LOCKED" ||
                        responseCode ===
                            "LOGIN_LOCKED"
                    ) {

                        showMessage(
                            responseMessage ||
                            "Your account is temporarily locked. Please try again later.",
                            "warning"
                        );


                        return;

                    }


                    /* =============================================
                       ACCOUNT DISABLED
                       ============================================= */

                    if (
                        result.disabled === true ||
                        result.accountDisabled === true ||
                        responseCode ===
                            "ACCOUNT_DISABLED"
                    ) {

                        showMessage(
                            responseMessage ||
                            "This account is currently disabled.",
                            "error"
                        );


                        return;

                    }


                    /* =============================================
                       ACCOUNT SUSPENDED
                       ============================================= */

                    if (
                        result.suspended === true ||
                        result.accountSuspended === true ||
                        responseCode ===
                            "ACCOUNT_SUSPENDED"
                    ) {

                        showMessage(
                            responseMessage ||
                            "This account is currently suspended.",
                            "error"
                        );


                        return;

                    }


                    /* =============================================
                       ACCOUNT BLOCKED
                       ============================================= */

                    if (
                        result.blocked === true ||
                        result.accountBlocked === true ||
                        responseCode ===
                            "ACCOUNT_BLOCKED"
                    ) {

                        showMessage(
                            responseMessage ||
                            "This account is currently blocked.",
                            "error"
                        );


                        return;

                    }


                    /* =============================================
                       ACCOUNT REQUIRES VERIFICATION
                       ============================================= */

                    const requiresVerification =
                        result.verified === false ||
                        result.isVerified === false ||
                        result.requiresVerification === true ||
                        result.needsVerification === true ||
                        result.verificationRequired === true ||
                        responseCode ===
                            "REQUIRES_VERIFICATION" ||
                        responseCode ===
                            "OTP_REQUIRED" ||
                        responseCode ===
                            "VERIFICATION_REQUIRED";


                    if (
                        requiresVerification
                    ) {

                        const verification =
                            saveVerificationState(
                                result,
                                identity
                            );


                        /*
                         * verify.js needs at least an identity
                         * in order to know which account is being
                         * verified.
                         */

                        if (
                            !verification.identity
                        ) {

                            const verificationError =
                                new Error(
                                    "Your account requires verification, but the server did not return a verification identity."
                                );


                            verificationError.code =
                                "VERIFICATION_IDENTITY_MISSING";


                            throw verificationError;

                        }


                        showMessage(
                            responseMessage ||
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


                    /* =============================================
                       NORMAL LOGIN FAILURE
                       ============================================= */

                    if (
                        result.success !== true
                    ) {

                        const businessMessage =
                            getBusinessErrorMessage(
                                responseCode,
                                responseMessage
                            );


                        showMessage(
                            businessMessage ||
                            "Invalid login credentials. Please check your information and try again.",
                            "error"
                        );


                        return;

                    }


                    /* =============================================
                       SAVE LOGIN SESSION
                       ============================================= */

                    if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.saveLogin ===
                            "function"
                    ) {

                        window.StockFlowAuth.saveLogin(
                            result
                        );

                    } else {

                        /*
                         * Fallback session storage when auth.js
                         * is unavailable.
                         */

                        try {

                            sessionStorage.setItem(
                                "STOCKFLOW_SESSION",
                                JSON.stringify(
                                    result
                                )
                            );

                        } catch (
                            storageError
                        ) {

                            console.warn(
                                "STOCKFLOW: Unable to save login session.",
                                storageError
                            );

                        }

                    }


                    /* =============================================
                       SUCCESS MESSAGE
                       ============================================= */

                    showMessage(
                        responseMessage ||
                        "Sign in successful. Redirecting...",
                        "success"
                    );


                    /* =============================================
                       DASHBOARD REDIRECT
                       ============================================= */

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


                    /* =============================================
                       ERROR CODE
                       ============================================= */

                    const code =
                        getErrorCode(
                            error
                        );


                    /* =============================================
                       ERROR MESSAGE
                       ============================================= */

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


                    /* =============================================
                       ACTUAL NETWORK/API ERROR
                       ============================================= */

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


                    /* =============================================
                       VERIFICATION IDENTITY ERROR
                       ============================================= */

                    if (
                        code ===
                            "VERIFICATION_IDENTITY_MISSING"
                    ) {

                        showMessage(
                            backendMessage ||
                            "The account requires verification, but the verification information could not be loaded. Please try logging in again.",
                            "error"
                        );


                        return;

                    }


                    /* =============================================
                       BACKEND BUSINESS ERROR
                       ============================================= */

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


                    /* =============================================
                       FALLBACK BACKEND MESSAGE
                       ============================================= */

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


                    /* =============================================
                       UNKNOWN LOGIN ERROR
                       ============================================= */

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
