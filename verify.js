/* =========================================================
   STOCKFLOW — VERIFY ACCOUNT
   verify.js

   FINAL OTP FLOW:

   REGISTER
      ↓
   verify.html opens
      ↓
   Load pending registration state
      ↓
   Backend generates OTP
      ↓
   Backend sends OTP by email
      ↓
   Email cooldown starts automatically
      ↓
   User manually enters OTP
      ↓
   User clicks Verify Account
      ↓
   Apps Script verifies OTP
      ↓
   Save VERIFIED session
      ↓
   dashboard.html

   IMPORTANT:
   - Browser NEVER generates OTP.
   - Browser NEVER auto-fills OTP.
   - Browser NEVER reads OTP from backend response.
   - No Math.random() is used.
   - Initial OTP is requested automatically.
   - Initial channel is EMAIL.
   - Email Send Code starts with cooldown automatically.
   - Phone Send Code has its own independent cooldown.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};


    const AUTH_CONFIG =
        CONFIG.AUTH ||
        {};


    const ROUTES =
        CONFIG.ROUTES ||
        {};


    const API =
        window.StockFlowAPI ||
        window.API ||
        null;


    const REGISTER_ROUTE =
        ROUTES.REGISTER ||
        "auth.html#register";


    const DASHBOARD_ROUTE =
        ROUTES.DASHBOARD ||
        "dashboard.html";


    const OTP_LENGTH =
        Number(
            AUTH_CONFIG.OTP_LENGTH ||
            CONFIG.OTP_LENGTH ||
            6
        );


    const RESEND_COOLDOWN =
        Number(
            AUTH_CONFIG.OTP_RESEND_COOLDOWN_SECONDS ||
            CONFIG.OTP_RESEND_COOLDOWN_SECONDS ||
            120
        );


    /* =====================================================
       STORAGE KEYS
       ===================================================== */

    const STORAGE_KEYS = {

        verification:
            "STOCKFLOW_VERIFICATION_STATE",

        uid:
            AUTH_CONFIG.OTP_UID_KEY ||
            "STOCKFLOW_OTP_UID",

        email:
            AUTH_CONFIG.OTP_EMAIL_KEY ||
            "STOCKFLOW_OTP_EMAIL",

        phone:
            AUTH_CONFIG.OTP_PHONE_KEY ||
            "STOCKFLOW_OTP_PHONE",

        username:
            AUTH_CONFIG.OTP_USERNAME_KEY ||
            "STOCKFLOW_OTP_USERNAME",

        identity:
            AUTH_CONFIG.OTP_IDENTITY_KEY ||
            "STOCKFLOW_OTP_IDENTITY",

        channel:
            AUTH_CONFIG.OTP_CHANNEL_KEY ||
            "STOCKFLOW_OTP_CHANNEL",

        user:
            AUTH_CONFIG.USER_KEY ||
            "STOCKFLOW_USER",

        session:
            AUTH_CONFIG.SESSION_KEY ||
            "STOCKFLOW_SESSION"
    };


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const verifyForm =
        document.getElementById(
            "verifyForm"
        );


    const verifyButton =
        document.getElementById(
            "verifyOtpBtn"
        ) ||
        document.getElementById(
            "verifyButton"
        );


    const verifyMessage =
        document.getElementById(
            "otpMessage"
        ) ||
        document.getElementById(
            "verifyMessage"
        );


    const verificationDescription =
        document.getElementById(
            "verificationDescription"
        );


    const emailMethod =
        document.getElementById(
            "emailMethod"
        );


    const phoneMethod =
        document.getElementById(
            "phoneMethod"
        );


    const emailButton =
        document.getElementById(
            "sendEmailCode"
        );


    const phoneButton =
        document.getElementById(
            "sendPhoneCode"
        );


    const emailDeliveryStatus =
        document.getElementById(
            "emailDeliveryStatus"
        );


    const phoneDeliveryStatus =
        document.getElementById(
            "phoneDeliveryStatus"
        );


    const emailTimer =
        document.getElementById(
            "emailOtpTimer"
        ) ||
        document.getElementById(
            "emailCountdown"
        );


    const phoneTimer =
        document.getElementById(
            "phoneOtpTimer"
        ) ||
        document.getElementById(
            "phoneCountdown"
        );


    const destination =
        document.getElementById(
            "otpDestination"
        ) ||
        document.getElementById(
            "verifyDestination"
        );


    const otpHidden =
        document.getElementById(
            "otp"
        );


    const otpHelp =
        document.getElementById(
            "otpHelp"
        );


    const otpBoxes =
        Array.from(
            document.querySelectorAll(
                "#otpInputs .otp-digit"
            )
        );


    /* =====================================================
       BASIC CHECKS
       ===================================================== */

    if (!verifyForm) {

        console.error(
            "[STOCKFLOW VERIFY] verifyForm was not found."
        );

        return;
    }


    if (!API) {

        console.error(
            "[STOCKFLOW VERIFY] StockFlow API is not available."
        );


        showMessage(
            "The verification system is not available right now. Please refresh the page.",
            "error"
        );


        return;
    }


    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        uid: "",

        identity: "",

        username: "",

        name: "",

        gmail: "",

        email: "",

        phone: "",

        role: "",

        accountStatus: "",

        channel: "email",

        requesting: false,

        verifying: false,

        otpReady: false,

        cooldowns: {

            email: 0,

            phone: 0
        }
    };


    const timers = {

        email: null,

        phone: null
    };


    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    function readStorage(key) {

        let value = "";


        try {

            value =
                sessionStorage.getItem(
                    key
                ) || "";

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] sessionStorage read failed:",
                error
            );
        }


        if (value) {

            return value;
        }


        try {

            value =
                localStorage.getItem(
                    key
                ) || "";

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] localStorage read failed:",
                error
            );
        }


        return value;
    }


    function writeSession(
        key,
        value
    ) {

        try {

            sessionStorage.setItem(
                key,
                value
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] sessionStorage write failed:",
                error
            );
        }
    }


    function writeBoth(
        key,
        value
    ) {

        try {

            sessionStorage.setItem(
                key,
                value
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] sessionStorage write failed:",
                error
            );
        }


        try {

            localStorage.setItem(
                key,
                value
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] localStorage write failed:",
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
                "[STOCKFLOW VERIFY] sessionStorage remove failed:",
                error
            );
        }


        try {

            localStorage.removeItem(
                key
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] localStorage remove failed:",
                error
            );
        }
    }


    /* =====================================================
       LOAD VERIFICATION STATE
       ===================================================== */

    function loadVerificationState() {

        let loaded = false;


        /* -------------------------------------------------
           1. Unified verification state
           ------------------------------------------------- */

        try {

            const raw =
                readStorage(
                    STORAGE_KEYS.verification
                );


            if (raw) {

                const saved =
                    JSON.parse(
                        raw
                    );


                if (
                    saved &&
                    typeof saved === "object"
                ) {

                    state.uid =
                        saved.uid ||
                        state.uid;


                    state.identity =
                        saved.identity ||
                        state.identity;


                    state.username =
                        saved.username ||
                        state.username;


                    state.name =
                        saved.name ||
                        state.name;


                    state.gmail =
                        saved.gmail ||
                        state.gmail;


                    state.email =
                        saved.email ||
                        state.email;


                    state.phone =
                        saved.phone ||
                        state.phone;


                    state.role =
                        saved.role ||
                        state.role;


                    state.accountStatus =
                        saved.accountStatus ||
                        state.accountStatus;


                    state.channel =
                        saved.channel ||
                        state.channel;


                    loaded = true;
                }
            }

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] Invalid verification state:",
                error
            );
        }


        /* -------------------------------------------------
           2. Compatibility keys
           ------------------------------------------------- */

        const storedUid =
            readStorage(
                STORAGE_KEYS.uid
            );


        const storedEmail =
            readStorage(
                STORAGE_KEYS.email
            );


        const storedPhone =
            readStorage(
                STORAGE_KEYS.phone
            );


        const storedUsername =
            readStorage(
                STORAGE_KEYS.username
            );


        const storedIdentity =
            readStorage(
                STORAGE_KEYS.identity
            );


        const storedChannel =
            readStorage(
                STORAGE_KEYS.channel
            );


        if (storedUid) {

            state.uid =
                state.uid ||
                storedUid;

            loaded = true;
        }


        if (storedEmail) {

            state.email =
                state.email ||
                storedEmail;

            state.gmail =
                state.gmail ||
                storedEmail;

            loaded = true;
        }


        if (storedPhone) {

            state.phone =
                state.phone ||
                storedPhone;

            loaded = true;
        }


        if (storedUsername) {

            state.username =
                state.username ||
                storedUsername;

            loaded = true;
        }


        if (storedIdentity) {

            state.identity =
                state.identity ||
                storedIdentity;

            loaded = true;
        }


        if (storedChannel) {

            state.channel =
                storedChannel;
        }


        /* -------------------------------------------------
           3. Stored user compatibility
           ------------------------------------------------- */

        try {

            const rawUser =
                readStorage(
                    STORAGE_KEYS.user
                );


            if (rawUser) {

                const user =
                    JSON.parse(
                        rawUser
                    );


                if (
                    user &&
                    typeof user === "object"
                ) {

                    state.uid =
                        state.uid ||
                        user.uid ||
                        user.UID ||
                        "";


                    state.username =
                        state.username ||
                        user.username ||
                        user.USERNAME ||
                        "";


                    state.name =
                        state.name ||
                        user.name ||
                        user.NAME ||
                        "";


                    state.email =
                        state.email ||
                        user.email ||
                        user.gmail ||
                        user.GMAIL ||
                        "";


                    state.gmail =
                        state.gmail ||
                        user.gmail ||
                        user.email ||
                        user.GMAIL ||
                        "";


                    state.phone =
                        state.phone ||
                        user.phone ||
                        user.phoneNumber ||
                        user["PHONE NO."] ||
                        "";


                    state.role =
                        state.role ||
                        user.role ||
                        user.ROLE ||
                        "";


                    state.accountStatus =
                        state.accountStatus ||
                        user.accountStatus ||
                        user.ACCOUNT_S ||
                        "";


                    state.identity =
                        state.identity ||
                        user.identity ||
                        user.username ||
                        user.email ||
                        user.gmail ||
                        user.uid ||
                        "";


                    if (
                        state.identity ||
                        state.uid
                    ) {

                        loaded = true;
                    }
                }
            }

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] Unable to read stored user:",
                error
            );
        }


        /* -------------------------------------------------
           4. Derive missing identity
           ------------------------------------------------- */

        if (!state.identity) {

            state.identity =
                state.uid ||
                state.username ||
                state.email ||
                state.gmail ||
                state.phone ||
                "";
        }


        /* -------------------------------------------------
           5. Normalize email/gmail
           ------------------------------------------------- */

        if (!state.email) {

            state.email =
                state.gmail ||
                "";
        }


        if (!state.gmail) {

            state.gmail =
                state.email ||
                "";
        }


        /* -------------------------------------------------
           6. Save normalized state
           ------------------------------------------------- */

        if (
            loaded &&
            (
                state.identity ||
                state.uid
            )
        ) {

            saveVerificationState();
        }


        return Boolean(
            state.identity ||
            state.uid ||
            state.username ||
            state.email ||
            state.phone
        );
    }


    /* =====================================================
       SAVE VERIFICATION STATE
       ===================================================== */

    function saveVerificationState() {

        const verificationState = {

            uid:
                state.uid,

            identity:
                state.identity,

            username:
                state.username,

            name:
                state.name,

            gmail:
                state.gmail,

            email:
                state.email,

            phone:
                state.phone,

            role:
                state.role,

            accountStatus:
                state.accountStatus,

            channel:
                state.channel
        };


        try {

            writeSession(
                STORAGE_KEYS.verification,
                JSON.stringify(
                    verificationState
                )
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] Unable to save verification state:",
                error
            );
        }
    }


    /* =====================================================
       MESSAGE
       ===================================================== */

    function showMessage(
        text,
        type = "info"
    ) {

        const finalText =
            String(
                text || ""
            ).trim();


        if (!verifyMessage) {

            console.log(
                "[STOCKFLOW VERIFY]",
                finalText
            );

            return;
        }


        verifyMessage.textContent =
            finalText;


        verifyMessage.classList.remove(
            "success",
            "error",
            "info",
            "warning"
        );


        if (finalText) {

            verifyMessage.classList.add(
                type
            );

            verifyMessage.hidden =
                false;

        } else {

            verifyMessage.hidden =
                true;
        }
    }


    function clearMessage() {

        showMessage("");
    }


    /* =====================================================
       MASK EMAIL
       ===================================================== */

    function maskEmail(email) {

        const value =
            String(
                email || ""
            ).trim();


        const parts =
            value.split("@");


        if (
            parts.length !== 2
        ) {

            return value;
        }


        const name =
            parts[0];


        const domain =
            parts[1];


        if (
            name.length <= 2
        ) {

            return (
                name.charAt(0) +
                "*" +
                "@" +
                domain
            );
        }


        return (
            name.substring(
                0,
                2
            ) +
            "*".repeat(
                Math.max(
                    2,
                    name.length - 2
                )
            ) +
            "@" +
            domain
        );
    }


    /* =====================================================
       MASK PHONE
       ===================================================== */

    function maskPhone(phone) {

        const value =
            String(
                phone || ""
            ).replace(
                /\s+/g,
                ""
            );


        if (
            value.length < 7
        ) {

            return value;
        }


        return (
            value.substring(
                0,
                3
            ) +
            "****" +
            value.substring(
                value.length - 3
            )
        );
    }


    /* =====================================================
       UPDATE DESTINATION
       ===================================================== */

    function updateDestination() {

        if (!destination) {

            return;
        }


        if (
            state.channel === "phone"
        ) {

            destination.textContent =
                state.phone
                    ? maskPhone(
                        state.phone
                    )
                    : "your registered phone number";


            return;
        }


        const email =
            state.gmail ||
            state.email ||
            "";


        destination.textContent =
            email
                ? maskEmail(
                    email
                )
                : "your registered Gmail";
    }


    /* =====================================================
       CHANNEL SELECTION
       ===================================================== */

    function selectChannel(
        channel
    ) {

        state.channel =
            channel === "phone"
                ? "phone"
                : "email";


        if (emailMethod) {

            emailMethod.classList.toggle(
                "active",
                state.channel === "email"
            );
        }


        if (phoneMethod) {

            phoneMethod.classList.toggle(
                "active",
                state.channel === "phone"
            );
        }


        updateDestination();
    }


    if (emailMethod) {

        emailMethod.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        "button"
                    )
                ) {

                    return;
                }


                selectChannel(
                    "email"
                );
            }
        );
    }


    if (phoneMethod) {

        phoneMethod.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        "button"
                    )
                ) {

                    return;
                }


                selectChannel(
                    "phone"
                );
            }
        );
    }


    /* =====================================================
       OTP INPUT
       ===================================================== */

    function clearOtp() {

        otpBoxes.forEach(
            input => {

                input.value =
                    "";
            }
        );


        if (otpHidden) {

            otpHidden.value =
                "";
        }
    }


    function getOtp() {

        return otpBoxes
            .map(
                input =>
                    String(
                        input.value || ""
                    )
                        .replace(
                            /\D/g,
                            ""
                        )
                        .charAt(0)
            )
            .join("")
            .substring(
                0,
                OTP_LENGTH
            );
    }


    function updateHiddenOtp() {

        if (!otpHidden) {

            return;
        }


        otpHidden.value =
            getOtp();
    }


    /* =====================================================
       OTP INPUT EVENTS
       ===================================================== */

    otpBoxes.forEach(
        (
            input,
            index
        ) => {

            /*
             * OTP fields are manually entered.
             *
             * They are NEVER populated from the
             * backend response.
             */

            input.disabled =
                false;


            input.autocomplete =
                index === 0
                    ? "one-time-code"
                    : "off";


            input.inputMode =
                "numeric";


            input.maxLength =
                1;


            input.addEventListener(
                "input",
                event => {

                    const value =
                        String(
                            event.target.value ||
                            ""
                        )
                            .replace(
                                /\D/g,
                                ""
                            )
                            .charAt(0);


                    event.target.value =
                        value;


                    updateHiddenOtp();


                    if (
                        value &&
                        index <
                        otpBoxes.length - 1
                    ) {

                        otpBoxes[
                            index + 1
                        ].focus();
                    }


                    if (
                        getOtp().length ===
                        OTP_LENGTH
                    ) {

                        if (verifyButton) {

                            verifyButton.disabled =
                                false;
                        }
                    } else {

                        if (
                            verifyButton &&
                            !state.verifying
                        ) {

                            verifyButton.disabled =
                                false;
                        }
                    }
                }
            );


            input.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Backspace" &&
                        !input.value &&
                        index > 0
                    ) {

                        otpBoxes[
                            index - 1
                        ].focus();

                        return;
                    }


                    if (
                        event.key ===
                        "ArrowLeft" &&
                        index > 0
                    ) {

                        otpBoxes[
                            index - 1
                        ].focus();

                        return;
                    }


                    if (
                        event.key ===
                        "ArrowRight" &&
                        index <
                        otpBoxes.length - 1
                    ) {

                        otpBoxes[
                            index + 1
                        ].focus();

                        return;
                    }
                }
            );


            input.addEventListener(
                "paste",
                event => {

                    event.preventDefault();


                    const pasted =
                        (
                            event.clipboardData ||
                            window.clipboardData
                        )
                            .getData(
                                "text"
                            )
                            .replace(
                                /\D/g,
                                ""
                            )
                            .substring(
                                0,
                                OTP_LENGTH
                            );


                    if (!pasted) {

                        return;
                    }


                    pasted
                        .split("")
                        .forEach(
                            (
                                digit,
                                offset
                            ) => {

                                const targetIndex =
                                    index +
                                    offset;


                                if (
                                    targetIndex <
                                    otpBoxes.length
                                ) {

                                    otpBoxes[
                                        targetIndex
                                    ].value =
                                        digit;
                                }
                            }
                        );


                    updateHiddenOtp();


                    const nextIndex =
                        Math.min(
                            index +
                            pasted.length,
                            otpBoxes.length - 1
                        );


                    if (
                        otpBoxes[nextIndex]
                    ) {

                        otpBoxes[
                            nextIndex
                        ].focus();
                    }


                    if (
                        getOtp().length ===
                        OTP_LENGTH &&
                        verifyButton
                    ) {

                        verifyButton.disabled =
                            false;
                    }
                }
            );
        }
    );


    /* =====================================================
       BUTTON TEXT
       ===================================================== */

    function setButtonText(
        button,
        text
    ) {

        if (!button) {

            return;
        }


        /*
         * Preserve HTML structure where possible.
         */

        const textElement =
            button.querySelector(
                ".button-text"
            );


        if (textElement) {

            textElement.textContent =
                text;

            return;
        }


        button.textContent =
            text;
    }


    /* =====================================================
       UPDATE STATE FROM BACKEND RESPONSE
       ===================================================== */

    function updateStateFromResponse(
        response
    ) {

        if (!response) {

            return;
        }


        /*
         * IMPORTANT:
         *
         * We intentionally DO NOT read:
         *
         * response.otp
         * response.codeValue
         * response.verificationCode
         *
         * The frontend must never obtain or auto-fill
         * the actual verification code.
         */

        state.uid =
            response.uid ||
            state.uid;


        state.username =
            response.username ||
            state.username;


        state.name =
            response.name ||
            state.name;


        state.gmail =
            response.gmail ||
            response.email ||
            state.gmail;


        state.email =
            response.email ||
            response.gmail ||
            state.email;


        state.phone =
            response.phone ||
            state.phone;


        state.role =
            response.role ||
            state.role;


        state.accountStatus =
            response.accountStatus ||
            state.accountStatus;


        state.identity =
            response.identity ||
            state.identity;


        state.channel =
            response.channel ||
            state.channel;


        if (!state.identity) {

            state.identity =
                state.uid ||
                state.username ||
                state.email ||
                state.phone ||
                "";
        }


        saveVerificationState();


        updateDestination();
    }


    /* =====================================================
       COOLDOWN FORMAT
       ===================================================== */

    function formatCountdown(
        seconds
    ) {

        const value =
            Math.max(
                0,
                Number(
                    seconds
                ) || 0
            );


        const minutes =
            Math.floor(
                value / 60
            );


        const secondsLeft =
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
                secondsLeft
            ).padStart(
                2,
                "0"
            )
        );
    }


    /* =====================================================
       UPDATE COOLDOWN UI
       ===================================================== */

    function updateCooldownUI(
        channel
    ) {

        const seconds =
            Math.max(
                0,
                Number(
                    state.cooldowns[
                        channel
                    ] || 0
                )
            );


        const button =
            channel === "email"
                ? emailButton
                : phoneButton;


        const timer =
            channel === "email"
                ? emailTimer
                : phoneTimer;


        if (button) {

            /*
             * Only the SAME channel is disabled
             * by its cooldown.
             *
             * Requesting another channel does not
             * disable the other channel's cooldown.
             */

            button.disabled =
                seconds > 0 ||
                (
                    state.requesting &&
                    state.requestingChannel ===
                    channel
                );
        }


        if (timer) {

            if (
                seconds > 0
            ) {

                timer.textContent =
                    (
                        channel === "email"
                            ? "Email code available in "
                            : "Phone code available in "
                    ) +
                    formatCountdown(
                        seconds
                    );

            } else {

                timer.textContent =
                    channel === "email"
                        ? "Email code available."
                        : "Phone code available.";
            }
        }
    }


    /* =====================================================
       STOP COOLDOWN
       ===================================================== */

    function stopCooldown(
        channel
    ) {

        if (
            timers[channel]
        ) {

            clearInterval(
                timers[channel]
            );


            timers[channel] =
                null;
        }


        state.cooldowns[
            channel
        ] = 0;


        updateCooldownUI(
            channel
        );
    }


    /* =====================================================
       START COOLDOWN
       ===================================================== */

    function startCooldown(
        channel,
        seconds
    ) {

        stopCooldown(
            channel
        );


        const duration =
            Math.max(
                0,
                Number(
                    seconds
                ) ||
                RESEND_COOLDOWN
            );


        state.cooldowns[
            channel
        ] =
            duration;


        updateCooldownUI(
            channel
        );


        if (
            duration <= 0
        ) {

            return;
        }


        timers[channel] =
            setInterval(
                () => {

                    state.cooldowns[
                        channel
                    ] -= 1;


                    if (
                        state.cooldowns[
                            channel
                        ] <= 0
                    ) {

                        stopCooldown(
                            channel
                        );


                        return;
                    }


                    updateCooldownUI(
                        channel
                    );

                },
                1000
            );
    }


    /* =====================================================
       INITIAL OTP REQUEST
       ===================================================== */

    async function prepareInitialOtp() {

        if (
            state.requesting
        ) {

            return;
        }


        if (
            !state.identity &&
            !state.uid &&
            !state.username &&
            !state.email &&
            !state.phone
        ) {

            showMessage(
                "No pending registration account was found. Please register first.",
                "error"
            );


            window.setTimeout(
                () => {

                    window.location.href =
                        REGISTER_ROUTE;

                },
                1500
            );


            return;
        }


        state.requesting =
            true;


        state.requestingChannel =
            "email";


        clearMessage();


        /*
         * Initial OTP is always sent through EMAIL.
         *
         * The user can later choose PHONE manually.
         */

        selectChannel(
            "email"
        );


        try {

            if (verificationDescription) {

                verificationDescription.textContent =
                    "Sending your verification code...";
            }


            const response =
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
                        "email",

                    otpChannel:
                        "email"
                });


            console.log(
                "[STOCKFLOW VERIFY] Initial OTP response:",
                response
            );


            updateStateFromResponse(
                response
            );


            if (
                response &&
                response.success === true
            ) {

                state.otpReady =
                    response.otpReady !== false;


                const cooldown =
                    Number(
                        response.cooldownSeconds
                    ) ||
                    RESEND_COOLDOWN;


                /*
                 * IMPORTANT:
                 *
                 * Initial email request automatically
                 * starts EMAIL cooldown.
                 *
                 * PHONE cooldown remains 0.
                 */

                startCooldown(
                    "email",
                    cooldown
                );


                if (emailDeliveryStatus) {

                    emailDeliveryStatus.textContent =
                        response.message ||
                        "A verification code was sent to your email.";
                }


                if (verificationDescription) {

                    verificationDescription.textContent =
                        "Enter the verification code sent to your email.";
                }


                if (otpHelp) {

                    otpHelp.textContent =
                        "Check your Gmail inbox for the 6-digit verification code.";
                }


                showMessage(
                    response.message ||
                    "A verification code was sent to your email.",
                    "success"
                );


                /*
                 * NEVER:
                 *
                 * - read response.otp
                 * - save response.otp
                 * - display response.otp
                 * - auto-fill response.otp
                 *
                 * The user must manually enter the code
                 * received by email.
                 */

                clearOtp();


                return;
            }


            handleResponseError(
                response
            );

        } catch (error) {

            handleError(
                error
            );

        } finally {

            state.requesting =
                false;


            state.requestingChannel =
                "";


            updateCooldownUI(
                "email"
            );


            updateCooldownUI(
                "phone"
            );
        }
    }


    /* =====================================================
       REQUEST OTP
       ===================================================== */

    async function requestOtp(
        channel
    ) {

        const selected =
            channel === "phone"
                ? "phone"
                : "email";


        selectChannel(
            selected
        );


        if (
            state.requesting
        ) {

            return;
        }


        if (
            state.cooldowns[
                selected
            ] > 0
        ) {

            showMessage(
                "Please wait " +
                state.cooldowns[
                    selected
                ] +
                " seconds before requesting another " +
                selected +
                " code.",
                "warning"
            );


            return;
        }


        /*
         * Required destination.
         */

        if (
            selected === "email" &&
            !state.email &&
            !state.gmail
        ) {

            showMessage(
                "No registered Gmail address was found for this account.",
                "error"
            );


            return;
        }


        if (
            selected === "phone" &&
            !state.phone
        ) {

            showMessage(
                "No registered phone number was found for this account.",
                "error"
            );


            return;
        }


        state.requesting =
            true;


        state.requestingChannel =
            selected;


        clearMessage();


        /*
         * Keep OTP boxes empty when requesting
         * a new code.
         */

        clearOtp();


        const button =
            selected === "email"
                ? emailButton
                : phoneButton;


        const originalButtonText =
            selected === "email"
                ? "Send code by email"
                : "Send code by phone";


        if (button) {

            button.disabled =
                true;


            setButtonText(
                button,
                "Sending code..."
            );
        }


        try {

            const response =
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
                        selected,

                    otpChannel:
                        selected
                });


            console.log(
                "[STOCKFLOW VERIFY] OTP request response:",
                response
            );


            updateStateFromResponse(
                response
            );


            if (
                response &&
                response.success === true
            ) {

                state.channel =
                    response.channel ||
                    selected;


                state.otpReady =
                    response.otpReady !== false;


                const cooldown =
                    Number(
                        response.cooldownSeconds
                    ) ||
                    RESEND_COOLDOWN;


                /*
                 * ONLY the selected channel
                 * receives a cooldown.
                 */

                startCooldown(
                    selected,
                    cooldown
                );


                if (
                    selected === "email"
                ) {

                    if (emailDeliveryStatus) {

                        emailDeliveryStatus.textContent =
                            response.message ||
                            "A new verification code was sent to your email.";
                    }

                } else {

                    if (phoneDeliveryStatus) {

                        phoneDeliveryStatus.textContent =
                            response.message ||
                            "A new verification code was sent to your phone.";
                    }
                }


                if (verificationDescription) {

                    verificationDescription.textContent =
                        selected === "email"
                            ? "Enter the verification code sent to your email."
                            : "Enter the verification code sent to your phone.";
                }


                if (otpHelp) {

                    otpHelp.textContent =
                        selected === "email"
                            ? "Check your Gmail inbox for the 6-digit verification code."
                            : "Check your phone for the 6-digit verification code.";
                }


                showMessage(
                    response.message ||
                    (
                        selected === "email"
                            ? "A new verification code was sent to your email."
                            : "A new verification code was sent to your phone."
                    ),
                    "success"
                );


                /*
                 * IMPORTANT:
                 *
                 * The backend may return an OTP when
                 * DEMO_MODE is enabled.
                 *
                 * This frontend deliberately ignores it.
                 *
                 * No auto-fill.
                 * No OTP display.
                 * No OTP storage.
                 */

                clearOtp();


                return;
            }


            handleResponseError(
                response
            );

        } catch (error) {

            handleError(
                error
            );

        } finally {

            state.requesting =
                false;


            state.requestingChannel =
                "";


            if (button) {

                setButtonText(
                    button,
                    originalButtonText
                );
            }


            updateCooldownUI(
                "email"
            );


            updateCooldownUI(
                "phone"
            );
        }
    }


    /* =====================================================
       EMAIL BUTTON
       ===================================================== */

    if (emailButton) {

        emailButton.addEventListener(
            "click",
            event => {

                event.preventDefault();


                requestOtp(
                    "email"
                );
            }
        );
    }


    /* =====================================================
       PHONE BUTTON
       ===================================================== */

    if (phoneButton) {

        phoneButton.addEventListener(
            "click",
            event => {

                event.preventDefault();


                requestOtp(
                    "phone"
                );
            }
        );
    }


    /* =====================================================
       VERIFY ACCOUNT
       ===================================================== */

    verifyForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (
                state.verifying
            ) {

                return;
            }


            clearMessage();


            const otp =
                getOtp();


            if (
                otp.length !== OTP_LENGTH
            ) {

                showMessage(
                    "Please enter the complete 6-digit verification code.",
                    "error"
                );


                return;
            }


            if (
                !state.identity &&
                !state.uid &&
                !state.username &&
                !state.email &&
                !state.phone
            ) {

                showMessage(
                    "The pending account information is missing. Please register again.",
                    "error"
                );


                return;
            }


            state.verifying =
                true;


            if (verifyButton) {

                verifyButton.disabled =
                    true;


                setButtonText(
                    verifyButton,
                    "Verifying..."
                );
            }


            try {

                const response =
                    await API.verifyOtp({

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


                console.log(
                    "[STOCKFLOW VERIFY] Verification response:",
                    response
                );


                if (
                    response &&
                    response.success === true
                ) {

                    /*
                     * Backend has confirmed the OTP.
                     */

                    updateStateFromResponse(
                        response
                    );


                    saveVerifiedSession(
                        response
                    );


                    state.otpReady =
                        false;


                    clearOtp();


                    showMessage(
                        response.message ||
                        "Account verified successfully.",
                        "success"
                    );


                    /*
                     * Remove temporary verification
                     * state after successful verification.
                     */

                    clearVerificationState();


                    const redirect =
                        response.redirect ||
                        DASHBOARD_ROUTE;


                    console.log(
                        "[STOCKFLOW VERIFY] Redirecting to dashboard:",
                        redirect
                    );


                    window.setTimeout(
                        () => {

                            window.location.href =
                                redirect;

                        },
                        700
                    );


                    return;
                }


                handleResponseError(
                    response
                );

            } catch (error) {

                handleError(
                    error
                );

            } finally {

                state.verifying =
                    false;


                if (
                    verifyButton
                ) {

                    verifyButton.disabled =
                        false;


                    setButtonText(
                        verifyButton,
                        "Verify Account"
                    );
                }
            }
        }
    );


    /* =====================================================
       SAVE VERIFIED SESSION
       ===================================================== */

    function saveVerifiedSession(
        response
    ) {

        const user = {

            uid:
                response?.uid ||
                state.uid,

            username:
                response?.username ||
                state.username,

            name:
                response?.name ||
                state.name,

            gmail:
                response?.gmail ||
                response?.email ||
                state.gmail,

            email:
                response?.email ||
                response?.gmail ||
                state.email,

            phone:
                response?.phone ||
                state.phone,

            role:
                response?.role ||
                state.role ||
                "Employee",

            verified:
                true,

            accountStatus:
                response?.accountStatus ||
                "ACTIVE"
        };


        const auth = {

            authenticated:
                true,

            verified:
                true,

            uid:
                user.uid,

            username:
                user.username,

            role:
                user.role,

            accountStatus:
                user.accountStatus,

            loginTime:
                new Date().toISOString()
        };


        try {

            sessionStorage.setItem(
                "STOCKFLOW_USER",
                JSON.stringify(
                    user
                )
            );


            sessionStorage.setItem(
                "STOCKFLOW_AUTH",
                JSON.stringify(
                    auth
                )
            );


            localStorage.setItem(
                "STOCKFLOW_USER",
                JSON.stringify(
                    user
                )
            );


            localStorage.setItem(
                "STOCKFLOW_AUTH",
                JSON.stringify(
                    auth
                )
            );


            /*
             * Dashboard compatibility.
             */

            localStorage.setItem(
                "STOCKFLOW_TOKEN",
                JSON.stringify(
                    user
                )
            );


            console.log(
                "[STOCKFLOW VERIFY] Verified session saved."
            );

        } catch (error) {

            console.error(
                "[STOCKFLOW VERIFY] Unable to save verified session:",
                error
            );
        }
    }


    /* =====================================================
       CLEAR VERIFICATION STATE
       ===================================================== */

    function clearVerificationState() {

        /*
         * Remove ONLY the temporary verification state.
         *
         * Do NOT remove:
         *
         * STOCKFLOW_USER
         * STOCKFLOW_AUTH
         * STOCKFLOW_TOKEN
         *
         * because dashboard.html needs them.
         */

        removeStorage(
            STORAGE_KEYS.verification
        );


        /*
         * Also clean old temporary OTP compatibility
         * values.
         *
         * These do NOT contain the actual OTP.
         */

        removeStorage(
            STORAGE_KEYS.uid
        );


        removeStorage(
            STORAGE_KEYS.email
        );


        removeStorage(
            STORAGE_KEYS.phone
        );


        removeStorage(
            STORAGE_KEYS.username
        );


        removeStorage(
            STORAGE_KEYS.identity
        );


        removeStorage(
            STORAGE_KEYS.channel
        );
    }


    /* =====================================================
       RESPONSE ERROR HANDLING
       ===================================================== */

    function handleResponseError(
        response
    ) {

        if (!response) {

            showMessage(
                "No response was received from the verification system.",
                "error"
            );


            return;
        }


        const code =
            String(
                response.code ||
                ""
            ).toUpperCase();


        const message =
            String(
                response.message ||
                ""
            ).trim();


        switch (code) {

            /* =================================================
               ACCOUNT NOT FOUND
               ================================================= */

            case "ACCOUNT_NOT_FOUND":

                showMessage(
                    "Account does not exist.",
                    "error"
                );

                break;


            /* =================================================
               ALREADY VERIFIED
               ================================================= */

            case "ALREADY_VERIFIED":

                showMessage(
                    "This account is already verified.",
                    "success"
                );


                saveVerifiedSession(
                    response
                );


                clearVerificationState();


                window.setTimeout(
                    () => {

                        window.location.href =
                            DASHBOARD_ROUTE;

                    },
                    700
                );

                break;


            /* =================================================
               OTP EXPIRED
               ================================================= */

            case "OTP_EXPIRED":

                clearOtp();


                showMessage(
                    "The verification code has expired. Please request a new code.",
                    "error"
                );

                break;


            /* =================================================
               OTP NOT READY
               ================================================= */

            case "OTP_NOT_READY":

                clearOtp();


                showMessage(
                    "No active verification code was found. Please request a new code.",
                    "error"
                );

                break;


            /* =================================================
               INVALID OTP
               ================================================= */

            case "INVALID_OTP":

                showMessage(
                    message ||
                    "Incorrect verification code. Please try again.",
                    "error"
                );

                break;


            /* =================================================
               INVALID OTP FORMAT
               ================================================= */

            case "INVALID_OTP_FORMAT":

                showMessage(
                    "Please enter the complete 6-digit verification code.",
                    "error"
                );

                break;


            /* =================================================
               OTP LOCKED
               ================================================= */

            case "OTP_LOCKED":

                showMessage(
                    message ||
                    "Too many incorrect attempts. Verification is temporarily locked.",
                    "error"
                );


                disableOtpInputs(
                    true
                );

                break;


            /* =================================================
               OTP COOLDOWN
               ================================================= */

            case "OTP_COOLDOWN":

                showMessage(
                    message ||
                    "Please wait before requesting another code.",
                    "warning"
                );


                if (
                    response.channel
                ) {

                    startCooldown(
                        response.channel,
                        Number(
                            response.cooldownSeconds
                        ) ||
                        RESEND_COOLDOWN
                    );
                }

                break;


            /* =================================================
               ACCOUNT DISABLED
               ================================================= */

            case "ACCOUNT_DISABLED":

                showMessage(
                    "This account is disabled.",
                    "error"
                );

                break;


            /* =================================================
               ACCOUNT SUSPENDED
               ================================================= */

            case "ACCOUNT_SUSPENDED":

                showMessage(
                    "This account is suspended.",
                    "error"
                );

                break;


            /* =================================================
               ACCOUNT BLOCKED
               ================================================= */

            case "ACCOUNT_BLOCKED":

                showMessage(
                    "This account is blocked.",
                    "error"
                );

                break;


            /* =================================================
               REQUIRES VERIFICATION
               ================================================= */

            case "REQUIRES_VERIFICATION":

                showMessage(
                    "This account still needs verification.",
                    "warning"
                );

                break;


            /* =================================================
               UNKNOWN ERROR
               ================================================= */

            default:

                showMessage(
                    message ||
                    "Unable to verify the account right now. Please try again.",
                    "error"
                );
        }
    }


    /* =====================================================
       GENERAL ERROR
       ===================================================== */

    function handleError(
        error
    ) {

        console.error(
            "[STOCKFLOW VERIFY ERROR]",
            error
        );


        const code =
            String(
                error?.code ||
                error?.data?.code ||
                error?.response?.code ||
                ""
            ).toUpperCase();


        const message =
            String(
                error?.data?.message ||
                error?.response?.message ||
                error?.message ||
                ""
            ).trim();


        if (code) {

            handleResponseError({

                success:
                    false,

                code:
                    code,

                message:
                    message
            });


            return;
        }


        showMessage(
            message ||
            "Unable to connect to the verification system right now. Please try again.",
            "error"
        );
    }


    /* =====================================================
       DISABLE OTP INPUTS
       ===================================================== */

    function disableOtpInputs(
        disabled
    ) {

        otpBoxes.forEach(
            input => {

                input.disabled =
                    disabled;
            }
        );


        if (verifyButton) {

            verifyButton.disabled =
                disabled;
        }
    }


    /* =====================================================
       INITIALIZE VERIFY PAGE
       ===================================================== */

    const hasVerificationState =
        loadVerificationState();


    if (!hasVerificationState) {

        console.warn(
            "[STOCKFLOW VERIFY] No pending verification state found."
        );


        showMessage(
            "No account is waiting for verification. Please register first.",
            "error"
        );


        window.setTimeout(
            () => {

                window.location.href =
                    REGISTER_ROUTE;

            },
            1500
        );


        return;
    }


    /* =====================================================
       VERIFY PAGE READY
       ===================================================== */

    console.log(
        "[STOCKFLOW VERIFY] Pending account found:",
        {
            uid:
                state.uid,

            identity:
                state.identity,

            username:
                state.username,

            email:
                state.email,

            phone:
                state.phone
        }
    );


    /*
     * Default channel is EMAIL.
     */

    selectChannel(
        "email"
    );


    updateDestination();


    /*
     * OTP boxes must start EMPTY.
     */

    clearOtp();


    otpBoxes.forEach(
        input => {

            input.disabled =
                false;
        }
    );


    /*
     * Verify button is available for normal
     * form interaction. Validation occurs when
     * the form is submitted.
     */

    if (verifyButton) {

        verifyButton.disabled =
            false;
    }


    /*
     * Initially:
     *
     * Email cooldown = 0
     * Phone cooldown = 0
     *
     * The email cooldown begins automatically
     * after prepareInitialOtp() successfully
     * requests the first code.
     */

    updateCooldownUI(
        "email"
    );


    updateCooldownUI(
        "phone"
    );


    if (verificationDescription) {

        verificationDescription.textContent =
            "Sending your verification code...";
    }


    if (otpHelp) {

        otpHelp.textContent =
            "Your 6-digit verification code will be sent to your Gmail.";
    }


    /* =====================================================
       AUTOMATIC INITIAL EMAIL OTP REQUEST
       ===================================================== */

    prepareInitialOtp();


    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        () => {

            Object.keys(
                timers
            ).forEach(
                channel => {

                    if (
                        timers[channel]
                    ) {

                        clearInterval(
                            timers[channel]
                        );


                        timers[channel] =
                            null;
                    }
                }
            );
        }
    );


    /* =====================================================
       DEBUG
       ===================================================== */

    console.log(
        "[STOCKFLOW VERIFY] verify.js loaded successfully."
    );

});
