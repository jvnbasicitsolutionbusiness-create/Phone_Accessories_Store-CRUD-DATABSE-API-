/* =========================================================
   STOCKFLOW - VERIFY ACCOUNT
   verify.js

   RESPONSIBILITIES:
   - Receive registration verification state
   - Generate/request OTP through Apps Script
   - NEVER generate OTP in the browser
   - Support email and phone channels
   - Maintain independent 120-second cooldowns
   - Auto-fill backend-generated demo OTP after delay
   - Verify account through Apps Script
   - Save verified session
   - Redirect to dashboard only after successful verification
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
        window.API;


    const VERIFY_ROUTE =
        ROUTES.VERIFY ||
        "verify.html";

    const REGISTER_ROUTE =
        ROUTES.REGISTER ||
        "auth.html#register";

    const DASHBOARD_ROUTE =
        ROUTES.DASHBOARD ||
        "dashboard.html";


    const OTP_LENGTH =
        Number(
            AUTH_CONFIG.OTP_LENGTH ||
            6
        );


    const RESEND_COOLDOWN =
        Number(
            AUTH_CONFIG.OTP_RESEND_COOLDOWN_SECONDS ||
            120
        );


    const DEMO_MODE =
        CONFIG.DEMO_MODE === true;


    const DEMO_MIN_DELAY =
        Number(
            AUTH_CONFIG.DEMO_AUTO_FILL_DELAY_MIN ||
            3000
        );


    const DEMO_MAX_DELAY =
        Number(
            AUTH_CONFIG.DEMO_AUTO_FILL_DELAY_MAX ||
            5000
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
            "STOCKFLOW_TOKEN"
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
        );


    const verifyMessage =
        document.getElementById(
            "otpMessage"
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
        );


    const phoneTimer =
        document.getElementById(
            "phoneOtpTimer"
        );


    const destination =
        document.getElementById(
            "otpDestination"
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
            "[STOCKFLOW VERIFY] StockFlowAPI/API is not available."
        );

        showMessage(
            "The verification system is not available right now.",
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

        channel: "email",

        requesting: false,

        verifying: false,

        demoOtp: "",

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

    function readStorage(
        key
    ) {

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


    function removeStorage(
        key
    ) {

        try {

            sessionStorage.removeItem(
                key
            );

        } catch (error) {
            console.warn(error);
        }

        try {

            localStorage.removeItem(
                key
            );

        } catch (error) {
            console.warn(error);
        }
    }


    /* =====================================================
       LOAD VERIFICATION STATE
    ===================================================== */

    function loadVerificationState() {

        let loaded = false;


        /*
         * FIRST:
         * Try the unified verification state.
         */

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


        /*
         * SECOND:
         * Read the individual OTP keys.
         *
         * This is the important compatibility fix.
         */

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


        /*
         * THIRD:
         * Some registration flows save the user
         * object instead.
         */

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


        /*
         * If identity is still missing, derive it.
         */

        if (
            !state.identity
        ) {

            state.identity =
                state.uid ||
                state.username ||
                state.email ||
                state.gmail ||
                state.phone ||
                "";
        }


        /*
         * Save a normalized verification state.
         */

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
            state.uid
        );
    }


    /* =====================================================
       SAVE VERIFICATION STATE
    ===================================================== */

    function saveVerificationState() {

        try {

            writeSession(
                STORAGE_KEYS.verification,
                JSON.stringify({

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

                    channel:
                        state.channel
                })
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
        message,
        type = "info"
    ) {

        if (!verifyMessage) {

            console.log(
                "[STOCKFLOW VERIFY]",
                message
            );

            return;
        }


        verifyMessage.textContent =
            message;


        verifyMessage.classList.remove(
            "success",
            "error",
            "info",
            "warning"
        );


        verifyMessage.classList.add(
            type
        );


        verifyMessage.hidden =
            false;
    }


    function clearMessage() {

        if (!verifyMessage) {
            return;
        }

        verifyMessage.textContent =
            "";

        verifyMessage.hidden =
            true;
    }


    /* =====================================================
       MASK EMAIL
    ===================================================== */

    function maskEmail(
        email
    ) {

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

    function maskPhone(
        phone
    ) {

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
       DESTINATION
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

                /*
                 * Do not trigger the button
                 * when clicking the card.
                 */

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
       OTP BOXES
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
            .join("");
    }


    function updateHiddenOtp() {

        if (!otpHidden) {
            return;
        }

        otpHidden.value =
            getOtp();
    }


    function fillOtp(
        otp
    ) {

        const code =
            String(
                otp || ""
            )
                .replace(
                    /\D/g,
                    ""
                )
                .substring(
                    0,
                    OTP_LENGTH
                );


        if (
            code.length !== OTP_LENGTH
        ) {
            return false;
        }


        otpBoxes.forEach(
            (
                input,
                index
            ) => {

                input.value =
                    code.charAt(
                        index
                    );
            }
        );


        updateHiddenOtp();


        if (
            otpHelp
        ) {

            otpHelp.textContent =
                "Your verification code has been filled. You can verify your account now.";
        }


        if (
            verifyButton
        ) {

            verifyButton.disabled =
                false;
        }


        return true;
    }


    /* =====================================================
       OTP INPUT EVENTS
    ===================================================== */

    otpBoxes.forEach(
        (
            input,
            index
        ) => {

            input.disabled =
                false;


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
                        OTP_LENGTH &&
                        verifyButton
                    ) {

                        verifyButton.disabled =
                            false;
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
                    }


                    if (
                        event.key ===
                        "ArrowLeft" &&
                        index > 0
                    ) {

                        otpBoxes[
                            index - 1
                        ].focus();
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


                    fillOtp(
                        pasted
                    );
                }
            );
        }
    );


    /* =====================================================
       BUTTON STATE
    ===================================================== */

    function setButtonText(
        button,
        text
    ) {

        if (!button) {
            return;
        }

        button.textContent =
            text;
    }


    /* =====================================================
       EXTRACT BACKEND OTP
    ===================================================== */

    function extractOtp(
        response
    ) {

        if (!response) {
            return "";
        }


        const value =
            response.otp ||
            response.codeValue ||
            response.verificationCode ||
            "";


        const normalized =
            String(
                value
            )
                .replace(
                    /\D/g,
                    ""
                );


        return (
            normalized.length ===
            OTP_LENGTH
                ? normalized
                : ""
        );
    }


    /* =====================================================
       UPDATE STATE FROM RESPONSE
    ===================================================== */

    function updateStateFromResponse(
        response
    ) {

        if (!response) {
            return;
        }


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


        state.identity =
            response.identity ||
            state.identity;


        state.channel =
            response.channel ||
            state.channel;


        if (
            !state.identity
        ) {

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
       DEMO DELAY
    ===================================================== */

    function getDemoDelay() {

        const min =
            Math.max(
                0,
                DEMO_MIN_DELAY
            );


        const max =
            Math.max(
                min,
                DEMO_MAX_DELAY
            );


        if (
            max <= min
        ) {
            return min;
        }


        return (
            min +
            Math.floor(
                Math.random() *
                (
                    max -
                    min +
                    1
                )
            )
        );
    }


    function wait(
        milliseconds
    ) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    milliseconds
                )
        );
    }


    /* =====================================================
       AUTO-FILL BACKEND OTP
    ===================================================== */

    async function autoFillBackendOtp(
        response
    ) {

        if (
            !DEMO_MODE
        ) {
            return;
        }


        const otp =
            extractOtp(
                response
            );


        if (
            otp.length !== OTP_LENGTH
        ) {

            console.warn(
                "[STOCKFLOW VERIFY] Backend did not return a valid demo OTP."
            );

            return;
        }


        state.demoOtp =
            otp;


        state.otpReady =
            true;


        /*
         * IMPORTANT:
         *
         * This delay does NOT generate the OTP.
         *
         * The OTP was already generated by
         * Code.gs.
         */

        await wait(
            getDemoDelay()
        );


        fillOtp(
            otp
        );
    }


    /* =====================================================
       COOLDOWN
    ===================================================== */

    function formatCountdown(
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

            button.disabled =
                seconds > 0 ||
                state.requesting;
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


    function startCooldown(
        channel,
        seconds
    ) {

        stopCooldown(
            channel
        );


        state.cooldowns[
            channel
        ] =
            Math.max(
                0,
                Number(seconds) ||
                RESEND_COOLDOWN
            );


        updateCooldownUI(
            channel
        );


        timers[channel] =
            setInterval(
                () => {

                    state.cooldowns[
                        channel
                    ]--;


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
       INITIAL OTP
    ===================================================== */

    async function prepareInitialOtp() {

        if (
            state.requesting
        ) {
            return;
        }


        state.requesting =
            true;


        clearMessage();


        selectChannel(
            "email"
        );


        try {

            if (
                verificationDescription
            ) {

                verificationDescription.textContent =
                    "Preparing your verification code...";
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
                        "email"
                });


            updateStateFromResponse(
                response
            );


            if (
                response &&
                response.success === true
            ) {

                state.otpReady =
                    response.otpReady === true;


                const cooldown =
                    Number(
                        response.cooldownSeconds ||
                        RESEND_COOLDOWN
                    );


                startCooldown(
                    "email",
                    cooldown
                );


                if (
                    emailDeliveryStatus
                ) {

                    emailDeliveryStatus.textContent =
                        response.message ||
                        "Verification code prepared.";
                }


                if (
                    verificationDescription
                ) {

                    verificationDescription.textContent =
                        "Your verification code is ready.";
                }


                showMessage(
                    response.message ||
                    "Verification code generated successfully.",
                    "success"
                );


                await autoFillBackendOtp(
                    response
                );


                return;
            }


            showMessage(
                response &&
                response.message
                    ? response.message
                    : "Unable to generate a verification code.",
                "error"
            );

        } catch (error) {

            handleError(
                error
            );

        } finally {

            state.requesting =
                false;


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


        state.requesting =
            true;


        clearMessage();

        clearOtp();


        state.demoOtp =
            "";


        state.otpReady =
            false;


        const button =
            selected === "email"
                ? emailButton
                : phoneButton;


        if (button) {

            button.disabled =
                true;


            setButtonText(
                button,
                "Generating code..."
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
                        selected
                });


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
                    response.otpReady === true;


                const cooldown =
                    Number(
                        response.cooldownSeconds ||
                        RESEND_COOLDOWN
                    );


                /*
                 * IMPORTANT:
                 *
                 * Only the selected channel
                 * receives its cooldown.
                 */

                startCooldown(
                    selected,
                    cooldown
                );


                if (
                    selected === "email" &&
                    emailDeliveryStatus
                ) {

                    emailDeliveryStatus.textContent =
                        response.message ||
                        "A new email verification code was generated.";
                }


                if (
                    selected === "phone" &&
                    phoneDeliveryStatus
                ) {

                    phoneDeliveryStatus.textContent =
                        response.message ||
                        "A new phone verification code was generated.";
                }


                showMessage(
                    response.message ||
                    "A new verification code was generated.",
                    "success"
                );


                await autoFillBackendOtp(
                    response
                );


                return;
            }


            showMessage(
                response &&
                response.message
                    ? response.message
                    : "Unable to generate a new verification code.",
                "error"
            );

        } catch (error) {

            handleError(
                error
            );

        } finally {

            state.requesting =
                false;


            if (button) {

                button.disabled =
                    state.cooldowns[
                        selected
                    ] > 0;


                setButtonText(
                    button,
                    selected === "email"
                        ? "Send code by email"
                        : "Send code by phone"
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
                     * Backend has now verified the account.
                     */

                    updateStateFromResponse(
                        response
                    );


                    saveVerifiedSession(
                        response
                    );


                    state.otpReady =
                        false;


                    state.demoOtp =
                        "";


                    showMessage(
                        response.message ||
                        "Account verified successfully.",
                        "success"
                    );


                    /*
                     * Only NOW remove the temporary
                     * verification state.
                     */

                    clearVerificationState();


                    /*
                     * Backend may explicitly provide
                     * the destination.
                     */

                    const destination =
                        response.redirect ||
                        DASHBOARD_ROUTE;


                    setTimeout(
                        () => {

                            window.location.href =
                                destination;

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
                        getOtp().length !==
                        OTP_LENGTH;


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
                response.uid ||
                state.uid,

            username:
                response.username ||
                state.username,

            name:
                response.name ||
                state.name,

            gmail:
                response.gmail ||
                response.email ||
                state.gmail,

            email:
                response.email ||
                response.gmail ||
                state.email,

            phone:
                response.phone ||
                state.phone,

            role:
                response.role ||
                "Employee",

            verified:
                true,

            accountStatus:
                response.accountStatus ||
                "ACTIVE"
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
                JSON.stringify({

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

                    loginTime:
                        new Date().toISOString()
                })
            );


            /*
             * Keep compatibility with existing
             * dashboard/session code.
             */

            localStorage.setItem(
                "STOCKFLOW_USER",
                JSON.stringify(
                    user
                )
            );


            localStorage.setItem(
                "STOCKFLOW_TOKEN",
                JSON.stringify(
                    user
                )
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW VERIFY] Unable to save verified session:",
                error
            );
        }
    }


    /* =====================================================
       CLEAR VERIFICATION STATE
    ===================================================== */

    function clearVerificationState() {

        removeStorage(
            STORAGE_KEYS.verification
        );

        /*
         * Do not immediately delete the individual
         * identity keys. They may still be useful
         * to the dashboard/auth compatibility layer.
         *
         * OTP itself is controlled by the backend.
         */
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

            case "ACCOUNT_NOT_FOUND":

                showMessage(
                    "Account does not exist.",
                    "error"
                );

                break;


            case "ALREADY_VERIFIED":

                showMessage(
                    "This account is already verified.",
                    "success"
                );


                setTimeout(
                    () => {

                        window.location.href =
                            DASHBOARD_ROUTE;

                    },
                    700
                );

                break;


            case "OTP_EXPIRED":

                clearOtp();

                showMessage(
                    "The verification code has expired. Please request a new code.",
                    "error"
                );

                break;


            case "OTP_NOT_READY":

                clearOtp();

                showMessage(
                    "No active verification code was found. Please request a new code.",
                    "error"
                );

                break;


            case "INVALID_OTP":

                showMessage(
                    message ||
                    "Incorrect verification code. Please try again.",
                    "error"
                );

                break;


            case "INVALID_OTP_FORMAT":

                showMessage(
                    "Please enter the complete 6-digit verification code.",
                    "error"
                );

                break;


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
                            response.cooldownSeconds ||
                            RESEND_COOLDOWN
                        )
                    );
                }

                break;


            case "ACCOUNT_DISABLED":

                showMessage(
                    "This account is disabled.",
                    "error"
                );

                break;


            case "ACCOUNT_SUSPENDED":

                showMessage(
                    "This account is suspended.",
                    "error"
                );

                break;


            case "ACCOUNT_BLOCKED":

                showMessage(
                    "This account is blocked.",
                    "error"
                );

                break;


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
                ""
            ).toUpperCase();


        const message =
            String(
                error?.message ||
                error?.data?.message ||
                ""
            ).trim();


        if (
            code
        ) {

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


        if (
            verifyButton
        ) {

            verifyButton.disabled =
                disabled;
        }
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    /*
     * THIS IS THE CRITICAL FIX.
     *
     * We no longer require ONLY:
     *
     * STOCKFLOW_VERIFICATION_STATE
     *
     * loadVerificationState() also accepts:
     *
     * STOCKFLOW_OTP_UID
     * STOCKFLOW_OTP_EMAIL
     * STOCKFLOW_OTP_PHONE
     * STOCKFLOW_OTP_USERNAME
     * STOCKFLOW_OTP_IDENTITY
     * STOCKFLOW_USER
     *
     * Therefore registration → verify.html
     * can continue normally.
     */

    const hasVerificationState =
        loadVerificationState();


    if (
        !hasVerificationState
    ) {

        console.warn(
            "[STOCKFLOW VERIFY] No pending verification account was found."
        );


        showMessage(
            "No account is waiting for verification. Please register first.",
            "error"
        );


        /*
         * Keep the old behavior only when there
         * genuinely is no registration state.
         */

        setTimeout(
            () => {

                window.location.href =
                    REGISTER_ROUTE;

            },
            1500
        );


        return;
    }


    /*
     * A pending account exists.
     * DO NOT REDIRECT TO REGISTER.
     */

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


    selectChannel(
        state.channel === "phone"
            ? "phone"
            : "email"
    );


    updateDestination();


    updateCooldownUI(
        "email"
    );


    updateCooldownUI(
        "phone"
    );


    if (
        verificationDescription
    ) {

        verificationDescription.textContent =
            "Preparing your verification code...";
    }


    /*
     * Start backend OTP generation.
     *
     * The browser NEVER generates the OTP.
     */

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
                    }
                }
            );
        }
    );

});
