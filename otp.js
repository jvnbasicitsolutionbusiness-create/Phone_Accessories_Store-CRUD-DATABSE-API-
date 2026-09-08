/*
=========================================================
STOCKFLOW OTP VERIFICATION CONTROLLER
Phone Accessories Inventory Management System
=========================================================

FLOW
----
register.js
    ↓
Google Apps Script
    ↓
Backend generates OTP
    ↓
Google Sheets + Firebase
    ↓
verify.html
    ↓
otp.js
    ↓
StockFlowAPI.prepareOtp()
    ↓
Backend returns demoOtp in DEMO_MODE
    ↓
3–5 second demo delay
    ↓
Six OTP boxes are automatically filled
    ↓
Verify Account
    ↓
Google Apps Script verifies OTP
    ↓
Employee Dashboard


IMPORTANT
---------
This is a MIDTERM / DEMO implementation.

The browser does NOT generate the OTP.

The backend is responsible for generating and storing
the OTP.

In DEMO_MODE, the backend may return the generated OTP
to this page so that the six boxes can automatically
display it.

No real Gmail or SMS delivery is claimed.
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

    const isVerificationPage =
        document.getElementById("otpForm") ||
        document.querySelector(".otp-digit") ||
        document.getElementById("verifyOtpBtn");


    if (!isVerificationPage) {

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


    const OTP_EXPIRATION_MINUTES =
        Number(
            AUTH_CONFIG.OTP_EXPIRATION_MINUTES ||
            10
        );


    const MAX_OTP_ATTEMPTS =
        Number(
            AUTH_CONFIG.MAX_OTP_ATTEMPTS ||
            4
        );


    const OTP_LOCK_MINUTES =
        Number(
            AUTH_CONFIG.OTP_LOCK_MINUTES ||
            30
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
       DOM HELPERS
       ===================================================== */

    const $ = function (id) {

        return document.getElementById(id);
    };


    const $$ = function (selector) {

        return Array.from(
            document.querySelectorAll(selector)
        );
    };


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const otpForm =
        $("otpForm");


    const verifyButton =
        $("verifyOtpBtn") ||
        $("verifyButton") ||
        $("verifyBtn") ||
        document.querySelector(
            "[data-verify-otp]"
        );


    const otpMessage =
        $("otpMessage");


    const otpHelp =
        $("otpHelp");


    const verificationDescription =
        $("verificationDescription");


    const emailDeliveryStatus =
        $("emailDeliveryStatus");


    const phoneDeliveryStatus =
        $("phoneDeliveryStatus");


    const emailTimer =
        $("emailOtpTimer");


    const phoneTimer =
        $("phoneOtpTimer");


    const emailResendButton =
        $("resendEmailOtpBtn") ||
        document.querySelector(
            "[data-resend-email-otp]"
        );


    const phoneResendButton =
        $("resendPhoneOtpBtn") ||
        document.querySelector(
            "[data-resend-phone-otp]"
        );


    /* =====================================================
       OTP INPUTS
       ===================================================== */

    let otpInputs =
        $$(".otp-digit");


    /*
     * If the page ever changes the input class, support
     * common alternatives as a fallback.
     */

    if (
        otpInputs.length !== OTP_LENGTH
    ) {

        const fallbackInputs =
            $$(
                "#otpForm input[inputmode='numeric']"
            );

        if (
            fallbackInputs.length >=
            OTP_LENGTH
        ) {

            otpInputs =
                fallbackInputs.slice(
                    0,
                    OTP_LENGTH
                );
        }
    }


    const hiddenOtp =
        $("otp") ||
        $("otpCode") ||
        $("verificationCode");


    /* =====================================================
       STORAGE KEYS
       ===================================================== */

    const KEY = {

        UID:
            STORAGE.OTP_UID ||
            "STOCKFLOW_OTP_UID",

        EMAIL:
            STORAGE.OTP_EMAIL ||
            "STOCKFLOW_OTP_EMAIL",

        PHONE:
            STORAGE.OTP_PHONE ||
            "STOCKFLOW_OTP_PHONE",

        USERNAME:
            STORAGE.OTP_USERNAME ||
            "STOCKFLOW_OTP_USERNAME",

        IDENTITY:
            STORAGE.OTP_IDENTITY ||
            "STOCKFLOW_OTP_IDENTITY",

        CHANNEL:
            STORAGE.OTP_CHANNEL ||
            "STOCKFLOW_OTP_CHANNEL",

        CODE:
            STORAGE.OTP_CODE ||
            "STOCKFLOW_OTP_CODE",

        READY:
            STORAGE.OTP_READY ||
            "STOCKFLOW_OTP_CODE_READY",

        EMAIL_SENT:
            STORAGE.OTP_EMAIL_SENT ||
            "STOCKFLOW_OTP_EMAIL_SENT",

        PHONE_SENT:
            STORAGE.OTP_PHONE_SENT ||
            "STOCKFLOW_OTP_PHONE_SENT"
    };


    /* =====================================================
       RUNTIME STATE
       ===================================================== */

    const state = {

        uid:
            "",

        username:
            "",

        email:
            "",

        phone:
            "",

        identity:
            "",

        channel:
            "email",

        demoOtp:
            "",

        prepared:
            false,

        verifying:
            false,

        preparing:
            false,

        resending:
            false,

        verified:
            false,

        emailCooldown:
            0,

        phoneCooldown:
            0,

        emailTimer:
            null,

        phoneTimer:
            null,

        demoTimer:
            null
    };


    /* =====================================================
       SAFE STORAGE
       ===================================================== */

    function storageGet(
        storage,
        key
    ) {

        try {

            return storage.getItem(
                key
            ) || "";

        } catch (error) {

            return "";
        }
    }


    function storageSet(
        storage,
        key,
        value
    ) {

        try {

            storage.setItem(
                key,
                String(value ?? "")
            );

        } catch (error) {

            console.warn(
                "[STOCKFLOW OTP] Storage unavailable:",
                error
            );
        }
    }


    function storageRemove(
        storage,
        key
    ) {

        try {

            storage.removeItem(
                key
            );

        } catch (error) {

            /* Ignore storage errors. */
        }
    }


    function getSession(
        key
    ) {

        return storageGet(
            window.sessionStorage,
            key
        );
    }


    function setSession(
        key,
        value
    ) {

        storageSet(
            window.sessionStorage,
            key,
            value
        );
    }


    function removeSession(
        key
    ) {

        storageRemove(
            window.sessionStorage,
            key
        );
    }


    /* =====================================================
       LOCAL STORAGE FALLBACK
       ===================================================== */

    function getSavedValue(
        key
    ) {

        const sessionValue =
            getSession(key);

        if (sessionValue) {

            return sessionValue;
        }


        return storageGet(
            window.localStorage,
            key
        );
    }


    function saveValue(
        key,
        value
    ) {

        setSession(
            key,
            value
        );


        /*
         * Keep OTP verification identity available
         * if the page is refreshed.
         */

        storageSet(
            window.localStorage,
            key,
            value
        );
    }


    function removeSavedValue(
        key
    ) {

        removeSession(key);

        storageRemove(
            window.localStorage,
            key
        );
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

        return String(value).trim();
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
       NORMALIZE PHONE
       ===================================================== */

    function normalizePhone(
        value
    ) {

        return clean(
            value
        ).replace(
            /[\s()-]/g,
            ""
        );
    }


    /* =====================================================
       LOAD VERIFICATION STATE
       ===================================================== */

    function loadState() {

        state.uid =
            getSavedValue(
                KEY.UID
            );


        state.username =
            getSavedValue(
                KEY.USERNAME
            );


        state.email =
            getSavedValue(
                KEY.EMAIL
            );


        state.phone =
            getSavedValue(
                KEY.PHONE
            );


        state.identity =
            getSavedValue(
                KEY.IDENTITY
            );


        state.channel =
            getSavedValue(
                KEY.CHANNEL
            ) ||
            "email";


        /*
         * If identity is missing, derive it.
         */

        if (!state.identity) {

            state.identity =
                firstValue(
                    state.username,
                    state.email,
                    state.phone,
                    state.uid
                );
        }


        /*
         * Keep identity synchronized.
         */

        if (state.identity) {

            saveValue(
                KEY.IDENTITY,
                state.identity
            );
        }
    }


    /* =====================================================
       SAVE VERIFICATION STATE
       ===================================================== */

    function saveState() {

        saveValue(
            KEY.UID,
            state.uid
        );


        saveValue(
            KEY.USERNAME,
            state.username
        );


        saveValue(
            KEY.EMAIL,
            state.email
        );


        saveValue(
            KEY.PHONE,
            state.phone
        );


        saveValue(
            KEY.IDENTITY,
            state.identity
        );


        saveValue(
            KEY.CHANNEL,
            state.channel
        );
    }


    /* =====================================================
       GET IDENTITY
       ===================================================== */

    function resolveIdentity() {

        state.identity =
            firstValue(

                state.identity,

                state.username,

                state.email,

                state.phone,

                state.uid
            );


        return state.identity;
    }


    /* =====================================================
       SHOW MESSAGE
       ===================================================== */

    function showMessage(
        message,
        type = "error"
    ) {

        if (!otpMessage) {

            return;
        }


        otpMessage.textContent =
            message || "";


        otpMessage.classList.remove(
            "success",
            "error",
            "warning",
            "info",
            "show"
        );


        otpMessage.classList.add(
            type
        );


        otpMessage.classList.add(
            "show"
        );


        otpMessage.hidden =
            false;


        otpMessage.setAttribute(
            "role",
            "alert"
        );
    }


    /* =====================================================
       HIDE MESSAGE
       ===================================================== */

    function hideMessage() {

        if (!otpMessage) {

            return;
        }


        otpMessage.textContent =
            "";


        otpMessage.classList.remove(
            "success",
            "error",
            "warning",
            "info",
            "show"
        );


        otpMessage.hidden =
            true;
    }


    /* =====================================================
       SET BUTTON LOADING
       ===================================================== */

    function setButtonLoading(
        button,
        loading,
        loadingText
    ) {

        if (!button) {

            return;
        }


        if (loading) {

            if (
                !button.dataset.originalText
            ) {

                button.dataset.originalText =
                    button.textContent;
            }


            button.disabled =
                true;


            button.textContent =
                loadingText ||
                "Please wait...";

        } else {

            button.disabled =
                false;


            if (
                button.dataset.originalText
            ) {

                button.textContent =
                    button.dataset.originalText;
            }
        }
    }


    /* =====================================================
       OTP INPUT VALUE
       ===================================================== */

    function getOtpValue() {

        if (
            otpInputs.length >=
            OTP_LENGTH
        ) {

            return otpInputs
                .slice(
                    0,
                    OTP_LENGTH
                )
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


        if (hiddenOtp) {

            return clean(
                hiddenOtp.value
            ).replace(
                /\D/g,
                ""
            );
        }


        return "";
    }


    /* =====================================================
       SET OTP VALUE
       ===================================================== */

    function setOtpValue(
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


        /*
         * Fill six visible boxes.
         */

        otpInputs.forEach(
            function (
                input,
                index
            ) {

                input.value =
                    normalized[index] ||
                    "";
            }
        );


        /*
         * Keep hidden OTP field synchronized.
         */

        if (hiddenOtp) {

            hiddenOtp.value =
                normalized;
        }


        updateVerifyButton();
    }


    /* =====================================================
       ENABLE OTP INPUTS
       ===================================================== */

    function enableOtpInputs() {

        otpInputs.forEach(
            function (input) {

                input.disabled =
                    false;
            }
        );
    }


    /* =====================================================
       DISABLE OTP INPUTS
       ===================================================== */

    function disableOtpInputs() {

        otpInputs.forEach(
            function (input) {

                input.disabled =
                    true;
            }
        );


        if (verifyButton) {

            verifyButton.disabled =
                true;
        }
    }


    /* =====================================================
       UPDATE VERIFY BUTTON
       ===================================================== */

    function updateVerifyButton() {

        if (!verifyButton) {

            return;
        }


        const otp =
            getOtpValue();


        verifyButton.disabled =
            state.verifying ||
            otp.length !== OTP_LENGTH;
    }


    /* =====================================================
       OTP INPUT EVENTS
       ===================================================== */

    function initializeOtpInputs() {

        if (
            !otpInputs.length
        ) {

            return;
        }


        otpInputs.forEach(
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


                input.setAttribute(
                    "autocomplete",
                    index === 0
                        ? "one-time-code"
                        : "off"
                );


                input.addEventListener(
                    "input",
                    function () {

                        const value =
                            clean(
                                input.value
                            ).replace(
                                /\D/g,
                                ""
                            );


                        input.value =
                            value.slice(
                                0,
                                1
                            );


                        if (
                            input.value &&
                            index <
                                otpInputs.length -
                                1
                        ) {

                            otpInputs[
                                index + 1
                            ].focus();
                        }


                        updateHiddenOtp();

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

                            otpInputs[
                                index - 1
                            ].focus();
                        }


                        if (
                            event.key ===
                            "ArrowLeft" &&
                            index > 0
                        ) {

                            otpInputs[
                                index - 1
                            ].focus();
                        }


                        if (
                            event.key ===
                            "ArrowRight" &&
                            index <
                                otpInputs.length -
                                1
                        ) {

                            otpInputs[
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


                        setOtpValue(
                            pasted
                        );


                        const targetIndex =
                            Math.min(
                                pasted.length,
                                otpInputs.length
                            ) - 1;


                        if (
                            targetIndex >= 0
                        ) {

                            otpInputs[
                                targetIndex
                            ].focus();
                        }
                    }
                );
            }
        );
    }


    /* =====================================================
       UPDATE HIDDEN OTP
       ===================================================== */

    function updateHiddenOtp() {

        if (!hiddenOtp) {

            return;
        }


        hiddenOtp.value =
            getOtpValue();
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
            max === min
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
       RESPONSE DATA EXTRACTION
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
       EXTRACT DEMO OTP
       ===================================================== */

    function extractDemoOtp(
        response
    ) {

        const data =
            getResponseData(
                response
            );


        const possibleOtp =
            firstValue(

                data.demoOtp,

                data.demoOTP,

                data.generatedOtp,

                data.generatedOTP,

                data.otp,

                data.OTP,

                data.code,

                data.verificationCode
            );


        const normalized =
            clean(
                possibleOtp
            ).replace(
                /\D/g,
                ""
            );


        if (
            normalized.length ===
            OTP_LENGTH
        ) {

            return normalized;
        }


        return "";
    }


    /* =====================================================
       SAVE DEMO OTP
       ===================================================== */

    function saveDemoOtp(
        otp
    ) {

        const normalized =
            clean(
                otp
            ).replace(
                /\D/g,
                ""
            );


        if (
            normalized.length !==
            OTP_LENGTH
        ) {

            return;
        }


        state.demoOtp =
            normalized;


        /*
         * Demo only.
         *
         * This is intentionally stored because the
         * midterm requires automatic display of the
         * generated OTP.
         */

        if (DEMO_MODE) {

            saveValue(
                KEY.CODE,
                normalized
            );

            saveValue(
                KEY.READY,
                "true"
            );
        }
    }


    /* =====================================================
       CLEAR DEMO OTP
       ===================================================== */

    function clearDemoOtp() {

        state.demoOtp =
            "";


        removeSavedValue(
            KEY.CODE
        );


        removeSavedValue(
            KEY.READY
        );
    }


    /* =====================================================
       DISPLAY DEMO OTP
       ===================================================== */

    function displayDemoOtp(
        code
    ) {

        if (
            !DEMO_MODE ||
            !DEMO_AUTO_FILL
        ) {

            return false;
        }


        const normalized =
            clean(
                code
            ).replace(
                /\D/g,
                ""
            );


        if (
            normalized.length !==
            OTP_LENGTH
        ) {

            return false;
        }


        saveDemoOtp(
            normalized
        );


        enableOtpInputs();

        setOtpValue(
            normalized
        );


        state.prepared =
            true;


        showMessage(
            "Demo verification code prepared. The code has been filled automatically for this midterm simulation.",
            "success"
        );


        if (otpHelp) {

            otpHelp.textContent =
                "Enter the generated verification code shown above, then click Verify Account.";
        }


        if (
            otpInputs.length
        ) {

            otpInputs[0].focus();
        }


        updateVerifyButton();


        return true;
    }


    /* =====================================================
       DISPLAY WAITING MESSAGE
       ===================================================== */

    function displayPreparingMessage() {

        hideMessage();


        if (otpHelp) {

            otpHelp.textContent =
                "Preparing your verification code...";
        }


        disableOtpInputs();
    }


    /* =====================================================
       DISPLAY DESTINATIONS
       ===================================================== */

    function displayDestinations() {

        const email =
            clean(
                state.email
            );


        const phone =
            normalizePhone(
                state.phone
            );


        if (
            verificationDescription
        ) {

            if (email) {

                verificationDescription.textContent =
                    "Choose a verification method, then enter the 6-digit verification code.";
            } else {

                verificationDescription.textContent =
                    "Choose a verification method, then enter the 6-digit verification code.";
            }
        }


        /*
         * IMPORTANT:
         * Do not claim that an actual email or SMS was sent.
         */

        if (
            emailDeliveryStatus
        ) {

            if (email) {

                emailDeliveryStatus.textContent =
                    "Demo email verification is available for " +
                    maskEmail(email) +
                    ".";

            } else {

                emailDeliveryStatus.textContent =
                    "No Gmail address is available.";
            }
        }


        if (
            phoneDeliveryStatus
        ) {

            if (phone) {

                phoneDeliveryStatus.textContent =
                    "Demo phone verification is available for " +
                    maskPhone(phone) +
                    ".";

            } else {

                phoneDeliveryStatus.textContent =
                    "No mobile number is available.";
            }
        }
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
            normalizePhone(
                phone
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
       FIND VERIFICATION METHOD CARDS
       ===================================================== */

    function getMethodCards() {

        return $$(
            ".verification-method"
        );
    }


    /* =====================================================
       SET ACTIVE METHOD
       ===================================================== */

    function setActiveChannel(
        channel
    ) {

        if (
            channel !== "email" &&
            channel !== "phone"
        ) {

            return;
        }


        state.channel =
            channel;


        saveValue(
            KEY.CHANNEL,
            channel
        );


        getMethodCards()
            .forEach(
                function (
                    card
                ) {

                    const cardChannel =
                        card.dataset
                            .verificationMethod;


                    card.classList.toggle(
                        "active",
                        cardChannel ===
                            channel
                    );
                }
            );
    }


    /* =====================================================
       INITIALIZE CLICKABLE METHOD CARDS
       ===================================================== */

    function initializeMethodCards() {

        const cards =
            getMethodCards();


        cards.forEach(
            function (
                card
            ) {

                const channel =
                    card.dataset
                        .verificationMethod;


                if (
                    channel !==
                        "email" &&
                    channel !==
                        "phone"
                ) {

                    return;
                }


                card.setAttribute(
                    "role",
                    "button"
                );


                card.setAttribute(
                    "tabindex",
                    "0"
                );


                card.addEventListener(
                    "click",
                    function (
                        event
                    ) {

                        /*
                         * If the user clicked a button
                         * inside the card, let that button
                         * perform its own action.
                         */

                        if (
                            event.target.closest(
                                "button"
                            )
                        ) {

                            return;
                        }


                        setActiveChannel(
                            channel
                        );


                        sendCode(
                            channel
                        );
                    }
                );


                card.addEventListener(
                    "keydown",
                    function (
                        event
                    ) {

                        if (
                            event.key ===
                                "Enter" ||
                            event.key ===
                                " "
                        ) {

                            event.preventDefault();


                            setActiveChannel(
                                channel
                            );


                            sendCode(
                                channel
                            );
                        }
                    }
                );
            }
        );


        setActiveChannel(
            state.channel
        );
    }


    /* =====================================================
       MOVE EMAIL ACTION INTO EMAIL CARD
       ===================================================== */

    function positionEmailAction() {

        if (
            !emailResendButton
        ) {

            return;
        }


        const emailCard =
            document.querySelector(
                '.verification-method[data-verification-method="email"]'
            );


        if (
            !emailCard
        ) {

            return;
        }


        /*
         * If the button already exists inside the
         * email card, nothing needs to be done.
         */

        if (
            emailCard.contains(
                emailResendButton
            )
        ) {

            emailResendButton.classList.add(
                "verification-method-action"
            );

            return;
        }


        /*
         * Move the existing button from the old
         * bottom resend area into the email method.
         *
         * This allows the current HTML to work even
         * before verify.html is updated.
         */

        emailResendButton.classList.add(
            "verification-method-action"
        );


        emailResendButton.textContent =
            "Send code by email";


        emailCard.appendChild(
            emailResendButton
        );


        /*
         * Hide the old wrapper if it became empty.
         */

        const oldWrapper =
            document.querySelector(
                ".otp-resend"
            );


        if (
            oldWrapper &&
            !oldWrapper.textContent.trim()
        ) {

            oldWrapper.hidden =
                true;
        }
    }


    /* =====================================================
       REQUEST BACKEND OTP
       ===================================================== */

    async function requestBackendOtp(
        mode = "prepare"
    ) {

        if (!API) {

            throw new Error(
                "StockFlowAPI is not available."
            );
        }


        const identity =
            resolveIdentity();


        if (!identity) {

            throw new Error(
                "Username or Gmail is required."
            );
        }


        saveState();


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

            channel:
                state.channel
        };


        let response;


        if (
            mode === "resend"
        ) {

            response =
                await API.resendOtp(
                    payload
                );

        } else {

            /*
             * Preferred endpoint.
             */

            try {

                response =
                    await API.prepareOtp(
                        payload
                    );

            } catch (prepareError) {

                /*
                 * Compatibility fallback for an older
                 * backend that only exposes generateOtp.
                 */

                const code =
                    prepareError &&
                    prepareError.code;


                if (
                    code ===
                        "API_ERROR" ||
                    code ===
                        "SERVER_ERROR" ||
                    code ===
                        "ACTION_NOT_FOUND" ||
                    code ===
                        "UNKNOWN_ACTION"
                ) {

                    if (
                        typeof API.generateOtp ===
                        "function"
                    ) {

                        response =
                            await API.generateOtp(
                                payload
                            );

                    } else {

                        throw prepareError;
                    }

                } else {

                    /*
                     * If prepareOtp failed because of
                     * a real server/network problem,
                     * do not hide that error by generating
                     * another request.
                     */

                    throw prepareError;
                }
            }
        }


        return response;
    }


    /* =====================================================
       PREPARE OTP
       ===================================================== */

    async function prepareOtp() {

        if (
            state.preparing ||
            state.prepared
        ) {

            return;
        }


        state.preparing =
            true;


        displayPreparingMessage();


        try {

            const response =
                await requestBackendOtp(
                    "prepare"
                );


            const data =
                getResponseData(
                    response
                );


            /*
             * Save any identity fields returned
             * by the backend.
             */

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


            displayDestinations();


            /*
             * Backend-generated OTP.
             */

            const demoOtp =
                extractDemoOtp(
                    response
                );


            if (
                DEMO_MODE &&
                DEMO_AUTO_FILL &&
                demoOtp
            ) {

                saveDemoOtp(
                    demoOtp
                );


                const delayMs =
                    getDemoDelay();


                if (
                    otpHelp
                ) {

                    otpHelp.textContent =
                        "Your demo verification code is being prepared...";
                }


                /*
                 * Do not fill immediately.
                 *
                 * Midterm requirement:
                 * approximately 3–5 seconds.
                 */

                state.demoTimer =
                    setTimeout(
                        function () {

                            displayDemoOtp(
                                demoOtp
                            );

                        },
                        delayMs
                    );


                return;
            }


            /*
             * Production / non-demo response.
             *
             * The OTP must be entered manually.
             */

            enableOtpInputs();


            state.prepared =
                true;


            if (otpHelp) {

                otpHelp.textContent =
                    "Enter the 6-digit verification code.";
            }


            updateVerifyButton();


        } catch (error) {

            console.error(
                "[STOCKFLOW OTP] Prepare failed:",
                error
            );


            state.prepared =
                false;


            disableOtpInputs();


            const message =
                getErrorMessage(
                    error
                );


            showMessage(
                message,
                "error"
            );


            if (otpHelp) {

                otpHelp.textContent =
                    "We could not prepare your verification code. Please try again.";
            }

        } finally {

            state.preparing =
                false;
        }
    }


    /* =====================================================
       SEND / RESEND CODE
       ===================================================== */

    async function sendCode(
        channel
    ) {

        if (
            channel !== "email" &&
            channel !== "phone"
        ) {

            return;
        }


        if (
            state.resending
        ) {

            return;
        }


        /*
         * Validate destination.
         */

        if (
            channel === "email" &&
            !state.email
        ) {

            showMessage(
                "No Gmail address is available for this account.",
                "error"
            );

            return;
        }


        if (
            channel === "phone" &&
            !state.phone
        ) {

            showMessage(
                "No mobile number is available for this account.",
                "error"
            );

            return;
        }


        const cooldown =
            channel === "email"
                ? state.emailCooldown
                : state.phoneCooldown;


        if (
            cooldown > 0
        ) {

            showMessage(
                "Please wait " +
                cooldown +
                " seconds before requesting another code.",
                "warning"
            );

            return;
        }


        state.channel =
            channel;


        saveValue(
            KEY.CHANNEL,
            channel
        );


        state.resending =
            true;


        const button =
            channel === "email"
                ? emailResendButton
                : phoneResendButton;


        setButtonLoading(
            button,
            true,
            "Preparing..."
        );


        hideMessage();


        try {

            const response =
                await requestBackendOtp(
                    "resend"
                );


            const data =
                getResponseData(
                    response
                );


            /*
             * Update returned account information.
             */

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


            /*
             * Backend-generated OTP.
             */

            const demoOtp =
                extractDemoOtp(
                    response
                );


            if (
                DEMO_MODE &&
                DEMO_AUTO_FILL &&
                demoOtp
            {

                saveDemoOtp(
                    demoOtp
                );


                clearVisibleOtp();


                disableOtpInputs();


                const delayMs =
                    getDemoDelay();


                if (otpHelp) {

                    otpHelp.textContent =
                        "A new demo verification code is being prepared...";
                }


                state.demoTimer =
                    setTimeout(
                        function () {

                            displayDemoOtp(
                                demoOtp
                            );

                        },
                        delayMs
                    );
            } else {

                enableOtpInputs();

                state.prepared =
                    true;

                if (otpHelp) {

                    otpHelp.textContent =
                        "Enter the new 6-digit verification code.";
                }

                updateVerifyButton();
            }


            /*
             * Start cooldown only after the backend
             * successfully generated the new OTP.
             */

            startCooldown(
                channel
            );


            if (
                channel === "email"
            ) {

                showMessage(
                    DEMO_MODE
                        ? "A new demo email verification code is ready."
                        : "A new verification code is ready.",
                    "success"
                );

            } else {

                showMessage(
                    DEMO_MODE
                        ? "A new demo phone verification code is ready."
                        : "A new verification code is ready.",
                    "success"
                );
            }


            displayDestinations();


        } catch (error) {

            console.error(
                "[STOCKFLOW OTP] Resend failed:",
                error
            );


            showMessage(
                getErrorMessage(
                    error
                ),
                "error"
            );

        } finally {

            state.resending =
                false;


            setButtonLoading(
                button,
                false
            );


            updateResendButtons();
        }
    }


    /* =====================================================
       CLEAR VISIBLE OTP
       ===================================================== */

    function clearVisibleOtp() {

        otpInputs.forEach(
            function (
                input
            ) {

                input.value =
                    "";
            }
        );


        if (hiddenOtp) {

            hiddenOtp.value =
                "";
        }


        updateVerifyButton();
    }


    /* =====================================================
       VERIFY OTP
       ===================================================== */

    async function verifyAccount() {

        if (
            state.verifying
        ) {

            return;
        }


        const otp =
            getOtpValue();


        if (
            otp.length !==
            OTP_LENGTH
        ) {

            showMessage(
                "Please enter the complete 6-digit verification code.",
                "error"
            );


            if (
                otpInputs.length
            ) {

                const firstEmpty =
                    otpInputs.find(
                        input =>
                            !input.value
                    );


                (
                    firstEmpty ||
                    otpInputs[0]
                ).focus();
            }


            return;
        }


        const identity =
            resolveIdentity();


        if (!identity) {

            showMessage(
                "Username or Gmail is required.",
                "error"
            );

            return;
        }


        state.verifying =
            true;


        if (verifyButton) {

            verifyButton.disabled =
                true;

            verifyButton.dataset.originalText =
                verifyButton.dataset.originalText ||
                verifyButton.textContent;

            verifyButton.textContent =
                "Verifying...";
        }


        hideMessage();


        try {

            const response =
                await API.verifyOtp(
                    {

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
                            state.channel,

                        otp
                    }
                );


            const data =
                getResponseData(
                    response
                );


            /*
             * Verification succeeded.
             */

            state.verified =
                true;


            /*
             * Save returned session.
             */

            const token =
                firstValue(

                    data.token,

                    data.sessionToken,

                    data.session,

                    data.authToken
                );


            if (token) {

                saveValue(
                    STORAGE.TOKEN ||
                    "STOCKFLOW_TOKEN",
                    token
                );
            }


            /*
             * Save verified user.
             */

            const user =
                data.user ||
                data.account ||
                data.profile ||
                null;


            if (
                user &&
                typeof user ===
                    "object"
            ) {

                try {

                    saveValue(
                        STORAGE.USER ||
                        "STOCKFLOW_USER",
                        JSON.stringify(
                            user
                        )
                    );

                } catch (error) {

                    console.warn(
                        "[STOCKFLOW OTP] Could not save user:",
                        error
                    );
                }
            }


            /*
             * Clear OTP after successful verification.
             */

            clearDemoOtp();


            showMessage(
                "Account verified successfully. Redirecting to the Employee Dashboard...",
                "success"
            );


            /*
             * Short delay allows the success message
             * to be visible.
             */

            setTimeout(
                function () {

                    const dashboard =
                        ROUTES.DASHBOARD ||
                        "dashboard.html";


                    window.location.href =
                        dashboard;

                },
                700
            );


        } catch (error) {

            console.error(
                "[STOCKFLOW OTP] Verification failed:",
                error
            );


            state.verifying =
                false;


            if (verifyButton) {

                verifyButton.textContent =
                    verifyButton.dataset.originalText ||
                    "Verify Account";
            }


            showMessage(
                getErrorMessage(
                    error
                ),
                "error"
            );


            updateVerifyButton();
        }
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


        /*
         * Missing identity.
         */

        if (
            code ===
                "OTP_IDENTITY_MISSING" ||
            message.toLowerCase().includes(
                "username or gmail is required"
            )
        ) {

            return "Username or Gmail is required.";
        }


        /*
         * Invalid OTP.
         */

        if (
            code ===
                "INVALID_OTP" ||
            code ===
                "OTP_INVALID"
        ) {

            return "The verification code is incorrect. Please try again.";
        }


        /*
         * Expired OTP.
         */

        if (
            code ===
                "OTP_EXPIRED"
        ) {

            return "Your verification code has expired. Please request a new code.";
        }


        /*
         * OTP locked.
         */

        if (
            code ===
                "OTP_LOCKED" ||
            code ===
                "ACCOUNT_LOCKED"
        ) {

            return (
                "Verification is temporarily locked. Please try again after " +
                OTP_LOCK_MINUTES +
                " minutes."
            );
        }


        /*
         * Maximum attempts.
         */

        if (
            code ===
                "MAX_ATTEMPTS"
        ) {

            return (
                "You have reached the maximum verification attempts. Please try again after " +
                OTP_LOCK_MINUTES +
                " minutes."
            );
        }


        /*
         * Resend cooldown.
         */

        if (
            code ===
                "OTP_COOLDOWN"
        ) {

            return "Please wait before requesting another verification code.";
        }


        /*
         * User not found.
         */

        if (
            code ===
                "USER_NOT_FOUND" ||
            code ===
                "ACCOUNT_NOT_FOUND"
        ) {

            return "No registered account was found for this verification request.";
        }


        /*
         * Network / API errors.
         */

        if (
            code ===
                "NETWORK_ERROR"
        ) {

            return "Unable to connect to the verification service. Please try again.";
        }


        if (
            code ===
                "TIMEOUT"
        ) {

            return "The verification service took too long to respond. Please try again.";
        }


        if (
            code ===
                "API_URL_MISSING" ||
            code ===
                "API_URL_INVALID"
        ) {

            return "The verification service is not configured correctly.";
        }


        /*
         * Generic server message.
         */

        if (message) {

            return message;
        }


        return "Something went wrong. Please try again.";
    }


    /* =====================================================
       COOLDOWN STORAGE
       ===================================================== */

    function getCooldownKey(
        channel
    ) {

        return (
            channel === "email"
                ? KEY.EMAIL_SENT
                : KEY.PHONE_SENT
        );
    }


    /* =====================================================
       START COOLDOWN
       ===================================================== */

    function startCooldown(
        channel
    ) {

        const now =
            Date.now();


        const key =
            getCooldownKey(
                channel
            );


        saveValue(
            key,
            String(now)
        );


        if (
            channel === "email"
        ) {

            state.emailCooldown =
                RESEND_COOLDOWN;

            runCooldown(
                "email"
            );

        } else {

            state.phoneCooldown =
                RESEND_COOLDOWN;

            runCooldown(
                "phone"
            );
        }
    }


    /* =====================================================
       LOAD COOLDOWN
       ===================================================== */

    function loadCooldown(
        channel
    ) {

        const key =
            getCooldownKey(
                channel
            );


        const raw =
            getSavedValue(
                key
            );


        if (!raw) {

            return 0;
        }


        const timestamp =
            Number(
                raw
            );


        if (
            !Number.isFinite(
                timestamp
            )
        ) {

            return 0;
        }


        const elapsed =
            Math.floor(
                (
                    Date.now() -
                    timestamp
                ) /
                1000
            );


        const remaining =
            RESEND_COOLDOWN -
            elapsed;


        if (
            remaining <= 0
        ) {

            removeSavedValue(
                key
            );

            return 0;
        }


        return remaining;
    }


    /* =====================================================
       RUN COOLDOWN
       ===================================================== */

    function runCooldown(
        channel
    ) {

        if (
            channel === "email"
        ) {

            if (
                state.emailTimer
            ) {

                clearInterval(
                    state.emailTimer
                );
            }


            state.emailTimer =
                setInterval(
                    function () {

                        state.emailCooldown--;

                        if (
                            state.emailCooldown <=
                            0
                        ) {

                            state.emailCooldown =
                                0;


                            clearInterval(
                                state.emailTimer
                            );


                            state.emailTimer =
                                null;


                            removeSavedValue(
                                KEY.EMAIL_SENT
                            );
                        }


                        updateTimerDisplay(
                            "email"
                        );


                        updateResendButtons();

                    },
                    1000
                );

        } else {

            if (
                state.phoneTimer
            ) {

                clearInterval(
                    state.phoneTimer
                );
            }


            state.phoneTimer =
                setInterval(
                    function () {

                        state.phoneCooldown--;


                        if (
                            state.phoneCooldown <=
                            0
                        ) {

                            state.phoneCooldown =
                                0;


                            clearInterval(
                                state.phoneTimer
                            );


                            state.phoneTimer =
                                null;


                            removeSavedValue(
                                KEY.PHONE_SENT
                            );
                        }


                        updateTimerDisplay(
                            "phone"
                        );


                        updateResendButtons();

                    },
                    1000
                );
        }


        updateTimerDisplay(
            channel
        );


        updateResendButtons();
    }


    /* =====================================================
       UPDATE TIMER DISPLAY
       ===================================================== */

    function updateTimerDisplay(
        channel
    ) {

        const seconds =
            channel === "email"
                ? state.emailCooldown
                : state.phoneCooldown;


        const timer =
            channel === "email"
                ? emailTimer
                : phoneTimer;


        if (!timer) {

            return;
        }


        if (
            seconds <= 0
        ) {

            timer.textContent =
                "Ready";

            return;
        }


        const minutes =
            Math.floor(
                seconds / 60
            );


        const remainingSeconds =
            seconds % 60;


        timer.textContent =
            "Resend available in " +
            minutes +
            ":" +
            String(
                remainingSeconds
            ).padStart(
                2,
                "0"
            );
    }


    /* =====================================================
       UPDATE RESEND BUTTONS
       ===================================================== */

    function updateResendButtons() {

        if (
            emailResendButton
        ) {

            emailResendButton.disabled =
                state.emailCooldown > 0 ||
                state.resending ||
                !state.email;
        }


        if (
            phoneResendButton
        ) {

            phoneResendButton.disabled =
                state.phoneCooldown > 0 ||
                state.resending ||
                !state.phone;
        }
    }


    /* =====================================================
       INITIALIZE COOLDOWNS
       ===================================================== */

    function initializeCooldowns() {

        state.emailCooldown =
            loadCooldown(
                "email"
            );


        state.phoneCooldown =
            loadCooldown(
                "phone"
            );


        if (
            state.emailCooldown > 0
        ) {

            runCooldown(
                "email"
            );
        }


        if (
            state.phoneCooldown > 0
        ) {

            runCooldown(
                "phone"
            );
        }


        updateResendButtons();
    }


    /* =====================================================
       BUTTON EVENTS
       ===================================================== */

    function initializeButtons() {

        if (
            verifyButton
        ) {

            verifyButton.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.preventDefault();

                    verifyAccount();
                }
            );
        }


        if (
            emailResendButton
        ) {

            emailResendButton.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.preventDefault();

                    event.stopPropagation();

                    setActiveChannel(
                        "email"
                    );

                    sendCode(
                        "email"
                    );
                }
            );
        }


        if (
            phoneResendButton
        ) {

            phoneResendButton.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.preventDefault();

                    event.stopPropagation();

                    setActiveChannel(
                        "phone"
                    );

                    sendCode(
                        "phone"
                    );
                }
            );
        }


        if (
            otpForm
        ) {

            otpForm.addEventListener(
                "submit",
                function (
                    event
                ) {

                    event.preventDefault();

                    verifyAccount();
                }
            );
        }
    }


    /* =====================================================
       PREVENT ENTER FROM SUBMITTING EARLY
       ===================================================== */

    function initializeKeyboardBehavior() {

        otpInputs.forEach(
            function (
                input
            ) {

                input.addEventListener(
                    "keydown",
                    function (
                        event
                    ) {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            event.preventDefault();


                            if (
                                getOtpValue()
                                    .length ===
                                OTP_LENGTH
                            ) {

                                verifyAccount();
                            }
                        }
                    }
                );
            }
        );
    }


    /* =====================================================
       RECOVERY LINK
       ===================================================== */

    function initializeRecoveryLink() {

        const link =
            $("recoveryLink") ||
            document.querySelector(
                'a[href*="recovery"]'
            );


        if (!link) {

            return;
        }


        /*
         * Use the configured recovery route.
         */

        const recoveryRoute =
            ROUTES.RECOVERY ||
            "recovery.html";


        link.setAttribute(
            "href",
            recoveryRoute
        );
    }


    /* =====================================================
       VERIFY-OTP LEGACY PAGE
       ===================================================== */

    function handleLegacyOtpPage() {

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        if (
            path ===
            "verify-otp.html"
        ) {

            const verifyRoute =
                ROUTES.VERIFY ||
                "verify.html";


            window.location.replace(
                verifyRoute
            );


            return true;
        }


        return false;
    }


    /* =====================================================
       CLEAR TIMERS
       ===================================================== */

    function clearTimers() {

        if (
            state.emailTimer
        ) {

            clearInterval(
                state.emailTimer
            );

            state.emailTimer =
                null;
        }


        if (
            state.phoneTimer
        ) {

            clearInterval(
                state.phoneTimer
            );

            state.phoneTimer =
                null;
        }


        if (
            state.demoTimer
        ) {

            clearTimeout(
                state.demoTimer
            );

            state.demoTimer =
                null;
        }
    }


    /* =====================================================
       CLEANUP
       ===================================================== */

    window.addEventListener(
        "beforeunload",
        function () {

            clearTimers();
        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        /*
         * Make sure the legacy page does not remain
         * as a separate verification page.
         */

        if (
            handleLegacyOtpPage()
        ) {

            return;
        }


        loadState();


        /*
         * No identity means the verification page cannot
         * ask the backend which account to verify.
         *
         * Do not silently redirect to login.
         *
         * The registration/login page is responsible for
         * saving the identity before arriving here.
         */

        if (
            !resolveIdentity()
        ) {

            disableOtpInputs();


            showMessage(
                "Username or Gmail is required.",
                "error"
            );


            if (otpHelp) {

                otpHelp.textContent =
                    "Return to the registration or login page and open verification again.";
            }


            updateResendButtons();


            return;
        }


        saveState();


        displayDestinations();


        positionEmailAction();


        initializeMethodCards();


        initializeOtpInputs();


        initializeKeyboardBehavior();


        initializeButtons();


        initializeRecoveryLink();


        initializeCooldowns();


        /*
         * Do not use a previously stored demo OTP
         * immediately.
         *
         * The backend remains the source of truth.
         */

        clearDemoOtp();


        disableOtpInputs();


        /*
         * Ask the backend to prepare the OTP.
         */

        await prepareOtp();
    }


    /* =====================================================
       PUBLIC DEBUG / CONTROL API
       ===================================================== */

    window.StockFlowOTP = {

        getState:
            function () {

                return {
                    ...state
                };
            },

        prepare:
            prepareOtp,

        resend:
            sendCode,

        verify:
            verifyAccount,

        getOtp:
            getOtpValue,

        setOtp:
            setOtpValue,

        clearOtp:
            clearVisibleOtp,

        clearDemoOtp:
            clearDemoOtp
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
