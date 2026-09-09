document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form =
        document.getElementById("registerForm");

    if (!form) {
        console.error(
            "StockFlow: registerForm was not found."
        );
        return;
    }

    const message =
        document.getElementById("registerMessage");

    const button =
        document.getElementById("registerButton");

    /*
     * IMPORTANT:
     * These IDs MUST match register.html.
     */
    const firstNameInput =
        document.getElementById(
            "registerFirstName"
        );

    const lastNameInput =
        document.getElementById(
            "registerLastName"
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

    const termsInput =
        document.getElementById("terms");

    const communicationsInput =
        document.getElementById(
            "communications"
        );


    /* =========================================================
       ELEMENT CHECK
       ========================================================= */

    console.log(
        "StockFlow registration elements:",
        {
            form: !!form,
            firstName: !!firstNameInput,
            lastName: !!lastNameInput,
            username: !!usernameInput,
            age: !!ageInput,
            email: !!emailInput,
            phone: !!phoneInput,
            password: !!passwordInput,
            confirmPassword: !!confirmPasswordInput
        }
    );


    /*
     * This should print:
     *
     * firstName: true
     * lastName: true
     * username: true
     * age: true
     * email: true
     * phone: true
     * password: true
     * confirmPassword: true
     */


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


    /* =========================================================
       STORAGE KEYS
       ========================================================= */

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

        return clean(value)
            .toLowerCase();
    }


    function normalizeEmail(value) {

        return clean(value)
            .toLowerCase();
    }


    function normalizePhone(value) {

        let phone =
            clean(value)
                .replace(/\s+/g, "");

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
       VALIDATORS
       ========================================================= */

    function isValidName(value) {

        const name =
            clean(value);

        if (!name) {
            return false;
        }

        if (
            name.length < 1 ||
            name.length > 50
        ) {
            return false;
        }

        /*
         * Allows:
         * letters
         * accents
         * spaces
         * apostrophes
         * hyphens
         * periods
         */
        return /^[\p{L}\p{M} .'-]+$/u.test(
            name
        );
    }


    function isValidUsername(value) {

        const username =
            normalizeUsername(value);

        return /^[a-z0-9._]{4,30}$/.test(
            username
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


    function isValidEmail(value) {

        const email =
            normalizeEmail(value);

        return /^[a-z0-9._%+-]+@gmail\.com$/i.test(
            email
        );
    }


    function isValidPhone(value) {

        const phone =
            normalizePhone(value);

        return /^09\d{9}$/.test(
            phone
        );
    }


    function isStrongPassword(value) {

        const password =
            String(value ?? "");

        if (password.length < 8) {
            return false;
        }

        if (!/[A-Z]/.test(password)) {
            return false;
        }

        if (!/[a-z]/.test(password)) {
            return false;
        }

        if (!/[0-9]/.test(password)) {
            return false;
        }

        if (!/[^A-Za-z0-9]/.test(password)) {
            return false;
        }

        return true;
    }


    /* =========================================================
       VALIDATE FORM
       ========================================================= */

    function validateForm() {

        /*
         * Read directly from the CORRECT HTML IDs.
         */
        const firstName =
            clean(
                firstNameInput?.value
            );

        const lastName =
            clean(
                lastNameInput?.value
            );

        const username =
            normalizeUsername(
                usernameInput?.value
            );

        const age =
            clean(
                ageInput?.value
            );

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
                passwordInput?.value ?? ""
            );

        const confirmPassword =
            String(
                confirmPasswordInput?.value ?? ""
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
                    "Username must be 4–30 characters and may contain letters, numbers, dots, or underscores."
            };
        }


        /* =====================================================
           AGE
           ===================================================== */

        if (
            !isValidAge(age)
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
            !isValidEmail(email)
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid Gmail address."
            };
        }


        /* =====================================================
           PHONE
           ===================================================== */

        if (
            !isValidPhone(phone)
        ) {

            return {
                valid: false,
                message:
                    "Please enter a valid Philippine mobile number (09XXXXXXXXX)."
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
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
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
                    "Please agree to the terms and conditions."
            };
        }


        /* =====================================================
           SUCCESS
           ===================================================== */

        return {
            valid: true,

            data: {
                firstName,
                lastName,
                name:
                    `${firstName} ${lastName}`.trim(),

                username,

                age:
                    Number(age),

                email,
                gmail:
                    email,

                phone,

                password,

                confirmPassword,

                role:
                    "Employee"
            }
        };
    }


    /* =========================================================
       SAVE VERIFICATION STATE
       ========================================================= */

    function saveVerificationState(
        data,
        response
    ) {

        try {

            const identity =
                data.email ||
                data.phone ||
                data.username;

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                identity
            );

            sessionStorage.setItem(
                STORAGE_KEYS.UID,
                clean(
                    response?.uid ||
                    response?.user?.uid ||
                    ""
                )
            );

            sessionStorage.setItem(
                STORAGE_KEYS.USERNAME,
                data.username
            );

            sessionStorage.setItem(
                STORAGE_KEYS.EMAIL,
                data.email
            );

            sessionStorage.setItem(
                STORAGE_KEYS.GMAIL,
                data.email
            );

            sessionStorage.setItem(
                STORAGE_KEYS.PHONE,
                data.phone
            );

            /*
             * Initial channel defaults to email.
             */
            sessionStorage.setItem(
                STORAGE_KEYS.CHANNEL,
                "email"
            );

            /*
             * IMPORTANT:
             * Registration itself does NOT generate
             * an OTP.
             */
            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                "false"
            );

            /*
             * Never store an OTP from registration.
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


    function getRegistrationErrorMessage(
        error
    ) {

        const code =
            getErrorCode(error);

        const backendMessage =
            getBackendMessage(error);

        switch (code) {

            case "USERNAME_EXISTS":

            case "DUPLICATE_USERNAME":

                return (
                    "Username already exists."
                );


            case "EMAIL_EXISTS":

            case "GMAIL_EXISTS":

            case "DUPLICATE_EMAIL":

                return (
                    "This Gmail address is already registered."
                );


            case "PHONE_EXISTS":

            case "DUPLICATE_PHONE":

                return (
                    "This phone number is already registered."
                );


            case "ACCOUNT_EXISTS":

            case "DUPLICATE_ACCOUNT":

                return (
                    "An account with these details already exists."
                );


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

                if (backendMessage) {

                    return backendMessage;
                }

                return (
                    "Registration could not be completed. Please try again."
                );
        }
    }


    /* =========================================================
       GET API
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

        /*
         * FIRST CHECK:
         * Make absolutely sure the inputs exist.
         */
        if (
            !firstNameInput ||
            !lastNameInput ||
            !usernameInput ||
            !ageInput ||
            !emailInput ||
            !phoneInput ||
            !passwordInput ||
            !confirmPasswordInput
        ) {

            console.error(
                "StockFlow registration fields are missing."
            );

            showMessage(
                "Registration form could not be loaded correctly. Please refresh the page."
            );

            return;
        }


        const validation =
            validateForm();


        if (!validation.valid) {

            showMessage(
                validation.message,
                "error"
            );

            return;
        }


        const data =
            validation.data;


        const API =
            getAPI();


        if (!API) {

            showMessage(
                "Registration system is not available. Please refresh the page and try again."
            );

            return;
        }


        setLoading(true);


        try {

            /*
             * Clear previous verification state.
             */
            try {

                Object.values(
                    STORAGE_KEYS
                ).forEach(
                    key => {
                        sessionStorage.removeItem(
                            key
                        );
                    }
                );

            } catch (storageError) {

                console.warn(
                    "Unable to clear previous verification state:",
                    storageError
                );
            }


            /* =================================================
               API REGISTRATION REQUEST
               ================================================= */

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
                        data.role
                });


            console.log(
                "StockFlow registration response:",
                response
            );


            if (
                !response ||
                response.success === false
            ) {

                throw (
                    response ||
                    new Error(
                        "Registration failed."
                    )
                );
            }


            /* =================================================
               SAVE VERIFICATION STATE
               ================================================= */

            saveVerificationState(
                data,
                response
            );


            /* =================================================
               SUCCESS MESSAGE
               ================================================= */

            showMessage(
                "Registration successful. Redirecting to verification...",
                "success"
            );


            /*
             * Registration does NOT generate OTP.
             *
             * verify.js will request the OTP
             * from the backend.
             */

            window.setTimeout(
                () => {

                    window.location.href =
                        verifyRoute;

                },
                700
            );

        } catch (error) {

            console.error(
                "StockFlow registration error:",
                error
            );

            showMessage(
                getRegistrationErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            setLoading(false);
        }
    }


    /* =========================================================
       FORM SUBMIT
       ========================================================= */

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            submitRegistration();
        }
    );


    /* =========================================================
       INPUT NORMALIZATION
       ========================================================= */

    if (usernameInput) {

        usernameInput.addEventListener(
            "input",
            () => {

                usernameInput.value =
                    usernameInput.value
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9._]/g,
                            ""
                        );
            }
        );
    }


    if (emailInput) {

        emailInput.addEventListener(
            "input",
            () => {

                emailInput.value =
                    emailInput.value
                        .toLowerCase()
                        .trim();
            }
        );
    }


    if (phoneInput) {

        phoneInput.addEventListener(
            "input",
            () => {

                let value =
                    phoneInput.value
                        .replace(
                            /\D/g,
                            ""
                        );

                if (
                    value.startsWith("63") &&
                    value.length <= 12
                ) {

                    value =
                        "0" +
                        value.substring(2);
                }

                phoneInput.value =
                    value.substring(
                        0,
                        11
                    );
            }
        );
    }


    /* =========================================================
       PASSWORD SHOW / HIDE
       ========================================================= */

    document
        .querySelectorAll(
            ".register-password-toggle"
        )
        .forEach(
            toggle => {

                toggle.addEventListener(
                    "click",
                    () => {

                        const targetId =
                            toggle.dataset
                                .target ||
                            toggle.dataset
                                .togglePassword;

                        if (!targetId) {
                            return;
                        }

                        const input =
                            document.getElementById(
                                targetId
                            );

                        if (!input) {
                            return;
                        }

                        const isPassword =
                            input.type ===
                            "password";

                        input.type =
                            isPassword
                                ? "text"
                                : "password";

                        toggle.textContent =
                            isPassword
                                ? "Hide"
                                : "Show";

                        toggle.setAttribute(
                            "aria-label",
                            isPassword
                                ? "Hide password"
                                : "Show password"
                        );

                        toggle.setAttribute(
                            "aria-pressed",
                            String(
                                isPassword
                            )
                        );
                    }
                );
            }
        );


    /* =========================================================
       PASSWORD STRENGTH
       ========================================================= */

    if (passwordInput) {

        passwordInput.addEventListener(
            "input",
            () => {

                const password =
                    passwordInput.value;

                const checks = {

                    length:
                        password.length >= 8,

                    uppercase:
                        /[A-Z]/.test(
                            password
                        ),

                    lowercase:
                        /[a-z]/.test(
                            password
                        ),

                    number:
                        /[0-9]/.test(
                            password
                        ),

                    special:
                        /[^A-Za-z0-9]/.test(
                            password
                        )
                };


                /*
                 * Support optional strength
                 * indicators if present in HTML.
                 */

                Object.entries(
                    checks
                ).forEach(
                    ([key, valid]) => {

                        const element =
                            document.querySelector(
                                `[data-password-check="${key}"]`
                            );

                        if (element) {

                            element.classList.toggle(
                                "valid",
                                valid
                            );
                        }
                    }
                );
            }
        );
    }


    /* =========================================================
       CONFIRM PASSWORD
       ========================================================= */

    if (
        confirmPasswordInput &&
        passwordInput
    ) {

        confirmPasswordInput.addEventListener(
            "input",
            () => {

                if (
                    !confirmPasswordInput.value
                ) {
                    return;
                }

                if (
                    confirmPasswordInput.value ===
                    passwordInput.value
                ) {

                    confirmPasswordInput
                        .classList
                        .remove("invalid");

                } else {

                    confirmPasswordInput
                        .classList
                        .add("invalid");
                }
            }
        );
    }


    /* =========================================================
       INITIAL STATE
       ========================================================= */

    setLoading(false);

    showMessage("");


    console.log(
        "StockFlow register.js loaded successfully."
    );
});
