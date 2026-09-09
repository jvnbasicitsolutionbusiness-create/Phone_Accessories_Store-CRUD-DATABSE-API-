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


    const DEMO_MODE =
        Boolean(
            config.DEMO_MODE === true
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

        OTP:
            "STOCKFLOW_RECOVERY_OTP",

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

        demoOtp: "",

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

        countdownTimer: null,

        demoFillTimer: null

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
       DEMO MODE
    ========================================================= */

    function isDemoMode() {

        return DEMO_MODE;

    }


    function getDemoDelay() {

        const minimum =
            Number(
                AUTH_CONFIG.DEMO_DELAY_MIN ||
                3000
            );


        const maximum =
            Number(
                AUTH_CONFIG.DEMO_DELAY_MAX ||
                5000
            );


        /*
         * This random value controls ONLY the simulated
         * 3–5 second UI security delay.
         *
         * It NEVER generates an OTP.
         */

        return (
            minimum +
            Math.floor(
                Math.random() *
                (
                    maximum -
                    minimum +
                    1
                )
            )
        );

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


    function setButtonLoading(
        button,
        loading,
        normalText,
        loadingText
    ) {

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

            buttonText.textContent =
                normalText;


            buttonText.hidden =
                Boolean(loading);

        }


        if (buttonLoader) {

            buttonLoader.textContent =
                loadingText;


            buttonLoader.hidden =
                !Boolean(loading);

        }

    }


    /* =========================================================
       ERROR HANDLING
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


        const message =
            getErrorMessage(error);


        switch (code) {

            case "ACCOUNT_NOT_FOUND":
            case "USER_NOT_FOUND":

                return (
                    message ||
                    "Account does not exist."
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
                    "This recovery code has expired. Please request a new code."
                );


            case "OTP_LOCKED":
            case "ACCOUNT_LOCKED":
            case "TEMPORARILY_LOCKED":

                return (
                    message ||
                    "Too many incorrect attempts. Please try again later."
                );


            case "INVALID_OTP":

                return (
                    message ||
                    "The verification code is incorrect."
                );


            case "OTP_COOLDOWN":

                return (
                    message ||
                    "Please wait before requesting another verification code."
                );


            case "OTP_NOT_READY":

                return (
                    message ||
                    "Your recovery code is not ready yet."
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


            case "NETWORK_ERROR":
            case "TIMEOUT":
            case "API_URL_MISSING":
            case "API_URL_INVALID":
            case "EMPTY_RESPONSE":
            case "INVALID_JSON":

                return (
                    "Unable to connect to the password recovery system right now. Please try again."
                );


            default:

                if (message) {

                    return message;

                }


                return (
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


            state.otpReady =
                sessionStorage.getItem(
                    STORAGE_KEYS.OTP_READY
                ) === "true";


            /*
             * We deliberately do NOT load a previous OTP.
             *
             * Recovery OTPs must come from the backend.
             */

            state.demoOtp = "";


            /*
             * A recovery token is loaded only because it is
             * issued by the backend after successful OTP
             * verification.
             */

            state.recoveryToken =
                clean(
                    sessionStorage.getItem(
                        STORAGE_KEYS.TOKEN
                    )
                );

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
             * Never persist the OTP itself.
             */

            sessionStorage.removeItem(
                STORAGE_KEYS.OTP
            );


            if (state.recoveryToken) {

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
       CLEAR RECOVERY STATE
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
       UPDATE STATE FROM API RESPONSE
    ========================================================= */

    function updateStateFromResponse(
        response
    ) {

        if (!response) {
            return;
        }


        state.uid =
            clean(
                response.uid ||
                response.user?.uid ||
                state.uid
            );


        state.username =
            clean(
                response.username ||
                response.user?.username ||
                state.username
            );


        state.email =
            normalizeEmail(
                response.gmail ||
                response.email ||
                response.user?.gmail ||
                response.user?.email ||
                state.email
            );


        state.gmail =
            state.email;


        state.phone =
            normalizePhone(
                response.phone ||
                response.phoneNo ||
                response.user?.phone ||
                response.user?.phoneNo ||
                state.phone
            );


        state.identity =
            clean(
                response.identity ||
                response.user?.identity ||
                state.identity ||
                state.email ||
                state.username ||
                state.phone
            );


        const responseChannel =
            clean(
                response.channel ||
                state.channel
            ).toLowerCase();


        if (
            responseChannel === "email" ||
            responseChannel === "phone" ||
            responseChannel === "both"
        ) {

            state.channel =
                responseChannel;

        }


        /*
         * This is the ONLY place where demoOtp is obtained.
         *
         * It must come from Code.gs.
         */

        if (
            isDemoMode() &&
            typeof response.otp === "string" &&
            /^\d{6}$/.test(
                response.otp
            )
        ) {

            state.demoOtp =
                response.otp;

        }


        /*
         * Recovery token comes from successful
         * verifyRecoveryOtp().
         */

        if (
            typeof response.recoveryToken ===
                "string" &&
            response.recoveryToken
        ) {

            state.recoveryToken =
                response.recoveryToken;

        }


        if (
            response.otpReady === true
        ) {

            state.otpReady =
                true;

        }

        saveState();

    }


    /* =========================================================
       MASK DESTINATION
    ========================================================= */

    function maskEmail(email) {

        const value =
            normalizeEmail(email);


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
            normalizePhone(phone);


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
       OTP INPUT HELPERS
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
                    clean(input.value)
            )
            .join("");

    }


    function setOtpValue(value) {

        const digits =
            clean(value)
                .replace(/\D/g, "")
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

                input.value = "";

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
                                ].value = "";


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


                        const pasted =
                            (
                                event.clipboardData ||
                                window.clipboardData
                            )
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

                    }
                );

            }
        );

    }


    /* =========================================================
       COOLDOWN
    ========================================================= */

    function getChannelCooldown() {

        if (
            state.channel === "phone"
        ) {

            return state.countdowns.phone;

        }


        return state.countdowns.email;

    }


    function setChannelCooldown(
        channel,
        seconds
    ) {

        const value =
            Math.max(
                0,
                Number(seconds) || 0
            );


        if (
            channel === "phone"
        ) {

            state.countdowns.phone =
                value;

        } else {

            state.countdowns.email =
                value;

        }


        updateCountdownUI();

    }


    function updateCountdownUI() {

        const emailSeconds =
            state.countdowns.email;


        const phoneSeconds =
            state.countdowns.phone;


        if (recoveryOtpTimer) {

            if (
                state.channel === "phone"
            ) {

                if (
                    phoneSeconds > 0
                ) {

                    recoveryOtpTimer.textContent =
                        `Phone code available again in ${formatTime(phoneSeconds)}.`;

                } else {

                    recoveryOtpTimer.textContent =
                        "Phone code available.";

                }

            } else {

                if (
                    emailSeconds > 0
                ) {

                    recoveryOtpTimer.textContent =
                        `Email code available again in ${formatTime(emailSeconds)}.`;

                } else {

                    recoveryOtpTimer.textContent =
                        "Email code available.";

                }

            }

        }


        if (recoveryResendButton) {

            recoveryResendButton.disabled =
                state.requestingOtp ||
                getChannelCooldown() > 0;

        }

    }


    function formatTime(seconds) {

        const value =
            Math.max(
                0,
                Number(seconds) || 0
            );


        const minutes =
            Math.floor(
                value / 60
            );


        const remainingSeconds =
            value % 60;


        return (
            String(minutes).padStart(
                2,
                "0"
            ) +
            ":" +
            String(remainingSeconds).padStart(
                2,
                "0"
            )
        );

    }


    function startCooldown(
        channel,
        seconds = RESEND_COOLDOWN
    ) {

        setChannelCooldown(
            channel,
            seconds
        );


        if (state.countdownTimer) {
            return;
        }


        state.countdownTimer =
            window.setInterval(
                () => {

                    let active =
                        false;


                    if (
                        state.countdowns.email >
                        0
                    ) {

                        state.countdowns.email--;
                        active = true;

                    }


                    if (
                        state.countdowns.phone >
                        0
                    ) {

                        state.countdowns.phone--;
                        active = true;

                    }


                    updateCountdownUI();


                    if (!active) {

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
       AUTO-FILL REAL BACKEND OTP
    ========================================================= */

    function scheduleDemoAutoFill() {

        if (
            !isDemoMode()
        ) {

            return;

        }


        if (
            !state.demoOtp ||
            !/^\d{6}$/.test(
                state.demoOtp
            )
        ) {

            return;

        }


        if (state.demoFillTimer) {

            window.clearTimeout(
                state.demoFillTimer
            );

        }


        setOtpInputsEnabled(
            false
        );


        clearOtpInputs();


        const delay =
            getDemoDelay();


        showOtpMessage(
            "Verification code received. Preparing the code...",
            "info"
        );


        state.demoFillTimer =
            window.setTimeout(
                () => {

                    /*
                     * IMPORTANT:
                     *
                     * This value came from Code.gs.
                     *
                     * No OTP is generated here.
                     */

                    setOtpValue(
                        state.demoOtp
                    );


                    state.otpReady =
                        true;


                    setOtpInputsEnabled(
                        true
                    );


                    updateVerifyButton();


                    saveState();


                    showOtpMessage(
                        "Your verification code is ready.",
                        "success"
                    );


                    if (
                        getOtpInputs()[0]
                    ) {

                        getOtpInputs()[0].focus();

                    }

                },
                delay
            );

    }


    /* =========================================================
       REQUEST RECOVERY OTP
    ========================================================= */

    async function requestRecoveryOtp(
        requestedChannel = state.channel,
        isResend = false
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
            isResend &&
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
                "Recovery account information is missing. Please start again.",
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


        state.demoOtp =
            "";


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
            "Requesting..."
        );


        showOtpMessage(
            isResend
                ? "Requesting a new recovery code..."
                : "Preparing your recovery code...",
            "info"
        );


        try {

            /*
             * IMPORTANT:
             *
             * forgotPassword() is called ONLY here.
             *
             * forgot-password.js does not call it.
             */

            const response =
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
                        channel

                });


            if (
                !response ||
                response.success !== true
            ) {

                const error =
                    new Error(
                        response?.message ||
                        "Unable to prepare password recovery."
                    );


                error.code =
                    response?.code ||
                    "RECOVERY_REQUEST_FAILED";


                error.data =
                    response;


                throw error;

            }


            updateStateFromResponse(
                response
            );


            /*
             * Backend must tell us the OTP is ready.
             */

            if (
                response.otpReady === true ||
                (
                    isDemoMode() &&
                    /^\d{6}$/.test(
                        state.demoOtp
                    )
                )
            ) {

                state.otpReady =
                    true;

            }


            /*
             * Start ONLY the requested channel's cooldown.
             */

            startCooldown(
                channel,
                Number(
                    response.cooldown ||
                    response.cooldownSeconds ||
                    RESEND_COOLDOWN
                )
            );


            updateDestination();


            if (
                isDemoMode() &&
                state.demoOtp
            ) {

                /*
                 * Demo mode:
                 * backend OTP is automatically shown after
                 * the configured 3–5 second delay.
                 */

                scheduleDemoAutoFill();

            } else {

                setOtpInputsEnabled(
                    true
                );


                showOtpMessage(
                    response.message ||
                    "Your recovery code has been sent. Enter the code to continue.",
                    "success"
                );


                if (
                    getOtpInputs()[0]
                ) {

                    getOtpInputs()[0].focus();

                }

            }

        } catch (error) {

            console.error(
                "STOCKFLOW recovery OTP error:",
                error
            );


            state.otpReady =
                false;


            state.demoOtp =
                "";


            setOtpInputsEnabled(
                false
            );


            clearOtpInputs();


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
                "Requesting..."
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
                "Please enter the complete 6-digit verification code.",
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

            if (
                typeof API.verifyRecoveryOtp !==
                    "function"
            ) {

                throw new Error(
                    "The recovery OTP verification endpoint is not available."
                );

            }


            const response =
                await API.verifyRecoveryOtp({

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

                });


            if (
                !response ||
                response.success !== true
            ) {

                const error =
                    new Error(
                        response?.message ||
                        "The recovery code could not be verified."
                    );


                error.code =
                    response?.code ||
                    "INVALID_OTP";


                error.data =
                    response;


                throw error;

            }


            /*
             * The account is NOT marked verified here.
             *
             * This only authorizes password reset.
             */

            updateStateFromResponse(
                response
            );


            state.otpVerified =
                true;


            state.recoveryVerified =
                true;


            state.recoveryToken =
                clean(
                    response.recoveryToken ||
                    response.token ||
                    ""
                );


            if (
                !state.recoveryToken
            ) {

                throw new Error(
                    "The recovery server did not return a recovery token."
                );

            }


            saveState();


            showOtpMessage(
                response.message ||
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
       SHOW PASSWORD STEP
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
            !/[A-Z]/.test(password)
        ) {

            return {
                valid: false,
                message:
                    "Password must contain at least one uppercase letter."
            };

        }


        if (
            !/[a-z]/.test(password)
        ) {

            return {
                valid: false,
                message:
                    "Password must contain at least one lowercase letter."
            };

        }


        if (
            !/\d/.test(password)
        ) {

            return {
                valid: false,
                message:
                    "Password must contain at least one number."
            };

        }


        if (
            !/[^A-Za-z0-9]/.test(password)
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

            /*
             * IMPORTANT:
             *
             * recoveryToken is mandatory.
             *
             * The OTP itself is NOT sent again as the
             * authorization mechanism.
             */

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


            if (
                !response ||
                response.success !== true
            ) {

                const error =
                    new Error(
                        response?.message ||
                        "Password reset failed."
                    );


                error.code =
                    response?.code ||
                    "PASSWORD_RESET_FAILED";


                error.data =
                    response;


                throw error;

            }


            /*
             * Password reset is complete.
             *
             * Clear all recovery state so the token cannot
             * accidentally be reused.
             */

            state.recoveryToken =
                "";


            state.recoveryVerified =
                false;


            state.otpVerified =
                false;


            clearRecoveryState();


            if (newPasswordForm) {

                newPasswordForm.reset();

            }


            if (newPasswordStep) {

                newPasswordStep.hidden =
                    true;

            }


            if (recoveryOtpStep) {

                recoveryOtpStep.hidden =
                    true;

            }


            if (recoverySuccessStep) {

                recoverySuccessStep.hidden =
                    false;

            }


            if (successMessage) {

                successMessage.textContent =
                    response.message ||
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
       AUTO-START RECOVERY
    ========================================================= */

    function initializeRecovery() {

        loadSavedState();


        /*
         * A recovery page without an identity cannot safely
         * request an OTP.
         */

        if (!state.identity) {

            showOtpMessage(
                "No recovery account was selected. Please return to Forgot Password and try again.",
                "error"
            );


            setOtpInputsEnabled(
                false
            );


            if (recoveryResendButton) {

                recoveryResendButton.disabled =
                    true;

            }


            return;

        }


        updateDestination();


        setOtpInputsEnabled(
            false
        );


        clearOtpInputs();


        updateCountdownUI();


        /*
         * Always request a fresh recovery OTP when entering
         * the recovery page.
         *
         * This prevents stale OTPs from previous attempts.
         */

        requestRecoveryOtp(
            state.channel || "email",
            false
        );

    }


    /* =========================================================
       OTP FORM SUBMIT
    ========================================================= */

    if (recoveryOtpForm) {

        recoveryOtpForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                verifyRecoveryCode();

            }
        );

    }


    /* =========================================================
       RESEND BUTTON
    ========================================================= */

    if (recoveryResendButton) {

        recoveryResendButton.addEventListener(
            "click",
            () => {

                requestRecoveryOtp(
                    state.channel,
                    true
                );

            }
        );

    }


    /* =========================================================
       PASSWORD FORM
    ========================================================= */

    if (newPasswordForm) {

        newPasswordForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                resetPassword();

            }
        );

    }


    /* =========================================================
       PASSWORD CONFIRMATION
    ========================================================= */

    if (confirmPasswordInput) {

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
       PASSWORD STRENGTH FEEDBACK
    ========================================================= */

    if (newPasswordInput) {

        newPasswordInput.addEventListener(
            "input",
            () => {

                const password =
                    String(
                        newPasswordInput.value ??
                        ""
                    );


                if (!password) {

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

            }
        );

    }


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    setupOtpInputs();

    initializeRecovery();

});
