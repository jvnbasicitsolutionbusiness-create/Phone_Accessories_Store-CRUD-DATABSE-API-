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
       SAVE RECOVERY IDENTITY
    ========================================================= */

    function saveRecoveryIdentity(identity) {

        /*
         * IMPORTANT:
         *
         * We only save the identity here.
         *
         * No OTP is generated.
         * No OTP is stored.
         * No recovery token is created.
         *
         * recovery.js handles the actual recovery OTP flow.
         */

        try {

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                identity
            );


            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                "false"
            );


            sessionStorage.removeItem(
                STORAGE_KEYS.OTP
            );


            sessionStorage.removeItem(
                STORAGE_KEYS.TOKEN
            );

        } catch (error) {

            console.warn(
                "Unable to save recovery identity:",
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


    function getErrorMessage(error) {

        return clean(
            error?.message ||
            error?.data?.message ||
            error?.response?.message ||
            ""
        );

    }


    function getRecoveryErrorMessage(error) {

        const code =
            getErrorCode(error);


        const backendMessage =
            getErrorMessage(error);


        switch (code) {

            case "ACCOUNT_NOT_FOUND":
            case "USER_NOT_FOUND":
                return (
                    backendMessage ||
                    "Account does not exist."
                );


            case "ACCOUNT_DISABLED":
                return (
                    backendMessage ||
                    "This account is disabled."
                );


            case "ACCOUNT_SUSPENDED":
                return (
                    backendMessage ||
                    "This account is suspended."
                );


            case "ACCOUNT_BLOCKED":
                return (
                    backendMessage ||
                    "This account is blocked."
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
                return (
                    "Unable to connect to the recovery system right now. Please try again."
                );


            default:

                if (backendMessage) {

                    return backendMessage;

                }


                return (
                    "We could not process your request. Please try again."
                );

        }

    }


    /* =========================================================
       API ACCESS
    ========================================================= */

    function getAPI() {

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.forgotPassword ===
                "function"
        ) {

            return window.StockFlowAPI;

        }


        if (
            window.API &&
            typeof window.API.forgotPassword ===
                "function"
        ) {

            return window.API;

        }


        return null;

    }


    /* =========================================================
       VALIDATE IDENTITY
    ========================================================= */

    function validateIdentity(value) {

        const identity =
            normalizeIdentity(value);


        if (!identity) {

            return {
                valid: false,
                message:
                    "Please enter your username, Gmail, or phone number."
            };

        }


        if (identity.length < 3) {

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
       SUBMIT
    ========================================================= */

    async function submitRecoveryRequest() {

        showMessage("");


        const validation =
            validateIdentity(
                identityInput?.value
            );


        if (!validation.valid) {

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
                "The password recovery system is not available right now.",
                "error"
            );

            return;

        }


        const identity =
            validation.identity;


        /*
         * Remove previous recovery information.
         *
         * This prevents an old recovery token or OTP
         * from being reused for another account.
         */

        clearRecoveryState();


        setLoading(true);


        try {

            /*
             * IMPORTANT:
             *
             * We intentionally do NOT use the returned OTP.
             *
             * The backend/recovery flow is responsible for:
             *
             * forgot-password
             *       ↓
             * recovery.html
             *       ↓
             * recovery.js
             *       ↓
             * backend OTP generation
             */

            /*
             * We do not actually need to call forgotPassword()
             * here.
             *
             * The identity is saved locally and recovery.js
             * will perform the backend recovery request once
             * recovery.html loads.
             */


            saveRecoveryIdentity(
                identity
            );


            showMessage(
                "Account information accepted. Preparing password recovery...",
                "success"
            );


            window.setTimeout(() => {

                window.location.href =
                    recoveryRoute;

            }, 500);

        } catch (error) {

            console.error(
                "STOCKFLOW recovery start error:",
                error
            );


            showMessage(
                getRecoveryErrorMessage(
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
        (event) => {

            event.preventDefault();

            submitRecoveryRequest();

        }
    );


    /* =========================================================
       INPUT CLEANUP
    ========================================================= */

    if (identityInput) {

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
