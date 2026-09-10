document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       STOCKFLOW — REGISTER.JS
       =========================================================
       Registration flow:

       1. Validate registration form
       2. Send registration data to Code.gs
       3. Code.gs creates the account
       4. Code.gs automatically generates and sends
          the INITIAL EMAIL OTP
       5. Frontend stores verification information
       6. Redirect to verify.html
       7. verify.js handles manual OTP entry

       IMPORTANT:
       - Frontend NEVER generates OTP
       - Frontend NEVER auto-fills OTP
       - OTP is generated ONLY by Code.gs
       - OTP is sent ONLY by Code.gs
       ========================================================= */


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


    const firstNameInput =
        document.getElementById("registerFirstName");


    const lastNameInput =
        document.getElementById("registerLastName");


    const usernameInput =
        document.getElementById("registerUsername");


    const ageInput =
        document.getElementById("registerAge");


    const emailInput =
        document.getElementById("registerEmail");


    const phoneInput =
        document.getElementById("registerPhone");


    const passwordInput =
        document.getElementById("registerPassword");


    const confirmPasswordInput =
        document.getElementById(
            "registerConfirmPassword"
        );


    const termsInput =
        document.getElementById("terms");


    const communicationsInput =
        document.getElementById("communications");


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
            confirmPassword: !!confirmPasswordInput,
            terms: !!termsInput,
            communications: !!communicationsInput
        }
    );


    /*
     * Required registration inputs.
     */

    const requiredInputs = [
        firstNameInput,
        lastNameInput,
        usernameInput,
        ageInput,
        emailInput,
        phoneInput,
        passwordInput,
        confirmPasswordInput
    ];


    if (
        requiredInputs.some(
            input => !input
        )
    ) {

        console.error(
            "StockFlow: one or more required registration fields are missing."
        );

        showMessage(
            "Registration form could not be loaded correctly. Please refresh the page.",
            "error"
        );

        return;
    }


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

        OTP_EXPIRES:
            "STOCKFLOW_OTP_EXPIRES",

        OTP_COOLDOWN:
            "STOCKFLOW_OTP_COOLDOWN",

        EMAIL_SENT:
            "STOCKFLOW_EMAIL_OTP_SENT",

        PHONE_SENT:
            "STOCKFLOW_PHONE_OTP_SENT",

        OTP:
            "STOCKFLOW_OTP"
    };


    /* =========================================================
       HELPERS
       ========================================================= */

    function clean(value) {

        return String(
            value ?? ""
        ).trim();
    }


    function normalizeName(value) {

        return clean(value)
            .replace(/\s+/g, " ");
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


        /*
         * +639XXXXXXXXX
         * →
         * 09XXXXXXXXX
         */

        if (
            phone.startsWith("+63")
        ) {

            phone =
                "0" +
                phone.substring(3);
        }


        /*
         * 639XXXXXXXXX
         * →
         * 09XXXXXXXXX
         */

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


        const finalText =
            clean(text);


        message.textContent =
            finalText;


        message.hidden =
            !finalText;


        message.classList.remove(
            "success",
            "error",
            "warning",
            "info"
        );


        if (finalText) {

            message.classList.add(
                type
            );
        }
    }


    function setLoading(
        loading
    ) {

        if (!button) {
            return;
        }


        const isLoading =
            Boolean(loading);


        button.disabled =
            isLoading;


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
                isLoading;
        }


        if (buttonLoader) {

            buttonLoader.hidden =
                !isLoading;
        }


        /*
         * Fallback for buttons without
         * .button-text / .button-loader.
         */

        if (
            !buttonText &&
            !buttonLoader
        ) {

            if (
                isLoading &&
                !button.dataset.originalText
            ) {

                button.dataset.originalText =
                    button.textContent;
            }


            if (isLoading) {

                button.textContent =
                    "Creating account...";
            }


            if (
                !isLoading &&
                button.dataset.originalText
            ) {

                button.textContent =
                    button.dataset.originalText;
            }
        }
    }


    /* =========================================================
       VALIDATORS
       ========================================================= */

    function isValidName(value) {

        const name =
            normalizeName(value);


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
         * accented letters
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


        /*
         * Registration accepts Gmail only.
         */

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
            String(
                value ?? ""
            );


        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password)
        );
    }


    /* =========================================================
       VALIDATE FORM
       ========================================================= */

    function validateForm() {

        const firstName =
            normalizeName(
                firstNameInput.value
            );


        const lastName =
            normalizeName(
                lastNameInput.value
            );


        const username =
            normalizeUsername(
                usernameInput.value
            );


        const age =
            clean(
                ageInput.value
            );


        const email =
            normalizeEmail(
                emailInput.value
            );


        const phone =
            normalizePhone(
                phoneInput.value
            );


        const password =
            String(
                passwordInput.value ?? ""
            );


        const confirmPassword =
            String(
                confirmPasswordInput.value ?? ""
            );


        /* =====================================================
           FIRST NAME
           ===================================================== */

        if (!isValidName(firstName)) {

            return {
                valid: false,
                message:
                    "Please enter a valid first name."
            };
        }


        /* =====================================================
           LAST NAME
           ===================================================== */

        if (!isValidName(lastName)) {

            return {
                valid: false,
                message:
                    "Please enter a valid last name."
            };
        }


        /* =====================================================
           USERNAME
           ===================================================== */

        if (!isValidUsername(username)) {

            return {
                valid: false,
                message:
                    "Username must be 4–30 characters and may contain letters, numbers, dots, or underscores."
            };
        }


        /* =====================================================
           AGE
           ===================================================== */

        if (!isValidAge(age)) {

            return {
                valid: false,
                message:
                    "Age must be between 18 and 100."
            };
        }


        /* =====================================================
           GMAIL
           ===================================================== */

        if (!isValidEmail(email)) {

            return {
                valid: false,
                message:
                    "Please enter a valid Gmail address."
            };
        }


        /* =====================================================
           PHONE
           ===================================================== */

        if (!isValidPhone(phone)) {

            return {
                valid: false,
                message:
                    "Please enter a valid Philippine mobile number (09XXXXXXXXX)."
            };
        }


        /* =====================================================
           PASSWORD
           ===================================================== */

        if (!isStrongPassword(password)) {

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
           REGISTRATION DATA
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
       CLEAR VERIFICATION STATE
       ========================================================= */

    function clearVerificationState() {

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

        } catch (error) {

            console.warn(
                "StockFlow: unable to clear previous verification state.",
                error
            );
        }
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
                clean(
                    data.email ||
                    data.username
                );


            const uid =
                clean(
                    response?.uid ||
                    response?.user?.uid ||
                    response?.data?.uid ||
                    ""
                );


            /*
             * Account identity.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                identity
            );


            /*
             * UID.
             */

            if (uid) {

                sessionStorage.setItem(
                    STORAGE_KEYS.UID,
                    uid
                );

            } else {

                sessionStorage.removeItem(
                    STORAGE_KEYS.UID
                );
            }


            /*
             * Username.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.USERNAME,
                data.username
            );


            /*
             * Email.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.EMAIL,
                data.email
            );


            /*
             * Gmail.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.GMAIL,
                data.gmail
            );


            /*
             * Phone.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.PHONE,
                data.phone
            );


            /*
             * INITIAL OTP CHANNEL.
             *
             * Code.gs automatically sends the
             * registration OTP through EMAIL.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.CHANNEL,
                "email"
            );


            /* =================================================
               OTP STATUS FROM BACKEND
               ================================================= */

            const otpReady =
                Boolean(
                    response?.otpReady
                );


            const emailSent =
                Boolean(
                    response?.emailSent
                );


            const phoneSent =
                Boolean(
                    response?.phoneSent
                );


            const otpExpiresAt =
                clean(
                    response?.otpExpiresAt ||
                    ""
                );


            const otpCooldownSeconds =
                Number(
                    response?.otpCooldownSeconds ||
                    0
                );


            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                otpReady
                    ? "true"
                    : "false"
            );


            sessionStorage.setItem(
                STORAGE_KEYS.EMAIL_SENT,
                emailSent
                    ? "true"
                    : "false"
            );


            sessionStorage.setItem(
                STORAGE_KEYS.PHONE_SENT,
                phoneSent
                    ? "true"
                    : "false"
            );


            if (otpExpiresAt) {

                sessionStorage.setItem(
                    STORAGE_KEYS.OTP_EXPIRES,
                    otpExpiresAt
                );

            } else {

                sessionStorage.removeItem(
                    STORAGE_KEYS.OTP_EXPIRES
                );
            }


            sessionStorage.setItem(
                STORAGE_KEYS.OTP_COOLDOWN,
                String(
                    otpCooldownSeconds
                )
            );


            /*
             * CRITICAL:
             *
             * Never store an OTP returned from
             * the backend.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.OTP
            );


            console.log(
                "StockFlow verification state saved:",
                {
                    identity,
                    uid,
                    channel: "email",
                    otpReady,
                    emailSent,
                    phoneSent,
                    otpExpiresAt,
                    otpCooldownSeconds
                }
            );


        } catch (error) {

            console.error(
                "StockFlow: unable to save verification state.",
                error
            );

            throw new Error(
                "Unable to prepare account verification."
            );
        }
    }


    /* =========================================================
       API ERROR HELPERS
       ========================================================= */

    function getErrorCode(error) {

        return clean(
            error?.code ||
            error?.data?.code ||
            error?.response?.code ||
            error?.result?.code ||
            ""
        ).toUpperCase();
    }


    function getBackendMessage(error) {

        return clean(
            error?.data?.message ||
            error?.response?.message ||
            error?.result?.message ||
            error?.message ||
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

                return (
                    "Username already exists. Please choose another username."
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


            case "EMAIL_SEND_FAILED":

            case "OTP_DELIVERY_FAILED":

                return (
                    backendMessage ||
                    "Your account was created, but the verification email could not be sent. Please try again."
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
       GET STOCKFLOW API
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
       REGISTRATION SUBMISSION
       ========================================================= */

    async function submitRegistration() {

        showMessage("");


        /* =====================================================
           VALIDATE
           ===================================================== */

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


        /* =====================================================
           GET API
           ===================================================== */

        const API =
            getAPI();


        if (!API) {

            console.error(
                "StockFlow API is unavailable.",
                {
                    StockFlowAPI:
                        !!window.StockFlowAPI,

                    API:
                        !!window.API
                }
            );


            showMessage(
                "Registration system is not available. Please refresh the page and try again.",
                "error"
            );


            return;
        }


        setLoading(true);


        try {

            /* =================================================
               CLEAR OLD VERIFICATION STATE
               ================================================= */

            clearVerificationState();


            /* =================================================
               REGISTRATION REQUEST
               ================================================= */

            console.log(
                "StockFlow: sending registration request..."
            );


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


            /* =================================================
               RESPONSE VALIDATION
               ================================================= */

            if (!response) {

                throw {
                    code:
                        "EMPTY_RESPONSE",

                    message:
                        "The registration server returned an empty response."
                };
            }


            if (
                response.success === false
            ) {

                throw response;
            }


            if (
                response.error &&
                !response.success
            ) {

                throw response;
            }


            /* =================================================
               SAVE VERIFICATION STATE
               ================================================= */

            saveVerificationState(
                data,
                response
            );


            /* =================================================
               CHECK INITIAL OTP DELIVERY
               ================================================= */

            const otpReady =
                Boolean(
                    response.otpReady
                );


            const emailSent =
                Boolean(
                    response.emailSent
                );


            /*
             * The backend should automatically send
             * the initial registration OTP through email.
             *
             * Do NOT request another OTP here.
             */

            if (
                !otpReady ||
                !emailSent
            ) {

                console.warn(
                    "StockFlow: account registration succeeded, but initial email OTP delivery was not confirmed.",
                    response
                );


                showMessage(
                    "Account created, but the verification email could not be confirmed. Please continue to verification and use Resend Code if needed.",
                    "warning"
                );

            } else {

                showMessage(
                    "REGISTERED SUCCESSFULLY. REDIRECTING TO VERIFY PAGE",
                    "success"
                );
            }


            /* =================================================
               REDIRECT TO VERIFY
               ================================================= */

            window.setTimeout(
                () => {

                    window.location.href =
                        verifyRoute;

                },
                900
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


            if (
                button?.disabled
            ) {

                return;
            }


            submitRegistration();
        }
    );


    /* =========================================================
       USERNAME NORMALIZATION
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
                        )
                        .substring(
                            0,
                            30
                        );
            }
        );
    }


    /* =========================================================
       EMAIL NORMALIZATION
       ========================================================= */

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


    /* =========================================================
       PHONE NORMALIZATION
       ========================================================= */

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


                /*
                 * 639XXXXXXXXX
                 * →
                 * 09XXXXXXXXX
                 */

                if (
                    value.startsWith("63") &&
                    value.length <= 12
                ) {

                    value =
                        "0" +
                        value.substring(2);
                }


                /*
                 * Keep maximum 11 digits.
                 */

                phoneInput.value =
                    value.substring(
                        0,
                        11
                    );
            }
        );
    }


    /* =========================================================
       AGE NORMALIZATION
       ========================================================= */

    if (ageInput) {

        ageInput.addEventListener(
            "input",
            () => {

                ageInput.value =
                    ageInput.value
                        .replace(
                            /\D/g,
                            ""
                        )
                        .substring(
                            0,
                            3
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

    function updateConfirmPasswordState() {

        if (
            !confirmPasswordInput ||
            !passwordInput
        ) {

            return;
        }


        if (
            !confirmPasswordInput.value
        ) {

            confirmPasswordInput
                .classList
                .remove(
                    "invalid"
                );

            return;
        }


        if (
            confirmPasswordInput.value ===
            passwordInput.value
        ) {

            confirmPasswordInput
                .classList
                .remove(
                    "invalid"
                );

        } else {

            confirmPasswordInput
                .classList
                .add(
                    "invalid"
                );
        }
    }


    if (
        confirmPasswordInput &&
        passwordInput
    ) {

        confirmPasswordInput.addEventListener(
            "input",
            updateConfirmPasswordState
        );


        passwordInput.addEventListener(
            "input",
            updateConfirmPasswordState
        );
    }


    /* =========================================================
       INITIAL STATE
       ========================================================= */

    setLoading(false);

    showMessage("");


    /* =========================================================
       DEBUG
       ========================================================= */

    console.log(
        "StockFlow register.js loaded successfully."
    );

});
