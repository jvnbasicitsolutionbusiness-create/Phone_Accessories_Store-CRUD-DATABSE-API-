/* =========================================================
   STOCKFLOW — OTP VERIFICATION CONTROLLER
   File: otp.js

   Purpose:
   - 6-digit OTP verification
   - Real backend verification
   - Resend OTP
   - Countdown timer
   - OTP input handling
   - Verification state
   - Prevent duplicate submissions

   Canonical verification page:
   - verify.html

   Legacy compatibility:
   - verify-otp.html redirects to verify.html
   ========================================================= */

(function () {

    "use strict";


    /* =========================================================
       DEPENDENCIES
       ========================================================= */

    const API =
        window.StockFlowAPI ||
        window.API;

    const Auth =
        window.StockFlowAuth ||
        window.Auth;

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

    const DEFAULT_COOLDOWN =
        Number(
            CONFIG.AUTH?.OTP_RESEND_COOLDOWN_SECONDS ||
            60
        );

    /*
     * verify.html is now the canonical verification page.
     */
    const OTP_PAGE =
        "verify.html";

    const LOGIN_PAGE =
        CONFIG.ROUTES?.LOGIN ||
        "auth.html#login";


    /* =========================================================
       STATE
       ========================================================= */

    let verificationInProgress =
        false;

    let resendInProgress =
        false;

    let countdownTimer =
        null;

    let remainingSeconds =
        DEFAULT_COOLDOWN;


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


    function getOtpInput() {

        return getElement(
            "#otp",
            "#otpCode",
            "#verificationCode",
            "[name='otp']",
            "[name='code']"
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


    function getResendButton() {

        return getElement(
            "#resendOtpBtn",
            "#resendButton",
            "#resendBtn",
            "[data-resend-otp]"
        );

    }


    function getTimerElement() {

        return getElement(
            "#otpTimer",
            "#countdown",
            "#timer",
            "[data-otp-timer]"
        );

    }


    function getMessageElement() {

        return getElement(
            "#otpMessage",
            "#authAlert",
            "#message",
            "#alert",
            ".otp-message",
            ".auth-alert"
        );

    }


    /* =========================================================
       PAGE DETECTION
       ========================================================= */

    function isVerificationPage() {

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        return (
            path === "verify.html" ||
            path === "verify-otp.html"
        );

    }


    /* =========================================================
       MESSAGE HANDLING
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

        element.style.display =
            "none";

        element.classList.remove(
            "success",
            "error",
            "info"
        );

    }


    /* =========================================================
       OTP STATE
       ========================================================= */

    function getOtpState() {

        if (
            Auth &&
            typeof Auth.getOtpState ===
                "function"
        ) {

            return Auth.getOtpState();

        }

        return {

            uid:
                sessionStorage.getItem(
                    "STOCKFLOW_OTP_UID"
                ) || "",

            email:
                sessionStorage.getItem(
                    "STOCKFLOW_OTP_EMAIL"
                ) || "",

            phone:
                sessionStorage.getItem(
                    "STOCKFLOW_OTP_PHONE"
                ) || "",

            channel:
                sessionStorage.getItem(
                    "STOCKFLOW_OTP_CHANNEL"
                ) || ""

        };

    }


    function hasVerificationState() {

        const state =
            getOtpState();

        return Boolean(
            state.uid ||
            state.email ||
            state.phone
        );

    }


    /* =========================================================
       INPUT SANITIZATION
       ========================================================= */

    function sanitizeOtp(value) {

        return String(
            value || ""
        )
            .replace(/\D/g, "")
            .substring(
                0,
                OTP_LENGTH
            );

    }


    /* =========================================================
       OTP INPUT
       ========================================================= */

    function setupOtpInput() {

        const input =
            getOtpInput();

        if (!input) {
            return;
        }


        input.setAttribute(
            "maxlength",
            OTP_LENGTH
        );

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
            function () {

                input.value =
                    sanitizeOtp(
                        input.value
                    );

                clearMessage();

                updateVerifyButton();

            }
        );


        input.addEventListener(
            "keydown",
            function (event) {

                const allowedKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "Tab",
                    "Home",
                    "End"
                ];


                if (
                    allowedKeys.includes(
                        event.key
                    )
                ) {
                    return;
                }


                if (
                    (
                        event.ctrlKey ||
                        event.metaKey
                    ) &&
                    [
                        "a",
                        "c",
                        "v",
                        "x"
                    ].includes(
                        event.key.toLowerCase()
                    )
                ) {
                    return;
                }


                if (
                    !/^\d$/.test(
                        event.key
                    )
                ) {

                    event.preventDefault();

                }

            }
        );


        input.addEventListener(
            "paste",
            function (event) {

                event.preventDefault();

                const text =
                    event.clipboardData
                        ?.getData("text") ||
                    "";

                input.value =
                    sanitizeOtp(
                        text
                    );

                clearMessage();

                updateVerifyButton();

            }
        );

    }


    /* =========================================================
       VERIFY BUTTON
       ========================================================= */

    function updateVerifyButton() {

        const input =
            getOtpInput();

        const button =
            getVerifyButton();

        if (
            !input ||
            !button
        ) {
            return;
        }


        const valid =
            sanitizeOtp(
                input.value
            ).length === OTP_LENGTH;


        button.disabled =
            !valid ||
            verificationInProgress;

    }


    /* =========================================================
       BUTTON LOADING
       ========================================================= */

    function setButtonLoading(
        button,
        loading,
        loadingText,
        normalText
    ) {

        if (!button) {
            return;
        }


        if (loading) {

            button.disabled =
                true;

            button.classList.add(
                "loading"
            );

            button.textContent =
                loadingText ||
                "Verifying...";

        } else {

            button.disabled =
                false;

            button.classList.remove(
                "loading"
            );

            button.textContent =
                normalText ||
                "Verify Account";

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


        const input =
            getOtpInput();

        if (!input) {

            showMessage(
                "Verification input could not be found.",
                "error"
            );

            return;
        }


        const code =
            sanitizeOtp(
                input.value
            );


        if (
            code.length !==
            OTP_LENGTH
        ) {

            showMessage(
                `Please enter the ${OTP_LENGTH}-digit verification code.`,
                "error"
            );

            input.focus();

            return;
        }


        if (!API) {

            showMessage(
                "STOCKFLOW API is not available. Please reload the page.",
                "error"
            );

            return;
        }


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your verification session has expired. Please register or sign in again.",
                "error"
            );

            return;
        }


        verificationInProgress =
            true;


        const button =
            getVerifyButton();


        setButtonLoading(
            button,
            true,
            "Verifying...",
            "Verify Account"
        );


        clearMessage();


        try {

            let result;


            /*
             * Prefer StockFlowAuth.
             *
             * Auth.verifyOtp() handles:
             * - OTP state
             * - backend verification
             * - session creation
             * - dashboard redirect
             */

            if (
                Auth &&
                typeof Auth.verifyOtp ===
                    "function"
            ) {

                result =
                    await Auth.verifyOtp(
                        code
                    );

            } else {

                const state =
                    getOtpState();

                result =
                    await API.verifyOtp({

                        uid:
                            state.uid,

                        email:
                            state.email,

                        phone:
                            state.phone,

                        otp:
                            code

                    });

            }


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    "Invalid or expired verification code."
                );

            }


            /*
             * Auth.verifyOtp normally redirects
             * after successful verification.
             *
             * This message is only displayed if the
             * backend returned successfully without
             * immediately navigating away.
             */

            showMessage(
                "Verification successful. Redirecting...",
                "success"
            );


        } catch (error) {

            console.error(
                "STOCKFLOW OTP verification error:",
                error
            );


            showMessage(
                error.message ||
                "Verification failed. Please check your code and try again.",
                "error"
            );


            /*
             * Clear incorrect code.
             */

            input.value =
                "";

            updateVerifyButton();

            input.focus();


        } finally {

            verificationInProgress =
                false;


            /*
             * Only restore the button if the page
             * is still active.
             */

            if (
                button &&
                document.body.contains(
                    button
                )
            ) {

                setButtonLoading(
                    button,
                    false,
                    "",
                    "Verify Account"
                );

            }


            updateVerifyButton();

        }

    }


    /* =========================================================
       RESEND OTP
       ========================================================= */

    async function resendOtp() {

        if (
            resendInProgress
        ) {
            return;
        }


        const button =
            getResendButton();


        if (
            button &&
            button.disabled
        ) {
            return;
        }


        if (!API) {

            showMessage(
                "STOCKFLOW API is not available.",
                "error"
            );

            return;
        }


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "Your verification session is missing. Please register or sign in again.",
                "error"
            );

            return;
        }


        resendInProgress =
            true;


        if (button) {

            button.disabled =
                true;

            button.classList.add(
                "loading"
            );

            button.textContent =
                "Sending...";

        }


        clearMessage();


        try {

            let result;


            if (
                Auth &&
                typeof Auth.resendOtp ===
                    "function"
            ) {

                result =
                    await Auth.resendOtp();

            } else {

                const state =
                    getOtpState();

                result =
                    await API.resendOtp({

                        uid:
                            state.uid,

                        email:
                            state.email,

                        phone:
                            state.phone

                    });

            }


            if (
                !result ||
                result.success === false
            ) {

                throw new Error(
                    result?.message ||
                    "Unable to resend verification code."
                );

            }


            /*
             * IMPORTANT:
             *
             * Record when the server request succeeded.
             * This allows the countdown to survive refreshes.
             */

            saveLastSentTime();


            /*
             * Update saved OTP information in case
             * the backend returns refreshed values.
             */

            if (
                Auth &&
                typeof Auth.getOtpState ===
                    "function"
            ) {

                /*
                 * Auth.resendOtp() already updates its
                 * own OTP state.
                 */

            } else {

                saveFallbackOtpState(
                    result
                );

            }


            showMessage(
                getDeliveryMessage(
                    result
                ),
                "success"
            );


            startCountdown(
                result.cooldown ||
                DEFAULT_COOLDOWN
            );


            const input =
                getOtpInput();


            if (input) {

                input.value =
                    "";

                updateVerifyButton();

                input.focus();

            }


        } catch (error) {

            console.error(
                "STOCKFLOW resend OTP error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to resend the verification code.",
                "error"
            );


            enableResendButton();

        } finally {

            resendInProgress =
                false;

        }

    }


    /* =========================================================
       FALLBACK OTP STATE
       ========================================================= */

    function saveFallbackOtpState(
        result
    ) {

        if (!result) {
            return;
        }


        const state =
            getOtpState();


        if (result.uid) {

            sessionStorage.setItem(
                "STOCKFLOW_OTP_UID",
                result.uid
            );

        }


        if (
            result.email ||
            state.email
        ) {

            sessionStorage.setItem(
                "STOCKFLOW_OTP_EMAIL",
                result.email ||
                state.email
            );

        }


        if (
            result.phone ||
            state.phone
        ) {

            sessionStorage.setItem(
                "STOCKFLOW_OTP_PHONE",
                result.phone ||
                state.phone
            );

        }


        if (
            result.channel ||
            state.channel
        ) {

            sessionStorage.setItem(
                "STOCKFLOW_OTP_CHANNEL",
                result.channel ||
                state.channel
            );

        }

    }


    /* =========================================================
       DELIVERY MESSAGE
       ========================================================= */

    function getDeliveryMessage(
        result
    ) {

        const state =
            getOtpState();


        const channel =
            String(
                result?.channel ||
                state.channel ||
                "BOTH"
            ).toUpperCase();


        if (
            channel ===
            "SMS"
        ) {

            return (
                "A new verification code has been sent to your phone."
            );

        }


        if (
            channel === "EMAIL" ||
            channel === "GMAIL"
        ) {

            return (
                "A new verification code has been sent to your email."
            );

        }


        if (
            channel ===
            "BOTH"
        ) {

            return (
                "A new verification code has been sent to your email and phone."
            );

        }


        return (
            "A new verification code has been sent."
        );

    }


    /* =========================================================
       COUNTDOWN
       ========================================================= */

    function startCountdown(
        seconds
    ) {

        stopCountdown();


        remainingSeconds =
            Math.max(
                0,
                Number(seconds) ||
                    DEFAULT_COOLDOWN
            );


        updateCountdownUI();


        const resendButton =
            getResendButton();


        if (resendButton) {

            resendButton.disabled =
                true;

        }


        countdownTimer =
            setInterval(
                function () {

                    remainingSeconds--;

                    updateCountdownUI();


                    if (
                        remainingSeconds <=
                        0
                    ) {

                        stopCountdown();

                        enableResendButton();

                    }

                },
                1000
            );

    }


    function stopCountdown() {

        if (
            countdownTimer
        ) {

            clearInterval(
                countdownTimer
            );

            countdownTimer =
                null;

        }

    }


    function updateCountdownUI() {

        const timer =
            getTimerElement();


        if (!timer) {
            return;
        }


        if (
            remainingSeconds <=
            0
        ) {

            timer.textContent =
                "You can request another code now.";

            return;

        }


        const minutes =
            Math.floor(
                remainingSeconds /
                    60
            );


        const seconds =
            remainingSeconds %
            60;


        const formattedSeconds =
            String(seconds)
                .padStart(
                    2,
                    "0"
                );


        timer.textContent =
            `You can request another code in ${minutes}:${formattedSeconds}`;

    }


    function enableResendButton() {

        const button =
            getResendButton();


        if (!button) {
            return;
        }


        button.disabled =
            false;

        button.classList.remove(
            "loading"
        );

        button.textContent =
            "Resend Code";


        updateCountdownUI();

    }


    /* =========================================================
       LAST OTP SENT
       ========================================================= */

    function saveLastSentTime() {

        sessionStorage.setItem(
            "STOCKFLOW_OTP_LAST_SENT",
            String(
                Date.now()
            )
        );

    }


    /* =========================================================
       INITIALIZE COUNTDOWN
       ========================================================= */

    function initializeCountdown() {

        const lastSent =
            sessionStorage.getItem(
                "STOCKFLOW_OTP_LAST_SENT"
            );


        /*
         * If there is no recorded send time,
         * start a fresh cooldown.
         */

        if (!lastSent) {

            startCountdown(
                DEFAULT_COOLDOWN
            );

            return;

        }


        const elapsed =
            Math.floor(
                (
                    Date.now() -
                    Number(lastSent)
                ) / 1000
            );


        const remaining =
            DEFAULT_COOLDOWN -
            elapsed;


        if (
            remaining > 0
        ) {

            startCountdown(
                remaining
            );

        } else {

            enableResendButton();

        }

    }


    /* =========================================================
       DISPLAY DESTINATION
       ========================================================= */

    function displayDestination() {

        const state =
            getOtpState();


        document
            .querySelectorAll(
                "[data-otp-email]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        maskEmail(
                            state.email
                        );

                }
            );


        document
            .querySelectorAll(
                "[data-otp-phone]"
            )
            .forEach(
                function (element) {

                    element.textContent =
                        maskPhone(
                            state.phone
                        );

                }
            );


        document
            .querySelectorAll(
                "[data-otp-destination]"
            )
            .forEach(
                function (element) {

                    const channel =
                        String(
                            state.channel ||
                            "BOTH"
                        ).toUpperCase();


                    if (
                        channel ===
                        "SMS"
                    ) {

                        element.textContent =
                            maskPhone(
                                state.phone
                            );

                    } else if (
                        channel === "EMAIL" ||
                        channel === "GMAIL"
                    ) {

                        element.textContent =
                            maskEmail(
                                state.email
                            );

                    } else {

                        const email =
                            maskEmail(
                                state.email
                            );

                        const phone =
                            maskPhone(
                                state.phone
                            );


                        if (
                            state.email &&
                            state.phone
                        ) {

                            element.textContent =
                                `${email} and ${phone}`;

                        } else if (
                            state.email
                        ) {

                            element.textContent =
                                email;

                        } else if (
                            state.phone
                        ) {

                            element.textContent =
                                phone;

                        } else {

                            element.textContent =
                                "your registered contact information";

                        }

                    }

                }
            );

    }


    /* =========================================================
       MASK EMAIL
       ========================================================= */

    function maskEmail(
        email
    ) {

        if (!email) {

            return "your email";

        }


        const parts =
            String(email)
                .split("@");


        if (
            parts.length !==
            2
        ) {

            return email;

        }


        const name =
            parts[0];

        const domain =
            parts[1];


        if (
            name.length <=
            2
        ) {

            return (
                name.charAt(0) +
                "*".repeat(
                    Math.max(
                        1,
                        name.length - 1
                    )
                ) +
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


    /* =========================================================
       MASK PHONE
       ========================================================= */

    function maskPhone(
        phone
    ) {

        if (!phone) {

            return "your phone";

        }


        const value =
            String(phone);


        if (
            value.length <=
            4
        ) {

            return "*".repeat(
                value.length
            );

        }


        return (
            "*".repeat(
                value.length - 4
            ) +
            value.slice(-4)
        );

    }


    /* =========================================================
       ENTER KEY
       ========================================================= */

    function setupEnterKey() {

        const input =
            getOtpInput();


        if (!input) {
            return;
        }


        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    verifyOtp();

                }

            }
        );

    }


    /* =========================================================
       RESEND BUTTON
       ========================================================= */

    function setupResendButton() {

        const button =
            getResendButton();


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                resendOtp();

            }
        );

    }


    /* =========================================================
       VERIFY BUTTON
       ========================================================= */

    function setupVerifyButton() {

        const button =
            getVerifyButton();


        if (!button) {
            return;
        }


        /*
         * The form submit handler is the primary handler.
         * We don't attach another click verification handler.
         *
         * This prevents duplicate API requests.
         */

    }


    /* =========================================================
       OTP FORM
       ========================================================= */

    function setupOtpForm() {

        const form =
            getElement(
                "#otpForm",
                "#verifyOtpForm",
                "form[data-otp-form]"
            );


        if (!form) {
            return;
        }


        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                verifyOtp();

            }
        );

    }


    /* =========================================================
       BACK TO LOGIN
       ========================================================= */

    function setupBackToLogin() {

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-back-login]"
                    );


                if (!button) {
                    return;
                }


                event.preventDefault();


                if (
                    Auth &&
                    typeof Auth.clearOtpState ===
                        "function"
                ) {

                    Auth.clearOtpState();

                } else {

                    sessionStorage.removeItem(
                        "STOCKFLOW_OTP_UID"
                    );

                    sessionStorage.removeItem(
                        "STOCKFLOW_OTP_EMAIL"
                    );

                    sessionStorage.removeItem(
                        "STOCKFLOW_OTP_PHONE"
                    );

                    sessionStorage.removeItem(
                        "STOCKFLOW_OTP_CHANNEL"
                    );

                }


                sessionStorage.removeItem(
                    "STOCKFLOW_OTP_LAST_SENT"
                );


                window.location.replace(
                    LOGIN_PAGE
                );

            }
        );

    }


    /* =========================================================
       PAGE VALIDATION
       ========================================================= */

    function validateOtpPage() {

        if (
            !isVerificationPage()
        ) {
            return;
        }


        /*
         * verify-otp.html should normally redirect
         * before this script gets a chance to initialize.
         *
         * verify.html is the canonical page.
         */

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        if (
            path ===
            "verify-otp.html"
        ) {

            window.location.replace(
                OTP_PAGE
            );

            return;

        }


        if (
            !hasVerificationState()
        ) {

            showMessage(
                "No active verification request was found. Please register or sign in again.",
                "error"
            );


            setTimeout(
                function () {

                    window.location.replace(
                        LOGIN_PAGE
                    );

                },
                2500
            );

        }

    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    function initialize() {

        if (
            !isVerificationPage()
        ) {
            return;
        }


        /*
         * Legacy page → canonical page.
         */

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        if (
            path ===
            "verify-otp.html"
        ) {

            window.location.replace(
                OTP_PAGE
            );

            return;

        }


        setupOtpInput();

        setupVerifyButton();

        setupResendButton();

        setupOtpForm();

        setupEnterKey();

        setupBackToLogin();


        displayDestination();

        validateOtpPage();


        if (
            hasVerificationState()
        ) {

            initializeCountdown();

        }

    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.StockFlowOTP = {

        verify:
            verifyOtp,

        resend:
            resendOtp,

        startCountdown:
            startCountdown,

        stopCountdown:
            stopCountdown,

        getState:
            getOtpState,

        sanitize:
            sanitizeOtp,

        maskEmail:
            maskEmail,

        maskPhone:
            maskPhone

    };


    window.OTP =
        window.StockFlowOTP;


    /* =========================================================
       DOM READY
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

})();
