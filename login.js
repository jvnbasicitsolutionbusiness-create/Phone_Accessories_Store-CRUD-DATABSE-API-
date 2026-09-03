/* ============================================================
   STOCKFLOW — LOGIN CONTROLLER
   Handles:
   - Existing session check
   - Login validation
   - API authentication
   - Unverified account / OTP redirect
   - Session storage
   - Dashboard redirect
   - Login button loading state
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
     * login.js can safely exist on other pages.
     * If the login form is not present, stop here.
     */

    if (!form) {
        return;
    }


    /* =========================================================
       CHECK REQUIRED ELEMENTS
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
       CHECK EXISTING SESSION
       ========================================================= */

    try {

        if (
            window.StockFlowAuth &&
            typeof StockFlowAuth.getCurrentUser === "function"
        ) {

            const currentUser =
                StockFlowAuth.getCurrentUser();


            if (currentUser) {

                const dashboard =
                    (
                        window.STOCKFLOW_CONFIG &&
                        STOCKFLOW_CONFIG.ROUTES &&
                        STOCKFLOW_CONFIG.ROUTES.dashboard
                    )
                    ||
                    "dashboard.html";


                window.location.replace(
                    dashboard
                );


                return;
            }

        }

    } catch (error) {

        console.warn(
            "Unable to check STOCKFLOW session:",
            error
        );

    }


    /* =========================================================
       MESSAGE FUNCTIONS
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
            "auth-message " + type;

    }


    /* =========================================================
       BUTTON LOADING
       ========================================================= */

    function setLoading(loading) {

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

    }


    /* =========================================================
       PASSWORD TOGGLE
       =========================================================
       
       NOTE:
       auth.js also handles password toggles in the new setup.
       Therefore we DO NOT attach another password listener here.
       
       This prevents the button from being triggered twice.
       ========================================================= */


    /* =========================================================
       CLEAR MESSAGE WHEN USER STARTS TYPING
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
       LOGIN FORM
       ========================================================= */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            /* -------------------------------------------------
               CLEAR OLD MESSAGE
               ------------------------------------------------- */

            clearMessage();


            /* -------------------------------------------------
               GET FORM VALUES
               ------------------------------------------------- */

            const identity =
                identityInput.value.trim();


            const password =
                passwordInput.value;


            /* =================================================
               CLIENT-SIDE VALIDATION
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
               START LOADING
               ================================================= */

            setLoading(true);


            try {

                /* =================================================
                   CHECK API
                   ================================================= */

                if (
                    !window.StockFlowAPI ||
                    typeof StockFlowAPI.login !== "function"
                ) {

                    throw new Error(
                        "The login service is currently unavailable."
                    );

                }


                /* =================================================
                   SEND LOGIN REQUEST
                   ================================================= */

                const response =
                    await StockFlowAPI.login({

                        identity:
                            identity,

                        password:
                            password

                    });


                /* =================================================
                   EMPTY RESPONSE
                   ================================================= */

                if (!response) {

                    throw new Error(
                        "No response was received from the server."
                    );

                }


                /* =================================================
                   LOGIN FAILED
                   ================================================= */

                if (!response.success) {


                    /* =============================================
                       UNVERIFIED ACCOUNT
                       ============================================= */

                    if (
                        response.verified === false ||
                        response.requiresVerification === true
                    ) {


                        /*
                         * Store the identity temporarily
                         * so the OTP page knows which account
                         * is being verified.
                         */

                        const otpIdentity =
                            response.identity ||
                            response.username ||
                            response.email ||
                            response.gmail ||
                            response.phone ||
                            identity;


                        const otpKey =
                            (
                                window.STOCKFLOW_CONFIG &&
                                STOCKFLOW_CONFIG.OTP_KEY
                            )
                            ||
                            "STOCKFLOW_OTP_IDENTITY";


                        sessionStorage.setItem(
                            otpKey,
                            otpIdentity
                        );


                        /* -----------------------------------------
                           SHOW WARNING
                           ----------------------------------------- */

                        showMessage(
                            response.message ||
                            "Your account has not been verified. Redirecting to OTP verification...",
                            "warning"
                        );


                        /* -----------------------------------------
                           REDIRECT TO OTP
                           ----------------------------------------- */

                        setTimeout(
                            () => {

                                window.location.href =
                                    "verify-otp.html";

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
                        response.isLocked === true
                    ) {

                        showMessage(
                            response.message ||
                            "Your account is temporarily locked. Please try again later.",
                            "warning"
                        );


                        return;
                    }


                    /* =============================================
                       NORMAL LOGIN ERROR
                       ============================================= */

                    showMessage(
                        response.message ||
                        "Invalid credentials. Please check your login information.",
                        "error"
                    );


                    return;
                }


                /* =================================================
                   SUCCESSFUL LOGIN
                   ================================================= */

                if (
                    window.StockFlowAuth &&
                    typeof StockFlowAuth.saveLogin === "function"
                ) {

                    StockFlowAuth.saveLogin(
                        response
                    );

                } else {

                    /*
                     * Compatibility fallback.
                     */

                    sessionStorage.setItem(
                        "STOCKFLOW_SESSION",
                        JSON.stringify(response)
                    );

                }


                /* =================================================
                   SUCCESS MESSAGE
                   ================================================= */

                showMessage(
                    "Sign in successful. Redirecting...",
                    "success"
                );


                /* =================================================
                   DASHBOARD ROUTE
                   ================================================= */

                const dashboard =
                    (
                        window.STOCKFLOW_CONFIG &&
                        STOCKFLOW_CONFIG.ROUTES &&
                        STOCKFLOW_CONFIG.ROUTES.dashboard
                    )
                    ||
                    "dashboard.html";


                /* =================================================
                   REDIRECT
                   ================================================= */

                setTimeout(
                    () => {

                        window.location.replace(
                            dashboard
                        );

                    },
                    250
                );


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


            } finally {

                setLoading(false);

            }

        }
    );

});
