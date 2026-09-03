/* ============================================================
   STOCKFLOW — REGISTRATION CONTROLLER
   Handles:
   - Employee account registration
   - First Name / Last Name
   - Username
   - Age
   - Email / Gmail
   - Philippine mobile number
   - Password
   - Confirm Password
   - Registration API request
   - OTP verification redirect
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       FORM
       ========================================================= */

    const form =
        document.getElementById(
            "registerForm"
        );


    /*
     * Stop safely if this page does not
     * contain the registration form.
     */

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


    /*
     * FIRST NAME
     *
     * Current STOCKFLOW HTML uses a
     * separate First Name field.
     */

    const firstNameInput =
        document.getElementById(
            "registerFirstName"
        ) ||
        document.getElementById(
            "firstName"
        );


    /*
     * LAST NAME
     *
     * Current STOCKFLOW HTML uses a
     * separate Last Name field.
     */

    const lastNameInput =
        document.getElementById(
            "registerLastName"
        ) ||
        document.getElementById(
            "lastName"
        );


    /*
     * OLD FULL NAME FIELD
     *
     * Kept only for backward compatibility.
     *
     * If an older version of auth.html still
     * contains registerName, the script can
     * still read it.
     */

    const oldNameInput =
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


        message.textContent =
            "";


        message.className =
            "auth-message";
    }


    /* =========================================================
       LOADING STATE
       ========================================================= */

    function setLoading(
        loading
    ) {

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
         * Keep the original button
         * HTML intact.
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
       VALUE HELPERS
       ========================================================= */

    function getValue(
        input
    ) {

        return input
            ? input.value.trim()
            : "";

    }


    function getPasswordValue(
        input
    ) {

        return input
            ? input.value
            : "";

    }


    /* =========================================================
       VALIDATION
       ========================================================= */

    function validateRegistration(
        data
    ) {

        /* -----------------------------------------------------
           FIRST NAME
           ----------------------------------------------------- */

        if (!data.firstName) {

            return (
                "Please enter your first name."
            );

        }


        /* -----------------------------------------------------
           LAST NAME
           ----------------------------------------------------- */

        if (!data.lastName) {

            return (
                "Please enter your last name."
            );

        }


        /* -----------------------------------------------------
           NAME CHARACTERS
           ----------------------------------------------------- */

        const namePattern =
            /^[A-Za-zÀ-ÿ' -]+$/;


        if (
            !namePattern.test(
                data.firstName
            )
        ) {

            return (
                "First name contains invalid characters."
            );

        }


        if (
            !namePattern.test(
                data.lastName
            )
        ) {

            return (
                "Last name contains invalid characters."
            );

        }


        /* -----------------------------------------------------
           USERNAME
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           AGE
           ----------------------------------------------------- */

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
                "Please enter a valid age between 18 and 100."
            );

        }


        /* -----------------------------------------------------
           EMAIL
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           PHONE
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           PASSWORD
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           CONFIRM PASSWORD
           ----------------------------------------------------- */

        if (!data.confirmPassword) {

            return (
                "Please confirm your password."
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


            /* =================================================
               READ FIRST NAME
               ================================================= */

            let firstName =
                getValue(
                    firstNameInput
                );


            /* =================================================
               READ LAST NAME
               ================================================= */

            let lastName =
                getValue(
                    lastNameInput
                );


            /*
             * BACKWARD COMPATIBILITY
             *
             * If an older auth.html contains only
             * registerName, split it into first/last
             * name automatically.
             */

            if (
                (!firstName || !lastName) &&
                oldNameInput
            ) {

                const oldName =
                    getValue(
                        oldNameInput
                    );


                const nameParts =
                    oldName.split(/\s+/);


                if (!firstName) {

                    firstName =
                        nameParts.shift() ||
                        "";

                }


                if (!lastName) {

                    lastName =
                        nameParts.join(" ") ||
                        "";

                }

            }


            /* =================================================
               READ FORM DATA
               ================================================= */

            const data = {

                firstName:
                    firstName,


                lastName:
                    lastName,


                /*
                 * Combined full name.
                 *
                 * This is retained because your
                 * existing backend may still expect
                 * the "name" property.
                 */

                name:
                    `${firstName} ${lastName}`
                        .replace(/\s+/g, " ")
                        .trim(),


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
                    getPasswordValue(
                        passwordInput
                    ),


                confirmPassword:
                    getPasswordValue(
                        confirmPasswordInput
                    )

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

            setLoading(
                true
            );


            try {

                /* =============================================
                   API CHECK
                   ============================================= */

                if (
                    !window.StockFlowAPI ||
                    typeof window.StockFlowAPI.register !==
                        "function"
                ) {

                    throw new Error(
                        "STOCKFLOW registration service is unavailable."
                    );

                }


                /* =============================================
                   REGISTER
                   ============================================= */

                const response =
                    await window.StockFlowAPI.register({

                        /*
                         * New structure
                         */

                        firstName:
                            data.firstName,


                        lastName:
                            data.lastName,


                        /*
                         * Existing backend
                         * compatibility.
                         */

                        name:
                            data.name,


                        username:
                            data.username,


                        age:
                            data.age,


                        /*
                         * Send both.
                         *
                         * Your API/backend can use
                         * whichever field it supports.
                         */

                        email:
                            data.email,


                        gmail:
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
                        "No response was received from the STOCKFLOW server."
                    );

                }


                /* =============================================
                   REGISTRATION FAILED
                   ============================================= */

                if (
                    response.success === false
                ) {

                    showMessage(
                        response.message ||
                        "Registration failed. Please check your information and try again.",
                        "error"
                    );


                    setLoading(
                        false
                    );


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
                    window.STOCKFLOW_CONFIG.OTP_KEY
                ) {

                    sessionStorage.setItem(
                        window.STOCKFLOW_CONFIG.OTP_KEY,
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
                    "Registration successful. A verification code has been sent to your registered email and mobile number.",
                    "success"
                );


                /* =============================================
                   REDIRECT TO OTP
                   ============================================= */

                /*
                 * Keep the button disabled while
                 * redirecting so the user cannot
                 * submit the registration twice.
                 */

                window.setTimeout(
                    () => {

                        window.location.replace(
                            "verify-otp.html"
                        );

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "STOCKFLOW registration error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to create your account. Please try again.",
                    "error"
                );


                setLoading(
                    false
                );

            }

        }
    );


});
