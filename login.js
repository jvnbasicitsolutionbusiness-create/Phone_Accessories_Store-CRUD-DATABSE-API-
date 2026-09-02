document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form =
        document.getElementById("loginForm");

    const message =
        document.getElementById("message");

    const button =
        document.getElementById("loginButton");

    const identityInput =
        document.getElementById("loginIdentity");

    const passwordInput =
        document.getElementById("loginPassword");


    if (!form) {
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

                window.location.replace(
                    STOCKFLOW_CONFIG.ROUTES.dashboard
                );

                return;
            }
        }

    } catch (error) {

        console.warn(
            "Unable to check StockFlow session:",
            error
        );

    }


    /* =========================================================
       MESSAGE
       ========================================================= */

    function clearMessage() {

        message.textContent = "";
        message.className = "auth-message";

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

        button.disabled = loading;

        button.classList.toggle(
            "loading",
            loading
        );


        const text =
            button.querySelector(".button-text");

        const loader =
            button.querySelector(".button-loader");


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
       ========================================================= */

    document
        .querySelectorAll(".password-toggle")
        .forEach(toggle => {

            toggle.addEventListener(
                "click",
                () => {

                    const target =
                        document.getElementById(
                            toggle.dataset.target
                        );

                    if (!target) {
                        return;
                    }


                    const show =
                        target.type === "password";


                    target.type =
                        show
                            ? "text"
                            : "password";


                    toggle.textContent =
                        show
                            ? "Hide"
                            : "Show";


                    toggle.setAttribute(
                        "aria-label",
                        show
                            ? "Hide password"
                            : "Show password"
                    );

                }
            );

        });


    /* =========================================================
       LOGIN
       ========================================================= */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            clearMessage();


            const identity =
                identityInput.value.trim();

            const password =
                passwordInput.value;


            /* ================================================
               CLIENT-SIDE VALIDATION
               ================================================ */

            if (!identity) {

                showMessage(
                    "Please enter your username, email or phone number."
                );

                identityInput.focus();

                return;
            }


            if (!password) {

                showMessage(
                    "Please enter your password."
                );

                passwordInput.focus();

                return;
            }


            /* ================================================
               START LOADING
               ================================================ */

            setLoading(true);


            try {

                const response =
                    await StockFlowAPI.login({
                        identity: identity,
                        password: password
                    });


                if (!response) {

                    throw new Error(
                        "No response was received from the server."
                    );

                }


                /* ============================================
                   LOGIN FAILED
                   ============================================ */

                if (!response.success) {


                    /*
                     * UNVERIFIED ACCOUNT
                     *
                     * The backend may return verified:false
                     * or requiresVerification:true.
                     */

                    if (
                        response.verified === false ||
                        response.requiresVerification === true
                    ) {

                        const otpIdentity =
                            response.identity ||
                            response.username ||
                            response.gmail ||
                            identity;


                        sessionStorage.setItem(
                            STOCKFLOW_CONFIG.OTP_KEY,
                            otpIdentity
                        );


                        showMessage(
                            response.message ||
                            "Your account has not been verified. Redirecting to OTP verification...",
                            "warning"
                        );


                        setTimeout(
                            () => {

                                window.location.href =
                                    "verify-otp.html";

                            },
                            700
                        );


                        return;
                    }


                    /*
                     * NORMAL LOGIN ERROR
                     */

                    showMessage(
                        response.message ||
                        "Invalid credentials. Please check your login information.",
                        "error"
                    );


                    return;
                }


                /* ============================================
                   SUCCESSFUL LOGIN
                   ============================================ */

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


                showMessage(
                    "Sign in successful. Redirecting...",
                    "success"
                );


                /* ============================================
                   DASHBOARD REDIRECT
                   ============================================ */

                const dashboard =
                    (
                        window.STOCKFLOW_CONFIG &&
                        STOCKFLOW_CONFIG.ROUTES &&
                        STOCKFLOW_CONFIG.ROUTES.dashboard
                    )
                    ||
                    "dashboard.html";


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
                    "StockFlow login error:",
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
