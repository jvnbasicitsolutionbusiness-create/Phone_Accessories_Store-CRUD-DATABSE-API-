/*
=========================================================
STOCKFLOW ACCOUNT RECOVERY CONTROLLER
Phone Accessories Inventory Management System
=========================================================

FLOW
----
Recovery Page
     ↓
Enter registered Gmail / phone / username
     ↓
Backend checks account
     ↓
Backend generates recovery OTP
     ↓
Google Sheets + Firebase
     ↓
DEMO_MODE
     ↓
3–5 second delay
     ↓
6-digit OTP automatically appears
     ↓
Verify recovery code
     ↓
Create new password
     ↓
Reset password
     ↓
Success
     ↓
Login

IMPORTANT
---------
This is a MIDTERM / DEMO implementation.

No real Gmail or SMS delivery is claimed.

The backend is responsible for OTP generation.

In DEMO_MODE, the backend may return demoOtp so
the browser can automatically display it.
=========================================================
*/

(function () {

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

    const STORAGE =
        CONFIG.STORAGE ||
        {};


    const API =
        window.StockFlowAPI ||
        window.API ||
        null;


    /* =====================================================
       PAGE CHECK
       ===================================================== */

    const recoveryPage =
        document.getElementById(
            "recoveryOtpStep"
        ) ||
        document.getElementById(
            "newPasswordStep"
        ) ||
        document.getElementById(
            "recoverySuccessStep"
        );


    if (!recoveryPage) {

        return;
    }


    /* =====================================================
       CONSTANTS
       ===================================================== */

    const OTP_LENGTH =
        Number(
            AUTH_CONFIG.OTP_LENGTH ||
            6
        );


    const RESEND_COOLDOWN =
        Number(
            AUTH_CONFIG.OTP_RESEND_COOLDOWN_SECONDS ||
            60
        );


    const DEMO_MODE =
        CONFIG.DEMO_MODE === true;


    const DEMO_AUTO_FILL =
        AUTH_CONFIG.DEMO_AUTO_FILL !== false;


    const DEMO_DELAY_MIN =
        Number(
            AUTH_CONFIG.DEMO_AUTO_FILL_DELAY_MIN ||
            3000
        );


    const DEMO_DELAY_MAX =
        Number(
            AUTH_CONFIG.DEMO_AUTO_FILL_DELAY_MAX ||
            5000
        );


    /* =====================================================
       DOM HELPER
       ===================================================== */

    const $ = function (id) {

        return document.getElementById(
            id
        );
    };


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const recoveryOtpStep =
        $("recoveryOtpStep");


    const newPasswordStep =
        $("newPasswordStep");


    const recoverySuccessStep =
        $("recoverySuccessStep");


    const recoveryOtpForm =
        $("recoveryOtpForm");


    const recoveryOtpInputs =
        Array.from(
            document.querySelectorAll(
                "#recoveryOtpInputs input"
            )
        );


    const recoveryDestination =
        $("recoveryDestination");


    const recoveryMessage =
        $("recoveryMessage");


    const verifyRecoveryButton =
        $("verifyRecoveryButton");


    const resendRecoveryOtp =
        $("resendRecoveryOtp");


    const recoveryCountdown =
        $("recoveryCountdown");


    const newPasswordForm =
        $("newPasswordForm");


    const newPassword =
        $("newPassword");


    const confirmNewPassword =
        $("confirmNewPassword");


    const resetPasswordButton =
        $("resetPasswordButton");


    const passwordMessage =
        $("passwordMessage");


    const recoveryPasswordBar =
        $("recoveryPasswordBar");


    const recoveryPasswordHint =
        $("recoveryPasswordHint");


    const recoveryLoginButton =
        $("recoveryLoginButton");


    /* =====================================================
       STATE
       ===================================================== */

    const state = {

        identity:
            "",

        username:
            "",

        email:
            "",

        gmail:
            "",

        phone:
            "",

        uid:
            "",

        channel:
            "email",

        demoOtp:
            "",

        otpReady:
            false,

        otpVerified:
            false,

        recoveryVerified:
            false,

        requesting:
            false,

        verifying:
            false,

        resetting:
            false,

        countdown:
            RESEND_COOLDOWN,

        countdownTimer:
            null,

        demoTimer:
            null
    };


    /* =====================================================
       STORAGE KEYS
       ===================================================== */

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

        TOKEN:
            STORAGE.TOKEN ||
            "STOCKFLOW_TOKEN",

        USER:
            STORAGE.USER ||
            "STOCKFLOW_USER"
    };


    /* =====================================================
       STORAGE HELPERS
       ===================================================== */

    function storageGet(
        key
    ) {

        try {

            return (
                sessionStorage.getItem(
                    key
                ) ||
                localStorage.getItem(
                    key
                ) ||
                ""
            );

        } catch (error) {

            return "";
        }
    }


    function storageSet(
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

            localStorage.setItem(
                key,
                String(
                    value ?? ""
                )
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW RECOVERY] Storage unavailable.",
                error
            );
        }
    }


    function storageRemove(
        key
    ) {

        try {

            sessionStorage.removeItem(
                key
            );

            localStorage.removeItem(
                key
            );

        } catch (error) {

            /* Ignore storage errors. */
        }
    }


    /* =====================================================
       STRING HELPERS
       ===================================================== */

    function clean(
        value
    ) {

        if (
            value === null ||
            typeof value ===
                "undefined"
        ) {

            return "";
        }

        return String(
            value
        ).trim();
    }


    function firstValue() {

        for (
            let i = 0;
            i < arguments.length;
            i++
        ) {

            const value =
                clean(
                    arguments[i]
                );

            if (value) {

                return value;
            }
        }

        return "";
    }


    /* =====================================================
       LOAD SAVED STATE
       ===================================================== */

    function loadSavedState() {

        state.identity =
            storageGet(
                STORAGE_KEYS.IDENTITY
            );


        state.username =
            storageGet(
                STORAGE_KEYS.USERNAME
            );


        state.email =
            storageGet(
                STORAGE_KEYS.EMAIL
            );


        state.gmail =
            storageGet(
                STORAGE_KEYS.EMAIL
            );


        state.phone =
            storageGet(
                STORAGE_KEYS.PHONE
            );


        state.uid =
            storageGet(
                STORAGE_KEYS.UID
            );


        state.channel =
            storageGet(
                STORAGE_KEYS.CHANNEL
            ) ||
            "email";
    }


    /* =====================================================
       SAVE STATE
       ===================================================== */

    function saveState() {

        storageSet(
            STORAGE_KEYS.IDENTITY,
            state.identity
        );


        storageSet(
            STORAGE_KEYS.USERNAME,
            state.username
        );


        storageSet(
            STORAGE_KEYS.EMAIL,
            state.email
        );


        storageSet(
            STORAGE_KEYS.PHONE,
            state.phone
        );


        storageSet(
            STORAGE_KEYS.UID,
            state.uid
        );


        storageSet(
            STORAGE_KEYS.CHANNEL,
            state.channel
        );
    }


    /* =====================================================
       RESOLVE IDENTITY
       ===================================================== */

    function resolveIdentity() {

        state.identity =
            firstValue(

                state.identity,

                state.username,

                state.email,

                state.gmail,

                state.phone,

                state.uid
            );


        return state.identity;
    }


    /* =====================================================
       SHOW MESSAGE
       ===================================================== */

    function showMessage(
        element,
        message,
        type = "error"
    ) {

        if (!element) {

            return;
        }


        element.textContent =
            message || "";


        element.classList.remove(
            "success",
            "error",
            "warning",
            "info",
            "show"
        );


        element.classList.add(
            type
        );


        element.classList.add(
            "show"
        );


        element.hidden =
            false;
    }


    /* =====================================================
       HIDE MESSAGE
       ===================================================== */

    function hideMessage(
        element
    ) {

        if (!element) {

            return;
        }


        element.textContent =
            "";


        element.classList.remove(
            "success",
            "error",
            "warning",
            "info",
            "show"
        );


        element.hidden =
            true;
    }


    /* =====================================================
       EXTRACT RESPONSE DATA
       ===================================================== */

    function getResponseData(
        response
    ) {

        if (
            !response ||
            typeof response !==
                "object"
        ) {

            return {};
        }


        if (
            response.data &&
            typeof response.data ===
                "object"
        ) {

            return {
                ...response,
                ...response.data
            };
        }


        return response;
    }


    /* =====================================================
       EXTRACT OTP
       ===================================================== */

    function extractDemoOtp(
        response
    ) {

        const data =
            getResponseData(
                response
            );


        const candidates = [

            data.demoOtp,

            data.demoOTP,

            data.generatedOtp,

            data.generatedOTP,

            data.otp,

            data.OTP,

            data.code,

            data.recoveryOtp,

            data.recoveryOTP
        ];


        for (
            const candidate of candidates
        ) {

            const value =
                clean(
                    candidate
                ).replace(
                    /\D/g,
                    ""
                );


            if (
                value.length ===
                OTP_LENGTH
            ) {

                return value;
            }
        }


        return "";
    }


    /* =====================================================
       UPDATE ACCOUNT STATE FROM RESPONSE
       ===================================================== */

    function updateStateFromResponse(
        response
    ) {

        const data =
            getResponseData(
                response
            );


        state.uid =
            firstValue(
                data.uid,
                data.UID,
                state.uid
            );


        state.username =
            firstValue(
                data.username,
                data.USERNAME,
                state.username
            );


        state.email =
            firstValue(
                data.email,
                data.gmail,
                data.GMAIL,
                state.email
            );


        state.gmail =
            firstValue(
                data.gmail,
                data.email,
                state.gmail
            );


        state.phone =
            firstValue(
                data.phone,
                data.phoneNumber,
                data["PHONE NO."],
                state.phone
            );


        state.identity =
            firstValue(
                data.identity,
                state.identity,
                state.username,
                state.email,
                state.phone,
                state.uid
            );


        saveState();
    }


    /* =====================================================
       DISPLAY DESTINATION
       ===================================================== */

    function displayDestination() {

        if (!recoveryDestination) {

            return;
        }


        const identity =
            resolveIdentity();


        if (!identity) {

            recoveryDestination.textContent =
                "Enter your registered Gmail, phone number, or username.";

            return;
        }


        let display =
            identity;


        if (
            identity.includes("@")
        ) {

            display =
                maskEmail(
                    identity
                );

        } else if (
            /^\+?\d+$/.test(
                identity.replace(
                    /[\s()-]/g,
                    ""
                )
            )
        ) {

            display =
                maskPhone(
                    identity
                );
        }


        recoveryDestination.textContent =
            display;
    }


    /* =====================================================
       MASK EMAIL
       ===================================================== */

    function maskEmail(
        email
    ) {

        const value =
            clean(
                email
            );


        const at =
            value.indexOf("@");


        if (
            at <= 0
        ) {

            return value;
        }


        const name =
            value.slice(
                0,
                at
            );


        const domain =
            value.slice(
                at
            );


        if (
            name.length <= 2
        ) {

            return (
                name.charAt(0) +
                "*" +
                domain
            );
        }


        return (
            name.charAt(0) +
            "*".repeat(
                Math.min(
                    name.length - 1,
                    4
                )
            ) +
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
            clean(
                phone
            ).replace(
                /[\s()-]/g,
                ""
            );


        if (
            value.length <= 4
        ) {

            return value;
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


    /* =====================================================
       SHOW STEP
       ===================================================== */

    function showStep(
        step
    ) {

        if (
            recoveryOtpStep
        ) {

            recoveryOtpStep.style.display =
                step === "otp"
                    ? ""
                    : "none";
        }


        if (
            newPasswordStep
        ) {

            newPasswordStep.style.display =
                step === "password"
                    ? ""
                    : "none";
        }


        if (
            recoverySuccessStep
        ) {

            recoverySuccessStep.style.display =
                step === "success"
                    ? ""
                    : "none";
        }
    }


    /* =====================================================
       GET OTP
       ===================================================== */

    function getOtp() {

        return recoveryOtpInputs
            .map(
                input =>
                    clean(
                        input.value
                    ).replace(
                        /\D/g,
                        ""
                    )
            )
            .join("")
            .slice(
                0,
                OTP_LENGTH
            );
    }


    /* =====================================================
       SET OTP
       ===================================================== */

    function setOtp(
        code
    ) {

        const normalized =
            clean(
                code
            ).replace(
                /\D/g,
                ""
            ).slice(
                0,
                OTP_LENGTH
            );


        recoveryOtpInputs.forEach(
            function (
                input,
                index
            ) {

                input.value =
                    normalized[index] ||
                    "";
            }
        );


        updateVerifyButton();
    }


    /* =====================================================
       CLEAR OTP
       ===================================================== */

    function clearOtp() {

        recoveryOtpInputs.forEach(
            function (
                input
            ) {

                input.value =
                    "";
            }
        );


        updateVerifyButton();
    }


    /* =====================================================
       UPDATE VERIFY BUTTON
       ===================================================== */

    function updateVerifyButton() {

        if (
            !verifyRecoveryButton
        ) {

            return;
        }


        verifyRecoveryButton.disabled =
            state.verifying ||
            getOtp().length !==
                OTP_LENGTH;
    }


    /* =====================================================
       OTP INPUT INITIALIZATION
       ===================================================== */

    function initializeOtpInputs() {

        recoveryOtpInputs.forEach(
            function (
                input,
                index
            ) {

                input.setAttribute(
                    "maxlength",
                    "1"
                );


                input.setAttribute(
                    "inputmode",
                    "numeric"
                );


                input.addEventListener(
                    "input",
                    function () {

                        input.value =
                            input.value
                                .replace(
                                    /\D/g,
                                    ""
                                )
                                .slice(
                                    0,
                                    1
                                );


                        if (
                            input.value &&
                            index <
                                recoveryOtpInputs.length -
                                1
                        ) {

                            recoveryOtpInputs[
                                index + 1
                            ].focus();
                        }


                        updateVerifyButton();
                    }
                );


                input.addEventListener(
                    "keydown",
                    function (
                        event
                    ) {

                        if (
                            event.key ===
                                "Backspace" &&
                            !input.value &&
                            index > 0
                        ) {

                            recoveryOtpInputs[
                                index - 1
                            ].focus();
                        }


                        if (
                            event.key ===
                                "ArrowLeft" &&
                            index > 0
                        ) {

                            recoveryOtpInputs[
                                index - 1
                            ].focus();
                        }


                        if (
                            event.key ===
                                "ArrowRight" &&
                            index <
                                recoveryOtpInputs.length -
                                1
                        ) {

                            recoveryOtpInputs[
                                index + 1
                            ].focus();
                        }
                    }
                );


                input.addEventListener(
                    "paste",
                    function (
                        event
                    ) {

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
                                .slice(
                                    0,
                                    OTP_LENGTH
                                );


                        if (!pasted) {

                            return;
                        }


                        setOtp(
                            pasted
                        );


                        const focusIndex =
                            Math.min(
                                pasted.length,
                                recoveryOtpInputs.length
                            ) - 1;


                        if (
                            focusIndex >= 0
                        ) {

                            recoveryOtpInputs[
                                focusIndex
                            ].focus();
                        }
                    }
                );
            }
        );
    }


    /* =====================================================
       ENABLE OTP INPUTS
       ===================================================== */

    function enableOtpInputs() {

        recoveryOtpInputs.forEach(
            function (
                input
            ) {

                input.disabled =
                    false;
            }
        );


        updateVerifyButton();
    }


    /* =====================================================
       DISABLE OTP INPUTS
       ===================================================== */

    function disableOtpInputs() {

        recoveryOtpInputs.forEach(
            function (
                input
            ) {

                input.disabled =
                    true;
            }
        );


        if (
            verifyRecoveryButton
        ) {

            verifyRecoveryButton.disabled =
                true;
        }
    }


    /* =====================================================
       RANDOM DEMO DELAY
       ===================================================== */

    function getDemoDelay() {

        const min =
            Math.max(
                0,
                DEMO_DELAY_MIN
            );


        const max =
            Math.max(
                min,
                DEMO_DELAY_MAX
            );


        if (
            min === max
        ) {

            return min;
        }


        return Math.floor(
            Math.random() *
            (
                max -
                min +
                1
            )
        ) + min;
    }


    /* =====================================================
       REQUEST RECOVERY OTP
       ===================================================== */

    async function requestRecoveryOtp() {

        if (
            state.requesting
        ) {

            return;
        }


        if (!API) {

            showMessage(
                recoveryMessage,
                "The recovery service is not available.",
                "error"
            );

            return;
        }


        const identity =
            resolveIdentity();


        if (!identity) {

            showMessage(
                recoveryMessage,
                "Please provide your registered Gmail, phone number, or username.",
                "error"
            );

            return;
        }


        state.requesting =
            true;


        disableOtpInputs();


        clearOtp();


        hideMessage(
            recoveryMessage
        );


        try {

            const response =
                await API.forgotPassword(
                    {

                        identity,

                        username:
                            state.username,

                        email:
                            state.email,

                        gmail:
                            state.gmail,

                        phone:
                            state.phone,

                        uid:
                            state.uid
                    }
                );


            updateStateFromResponse(
                response
            );


            displayDestination();


            const demoOtp =
                extractDemoOtp(
                    response
                );


            /*
             * DEMO MODE
             *
             * Backend generated OTP is returned
             * and displayed after 3–5 seconds.
             */

            if (
                DEMO_MODE &&
                DEMO_AUTO_FILL &&
                demoOtp
            ) {

                state.demoOtp =
                    demoOtp;


                if (
                    recoveryCountdown
                ) {

                    recoveryCountdown.textContent =
                        RESEND_COOLDOWN;
                }


                startCountdown();


                const delay =
                    getDemoDelay();


                showMessage(
                    recoveryMessage,
                    "Your demo recovery code is being prepared...",
                    "info"
                );


                state.demoTimer =
                    setTimeout(
                        function () {

                            enableOtpInputs();


                            setOtp(
                                demoOtp
                            );


                            state.otpReady =
                                true;


                            showMessage(
                                recoveryMessage,
                                "Demo recovery code prepared. The 6-digit code has been filled automatically.",
                                "success"
                            );


                            if (
                                recoveryOtpInputs.length
                            ) {

                                recoveryOtpInputs[
                                    0
                                ].focus();
                            }

                        },
                        delay
                    );


            } else {

                /*
                 * Non-demo mode:
                 * user manually enters the OTP.
                 */

                enableOtpInputs();


                state.otpReady =
                    true;


                startCountdown();


                showMessage(
                    recoveryMessage,
                    "A recovery verification code is ready. Enter the 6-digit code to continue.",
                    "success"
                );
            }


        } catch (error) {

            console.error(
                "[STOCKFLOW RECOVERY] OTP request failed:",
                error
            );


            state.otpReady =
                false;


            disableOtpInputs();


            showMessage(
                recoveryMessage,
                getErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            state.requesting =
                false;
        }
    }


    /* =====================================================
       VERIFY RECOVERY OTP
       ===================================================== */

    async function verifyRecoveryCode() {

        if (
            state.verifying
        ) {

            return;
        }


        const otp =
            getOtp();


        if (
            otp.length !==
            OTP_LENGTH
        ) {

            showMessage(
                recoveryMessage,
                "Please enter the complete 6-digit recovery code.",
                "error"
            );

            return;
        }


        const identity =
            resolveIdentity();


        if (!identity) {

            showMessage(
                recoveryMessage,
                "Please provide your registered Gmail, phone number, or username.",
                "error"
            );

            return;
        }


        if (!API) {

            showMessage(
                recoveryMessage,
                "The recovery service is not available.",
                "error"
            );

            return;
        }


        state.verifying =
            true;


        if (
            verifyRecoveryButton
        ) {

            verifyRecoveryButton.disabled =
                true;

            verifyRecoveryButton.dataset.originalText =
                verifyRecoveryButton.dataset.originalText ||
                verifyRecoveryButton.textContent;

            verifyRecoveryButton.textContent =
                "Verifying...";
        }


        hideMessage(
            recoveryMessage
        );


        try {

            const response =
                await API.verifyRecoveryOtp(
                    {

                        uid:
                            state.uid,

                        identity,

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

                        otp
                    }
                );


            updateStateFromResponse(
                response
            );


            state.otpVerified =
                true;


            state.recoveryVerified =
                true;


            showMessage(
                recoveryMessage,
                "Recovery code verified successfully.",
                "success"
            );


            /*
             * Move to password creation.
             */

            setTimeout(
                function () {

                    showStep(
                        "password"
                    );


                    hideMessage(
                        recoveryMessage
                    );


                    if (
                        newPassword
                    ) {

                        newPassword.focus();
                    }

                },
                500
            );


        } catch (error) {

            console.error(
                "[STOCKFLOW RECOVERY] OTP verification failed:",
                error
            );


            state.verifying =
                false;


            if (
                verifyRecoveryButton
            ) {

                verifyRecoveryButton.textContent =
                    verifyRecoveryButton.dataset.originalText ||
                    "Verify recovery code";
            }


            showMessage(
                recoveryMessage,
                getErrorMessage(
                    error
                ),
                "error"
            );


            updateVerifyButton();


        }
    }


    /* =====================================================
       START COUNTDOWN
       ===================================================== */

    function startCountdown() {

        stopCountdown();


        state.countdown =
            RESEND_COOLDOWN;


        updateCountdown();


        state.countdownTimer =
            setInterval(
                function () {

                    state.countdown--;


                    updateCountdown();


                    if (
                        state.countdown <=
                        0
                    ) {

                        stopCountdown();

                        updateCountdown();
                    }

                },
                1000
            );
    }


    /* =====================================================
       STOP COUNTDOWN
       ===================================================== */

    function stopCountdown() {

        if (
            state.countdownTimer
        ) {

            clearInterval(
                state.countdownTimer
            );


            state.countdownTimer =
                null;
        }
    }


    /* =====================================================
       UPDATE COUNTDOWN
       ===================================================== */

    function updateCountdown() {

        if (
            !recoveryCountdown
        ) {

            return;
        }


        if (
            state.countdown <=
            0
        ) {

            recoveryCountdown.textContent =
                "0";


            if (
                resendRecoveryOtp
            ) {

                resendRecoveryOtp.disabled =
                    false;

                resendRecoveryOtp.innerHTML =
                    "Resend code";
            }


            return;
        }


        recoveryCountdown.textContent =
            String(
                state.countdown
            );


        if (
            resendRecoveryOtp
        ) {

            resendRecoveryOtp.disabled =
                true;

            resendRecoveryOtp.innerHTML =
                "Resend in <b id=\"recoveryCountdown\">" +
                state.countdown +
                "</b>s";
        }
    }


    /* =====================================================
       RESEND RECOVERY OTP
       ===================================================== */

    async function resendRecoveryCode() {

        if (
            state.countdown > 0 ||
            state.requesting
        ) {

            return;
        }


        await requestRecoveryOtp();
    }


    /* =====================================================
       PASSWORD VALIDATION
       ===================================================== */

    function validatePassword(
        password
    ) {

        const value =
            clean(
                password
            );


        return {

            length:
                value.length >= 8,

            uppercase:
                /[A-Z]/.test(
                    value
                ),

            lowercase:
                /[a-z]/.test(
                    value
                ),

            number:
                /[0-9]/.test(
                    value
                ),

            symbol:
                /[^A-Za-z0-9]/.test(
                    value
                )
        };
    }


    /* =====================================================
       PASSWORD STRENGTH
       ===================================================== */

    function getPasswordStrength(
        password
    ) {

        const checks =
            validatePassword(
                password
            );


        let score = 0;


        if (
            checks.length
        ) {
            score++;
        }


        if (
            checks.uppercase
        ) {
            score++;
        }


        if (
            checks.lowercase
        ) {
            score++;
        }


        if (
            checks.number
        ) {
            score++;
        }


        if (
            checks.symbol
        ) {
            score++;
        }


        return {

            score,

            total: 5,

            checks
        };
    }


    /* =====================================================
       UPDATE PASSWORD METER
       ===================================================== */

    function updatePasswordMeter() {

        if (
            !newPassword
        ) {

            return;
        }


        const password =
            newPassword.value;


        const result =
            getPasswordStrength(
                password
            );


        if (
            recoveryPasswordBar
        ) {

            const percentage =
                (
                    result.score /
                    result.total
                ) *
                100;


            recoveryPasswordBar.style.width =
                percentage + "%";
        }


        if (
            recoveryPasswordHint
        ) {

            if (
                !password
            ) {

                recoveryPasswordHint.textContent =
                    "Use 8+ characters with uppercase, lowercase, number and symbol.";

            } else if (
                result.score <= 2
            ) {

                recoveryPasswordHint.textContent =
                    "Weak password. Add uppercase, lowercase, number and symbol.";

            } else if (
                result.score === 3
            ) {

                recoveryPasswordHint.textContent =
                    "Moderate password. Add more complexity.";

            } else if (
                result.score === 4
            ) {

                recoveryPasswordHint.textContent =
                    "Strong password. One more requirement is recommended.";

            } else {

                recoveryPasswordHint.textContent =
                    "Strong password.";
            }
        }
    }


    /* =====================================================
       PASSWORD VALIDATION MESSAGE
       ===================================================== */

    function validateNewPasswordForm() {

        const password =
            newPassword
                ? newPassword.value
                : "";


        const confirm =
            confirmNewPassword
                ? confirmNewPassword.value
                : "";


        const result =
            getPasswordStrength(
                password
            );


        if (
            !password
        ) {

            return {
                valid: false,
                message:
                    "Please enter a new password."
            };
        }


        if (
            !result.checks.length ||
            !result.checks.uppercase ||
            !result.checks.lowercase ||
            !result.checks.number ||
            !result.checks.symbol
        ) {

            return {
                valid: false,
                message:
                    "Password must contain at least 8 characters, uppercase, lowercase, number, and symbol."
            };
        }


        if (
            !confirm
        ) {

            return {
                valid: false,
                message:
                    "Please confirm your new password."
            };
        }


        if (
            password !==
            confirm
        ) {

            return {
                valid: false,
                message:
                    "Passwords do not match."
            };
        }


        return {
            valid: true,
            message: ""
        };
    }


    /* =====================================================
       RESET PASSWORD
       ===================================================== */

    async function resetPassword() {

        if (
            state.resetting
        ) {

            return;
        }


        if (
            !state.recoveryVerified
        ) {

            showMessage(
                passwordMessage,
                "Please verify your recovery code first.",
                "error"
            );

            return;
        }


        const validation =
            validateNewPasswordForm();


        if (
            !validation.valid
        ) {

            showMessage(
                passwordMessage,
                validation.message,
                "error"
            );

            return;
        }


        if (!API) {

            showMessage(
                passwordMessage,
                "The recovery service is not available.",
                "error"
            );

            return;
        }


        state.resetting =
            true;


        if (
            resetPasswordButton
        ) {

            resetPasswordButton.disabled =
                true;

            resetPasswordButton.dataset.originalText =
                resetPasswordButton.dataset.originalText ||
                resetPasswordButton.textContent;

            resetPasswordButton.textContent =
                "Resetting...";
        }


        hideMessage(
            passwordMessage
        );


        try {

            const response =
                await API.resetPassword(
                    {

                        uid:
                            state.uid,

                        identity:
                            resolveIdentity(),

                        username:
                            state.username,

                        email:
                            state.email,

                        gmail:
                            state.gmail,

                        phone:
                            state.phone,

                        newPassword:
                            newPassword.value,

                        password:
                            newPassword.value,

                        confirmPassword:
                            confirmNewPassword.value
                    }
                );


            const data =
                getResponseData(
                    response
                );


            /*
             * Clear recovery-specific state.
             */

            state.demoOtp =
                "";


            state.otpReady =
                false;


            state.otpVerified =
                false;


            state.recoveryVerified =
                false;


            storageRemove(
                STORAGE_KEYS.IDENTITY
            );


            storageRemove(
                STORAGE_KEYS.USERNAME
            );


            storageRemove(
                STORAGE_KEYS.EMAIL
            );


            storageRemove(
                STORAGE_KEYS.PHONE
            );


            storageRemove(
                STORAGE_KEYS.UID
            );


            storageRemove(
                STORAGE_KEYS.CHANNEL
            );


            /*
             * Clear any stale authentication token.
             */

            storageRemove(
                STORAGE_KEYS.TOKEN
            );


            storageRemove(
                STORAGE_KEYS.USER
            );


            showMessage(
                passwordMessage,
                "Your password has been successfully updated.",
                "success"
            );


            showStep(
                "success"
            );


        } catch (error) {

            console.error(
                "[STOCKFLOW RECOVERY] Password reset failed:",
                error
            );


            showMessage(
                passwordMessage,
                getErrorMessage(
                    error
                ),
                "error"
            );


        } finally {

            state.resetting =
                false;


            if (
                resetPasswordButton
            ) {

                resetPasswordButton.disabled =
                    false;

                resetPasswordButton.textContent =
                    resetPasswordButton.dataset.originalText ||
                    "Reset password";
            }
        }
    }


    /* =====================================================
       PASSWORD TOGGLE
       ===================================================== */

    function initializePasswordToggles() {

        const buttons =
            document.querySelectorAll(
                ".password-toggle"
            );


        buttons.forEach(
            function (
                button
            ) {

                button.addEventListener(
                    "click",
                    function () {

                        const targetId =
                            button.dataset.target;


                        const input =
                            targetId
                                ? $(
                                    targetId
                                )
                                : null;


                        if (!input) {

                            return;
                        }


                        if (
                            input.type ===
                            "password"
                        ) {

                            input.type =
                                "text";

                            button.textContent =
                                "Hide";

                        } else {

                            input.type =
                                "password";

                            button.textContent =
                                "Show";
                        }
                    }
                );
            }
        );
    }


    /* =====================================================
       ERROR MESSAGE
       ===================================================== */

    function getErrorMessage(
        error
    ) {

        if (!error) {

            return "Something went wrong. Please try again.";
        }


        const code =
            clean(
                error.code
            );


        const message =
            clean(
                error.message
            );


        const lowerMessage =
            message.toLowerCase();


        if (
            code ===
                "USER_NOT_FOUND" ||
            code ===
                "ACCOUNT_NOT_FOUND"
        ) {

            return "No registered StockFlow account was found for that information.";
        }


        if (
            code ===
                "RECOVERY_IDENTITY_MISSING"
        ) {

            return "Please provide your registered Gmail, phone number, or username.";
        }


        if (
            code ===
                "INVALID_OTP" ||
            code ===
                "OTP_INVALID"
        ) {

            return "The recovery code is incorrect. Please try again.";
        }


        if (
            code ===
                "OTP_EXPIRED"
        ) {

            return "The recovery code has expired. Please request a new code.";
        }


        if (
            code ===
                "OTP_LOCKED" ||
            code ===
                "ACCOUNT_LOCKED"
        ) {

            return "Recovery verification is temporarily locked. Please try again later.";
        }


        if (
            code ===
                "MAX_ATTEMPTS"
        ) {

            return "You have reached the maximum number of recovery attempts. Please try again later.";
        }


        if (
            code ===
                "OTP_COOLDOWN"
        ) {

            return "Please wait before requesting another recovery code.";
        }


        if (
            code ===
                "NETWORK_ERROR"
        ) {

            return "Unable to connect to the recovery service. Please try again.";
        }


        if (
            code ===
                "TIMEOUT"
        ) {

            return "The recovery service took too long to respond. Please try again.";
        }


        if (
            lowerMessage.includes(
                "not found"
            )
        ) {

            return "No registered StockFlow account was found for that information.";
        }


        if (
            lowerMessage.includes(
                "password"
            )
        ) {

            return message;
        }


        if (message) {

            return message;
        }


        return "Something went wrong. Please try again.";
    }


    /* =====================================================
       LOGIN REDIRECT
       ===================================================== */

    function continueToLogin() {

        const loginRoute =
            ROUTES.LOGIN ||
            "auth.html#login";


        window.location.href =
            loginRoute;
    }


    /* =====================================================
       FORM EVENTS
       ===================================================== */

    function initializeEvents() {

        if (
            recoveryOtpForm
        ) {

            recoveryOtpForm.addEventListener(
                "submit",
                function (
                    event
                ) {

                    event.preventDefault();

                    verifyRecoveryCode();
                }
            );
        }


        if (
            resendRecoveryOtp
        ) {

            resendRecoveryOtp.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.preventDefault();

                    resendRecoveryCode();
                }
            );
        }


        if (
            newPasswordForm
        ) {

            newPasswordForm.addEventListener(
                "submit",
                function (
                    event
                ) {

                    event.preventDefault();

                    resetPassword();
                }
            );
        }


        if (
            newPassword
        ) {

            newPassword.addEventListener(
                "input",
                function () {

                    updatePasswordMeter();

                    hideMessage(
                        passwordMessage
                    );
                }
            );
        }


        if (
            confirmNewPassword
        ) {

            confirmNewPassword.addEventListener(
                "input",
                function () {

                    hideMessage(
                        passwordMessage
                    );
                }
            );
        }


        if (
            recoveryLoginButton
        ) {

            recoveryLoginButton.addEventListener(
                "click",
                function () {

                    continueToLogin();
                }
            );
        }
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        loadSavedState();


        initializeOtpInputs();


        initializePasswordToggles();


        initializeEvents();


        displayDestination();


        /*
         * Recovery starts on OTP step.
         */

        showStep(
            "otp"
        );


        disableOtpInputs();


        /*
         * If identity was already saved from the
         * verification/recovery flow, request the
         * recovery OTP automatically.
         *
         * Otherwise the backend cannot know which
         * account to recover.
         */

        if (
            resolveIdentity()
        ) {

            await requestRecoveryOtp();

        } else {

            showMessage(
                recoveryMessage,
                "Enter your registered Gmail, phone number, or username to begin account recovery.",
                "info"
            );
        }
    }


    /* =====================================================
       PUBLIC RECOVERY API
       ===================================================== */

    window.StockFlowRecovery = {

        requestOtp:
            requestRecoveryOtp,

        resendOtp:
            resendRecoveryCode,

        verifyOtp:
            verifyRecoveryCode,

        resetPassword:
            resetPassword,

        getOtp:
            getOtp,

        setOtp:
            setOtp,

        getState:
            function () {

                return {
                    ...state
                };
            }
    };


    /* =====================================================
       START
       ===================================================== */

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
