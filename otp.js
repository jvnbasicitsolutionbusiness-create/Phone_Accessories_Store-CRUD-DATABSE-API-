/* ============================================================
   STOCKFLOW
   MANUAL OTP CONTROLLER
   File: otp.js

   ============================================================
   IMPORTANT SECURITY / FLOW RULES
   ============================================================

   1. OTP IS GENERATED ONLY BY CODE.GS.
   2. OTP IS SENT ONLY BY CODE.GS.
   3. THIS FILE NEVER GENERATES AN OTP.
   4. THIS FILE NEVER REQUESTS AN OTP AUTOMATICALLY.
   5. THIS FILE NEVER READS result.otp.
   6. THIS FILE NEVER READS data.otp.
   7. THIS FILE NEVER STORES AN OTP.
   8. THIS FILE NEVER DISPLAYS AN OTP.
   9. THIS FILE NEVER AUTO-FILLS OTP BOXES.
   10. USER MUST MANUALLY TYPE THE 6 DIGITS.
   11. PASTE IS DISABLED.
   12. BROWSER OTP AUTOFILL IS DISABLED.
   13. "SEND CODE BY EMAIL" IS MANUAL.
   14. "SEND CODE BY PHONE" IS MANUAL.
   15. EMAIL COOLDOWN = 120 SECONDS.
   16. PHONE COOLDOWN = 120 SECONDS.
   17. EMAIL AND PHONE COOLDOWNS ARE INDEPENDENT.
   18. CODE.GS IS THE ONLY PLACE THAT VALIDATES OTP.
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       CONFIGURATION
    ========================================================= */

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};

    const AUTH =
        CONFIG.AUTH ||
        {};

    const ROUTES =
        CONFIG.ROUTES ||
        {};

    const STORAGE_CONFIG =
        CONFIG.STORAGE ||
        {};


    const API =
        window.StockFlowAPI ||
        window.API ||
        null;


    const OTP_LENGTH =
        Number(
            AUTH.OTP_LENGTH ||
            6
        );


    /*
     * Required cooldown:
     *
     * 2 minutes = 120 seconds.
     */

    const COOLDOWN_SECONDS =
        120;


    const DASHBOARD =
        ROUTES.DASHBOARD ||
        "dashboard.html";


    /* =========================================================
       STORAGE KEYS
    ========================================================= */

    const KEY = {

        UID:
            AUTH.OTP_UID_KEY ||
            STORAGE_CONFIG.OTP_UID ||
            "STOCKFLOW_OTP_UID",

        USERNAME:
            AUTH.OTP_USERNAME_KEY ||
            STORAGE_CONFIG.OTP_USERNAME ||
            "STOCKFLOW_OTP_USERNAME",

        EMAIL:
            AUTH.OTP_EMAIL_KEY ||
            STORAGE_CONFIG.OTP_EMAIL ||
            "STOCKFLOW_OTP_EMAIL",

        PHONE:
            AUTH.OTP_PHONE_KEY ||
            STORAGE_CONFIG.OTP_PHONE ||
            "STOCKFLOW_OTP_PHONE",

        IDENTITY:
            AUTH.OTP_IDENTITY_KEY ||
            STORAGE_CONFIG.OTP_IDENTITY ||
            "STOCKFLOW_OTP_IDENTITY",

        CHANNEL:
            AUTH.OTP_CHANNEL_KEY ||
            STORAGE_CONFIG.OTP_CHANNEL ||
            "STOCKFLOW_OTP_CHANNEL",

        EMAIL_SENT_AT:
            "STOCKFLOW_MANUAL_EMAIL_OTP_SENT_AT",

        PHONE_SENT_AT:
            "STOCKFLOW_MANUAL_PHONE_OTP_SENT_AT"

    };


    /* =========================================================
       PAGE CHECK
    ========================================================= */

    const page =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    /*
     * Do nothing on other pages.
     */

    if (
        page &&
        page !== "verify.html" &&
        page !== "verify-otp.html"
    ) {

        return;
    }


    /* =========================================================
       DOM HELPERS
    ========================================================= */

    function getElement(...selectors) {

        for (
            const selector of selectors
        ) {

            const element =
                document.querySelector(
                    selector
                );

            if (element) {
                return element;
            }
        }

        return null;
    }


    function getOtpBoxes() {

        return Array.from(
            document.querySelectorAll(
                ".otp-digit"
            )
        );
    }


    function getVerifyButton() {

        return getElement(
            "#verifyOtpBtn",
            "#verifyButton",
            "#verifyBtn",
            "[data-verify-otp]"
        );
    }


    function getEmailButton() {

        return getElement(
            "#resendEmailOtpBtn",
            "[data-resend-email-otp]"
        );
    }


    function getPhoneButton() {

        return getElement(
            "#resendPhoneOtpBtn",
            "[data-resend-phone-otp]"
        );
    }


    function getMessage() {

        return getElement(
            "#otpMessage",
            "#message",
            "#authAlert",
            ".otp-message"
        );
    }


    function getHelp() {

        return getElement(
            "#otpHelp",
            "#verificationDescription"
        );
    }


    function getEmailStatus() {

        return getElement(
            "#emailDeliveryStatus"
        );
    }


    function getPhoneStatus() {

        return getElement(
            "#phoneDeliveryStatus"
        );
    }


    function getEmailTimer() {

        return getElement(
            "#emailOtpTimer"
        );
    }


    function getPhoneTimer() {

        return getElement(
            "#phoneOtpTimer"
        );
    }


    /* =========================================================
       SAFE STORAGE
    ========================================================= */

    function readStorage(key) {

        try {

            return (
                sessionStorage.getItem(
                    key
                ) || ""
            );

        } catch (error) {

            console.warn(
                "StockFlow OTP storage read failed:",
                error
            );

            return "";
        }
    }


    function writeStorage(
        key,
        value
    ) {

        try {

            sessionStorage.setItem(
                key,
                String(
                    value ?? ""
                )
            );

        } catch (error) {

            console.warn(
                "StockFlow OTP storage write failed:",
                error
            );
        }
    }


    function removeStorage(key) {

        try {

            sessionStorage.removeItem(
                key
            );

        } catch (error) {

            console.warn(
                "StockFlow OTP storage remove failed:",
                error
            );
        }
    }


    /* =========================================================
       VERIFICATION STATE
    ========================================================= */

    function getState() {

        return {

            uid:
                readStorage(
                    KEY.UID
                ),

            username:
                readStorage(
                    KEY.USERNAME
                ),

            email:
                readStorage(
                    KEY.EMAIL
                ),

            phone:
                readStorage(
                    KEY.PHONE
                ),

            identity:
                readStorage(
                    KEY.IDENTITY
                ),

            channel:
                (
                    readStorage(
                        KEY.CHANNEL
                    ) ||
                    "email"
                ).toLowerCase()

        };
    }


    function resolveIdentity(state) {

        return (
            state.uid ||
            state.username ||
            state.email ||
            state.phone ||
            state.identity ||
            ""
        );
    }


    /* =========================================================
       MESSAGE HELPERS
    ========================================================= */

    function showMessage(
        message,
        type = "info"
    ) {

        const element =
            getMessage();


        if (!element) {

            console.log(
                `[StockFlow OTP ${type}]`,
                message
            );

            return;
        }


        element.textContent =
            message || "";


        element.className =
            `otp-message ${type}`;


        element.hidden =
            false;


        element.style.display =
            "block";
    }


    function clearMessage() {

        const element =
            getMessage();


        if (!element) {
            return;
        }


        element.textContent =
            "";


        element.hidden =
            true;


        element.style.display =
            "none";
    }


    /* =========================================================
       MASKING
    ========================================================= */

    function maskEmail(
        email
    ) {

        if (!email) {
            return "";
        }


        const parts =
            String(
                email
            ).split("@");


        if (
            parts.length !== 2
        ) {

            return email;
        }


        const name =
            parts[0];

        const domain =
            parts[1];


        if (
            name.length <= 2
        ) {

            return (
                `${name.charAt(0) || "*"}***@${domain}`
            );
        }


        return (
            `${name.substring(0, 2)}***@${domain}`
        );
    }


    function maskPhone(
        phone
    ) {

        if (!phone) {
            return "";
        }


        const value =
            String(
                phone
            )
                .replace(
                    /\s+/g,
                    ""
                );


        if (
            value.length <= 4
        ) {

            return "***";
        }


        return (
            "*".repeat(
                value.length - 4
            ) +
            value.slice(-4)
        );
    }


    /* =========================================================
       DESTINATION DISPLAY
    ========================================================= */

    function displayDestinations() {

        const state =
            getState();


        const emailStatus =
            getEmailStatus();


        const phoneStatus =
            getPhoneStatus();


        if (emailStatus) {

            if (state.email) {

                emailStatus.textContent =
                    `Verification code will be sent to ${maskEmail(state.email)}.`;

            } else {

                emailStatus.textContent =
                    "No registered Gmail address is available.";
            }
        }


        if (phoneStatus) {

            if (state.phone) {

                phoneStatus.textContent =
                    `Verification code will be sent to ${maskPhone(state.phone)}.`;

            } else {

                phoneStatus.textContent =
                    "No registered phone number is available.";
            }
        }


        const help =
            getHelp();


        if (help) {

            help.textContent =
                "Choose email or phone, then manually enter the 6-digit verification code you receive.";
        }
    }


    /* =========================================================
       OTP INPUT
    ========================================================= */

    function sanitizeDigit(
        value
    ) {

        return String(
            value || ""
        )
            .replace(
                /\D/g,
                ""
            )
            .slice(
                0,
                1
            );
    }


    function getEnteredOtp() {

        const boxes =
            getOtpBoxes();


        if (
            boxes.length ===
            OTP_LENGTH
        ) {

            return boxes
                .map(
                    box =>
                        sanitizeDigit(
                            box.value
                        )
                )
                .join("");
        }


        const fallback =
            getElement(
                "#otp",
                "#otpCode",
                "#verificationCode"
            );


        if (!fallback) {
            return "";
        }


        return String(
            fallback.value || ""
        )
            .replace(
                /\D/g,
                ""
            )
            .slice(
                0,
                OTP_LENGTH
            );
    }


    function clearOtpBoxes() {

        const boxes =
            getOtpBoxes();


        boxes.forEach(
            box => {

                box.value =
                    "";

                box.disabled =
                    false;
            }
        );


        const fallback =
            getElement(
                "#otp",
                "#otpCode",
                "#verificationCode"
            );


        if (fallback) {

            fallback.value =
                "";
        }


        updateVerifyButton();
    }


    function updateVerifyButton() {

        const button =
            getVerifyButton();


        if (!button) {
            return;
        }


        /*
         * VERY IMPORTANT:
         *
         * The Verify button is disabled until
         * the USER manually enters all 6 digits.
         */

        const code =
            getEnteredOtp();


        button.disabled =
            code.length !==
            OTP_LENGTH;
    }


    /* =========================================================
       OTP INPUT SECURITY
    ========================================================= */

    function setupOtpInputs() {

        const boxes =
            getOtpBoxes();


        if (
            boxes.length !==
            OTP_LENGTH
        ) {

            console.warn(
                `StockFlow OTP: Expected ${OTP_LENGTH} boxes but found ${boxes.length}.`
            );

            return;
        }


        boxes.forEach(
            (
                box,
                index
            ) => {

                /*
                 * Disable browser OTP autofill.
                 */

                box.setAttribute(
                    "autocomplete",
                    "off"
                );


                box.setAttribute(
                    "inputmode",
                    "numeric"
                );


                box.setAttribute(
                    "maxlength",
                    "1"
                );


                box.setAttribute(
                    "pattern",
                    "[0-9]"
                );


                box.setAttribute(
                    "data-lpignore",
                    "true"
                );


                box.setAttribute(
                    "data-form-type",
                    "other"
                );


                box.disabled =
                    false;


                /*
                 * USER INPUT ONLY
                 */

                box.addEventListener(
                    "input",
                    event => {

                        const digit =
                            sanitizeDigit(
                                event.target.value
                            );


                        event.target.value =
                            digit;


                        if (
                            digit &&
                            index <
                                boxes.length - 1
                        ) {

                            boxes[
                                index + 1
                            ].focus();
                        }


                        updateVerifyButton();
                    }
                );


                /*
                 * KEYBOARD NAVIGATION
                 */

                box.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key ===
                            "Backspace"
                        ) {

                            if (
                                !box.value &&
                                index > 0
                            ) {

                                event.preventDefault();


                                boxes[
                                    index - 1
                                ].value =
                                    "";


                                boxes[
                                    index - 1
                                ].focus();


                                updateVerifyButton();
                            }


                            return;
                        }


                        if (
                            event.key ===
                            "ArrowLeft"
                        ) {

                            if (
                                index > 0
                            ) {

                                event.preventDefault();


                                boxes[
                                    index - 1
                                ].focus();
                            }


                            return;
                        }


                        if (
                            event.key ===
                            "ArrowRight"
                        ) {

                            if (
                                index <
                                boxes.length - 1
                            ) {

                                event.preventDefault();


                                boxes[
                                    index + 1
                                ].focus();
                            }


                            return;
                        }


                        /*
                         * Allow normal browser control keys.
                         */

                        if (
                            event.ctrlKey ||
                            event.metaKey
                        ) {

                            return;
                        }


                        /*
                         * Only numeric digits.
                         */

                        if (
                            event.key.length === 1 &&
                            !/[0-9]/.test(
                                event.key
                            )
                        ) {

                            event.preventDefault();
                        }
                    }
                );


                /*
                 * NO PASTE.
                 *
                 * The user manually types the code.
                 */

                box.addEventListener(
                    "paste",
                    event => {

                        event.preventDefault();


                        showMessage(
                            "Please type the 6-digit verification code manually.",
                            "info"
                        );
                    }
                );


                /*
                 * NO DRAG/DROP OTP insertion.
                 */

                box.addEventListener(
                    "drop",
                    event => {

                        event.preventDefault();


                        showMessage(
                            "Please type the verification code manually.",
                            "info"
                        );
                    }
                );


                box.addEventListener(
                    "dragover",
                    event => {

                        event.preventDefault();
                    }
                );
            }
        );
    }


    /* =========================================================
       COOLDOWN
    ========================================================= */

    function getCooldownKey(
        channel
    ) {

        return (
            channel === "phone"
                ? KEY.PHONE_SENT_AT
                : KEY.EMAIL_SENT_AT
        );
    }


    function getLastSent(
        channel
    ) {

        return Number(
            readStorage(
                getCooldownKey(
                    channel
                )
            ) || 0
        );
    }


    function getRemainingCooldown(
        channel
    ) {

        const timestamp =
            getLastSent(
                channel
            );


        if (!timestamp) {
            return 0;
        }


        const elapsed =
            Math.floor(
                (
                    Date.now() -
                    timestamp
                ) / 1000
            );


        const remaining =
            COOLDOWN_SECONDS -
            elapsed;


        if (
            remaining <= 0
        ) {

            removeStorage(
                getCooldownKey(
                    channel
                )
            );


            return 0;
        }


        return remaining;
    }


    function saveCooldown(
        channel
    ) {

        writeStorage(
            getCooldownKey(
                channel
            ),
            Date.now()
        );
    }


    function formatCooldown(
        seconds
    ) {

        const minutes =
            Math.floor(
                seconds / 60
            );


        const remaining =
            seconds % 60;


        return (
            String(minutes)
                .padStart(
                    2,
                    "0"
                ) +
            ":" +
            String(remaining)
                .padStart(
                    2,
                    "0"
                )
        );
    }


    /* =========================================================
       COOLDOWN UI
    ========================================================= */

    function updateCooldownUI() {

        updateChannelButton(
            "email"
        );


        updateChannelButton(
            "phone"
        );
    }


    function updateChannelButton(
        channel
    ) {

        const isPhone =
            channel === "phone";


        const button =
            isPhone
                ? getPhoneButton()
                : getEmailButton();


        const timer =
            isPhone
                ? getPhoneTimer()
                : getEmailTimer();


        if (!button) {
            return;
        }


        const remaining =
            getRemainingCooldown(
                channel
            );


        const state =
            getState();


        const destinationAvailable =
            isPhone
                ? Boolean(state.phone)
                : Boolean(state.email);


        if (!destinationAvailable) {

            button.disabled =
                true;


            if (timer) {

                timer.textContent =
                    isPhone
                        ? "No phone number available"
                        : "No Gmail address available";
            }


            return;
        }


        if (
            remaining > 0
        ) {

            button.disabled =
                true;


            /*
             * Keep the requested button text.
             */

            button.textContent =
                isPhone
                    ? "Send code by phone"
                    : "Send code by email";


            if (timer) {

                timer.textContent =
                    `Available in ${formatCooldown(remaining)}`;
            }


            return;
        }


        button.disabled =
            false;


        button.textContent =
            isPhone
                ? "Send code by phone"
                : "Send code by email";


        if (timer) {

            timer.textContent =
                "Ready";
        }
    }


    let cooldownInterval =
        null;


    function startCooldownTimer() {

        if (
            cooldownInterval
        ) {

            clearInterval(
                cooldownInterval
            );
        }


        updateCooldownUI();


        cooldownInterval =
            setInterval(
                () => {

                    updateCooldownUI();


                    if (
                        getRemainingCooldown(
                            "email"
                        ) <= 0 &&
                        getRemainingCooldown(
                            "phone"
                        ) <= 0
                    ) {

                        clearInterval(
                            cooldownInterval
                        );


                        cooldownInterval =
                            null;
                    }

                },
                1000
            );
    }


    /* =========================================================
       API ERROR
    ========================================================= */

    function createApiError(
        response
    ) {

        const error =
            new Error(
                response?.message ||
                response?.error ||
                "The verification service returned an error."
            );


        error.code =
            response?.code ||
            response?.errorCode ||
            response?.status ||
            "";


        error.data =
            response;


        return error;
    }


    function getErrorMessage(
        error
    ) {

        const code =
            String(
                error?.code ||
                error?.data?.code ||
                ""
            )
                .toUpperCase();


        const message =
            String(
                error?.message ||
                error?.data?.message ||
                ""
            );


        const lower =
            message.toLowerCase();


        if (
            code ===
                "OTP_INVALID" ||
            code ===
                "INVALID_OTP" ||
            lower.includes(
                "incorrect otp"
            ) ||
            lower.includes(
                "invalid otp"
            )
        ) {

            return (
                "The verification code is incorrect. Please check the code in your Gmail or phone and try again."
            );
        }


        if (
            code ===
                "OTP_EXPIRED" ||
            lower.includes(
                "expired"
            )
        ) {

            return (
                "This verification code has expired. Please request a new code."
            );
        }


        if (
            code ===
                "OTP_LOCKED" ||
            code ===
                "ACCOUNT_LOCKED" ||
            lower.includes(
                "locked"
            )
        ) {

            return (
                "Verification is temporarily locked after too many incorrect attempts. Please try again after 30 minutes."
            );
        }


        if (
            code ===
                "MAX_ATTEMPTS"
        ) {

            return (
                "You have reached the maximum verification attempts. Please try again after 30 minutes."
            );
        }


        if (
            code ===
                "OTP_COOLDOWN"
        ) {

            return (
                "Please wait before requesting another verification code."
            );
        }


        if (
            code ===
                "USER_NOT_FOUND" ||
            code ===
                "ACCOUNT_NOT_FOUND"
        ) {

            return (
                "The account could not be found. Please return to registration and try again."
            );
        }


        if (
            code ===
                "NOT_VERIFIED"
        ) {

            return (
                "This account has not been verified yet. Please complete account verification first."
            );
        }


        if (
            lower.includes(
                "network"
            ) ||
            lower.includes(
                "fetch"
            ) ||
            lower.includes(
                "connect"
            )
        ) {

            return (
                "Unable to connect to the verification service. Please check your connection and try again."
            );
        }


        return (
            message ||
            "We couldn't complete the verification request. Please try again."
        );
    }


    /* =========================================================
       MANUAL SEND CODE
    ========================================================= */

    async function sendCode(
        channel
    ) {

        channel =
            String(
                channel || ""
            )
                .toLowerCase();


        if (
            channel !== "email" &&
            channel !== "phone"
        ) {

            return;
        }


        const state =
            getState();


        const destination =
            channel === "email"
                ? state.email
                : state.phone;


        if (!destination) {

            showMessage(
                channel === "email"
                    ? "No registered Gmail address is available for this account."
                    : "No registered phone number is available for this account.",
                "error"
            );


            return;
        }


        const remaining =
            getRemainingCooldown(
                channel
            );


        if (
            remaining > 0
        ) {

            showMessage(
                `Please wait ${formatCooldown(remaining)} before requesting another ${channel} verification code.`,
                "error"
            );


            return;
        }


        if (!API) {

            showMessage(
                "The verification service is unavailable. Please reload the page and try again.",
                "error"
            );


            return;
        }


        const method =
            typeof API.resendOtp ===
            "function"
                ? API.resendOtp
                : typeof API.prepareOtp ===
                    "function"
                    ? API.prepareOtp
                    : null;


        if (!method) {

            showMessage(
                "The OTP delivery service is not configured correctly.",
                "error"
            );


            console.error(
                "StockFlow OTP: API.resendOtp() / API.prepareOtp() is missing."
            );


            return;
        }


        const button =
            channel === "email"
                ? getEmailButton()
                : getPhoneButton();


        if (button) {

            button.disabled =
                true;

            button.dataset.originalText =
                button.textContent;

            button.textContent =
                channel === "email"
                    ? "Sending email..."
                    : "Sending code...";
        }


        clearMessage();


        try {

            /*
             * IMPORTANT:
             *
             * This is a MANUAL request.
             *
             * It happens ONLY because the USER
             * clicked the Send Code button.
             *
             * There is NO automatic call during
             * page initialization.
             */

            showMessage(
                channel === "email"
                    ? "Sending a new verification code to your registered Gmail address..."
                    : "Sending a new verification code to your registered phone number...",
                "info"
            );


            const payload = {

                uid:
                    state.uid,

                identity:
                    state.identity ||
                    state.username ||
                    state.email ||
                    state.phone,

                username:
                    state.username,

                email:
                    state.email,

                gmail:
                    state.email,

                phone:
                    state.phone,

                channel:
                    channel
            };


            const response =
                await method.call(
                    API,
                    payload
                );


            if (
                !response ||
                response.success !== true
            ) {

                throw createApiError(
                    response
                );
            }


            /*
             * SECURITY RULE:
             *
             * DO NOT READ:
             *
             * response.otp
             * response.code
             * response.verificationCode
             * response.data.otp
             *
             * The OTP stays on the server
             * and is delivered through Gmail/SMS.
             */


            /*
             * Start frontend cooldown only after
             * backend confirms delivery/request success.
             */

            saveCooldown(
                channel
            );


            /*
             * Keep OTP boxes EMPTY.
             */

            clearOtpBoxes();


            if (channel === "email") {

                showMessage(
                    "A new 6-digit verification code has been sent to your registered Gmail address. Please check your inbox and type the code manually.",
                    "success"
                );

            } else {

                showMessage(
                    "A new 6-digit verification code has been sent to your registered phone number. Please check your phone and type the code manually.",
                    "success"
                );
            }


            updateCooldownUI();


            startCooldownTimer();


        } catch (error) {

            console.error(
                "StockFlow manual OTP delivery error:",
                error
            );


            showMessage(
                getErrorMessage(
                    error
                ),
                "error"
            );


        } finally {

            updateCooldownUI();
        }
    }


    /* =========================================================
       MANUAL VERIFICATION
    ========================================================= */

    async function verifyManualCode() {

        const code =
            getEnteredOtp();


        const state =
            getState();


        /*
         * The user must manually enter all six digits.
         */

        if (
            code.length !==
            OTP_LENGTH
        ) {

            showMessage(
                "Please manually enter all 6 digits of the verification code.",
                "error"
            );


            updateVerifyButton();


            return;
        }


        const identity =
            resolveIdentity(
                state
            );


        if (!identity) {

            showMessage(
                "Your verification session is missing. Please return to registration and register again.",
                "error"
            );


            return;
        }


        if (!API) {

            showMessage(
                "The verification service is unavailable. Please reload the page and try again.",
                "error"
            );


            return;
        }


        if (
            typeof API.verifyOtp !==
            "function"
        ) {

            showMessage(
                "The OTP verification service is not configured correctly.",
                "error"
            );


            return;
        }


        const button =
            getVerifyButton();


        if (button) {

            button.disabled =
                true;

            button.dataset.originalText =
                button.textContent;

            button.textContent =
                "Verifying...";
        }


        clearMessage();


        try {

            /*
             * ONLY the code typed by the USER
             * is sent to Code.gs.
             */

            const response =
                await API.verifyOtp({

                    uid:
                        state.uid,

                    identity:
                        identity,

                    username:
                        state.username,

                    email:
                        state.email,

                    gmail:
                        state.email,

                    phone:
                        state.phone,

                    channel:
                        state.channel ||
                        "email",

                    otp:
                        code
                });


            if (
                !response ||
                response.success !== true
            ) {

                throw createApiError(
                    response
                );
            }


            /*
             * Verification succeeded.
             */

            writeStorage(
                "STOCKFLOW_VERIFIED",
                "true"
            );


            const token =
                response.token ||
                response.data?.token ||
                "";


            if (token) {

                writeStorage(
                    "STOCKFLOW_TOKEN",
                    token
                );
            }


            const user =
                response.user ||
                response.data?.user ||
                null;


            if (
                user &&
                typeof user ===
                    "object"
            ) {

                try {

                    writeStorage(
                        "STOCKFLOW_USER",
                        JSON.stringify(
                            user
                        )
                    );

                } catch (error) {

                    console.warn(
                        "StockFlow: Could not save verified user.",
                        error
                    );
                }
            }


            /*
             * OTP is never stored by this file,
             * so there is nothing to clear.
             *
             * Clear the manually entered digits.
             */

            clearOtpBoxes();


            showMessage(
                "Your account has been verified successfully. Redirecting to the Employee Dashboard...",
                "success"
            );


            setTimeout(
                () => {

                    window.location.replace(
                        DASHBOARD
                    );

                },
                1000
            );


        } catch (error) {

            console.error(
                "StockFlow manual OTP verification error:",
                error
            );


            showMessage(
                getErrorMessage(
                    error
                ),
                "error"
            );


            /*
             * Failed verification:
             *
             * Clear only what the USER typed.
             *
             * Never retrieve another OTP.
             */

            clearOtpBoxes();


            const first =
                getOtpBoxes()[0];


            if (first) {

                first.focus();
            }


        } finally {

            updateVerifyButton();


            if (
                button &&
                button.textContent ===
                    "Verifying..."
            ) {

                button.textContent =
                    button.dataset.originalText ||
                    "Verify Account";
            }
        }
    }


    /* =========================================================
       BUTTON SETUP
    ========================================================= */

    function setupButtons() {

        const verifyButton =
            getVerifyButton();


        const emailButton =
            getEmailButton();


        const phoneButton =
            getPhoneButton();


        /*
         * IMPORTANT:
         *
         * If verify.js is already controlling the page,
         * this file must NOT create a second set of
         * event handlers.
         */

        if (
            window.StockFlowVerification &&
            typeof window.StockFlowVerification.verify ===
                "function"
        ) {

            console.log(
                "StockFlow OTP: verify.js controller detected. otp.js will operate in safe compatibility mode."
            );


            return;
        }


        /*
         * Verify button.
         */

        if (verifyButton) {

            verifyButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    verifyManualCode();
                }
            );
        }


        /*
         * Email button.
         */

        if (emailButton) {

            emailButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    sendCode(
                        "email"
                    );
                }
            );
        }


        /*
         * Phone button.
         */

        if (phoneButton) {

            phoneButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    sendCode(
                        "phone"
                    );
                }
            );
        }


        /*
         * Form submit.
         */

        const form =
            getElement(
                "#otpForm",
                "#verifyOtpForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    verifyManualCode();
                }
            );
        }
    }


    /* =========================================================
       INITIAL STATE
    ========================================================= */

    function initialize() {

        console.log(
            "StockFlow: safe manual otp.js loaded."
        );


        /*
         * =====================================================
         * NO AUTOMATIC OTP REQUEST
         * =====================================================
         *
         * DO NOT call:
         *
         * API.prepareOtp()
         * API.resendOtp()
         * prepareOtp()
         * sendCode()
         *
         * here.
         *
         * The user must explicitly click:
         *
         * "Send code by email"
         * OR
         * "Send code by phone"
         */

        displayDestinations();


        /*
         * Always start with EMPTY OTP boxes.
         */

        clearOtpBoxes();


        setupOtpInputs();


        setupButtons();


        updateVerifyButton();


        updateCooldownUI();


        startCooldownTimer();


        /*
         * Focus first OTP box.
         */

        const firstBox =
            getOtpBoxes()[0];


        if (firstBox) {

            firstBox.focus();
        }
    }


    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.StockFlowManualOTP = {

        send:
            sendCode,

        verify:
            verifyManualCode,

        getCode:
            getEnteredOtp,

        clear:
            clearOtpBoxes,

        getState:
            getState,

        getCooldown:
            getRemainingCooldown

    };


    /* =========================================================
       START
    ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }


})();
