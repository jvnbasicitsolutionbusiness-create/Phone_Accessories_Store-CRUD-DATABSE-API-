/* ============================================================
   STOCKFLOW — OTP VERIFICATION CONTROLLER
   File: otp.js

   FLOW:

   REGISTER
       ↓
   verify.html
       ↓
   prepareOtp()
       ↓
   Google Apps Script
       ↓
   Google Sheets + Firebase
       ↓
   backend-generated OTP
       ↓
   wait 3–5 seconds
       ↓
   six OTP boxes auto-fill
       ↓
   Verify Account
       ↓
   Employee Dashboard

   IMPORTANT:
   - Frontend does NOT generate the OTP.
   - Backend generates the authoritative OTP.
   - Demo mode may return the generated OTP.
   - CSS is NOT modified here.
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       GLOBAL CONFIGURATION
       ========================================================= */

    const API =
        window.StockFlowAPI ||
        window.API ||
        null;


    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};


    const AUTH =
        CONFIG.AUTH ||
        {};


    const OTP_LENGTH =
        Number(
            AUTH.OTP_LENGTH || 6
        );


    const COOLDOWN_SECONDS =
        Math.max(
            1,
            Number(
                AUTH.OTP_RESEND_COOLDOWN_SECONDS ||
                60
            )
        );


    const MIN_GENERATION_DELAY =
        Number(
            AUTH.DEMO_AUTO_FILL_DELAY_MIN ||
            3000
        );


    const MAX_GENERATION_DELAY =
        Number(
            AUTH.DEMO_AUTO_FILL_DELAY_MAX ||
            5000
        );


    /* =========================================================
       STORAGE
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

        CODE:
            AUTH.OTP_CODE_KEY ||
            "STOCKFLOW_OTP_CODE",

        CODE_READY:
            AUTH.OTP_READY_KEY ||
            "STOCKFLOW_OTP_CODE_READY",

        EMAIL_SENT:
            AUTH.OTP_EMAIL_SENT_KEY ||
            "STOCKFLOW_OTP_EMAIL_SENT",

        PHONE_SENT:
            AUTH.OTP_PHONE_SENT_KEY ||
            "STOCKFLOW_OTP_PHONE_SENT"
    };


    /* =========================================================
       INTERNAL STATE
       ========================================================= */

    let verificationInProgress =
        false;

    let emailRequestInProgress =
        false;

    let phoneRequestInProgress =
        false;

    let generationInProgress =
        false;

    let cooldownTimer =
        null;

    let generationTimer =
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
       STATE
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

            identity:
                sessionStorage.getItem(
                    STORAGE.IDENTITY
                ) || "",

            channel:
                sessionStorage.getItem(
                    STORAGE.CHANNEL
                ) || "",

            code:
                sessionStorage.getItem(
                    STORAGE.CODE
                ) || "",

            codeReady:
                sessionStorage.getItem(
                    STORAGE.CODE_READY
                ) === "true",

            emailSent:
                Number(
                    sessionStorage.getItem(
                        STORAGE.EMAIL_SENT
                    ) || 0
                ),

            phoneSent:
                Number(
                    sessionStorage.getItem(
                        STORAGE.PHONE_SENT
                    ) || 0
                )
        };
    }


    /*
     * IMPORTANT:
     *
     * Never overwrite valid state with empty values.
     */

    function saveState(data = {}) {

        const mappings = {

            uid:
                STORAGE.UID,

            email:
                STORAGE.EMAIL,

            phone:
                STORAGE.PHONE,

            username:
                STORAGE.USERNAME,

            identity:
                STORAGE.IDENTITY,

            channel:
                STORAGE.CHANNEL
        };


        Object.entries(
            mappings
        ).forEach(
            ([key, storageKey]) => {

                const value =
                    data[key];

                if (
                    value !== undefined &&
                    value !== null &&
                    String(value).trim() !== ""
                ) {

                    sessionStorage.setItem(
                        storageKey,
                        String(value)
                    );
                }
            }
        );


        if (
            data.code !== undefined &&
            data.code !== null
        ) {

            sessionStorage.setItem(
                STORAGE.CODE,
                String(data.code)
            );
        }


        if (
            data.codeReady !== undefined
        ) {

            sessionStorage.setItem(
                STORAGE.CODE_READY,
                data.codeReady
                    ? "true"
                    : "false"
            );
        }


        if (
            data.emailSent !== undefined
        ) {

            sessionStorage.setItem(
                STORAGE.EMAIL_SENT,
                String(
                    data.emailSent
                )
            );
        }


        if (
            data.phoneSent !== undefined
        ) {

            sessionStorage.setItem(
                STORAGE.PHONE_SENT,
                String(
                    data.phoneSent
                )
            );
        }
    }


    function clearOtpCodeState() {

        sessionStorage.removeItem(
            STORAGE.CODE
        );

        sessionStorage.setItem(
            STORAGE.CODE_READY,
            "false"
        );
    }


    function clearOtpStorage() {

        Object.values(
            STORAGE
        ).forEach(
            key =>
                sessionStorage.removeItem(
                    key
                )
        );
    }


    function hasVerificationState() {

        const state =
            getState();


        return Boolean(
            state.uid ||
            state.username ||
            state.identity ||
            state.email ||
            state.phone
        );
    }


    function buildIdentity(state) {

        return String(
            state.identity ||
            state.username ||
            state.email ||
            state.phone ||
            state.uid ||
            ""
        ).trim();
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
            return;
        }


        element.textContent =
            message;

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
            String(email)
                .trim()
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
                (username[0] || "*") +
                "***@" +
                domain
            );
        }


        return (
            username.substring(0, 2) +
            "***@" +
            domain
        );
    }


    function maskPhone(phone) {

        if (!phone) {
            return "";
        }


        const clean =
            String(phone)
                .replace(/\s+/g, "");


        if (
            clean.length <= 4
        ) {

            return "***";
        }


        return (
            "*".repeat(
                Math.max(
                    0,
                    clean.length - 4
                )
            ) +
            clean.slice(-4)
        );
    }


    /* =========================================================
       OTP SANITIZATION
       ========================================================= */

    function sanitizeOtp(value) {

        return String(
            value || ""
        )
            .replace(/\D/g, "")
            .slice(
                0,
                OTP_LENGTH
            );
    }


    /* =========================================================
       OTP BOX MANAGEMENT
       ========================================================= */

    function disableOtpBoxes(
        clear = true
    ) {

        const boxes =
            getOtpBoxes();


        boxes.forEach(
            box => {

                box.disabled =
                    true;

                if (clear) {
                    box.value = "";
                }
            }
        );


        updateHiddenOtp();
    }


    function enableOtpBoxes() {

        getOtpBoxes()
            .forEach(
                box =>
                    box.disabled =
                        false
            );
    }


    function clearOtpBoxes() {

        getOtpBoxes()
            .forEach(
                box =>
                    box.value = ""
            );


        updateHiddenOtp();
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


        const hidden =
            getOtpInput();


        return hidden
            ? sanitizeOtp(
                hidden.value
            )
            : "";
    }


    function updateHiddenOtp() {

        const value =
            getOtpBoxes()
                .map(
                    box =>
                        sanitizeOtp(
                            box.value
                        )
                )
                .join("");


        const hidden =
            getOtpInput();


        if (hidden) {

            hidden.value =
                value;
        }


        return value;
    }


    function focusFirstEmptyBox() {

        const box =
            getOtpBoxes()
                .find(
                    item =>
                        !sanitizeOtp(
                            item.value
                        )
                );


        if (
            box &&
            !box.disabled
        ) {

            box.focus();
        }
    }


    /* =========================================================
       AUTO-FILL
       ========================================================= */

    function fillOtpBoxes(code) {

        const cleanCode =
            sanitizeOtp(code);


        if (
            cleanCode.length !==
            OTP_LENGTH
        ) {

            return false;
        }


        const boxes =
            getOtpBoxes();


        enableOtpBoxes();


        boxes.forEach(
            (box, index) => {

                box.value =
                    cleanCode[index] ||
                    "";
            }
        );


        updateHiddenOtp();


        if (boxes.length) {

            boxes[
                boxes.length - 1
            ].focus();
        }


        updateVerifyButton();


        return true;
    }


    /* =========================================================
       OTP INPUT EVENTS
       ========================================================= */

    function setupOtpBoxes() {

        const boxes =
            getOtpBoxes();


        if (!boxes.length) {
            return;
        }


        boxes.forEach(
            (box, index) => {

                box.inputMode =
                    "numeric";

                box.autocomplete =
                    "one-time-code";

                box.maxLength =
                    1;


                box.addEventListener(
                    "input",
                    event => {

                        if (
                            box.disabled
                        ) {

                            return;
                        }


                        const value =
                            sanitizeOtp(
                                event.target.value
                            );


                        box.value =
                            value;


                        updateHiddenOtp();


                        if (
                            value &&
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


                box.addEventListener(
                    "keydown",
                    event => {

                        if (
                            box.disabled
                        ) {

                            return;
                        }


                        if (
                            event.key ===
                            "Backspace" &&
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


                            updateHiddenOtp();

                            updateVerifyButton();
                        }


                        if (
                            event.key ===
                            "ArrowLeft" &&
                            index > 0
                        ) {

                            event.preventDefault();

                            boxes[
                                index - 1
                            ].focus();
                        }


                        if (
                            event.key ===
                            "ArrowRight" &&
                            index <
                                boxes.length - 1
                        ) {

                            event.preventDefault();

                            boxes[
                                index + 1
                            ].focus();
                        }


                        if (
                            event.key.length ===
                                1 &&
                            !/\d/.test(
                                event.key
                            )
                        ) {

                            event.preventDefault();
                        }
                    }
                );


                box.addEventListener(
                    "paste",
                    event => {

                        if (
                            box.disabled
                        ) {

                            return;
                        }


                        event.preventDefault();


                        const pasted =
                            event.clipboardData
                                ?.getData("text") ||
                            "";


                        const code =
                            sanitizeOtp(
                                pasted
                            );


                        if (!code) {
                            return;
                        }


                        code
                            .split("")
                            .forEach(
                                (
                                    digit,
                                    offset
                                ) => {

                                    const target =
                                        boxes[
                                            index +
                                            offset
                                        ];

                                    if (target) {

                                        target.value =
                                            digit;
                                    }
                                }
                            );


                        updateHiddenOtp();


                        const focusIndex =
                            Math.min(
                                index +
                                    code.length,
                                boxes.length -
                                    1
                            );


                        boxes[
                            focusIndex
                        ].focus();


                        updateVerifyButton();
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


        const state =
            getState();


        button.disabled =
            verificationInProgress ||
            !state.codeReady ||
            code.length !==
                OTP_LENGTH;
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
    }


    /* =========================================================
       RESPONSE HELPERS
       ========================================================= */

    function getResponseData(
        result
    ) {

        if (!result) {
            return {};
        }


        return (
            result.data ||
            result.result ||
            result
        );
    }


    function extractOtpFromResponse(
        result
    ) {

        const data =
            getResponseData(
                result
            );


        const candidates = [

            result.demoOtp,
            result.otp,
            result.code,
            result.verificationCode,

            data.demoOtp,
            data.otp,
            data.code,
            data.verificationCode,

            data?.user?.demoOtp,
            data?.user?.otp
        ];


        for (
            const candidate
            of candidates
        ) {

            const code =
                sanitizeOtp(
                    candidate
                );


            if (
                code.length ===
                OTP_LENGTH
            ) {

                return code;
            }
        }


        return "";
    }


    function extractStateFromResponse(
        result
    ) {

        const data =
            getResponseData(
                result
            );


        const user =
            data.user ||
            result.user ||
            {};


        return {

            uid:
                data.uid ||
                data.userId ||
                data.id ||
                user.uid ||
                user.userId ||
                "",

            username:
                data.username ||
                user.username ||
                "",

            email:
                data.email ||
                data.gmail ||
                user.email ||
                user.gmail ||
                "",

            phone:
                data.phone ||
                data.phoneNumber ||
                user.phone ||
                user.phoneNumber ||
                "",

            identity:
                data.identity ||
                user.identity ||
                "",

            channel:
                data.channel ||
                data.otpChannel ||
                ""
        };
    }


    /* =========================================================
       GENERATION DELAY
       ========================================================= */

    function getGenerationDelay() {

        const min =
            Math.min(
                MIN_GENERATION_DELAY,
                MAX_GENERATION_DELAY
            );

        const max =
            Math.max(
                MIN_GENERATION_DELAY,
                MAX_GENERATION_DELAY
            );


        return Math.floor(
            Math.random() *
                (max - min + 1)
        ) + min;
    }


    function waitForGenerationDelay() {

        return new Promise(
            resolve => {

                if (
                    generationTimer
                ) {

                    clearTimeout(
                        generationTimer
                    );
                }


                generationTimer =
                    setTimeout(
                        () => {

                            generationTimer =
                                null;

                            resolve();

                        },
                        getGenerationDelay()
                    );
            }
        );
    }


    /* =========================================================
       REQUEST OTP
       ========================================================= */

    async function requestGeneratedOtp(
        channel
    ) {

        if (!API) {

            throw new Error(
                "StockFlow API is not available."
            );
        }


        const state =
            getState();


        const identity =
            buildIdentity(
                state
            );


        if (!identity) {

            throw new Error(
                "Username or Gmail is required."
            );
        }


        const payload = {

            uid:
                state.uid,

            identity,

            username:
                state.username,

            email:
                state.email,

            gmail:
                state.email,

            phone:
                state.phone,

            channel,

            otpChannel:
                channel
        };


        if (
            typeof API.prepareOtp ===
            "function"
        ) {

            return await API.prepareOtp(
                payload
            );
        }


        if (
            typeof API.resendOtp ===
            "function"
        ) {

            return await API.resendOtp(
                payload
            );
        }


        throw new Error(
            "No OTP generation method is available."
        );
    }


    /* =========================================================
       DISPLAY GENERATED OTP
       ========================================================= */

    function displayGeneratedCode(
        code
    ) {

        const cleanCode =
            sanitizeOtp(code);


        if (
            cleanCode.length !==
            OTP_LENGTH
        ) {

            throw new Error(
                "The server did not return a valid six-digit OTP."
            );
        }


        saveState({

            code:
                cleanCode,

            codeReady:
                true
        });


        fillOtpBoxes(
            cleanCode
        );


        const description =
            getElement(
                "#verificationDescription"
            );


        if (description) {

            description.textContent =
                "Your verification code is ready. It has been automatically entered.";
        }


        const help =
            getElement(
                "#otpHelp"
            );


        if (help) {

            help.textContent =
                "Your six-digit verification code has been entered automatically.";
        }


        /*
         * Demo only.
         */

        if (
            CONFIG.DEMO_MODE === true
        ) {

            showMessage(
                `Demo verification code: ${cleanCode}`,
                "success"
            );
        }


        updateVerifyButton();
    }


    /* =========================================================
       PREPARE FIRST OTP
       ========================================================= */

    async function prepareOtp(
        channel = null
    ) {

        if (generationInProgress) {
            return;
        }


        if (!hasVerificationState()) {

            showMessage(
                "Username or Gmail is required. Please return to registration and try again.",
                "error"
            );

            return;
        }


        generationInProgress =
            true;


        try {

            const state =
                getState();


            const selectedChannel =
                channel ||
                state.channel ||
                "email";


            saveState({

                channel:
                    selectedChannel
            });


            clearOtpCodeState();

            disableOtpBoxes(true);

            updateVerifyButton();

            clearMessage();


            const description =
                getElement(
                    "#verificationDescription"
                );


            if (description) {

                description.textContent =
                    "Preparing your verification code. Please wait a moment...";
            }


            const help =
                getElement(
                    "#otpHelp"
                );


            if (help) {

                help.textContent =
                    "Your six-digit verification code is being prepared.";
            }


            const result =
                await requestGeneratedOtp(
                    selectedChannel
                );


            if (
                result &&
                result.success === false
            ) {

                throw new Error(
                    result.message ||
                    "The server could not prepare the verification code."
                );
            }


            const code =
                extractOtpFromResponse(
                    result
                );


            if (
                code.length !==
                OTP_LENGTH
            ) {

                throw new Error(
                    "The backend did not return the demo OTP."
                );
            }


            /*
             * IMPORTANT:
             *
             * Merge returned state.
             * Never erase existing registration state.
             */

            saveState(
                extractStateFromResponse(
                    result
                )
            );


            saveState({

                channel:
                    selectedChannel
            });


            /*
             * Wait 3–5 seconds.
             */

            await waitForGenerationDelay();


            if (
                !document.body.contains(
                    getElement(
                        "#otpForm"
                    )
                )
            ) {

                return;
            }


            displayGeneratedCode(
                code
            );


            setLastSent(
                selectedChannel
            );


            startCooldownTicker();


        } catch (error) {

            console.error(
                "OTP preparation failed:",
                error
            );


            clearOtpCodeState();

            disableOtpBoxes(true);

            updateVerifyButton();


            showMessage(
                normalizeOtpError(
                    error
                ),
                "error"
            );


            const description =
                getElement(
                    "#verificationDescription"
                );


            if (description) {

                description.textContent =
                    "We could not prepare your verification code. Please try again.";
            }


        } finally {

            generationInProgress =
                false;
        }
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
            sanitizeOtp(
                getEnteredOtp()
            );


        const state =
            getState();


        if (
            code.length !==
            OTP_LENGTH
        ) {

            showMessage(
                "Please enter the complete six-digit verification code.",
                "error"
            );

            focusFirstEmptyBox();

            return;
        }


        if (
            !state.codeReady
        ) {

            showMessage(
                "Your verification code is not ready yet.",
                "error"
            );

            return;
        }


        const identity =
            buildIdentity(
                state
            );


        if (!identity) {

            showMessage(
                "Username or Gmail is required.",
                "error"
            );

            return;
        }


        if (!API) {

            showMessage(
                "The verification service is currently unavailable.",
                "error"
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

            const result =
                await API.verifyOtp({

                    uid:
                        state.uid,

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

                    otpChannel:
                        state.channel ||
                        "email",

                    otp:
                        code
                });


            if (
                result &&
                result.success === false
            ) {

                throw new Error(
                    result.message ||
                    "The verification code is incorrect or has expired."
                );
            }


            const data =
                getResponseData(
                    result
                );


            const token =
                result.token ||
                data.token ||
                "";


            const user =
                result.user ||
                data.user ||
                null;


            if (token) {

                localStorage.setItem(
                    "STOCKFLOW_TOKEN",
                    token
                );

                sessionStorage.setItem(
                    "STOCKFLOW_TOKEN",
                    token
                );
            }


            if (user) {

                localStorage.setItem(
                    "STOCKFLOW_USER",
                    JSON.stringify(
                        user
                    )
                );

                sessionStorage.setItem(
                    "STOCKFLOW_USER",
                    JSON.stringify(
                        user
                    )
                );
            }


            sessionStorage.setItem(
                "STOCKFLOW_VERIFIED",
                "true"
            );


            clearOtpCodeState();


            showMessage(
                "Your account has been verified successfully!",
                "success"
            );


            setTimeout(
                () => {

                    window.location.href =
                        (
                            CONFIG.ROUTES?.DASHBOARD ||
                            "dashboard.html"
                        );

                },
                800
            );


        } catch (error) {

            console.error(
                "OTP verification failed:",
                error
            );


            showMessage(
                normalizeOtpError(
                    error
                ),
                "error"
            );


            clearOtpBoxes();

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
       COOLDOWN
       ========================================================= */

    function getSentKey(
        channel
    ) {

        return (
            channel === "phone"
                ? STORAGE.PHONE_SENT
                : STORAGE.EMAIL_SENT
        );
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
        timestamp = Date.now()
    ) {

        sessionStorage.setItem(
            getSentKey(channel),
            String(timestamp)
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


    function formatTime(
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


    function updateMethodButton(
        channel
    ) {

        const button =
            channel === "phone"
                ? getPhoneButton()
                : getEmailButton();


        if (!button) {
            return;
        }


        const timer =
            channel === "phone"
                ? getPhoneTimerElement()
                : getEmailTimerElement();


        const busy =
            channel === "phone"
                ? phoneRequestInProgress
                : emailRequestInProgress;


        const remaining =
            remainingCooldown(
                channel
            );


        button.disabled =
            busy ||
            remaining > 0;


        if (busy) {

            button.textContent =
                "Preparing...";

        } else if (
            remaining > 0
        ) {

            if (timer) {

                timer.textContent =
                    formatTime(
                        remaining
                    );
            }

        } else {

            button.textContent =
                channel === "phone"
                    ? "Send code by phone"
                    : "Send code by email";


            if (timer) {

                timer.textContent =
                    "";
            }
        }
    }


    function updateCooldownUI() {

        updateMethodButton(
            "email"
        );

        updateMethodButton(
            "phone"
        );
    }


    function startCooldownTicker() {

        if (cooldownTimer) {

            clearInterval(
                cooldownTimer
            );
        }


        updateCooldownUI();


        cooldownTimer =
            setInterval(
                () => {

                    updateCooldownUI();


                    if (
                        remainingCooldown(
                            "email"
                        ) <= 0 &&
                        remainingCooldown(
                            "phone"
                        ) <= 0
                    ) {

                        clearInterval(
                            cooldownTimer
                        );

                        cooldownTimer =
                            null;
                    }

                },
                1000
            );
    }


    /* =========================================================
       SEND / RESEND
       ========================================================= */

    async function sendCode(
        channel
    ) {

        if (
            channel !== "email" &&
            channel !== "phone"
        ) {

            return;
        }


        const state =
            getState();


        if (!hasVerificationState()) {

            showMessage(
                "Username or Gmail is required. Please return to registration.",
                "error"
            );

            return;
        }


        if (
            channel === "email" &&
            !state.email
        ) {

            showMessage(
                "No Gmail address is available.",
                "error"
            );

            return;
        }


        if (
            channel === "phone" &&
            !state.phone
        ) {

            showMessage(
                "No phone number is available.",
                "error"
            );

            return;
        }


        const remaining =
            remainingCooldown(
                channel
            );


        if (
            remaining > 0
        ) {

            showMessage(
                `Please wait ${formatTime(remaining)} before requesting another code.`,
                "error"
            );

            return;
        }


        if (
            channel === "phone"
                ? phoneRequestInProgress
                : emailRequestInProgress
        ) {

            return;
        }


        if (channel === "phone") {

            phoneRequestInProgress =
                true;

        } else {

            emailRequestInProgress =
                true;
        }


        updateMethodButton(
            channel
        );


        try {

            clearOtpCodeState();

            disableOtpBoxes(true);

            updateVerifyButton();


            showMessage(
                `Preparing a new ${channel} verification code...`,
                "info"
            );


            saveState({

                channel
            });


            const result =
                await API.resendOtp({

                    uid:
                        state.uid,

                    identity:
                        buildIdentity(
                            state
                        ),

                    username:
                        state.username,

                    email:
                        state.email,

                    gmail:
                        state.email,

                    phone:
                        state.phone,

                    channel,

                    otpChannel:
                        channel
                });


            if (
                result &&
                result.success === false
            ) {

                throw new Error(
                    result.message ||
                    "The server could not generate a new OTP."
                );
            }


            const code =
                extractOtpFromResponse(
                    result
                );


            if (
                code.length !==
                OTP_LENGTH
            ) {

                throw new Error(
                    "The backend did not return a valid six-digit OTP."
                );
            }


            /*
             * Merge backend state.
             */

            saveState(
                extractStateFromResponse(
                    result
                )
            );


            saveState({

                channel
            });


            setLastSent(
                channel
            );


            await waitForGenerationDelay();


            displayGeneratedCode(
                code
            );


            showMessage(
                CONFIG.DEMO_MODE === true
                    ? `Demo verification code: ${code}`
                    : "Your new verification code is ready.",
                "success"
            );


            startCooldownTicker();


        } catch (error) {

            console.error(
                "OTP resend failed:",
                error
            );


            clearOtpCodeState();

            disableOtpBoxes(true);

            updateVerifyButton();


            showMessage(
                normalizeOtpError(
                    error
                ),
                "error"
            );


        } finally {

            if (
                channel === "phone"
            ) {

                phoneRequestInProgress =
                    false;

            } else {

                emailRequestInProgress =
                    false;
            }


            updateMethodButton(
                channel
            );
        }
    }


    /* =========================================================
       REARRANGE VERIFICATION ACTIONS
       =========================================================

       This fixes the existing HTML arrangement without
       modifying auth.css.

       Email button:
       bottom of card
             ↓
       Email verification card

       Phone button:
       stays inside phone card.
       ========================================================= */

    function rearrangeVerificationActions() {

        const methods =
            Array.from(
                document.querySelectorAll(
                    ".verification-method"
                )
            );


        if (!methods.length) {
            return;
        }


        const emailButton =
            getEmailButton();


        const phoneButton =
            getPhoneButton();


        let emailMethod =
            methods.find(
                method =>
                    /email/i.test(
                        method.textContent
                    )
            );


        let phoneMethod =
            methods.find(
                method =>
                    /phone/i.test(
                        method.textContent
                    )
            );


        if (
            !emailMethod &&
            methods[0]
        ) {

            emailMethod =
                methods[0];
        }


        if (
            !phoneMethod &&
            methods[1]
        ) {

            phoneMethod =
                methods[1];
        }


        /*
         * Move email action into email card.
         */

        if (
            emailButton &&
            emailMethod &&
            !emailMethod.contains(
                emailButton
            )
        ) {

            emailButton.classList.add(
                "verification-method-action"
            );

            emailMethod.appendChild(
                emailButton
            );


            /*
             * Hide the old bottom resend row
             * because the email action is now
             * correctly positioned.
             */

            const resendRow =
                emailButton.closest(
                    ".otp-resend"
                );


            if (resendRow) {

                resendRow.style.display =
                    "none";
            }
        }


        /*
         * Ensure phone button has the same
         * visual action class.
         */

        if (
            phoneButton
        ) {

            phoneButton.classList.add(
                "verification-method-action"
            );
        }
    }


    /* =========================================================
       CLICKABLE VERIFICATION CARDS
       ========================================================= */

    function getMethodChannel(
        method
    ) {

        if (
            method.querySelector(
                "#resendPhoneOtpBtn"
            ) ||
            method.querySelector(
                "[data-resend-phone-otp]"
            )
        ) {

            return "phone";
        }


        if (
            method.querySelector(
                "#resendEmailOtpBtn"
            ) ||
            method.querySelector(
                "[data-resend-email-otp]"
            )
        ) {

            return "email";
        }


        return /phone/i.test(
            method.textContent
        )
            ? "phone"
            : "email";
    }


    function setupMethodCards() {

        const methods =
            document.querySelectorAll(
                ".verification-method"
            );


        methods.forEach(
            method => {

                const channel =
                    getMethodChannel(
                        method
                    );


                method.setAttribute(
                    "role",
                    "button"
                );


                method.setAttribute(
                    "tabindex",
                    "0"
                );


                method.addEventListener(
                    "click",
                    event => {

                        /*
                         * Do not double-fire when
                         * clicking the actual button.
                         */

                        if (
                            event.target.closest(
                                "button, a"
                            )
                        ) {

                            return;
                        }


                        sendCode(
                            channel
                        );
                    }
                );


                method.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key !==
                                "Enter" &&
                            event.key !==
                                " "
                        ) {

                            return;
                        }


                        event.preventDefault();


                        sendCode(
                            channel
                        );
                    }
                );
            }
        );
    }


    /* =========================================================
       DISPLAY DESTINATIONS
       ========================================================= */

    function displayDestinations() {

        const state =
            getState();


        const emailStatus =
            getEmailStatusElement();


        const phoneStatus =
            getPhoneStatusElement();


        if (emailStatus) {

            emailStatus.textContent =
                state.email
                    ? `Registered email: ${maskEmail(state.email)}`
                    : "No Gmail address available";
        }


        if (phoneStatus) {

            phoneStatus.textContent =
                state.phone
                    ? `Registered phone: ${maskPhone(state.phone)}`
                    : "No phone number available";
        }
    }


    /* =========================================================
       ERROR NORMALIZATION
       ========================================================= */

    function normalizeOtpError(
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
                "username or gmail"
            )
        ) {

            return (
                "Username or Gmail is required. " +
                "Please return to registration and try again."
            );
        }


        if (
            message.includes(
                "invalid"
            ) &&
            (
                message.includes("otp") ||
                message.includes("code") ||
                message.includes("verification")
            )
        ) {

            return (
                "The verification code is incorrect or has expired."
            );
        }


        if (
            message.includes(
                "expired"
            )
        ) {

            return (
                "The verification code has expired. Please request a new code."
            );
        }


        if (
            message.includes(
                "too many"
            ) ||
            message.includes(
                "locked"
            )
        ) {

            return (
                "Too many verification attempts. Please wait and try again later."
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
                "server"
            )
        ) {

            return (
                "Unable to connect to the verification service. Please try again."
            );
        }


        return (
            raw ||
            "Something went wrong while preparing your verification code."
        );
    }


    /* =========================================================
       BUTTON SETUP
       ========================================================= */

    function setupButtons() {

        const form =
            getElement(
                "#otpForm"
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

                    event.stopPropagation();

                    sendCode(
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

                    event.stopPropagation();

                    sendCode(
                        "phone"
                    );
                }
            );
        }


        document
            .querySelectorAll(
                "[data-back-login]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            clearOtpStorage();
                        }
                    );
                }
            );
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    async function initialize() {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        if (
            currentPage ===
            "verify-otp.html"
        ) {

            window.location.replace(
                "verify.html"
            );

            return;
        }


        if (
            currentPage &&
            currentPage !==
                "verify.html"
        ) {

            return;
        }


        /*
         * IMPORTANT ORDER:
         *
         * 1. Rearrange UI
         * 2. Setup OTP
         * 3. Setup buttons
         * 4. Make cards clickable
         * 5. Display registration data
         * 6. Prepare OTP
         */

        rearrangeVerificationActions();

        setupOtpBoxes();

        setupButtons();

        setupMethodCards();

        displayDestinations();

        updateCooldownUI();


        if (
            !hasVerificationState()
        ) {

            disableOtpBoxes(true);

            updateVerifyButton();


            showMessage(
                "Username or Gmail is required. Please return to registration and try again.",
                "error"
            );


            return;
        }


        /*
         * If an OTP is already ready in the
         * current verification session,
         * don't unnecessarily generate another one.
         */

        const state =
            getState();


        if (
            state.codeReady &&
            state.code.length ===
                OTP_LENGTH
        ) {

            displayGeneratedCode(
                state.code
            );

            startCooldownTicker();

            return;
        }


        /*
         * First OTP generation.
         */

        await prepareOtp(
            state.channel ||
            "email"
        );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.StockFlowOTP = {

        verify:
            verifyOtp,

        resend:
            sendCode,

        prepare:
            prepareOtp,

        sanitize:
            sanitizeOtp,

        getState:
            getState,

        maskEmail:
            maskEmail,

        maskPhone:
            maskPhone,

        clear:
            clearOtpStorage
    };


    window.OTP =
        window.StockFlowOTP;


    /* =========================================================
       DOM READY
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
