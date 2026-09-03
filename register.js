document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form =
        document.getElementById("registerForm");

    if (!form) {
        return;
    }


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const message =
        document.getElementById(
            "registerMessage"
        );

    const button =
        document.getElementById(
            "registerButton"
        ) ||
        form.querySelector(
            'button[type="submit"]'
        );

    const nameInput =
        document.getElementById(
            "registerName"
        );

    const usernameInput =
        document.getElementById(
            "registerUsername"
        );

    const ageInput =
        document.getElementById(
            "registerAge"
        );

    const emailInput =
        document.getElementById(
            "registerEmail"
        );

    const phoneInput =
        document.getElementById(
            "registerPhone"
        );

    const passwordInput =
        document.getElementById(
            "registerPassword"
        );

    const confirmPasswordInput =
        document.getElementById(
            "registerConfirmPassword"
        );


    /* =========================================================
       MESSAGE
       ========================================================= */

    function showMessage(
        text,
        type = "error"
    ) {
        if (!message) {
            return;
        }

        message.textContent =
            text || "";

        message.className =
            `auth-message ${type}`;
    }


    function clearMessage() {
        if (!message) {
            return;
        }

        message.textContent = "";

        message.className =
            "auth-message";
    }


    /* =========================================================
       LOADING STATE
       ========================================================= */

    function setLoading(loading) {

        if (!button) {
            return;
        }

        const text =
            button.querySelector(
                ".button-text"
            );

        const loader =
            button.querySelector(
                ".button-loader"
            );


        button.disabled =
            loading;

        button.classList.toggle(
            "loading",
            loading
        );


        /*
         * IMPORTANT:
         *
         * Do not replace button.textContent.
         *
         * The button already contains:
         *
         * .button-text
         * .button-loader
         *
         * We only toggle the hidden state.
         */

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
       VALUE HELPER
       ========================================================= */

    function getValue(input) {

        return input
            ? input.value.trim()
            : "";
    }


    /* =========================================================
       VALIDATION
       ========================================================= */

    function validateRegistration(data) {

        if (!data.name) {
            return (
                "Please enter your full name."
            );
        }


        if (!data.username) {
            return (
                "Please enter a username."
            );
        }


        if (
            data.username.length < 4 ||
            data.username.length > 30
        ) {
            return (
                "Username must contain 4–30 characters."
            );
        }


        if (
            !/^[A-Za-z0-9._-]+$/.test(
                data.username
            )
        ) {
            return (
                "Username may only contain letters, numbers, dots, underscores and hyphens."
            );
        }


        if (
            !data.age ||
            Number.isNaN(data.age)
        ) {
            return (
                "Please enter your age."
            );
        }


        if (
            data.age < 18 ||
            data.age > 100
        ) {
            return (
                "Please enter a valid age."
            );
        }


        if (!data.email) {
            return (
                "Please enter your Gmail address."
            );
        }


        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailPattern.test(
                data.email
            )
        ) {
            return (
                "Please enter a valid email address."
            );
        }


        if (!data.phone) {
            return (
                "Please enter your Philippine mobile number."
            );
        }


        const phonePattern =
            /^09\d{9}$/;


        if (
            !phonePattern.test(
                data.phone
            )
        ) {
            return (
                "Phone number must be in 09XXXXXXXXX format."
            );
        }


        if (!data.password) {
            return (
                "Please create a password."
            );
        }


        if (
            data.password.length < 8
        ) {
            return (
                "Password must contain at least 8 characters."
            );
        }


        if (
            data.password !==
            data.confirmPassword
        ) {
            return (
                "Passwords do not match."
            );
        }


        return null;
    }


    /* =========================================================
       SUBMIT
       ========================================================= */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            clearMessage();


            const data = {

                name:
                    getValue(
                        nameInput
                    ),

                username:
                    getValue(
                        usernameInput
                    ),

                age:
                    Number(
                        getValue(
                            ageInput
                        )
                    ),

                email:
                    getValue(
                        emailInput
                    ),

                phone:
                    getValue(
                        phoneInput
                    ),

                password:
                    passwordInput
                        ? passwordInput.value
                        : "",

                confirmPassword:
                    confirmPasswordInput
                        ? confirmPasswordInput.value
                        : ""
            };


            /* =================================================
               VALIDATE
               ================================================= */

            const validationError =
                validateRegistration(
                    data
                );


            if (validationError) {

                showMessage(
                    validationError,
                    "error"
                );

                return;
            }


            /* =================================================
               START LOADING
               ================================================= */

            setLoading(true);


            try {

                /* =============================================
                   API CHECK
                   ============================================= */

                if (
                    !window.StockFlowAPI ||
                    typeof StockFlowAPI.register !==
                        "function"
                ) {

                    throw new Error(
                        "StockFlow registration service is unavailable."
                    );
                }


                /* =============================================
                   API REQUEST
                   ============================================= */

                const response =
                    await StockFlowAPI.register({

                        name:
                            data.name,

                        username:
                            data.username,

                        age:
                            data.age,

                        /*
                         * Keep gmail for compatibility
                         * with your existing backend.
                         */
                        gmail:
                            data.email,

                        /*
                         * Also provide email.
                         * If the backend ignores it,
                         * that is fine.
                         */
                        email:
                            data.email,

                        phone:
                            data.phone,

                        password:
                            data.password

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
                   FAILED REGISTRATION
                   ============================================= */

                if (!response.success) {

                    showMessage(
                        response.message ||
                        "Registration failed. Please try again.",
                        "error"
                    );

                    setLoading(false);

                    return;
                }


                /* =============================================
                   OTP IDENTITY
                   ============================================= */

                const otpIdentity =
                    response.identity ||
                    response.username ||
                    response.gmail ||
                    response.email ||
                    data.username;


                /* =============================================
                   SAVE OTP IDENTITY
                   ============================================= */

                if (
                    window.STOCKFLOW_CONFIG &&
                    STOCKFLOW_CONFIG.OTP_KEY
                ) {

                    sessionStorage.setItem(
                        STOCKFLOW_CONFIG.OTP_KEY,
                        otpIdentity
                    );
                }


                /*
                 * Compatibility with older
                 * verification code.
                 */

                sessionStorage.setItem(
                    "stockflow_otp_identity",
                    otpIdentity
                );


                /* =============================================
                   SUCCESS MESSAGE
                   ============================================= */

                showMessage(
                    response.message ||
                    "Registration successful. A verification code has been sent to your email and phone.",
                    "success"
                );


                /*
                 * Keep button in loading state while
                 * redirecting. This prevents the user from
                 * submitting again.
                 */

                window.setTimeout(
                    () => {

                        window.location.replace(
                            "verify-otp.html"
                        );

                    },
                    500
                );

            } catch (error) {

                console.error(
                    "StockFlow registration error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to create your account. Please try again.",
                    "error"
                );


                /*
                 * If the page remains open,
                 * restore the normal button.
                 */

                setLoading(false);
            }
        }
    );
});
