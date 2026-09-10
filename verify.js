/* ============================================================
   STOCKFLOW
   ACCOUNT VERIFICATION
   File: verify.js

   IMPORTANT SECURITY RULES
   ------------------------------------------------------------
   1. OTP is generated ONLY by Google Apps Script.
   2. OTP is sent to the user's real registered email.
   3. This file NEVER generates an OTP.
   4. This file NEVER retrieves an OTP.
   5. This file NEVER receives an OTP from the backend.
   6. This file NEVER auto-fills the OTP.
   7. Browser OTP autofill is disabled.
   8. User manually types the 6-digit code.
   9. The backend is the ONLY place that validates the OTP.
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
            AUTH.OTP_RESEND_COOLDOWN_SECONDS ||
            120
        );


    const DASHBOARD_PAGE =
        ROUTES.DASHBOARD ||
        "dashboard.html";


    /* =========================================================
       SESSION STORAGE KEYS
       ========================================================= */

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


    function getOtpInput() {

        return getElement(
            "#otp",
            "#otpCode",
            "#verificationCode",
            "[name='otp']"
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


    function getMessageElement() {

        return getElement(
            "#otpMessage",
            "#message",
            "#authAlert",
            ".otp-message"
        );
    }


    function getEmailStatusElement() {

        return getElement(
            "#emailDeliveryStatus"
        );
    }


    function getPhoneStatusElement() {

        return getElement(
            "#phoneDeliveryStatus"
        );
    }


    function getEmailTimerElement() {

        return getElement(
            "#emailOtpTimer"
        );
    }


    function getPhoneTimerElement() {

        return getElement(
            "#phoneOtpTimer"
        );
    }


    /* =========================================================
       VERIFICATION SESSION
       ========================================================= */

    function getVerificationState() {

        return {

            uid:
                sessionStorage.getItem(
                    STORAGE.UID
                ) || "",

            email:
                sessionStorage.getItem(
                    STORAGE.EMAIL
                ) || "",

            phone:
                sessionStorage.getItem(
                    STORAGE.PHONE
                ) || "",

            username:
                sessionStorage.getItem(
                    STORAGE.USERNAME
                ) || "",

            identity:
                sessionStorage.getItem(
                    STORAGE.IDENTITY
                ) || "",

            channel:
                (
                    sessionStorage.getItem(
                        STORAGE.CHANNEL
                    ) ||
                    "email"
                ).toLowerCase(),

            emailSent:
                sessionStorage.getItem(
                    STORAGE.EMAIL_SENT
                ) === "true",

            phoneSent:
                sessionStorage.getItem(
                    STORAGE.PHONE_SENT
                ) === "true"
        };
    }


    function hasVerificationState() {

        const state =
            getVerificationState();


        return Boolean(
            state.uid ||
            state.identity ||
            state.username ||
            state.email ||
            state.phone
        );
    }


    /* =========================================================
       MESSAGE
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

    function maskEmail(email) {

        if (!email) {
            return "";
        }


        const parts =
            String(email).split("@");


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


    function maskPhone(phone) {

        if (!phone) {
            return "";
        }


        const value =
            String(phone)
                .replace(/\s+/g, "");


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
       OTP SANITIZATION
       ========================================================= */

    function sanitizeDigit(value) {

        return String(
            value || ""
        )
            .replace(/\D/g, "")
            .slice(0, 1);
    }


    function getEnteredOtp() {

        const boxes =
            getOtpBoxes();


        /*
         * SIX INDIVIDUAL BOXES
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
         * FALLBACK SINGLE INPUT
         */

        const input =
            getOtpInput();


        if (!input) {
            return "";
        }


        return String(
            input.value || ""
        )
            .replace(/\D/g, "")
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

            return;
        }


        boxes.forEach(
            (
                box,
                index
            ) => {

                /*
                 * IMPORTANT:
                 *
                 * NO autocomplete="one-time-code"
                 *
                 * This prevents the browser from using its
                 * automatic OTP suggestion/autofill behavior.
                 */

                box.removeAttribute(
                    "autocomplete"
                );


                box.setAttribute(
                    "autocomplete",
                    "off"
                );


                /*
                 * Prevent password-manager style autofill.
                 */

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
                   INPUT
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
                         * USER TYPES ONE DIGIT.
                         *
                         * We do not obtain the OTP from anywhere.
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
                   KEYDOWN
                   ================================================= */

                box.addEventListener(
                    "keydown",
                    event => {

                        /*
                         * Backspace
                         */

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


                        /*
                         * Left arrow
                         */

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


                        /*
                         * Right arrow
                         */

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
                         * Allow browser control keys.
                         */

                        if (
                            event.ctrlKey ||
                            event.metaKey ||
                            event.altKey
                        ) {

                            event.preventDefault();

                            return;
                        }


                        /*
                         * Only ONE numeric digit.
                         */

                        if (
                            event.key.length ===
                            1 &&
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

                        /*
                         * IMPORTANT:
                         *
                         * We intentionally DO NOT allow
                         * clipboard OTP insertion.
                         *
                         * User must type the digits manually.
                         */

                        event.preventDefault();


                        showMessage(
                            "Please type the verification code manually.",
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


                /* =================================================
                   DRAG OVER DISABLED
                   ================================================= */

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

                emailElement.textContent =
                    `Verification code sent to ${maskEmail(state.email)}`;

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

        return Number(
            sessionStorage.getItem(
                getCooldownKey(channel)
            ) || 0
        );
    }


    function setLastSent(
        channel
    ) {

        sessionStorage.setItem(
            getCooldownKey(channel),
            String(
                Date.now()
            )
        );
    }


    function getRemainingCooldown(
        channel
    ) {

        const lastSent =
            getLastSent(channel);


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

        const minutes =
            Math.floor(
                seconds / 60
            );


        const remaining =
            seconds % 60;


        return (
            String(minutes)
                .padStart(2, "0") +
            ":" +
            String(remaining)
                .padStart(2, "0")
        );
    }


    function updateResendButton(
        channel
    ) {

        const normalized =
            String(channel)
                .toLowerCase();


        const phone =
            normalized ===
            "phone";


        const button =
            phone
                ? getPhoneButton()
                : getEmailButton();


        const timer =
            phone
                ? getPhoneTimerElement()
                : getEmailTimerElement();


        if (!button) {
            return;
        }


        const remaining =
            getRemainingCooldown(
                phone
                    ? "phone"
                    : "email"
            );


        const busy =
            phone
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

            if (timer) {

                timer.textContent =
                    `Resend available in ${formatCooldown(remaining)}`;
            }

        } else {

            if (phone) {

                button.textContent =
                    "Send code";

            } else {

                button.textContent =
                    "Resend email code";
            }


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
           VALIDATE CODE
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
           VALIDATE SESSION
           ----------------------------------------------------- */

        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your verification session is missing. Please return to registration and register again.",
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           VALIDATE API
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
             * ==================================================
             * IMPORTANT
             * ==================================================
             *
             * The frontend sends the OTP entered by the USER.
             *
             * It does NOT:
             *
             * - generate an OTP
             * - retrieve an OTP
             * - compare an OTP
             * - receive an OTP
             * - auto-fill an OTP
             *
             * The Google Apps Script backend performs the
             * actual OTP validation.
             */

            const result =
                await API.verifyOtp({

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
                        state.channel ||
                        "email",

                    otpChannel:
                        state.channel ||
                        "email",

                    otp:
                        code
                });


            /* -------------------------------------------------
               CHECK SERVER RESPONSE
               ------------------------------------------------- */

            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result?.message ||
                    "The verification code is incorrect or has expired."
                );
            }


            /*
             * ==================================================
             * SUCCESS
             * ==================================================
             *
             * At this point the backend has accepted the OTP.
             *
             * The backend is responsible for changing the
             * account status to VERIFIED.
             */


            /* -------------------------------------------------
               SAVE TOKEN IF PROVIDED
               ------------------------------------------------- */

            const token =
                result.token ||
                result.data?.token ||
                "";


            if (token) {

                sessionStorage.setItem(
                    "STOCKFLOW_TOKEN",
                    token
                );
            }


            /* -------------------------------------------------
               SAVE USER IF PROVIDED
               ------------------------------------------------- */

            const user =
                result.user ||
                result.data?.user ||
                null;


            if (user) {

                sessionStorage.setItem(
                    "STOCKFLOW_USER",
                    JSON.stringify(
                        user
                    )
                );
            }


            /* -------------------------------------------------
               MARK VERIFIED
               ------------------------------------------------- */

            sessionStorage.setItem(
                "STOCKFLOW_VERIFIED",
                "true"
            );


            /*
             * Remove temporary verification cooldown state.
             */

            sessionStorage.removeItem(
                STORAGE.EMAIL_SENT_AT
            );

            sessionStorage.removeItem(
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
             * Clear the entered code after a failed attempt.
             *
             * The user must manually type the code again.
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
       RESEND OTP
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


        const state =
            getVerificationState();


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your verification session is missing. Please return to registration.",
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           CHANNEL VALIDATION
           ----------------------------------------------------- */

        if (
            isPhone &&
            !state.phone
        ) {

            showMessage(
                "No registered phone number is available.",
                "error"
            );


            return;
        }


        if (
            !isPhone &&
            !state.email
        ) {

            showMessage(
                "No registered email address is available.",
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           COOLDOWN
           ----------------------------------------------------- */

        const remaining =
            getRemainingCooldown(
                isPhone
                    ? "phone"
                    : "email"
            );


        if (
            remaining > 0
        ) {

            showMessage(
                `Please wait ${formatCooldown(remaining)} before requesting another code.`,
                "error"
            );


            return;
        }


        /* -----------------------------------------------------
           API
           ----------------------------------------------------- */

        if (!API) {

            showMessage(
                "The verification service is unavailable.",
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
            isPhone
                ? "phone"
                : "email"
        );


        try {

            showMessage(
                isPhone
                    ? "Sending a new verification code to your phone..."
                    : "Sending a new verification code to your email...",
                "info"
            );


            /*
             * Backend generates the NEW OTP.
             *
             * The frontend receives NO OTP.
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
                        isPhone
                            ? "phone"
                            : "email"
                });


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result?.message ||
                    "The verification code could not be sent."
                );
            }


            /*
             * IMPORTANT:
             *
             * DO NOT DO:
             *
             * result.otp
             * result.code
             * result.verificationCode
             *
             * Nothing is automatically placed into the
             * verification boxes.
             */


            setLastSent(
                isPhone
                    ? "phone"
                    : "email"
            );


            clearOtp();


            showMessage(
                isPhone
                    ? "A new verification code has been sent to your registered phone."
                    : "A new verification code has been sent to your registered email. Please check Gmail and type the code manually.",
                "success"
            );


            startCooldownTimer();


        } catch (error) {

            console.error(
                "StockFlow OTP resend error:",
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
                isPhone
                    ? "phone"
                    : "email"
            );
        }
    }


    /* =========================================================
       ERROR HANDLING
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
            )
        ) {

            return (
                "The verification code is incorrect. Please check the code in your Gmail and try again."
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
                "not found"
            ) ||
            message.includes(
                "account not found"
            )
        ) {

            return (
                "The account could not be found. Please register again."
            );
        }


        if (
            message.includes(
                "already verified"
            )
        ) {

            return (
                "This account is already verified."
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
            )
        ) {

            return (
                "Unable to connect to the verification service. Please check your connection and try again."
            );
        }


        return (
            raw ||
            "We couldn't verify your account. Please try again."
        );
    }


    /* =========================================================
       INITIAL COOLDOWN
       ========================================================= */

    function initializeCooldownState() {

        const state =
            getVerificationState();


        /*
         * Registration already sent the initial email OTP.
         *
         * This timestamp is ONLY for the frontend resend
         * button countdown.
         *
         * It is NOT the OTP.
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
       INITIALIZE PAGE
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
            page !==
                "verify.html"
        ) {

            return;
        }


        console.log(
            "StockFlow: verify.js loaded."
        );


        /*
         * ------------------------------------------------------
         * DO NOT CALL prepareOtp()
         * ------------------------------------------------------
         *
         * Registration already created and sent the initial OTP.
         */


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your verification information is missing. Please return to registration and register again.",
                "error"
            );


            return;
        }


        setupOtpBoxes();


        setupButtons();


        displayDestinations();


        initializeCooldownState();


        updateCooldownUI();


        startCooldownTimer();


        /*
         * ------------------------------------------------------
         * SECURITY: NO AUTOMATIC OTP
         * ------------------------------------------------------
         *
         * We intentionally DO NOT:
         *
         * - call prepareOtp()
         * - call getUser() to obtain an OTP
         * - read response.otp
         * - read response.code
         * - populate OTP boxes
         * - use clipboard
         * - use one-time-code autocomplete
         */


        const description =
            getElement(
                "#verificationDescription"
            );


        if (description) {

            description.textContent =
                "Enter the 6-digit verification code sent to your registered email.";
        }


        const help =
            getElement(
                "#otpHelp"
            );


        if (help) {

            help.textContent =
                "Check your Gmail inbox and manually enter the 6-digit verification code.";
        }


        updateVerifyButton();


        const firstBox =
            getOtpBoxes()[0];


        if (
            firstBox &&
            !firstBox.disabled
        ) {

            firstBox.focus();
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
