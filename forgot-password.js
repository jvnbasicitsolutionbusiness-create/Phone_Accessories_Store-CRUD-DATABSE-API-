document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENTS
    ========================================================= */

    const form =
        document.getElementById("forgotPasswordForm");

    if (!form) {
        return;
    }

    const identityInput =
        document.getElementById("forgotIdentity");

    const message =
        document.getElementById("forgotPasswordMessage");

    const button =
        document.getElementById("forgotPasswordButton");


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

    const recoveryRoute =
        routes.RECOVERY ||
        routes.recovery ||
        "recovery.html";


    /* =========================================================
       STORAGE KEYS
    ========================================================= */

    const STORAGE_KEYS = {

        IDENTITY:
            "STOCKFLOW_RECOVERY_IDENTITY",

        UID:
            "STOCKFLOW_RECOVERY_UID",

        USERNAME:
            "STOCKFLOW_RECOVERY_USERNAME",

        EMAIL:
            "STOCKFLOW_RECOVERY_EMAIL",

        GMAIL:
            "STOCKFLOW_RECOVERY_GMAIL",

        PHONE:
            "STOCKFLOW_RECOVERY_PHONE",

        CHANNEL:
            "STOCKFLOW_RECOVERY_CHANNEL",

        OTP_READY:
            "STOCKFLOW_RECOVERY_OTP_READY",

        OTP_EXPIRES_AT:
            "STOCKFLOW_RECOVERY_OTP_EXPIRES_AT",

        OTP_COOLDOWN:
            "STOCKFLOW_RECOVERY_OTP_COOLDOWN",

        TOKEN:
            "STOCKFLOW_RECOVERY_TOKEN"

    };


    /* =========================================================
       HELPERS
    ========================================================= */

    function clean(value) {

        return String(
            value ?? ""
        ).trim();

    }


    function normalizeIdentity(value) {

        return clean(value);

    }


    function normalizeEmail(value) {

        return clean(value).toLowerCase();

    }


    function normalizePhone(value) {

        let phone =
            clean(value).replace(
                /\s+/g,
                ""
            );


        if (
            phone.startsWith("+63")
        ) {

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


        const value =
            clean(text);


        message.textContent =
            value;


        message.hidden =
            !value;


        message.classList.remove(
            "success",
            "error",
            "warning",
            "info"
        );


        if (value) {

            message.classList.add(
                type
            );

        }

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

    }


    /* =========================================================
       CLEAR PREVIOUS RECOVERY STATE
    ========================================================= */

    function clearRecoveryState() {

        Object.values(
            STORAGE_KEYS
        ).forEach(
            (key) => {

                try {

                    sessionStorage.removeItem(
                        key
                    );

                } catch (error) {

                    console.warn(
                        "Unable to clear recovery state:",
                        error
                    );

                }

            }
        );

    }


    /* =========================================================
       SAVE RECOVERY STATE
    ========================================================= */

    function saveRecoveryState(
        identity,
        user
    ) {

        user =
            user || {};


        const uid =
            clean(
                user.uid ||
                user.userId ||
                user.id ||
                user.UID
            );


        const username =
            clean(
                user.username ||
                user.userName ||
                user.USERNAME
            ).toLowerCase();


        const email =
            normalizeEmail(
                user.email ||
                user.gmail ||
                user.GMAIL ||
                user.emailAddress
            );


        const phone =
            normalizePhone(
                user.phone ||
                user.phoneNo ||
                user.phone_number ||
                user.phoneNumber ||
                user["PHONE NO."]
            );


        try {

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                clean(identity)
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


            /*
             * Default channel.
             *
             * recovery.js may allow the user to switch
             * between email and phone verification.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.CHANNEL,
                "email"
            );


            /*
             * OTP is NOT generated here.
             *
             * The backend is responsible for generating
             * and sending the OTP.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                "false"
            );


            /*
             * Do not store the actual OTP.
             */

            sessionStorage.removeItem(
                "STOCKFLOW_RECOVERY_OTP"
            );


            /*
             * Do not reuse an old expiration time.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.OTP_EXPIRES_AT
            );


            /*
             * Do not reuse an old cooldown.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.OTP_COOLDOWN
            );


            /*
             * Never reuse an old recovery token.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.TOKEN
            );

        } catch (error) {

            console.warn(
                "Unable to save recovery state:",
                error
            );

        }

    }


    /* =========================================================
       PARSE OBJECT
    ========================================================= */

    function parseObject(
        value
    ) {

        if (!value) {
            return null;
        }


        if (
            typeof value === "object"
        ) {

            return value;

        }


        if (
            typeof value === "string"
        ) {

            try {

                return JSON.parse(
                    value
                );

            } catch (error) {

                return null;

            }

        }


        return null;

    }


    /* =========================================================
       API ERROR CODE
    ========================================================= */

    function getErrorCode(
        error
    ) {

        const directCode =
            error?.code ||
            error?.errorCode;


        if (directCode) {

            return clean(
                directCode
            ).toUpperCase();

        }


        const candidates = [

            error?.data,
            error?.response,
            error?.rawResponse,
            error?.result

        ];


        for (
            const candidate
            of candidates
        ) {

            const object =
                parseObject(
                    candidate
                );


            if (
                object &&
                (
                    object.code ||
                    object.errorCode
                )
            ) {

                return clean(
                    object.code ||
                    object.errorCode
                ).toUpperCase();

            }

        }


        return "";

    }


    /* =========================================================
       API ERROR MESSAGE
    ========================================================= */

    function getErrorMessage(
        error
    ) {

        const candidates = [

            error?.data,
            error?.response,
            error?.rawResponse,
            error?.result

        ];


        for (
            const candidate
            of candidates
        ) {

            const object =
                parseObject(
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


        if (
            typeof error?.message ===
            "string"
        ) {

            return clean(
                error.message
            );

        }


        return "";

    }


    /* =========================================================
       RECOVERY ERROR MESSAGE
    ========================================================= */

    function getRecoveryErrorMessage(
        error
    ) {

        const code =
            getErrorCode(
                error
            );


        const backendMessage =
            getErrorMessage(
                error
            );


        switch (code) {

            case "ACCOUNT_NOT_FOUND":
            case "USER_NOT_FOUND":
            case "USER_DOES_NOT_EXIST":
            case "ACCOUNT_DOES_NOT_EXIST":

                return (
                    "Account could not be found. Please check your Gmail, username, or phone number, or register first."
                );


            case "ACCOUNT_DISABLED":

                return (
                    backendMessage ||
                    "This account is disabled and cannot use password recovery."
                );


            case "ACCOUNT_SUSPENDED":

                return (
                    backendMessage ||
                    "This account is suspended and cannot use password recovery."
                );


            case "ACCOUNT_BLOCKED":

                return (
                    backendMessage ||
                    "This account is blocked and cannot use password recovery."
                );


            case "ACCOUNT_PENDING":

                return (
                    backendMessage ||
                    "This account is still pending verification. Please verify your account first."
                );


            case "RECOVERY_NOT_ALLOWED":

                return (
                    backendMessage ||
                    "Password recovery is not available for this account."
                );


            case "RATE_LIMITED":
            case "TOO_MANY_REQUESTS":
            case "OTP_COOLDOWN":

                return (
                    backendMessage ||
                    "Please wait before requesting another verification code."
                );


            case "NETWORK_ERROR":
            case "TIMEOUT":
            case "API_URL_MISSING":
            case "API_URL_INVALID":
            case "EMPTY_RESPONSE":
            case "INVALID_JSON":
            case "HTTP_ERROR":

                return (
                    "Unable to connect to the recovery system right now. Please try again."
                );


            case "API_UNAVAILABLE":
            case "API_METHOD_MISSING":

                return (
                    "The recovery system is not available right now. Please try again later."
                );


            default:

                return (
                    backendMessage ||
                    "We could not process your request. Please try again."
                );

        }

    }


    /* =========================================================
       GET API
    ========================================================= */

    function getAPI() {

        if (
            window.StockFlowAPI
        ) {

            return window.StockFlowAPI;

        }


        if (
            window.API
        ) {

            return window.API;

        }


        return null;

    }


    /* =========================================================
       VALIDATE IDENTITY
    ========================================================= */

    function validateIdentity(
        value
    ) {

        const identity =
            normalizeIdentity(
                value
            );


        if (!identity) {

            return {

                valid: false,

                message:
                    "Please enter your username, Gmail, or phone number."

            };

        }


        if (
            identity.length < 3
        ) {

            return {

                valid: false,

                message:
                    "Please enter a valid account identifier."

            };

        }


        /*
         * Email validation.
         *
         * This is intentionally simple because the user
         * may also enter username or phone number.
         */

        if (
            identity.includes("@")
        ) {

            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    identity
                )
            ) {

                return {

                    valid: false,

                    message:
                        "Please enter a valid Gmail or email address."

                };

            }

        }


        /*
         * Philippine phone validation.
         */

        if (
            /^(\+63|63|09)\d{8,10}$/.test(
                identity.replace(
                    /\s+/g,
                    ""
                )
            )
        ) {

            return {

                valid: true,

                identity

            };

        }


        return {

            valid: true,

            identity

        };

    }


    /* =========================================================
       DETERMINE WHETHER OBJECT IS A REAL USER
    ========================================================= */

    function extractUser(
        response
    ) {

        const root =
            parseObject(
                response
            );


        if (!root) {
            return null;
        }


        /*
         * Explicit backend failure always wins.
         */

        if (
            root.success === false ||
            root.ok === false
        ) {

            return null;

        }


        const candidates = [

            root.user,
            root.account,
            root.data

        ];


        for (
            const candidate
            of candidates
        ) {

            const object =
                parseObject(
                    candidate
                );


            if (
                isRealUser(
                    object
                )
            ) {

                return object;

            }

        }


        /*
         * Some APIs return the user object directly.
         */

        if (
            isRealUser(
                root
            )
        ) {

            return root;

        }


        return null;

    }


    /* =========================================================
       REAL USER CHECK
    ========================================================= */

    function isRealUser(
        user
    ) {

        if (
            !user ||
            typeof user !==
            "object"
        ) {

            return false;

        }


        const uid =
            clean(
                user.uid ||
                user.userId ||
                user.id ||
                user.UID
            );


        const username =
            clean(
                user.username ||
                user.userName ||
                user.USERNAME
            );


        const email =
            clean(
                user.email ||
                user.gmail ||
                user.GMAIL ||
                user.emailAddress
            );


        const phone =
            clean(
                user.phone ||
                user.phoneNo ||
                user.phone_number ||
                user.phoneNumber ||
                user["PHONE NO."]
            );


        return Boolean(
            uid ||
            username ||
            email ||
            phone
        );

    }


    /* =========================================================
       FIND RECOVERY ACCOUNT
    ========================================================= */

    async function findRecoveryAccount(
        identity
    ) {

        const API =
            getAPI();


        if (!API) {

            const error =
                new Error(
                    "The account lookup system is not available."
                );


            error.code =
                "API_UNAVAILABLE";


            throw error;

        }


        if (
            typeof API.getUser !==
            "function"
        ) {

            const error =
                new Error(
                    "The account lookup function is not available."
                );


            error.code =
                "API_METHOD_MISSING";


            throw error;

        }


        let response;


        try {

            response =
                await API.getUser({

                    identity:
                        identity

                });

        } catch (error) {

            throw error;

        }


        if (!response) {

            const error =
                new Error(
                    "No account information was returned."
                );


            error.code =
                "ACCOUNT_NOT_FOUND";


            throw error;

        }


        const parsedResponse =
            parseObject(
                response
            );


        if (!parsedResponse) {

            const error =
                new Error(
                    "The recovery system returned an invalid response."
                );


            error.code =
                "INVALID_JSON";


            throw error;

        }


        /*
         * Explicit backend failure.
         */

        if (
            parsedResponse.success === false ||
            parsedResponse.ok === false
        ) {

            const error =
                new Error(
                    parsedResponse.message ||
                    "Account could not be found."
                );


            error.code =
                parsedResponse.code ||
                parsedResponse.errorCode ||
                "ACCOUNT_NOT_FOUND";


            error.data =
                parsedResponse;


            throw error;

        }


        const user =
            extractUser(
                parsedResponse
            );


        /*
         * NEVER redirect when no real account exists.
         */

        if (!user) {

            const error =
                new Error(
                    parsedResponse.message ||
                    "Account could not be found."
                );


            error.code =
                parsedResponse.code ||
                parsedResponse.errorCode ||
                "ACCOUNT_NOT_FOUND";


            error.data =
                parsedResponse;


            throw error;

        }


        return user;

    }


    /* =========================================================
       PREPARE RECOVERY OTP
    ========================================================= */

    async function prepareRecoveryOTP(
        user
    ) {

        const API =
            getAPI();


        if (!API) {

            const error =
                new Error(
                    "The recovery API is not available."
                );


            error.code =
                "API_UNAVAILABLE";


            throw error;

        }


        /*
         * New StockFlow API.
         *
         * OTP generation MUST happen on the backend.
         */

        if (
            typeof API.prepareOtp ===
            "function"
        ) {

            return await API.prepareOtp({

                identity:
                    clean(
                        sessionStorage.getItem(
                            STORAGE_KEYS.IDENTITY
                        )
                    ),

                uid:
                    clean(
                        user?.uid ||
                        user?.userId ||
                        user?.id ||
                        user?.UID
                    ),

                username:
                    clean(
                        user?.username ||
                        user?.userName ||
                        user?.USERNAME
                    ),

                email:
                    normalizeEmail(
                        user?.email ||
                        user?.gmail ||
                        user?.GMAIL ||
                        user?.emailAddress
                    ),

                phone:
                    normalizePhone(
                        user?.phone ||
                        user?.phoneNo ||
                        user?.phone_number ||
                        user?.phoneNumber ||
                        user?.["PHONE NO."]
                    ),

                channel:
                    "email",

                purpose:
                    "password_recovery"

            });

        }


        /*
         * Compatibility with API naming variations.
         */

        if (
            typeof API.prepareOTP ===
            "function"
        ) {

            return await API.prepareOTP({

                identity:
                    clean(
                        sessionStorage.getItem(
                            STORAGE_KEYS.IDENTITY
                        )
                    ),

                uid:
                    clean(
                        user?.uid ||
                        user?.userId ||
                        user?.id ||
                        user?.UID
                    ),

                username:
                    clean(
                        user?.username ||
                        user?.userName ||
                        user?.USERNAME
                    ),

                email:
                    normalizeEmail(
                        user?.email ||
                        user?.gmail ||
                        user?.GMAIL ||
                        user?.emailAddress
                    ),

                phone:
                    normalizePhone(
                        user?.phone ||
                        user?.phoneNo ||
                        user?.phone_number ||
                        user?.phoneNumber ||
                        user?.["PHONE NO."]
                    ),

                channel:
                    "email",

                purpose:
                    "password_recovery"

            });

        }


        /*
         * Do not generate an OTP in the browser.
         */

        const error =
            new Error(
                "The recovery API does not provide the required OTP preparation method."
            );


        error.code =
            "API_METHOD_MISSING";


        throw error;

    }


    /* =========================================================
       PROCESS OTP RESPONSE
    ========================================================= */

    function processOtpResponse(
        response
    ) {

        const parsed =
            parseObject(
                response
            );


        if (!parsed) {

            const error =
                new Error(
                    "The recovery system returned an invalid response."
                );


            error.code =
                "INVALID_JSON";


            throw error;

        }


        if (
            parsed.success === false ||
            parsed.ok === false
        ) {

            const error =
                new Error(
                    parsed.message ||
                    "Unable to prepare password recovery."
                );


            error.code =
                parsed.code ||
                parsed.errorCode ||
                "RECOVERY_NOT_ALLOWED";


            error.data =
                parsed;


            throw error;

        }


        /*
         * Store state only.
         *
         * NEVER store:
         *
         * parsed.otp
         * parsed.code when it represents the OTP
         * parsed.verificationCode
         *
         * The actual OTP must remain server-side.
         */

        try {

            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                "true"
            );


            const expiresAt =
                clean(
                    parsed.otpExpiresAt ||
                    parsed.expiresAt ||
                    parsed.otp_expires_at
                );


            if (
                expiresAt
            ) {

                sessionStorage.setItem(
                    STORAGE_KEYS.OTP_EXPIRES_AT,
                    expiresAt
                );

            }


            const cooldown =
                Number(
                    parsed.cooldownSeconds ||
                    parsed.cooldown ||
                    0
                );


            if (
                Number.isFinite(
                    cooldown
                ) &&
                cooldown > 0
            ) {

                sessionStorage.setItem(
                    STORAGE_KEYS.OTP_COOLDOWN,
                    String(
                        cooldown
                    )
                );

            }


            const token =
                clean(
                    parsed.token ||
                    parsed.recoveryToken ||
                    parsed.resetToken
                );


            if (
                token
            ) {

                sessionStorage.setItem(
                    STORAGE_KEYS.TOKEN,
                    token
                );

            }

        } catch (error) {

            console.warn(
                "Unable to save OTP recovery state:",
                error
            );

        }


        return parsed;

    }


    /* =========================================================
       DELIVERY MESSAGE
    ========================================================= */

    function getDeliveryMessage(
        response
    ) {

        const parsed =
            parseObject(
                response
            ) || {};


        const emailSent =
            parsed.emailSent === true ||
            parsed.email_sent === true;


        const emailConfigured =
            parsed.emailConfigured === true ||
            parsed.email_configured === true;


        /*
         * If backend explicitly confirms email delivery,
         * we can tell the user the code was sent.
         */

        if (
            emailSent
        ) {

            return (
                "A verification code has been sent to your registered Gmail."
            );

        }


        /*
         * Backend may know that the email service is
         * configured but delivery has not been confirmed.
         */

        if (
            emailConfigured
        ) {

            return (
                "A verification code was requested for your registered Gmail. Please check your inbox and spam folder."
            );

        }


        /*
         * Do not falsely claim an email was delivered.
         */

        return (
            "Your account was found and a verification code was requested. Check your registered Gmail. If you do not receive it, use the resend option on the recovery page."
        );

    }


    /* =========================================================
       SUBMIT RECOVERY REQUEST
    ========================================================= */

    async function submitRecoveryRequest() {

        showMessage(
            ""
        );


        const validation =
            validateIdentity(
                identityInput?.value
            );


        if (
            !validation.valid
        ) {

            showMessage(
                validation.message,
                "error"
            );

            return;

        }


        const identity =
            validation.identity;


        /*
         * Remove previous recovery state.
         */

        clearRecoveryState();


        setLoading(
            true
        );


        try {

            /* ================================================
               STEP 1
               ACCOUNT LOOKUP
            ================================================= */

            const user =
                await findRecoveryAccount(
                    identity
                );


            /* ================================================
               STEP 2
               SAVE ACCOUNT
            ================================================= */

            saveRecoveryState(
                identity,
                user
            );


            /* ================================================
               STEP 3
               REQUEST BACKEND OTP
            ================================================= */

            showMessage(
                "Account found. Requesting verification code...",
                "info"
            );


            const otpResponse =
                await prepareRecoveryOTP(
                    user
                );


            /* ================================================
               STEP 4
               PROCESS BACKEND RESPONSE
            ================================================= */

            const processedResponse =
                processOtpResponse(
                    otpResponse
                );


            /* ================================================
               STEP 5
               SHOW DELIVERY STATUS
            ================================================= */

            showMessage(
                getDeliveryMessage(
                    processedResponse
                ),
                "success"
            );


            /* ================================================
               STEP 6
               OPEN RECOVERY PAGE
            ================================================= */

            window.setTimeout(
                () => {

                    window.location.assign(
                        recoveryRoute
                    );

                },
                500
            );

        } catch (
            error
        ) {

            console.error(
                "STOCKFLOW password recovery error:",
                error
            );


            /*
             * Errors NEVER redirect.
             */

            showMessage(
                getRecoveryErrorMessage(
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

            event.stopPropagation();

            submitRecoveryRequest();

        }
    );


    /* =========================================================
       INPUT
    ========================================================= */

    if (
        identityInput
    ) {

        identityInput.addEventListener(
            "input",
            () => {

                if (
                    message &&
                    message.textContent
                ) {

                    showMessage(
                        ""
                    );

                }

            }
        );


        identityInput.addEventListener(
            "blur",
            () => {

                identityInput.value =
                    normalizeIdentity(
                        identityInput.value
                    );

            }
        );

    }


    /* =========================================================
       INITIAL STATE
    ========================================================= */

    showMessage(
        ""
    );

});
