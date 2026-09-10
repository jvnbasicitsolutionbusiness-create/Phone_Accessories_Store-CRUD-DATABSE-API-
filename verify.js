/* ============================================================
   STOCKFLOW
   ACCOUNT VERIFICATION
   File: verify.js

   SECURITY RULES
   ------------------------------------------------------------
   1. OTP is generated ONLY by Google Apps Script.
   2. OTP is delivered by the backend to the registered email
      or registered phone number.
   3. This file NEVER generates an OTP.
   4. This file NEVER retrieves an OTP.
   5. This file NEVER receives an OTP from the backend.
   6. This file NEVER compares an OTP locally.
   7. This file NEVER auto-fills the OTP.
   8. User MUST manually type all 6 digits.
   9. OTP verification is performed ONLY by the backend.
   10. Email and phone resend cooldowns are independent.
   11. Each resend has a 120-second cooldown.
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        window.StockFlowConfig ||
        {};

    const AUTH =
        CONFIG.AUTH ||
        {};

    const ROUTES =
        CONFIG.ROUTES ||
        {};


    const API =
        window.StockFlowAPI ||
        window.API ||
        null;


    const OTP_LENGTH =
        Number(
            AUTH.OTP_LENGTH || 6
        );


    const COOLDOWN_SECONDS =
        Number(
            AUTH.OTP_RESEND_COOLDOWN_SECONDS || 120
        );


    const DASHBOARD_PAGE =
        ROUTES.DASHBOARD ||
        "dashboard.html";


    /* =========================================================
       STORAGE KEYS
       ========================================================= */

    /*
     * These are the preferred keys.
     */

    const STORAGE = {

        UID:
            AUTH.OTP_UID_KEY ||
            "STOCKFLOW_OTP_UID",

        EMAIL:
            AUTH.OTP_EMAIL_KEY ||
            "STOCKFLOW_OTP_EMAIL",

        PHONE:
            AUTH.OTP_PHONE_KEY ||
            "STOCKFLOW_OTP_PHONE",

        USERNAME:
            AUTH.OTP_USERNAME_KEY ||
            "STOCKFLOW_OTP_USERNAME",

        IDENTITY:
            AUTH.OTP_IDENTITY_KEY ||
            "STOCKFLOW_OTP_IDENTITY",

        CHANNEL:
            AUTH.OTP_CHANNEL_KEY ||
            "STOCKFLOW_OTP_CHANNEL",

        EMAIL_SENT:
            "STOCKFLOW_OTP_EMAIL_SENT",

        PHONE_SENT:
            "STOCKFLOW_OTP_PHONE_SENT",

        EMAIL_SENT_AT:
            "STOCKFLOW_OTP_EMAIL_SENT_AT",

        PHONE_SENT_AT:
            "STOCKFLOW_OTP_PHONE_SENT_AT"
    };


    /*
     * Compatibility aliases.
     *
     * This does NOT contain OTP values.
     *
     * It only allows verify.js to recognize registration
     * information if an older version of register.js used
     * slightly different temporary storage names.
     */

    const STORAGE_ALIASES = {

        UID: [
            "STOCKFLOW_OTP_UID",
            "STOCKFLOW_VERIFY_UID",
            "STOCKFLOW_REGISTRATION_UID",
            "STOCKFLOW_REGISTER_UID",
            "STOCKFLOW_USER_UID"
        ],

        EMAIL: [
            "STOCKFLOW_OTP_EMAIL",
            "STOCKFLOW_VERIFY_EMAIL",
            "STOCKFLOW_REGISTRATION_EMAIL",
            "STOCKFLOW_REGISTER_EMAIL",
            "STOCKFLOW_USER_EMAIL"
        ],

        PHONE: [
            "STOCKFLOW_OTP_PHONE",
            "STOCKFLOW_VERIFY_PHONE",
            "STOCKFLOW_REGISTRATION_PHONE",
            "STOCKFLOW_REGISTER_PHONE",
            "STOCKFLOW_USER_PHONE"
        ],

        USERNAME: [
            "STOCKFLOW_OTP_USERNAME",
            "STOCKFLOW_VERIFY_USERNAME",
            "STOCKFLOW_REGISTRATION_USERNAME",
            "STOCKFLOW_REGISTER_USERNAME",
            "STOCKFLOW_USER_USERNAME"
        ],

        IDENTITY: [
            "STOCKFLOW_OTP_IDENTITY",
            "STOCKFLOW_VERIFY_IDENTITY",
            "STOCKFLOW_REGISTRATION_IDENTITY",
            "STOCKFLOW_REGISTER_IDENTITY"
        ],

        CHANNEL: [
            "STOCKFLOW_OTP_CHANNEL",
            "STOCKFLOW_VERIFY_CHANNEL",
            "STOCKFLOW_REGISTRATION_CHANNEL"
        ],

        EMAIL_SENT: [
            "STOCKFLOW_OTP_EMAIL_SENT",
            "STOCKFLOW_VERIFY_EMAIL_SENT",
            "STOCKFLOW_REGISTRATION_EMAIL_SENT"
        ],

        PHONE_SENT: [
            "STOCKFLOW_OTP_PHONE_SENT",
            "STOCKFLOW_VERIFY_PHONE_SENT",
            "STOCKFLOW_REGISTRATION_PHONE_SENT"
        ],

        EMAIL_SENT_AT: [
            "STOCKFLOW_OTP_EMAIL_SENT_AT",
            "STOCKFLOW_VERIFY_EMAIL_SENT_AT"
        ],

        PHONE_SENT_AT: [
            "STOCKFLOW_OTP_PHONE_SENT_AT",
            "STOCKFLOW_VERIFY_PHONE_SENT_AT"
        ]
    };


    /* =========================================================
       STATE
       ========================================================= */

    let verificationInProgress =
        false;

    let emailResendInProgress =
        false;

    let phoneResendInProgress =
        false;

    let cooldownTimer =
        null;


    /* =========================================================
       STORAGE HELPERS
       ========================================================= */

    function readStorage(
        keys
    ) {

        const list =
            Array.isArray(keys)
                ? keys
                : [keys];


        for (
            const key of list
        ) {

            if (!key) {
                continue;
            }


            const sessionValue =
                sessionStorage.getItem(
                    key
                );


            if (
                sessionValue !== null &&
                String(sessionValue).trim() !== ""
            ) {

                return String(
                    sessionValue
                ).trim();
            }


            /*
             * localStorage is ONLY used as a compatibility
             * fallback for temporary registration metadata.
             *
             * No OTP is ever read from storage.
             */

            const localValue =
                localStorage.getItem(
                    key
                );


            if (
                localValue !== null &&
                String(localValue).trim() !== ""
            ) {

                return String(
                    localValue
                ).trim();
            }
        }


        return "";
    }


    function writeStorage(
        key,
        value
    ) {

        if (!key) {
            return;
        }


        try {

            sessionStorage.setItem(
                key,
                String(value ?? "")
            );

        } catch (error) {

            console.warn(
                "StockFlow: Unable to write sessionStorage.",
                error
            );
        }
    }


    function removeStorage(
        key
    ) {

        if (!key) {
            return;
        }


        try {

            sessionStorage.removeItem(
                key
            );

        } catch (error) {

            console.warn(
                "StockFlow: Unable to remove sessionStorage item.",
                error
            );
        }
    }


    function getStoredValue(
        name
    ) {

        if (
            STORAGE_ALIASES[name]
        ) {

            return readStorage(
                STORAGE_ALIASES[name]
            );
        }


        return readStorage(
            STORAGE[name]
        );
    }


    function getStoredBoolean(
        name
    ) {

        return (
            getStoredValue(name)
                .toLowerCase() ===
            "true"
        );
    }


    /* =========================================================
       DOM HELPERS
       ========================================================= */

    function getElement(
        ...selectors
    ) {

        for (
            const selector of selectors
        ) {

            if (!selector) {
                continue;
            }


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

        const selectors = [

            ".otp-digit",

            ".otp-input",

            ".otp-box",

            "#otpInputs input",

            "#verificationCodeInputs input",

            "#otpCodeInputs input",

            "#verificationOtpInputs input",

            "[data-otp-digit]"
        ];


        for (
            const selector of selectors
        ) {

            const boxes =
                Array.from(
                    document.querySelectorAll(
                        selector
                    )
                );


            if (
                boxes.length ===
                OTP_LENGTH
            ) {

                return boxes;
            }
        }


        return [];
    }


    function getOtpInput() {

        return getElement(

            "#otp",

            "#otpCode",

            "#verificationCode",

            "#verificationOtp",

            "#verificationCodeInput",

            "[name='otp']",

            "[name='otpCode']"
        );
    }


    function getVerifyButton() {

        return getElement(

            "#verifyOtpBtn",

            "#verifyButton",

            "#verifyBtn",

            "#verifyAccountButton",

            "#verifyAccountBtn",

            "[data-verify-otp]",

            "[data-action='verify']"
        );
    }


    function getEmailButton() {

        return getElement(

            "#resendEmailOtpBtn",

            "#sendEmailOtpBtn",

            "#sendEmailCode",

            "#sendCodeByEmail",

            "#emailOtpButton",

            "#emailVerificationButton",

            "[data-resend-email-otp]",

            "[data-send-email-otp]"
        );
    }


    function getPhoneButton() {

        return getElement(

            "#resendPhoneOtpBtn",

            "#sendPhoneOtpBtn",

            "#sendPhoneCode",

            "#sendCodeByPhone",

            "#phoneOtpButton",

            "#phoneVerificationButton",

            "[data-resend-phone-otp]",

            "[data-send-phone-otp]"
        );
    }


    function getMessageElement() {

        return getElement(

            "#otpMessage",

            "#verificationMessage",

            "#message",

            "#authAlert",

            ".otp-message",

            ".verification-message"
        );
    }


    function getEmailStatusElement() {

        return getElement(

            "#emailDeliveryStatus",

            "#emailStatus",

            "#emailVerificationStatus"
        );
    }


    function getPhoneStatusElement() {

        return getElement(

            "#phoneDeliveryStatus",

            "#phoneStatus",

            "#phoneVerificationStatus"
        );
    }


    function getEmailTimerElement() {

        return getElement(

            "#emailOtpTimer",

            "#emailCountdown",

            "#emailResendTimer"
        );
    }


    function getPhoneTimerElement() {

        return getElement(

            "#phoneOtpTimer",

            "#phoneCountdown",

            "#phoneResendTimer"
        );
    }


    /* =========================================================
       VERIFICATION STATE
       ========================================================= */

    function getVerificationState() {

        const state = {

            uid:
                getStoredValue(
                    "UID"
                ),

            email:
                getStoredValue(
                    "EMAIL"
                ),

            phone:
                getStoredValue(
                    "PHONE"
                ),

            username:
                getStoredValue(
                    "USERNAME"
                ),

            identity:
                getStoredValue(
                    "IDENTITY"
                ),

            channel:
                (
                    getStoredValue(
                        "CHANNEL"
                    ) ||
                    "email"
                ).toLowerCase(),

            emailSent:
                getStoredBoolean(
                    "EMAIL_SENT"
                ),

            phoneSent:
                getStoredBoolean(
                    "PHONE_SENT"
                )
        };


        /*
         * If no explicit identity was saved but we have
         * username/email/phone, derive the identity locally.
         *
         * This does NOT contact the backend.
         */

        if (
            !state.identity
        ) {

            state.identity =
                state.username ||
                state.email ||
                state.phone ||
                "";
        }


        /*
         * If no channel was saved, email is the normal
         * registration verification channel.
         */

        if (
            state.channel !== "phone" &&
            state.channel !== "email"
        ) {

            state.channel =
                "email";
        }


        return state;
    }


    function hasVerificationState() {

        const state =
            getVerificationState();


        /*
         * UID is preferred.
         *
         * However, the system can still continue if
         * registration metadata contains a valid identity.
         */

        return Boolean(

            state.uid ||

            state.identity ||

            state.username ||

            state.email ||

            state.phone
        );
    }


    /* =========================================================
       MESSAGE SYSTEM
       ========================================================= */

    function showMessage(
        message,
        type = "info"
    ) {

        const element =
            getMessageElement();


        if (!element) {

            console.log(
                `[StockFlow Verify - ${type}]`,
                message
            );

            return;
        }


        element.textContent =
            message || "";


        /*
         * Preserve compatibility with existing CSS.
         */

        element.className =
            `otp-message ${type}`;


        element.hidden =
            false;


        element.style.display =
            "block";
    }


    function clearMessage() {

        const element =
            getMessageElement();


        if (!element) {
            return;
        }


        element.textContent =
            "";


        element.className =
            "otp-message";


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
            String(email)
                .split("@");


        if (
            parts.length !== 2
        ) {

            return email;
        }


        const username =
            parts[0];

        const domain =
            parts[1];


        if (
            username.length <= 2
        ) {

            return (
                `${username.charAt(0) || "*"}***@${domain}`
            );
        }


        return (
            `${username.substring(0, 2)}***@${domain}`
        );
    }


    function maskPhone(
        phone
    ) {

        if (!phone) {
            return "";
        }


        const value =
            String(phone)
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
                Math.max(
                    0,
                    value.length - 4
                )
            ) +

            value.slice(-4)
        );
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


        /*
         * SIX INDIVIDUAL INPUT BOXES
         */

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


        /*
         * SINGLE INPUT FALLBACK
         */

        const input =
            getOtpInput();


        if (!input) {
            return "";
        }


        return String(
            input.value || ""
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


    function syncOtpInput() {

        const boxes =
            getOtpBoxes();

        const input =
            getOtpInput();


        if (
            !input ||
            boxes.length !== OTP_LENGTH
        ) {

            return;
        }


        input.value =
            boxes
                .map(
                    box =>
                        sanitizeDigit(
                            box.value
                        )
                )
                .join("");
    }


    function clearOtp() {

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


        const input =
            getOtpInput();


        if (input) {

            input.value =
                "";
        }


        updateVerifyButton();
    }


    /* =========================================================
       VERIFY BUTTON
       ========================================================= */

    function updateVerifyButton() {

        const button =
            getVerifyButton();


        if (!button) {
            return;
        }


        const code =
            getEnteredOtp();


        button.disabled =
            verificationInProgress ||
            code.length !== OTP_LENGTH;
    }


    function setVerifyLoading(
        loading
    ) {

        const button =
            getVerifyButton();


        if (!button) {
            return;
        }


        button.disabled =
            loading;


        button.classList.toggle(
            "is-loading",
            loading
        );


        const text =
            button.querySelector(
                ".button-text"
            );


        const loader =
            button.querySelector(
                ".button-loader"
            );


        if (text) {

            text.style.display =
                loading
                    ? "none"
                    : "";
        }


        if (loader) {

            loader.style.display =
                loading
                    ? "inline-flex"
                    : "none";
        }
    }


    /* =========================================================
       OTP BOX SETUP
       ========================================================= */

    function setupOtpBoxes() {

        const boxes =
            getOtpBoxes();


        if (
            boxes.length !==
            OTP_LENGTH
        ) {

            console.warn(
                `StockFlow: Expected ${OTP_LENGTH} OTP boxes, found ${boxes.length}.`
            );


            /*
             * There may be a single OTP input instead.
             */

            const singleInput =
                getOtpInput();


            if (singleInput) {

                singleInput.removeAttribute(
                    "autocomplete"
                );

                singleInput.setAttribute(
                    "autocomplete",
                    "off"
                );

                singleInput.setAttribute(
                    "inputmode",
                    "numeric"
                );

                singleInput.setAttribute(
                    "maxlength",
                    String(
                        OTP_LENGTH
                    )
                );


                singleInput.addEventListener(
                    "input",
                    () => {

                        singleInput.value =
                            String(
                                singleInput.value ||
                                ""
                            )
                                .replace(
                                    /\D/g,
                                    ""
                                )
                                .slice(
                                    0,
                                    OTP_LENGTH
                                );


                        updateVerifyButton();
                    }
                );


                singleInput.addEventListener(
                    "paste",
                    event => {

                        event.preventDefault();


                        showMessage(
                            "Please type the verification code manually.",
                            "info"
                        );
                    }
                );


                updateVerifyButton();

                return;
            }


            return;
        }


        boxes.forEach(
            (
                box,
                index
            ) => {

                /*
                 * -------------------------------------------------
                 * DISABLE BROWSER OTP AUTOFILL
                 * -------------------------------------------------
                 */

                box.removeAttribute(
                    "autocomplete"
                );

                box.setAttribute(
                    "autocomplete",
                    "off"
                );

                box.setAttribute(
                    "data-lpignore",
                    "true"
                );

                box.setAttribute(
                    "data-form-type",
                    "other"
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


                box.disabled =
                    false;


                /* =================================================
                   USER INPUT
                   ================================================= */

                box.addEventListener(
                    "input",
                    event => {

                        const digit =
                            sanitizeDigit(
                                event.target.value
                            );


                        event.target.value =
                            digit;


                        /*
                         * Only the character typed by the user
                         * is placed in this box.
                         *
                         * No OTP is retrieved.
                         */

                        syncOtpInput();


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


                /* =================================================
                   KEYBOARD NAVIGATION
                   ================================================= */

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


                                syncOtpInput();


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
                         * Do NOT block Ctrl/Cmd+A, etc.
                         *
                         * Paste itself is separately blocked.
                         */

                        if (
                            event.ctrlKey ||
                            event.metaKey ||
                            event.altKey
                        ) {

                            return;
                        }


                        /*
                         * Allow navigation/control keys.
                         */

                        const controlKeys = [

                            "Backspace",
                            "Delete",
                            "Tab",
                            "Enter",
                            "Escape",
                            "ArrowLeft",
                            "ArrowRight",
                            "Home",
                            "End"
                        ];


                        if (
                            controlKeys.includes(
                                event.key
                            )
                        ) {

                            return;
                        }


                        /*
                         * Only numeric characters.
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


                /* =================================================
                   PASTE DISABLED
                   ================================================= */

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


                /* =================================================
                   DROP DISABLED
                   ================================================= */

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
       DESTINATION DISPLAY
       ========================================================= */

    function displayDestinations() {

        const state =
            getVerificationState();


        const emailElement =
            getEmailStatusElement();


        const phoneElement =
            getPhoneStatusElement();


        if (emailElement) {

            if (state.email) {

                if (
                    state.emailSent
                ) {

                    emailElement.textContent =
                        `Verification code sent to ${maskEmail(state.email)}. Check your Gmail inbox and enter the code manually.`;

                } else {

                    emailElement.textContent =
                        `Registered email: ${maskEmail(state.email)}`;
                }

            } else {

                emailElement.textContent =
                    "No registered email address available.";
            }
        }


        if (phoneElement) {

            if (state.phone) {

                phoneElement.textContent =
                    `Registered phone: ${maskPhone(state.phone)}`;

            } else {

                phoneElement.textContent =
                    "No registered phone number available.";
            }
        }
    }


    /* =========================================================
       COOLDOWN
       ========================================================= */

    function getCooldownKey(
        channel
    ) {

        return (
            String(channel)
                .toLowerCase() ===
            "phone"
        )
            ? STORAGE.PHONE_SENT_AT
            : STORAGE.EMAIL_SENT_AT;
    }


    function getLastSent(
        channel
    ) {

        const primaryKey =
            getCooldownKey(
                channel
            );


        const aliasKeys =
            String(channel)
                .toLowerCase() ===
            "phone"
                ? STORAGE_ALIASES.PHONE_SENT_AT
                : STORAGE_ALIASES.EMAIL_SENT_AT;


        return Number(
            readStorage(
                [
                    primaryKey,
                    ...aliasKeys
                ]
            ) || 0
        );
    }


    function setLastSent(
        channel
    ) {

        writeStorage(
            getCooldownKey(
                channel
            ),
            Date.now()
        );
    }


    function getRemainingCooldown(
        channel
    ) {

        const lastSent =
            getLastSent(
                channel
            );


        if (!lastSent) {
            return 0;
        }


        const elapsed =
            Math.floor(
                (
                    Date.now() -
                    lastSent
                ) / 1000
            );


        return Math.max(
            0,
            COOLDOWN_SECONDS -
            elapsed
        );
    }


    function formatCooldown(
        seconds
    ) {

        const safeSeconds =
            Math.max(
                0,
                Number(seconds) || 0
            );


        const minutes =
            Math.floor(
                safeSeconds / 60
            );


        const remaining =
            safeSeconds % 60;


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


    function updateResendButton(
        channel
    ) {

        const normalized =
            String(
                channel || "email"
            )
                .toLowerCase();


        const isPhone =
            normalized ===
            "phone";


        const button =
            isPhone
                ? getPhoneButton()
                : getEmailButton();


        const timer =
            isPhone
                ? getPhoneTimerElement()
                : getEmailTimerElement();


        if (!button) {
            return;
        }


        const remaining =
            getRemainingCooldown(
                isPhone
                    ? "phone"
                    : "email"
            );


        const busy =
            isPhone
                ? phoneResendInProgress
                : emailResendInProgress;


        button.disabled =
            busy ||
            remaining > 0;


        if (busy) {

            button.textContent =
                "Sending...";

        } else if (
            remaining > 0
        ) {

            /*
             * Keep the original button purpose visible
             * while displaying the cooldown.
             */

            button.textContent =
                isPhone
                    ? `Send code in ${formatCooldown(remaining)}`
                    : `Send code in ${formatCooldown(remaining)}`;


            if (timer) {

                timer.textContent =
                    `Available in ${formatCooldown(remaining)}`;
            }

        } else {

            button.textContent =
                isPhone
                    ? "Send code by phone"
                    : "Send code by email";


            if (timer) {

                timer.textContent =
                    "";
            }
        }
    }


    function updateCooldownUI() {

        updateResendButton(
            "email"
        );


        updateResendButton(
            "phone"
        );


        const emailRemaining =
            getRemainingCooldown(
                "email"
            );


        const phoneRemaining =
            getRemainingCooldown(
                "phone"
            );


        if (
            emailRemaining <= 0 &&
            phoneRemaining <= 0
        ) {

            if (cooldownTimer) {

                clearInterval(
                    cooldownTimer
                );


                cooldownTimer =
                    null;
            }
        }
    }


    function startCooldownTimer() {

        if (cooldownTimer) {

            clearInterval(
                cooldownTimer
            );
        }


        updateCooldownUI();


        if (
            getRemainingCooldown(
                "email"
            ) <= 0 &&

            getRemainingCooldown(
                "phone"
            ) <= 0
        ) {

            return;
        }


        cooldownTimer =
            setInterval(
                updateCooldownUI,
                1000
            );
    }


    /* =========================================================
       API ERROR MESSAGE
       ========================================================= */

    function getVerificationErrorMessage(
        error
    ) {

        const raw =
            String(
                error?.message ||
                error?.error ||
                error ||
                ""
            );


        const message =
            raw.toLowerCase();


        if (
            message.includes(
                "incorrect"
            ) ||

            message.includes(
                "invalid otp"
            ) ||

            message.includes(
                "wrong otp"
            ) ||

            message.includes(
                "invalid code"
            )
        ) {

            return (
                "The verification code is incorrect. Please check the code sent to your Gmail or phone and enter it again."
            );
        }


        if (
            message.includes(
                "expired"
            )
        ) {

            return (
                "This verification code has expired. Please request a new code."
            );
        }


        if (
            message.includes(
                "locked"
            ) ||

            message.includes(
                "too many"
            ) ||

            message.includes(
                "30 minutes"
            )
        ) {

            return (
                "Too many incorrect attempts. Verification is temporarily locked for 30 minutes."
            );
        }


        if (
            message.includes(
                "cooldown"
            ) ||

            message.includes(
                "wait"
            ) ||

            message.includes(
                "120"
            )
        ) {

            return (
                "Please wait for the 2-minute security cooldown before requesting another verification code."
            );
        }


        if (
            message.includes(
                "not found"
            ) ||

            message.includes(
                "account not found"
            )
        ) {

            return (
                "The account could not be found. Please return to registration and create the account again."
            );
        }


        if (
            message.includes(
                "already verified"
            )
        ) {

            return (
                "This account is already verified. You may continue to the login page."
            );
        }


        if (
            message.includes(
                "network"
            ) ||

            message.includes(
                "fetch"
            ) ||

            message.includes(
                "connect"
            ) ||

            message.includes(
                "backend"
            ) ||

            message.includes(
                "timeout"
            )
        ) {

            return (
                "Unable to connect to the verification service right now. Please check your connection and try again."
            );
        }


        return (
            raw ||
            "We couldn't verify your account. Please check your code and try again."
        );
    }


    /* =========================================================
       VERIFY ACCOUNT
       ========================================================= */

    async function verifyAccount() {

        if (
            verificationInProgress
        ) {

            return;
        }


        const code =
            getEnteredOtp();


        const state =
            getVerificationState();


        /* -----------------------------------------------------
           CODE VALIDATION
           ----------------------------------------------------- */

        if (
            code.length !==
            OTP_LENGTH
        ) {

            showMessage(
                "Please enter all 6 digits of the verification code.",
                "error"
            );


            updateVerifyButton();


            return;
        }


        /* -----------------------------------------------------
           REGISTRATION STATE VALIDATION
           ----------------------------------------------------- */

        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your registration information could not be found. Please return to registration and create the account again.",
                "error"
            );


            console.error(
                "StockFlow Verify: Missing registration state.",
                state
            );


            return;
        }


        /*
         * UID is strongly preferred, but the backend may also
         * resolve the account using identity/username/email/phone.
         */

        const identity =
            state.identity ||
            state.username ||
            state.email ||
            state.phone ||
            "";


        if (
            !identity &&
            !state.uid
        ) {

            showMessage(
                "Your account information could not be identified. Please return to registration.",
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           API VALIDATION
           ----------------------------------------------------- */

        if (!API) {

            showMessage(
                "The verification service is unavailable. Please reload the page.",
                "error"
            );


            return;
        }


        if (
            typeof API.verifyOtp !==
            "function"
        ) {

            showMessage(
                "OTP verification is not configured correctly.",
                "error"
            );


            console.error(
                "StockFlow: API.verifyOtp() is missing."
            );


            return;
        }


        verificationInProgress =
            true;


        setVerifyLoading(
            true
        );


        clearMessage();


        try {

            /*
             * --------------------------------------------------
             * IMPORTANT
             * --------------------------------------------------
             *
             * The ONLY OTP value sent by this frontend is the
             * value manually typed by the user.
             *
             * No OTP is generated here.
             * No OTP is retrieved here.
             * No OTP is compared here.
             */

            const result =
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
                        state.channel,

                    otpChannel:
                        state.channel,

                    otp:
                        code
                });


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result?.message ||
                    "The verification code is incorrect or has expired."
                );
            }


            /* -------------------------------------------------
               SAVE SESSION INFORMATION
               ------------------------------------------------- */

            const token =
                result.token ||
                result.data?.token ||
                "";


            if (token) {

                writeStorage(
                    "STOCKFLOW_TOKEN",
                    token
                );
            }


            const user =
                result.user ||
                result.data?.user ||
                null;


            if (user) {

                writeStorage(
                    "STOCKFLOW_USER",
                    JSON.stringify(
                        user
                    )
                );
            }


            /*
             * Mark account verified.
             */

            writeStorage(
                "STOCKFLOW_VERIFIED",
                "true"
            );


            /* -------------------------------------------------
               CLEAR TEMPORARY COOLDOWN STATE
               ------------------------------------------------- */

            removeStorage(
                STORAGE.EMAIL_SENT_AT
            );

            removeStorage(
                STORAGE.PHONE_SENT_AT
            );


            showMessage(
                "Your account has been verified successfully. Redirecting to the dashboard...",
                "success"
            );


            /* -------------------------------------------------
               REDIRECT
               ------------------------------------------------- */

            setTimeout(
                () => {

                    window.location.replace(
                        DASHBOARD_PAGE
                    );

                },
                1000
            );


        } catch (error) {

            console.error(
                "StockFlow verification error:",
                error
            );


            showMessage(
                getVerificationErrorMessage(
                    error
                ),
                "error"
            );


            /*
             * Clear ONLY the manually entered code.
             *
             * Nothing is retrieved or auto-filled.
             */

            clearOtp();


            const firstBox =
                getOtpBoxes()[0];


            if (
                firstBox &&
                !firstBox.disabled
            ) {

                firstBox.focus();
            }


        } finally {

            verificationInProgress =
                false;


            setVerifyLoading(
                false
            );


            updateVerifyButton();
        }
    }


    /* =========================================================
       SEND / RESEND OTP
       ========================================================= */

    async function resendOtp(
        channel
    ) {

        const normalized =
            String(
                channel || "email"
            )
                .toLowerCase();


        const isPhone =
            normalized ===
            "phone";


        const actualChannel =
            isPhone
                ? "phone"
                : "email";


        const state =
            getVerificationState();


        /* -----------------------------------------------------
           REGISTRATION STATE
           ----------------------------------------------------- */

        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your registration information could not be found. Please return to registration.",
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           DESTINATION VALIDATION
           ----------------------------------------------------- */

        if (
            isPhone &&
            !state.phone
        ) {

            showMessage(
                "No registered phone number is available for this account.",
                "error"
            );


            return;
        }


        if (
            !isPhone &&
            !state.email
        ) {

            showMessage(
                "No registered email address is available for this account.",
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           COOLDOWN
           ----------------------------------------------------- */

        const remaining =
            getRemainingCooldown(
                actualChannel
            );


        if (
            remaining > 0
        ) {

            showMessage(
                `Please wait ${formatCooldown(remaining)} before requesting another ${actualChannel} verification code.`,
                "error"
            );


            updateCooldownUI();


            return;
        }


        /* -----------------------------------------------------
           API
           ----------------------------------------------------- */

        if (!API) {

            showMessage(
                "The verification service is unavailable. Please reload the page.",
                "error"
            );


            return;
        }


        if (
            typeof API.resendOtp !==
            "function"
        ) {

            showMessage(
                "OTP resend is not configured correctly.",
                "error"
            );


            console.error(
                "StockFlow: API.resendOtp() is missing."
            );


            return;
        }


        if (isPhone) {

            phoneResendInProgress =
                true;

        } else {

            emailResendInProgress =
                true;
        }


        updateResendButton(
            actualChannel
        );


        try {

            if (isPhone) {

                showMessage(
                    "Sending a new verification code to your registered phone number...",
                    "info"
                );

            } else {

                showMessage(
                    "Sending a new verification code to your registered Gmail address...",
                    "info"
                );
            }


            /*
             * --------------------------------------------------
             * BACKEND GENERATES THE OTP
             * --------------------------------------------------
             *
             * The response MUST NOT be used to obtain an OTP.
             *
             * We intentionally do not inspect:
             *
             * result.otp
             * result.code
             * result.verificationCode
             *
             * The user gets the actual code from Gmail/SMS.
             */

            const result =
                await API.resendOtp({

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
                        actualChannel
                });


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result?.message ||
                    `The ${actualChannel} verification code could not be sent.`
                );
            }


            /*
             * Start frontend cooldown.
             */

            setLastSent(
                actualChannel
            );


            /*
             * NEVER populate OTP boxes.
             */

            clearOtp();


            if (isPhone) {

                showMessage(
                    "A new 6-digit verification code has been sent to your registered phone number. Please check your phone and type the code manually.",
                    "success"
                );

            } else {

                showMessage(
                    "A new 6-digit verification code has been sent to your registered Gmail address. Please check Gmail and type the code manually.",
                    "success"
                );
            }


            startCooldownTimer();


        } catch (error) {

            console.error(
                `StockFlow ${actualChannel} OTP resend error:`,
                error
            );


            showMessage(
                getVerificationErrorMessage(
                    error
                ),
                "error"
            );


        } finally {

            if (isPhone) {

                phoneResendInProgress =
                    false;

            } else {

                emailResendInProgress =
                    false;
            }


            updateResendButton(
                actualChannel
            );
        }
    }


    /* =========================================================
       INITIAL REGISTRATION COOLDOWN
       ========================================================= */

    function initializeCooldownState() {

        const state =
            getVerificationState();


        /*
         * Registration automatically sends the initial email OTP.
         *
         * If register.js marked the email as sent but did not
         * yet create the frontend timestamp, start the 2-minute
         * cooldown here.
         */

        if (
            state.emailSent &&
            state.email &&
            !getLastSent("email")
        ) {

            setLastSent(
                "email"
            );
        }


        /*
         * Same principle for phone if registration ever starts
         * with phone delivery.
         */

        if (
            state.phoneSent &&
            state.phone &&
            !getLastSent("phone")
        ) {

            setLastSent(
                "phone"
            );
        }
    }


    /* =========================================================
       BUTTON SETUP
       ========================================================= */

    function setupButtons() {

        /* -----------------------------------------------------
           VERIFY FORM
           ----------------------------------------------------- */

        const form =
            getElement(

                "#otpForm",

                "#verifyOtpForm",

                "#verificationForm",

                "#accountVerificationForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    verifyAccount();
                }
            );
        }


        const verifyButton =
            getVerifyButton();


        if (
            verifyButton &&
            !form
        ) {

            verifyButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    verifyAccount();
                }
            );
        }


        /* -----------------------------------------------------
           EMAIL
           ----------------------------------------------------- */

        const emailButton =
            getEmailButton();


        if (emailButton) {

            emailButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    resendOtp(
                        "email"
                    );
                }
            );
        }


        /* -----------------------------------------------------
           PHONE
           ----------------------------------------------------- */

        const phoneButton =
            getPhoneButton();


        if (phoneButton) {

            phoneButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    resendOtp(
                        "phone"
                    );
                }
            );
        }
    }


    /* =========================================================
       PAGE TEXT
       ========================================================= */

    function updateVerificationText() {

        const state =
            getVerificationState();


        const description =
            getElement(
                "#verificationDescription"
            );


        if (description) {

            if (
                state.email &&
                state.phone
            ) {

                description.textContent =
                    "Enter the 6-digit verification code sent to your registered email or phone.";

            } else if (
                state.email
            ) {

                description.textContent =
                    "Enter the 6-digit verification code sent to your registered email.";

            } else if (
                state.phone
            ) {

                description.textContent =
                    "Enter the 6-digit verification code sent to your registered phone.";
            }
        }


        const help =
            getElement(
                "#otpHelp"
            );


        if (help) {

            if (
                state.email
            ) {

                help.textContent =
                    "Check your Gmail inbox and manually type the 6-digit verification code.";
            }
        }
    }


    /* =========================================================
       INITIALIZE
       ========================================================= */

    function initialize() {

        const page =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        /*
         * Only run on verify.html.
         */

        if (
            page &&
            page !== "verify.html"
        ) {

            return;
        }


        console.log(
            "StockFlow: verify.js loaded."
        );


        /*
         * IMPORTANT:
         *
         * We DO NOT call:
         *
         * API.prepareOtp()
         * API.getUser()
         * API.getOtp()
         * API.generateOtp()
         *
         * Registration is responsible for requesting the
         * initial verification email.
         */


        const state =
            getVerificationState();


        console.log(
            "StockFlow verification state:",
            {
                hasUid:
                    Boolean(state.uid),

                hasEmail:
                    Boolean(state.email),

                hasPhone:
                    Boolean(state.phone),

                hasUsername:
                    Boolean(state.username),

                hasIdentity:
                    Boolean(state.identity),

                channel:
                    state.channel,

                emailSent:
                    state.emailSent,

                phoneSent:
                    state.phoneSent
            }
        );


        /* -----------------------------------------------------
           REGISTRATION STATE
           ----------------------------------------------------- */

        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your registration information could not be found. Please return to registration and create the account again.",
                "error"
            );


            console.error(
                "StockFlow Verify: No registration metadata was found in session/local storage."
            );


            return;
        }


        /* -----------------------------------------------------
           SETUP
           ----------------------------------------------------- */

        setupOtpBoxes();

        setupButtons();

        displayDestinations();

        updateVerificationText();

        initializeCooldownState();

        updateCooldownUI();

        startCooldownTimer();

        updateVerifyButton();


        /*
         * ------------------------------------------------------
         * NO AUTOMATIC OTP
         * ------------------------------------------------------
         *
         * We intentionally do NOT:
         *
         * - generate an OTP
         * - request an OTP automatically
         * - retrieve an OTP
         * - read result.otp
         * - read result.code
         * - read verificationCode
         * - populate the OTP boxes
         * - use clipboard
         * - use autocomplete="one-time-code"
         */


        /*
         * Focus the first OTP box.
         *
         * Focusing is NOT autofill.
         */

        const firstBox =
            getOtpBoxes()[0];


        if (
            firstBox &&
            !firstBox.disabled
        ) {

            setTimeout(
                () => {

                    firstBox.focus();

                },
                100
            );
        }


        /*
         * Single-input fallback.
         */

        const singleInput =
            getOtpInput();


        if (
            singleInput &&
            getOtpBoxes().length !== OTP_LENGTH
        ) {

            setTimeout(
                () => {

                    singleInput.focus();

                },
                100
            );
        }
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.StockFlowVerification = {

        verify:
            verifyAccount,

        resend:
            resendOtp,

        getState:
            getVerificationState,

        getCode:
            getEnteredOtp,

        clear:
            clearOtp
    };


    /*
     * Backward compatibility.
     */

    window.StockFlowOTP =
        window.StockFlowVerification;


    window.OTP =
        window.StockFlowVerification;


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();
