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
   ┌───────────────────────────────┐
   │ Account verified?             │
   └───────────────┬───────────────┘
                   │
          ┌────────┴────────┐
          │                 │
        YES                NO
          │                 │
          ▼                 ▼
     Save session       Save identity
          │                 │
          ▼                 ▼
    Dashboard          verify.html
   ============================================================

   IMPORTANT:
   - This file does NOT generate OTP.
   - This file does NOT store OTP.
   - Unverified accounts are redirected to verify.html.
   - OTP verification is handled by the verification page.
   ============================================================ */


document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form =
        document.getElementById("loginForm");

    const message =
        document.getElementById("loginMessage");

    const button =
        document.getElementById("loginButton");

    const identityInput =
        document.getElementById("loginIdentity");

    const passwordInput =
        document.getElementById("loginPassword");


    /*
     * login.js may exist on other pages.
     * Stop safely if the login form does not exist.
     */

    if (!form) {
        return;
    }


    /* =========================================================
       REQUIRED ELEMENT CHECK
       ========================================================= */

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


    /* =========================================================
       CONFIGURATION
       ========================================================= */

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


    const OTP_IDENTITY_KEY =
        CONFIG.OTP_IDENTITY_KEY ||
        CONFIG.OTP_KEY ||
        "STOCKFLOW_OTP_IDENTITY";


    const OTP_UID_KEY =
        CONFIG.OTP_UID_KEY ||
        "STOCKFLOW_OTP_UID";


    const OTP_EMAIL_KEY =
        CONFIG.OTP_EMAIL_KEY ||
        "STOCKFLOW_OTP_EMAIL";


    const OTP_PHONE_KEY =
        CONFIG.OTP_PHONE_KEY ||
        "STOCKFLOW_OTP_PHONE";


    const OTP_USERNAME_KEY =
        CONFIG.OTP_USERNAME_KEY ||
        "STOCKFLOW_OTP_USERNAME";


    /* =========================================================
       MESSAGE HELPERS
       ========================================================= */

    function clearMessage() {

        message.textContent = "";

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


    /* =========================================================
       LOADING STATE
       ========================================================= */

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
            String(loading)
        );

    }


    /* =========================================================
       SAVE VERIFICATION STATE
       =========================================================

       IMPORTANT:

       Only account information is stored here.

       OTP is NEVER stored in this file.
       ========================================================= */

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

            /*
             * Primary identity key.
             */

            sessionStorage.setItem(
                OTP_IDENTITY_KEY,
                String(identity)
            );


            /*
             * Additional information for verify.html.
             */

            sessionStorage.setItem(
                OTP_UID_KEY,
                String(uid)
            );


            sessionStorage.setItem(
                OTP_EMAIL_KEY,
                String(email)
            );


            sessionStorage.setItem(
                OTP_PHONE_KEY,
                String(phone)
            );


            sessionStorage.setItem(
                OTP_USERNAME_KEY,
                String(username)
            );


            /*
             * Backward-compatible keys.
             */

            sessionStorage.setItem(
                "stockflow_otp_identity",
                String(identity)
            );


            sessionStorage.setItem(
                "stockflow_otp_email",
                String(email)
            );


            sessionStorage.setItem(
                "stockflow_otp_phone",
                String(phone)
            );


            sessionStorage.setItem(
                "stockflow_otp_username",
                String(username)
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


    /* =========================================================
       EXISTING SESSION CHECK
       ========================================================= */

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


    /* =========================================================
       CLEAR MESSAGE WHILE TYPING
       ========================================================= */

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


    /* =========================================================
       LOGIN SUBMIT
       ========================================================= */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


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


            /* =================================================
               LOADING
               ================================================= */

            setLoading(
                true
            );


            try {

                /* =============================================
                   CHECK API
                   ============================================= */

                if (
                    !window.StockFlowAPI ||
                    typeof window.StockFlowAPI.login !==
                        "function"
                ) {

                    throw new Error(
                        "The STOCKFLOW login service is currently unavailable."
                    );

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


                /* =============================================
                   EMPTY RESPONSE
                   ============================================= */

                if (!response) {

                    throw new Error(
                        "No response was received from the server."
                    );

                }


                /* =============================================
                   ACCOUNT NOT VERIFIED
                   ============================================= */

                if (
                    response.success === false &&
                    (
                        response.verified === false ||
                        response.requiresVerification === true ||
                        response.needsVerification === true
                    )
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
                            "Your account requires verification, but no verification identity was returned."
                        );

                    }


                    showMessage(
                        response.message ||
                        "Your account is not verified. Redirecting to verification...",
                        "warning"
                    );


                    /*
                     * Directly use verify.html.
                     *
                     * Do NOT use verify-otp.html.
                     */

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
                   ACCOUNT LOCKED
                   ============================================= */

                if (
                    response.locked === true ||
                    response.isLocked === true ||
                    response.accountLocked === true
                ) {

                    showMessage(
                        response.message ||
                        "Your account is temporarily locked. Please try again later.",
                        "warning"
                    );


                    return;

                }


                /* =============================================
                   NORMAL LOGIN FAILURE
                   ============================================= */

                if (
                    response.success !== true
                ) {

                    showMessage(
                        response.message ||
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


                /* =============================================
                   SUCCESS
                   ============================================= */

                showMessage(
                    response.message ||
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


            } catch (error) {

                console.error(
                    "STOCKFLOW login error:",
                    error
                );


                showMessage(
                    error &&
                    error.message
                        ? error.message
                        : "Unable to sign in. Please try again.",
                    "error"
                );


            } finally {

                setLoading(
                    false
                );

            }

        }
    );


    /* =========================================================
       PREVENT DOUBLE ENTER SUBMISSION
       ========================================================= */

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

});
