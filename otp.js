/* =========================================================
   STOCKFLOW — OTP VERIFICATION CONTROLLER
   File: otp.js

   Responsibilities:
   - Six-digit OTP verification
   - Six individual OTP boxes
   - Email primary verification
   - Phone backup
   - 3–5 second verification preparation delay
   - OTP state persistence
   - Resend cooldown
   - No forced redirect to login
   ========================================================= */

(function () {

    "use strict";


    /* =========================================================
       DEPENDENCIES
    ========================================================= */

    const API =
        window.StockFlowAPI ||
        window.API ||
        null;

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};


    /* =========================================================
       CONFIGURATION
    ========================================================= */

    const OTP_LENGTH =
        Number(
            CONFIG.AUTH?.OTP_LENGTH || 6
        );


    const COOLDOWN_SECONDS =
        Math.max(
            120,
            Number(
                CONFIG.AUTH?.OTP_RESEND_COOLDOWN_SECONDS ||
                120
            )
        );


    /*
     * Random delay:
     *
     * 3000ms - 5000ms
     */

    const MIN_GENERATION_DELAY = 3000;

    const MAX_GENERATION_DELAY = 5000;


    const STORAGE = {

        UID:
            "STOCKFLOW_OTP_UID",

        EMAIL:
            "STOCKFLOW_OTP_EMAIL",

        PHONE:
            "STOCKFLOW_OTP_PHONE",

        USERNAME:
            "STOCKFLOW_OTP_USERNAME",

        CHANNEL:
            "STOCKFLOW_OTP_CHANNEL",

        CODE:
            "STOCKFLOW_OTP_CODE",

        CODE_READY:
            "STOCKFLOW_OTP_CODE_READY",

        EMAIL_SENT:
            "STOCKFLOW_OTP_EMAIL_SENT",

        PHONE_SENT:
            "STOCKFLOW_OTP_PHONE_SENT"

    };


    let verificationInProgress = false;

    let emailResendInProgress = false;

    let phoneResendInProgress = false;

    let timer = null;

    let generationTimer = null;



    /* =========================================================
       DOM HELPERS
    ========================================================= */

    function getElement(...selectors) {

        for (const selector of selectors) {

            const element =
                document.querySelector(selector);

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



    /* =========================================================
       OTP STATE
    ========================================================= */

    function getState() {

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

            channel:
                sessionStorage.getItem(
                    STORAGE.CHANNEL
                ) || "EMAIL",

            code:
                sessionStorage.getItem(
                    STORAGE.CODE
                ) || "",

            codeReady:
                sessionStorage.getItem(
                    STORAGE.CODE_READY
                ) === "true"

        };

    }


    function saveState(data = {}) {

        if (data.uid) {

            sessionStorage.setItem(
                STORAGE.UID,
                String(data.uid)
            );

        }

        if (data.email) {

            sessionStorage.setItem(
                STORAGE.EMAIL,
                String(data.email)
            );

        }

        if (data.phone) {

            sessionStorage.setItem(
                STORAGE.PHONE,
                String(data.phone)
            );

        }

        if (data.username) {

            sessionStorage.setItem(
                STORAGE.USERNAME,
                String(data.username)
            );

        }

        if (data.channel) {

            sessionStorage.setItem(
                STORAGE.CHANNEL,
                String(data.channel).toUpperCase()
            );

        }

        if (data.code) {

            sessionStorage.setItem(
                STORAGE.CODE,
                String(data.code)
            );

        }

    }


    function hasVerificationState() {

        const state = getState();

        return Boolean(
            state.uid ||
            state.email ||
            state.phone ||
            state.username
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
                `[STOCKFLOW OTP ${type}]`,
                message
            );

            return;

        }

        element.textContent =
            message;

        element.className =
            `otp-message ${type}`;

        element.hidden = false;

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

        element.hidden =
            true;

        element.style.display =
            "none";

        element.className =
            "otp-message";

    }



    /* =========================================================
       EMAIL / PHONE MASKING
    ========================================================= */

    function maskEmail(email) {

        if (!email) {

            return "your registered email";

        }

        const parts =
            String(email).split("@");

        if (parts.length !== 2) {

            return email;

        }

        const local =
            parts[0];

        const domain =
            parts[1];

        if (local.length <= 2) {

            return (
                `${local.charAt(0)}` +
                `${"*".repeat(
                    Math.max(
                        1,
                        local.length - 1
                    )
                )}` +
                `@${domain}`
            );

        }

        return (
            `${local.substring(0, 2)}` +
            `${"*".repeat(
                Math.max(
                    2,
                    local.length - 2
                )
            )}` +
            `@${domain}`
        );

    }


    function maskPhone(phone) {

        if (!phone) {

            return "your registered phone";

        }

        const value =
            String(phone);

        if (value.length <= 4) {

            return "*".repeat(
                value.length
            );

        }

        return (
            `${"*".repeat(
                value.length - 4
            )}` +
            `${value.slice(-4)}`
        );

    }



    /* =========================================================
       OTP SANITIZATION
    ========================================================= */

    function sanitizeOtp(value) {

        return String(value || "")
            .replace(/\D/g, "")
            .slice(
                0,
                OTP_LENGTH
            );

    }



    /* =========================================================
       OTP BOXES
    ========================================================= */

    function setOtpBoxesDisabled(disabled) {

        getOtpBoxes().forEach(
            box => {

                box.disabled =
                    disabled;

            }
        );

    }


    function clearOtpBoxes() {

        getOtpBoxes().forEach(
            box => {

                box.value =
                    "";

            }
        );

        const hidden =
            getOtpInput();

        if (hidden) {

            hidden.value =
                "";

        }

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
                        sanitizeOtp(
                            box.value
                        )
                )
                .join("");

        }

        return sanitizeOtp(
            getOtpInput()?.value
        );

    }


    function updateHiddenOtp() {

        const code =
            getEnteredOtp();

        const hidden =
            getOtpInput();

        if (hidden) {

            hidden.value =
                code;

        }

        updateVerifyButton();

    }


    function focusFirstEmptyBox() {

        const box =
            getOtpBoxes().find(
                item =>
                    !item.value
            );

        if (box) {

            box.focus();

        }

    }


    function setupOtpBoxes() {

        const boxes =
            getOtpBoxes();

        if (!boxes.length) {
            return;
        }


        boxes.forEach(
            (box, index) => {

                box.addEventListener(
                    "input",
                    () => {

                        box.value =
                            sanitizeOtp(
                                box.value
                            );

                        if (
                            box.value &&
                            index <
                            boxes.length - 1
                        ) {

                            boxes[
                                index + 1
                            ].focus();

                        }

                        updateHiddenOtp();

                        clearMessage();

                    }
                );


                box.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key ===
                            "Backspace" &&
                            !box.value &&
                            index > 0
                        ) {

                            boxes[
                                index - 1
                            ].focus();

                        }

                    }
                );


                box.addEventListener(
                    "paste",
                    event => {

                        event.preventDefault();

                        const pasted =
                            sanitizeOtp(
                                event.clipboardData
                                    ?.getData("text")
                            );

                        pasted
                            .split("")
                            .forEach(
                                (
                                    digit,
                                    offset
                                ) => {

                                    if (
                                        boxes[
                                            index +
                                            offset
                                        ]
                                    ) {

                                        boxes[
                                            index +
                                            offset
                                        ].value =
                                            digit;

                                    }

                                }
                            );

                        updateHiddenOtp();

                        focusFirstEmptyBox();

                    }
                );

            }
        );

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
            !getState().codeReady ||
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

        const text =
            button.querySelector(
                ".button-text"
            );

        const loader =
            button.querySelector(
                ".button-loader"
            );


        button.disabled =
            loading ||
            getEnteredOtp().length !==
            OTP_LENGTH;


        button.classList.toggle(
            "loading",
            loading
        );


        if (text) {

            text.hidden =
                loading;

        }


        if (loader) {

            loader.hidden =
                !loading;

        }

    }



    /* =========================================================
       LOCAL CODE DISPLAY
    =========================================================
    
       IMPORTANT:
       This is only the display layer.

       The backend should remain the authoritative
       source for OTP verification.
    ========================================================= */

    function displayGeneratedCode(
        code
    ) {

        const clean =
            sanitizeOtp(code);

        if (
            clean.length !==
            OTP_LENGTH
        ) {

            return;

        }


        saveState({
            code: clean
        });


        sessionStorage.setItem(
            STORAGE.CODE_READY,
            "true"
        );


        /*
         * Put the code into the six boxes
         * so the user can see it.
         */

        const boxes =
            getOtpBoxes();


        boxes.forEach(
            (box, index) => {

                box.value =
                    clean[index] || "";

            }
        );


        const hidden =
            getOtpInput();

        if (hidden) {

            hidden.value =
                clean;

        }


        setOtpBoxesDisabled(
            false
        );


        const description =
            getElement(
                "#verificationDescription"
            );

        if (description) {

            description.textContent =
                "Your verification code is ready. Enter the code below to continue.";

        }


        const help =
            getElement(
                "#otpHelp"
            );

        if (help) {

            help.textContent =
                "Enter the 6-digit verification code.";

        }


        showMessage(
            "Your verification code is ready.",
            "success"
        );


        updateVerifyButton();

    }



    /* =========================================================
       PREPARE OTP
    ========================================================= */

    async function prepareOtp() {

        if (
            !hasVerificationState()
        ) {

            /*
             * IMPORTANT:
             * Do NOT automatically redirect.
             *
             * This prevents the user from being
             * thrown back to login before verification.
             */

            showMessage(
                "Verification information is missing. Please return to registration and try again.",
                "error"
            );

            return;

        }


        /*
         * If a code already exists,
         * don't generate another one.
         */

        const existing =
            getState();

        if (
            existing.code &&
            existing.codeReady
        ) {

            displayGeneratedCode(
                existing.code
            );

            return;

        }


        setOtpBoxesDisabled(
            true
        );


        const description =
            getElement(
                "#verificationDescription"
            );


        if (description) {

            description.textContent =
                "Generating your secure verification code...";

        }


        showMessage(
            "Preparing your verification code...",
            "info"
        );


        /*
         * Random 3–5 second delay.
         */

        const delay =
            Math.floor(
                Math.random() *
                (
                    MAX_GENERATION_DELAY -
                    MIN_GENERATION_DELAY +
                    1
                )
            ) +
            MIN_GENERATION_DELAY;


        await new Promise(
            resolve => {

                generationTimer =
                    setTimeout(
                        resolve,
                        delay
                    );

            }
        );


        /*
         * Generate six-digit code.
         */

        const code =
            String(
                Math.floor(
                    100000 +
                    Math.random() *
                    900000
                )
            );


        displayGeneratedCode(
            code
        );

    }



    /* =========================================================
       VERIFY OTP
    ========================================================= */

    async function verifyOtp() {

        if (
            verificationInProgress
        ) {
            return;
        }


        const code =
            getEnteredOtp();


        if (
            code.length !==
            OTP_LENGTH
        ) {

            showMessage(
                `Please enter the ${OTP_LENGTH}-digit verification code.`,
                "error"
            );

            focusFirstEmptyBox();

            return;

        }


        const state =
            getState();


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Verification information is missing. Please return to registration and try again.",
                "error"
            );

            return;

        }


        if (!API) {

            showMessage(
                "STOCKFLOW API is unavailable. Please reload the page.",
                "error"
            );

            return;

        }


        verificationInProgress =
            true;

        clearMessage();

        setVerifyLoading(
            true
        );


        try {

            const result =
                await API.verifyOtp({

                    uid:
                        state.uid,

                    username:
                        state.username,

                    email:
                        state.email,

                    phone:
                        state.phone,

                    channel:
                        state.channel ||
                        "EMAIL",

                    otpChannel:
                        state.channel ||
                        "EMAIL",

                    otp:
                        code

                });


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    "The verification code is incorrect or has expired."
                );

            }


            showMessage(
                "Verification successful. Signing you in...",
                "success"
            );


            /*
             * If backend returns a token,
             * save it.
             */

            if (
                result.token
            ) {

                API.saveToken(
                    result.token
                );

            }


            /*
             * If backend returns user,
             * save user information.
             */

            if (
                result.user
            ) {

                sessionStorage.setItem(
                    "STOCKFLOW_USER",
                    JSON.stringify(
                        result.user
                    )
                );

            }


            /*
             * Verification is complete.
             */

            sessionStorage.setItem(
                "STOCKFLOW_VERIFIED",
                "true"
            );


            /*
             * Give the success message
             * a moment before navigation.
             */

            setTimeout(
                () => {

                    const destination =
                        CONFIG.ROUTES
                            ?.DASHBOARD ||
                        "dashboard.html";

                    window.location.replace(
                        destination
                    );

                },
                1000
            );


        } catch (error) {

            console.error(
                "STOCKFLOW OTP verification error:",
                error
            );


            showMessage(
                normalizeVerificationError(
                    error
                ),
                "error"
            );


            clearOtpBoxes();

            updateVerifyButton();

            focusFirstEmptyBox();


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
       ERROR NORMALIZATION
    ========================================================= */

    function normalizeVerificationError(
        error
    ) {

        const message =
            String(
                error?.message || ""
            );


        if (
            /invalid|incorrect|expired|wrong/i
                .test(message) &&
            /otp|code|verification/i
                .test(message)
        ) {

            return (
                "The verification code is incorrect or has expired."
            );

        }


        return (
            message ||
            "We couldn't verify that code. Please try again."
        );

    }



    /* =========================================================
       RESEND COOLDOWN
    ========================================================= */

    function getSentKey(
        channel
    ) {

        return channel === "SMS"
            ? STORAGE.PHONE_SENT
            : STORAGE.EMAIL_SENT;

    }


    function getLastSent(
        channel
    ) {

        return Number(
            sessionStorage.getItem(
                getSentKey(channel)
            ) || 0
        );

    }


    function setLastSent(
        channel,
        timestamp
    ) {

        sessionStorage.setItem(
            getSentKey(channel),
            String(
                timestamp ||
                Date.now()
            )
        );

    }


    function remainingCooldown(
        channel
    ) {

        const lastSent =
            getLastSent(
                channel
            );


        if (!lastSent) {
            return 0;
        }


        return Math.max(
            0,
            COOLDOWN_SECONDS -
            Math.floor(
                (
                    Date.now() -
                    lastSent
                ) / 1000
            )
        );

    }


    function formatTime(
        seconds
    ) {

        const minutes =
            Math.floor(
                seconds / 60
            );

        const remainder =
            String(
                seconds % 60
            ).padStart(
                2,
                "0"
            );

        return `${minutes}:${remainder}`;

    }



    /* =========================================================
       COOLDOWN UI
    ========================================================= */

    function updateMethodButton(
        channel
    ) {

        const button =
            channel === "SMS"
                ? getPhoneButton()
                : getEmailButton();


        if (!button) {
            return;
        }


        const remaining =
            remainingCooldown(
                channel
            );


        const busy =
            channel === "SMS"
                ? phoneResendInProgress
                : emailResendInProgress;


        button.disabled =
            remaining > 0 ||
            busy;


        const timerElement =
            channel === "SMS"
                ? getElement(
                    "#phoneOtpTimer"
                )
                : getElement(
                    "#emailOtpTimer"
                );


        if (timerElement) {

            if (
                remaining > 0
            ) {

                timerElement.textContent =
                    `Resend available in ${formatTime(remaining)}`;

                timerElement.classList.remove(
                    "ready"
                );

            } else {

                timerElement.textContent =
                    "Ready to send a new code.";

                timerElement.classList.add(
                    "ready"
                );

            }

        }

    }


    function updateCooldownUI() {

        updateMethodButton(
            "EMAIL"
        );

        updateMethodButton(
            "SMS"
        );


        const emailRemaining =
            remainingCooldown(
                "EMAIL"
            );


        const phoneRemaining =
            remainingCooldown(
                "SMS"
            );


        if (
            emailRemaining <= 0 &&
            phoneRemaining <= 0 &&
            timer
        ) {

            clearInterval(
                timer
            );

            timer = null;

        }

    }


    function startCooldownTicker() {

        if (timer) {

            clearInterval(
                timer
            );

        }


        updateCooldownUI();


        timer =
            setInterval(
                updateCooldownUI,
                1000
            );

    }



    /* =========================================================
       SEND / RESEND CODE
    ========================================================= */

    async function sendCode(
        channel
    ) {

        const normalizedChannel =
            channel === "SMS"
                ? "SMS"
                : "EMAIL";


        const isPhone =
            normalizedChannel === "SMS";


        if (
            isPhone
                ? phoneResendInProgress
                : emailResendInProgress
        ) {

            return;

        }


        if (
            remainingCooldown(
                normalizedChannel
            ) > 0
        ) {

            updateCooldownUI();

            return;

        }


        if (!API) {

            showMessage(
                "STOCKFLOW API is unavailable.",
                "error"
            );

            return;

        }


        const state =
            getState();


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Verification information is missing. Please return to registration.",
                "error"
            );

            return;

        }


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


        if (isPhone) {

            phoneResendInProgress =
                true;

        } else {

            emailResendInProgress =
                true;

        }


        const button =
            isPhone
                ? getPhoneButton()
                : getEmailButton();


        const originalText =
            button?.textContent ||
            "";


        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Sending...";

        }


        clearMessage();


        try {

            const result =
                await API.resendOtp({

                    uid:
                        state.uid,

                    username:
                        state.username,

                    email:
                        state.email,

                    phone:
                        state.phone,

                    channel:
                        normalizedChannel,

                    otpChannel:
                        normalizedChannel

                });


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    "Unable to send a new verification code."
                );

            }


            /*
             * Save backend returned state.
             */

            saveState({

                uid:
                    result.uid ||
                    state.uid,

                email:
                    result.email ||
                    state.email,

                phone:
                    result.phone ||
                    state.phone,

                username:
                    state.username,

                channel:
                    result.channel ||
                    normalizedChannel

            });


            /*
             * A new code was requested.
             * Remove the previous local code.
             */

            sessionStorage.removeItem(
                STORAGE.CODE
            );

            sessionStorage.setItem(
                STORAGE.CODE_READY,
                "false"
            );


            clearOtpBoxes();


            /*
             * Start 3–5 second preparation.
             */

            await prepareOtp();


            setLastSent(
                normalizedChannel,
                Date.now()
            );


            const destination =
                isPhone
                    ? maskPhone(
                        getState().phone
                    )
                    : maskEmail(
                        getState().email
                    );


            showMessage(
                `A new 6-digit verification code is ready for ${destination}.`,
                "success"
            );


            updateCooldownUI();

            startCooldownTicker();


        } catch (error) {

            console.error(
                "STOCKFLOW OTP delivery error:",
                error
            );


            showMessage(
                error?.message ||
                "We couldn't send a new verification code.",
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


            if (button) {

                button.textContent =
                    originalText;

            }


            updateCooldownUI();

        }

    }



    /* =========================================================
       DESTINATION DISPLAY
    ========================================================= */

    function displayDestinations() {

        const state =
            getState();


        const email =
            maskEmail(
                state.email
            );


        const phone =
            maskPhone(
                state.phone
            );


        const emailStatus =
            getElement(
                "#emailDeliveryStatus"
            );


        if (emailStatus) {

            emailStatus.textContent =
                `Code sent to ${email}`;

        }


        const phoneStatus =
            getElement(
                "#phoneDeliveryStatus"
            );


        if (phoneStatus) {

            phoneStatus.textContent =
                state.phone
                    ? `Use ${phone} if you cannot access your email.`
                    : "No phone number is available for this account.";

        }

    }



    /* =========================================================
       INITIAL SENT TIME
    ========================================================= */

    function initializeSentTimes() {

        const state =
            getState();


        if (
            state.email &&
            !getLastSent("EMAIL")
        ) {

            setLastSent(
                "EMAIL",
                Date.now()
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

                    verifyOtp();

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

                    sendCode(
                        "EMAIL"
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

                    sendCode(
                        "SMS"
                    );

                }
            );

        }


        const backButton =
            getElement(
                "[data-back-login]"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    /*
                     * Clear only OTP-related state.
                     */

                    Object.values(
                        STORAGE
                    ).forEach(
                        key => {

                            sessionStorage.removeItem(
                                key
                            );

                        }
                    );

                }
            );

        }

    }



    /* =========================================================
       INITIALIZE
    ========================================================= */

    async function initialize() {

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        /*
         * verify-otp.html is no longer
         * the actual verification page.
         */

        if (
            path ===
            "verify-otp.html"
        ) {

            window.location.replace(
                "verify.html"
            );

            return;

        }


        if (
            path !==
            "verify.html"
        ) {

            return;

        }


        setupOtpBoxes();

        setupButtons();

        displayDestinations();

        initializeSentTimes();

        updateCooldownUI();

        startCooldownTicker();


        /*
         * IMPORTANT:
         * No automatic redirect.
         */

        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Verification information is missing. Please return to registration and try again.",
                "error"
            );

            return;

        }


        await prepareOtp();


        updateVerifyButton();

    }



    /* =========================================================
       PUBLIC API
    ========================================================= */

    window.StockFlowOTP = {

        verify:
            verifyOtp,

        resend:
            (
                channel = "EMAIL"
            ) =>
                sendCode(channel),

        sanitize:
            sanitizeOtp,

        getState,

        maskEmail,

        maskPhone,

        prepare:
            prepareOtp

    };


    window.OTP =
        window.StockFlowOTP;


    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

})();
