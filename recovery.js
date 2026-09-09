document.addEventListener("DOMContentLoaded", () => {
    "use strict";


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const recoveryOtpStep =
        document.getElementById("recoveryOtpStep");

    const newPasswordStep =
        document.getElementById("newPasswordStep");

    const recoverySuccessStep =
        document.getElementById("recoverySuccessStep");


    const recoveryOtpForm =
        document.getElementById("recoveryOtpForm");


    const recoveryOtpInputs =
        document.querySelectorAll(
            "#recoveryOtpInputs input"
        );


    const recoveryOtpMessage =
        document.getElementById("recoveryOtpMessage");


    const recoveryOtpDestination =
        document.getElementById("recoveryOtpDestination");


    const recoveryVerifyButton =
        document.getElementById("recoveryVerifyOtpBtn");


    const recoveryResendButton =
        document.getElementById("recoveryResendOtpBtn");


    const recoveryOtpTimer =
        document.getElementById("recoveryOtpTimer");


    const newPasswordForm =
        document.getElementById("newPasswordForm");


    const newPasswordInput =
        document.getElementById("newPassword");


    const confirmPasswordInput =
        document.getElementById("confirmNewPassword");


    const passwordMessage =
        document.getElementById("newPasswordMessage");


    const resetPasswordButton =
        document.getElementById("resetPasswordBtn");


    const successMessage =
        document.getElementById("recoverySuccessMessage");


    const successLoginLink =
        document.querySelector(
            "[data-recovery-login]"
        );


    /* =========================================================
       CONFIGURATION
    ========================================================= */

    const config =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};


    const AUTH_CONFIG =
        config.AUTH ||
        {};


    const routes =
        config.ROUTES ||
        {};


    const authRoute =
        routes.AUTH ||
        routes.auth ||
        "auth.html";


    const RESEND_COOLDOWN =
        Number(
            AUTH_CONFIG.RESEND_COOLDOWN ||
            AUTH_CONFIG.resendCooldown ||
            120
        );


    const OTP_LENGTH =
        Number(
            AUTH_CONFIG.OTP_LENGTH ||
            AUTH_CONFIG.otpLength ||
            6
        );


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
       STATE
    ========================================================= */

    const state = {

        identity: "",

        uid: "",

        username: "",

        email: "",

        gmail: "",

        phone: "",

        channel: "email",

        otpReady: false,

        otpVerified: false,

        recoveryVerified: false,

        recoveryToken: "",

        requestingOtp: false,

        verifyingOtp: false,

        resettingPassword: false,

        countdowns: {

            email: 0,

            phone: 0

        },

        countdownTimer: null

    };


    /* =========================================================
       BASIC HELPERS
    ========================================================= */

    function clean(value) {

        return String(
            value ?? ""
        ).trim();

    }


    function normalizeEmail(value) {

        return clean(
            value
        ).toLowerCase();

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


    function parseObject(value) {

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
       MESSAGE HANDLING
    ========================================================= */

    function showOtpMessage(
        text,
        type = "error"
    ) {

        if (!recoveryOtpMessage) {
            return;
        }


        const value =
            clean(text);


        recoveryOtpMessage.textContent =
            value;


        recoveryOtpMessage.hidden =
            !value;


        recoveryOtpMessage.classList.remove(
            "success",
            "error",
            "warning",
            "info"
        );


        if (value) {

            recoveryOtpMessage.classList.add(
                type
            );

        }

    }


    function showPasswordMessage(
        text,
        type = "error"
    ) {

        if (!passwordMessage) {
            return;
        }


        const value =
            clean(text);


        passwordMessage.textContent =
            value;


        passwordMessage.hidden =
            !value;


        passwordMessage.classList.remove(
            "success",
            "error",
            "warning",
            "info"
        );


        if (value) {

            passwordMessage.classList.add(
                type
            );

        }

    }


    /* =========================================================
       BUTTON LOADING
    ========================================================= */

    function setButtonLoading(
        button,
        loading,
        normalText,
        loadingText
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

            buttonText.textContent =
                normalText;


            buttonText.hidden =
                isLoading;

        }


        if (buttonLoader) {

            buttonLoader.textContent =
                loadingText;


            buttonLoader.hidden =
                !isLoading;

        }

    }


    /* =========================================================
       ERROR HELPERS
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


    function getErrorMessage(error) {

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

                return clean(
                    object.message
                );

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


    function getRecoveryErrorMessage(error) {

        const code =
            getErrorCode(
                error
            );


        const message =
            getErrorMessage(
                error
            );


        switch (code) {

            case "ACCOUNT_NOT_FOUND":
            case "USER_NOT_FOUND":
            case "USER_DOES_NOT_EXIST":
            case "ACCOUNT_DOES_NOT_EXIST":

                return (
                    message ||
                    "Account could not be found."
                );


            case "ACCOUNT_DISABLED":

                return (
                    message ||
                    "This account is disabled."
                );


            case "ACCOUNT_SUSPENDED":

                return (
                    message ||
                    "This account is suspended."
                );


            case "ACCOUNT_BLOCKED":

                return (
                    message ||
                    "This account is blocked."
                );


            case "ACCOUNT_PENDING":

                return (
                    message ||
                    "This account is still pending verification."
                );


            case "RECOVERY_NOT_ALLOWED":

                return (
                    message ||
                    "Password recovery is not available for this account."
                );


            case "OTP_EXPIRED":

                return (
                    message ||
                    "This verification code has expired. Please request a new code."
                );


            case "INVALID_OTP":
            case "OTP_INVALID":

                return (
                    message ||
                    "The verification code is incorrect."
                );


            case "OTP_LOCKED":
            case "ACCOUNT_LOCKED":
            case "TEMPORARILY_LOCKED":

                return (
                    message ||
                    "Too many incorrect attempts. Please try again later."
                );


            case "OTP_COOLDOWN":
            case "RATE_LIMITED":
            case "TOO_MANY_REQUESTS":

                return (
                    message ||
                    "Please wait before requesting another verification code."
                );


            case "OTP_NOT_READY":

                return (
                    message ||
                    "Your verification code is not ready yet."
                );


            case "RECOVERY_TOKEN_INVALID":
            case "INVALID_RECOVERY_TOKEN":
            case "RECOVERY_EXPIRED":

                return (
                    message ||
                    "Your recovery session has expired. Please start password recovery again."
                );


            case "PASSWORD_INVALID":
            case "INVALID_PASSWORD":

                return (
                    message ||
                    "The new password does not meet the security requirements."
                );


            case "PASSWORD_MISMATCH":

                return (
                    message ||
                    "Passwords do not match."
                );


            case "PASSWORD_RESET_FAILED":

                return (
                    message ||
                    "The password could not be reset. Please try again."
                );


            case "NETWORK_ERROR":
            case "TIMEOUT":
            case "API_URL_MISSING":
            case "API_URL_INVALID":
            case "EMPTY_RESPONSE":
            case "INVALID_JSON":
            case "HTTP_ERROR":

                return (
                    "Unable to connect to the password recovery system right now. Please try again."
                );


            case "API_UNAVAILABLE":
            case "API_METHOD_MISSING":

                return (
                    "The password recovery service is not available right now. Please try again later."
                );


            default:

                return (
                    message ||
                    "Password recovery could not be completed. Please try again."
                );

        }

    }


    /* =========================================================
       LOAD SAVED STATE
    ========================================================= */

    function loadSavedState() {

        try {

            state.identity =
                clean(
                    sessionStorage.getItem(
                        STORAGE_KEYS.IDENTITY
                    )
                );


            state.uid =
                clean(
                    sessionStorage.getItem(
                        STORAGE_KEYS.UID
                    )
                );


            state.username =
                clean(
                    sessionStorage.getItem(
                        STORAGE_KEYS.USERNAME
                    )
                );


            state.email =
                normalizeEmail(
                    sessionStorage.getItem(
                        STORAGE_KEYS.EMAIL
                    )
                );


            state.gmail =
                normalizeEmail(
                    sessionStorage.getItem(
                        STORAGE_KEYS.GMAIL
                    )
                );


            state.phone =
                normalizePhone(
                    sessionStorage.getItem(
                        STORAGE_KEYS.PHONE
                    )
                );


            state.channel =
                clean(
                    sessionStorage.getItem(
                        STORAGE_KEYS.CHANNEL
                    )
                ).toLowerCase() ||
                "email";


            if (
                state.channel !== "email" &&
                state.channel !== "phone"
            ) {

                state.channel =
                    "email";

            }


            state.otpReady =
                sessionStorage.getItem(
                    STORAGE_KEYS.OTP_READY
                ) === "true";


            state.recoveryToken =
                clean(
                    sessionStorage.getItem(
                        STORAGE_KEYS.TOKEN
                    )
                );


            /*
             * IMPORTANT:
             *
             * There is intentionally NO:
             *
             * state.otp
             * state.demoOtp
             * sessionStorage OTP loading
             *
             * The real OTP belongs only to the backend.
             */

        } catch (error) {

            console.warn(
                "Unable to load recovery state:",
                error
            );

        }

    }


    /* =========================================================
       SAVE STATE
    ========================================================= */

    function saveState() {

        try {

            sessionStorage.setItem(
                STORAGE_KEYS.IDENTITY,
                state.identity
            );


            sessionStorage.setItem(
                STORAGE_KEYS.UID,
                state.uid
            );


            sessionStorage.setItem(
                STORAGE_KEYS.USERNAME,
                state.username
            );


            sessionStorage.setItem(
                STORAGE_KEYS.EMAIL,
                state.email
            );


            sessionStorage.setItem(
                STORAGE_KEYS.GMAIL,
                state.gmail
            );


            sessionStorage.setItem(
                STORAGE_KEYS.PHONE,
                state.phone
            );


            sessionStorage.setItem(
                STORAGE_KEYS.CHANNEL,
                state.channel
            );


            sessionStorage.setItem(
                STORAGE_KEYS.OTP_READY,
                state.otpReady
                    ? "true"
                    : "false"
            );


            /*
             * Never store the actual OTP.
             */

            sessionStorage.removeItem(
                "STOCKFLOW_RECOVERY_OTP"
            );


            if (
                state.recoveryToken
            ) {

                sessionStorage.setItem(
                    STORAGE_KEYS.TOKEN,
                    state.recoveryToken
                );

            }

        } catch (error) {

            console.warn(
                "Unable to save recovery state:",
                error
            );

        }

    }


    /* =========================================================
       UPDATE STATE FROM API RESPONSE
    ========================================================= */

    function updateStateFromResponse(
        response
    ) {

        const parsed =
            parseObject(
                response
            );


        if (!parsed) {
            return;
        }


        const user =
            parseObject(
                parsed.user
            ) || {};


        state.uid =
            clean(
                parsed.uid ||
                parsed.userId ||
                user.uid ||
                user.userId ||
                state.uid
            );


        state.username =
            clean(
                parsed.username ||
                parsed.userName ||
                user.username ||
                user.userName ||
                state.username
            );


        state.email =
            normalizeEmail(
                parsed.email ||
                parsed.gmail ||
                parsed.emailAddress ||
                user.email ||
                user.gmail ||
                user.emailAddress ||
                state.email
            );


        state.gmail =
            state.email;


        state.phone =
            normalizePhone(
                parsed.phone ||
                parsed.phoneNo ||
                parsed.phoneNumber ||
                user.phone ||
                user.phoneNo ||
                user.phoneNumber ||
                state.phone
            );


        state.identity =
            clean(
                parsed.identity ||
                user.identity ||
                state.identity ||
                state.email ||
                state.username ||
                state.phone
            );


        const channel =
            clean(
                parsed.channel ||
                state.channel
            ).toLowerCase();


        if (
            channel === "email" ||
            channel === "phone"
        ) {

            state.channel =
                channel;

        }


        /*
         * The server may indicate that an OTP is ready.
         *
         * We NEVER read or save an OTP value.
         */

        if (
            parsed.otpReady === true
        ) {

            state.otpReady =
                true;

        }


        /*
         * Recovery token is allowed because it is an
         * authorization token returned AFTER successful
         * OTP verification.
         */

        const token =
            clean(
                parsed.recoveryToken ||
                parsed.token ||
                parsed.resetToken
            );


        if (token) {

            state.recoveryToken =
                token;

        }


        saveState();

    }


    /* =========================================================
       DESTINATION MASKING
    ========================================================= */

    function maskEmail(email) {

        const value =
            normalizeEmail(
                email
            );


        if (!value) {
            return "";
        }


        const parts =
            value.split("@");


        if (
            parts.length !== 2
        ) {

            return value;

        }


        const local =
            parts[0];


        const domain =
            parts[1];


        if (
            local.length <= 2
        ) {

            return (
                local.charAt(0) +
                "•••@" +
                domain
            );

        }


        return (
            local.substring(0, 2) +
            "••••@" +
            domain
        );

    }


    function maskPhone(phone) {

        const value =
            normalizePhone(
                phone
            );


        if (!value) {
            return "";
        }


        if (
            value.length < 7
        ) {

            return value;

        }


        return (
            value.substring(0, 3) +
            "••••••" +
            value.substring(
                value.length - 2
            )
        );

    }


    function updateDestination() {

        if (!recoveryOtpDestination) {
            return;
        }


        if (
            state.channel === "phone"
        ) {

            recoveryOtpDestination.textContent =
                state.phone
                    ? `Code destination: ${maskPhone(state.phone)}`
                    : "Code destination: registered phone";

            return;

        }


        recoveryOtpDestination.textContent =
            state.email
                ? `Code destination: ${maskEmail(state.email)}`
                : "Code destination: registered Gmail";

    }


    /* =========================================================
       OTP INPUT
    ========================================================= */

    function getOtpInputs() {

        return Array.from(
            recoveryOtpInputs
        );

    }


    function getOtpValue() {

        return getOtpInputs()
            .map(
                (input) =>
                    clean(
                        input.value
                    )
            )
            .join("");

    }


    function setOtpValue(
        value
    ) {

        const digits =
            clean(value)
                .replace(
                    /\D/g,
                    ""
                )
                .substring(
                    0,
                    OTP_LENGTH
                );


        const inputs =
            getOtpInputs();


        inputs.forEach(
            (input, index) => {

                input.value =
                    digits.charAt(index) ||
                    "";

            }
        );


        updateVerifyButton();

    }


    function clearOtpInputs() {

        getOtpInputs().forEach(
            (input) => {

                input.value =
                    "";

            }
        );


        updateVerifyButton();

    }


    function setOtpInputsEnabled(
        enabled
    ) {

        getOtpInputs().forEach(
            (input) => {

                input.disabled =
                    !enabled;

            }
        );

    }


    function updateVerifyButton() {

        if (!recoveryVerifyButton) {
            return;
        }


        const otp =
            getOtpValue();


        recoveryVerifyButton.disabled =
            state.verifyingOtp ||
            otp.length !== OTP_LENGTH;

    }


    /* =========================================================
       OTP INPUT EVENTS
    ========================================================= */

    function setupOtpInputs() {

        const inputs =
            getOtpInputs();


        inputs.forEach(
            (input, index) => {

                input.setAttribute(
                    "inputmode",
                    "numeric"
                );


                input.setAttribute(
                    "autocomplete",
                    "one-time-code"
                );


                input.addEventListener(
                    "input",
                    () => {

                        input.value =
                            input.value
                                .replace(
                                    /\D/g,
                                    ""
                                )
                                .substring(
                                    0,
                                    1
                                );


                        if (
                            input.value &&
                            index <
                                inputs.length - 1
                        ) {

                            inputs[
                                index + 1
                            ].focus();

                        }


                        updateVerifyButton();

                    }
                );


                input.addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key ===
                            "Backspace"
                        ) {

                            if (
                                !input.value &&
                                index > 0
                            ) {

                                inputs[
                                    index - 1
                                ].value =
                                    "";


                                inputs[
                                    index - 1
                                ].focus();

                            }

                        }


                        if (
                            event.key ===
                            "ArrowLeft" &&
                            index > 0
                        ) {

                            inputs[
                                index - 1
                            ].focus();

                        }


                        if (
                            event.key ===
                            "ArrowRight" &&
                            index <
                                inputs.length - 1
                        ) {

                            inputs[
                                index + 1
                            ].focus();

                        }

                    }
                );


                input.addEventListener(
                    "paste",
                    (event) => {

                        event.preventDefault();


                        const clipboard =
                            event.clipboardData ||
                            window.clipboardData;


                        if (!clipboard) {
                            return;
                        }


                        const pasted =
                            clipboard
                                .getData("text")
                                .replace(
                                    /\D/g,
                                    ""
                                )
                                .substring(
                                    0,
                                    OTP_LENGTH
                                );


                        setOtpValue(
                            pasted
                        );


                        const finalInputs =
                            getOtpInputs();


                        if (
                            finalInputs.length
                        ) {

                            const focusIndex =
                                Math.min(
                                    pasted.length,
                                    finalInputs.length - 1
                                );


                            finalInputs[
                                focusIndex
                            ].focus();

                        }

                    }
                );

            }
        );

    }


    /* =========================================================
       COOLDOWN
    ========================================================= */

    function formatTime(
        seconds
    ) {

        const value =
            Math.max(
                0,
                Number(seconds) || 0
            );


        const minutes =
            Math.floor(
                value / 60
            );


        const remaining =
            value % 60;


        return (
            String(
                minutes
            ).padStart(
                2,
                "0"
            ) +
            ":" +
            String(
                remaining
            ).padStart(
                2,
                "0"
            )
        );

    }


    function getChannelCooldown() {

        if (
            state.channel === "phone"
        ) {

            return state.countdowns.phone;

        }


        return state.countdowns.email;

    }


    function updateCountdownUI() {

        const seconds =
            getChannelCooldown();


        if (recoveryOtpTimer) {

            if (
                seconds > 0
            ) {

                const channelName =
                    state.channel === "phone"
                        ? "Phone"
                        : "Email";


                recoveryOtpTimer.textContent =
                    `${channelName} code available again in ${formatTime(seconds)}.`;

            } else {

                recoveryOtpTimer.textContent =
                    state.channel === "phone"
                        ? "Phone code available."
                        : "Email code available.";

            }

        }


        if (recoveryResendButton) {

            recoveryResendButton.disabled =
                state.requestingOtp ||
                seconds > 0;

        }

    }


    function startCooldown(
        channel,
        seconds
    ) {

        const safeChannel =
            channel === "phone"
                ? "phone"
                : "email";


        const safeSeconds =
            Math.max(
                0,
                Math.floor(
                    Number(seconds) || 0
                )
            );


        state.countdowns[
            safeChannel
        ] =
            safeSeconds;


        updateCountdownUI();


        if (
            state.countdownTimer
        ) {

            return;

        }


        if (
            state.countdowns.email <= 0 &&
            state.countdowns.phone <= 0
        ) {

            return;

        }


        state.countdownTimer =
            window.setInterval(
                () => {

                    if (
                        state.countdowns.email > 0
                    ) {

                        state.countdowns.email--;

                    }


                    if (
                        state.countdowns.phone > 0
                    ) {

                        state.countdowns.phone--;

                    }


                    updateCountdownUI();


                    if (
                        state.countdowns.email <= 0 &&
                        state.countdowns.phone <= 0
                    ) {

                        window.clearInterval(
                            state.countdownTimer
                        );


                        state.countdownTimer =
                            null;

                    }

                },
                1000
            );

    }


    /* =========================================================
       LOAD INITIAL COOLDOWN
    ========================================================= */

    function loadInitialCooldown() {

        try {

            const storedCooldown =
                Number(
                    sessionStorage.getItem(
                        STORAGE_KEYS.OTP_COOLDOWN
                    ) || 0
                );


            if (
                storedCooldown > 0
            ) {

                startCooldown(
                    state.channel,
                    storedCooldown
                );

            }

        } catch (error) {

            console.warn(
                "Unable to load recovery cooldown:",
                error
            );

        }

    }


    /* =========================================================
       REQUEST OTP
    ========================================================= */

    async function requestRecoveryOtp(
        requestedChannel = state.channel
    ) {

        const API =
            getAPI();


        if (!API) {

            showOtpMessage(
                "The password recovery system is not available right now.",
                "error"
            );

            return;

        }


        const channel =
            clean(
                requestedChannel
            ).toLowerCase();


        if (
            channel !== "email" &&
            channel !== "phone"
        ) {

            showOtpMessage(
                "Please select a valid verification method.",
                "error"
            );

            return;

        }


        if (
            state.requestingOtp
        ) {

            return;

        }


        const cooldown =
            channel === "phone"
                ? state.countdowns.phone
                : state.countdowns.email;


        if (
            cooldown > 0
        ) {

            showOtpMessage(
                `Please wait ${formatTime(cooldown)} before requesting another code.`,
                "warning"
            );

            return;

        }


        if (!state.identity) {

            showOtpMessage(
                "Your recovery session is missing. Please start password recovery again.",
                "error"
            );

            return;

        }


        /*
         * Phone recovery requires a registered phone number.
         */

        if (
            channel === "phone" &&
            !state.phone
        ) {

            showOtpMessage(
                "No registered phone number is available for this account.",
                "error"
            );

            return;

        }


        /*
         * Email recovery requires a registered email.
         */

        if (
            channel === "email" &&
            !state.email
        ) {

            showOtpMessage(
                "No registered Gmail is available for this account.",
                "error"
            );

            return;

        }


        state.requestingOtp =
            true;


        state.channel =
            channel;


        state.otpReady =
            false;


        state.recoveryToken =
            "";


        clearOtpInputs();


        setOtpInputsEnabled(
            false
        );


        updateDestination();


        updateCountdownUI();


        setButtonLoading(
            recoveryResendButton,
            true,
            "Resend code",
            "Sending..."
        );


        showOtpMessage(
            channel === "phone"
                ? "Requesting a new phone verification code..."
                : "Requesting a new email verification code...",
            "info"
        );


        try {

            /*
             * Prefer the new prepareOtp API.
             */

            let response;


            if (
                typeof API.prepareOtp ===
                "function"
            ) {

                response =
                    await API.prepareOtp({

                        identity:
                            state.identity,

                        uid:
                            state.uid,

                        username:
                            state.username,

                        email:
                            state.email,

                        gmail:
                            state.gmail,

                        phone:
                            state.phone,

                        channel:
                            channel,

                        purpose:
                            "password_recovery"

                    });

            } else if (
                typeof API.prepareOTP ===
                "function"
            ) {

                response =
                    await API.prepareOTP({

                        identity:
                            state.identity,

                        uid:
                            state.uid,

                        username:
                            state.username,

                        email:
                            state.email,

                        gmail:
                            state.gmail,

                        phone:
                            state.phone,

                        channel:
                            channel,

                        purpose:
                            "password_recovery"

                    });

            } else if (
                typeof API.forgotPassword ===
                "function"
            ) {

                /*
                 * Backward compatibility for the existing
                 * Apps Script API.
                 */

                response =
                    await API.forgotPassword({

                        identity:
                            state.identity,

                        uid:
                            state.uid,

                        username:
                            state.username,

                        email:
                            state.email,

                        gmail:
                            state.gmail,

                        phone:
                            state.phone,

                        channel:
                            channel,

                        purpose:
                            "password_recovery"

                    });

            } else {

                const error =
                    new Error(
                        "No recovery OTP endpoint is available."
                    );


                error.code =
                    "API_METHOD_MISSING";


                throw error;

            }


            const parsed =
                parseObject(
                    response
                );


            if (
                !parsed
            ) {

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
                        "Unable to send the recovery code."
                    );


                error.code =
                    parsed.code ||
                    parsed.errorCode ||
                    "RECOVERY_REQUEST_FAILED";


                error.data =
                    parsed;


                throw error;

            }


            updateStateFromResponse(
                parsed
            );


            /*
             * OTP is considered ready only when the backend
             * confirms it.
             */

            state.otpReady =
                parsed.otpReady === true ||
                parsed.code === "OTP_READY";


            /*
             * Never read:
             *
             * parsed.otp
             * parsed.verificationCode
             *
             * They must never be used by the frontend.
             */

            const cooldownSeconds =
                Number(
                    parsed.cooldownSeconds ||
                    parsed.cooldown ||
                    RESEND_COOLDOWN
                );


            startCooldown(
                channel,
                cooldownSeconds
            );


            try {

                sessionStorage.setItem(
                    STORAGE_KEYS.OTP_COOLDOWN,
                    String(
                        cooldownSeconds
                    )
                );

            } catch (error) {

                console.warn(
                    "Unable to save OTP cooldown:",
                    error
                );

            }


            updateDestination();


            /*
             * Enable manual OTP entry.
             *
             * The user receives the code from Gmail/SMS
             * and enters it manually.
             */

            setOtpInputsEnabled(
                true
            );


            const emailSent =
                parsed.emailSent === true ||
                parsed.email_sent === true;


            const phoneSent =
                parsed.phoneSent === true ||
                parsed.phone_sent === true;


            if (
                channel === "phone"
            ) {

                if (
                    phoneSent
                ) {

                    showOtpMessage(
                        "A verification code has been sent to your registered phone number.",
                        "success"
                    );

                } else {

                    showOtpMessage(
                        parsed.message ||
                        "A phone verification code was requested. Enter the code sent to your registered phone.",
                        "success"
                    );

                }

            } else {

                if (
                    emailSent
                ) {

                    showOtpMessage(
                        "A verification code has been sent to your registered Gmail.",
                        "success"
                    );

                } else {

                    showOtpMessage(
                        parsed.message ||
                        "An email verification code was requested. Check your Gmail inbox and spam folder.",
                        "success"
                    );

                }

            }


            if (
                getOtpInputs()[0]
            ) {

                getOtpInputs()[0].focus();

            }

        } catch (error) {

            console.error(
                "STOCKFLOW recovery OTP error:",
                error
            );


            state.otpReady =
                false;


            clearOtpInputs();


            setOtpInputsEnabled(
                false
            );


            showOtpMessage(
                getRecoveryErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            state.requestingOtp =
                false;


            setButtonLoading(
                recoveryResendButton,
                false,
                "Resend code",
                "Sending..."
            );


            updateCountdownUI();

        }

    }


    /* =========================================================
       VERIFY RECOVERY OTP
    ========================================================= */

    async function verifyRecoveryCode() {

        if (
            state.verifyingOtp
        ) {

            return;

        }


        const otp =
            getOtpValue();


        if (
            otp.length !== OTP_LENGTH
        ) {

            showOtpMessage(
                `Please enter the complete ${OTP_LENGTH}-digit verification code.`,
                "error"
            );

            return;

        }


        if (
            !state.identity
        ) {

            showOtpMessage(
                "Your recovery session is missing. Please start password recovery again.",
                "error"
            );

            return;

        }


        const API =
            getAPI();


        if (!API) {

            showOtpMessage(
                "The password recovery system is not available right now.",
                "error"
            );

            return;

        }


        state.verifyingOtp =
            true;


        updateVerifyButton();


        setButtonLoading(
            recoveryVerifyButton,
            true,
            "Verify Code",
            "Verifying..."
        );


        showOtpMessage(
            "Verifying your recovery code...",
            "info"
        );


        try {

            let response;


            const payload = {

                identity:
                    state.identity,

                uid:
                    state.uid,

                username:
                    state.username,

                email:
                    state.email,

                gmail:
                    state.gmail,

                phone:
                    state.phone,

                channel:
                    state.channel,

                otp:
                    otp

            };


            /*
             * Preferred new API.
             */

            if (
                typeof API.verifyOtp ===
                "function"
            ) {

                response =
                    await API.verifyOtp(
                        payload
                    );

            } else if (
                typeof API.verifyOTP ===
                "function"
            ) {

                response =
                    await API.verifyOTP(
                        payload
                    );

            } else if (
                typeof API.verifyRecoveryOtp ===
                "function"
            ) {

                /*
                 * Compatibility with the previous API.
                 */

                response =
                    await API.verifyRecoveryOtp(
                        payload
                    );

            } else {

                const error =
                    new Error(
                        "The recovery OTP verification endpoint is not available."
                    );


                error.code =
                    "API_METHOD_MISSING";


                throw error;

            }


            const parsed =
                parseObject(
                    response
                );


            if (
                !parsed
            ) {

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
                        "The verification code is incorrect."
                    );


                error.code =
                    parsed.code ||
                    parsed.errorCode ||
                    "INVALID_OTP";


                error.data =
                    parsed;


                throw error;

            }


            /*
             * Update account information and recovery token.
             */

            updateStateFromResponse(
                parsed
            );


            const recoveryToken =
                clean(
                    parsed.recoveryToken ||
                    parsed.token ||
                    parsed.resetToken
                );


            if (
                recoveryToken
            ) {

                state.recoveryToken =
                    recoveryToken;

            }


            /*
             * A recovery token is strongly preferred.
             *
             * It prevents the password-reset request from
             * relying on the OTP again.
             */

            if (
                !state.recoveryToken
            ) {

                const error =
                    new Error(
                        "The recovery server did not return a recovery token."
                    );


                error.code =
                    "RECOVERY_TOKEN_INVALID";


                throw error;

            }


            state.otpVerified =
                true;


            state.recoveryVerified =
                true;


            state.otpReady =
                false;


            saveState();


            showOtpMessage(
                parsed.message ||
                "Recovery code verified successfully.",
                "success"
            );


            window.setTimeout(
                () => {

                    showNewPasswordStep();

                },
                500
            );

        } catch (error) {

            console.error(
                "STOCKFLOW recovery verification error:",
                error
            );


            showOtpMessage(
                getRecoveryErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            state.verifyingOtp =
                false;


            setButtonLoading(
                recoveryVerifyButton,
                false,
                "Verify Code",
                "Verifying..."
            );


            updateVerifyButton();

        }

    }


    /* =========================================================
       SHOW NEW PASSWORD STEP
    ========================================================= */

    function showNewPasswordStep() {

        if (recoveryOtpStep) {

            recoveryOtpStep.hidden =
                true;

        }


        if (newPasswordStep) {

            newPasswordStep.hidden =
                false;

        }


        if (recoverySuccessStep) {

            recoverySuccessStep.hidden =
                true;

        }


        showPasswordMessage(
            ""
        );


        if (newPasswordInput) {

            newPasswordInput.focus();

        }

    }


    /* =========================================================
       PASSWORD VALIDATION
    ========================================================= */

    function validateNewPassword(
        password,
        confirmPassword
    ) {

        if (
            password.length < 8
        ) {

            return {

                valid: false,

                message:
                    "Password must be at least 8 characters long."

            };

        }


        if (
            !/[A-Z]/.test(
                password
            )
        ) {

            return {

                valid: false,

                message:
                    "Password must contain at least one uppercase letter."

            };

        }


        if (
            !/[a-z]/.test(
                password
            )
        ) {

            return {

                valid: false,

                message:
                    "Password must contain at least one lowercase letter."

            };

        }


        if (
            !/\d/.test(
                password
            )
        ) {

            return {

                valid: false,

                message:
                    "Password must contain at least one number."

            };

        }


        if (
            !/[^A-Za-z0-9]/.test(
                password
            )
        ) {

            return {

                valid: false,

                message:
                    "Password must contain at least one special character."

            };

        }


        if (
            password !== confirmPassword
        ) {

            return {

                valid: false,

                message:
                    "Passwords do not match."

            };

        }


        return {

            valid: true

        };

    }


    /* =========================================================
       RESET PASSWORD
    ========================================================= */

    async function resetPassword() {

        if (
            state.resettingPassword
        ) {

            return;

        }


        const password =
            String(
                newPasswordInput?.value ??
                ""
            );


        const confirmPassword =
            String(
                confirmPasswordInput?.value ??
                ""
            );


        const validation =
            validateNewPassword(
                password,
                confirmPassword
            );


        if (
            !validation.valid
        ) {

            showPasswordMessage(
                validation.message,
                "error"
            );

            return;

        }


        if (
            !state.recoveryVerified ||
            !state.recoveryToken
        ) {

            showPasswordMessage(
                "Your recovery session is not valid. Please verify the recovery code again.",
                "error"
            );

            return;

        }


        const API =
            getAPI();


        if (!API) {

            showPasswordMessage(
                "The password recovery system is not available right now.",
                "error"
            );

            return;

        }


        if (
            typeof API.resetPassword !==
            "function"
        ) {

            showPasswordMessage(
                "The password reset endpoint is not available.",
                "error"
            );

            return;

        }


        state.resettingPassword =
            true;


        setButtonLoading(
            resetPasswordButton,
            true,
            "Reset Password",
            "Updating..."
        );


        showPasswordMessage(
            "Updating your password...",
            "info"
        );


        try {

            const response =
                await API.resetPassword({

                    recoveryToken:
                        state.recoveryToken,

                    token:
                        state.recoveryToken,

                    uid:
                        state.uid,

                    identity:
                        state.identity,

                    username:
                        state.username,

                    email:
                        state.email,

                    gmail:
                        state.gmail,

                    phone:
                        state.phone,

                    newPassword:
                        password,

                    password:
                        password,

                    confirmPassword:
                        confirmPassword

                });


            const parsed =
                parseObject(
                    response
                );


            if (
                !parsed
            ) {

                const error =
                    new Error(
                        "The password reset system returned an invalid response."
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
                        "Password reset failed."
                    );


                error.code =
                    parsed.code ||
                    parsed.errorCode ||
                    "PASSWORD_RESET_FAILED";


                error.data =
                    parsed;


                throw error;

            }


            /*
             * Password reset succeeded.
             *
             * Destroy the recovery session immediately.
             */

            state.recoveryToken =
                "";


            state.recoveryVerified =
                false;


            state.otpVerified =
                false;


            state.otpReady =
                false;


            clearRecoveryState();


            if (newPasswordForm) {

                newPasswordForm.reset();

            }


            if (recoveryOtpStep) {

                recoveryOtpStep.hidden =
                    true;

            }


            if (newPasswordStep) {

                newPasswordStep.hidden =
                    true;

            }


            if (recoverySuccessStep) {

                recoverySuccessStep.hidden =
                    false;

            }


            if (successMessage) {

                successMessage.textContent =
                    parsed.message ||
                    "Your password has been reset successfully. You can now sign in with your new password.";

            }


            if (successLoginLink) {

                successLoginLink.href =
                    authRoute + "#login";

            }

        } catch (error) {

            console.error(
                "STOCKFLOW password reset error:",
                error
            );


            showPasswordMessage(
                getRecoveryErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            state.resettingPassword =
                false;


            setButtonLoading(
                resetPasswordButton,
                false,
                "Reset Password",
                "Updating..."
            );

        }

    }


    /* =========================================================
       PASSWORD CONFIRMATION
    ========================================================= */

    function setupPasswordConfirmation() {

        if (!confirmPasswordInput) {
            return;
        }


        confirmPasswordInput.addEventListener(
            "input",
            () => {

                const password =
                    String(
                        newPasswordInput?.value ??
                        ""
                    );


                const confirm =
                    String(
                        confirmPasswordInput.value ??
                        ""
                    );


                if (!confirm) {

                    confirmPasswordInput.setCustomValidity(
                        ""
                    );

                    return;

                }


                if (
                    password !== confirm
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
       PASSWORD STRENGTH
    ========================================================= */

    function setupPasswordStrength() {

        if (!newPasswordInput) {
            return;
        }


        newPasswordInput.addEventListener(
            "input",
            () => {

                const password =
                    String(
                        newPasswordInput.value ??
                        ""
                    );


                if (!password) {

                    showPasswordMessage(
                        ""
                    );

                    return;

                }


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
                        /\d/.test(
                            password
                        ),

                    symbol:
                        /[^A-Za-z0-9]/.test(
                            password
                        )

                };


                const passed =
                    Object.values(
                        checks
                    ).filter(
                        Boolean
                    ).length;


                if (
                    passed === 5
                ) {

                    showPasswordMessage(
                        "Strong password.",
                        "success"
                    );

                } else {

                    showPasswordMessage(
                        `${passed}/5 password requirements completed.`,
                        "info"
                    );

                }


                if (
                    confirmPasswordInput &&
                    confirmPasswordInput.value
                ) {

                    const matches =
                        confirmPasswordInput.value ===
                        password;


                    confirmPasswordInput.setCustomValidity(
                        matches
                            ? ""
                            : "Passwords do not match."
                    );

                }

            }
        );

    }


    /* =========================================================
       INITIALIZE RECOVERY PAGE
    ========================================================= */

    function initializeRecovery() {

        loadSavedState();


        /*
         * Recovery page requires state created by
         * forgot-password.js.
         */

        if (
            !state.identity
        ) {

            showOtpMessage(
                "No recovery account was selected. Please return to Forgot Password and try again.",
                "error"
            );


            setOtpInputsEnabled(
                false
            );


            if (recoveryVerifyButton) {

                recoveryVerifyButton.disabled =
                    true;

            }


            if (recoveryResendButton) {

                recoveryResendButton.disabled =
                    true;

            }


            return;

        }


        /*
         * No automatic OTP request here.
         *
         * #8 forgot-password.js already requested the
         * initial OTP before redirecting to this page.
         */

        updateDestination();


        loadInitialCooldown();


        clearOtpInputs();


        /*
         * OTP input stays manual.
         *
         * The user must enter the code received through
         * Gmail or phone.
         */

        setOtpInputsEnabled(
            true
        );


        updateVerifyButton();


        /*
         * If #8 confirmed that an OTP is ready, tell the
         * user to enter it.
         */

        if (
            state.otpReady
        ) {

            showOtpMessage(
                state.channel === "phone"
                    ? "Enter the verification code sent to your registered phone."
                    : "Enter the verification code sent to your registered Gmail.",
                "success"
            );

        } else {

            showOtpMessage(
                state.channel === "phone"
                    ? "Enter the verification code sent to your registered phone, or use Resend code if needed."
                    : "Enter the verification code sent to your registered Gmail, or use Resend code if needed.",
                "info"
            );

        }


        if (
            getOtpInputs()[0]
        ) {

            getOtpInputs()[0].focus();

        }

    }


    /* =========================================================
       OTP FORM
    ========================================================= */

    if (
        recoveryOtpForm
    ) {

        recoveryOtpForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                verifyRecoveryCode();

            }
        );

    }


    /* =========================================================
       RESEND BUTTON
    ========================================================= */

    if (
        recoveryResendButton
    ) {

        recoveryResendButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                requestRecoveryOtp(
                    state.channel
                );

            }
        );

    }


    /* =========================================================
       PASSWORD FORM
    ========================================================= */

    if (
        newPasswordForm
    ) {

        newPasswordForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                event.stopPropagation();

                resetPassword();

            }
        );

    }


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    setupOtpInputs();

    setupPasswordConfirmation();

    setupPasswordStrength();

    initializeRecovery();

});
