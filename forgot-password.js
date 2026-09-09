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
       STORAGE
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

        OTP:
            "STOCKFLOW_RECOVERY_OTP",

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

    function setLoading(loading) {

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
        ).forEach((key) => {

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

        });

    }


    /* =========================================================
       SAVE RECOVERY STATE
       =========================================================

       Only account identity is saved here.

       OTP generation remains the responsibility of
       recovery.js / backend.
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
                user.id
            );


        const username =
            clean(
                user.username ||
                user.userName
            ).toLowerCase();


        const email =
            normalizeEmail(
                user.email ||
                user.gmail
            );


        const phone =
            normalizePhone(
                user.phone ||
                user.phoneNo ||
                user.phone_number
            );


        /*
         * Keep the user's original input as the primary
         * recovery identity.
         */

        const recoveryIdentity =
            clean(identity);


        try {

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                recoveryIdentity
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
                "email"
            );


            /*
             * Recovery OTP has NOT been generated yet.
             */

            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                "false"
            );


            /*
             * Never carry an old OTP or token into
             * a new recovery attempt.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.OTP
            );


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
       API ERROR EXTRACTION
       ========================================================= */

    function getErrorCode(error) {

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
            const candidate of candidates
        ) {

            let object =
                candidate;


            if (
                typeof candidate ===
                "string"
            ) {

                try {

                    object =
                        JSON.parse(
                            candidate
                        );

                } catch (parseError) {

                    object =
                        null;

                }

            }


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


    function getErrorMessage(error) {

        const candidates = [

            error?.data,
            error?.response,
            error?.rawResponse,
            error?.result

        ];


        for (
            const candidate of candidates
        ) {

            let object =
                candidate;


            if (
                typeof candidate ===
                "string"
            ) {

                try {

                    object =
                        JSON.parse(
                            candidate
                        );

                } catch (parseError) {

                    object =
                        null;

                }

            }


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
                    "This account is still pending verification."
                );


            case "RECOVERY_NOT_ALLOWED":

                return (
                    backendMessage ||
                    "Password recovery is not available for this account."
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


            default:

                return (
                    backendMessage ||
                    "We could not process your request. Please try again."
                );

        }

    }


    /* =========================================================
       API ACCESS
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


        return {

            valid: true,

            identity

        };

    }


    /* =========================================================
       FIND ACCOUNT
       =========================================================

       IMPORTANT FIX:

       The previous version NEVER checked the backend.

       It immediately redirected to recovery.html.

       This version first asks the backend whether the
       supplied Gmail / username / phone belongs to an
       existing account.

       It does NOT generate an OTP here.

       recovery.js remains responsible for requesting
       the recovery OTP after the account is confirmed.
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


        /*
         * getUser() is intentionally used for the
         * existence check only.
         *
         * This prevents forgot-password.js and
         * recovery.js from requesting two different OTPs.
         */

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


        const response =
            await API.getUser({

                identity:
                    identity

            });


        if (!response) {

            const error =
                new Error(
                    "No account information was returned."
                );


            error.code =
                "ACCOUNT_NOT_FOUND";


            throw error;

        }


        /*
         * Support different backend response formats.
         */

        const success =
            response.success === true ||
            response.ok === true;


        const user =
            response.user ||
            response.account ||
            response.data ||
            response;


        /*
         * Explicit failure response.
         */

        if (
            response.success === false ||
            response.ok === false
        ) {

            const error =
                new Error(
                    response.message ||
                    "Account could not be found."
                );


            error.code =
                response.code ||
                "ACCOUNT_NOT_FOUND";


            error.data =
                response;


            throw error;

        }


        /*
         * Some versions of getUser() may return a
         * user object directly.
         */

        const hasUser =
            Boolean(
                user &&
                (
                    user.uid ||
                    user.userId ||
                    user.id ||
                    user.username ||
                    user.email ||
                    user.gmail ||
                    user.phone ||
                    user.phoneNo
                )
            );


        if (
            !success &&
            !hasUser
        ) {

            const error =
                new Error(
                    response.message ||
                    "Account could not be found."
                );


            error.code =
                response.code ||
                "ACCOUNT_NOT_FOUND";


            error.data =
                response;


            throw error;

        }


        return user;

    }


    /* =========================================================
       SUBMIT
    ========================================================= */

    async function submitRecoveryRequest() {

        showMessage("");


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
         * Clear any previous account's recovery state.
         */

        clearRecoveryState();


        setLoading(
            true
        );


        try {

            /*
             * =================================================
             * ACCOUNT EXISTENCE CHECK
             * =================================================
             */

            const user =
                await findRecoveryAccount(
                    identity
                );


            /*
             * Account exists.
             *
             * Save the identity and continue to recovery.html.
             */

            saveRecoveryState(
                identity,
                user
            );


            showMessage(
                "Account found. Preparing password recovery...",
                "success"
            );


            /*
             * IMPORTANT:
             *
             * No OTP is requested here.
             *
             * recovery.js will request the backend-generated
             * OTP after recovery.html loads.
             */

            window.setTimeout(
                () => {

                    window.location.href =
                        recoveryRoute;

                },
                500
            );


        } catch (
            error
        ) {

            console.error(
                "STOCKFLOW recovery account lookup error:",
                error
            );


            /*
             * MOST IMPORTANT BEHAVIOR:
             *
             * If the account doesn't exist,
             * DO NOT redirect.
             *
             * Stay on forgot-password.html and show
             * the account-not-found message.
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

            submitRecoveryRequest();

        }
    );


    /* =========================================================
       CLEAR ERROR WHILE TYPING
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

                    showMessage("");

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

});
