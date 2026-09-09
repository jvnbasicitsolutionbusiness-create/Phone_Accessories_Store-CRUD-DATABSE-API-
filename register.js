document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENTS
    ========================================================= */

    const form =
        document.getElementById("registerForm");

    if (!form) {
        return;
    }

    const message =
        document.getElementById("registerMessage");

    const button =
        document.getElementById("registerButton");

    const firstNameInput =
        document.getElementById("firstName");

    const lastNameInput =
        document.getElementById("lastName");

    const usernameInput =
        document.getElementById("username");

    const ageInput =
        document.getElementById("age");

    const emailInput =
        document.getElementById("email");

    const phoneInput =
        document.getElementById("phone");

    const passwordInput =
        document.getElementById("password");

    const confirmPasswordInput =
        document.getElementById("confirmPassword");

    const termsInput =
        document.getElementById("terms");

    const communicationsInput =
        document.getElementById("communications");


    /* =========================================================
       CONFIGURATION
    ========================================================= */

    const config =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};

    const routes =
        config.ROUTES ||
        {};

    const verifyRoute =
        routes.VERIFY ||
        routes.verify ||
        "verify.html";


    const STORAGE_KEYS = {
        IDENTITY:
            "STOCKFLOW_VERIFICATION_IDENTITY",

        UID:
            "STOCKFLOW_VERIFICATION_UID",

        USERNAME:
            "STOCKFLOW_VERIFICATION_USERNAME",

        EMAIL:
            "STOCKFLOW_VERIFICATION_EMAIL",

        GMAIL:
            "STOCKFLOW_VERIFICATION_GMAIL",

        PHONE:
            "STOCKFLOW_VERIFICATION_PHONE",

        CHANNEL:
            "STOCKFLOW_VERIFICATION_CHANNEL",

        OTP_READY:
            "STOCKFLOW_OTP_READY",

        OTP:
            "STOCKFLOW_OTP"
    };


    /* =========================================================
       HELPERS
    ========================================================= */

    function clean(value) {
        return String(value ?? "").trim();
    }


    function normalizeUsername(value) {
        return clean(value).toLowerCase();
    }


    function normalizeEmail(value) {
        return clean(value).toLowerCase();
    }


    function normalizePhone(value) {

        let phone =
            clean(value).replace(/\s+/g, "");

        if (phone.startsWith("+63")) {
            phone =
                "0" +
                phone.substring(3);
        }

        if (
            phone.startsWith("63") &&
            phone.length === 12
        ) {

            phone =
                "0" +
                phone.substring(2);
        }

        return phone;
    }


    function showMessage(
        text,
        type = "error"
    ) {

        if (!message) {
            return;
        }

        message.textContent =
            clean(text);

        message.hidden =
            !clean(text);

        message.classList.remove(
            "success",
            "error",
            "warning",
            "info"
        );

        if (clean(text)) {
            message.classList.add(type);
        }
    }


    function setLoading(loading) {

        if (!button) {
            return;
        }

        button.disabled =
            Boolean(loading);

        const buttonText =
            button.querySelector(
                ".button-text"
            );

        const buttonLoader =
            button.querySelector(
                ".button-loader"
            );

        if (buttonText) {
            buttonText.hidden =
                Boolean(loading);
        }

        if (buttonLoader) {
            buttonLoader.hidden =
                !Boolean(loading);
        }
    }


    /* =========================================================
       NAME VALIDATION
       =========================================================

       FIXED ONLY THIS VALIDATION LAYER.

       Previous validator:

           /^[A-Za-zÀ-ÿ .'-]+$/

       was too restrictive.

       This version supports Unicode letters while still
       allowing normal name characters:

           Letters
           Spaces
           Apostrophes
           Hyphens
           Periods

       Examples accepted:

           Kimkim
           Jaime
           Mary Jane
           Anne-Marie
           D'Angelo
           José
           Ñ

       Numbers and unrelated symbols remain invalid.
    ========================================================= */

    function isValidName(value) {

        const name =
            clean(value)
                .normalize("NFC");


        /*
         * A person's name only needs one character
         * to be technically valid.
         *
         * The backend can impose stricter rules if required,
         * but the frontend should not reject legitimate names
         * merely because they are short.
         */

        if (
            name.length < 1 ||
            name.length > 50
        ) {

            return false;

        }


        /*
         * Unicode-aware validation.
         *
         * \p{L} = any Unicode letter
         *
         * This supports Filipino and international names
         * much better than A-Z / À-ÿ.
         */

        try {

            return (
                /^[\p{L}\p{M} .'-]+$/u.test(
                    name
                )
            );

        } catch (error) {

            /*
             * Fallback for older browsers that do not support
             * Unicode property escapes.
             */

            return (
                /^[A-Za-zÀ-ÿ .'-]+$/.test(
                    name
                )
            );

        }
    }


    function isValidUsername(value) {

        const username =
            clean(value);

        /*
         * Backend must use the same rule:
         * 4–30 characters
         * letters, numbers, underscore and dot
         */

        return (
            username.length >= 4 &&
            username.length <= 30 &&
            /^[A-Za-z0-9._]+$/.test(username)
        );
    }


    function isValidAge(value) {

        const age =
            Number(value);

        return (
            Number.isInteger(age) &&
            age >= 18 &&
            age <= 100
        );
    }


    function isValidGmail(value) {

        const email =
            normalizeEmail(value);

        return (
            /^[^\s@]+@gmail\.com$/i.test(email)
        );
    }


    function isValidPhilippinePhone(value) {

        const phone =
            normalizePhone(value);

        return /^09\d{9}$/.test(phone);
    }


    function isStrongPassword(value) {

        const password =
            String(value ?? "");

        if (password.length < 8) {
            return false;
        }

        const hasUppercase =
            /[A-Z]/.test(password);

        const hasLowercase =
            /[a-z]/.test(password);

        const hasNumber =
            /\d/.test(password);

        const hasSymbol =
            /[^A-Za-z0-9]/.test(password);

        return (
            hasUppercase &&
            hasLowercase &&
            hasNumber &&
            hasSymbol
        );
    }


    /* =========================================================
       VERIFICATION STATE
    ========================================================= */

    function clearOldVerificationState() {

        const keys = Object.values(
            STORAGE_KEYS
        );

        keys.forEach((key) => {

            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.warn(
                    "Unable to clear session state:",
                    error
                );
            }

        });
    }


    function saveVerificationState(
        response,
        data
    ) {

        /*
         * IMPORTANT:
         *
         * Do NOT save an OTP here.
         *
         * Registration only creates the pending account.
         * verify.js will call prepareOtp() and receive the
         * backend-generated OTP.
         */

        const uid =
            clean(
                response?.uid ||
                response?.user?.uid ||
                data?.uid
            );

        const username =
            normalizeUsername(
                response?.username ||
                response?.user?.username ||
                data?.username
            );

        const email =
            normalizeEmail(
                response?.gmail ||
                response?.email ||
                response?.user?.gmail ||
                response?.user?.email ||
                data?.gmail ||
                data?.email
            );

        const phone =
            normalizePhone(
                response?.phone ||
                response?.phoneNo ||
                response?.user?.phone ||
                response?.user?.phoneNo ||
                data?.phone
            );

        const identity =
            clean(
                response?.identity ||
                response?.user?.identity ||
                email ||
                username ||
                phone
            );

        const channel =
            clean(
                response?.channel ||
                "email"
            ).toLowerCase();


        try {

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                identity
            );

            sessionStorage.setItem(
                STORAGE_KEYS.UID,
                uid
            );

            sessionStorage.setItem(
                STORAGE_KEYS.USERNAME,
                username
            );

            sessionStorage.setItem(
                STORAGE_KEYS.EMAIL,
                email
            );

            sessionStorage.setItem(
                STORAGE_KEYS.GMAIL,
                email
            );

            sessionStorage.setItem(
                STORAGE_KEYS.PHONE,
                phone
            );

            sessionStorage.setItem(
                STORAGE_KEYS.CHANNEL,
                channel
            );


            /*
             * Explicitly indicate that an OTP has NOT
             * been generated yet.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                "false"
            );


            /*
             * Never store an OTP produced by registration.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.OTP
            );

        } catch (error) {

            console.warn(
                "Unable to save verification state:",
                error
            );
        }
    }


    /* =========================================================
       API ERROR HANDLING
    ========================================================= */

    function getErrorCode(error) {

        return clean(
            error?.code ||
            error?.data?.code ||
            error?.response?.code ||
            ""
        ).toUpperCase();
    }


    function getBackendMessage(error) {

        return clean(
            error?.message ||
            error?.data?.message ||
            error?.response?.message ||
            ""
        );
    }


    function getRegistrationErrorMessage(error) {

        const code =
            getErrorCode(error);

        const backendMessage =
            getBackendMessage(error);


        switch (code) {

            case "USERNAME_EXISTS":
            case "DUPLICATE_USERNAME":

                return "Username already exists.";


            case "EMAIL_EXISTS":
            case "GMAIL_EXISTS":
            case "DUPLICATE_EMAIL":

                return "This Gmail address is already registered.";


            case "PHONE_EXISTS":
            case "DUPLICATE_PHONE":

                return "This phone number is already registered.";


            case "ACCOUNT_EXISTS":
            case "DUPLICATE_ACCOUNT":

                return "An account with these details already exists.";


            case "INVALID_REGISTRATION":
            case "VALIDATION_ERROR":

                return (
                    backendMessage ||
                    "Please check your registration information."
                );


            case "API_URL_MISSING":
            case "API_URL_INVALID":
            case "NETWORK_ERROR":
            case "TIMEOUT":
            case "EMPTY_RESPONSE":
            case "INVALID_JSON":

                return (
                    "Unable to connect to the registration system right now. Please try again."
                );


            default:

                /*
                 * Preserve meaningful backend business messages.
                 */

                if (backendMessage) {
                    return backendMessage;
                }

                return (
                    "Registration could not be completed. Please try again."
                );
        }
    }


    /* =========================================================
       VALIDATION
    ========================================================= */

    function validateForm() {

        const firstName =
            clean(firstNameInput?.value);

        const lastName =
            clean(lastNameInput?.value);

        const username =
            clean(usernameInput?.value);

        const age =
            clean(ageInput?.value);

        const email =
            normalizeEmail(
                emailInput?.value
            );

        const phone =
            normalizePhone(
                phoneInput?.value
            );

        const password =
            String(
                passwordInput?.value ??
                ""
            );

        const confirmPassword =
            String(
                confirmPasswordInput?.value ??
                ""
            );


        /* =====================================================
           FIRST NAME
           ===================================================== */

        if (
            !isValidName(
                firstName
            )
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid first name."
            };
        }


        /* =====================================================
           LAST NAME
           ===================================================== */

        if (
            !isValidName(
                lastName
            )
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid last name."
            };
        }


        /* =====================================================
           USERNAME
           ===================================================== */

        if (
            !isValidUsername(
                username
            )
        ) {

            return {
                valid: false,
                message:
                    "Username must be 4–30 characters and may contain only letters, numbers, dots, and underscores."
            };
        }


        /* =====================================================
           AGE
           ===================================================== */

        if (
            !isValidAge(
                age
            )
        ) {

            return {
                valid: false,
                message:
                    "Age must be between 18 and 100."
            };
        }


        /* =====================================================
           GMAIL
           ===================================================== */

        if (
            !isValidGmail(
                email
            )
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid Gmail address ending in @gmail.com."
            };
        }


        /* =====================================================
           PHONE
           ===================================================== */

        if (
            !isValidPhilippinePhone(
                phone
            )
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid Philippine mobile number in 09XXXXXXXXX format."
            };
        }


        /* =====================================================
           PASSWORD
           ===================================================== */

        if (
            !isStrongPassword(
                password
            )
        ) {

            return {
                valid: false,
                message:
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol."
            };
        }


        /* =====================================================
           CONFIRM PASSWORD
           ===================================================== */

        if (
            password !==
            confirmPassword
        ) {

            return {
                valid: false,
                message:
                    "Passwords do not match."
            };
        }


        /* =====================================================
           TERMS
           ===================================================== */

        if (
            termsInput &&
            !termsInput.checked
        ) {

            return {
                valid: false,
                message:
                    "Please accept the terms and conditions."
            };
        }


        /* =====================================================
           COMMUNICATIONS
           =====================================================

           Optional.
        ===================================================== */

        return {

            valid: true,

            data: {

                firstName,

                lastName,

                name:
                    `${firstName} ${lastName}`.trim(),

                username:
                    normalizeUsername(
                        username
                    ),

                age:
                    Number(age),

                email,

                gmail:
                    email,

                phone,

                password,

                confirmPassword

            }

        };
    }


    /* =========================================================
       API AVAILABILITY
    ========================================================= */

    function getAPI() {

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.register ===
                "function"
        ) {

            return window.StockFlowAPI;
        }


        if (
            window.API &&
            typeof window.API.register ===
                "function"
        ) {

            return window.API;
        }


        return null;
    }


    /* =========================================================
       REGISTRATION
    ========================================================= */

    async function submitRegistration() {

        showMessage("");


        const validation =
            validateForm();


        if (
            !validation.valid
        ) {

            showMessage(
                validation.message,
                "error"
            );

            return;
        }


        const API =
            getAPI();


        if (!API) {

            showMessage(
                "The registration system is not available right now.",
                "error"
            );

            return;
        }


        const data =
            validation.data;


        /*
         * Remove old verification information first.
         */

        clearOldVerificationState();


        setLoading(
            true
        );


        try {

            /*
             * Registration creates the pending account.
             *
             * OTP generation is handled by verify.js.
             */

            const response =
                await API.register({

                    firstName:
                        data.firstName,

                    lastName:
                        data.lastName,

                    name:
                        data.name,

                    username:
                        data.username,

                    age:
                        data.age,

                    email:
                        data.email,

                    gmail:
                        data.gmail,

                    phone:
                        data.phone,

                    password:
                        data.password,

                    confirmPassword:
                        data.confirmPassword,

                    role:
                        "Employee"
                });


            if (
                !response ||
                response.success !== true
            ) {

                const error =
                    new Error(
                        response?.message ||
                        "Registration could not be completed."
                    );


                error.code =
                    response?.code ||
                    "REGISTRATION_FAILED";


                error.data =
                    response;


                throw error;
            }


            /*
             * Save only verification identity.
             *
             * No OTP is stored.
             */

            saveVerificationState(
                response,
                data
            );


            showMessage(
                response.message ||
                "Account created successfully. Preparing account verification...",
                "success"
            );


            /*
             * Redirect to verify.html.
             *
             * verify.js will then request the real OTP
             * from Code.gs.
             */

            window.setTimeout(
                () => {

                    window.location.href =
                        verifyRoute;

                },
                700
            );


        } catch (
            error
        ) {

            console.error(
                "STOCKFLOW registration error:",
                error
            );


            showMessage(
                getRegistrationErrorMessage(
                    error
                ),
                "error"
            );


        } finally {

            setLoading(
                false
            );

        }
    }


    /* =========================================================
       FORM SUBMIT
    ========================================================= */

    form.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            submitRegistration();

        }
    );


    /* =========================================================
       LIVE PASSWORD CONFIRMATION
    ========================================================= */

    if (
        confirmPasswordInput
    ) {

        confirmPasswordInput.addEventListener(
            "input",
            () => {

                const password =
                    String(
                        passwordInput?.value ??
                        ""
                    );

                const confirmPassword =
                    String(
                        confirmPasswordInput.value ??
                        ""
                    );


                if (
                    !confirmPassword
                ) {

                    confirmPasswordInput.setCustomValidity(
                        ""
                    );

                    return;
                }


                if (
                    password !==
                    confirmPassword
                ) {

                    confirmPasswordInput.setCustomValidity(
                        "Passwords do not match."
                    );

                } else {

                    confirmPasswordInput.setCustomValidity(
                        ""
                    );

                }

            }
        );
    }


    /* =========================================================
       NORMALIZE PHONE
    ========================================================= */

    if (
        phoneInput
    ) {

        phoneInput.addEventListener(
            "blur",
            () => {

                phoneInput.value =
                    normalizePhone(
                        phoneInput.value
                    );

            }
        );
    }


    /* =========================================================
       NORMALIZE EMAIL
    ========================================================= */

    if (
        emailInput
    ) {

        emailInput.addEventListener(
            "blur",
            () => {

                emailInput.value =
                    normalizeEmail(
                        emailInput.value
                    );

            }
        );
    }


    /* =========================================================
       NORMALIZE USERNAME
    ========================================================= */

    if (
        usernameInput
    ) {

        usernameInput.addEventListener(
            "blur",
            () => {

                usernameInput.value =
                    normalizeUsername(
                        usernameInput.value
                    );

            }
        );
    }


    /* =========================================================
       INITIAL STATE
    ========================================================= */

    clearOldVerificationState();

});
