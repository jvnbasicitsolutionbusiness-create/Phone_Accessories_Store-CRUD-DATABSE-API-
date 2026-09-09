/* ============================================================
   STOCKFLOW — PASSWORD RECOVERY REQUEST CONTROLLER
   ============================================================

   RESPONSIBILITIES
   ----------------
   1. Accept Gmail / phone / username
   2. Ask backend to locate the account
   3. Ask backend to generate a REAL recovery OTP
   4. Store recovery state locally
   5. Redirect to recovery.html
   6. NEVER generate OTP on the frontend

   IMPORTANT
   ---------
   OTP generation belongs to Apps Script / Code.gs.

   This file does NOT generate OTP values.

   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};

    const ROUTES =
        CONFIG.ROUTES ||
        {};

    const STORAGE =
        CONFIG.STORAGE ||
        {};

    const AUTH =
        CONFIG.AUTH ||
        {};

    const API =
        window.StockFlowAPI ||
        window.API ||
        null;


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form =
        document.querySelector("#forgotForm");

    const msg =
        document.querySelector("#message");

    const identityInput =
        document.querySelector("#identity");


    /* =========================================================
       PAGE CHECK
       ========================================================= */

    if (!form) {
        return;
    }


    /* =========================================================
       STORAGE KEYS
       ========================================================= */

    const STORAGE_KEYS = {

        IDENTITY:
            STORAGE.OTP_IDENTITY ||
            "STOCKFLOW_OTP_IDENTITY",

        USERNAME:
            STORAGE.OTP_USERNAME ||
            "STOCKFLOW_OTP_USERNAME",

        EMAIL:
            STORAGE.OTP_EMAIL ||
            "STOCKFLOW_OTP_EMAIL",

        PHONE:
            STORAGE.OTP_PHONE ||
            "STOCKFLOW_OTP_PHONE",

        UID:
            STORAGE.OTP_UID ||
            "STOCKFLOW_OTP_UID",

        CHANNEL:
            STORAGE.OTP_CHANNEL ||
            "STOCKFLOW_OTP_CHANNEL",

        RECOVERY_READY:
            "STOCKFLOW_RECOVERY_OTP_READY",

        RECOVERY_OTP:
            "STOCKFLOW_RECOVERY_DEMO_OTP",

        RECOVERY_STARTED:
            "STOCKFLOW_RECOVERY_STARTED"
    };


    /* =========================================================
       HELPERS
       ========================================================= */

    function clean(value) {

        if (
            value === null ||
            typeof value === "undefined"
        ) {
            return "";
        }

        return String(value).trim();
    }


    function storageSet(key, value) {

        try {

            sessionStorage.setItem(
                key,
                String(value ?? "")
            );

            localStorage.setItem(
                key,
                String(value ?? "")
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW FORGOT PASSWORD] Storage unavailable.",
                error
            );
        }
    }


    function storageRemove(key) {

        try {

            sessionStorage.removeItem(key);
            localStorage.removeItem(key);

        } catch (error) {

            /* Ignore storage errors. */
        }
    }


    function getResponseData(response) {

        if (
            !response ||
            typeof response !== "object"
        ) {
            return {};
        }

        if (
            response.data &&
            typeof response.data === "object"
        ) {

            return {
                ...response,
                ...response.data
            };
        }

        return response;
    }


    /* =========================================================
       MESSAGE
       ========================================================= */

    function showMessage(
        message,
        type = "error"
    ) {

        if (!msg) {
            return;
        }

        msg.textContent =
            message || "";

        msg.className =
            type;
    }


    function hideMessage() {

        if (!msg) {
            return;
        }

        msg.textContent = "";
        msg.className = "";
    }


    /* =========================================================
       ERROR HANDLING
       ========================================================= */

    function getErrorCode(error) {

        return clean(
            error &&
            (
                error.code ||
                error.errorCode ||
                error.statusCode
            )
        ).toUpperCase();
    }


    function getErrorMessage(error) {

        if (!error) {

            return (
                "Something went wrong. Please try again."
            );
        }


        const code =
            getErrorCode(error);


        const message =
            clean(
                error.message
            );


        /*
         * Explicit backend business errors.
         */

        if (
            code === "USER_NOT_FOUND" ||
            code === "ACCOUNT_NOT_FOUND" ||
            code === "RECOVERY_USER_NOT_FOUND"
        ) {

            return (
                "No registered StockFlow account was found for that information."
            );
        }


        if (
            code === "RECOVERY_IDENTITY_MISSING"
        ) {

            return (
                "Please enter your registered Gmail, phone number, or username."
            );
        }


        if (
            code === "ACCOUNT_DISABLED"
        ) {

            return (
                "This StockFlow account is disabled. Please contact the administrator."
            );
        }


        if (
            code === "ACCOUNT_SUSPENDED"
        ) {

            return (
                "This StockFlow account is suspended. Please contact the administrator."
            );
        }


        if (
            code === "ACCOUNT_LOCKED" ||
            code === "OTP_LOCKED"
        ) {

            return (
                "Recovery verification is temporarily locked. Please try again later."
            );
        }


        if (
            code === "OTP_COOLDOWN"
        ) {

            return (
                "Please wait before requesting another recovery code."
            );
        }


        /*
         * Explicit transport errors only.
         */

        if (
            code === "NETWORK_ERROR" ||
            code === "TIMEOUT" ||
            code === "API_URL_MISSING" ||
            code === "API_URL_INVALID" ||
            code === "EMPTY_RESPONSE" ||
            code === "INVALID_JSON" ||
            code === "HTTP_ERROR"
        ) {

            return (
                "Unable to connect to the recovery service. Please try again."
            );
        }


        /*
         * Preserve backend message.
         */

        if (message) {

            return message;
        }


        /*
         * Native network errors.
         */

        if (
            error.name === "AbortError"
        ) {

            return (
                "The recovery service took too long to respond. Please try again."
            );
        }


        return (
            "Unable to process your recovery request right now. Please try again."
        );
    }


    /* =========================================================
       EXTRACT BACKEND OTP
       ========================================================= */

    function extractBackendOtp(response) {

        const data =
            getResponseData(response);


        const candidates = [

            data.demoOtp,
            data.demoOTP,

            data.generatedOtp,
            data.generatedOTP,

            data.recoveryOtp,
            data.recoveryOTP,

            data.otp,
            data.OTP
        ];


        const otpLength =
            Number(
                AUTH.OTP_LENGTH ||
                6
            );


        for (
            const candidate of candidates
        ) {

            const value =
                clean(candidate)
                    .replace(/\D/g, "");


            if (
                value.length ===
                otpLength
            ) {

                return value;
            }
        }


        return "";
    }


    /* =========================================================
       SAVE RECOVERY STATE
       ========================================================= */

    function saveRecoveryState(response) {

        const data =
            getResponseData(response);


        const username =
            clean(
                data.username ||
                data.USERNAME
            );


        const email =
            clean(
                data.email ||
                data.gmail ||
                data.GMAIL
            );


        const phone =
            clean(
                data.phone ||
                data.phoneNumber ||
                data["PHONE NO."]
            );


        const uid =
            clean(
                data.uid ||
                data.UID
            );


        const identity =
            clean(
                data.identity
            ) ||
            clean(
                identityInput
                    ? identityInput.value
                    : ""
            );


        const channel =
            clean(
                data.channel
            ) ||
            (
                identity.includes("@")
                    ? "email"
                    : "phone"
            );


        storageSet(
            STORAGE_KEYS.IDENTITY,
            identity
        );


        storageSet(
            STORAGE_KEYS.USERNAME,
            username
        );


        storageSet(
            STORAGE_KEYS.EMAIL,
            email
        );


        storageSet(
            STORAGE_KEYS.PHONE,
            phone
        );


        storageSet(
            STORAGE_KEYS.UID,
            uid
        );


        storageSet(
            STORAGE_KEYS.CHANNEL,
            channel
        );


        storageSet(
            STORAGE_KEYS.RECOVERY_READY,
            "true"
        );


        storageSet(
            STORAGE_KEYS.RECOVERY_STARTED,
            "true"
        );


        /*
         * DEMO MODE ONLY:
         *
         * Store the backend-generated OTP temporarily
         * so recovery.js can display the exact same OTP.
         *
         * No OTP is generated here.
         */

        const backendOtp =
            extractBackendOtp(response);


        if (
            backendOtp
        ) {

            storageSet(
                STORAGE_KEYS.RECOVERY_OTP,
                backendOtp
            );

        } else {

            storageRemove(
                STORAGE_KEYS.RECOVERY_OTP
            );
        }
    }


    /* =========================================================
       REDIRECT
       ========================================================= */

    function continueToRecovery() {

        const route =
            ROUTES.RECOVERY ||
            "recovery.html";


        window.location.href =
            route;
    }


    /* =========================================================
       REQUEST RECOVERY
       ========================================================= */

    async function requestRecovery() {

        if (!API) {

            showMessage(
                "The recovery service is not available.",
                "error"
            );

            return;
        }


        const value =
            identityInput
                ? clean(
                    identityInput.value
                )
                : "";


        if (!value) {

            showMessage(
                "Please enter your registered Gmail, phone number, or username.",
                "error"
            );

            if (identityInput) {
                identityInput.focus();
            }

            return;
        }


        const button =
            form.querySelector(
                "button[type='submit'], button"
            );


        if (button) {

            button.disabled = true;

            button.dataset.originalText =
                button.dataset.originalText ||
                button.textContent;

            button.textContent =
                "Checking account...";
        }


        hideMessage();


        /*
         * Clear stale recovery state.
         */

        storageRemove(
            STORAGE_KEYS.RECOVERY_READY
        );

        storageRemove(
            STORAGE_KEYS.RECOVERY_OTP
        );

        storageRemove(
            STORAGE_KEYS.RECOVERY_STARTED
        );


        try {

            /*
             * IMPORTANT:
             *
             * The backend generates the OTP.
             */

            const response =
                await API.forgotPassword({

                    identity:
                        value

                });


            const data =
                getResponseData(
                    response
                );


            if (
                response &&
                response.success === false
            ) {

                throw Object.assign(
                    new Error(
                        data.message ||
                        "Unable to start account recovery."
                    ),
                    {
                        code:
                            data.code ||
                            data.errorCode ||
                            "RECOVERY_REQUEST_FAILED"
                    }
                );
            }


            /*
             * Save everything needed by recovery.js.
             */

            saveRecoveryState(
                response
            );


            /*
             * Move to OTP page.
             */

            continueToRecovery();


        } catch (error) {

            console.error(
                "[STOCKFLOW FORGOT PASSWORD] Recovery request failed:",
                error
            );


            showMessage(
                getErrorMessage(
                    error
                ),
                "error"
            );


        } finally {

            if (button) {

                button.disabled = false;

                button.textContent =
                    button.dataset.originalText ||
                    "Continue";
            }
        }
    }


    /* =========================================================
       FORM EVENT
       ========================================================= */

    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            requestRecovery();
        }
    );


    /* =========================================================
       START
       ========================================================= */

    if (identityInput) {

        identityInput.addEventListener(
            "input",
            function () {

                hideMessage();
            }
        );
    }


});
