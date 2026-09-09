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
Code.gs generates the real 6-digit OTP
    ↓
Google Sheets + Firebase
    ↓
verify.html
    ↓
otp.js
    ↓
StockFlowAPI.prepareOtp()
    ↓
Backend returns the generated OTP
    ↓
3–5 second display delay
    ↓
Six OTP boxes are automatically filled
    ↓
User clicks Verify Account
    ↓
Google Apps Script verifies the OTP
    ↓
Employee Dashboard


IMPORTANT
---------
- OTP is NEVER generated in this browser.
- OTP is NEVER generated with Math.random().
- No hardcoded OTP is used.
- Code.gs is the ONLY component that generates the OTP.
- The exact backend-generated OTP is used.
- The same OTP is stored in Google Sheets and Firebase.
- The browser only displays the OTP returned by the backend.
- No fake Gmail/SMS delivery is claimed.
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


    /*
     * The backend response may arrive quickly.
     *
     * The OTP is displayed after a short UI delay.
     *
     * IMPORTANT:
     * This delay does NOT generate an OTP.
     */

    const OTP_DISPLAY_DELAY_MIN =
        3000;


    const OTP_DISPLAY_DELAY_MAX =
        5000;


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
     * Fallback for numeric OTP inputs that use
     * another class name.
     */

    if (
        otpInputs.length !== OTP_LENGTH
    ) {

        const fallbackInputs =
            $$("#otpForm input[inputmode='numeric']");


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

        /*
         * This contains ONLY the actual OTP returned
         * by the backend.
         */

        backendOtp:
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

        otpDisplayTimer:
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
                String(
                    value ?? ""
                )
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
            getSession(
                key
            );


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
         * Keep verification identity available after
         * a refresh.
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

        removeSession(
            key
        );


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
         * Derive identity when it was not explicitly
         * saved by registration.
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
       RESOLVE IDENTITY
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
       BUTTON LOADING
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
       GET OTP VALUE
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
                    function (
                        input
                    ) {

                        return clean(
                            input.value
                        ).replace(
                            /\D/g,
                            ""
                        );
                    }
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
            function (
                input
            ) {

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
            function (
                input
            ) {

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
                                otpInputs.length - 1
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
                                otpInputs.length - 1
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


                        const clipboard =
                            event.clipboardData ||
                            window.clipboardData;


                        if (!clipboard) {

                            return;
                        }


                        const pasted =
                            clipboard
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
       REAL BACKEND OTP DISPLAY DELAY
       ===================================================== */

    function getOtpDisplayDelay() {

        /*
         * IMPORTANT:
         *
         * This function ONLY calculates how long the
         * interface waits before displaying the OTP
         * returned by the backend.
         *
         * It DOES NOT generate an OTP.
         */

        const minimum =
            OTP_DISPLAY_DELAY_MIN;


        const maximum =
            OTP_DISPLAY_DELAY_MAX;


        return Math.floor(
            minimum +
            (
                Math.random() *
                (
                    maximum -
                    minimum +
                    1
                )
            )
        );
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
       EXTRACT BACKEND OTP
       ===================================================== */

    function extractBackendOtp(
        response
    ) {

        const data =
            getResponseData(
                response
            );


        /*
         * IMPORTANT:
         *
         * Only backend-returned OTP fields are accepted.
         *
         * No OTP is generated here.
         */

        const possibleOtp =
            firstValue(

                data.otp,

                data.OTP,

                data.code,

                data.verificationCode,

                data.verification_code
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
       STORE BACKEND OTP
       ===================================================== */

    function storeBackendOtp(
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

            return false;
        }


        /*
         * This is the actual OTP received from Code.gs.
         */

        state.backendOtp =
            normalized;


        /*
         * Keep it available to the current verification
         * flow.
         */

        saveValue(
            KEY.CODE,
            normalized
        );


        saveValue(
            KEY.READY,
            "true"
        );


        return true;
    }


    /* =====================================================
       CLEAR BACKEND OTP
       ===================================================== */

    function clearBackendOtp() {

        state.backendOtp =
            "";


        removeSavedValue(
            KEY.CODE
        );


        removeSavedValue(
            KEY.READY
        );
    }


    /* =====================================================
       DISPLAY BACKEND OTP
       ===================================================== */

    function displayBackendOtp(
        code
    ) {

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


        /*
         * Make absolutely sure the code being displayed
         * is the same code received from the backend.
         */

        state.backendOtp =
            normalized;


        enableOtpInputs();


        setOtpValue(
            normalized
        );


        state.prepared =
            true;


        if (otpHelp) {

            otpHelp.textContent =
                "Your verification code is ready. Click Verify Account to continue.";
        }


        showMessage(
            "Your verification code is ready.",
            "success"
        );


        if (
            otpInputs.length
        ) {

            otpInputs[0].focus();
        }


        updateVerifyButton();


        return true;
    }


    /* =====================================================
       DISPLAY PREPARING MESSAGE
       ===================================================== */

    function displayPreparingMessage() {

        hideMessage();


        disableOtpInputs();


        clearVisibleOtp();


        if (otpHelp) {

            otpHelp.textContent =
                "Preparing your verification code...";
        }
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

            verificationDescription.textContent =
                "Choose a verification method, then enter the 6-digit verification code.";
        }


        /*
         * Do NOT claim that an email or SMS was physically
         * delivered unless a real delivery provider has
         * been configured on the backend.
         */

        if (
            emailDeliveryStatus
        ) {

            if (email) {

                emailDeliveryStatus.textContent =
                    "Verification code for " +
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
                    "Verification code for " +
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
       VERIFICATION METHOD CARDS
       ===================================================== */

    function getMethodCards() {

        return $$(
            ".verification-method"
        );
    }


    /* =====================================================
       SET ACTIVE CHANNEL
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
                    channel !== "email" &&
                    channel !== "phone"
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
                         * Buttons inside cards have their
                         * own click handler.
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
                            event.key === "Enter" ||
                            event.key === " "
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


        emailResendButton.classList.add(
            "verification-method-action"
        );


        emailResendButton.textContent =
            "Send code by email";


        emailCard.appendChild(
            emailResendButton
        );
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
                state.channel
        };


        if (
            mode === "resend"
        ) {

            return await API.resendOtp(
                payload
            );
        }


        return await API.prepareOtp(
            payload
        );
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
             * Synchronize account information returned
             * by Code.gs.
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
             * ONLY accept the OTP returned by the backend.
             */

            const backendOtp =
                extractBackendOtp(
                    response
                );


            if (!backendOtp) {

                throw new Error(
                    "The verification service did not return the generated OTP."
                );
            }


            storeBackendOtp(
                backendOtp
            );


            /*
             * Disable the boxes while the backend-issued
             * code is waiting for the short UI delay.
             */

            disableOtpInputs();


            clearVisibleOtp();


            if (otpHelp) {

                otpHelp.textContent =
                    "Your verification code is being prepared...";
            }


            /*
             * IMPORTANT:
             *
             * No OTP is generated during this delay.
             *
             * backendOtp is already the real code generated
             * by Code.gs.
             */

            const delayMs =
                getOtpDisplayDelay();


            state.otpDisplayTimer =
                setTimeout(
                    function () {

                        state.otpDisplayTimer =
                            null;


                        displayBackendOtp(
                            backendOtp
                        );

                    },
                    delayMs
                );


        } catch (error) {

            console.error(
                "[STOCKFLOW OTP] Prepare failed:",
                error
            );


            state.prepared =
                false;


            disableOtpInputs();


            showMessage(
                getErrorMessage(
                    error
                ),
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
         * Validate selected destination.
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


        /*
         * Cancel any previous display timer.
         */

        if (
            state.otpDisplayTimer
        ) {

            clearTimeout(
                state.otpDisplayTimer
            );


            state.otpDisplayTimer =
                null;
        }


        clearBackendOtp();


        clearVisibleOtp();


        disableOtpInputs();


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
             * Synchronize returned account data.
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
             * ONLY use the OTP returned from the backend.
             */

            const backendOtp =
                extractBackendOtp(
                    response
                );


            if (!backendOtp) {

                throw new Error(
                    "The verification service did not return the new generated OTP."
                );
            }


            storeBackendOtp(
                backendOtp
            );


            if (otpHelp) {

                otpHelp.textContent =
                    "Your new verification code is being prepared...";
            }


            /*
             * Start the 3–5 second display delay.
             *
             * Again:
             * NO OTP GENERATION occurs here.
             */

            const delayMs =
                getOtpDisplayDelay();


            state.otpDisplayTimer =
                setTimeout(
                    function () {

                        state.otpDisplayTimer =
                            null;


                        displayBackendOtp(
                            backendOtp
                        );

                    },
                    delayMs
                );


            /*
             * Start cooldown only after the backend
             * successfully generated the new OTP.
             */

            startCooldown(
                channel
            );


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
       VERIFY ACCOUNT
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
                        function (
                            input
                        ) {

                            return !input.value;
                        }
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


        /*
         * Make sure the user is verifying against
         * the backend-issued code currently stored
         * in this page's state.
         */

        if (
            state.backendOtp &&
            otp !== state.backendOtp
        ) {

            showMessage(
                "The verification code does not match the current backend-issued code.",
                "error"
            );


            return;
        }


        if (!API) {

            showMessage(
                "The verification service is unavailable.",
                "error"
            );


            return;
        }


        state.verifying =
            true;


        if (verifyButton) {

            if (
                !verifyButton.dataset.originalText
            ) {

                verifyButton.dataset.originalText =
                    verifyButton.textContent;
            }


            verifyButton.disabled =
                true;


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

                        otp:
                            otp
                    }
                );


            const data =
                getResponseData(
                    response
                );


            /*
             * Backend verification succeeded.
             */

            state.verified =
                true;


            /*
             * Save session token if Code.gs returned one.
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
             * Remove the OTP from browser storage.
             */

            clearBackendOtp();


            showMessage(
                "Account verified successfully. Redirecting to the Employee Dashboard...",
                "success"
            );


            /*
             * Direct dashboard redirect.
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


        const lowerMessage =
            message.toLowerCase();


        /* -------------------------------------------------
           IDENTITY
        ------------------------------------------------- */

        if (
            code ===
                "OTP_IDENTITY_MISSING" ||
            lowerMessage.includes(
                "username or gmail is required"
            )
        ) {

            return "Username or Gmail is required.";
        }


        /* -------------------------------------------------
           INVALID OTP
        ------------------------------------------------- */

        if (
            code ===
                "INVALID_OTP" ||
            code ===
                "OTP_INVALID"
        ) {

            return "The verification code is incorrect. Please try again.";
        }


        /* -------------------------------------------------
           EXPIRED OTP
        ------------------------------------------------- */

        if (
            code ===
                "OTP_EXPIRED"
        ) {

            return (
                "Your verification code has expired. " +
                "Please request a new code."
            );
        }


        /* -------------------------------------------------
           LOCKED
        ------------------------------------------------- */

        if (
            code ===
                "OTP_LOCKED" ||
            code ===
                "ACCOUNT_LOCKED"
        ) {

            return (
                "Verification is temporarily locked. " +
                "Please try again after " +
                OTP_LOCK_MINUTES +
                " minutes."
            );
        }


        /* -------------------------------------------------
           MAXIMUM ATTEMPTS
        ------------------------------------------------- */

        if (
            code ===
                "MAX_ATTEMPTS"
        ) {

            return (
                "You have reached the maximum verification attempts. " +
                "Please try again after " +
                OTP_LOCK_MINUTES +
                " minutes."
            );
        }


        /* -------------------------------------------------
           RESEND COOLDOWN
        ------------------------------------------------- */

        if (
            code ===
                "OTP_COOLDOWN"
        ) {

            return (
                "Please wait before requesting another verification code."
            );
        }


        /* -------------------------------------------------
           USER NOT FOUND
        ------------------------------------------------- */

        if (
            code ===
                "USER_NOT_FOUND" ||
            code ===
                "ACCOUNT_NOT_FOUND"
        ) {

            return (
                "No registered account was found for this verification request."
            );
        }


        /* -------------------------------------------------
           OTP NOT RETURNED
        ------------------------------------------------- */

        if (
            lowerMessage.includes(
                "did not return the generated otp"
            ) ||
            lowerMessage.includes(
                "did not return the new generated otp"
            )
        ) {

            return (
                "The verification service generated no usable verification code. " +
                "Please try again."
            );
        }


        /* -------------------------------------------------
           NETWORK
        ------------------------------------------------- */

        if (
            code ===
                "NETWORK_ERROR"
        ) {

            return (
                "Unable to connect to the verification service. " +
                "Please try again."
            );
        }


        /* -------------------------------------------------
           TIMEOUT
        ------------------------------------------------- */

        if (
            code ===
                "TIMEOUT"
        ) {

            return (
                "The verification service took too long to respond. " +
                "Please try again."
            );
        }


        /* -------------------------------------------------
           API CONFIGURATION
        ------------------------------------------------- */

        if (
            code ===
                "API_URL_MISSING" ||
            code ===
                "API_URL_INVALID"
        ) {

            return (
                "The verification service is not configured correctly."
            );
        }


        /* -------------------------------------------------
           SERVER
        ------------------------------------------------- */

        if (
            code ===
                "SERVER_ERROR" ||
            code ===
                "API_ERROR"
        ) {

            return (
                message ||
                "The verification service returned an error. Please try again."
            );
        }


        /* -------------------------------------------------
           GENERIC BACKEND MESSAGE
        ------------------------------------------------- */

        if (message) {

            return message;
        }


        return (
            "Something went wrong. Please try again."
        );
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
            String(
                now
            )
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
       KEYBOARD BEHAVIOR
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


        const recoveryRoute =
            ROUTES.RECOVERY ||
            "recovery.html";


        link.setAttribute(
            "href",
            recoveryRoute
        );
    }


    /* =====================================================
       LEGACY OTP PAGE
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
            state.otpDisplayTimer
        ) {

            clearTimeout(
                state.otpDisplayTimer
            );


            state.otpDisplayTimer =
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

        if (
            handleLegacyOtpPage()
        ) {

            return;
        }


        loadState();


        /*
         * Registration must save the account identity
         * before redirecting to verify.html.
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
                    "Return to the registration page and open verification again.";
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
         * Remove any old locally stored OTP.
         *
         * The backend must issue a fresh verification code.
         */

        clearBackendOtp();


        disableOtpInputs();


        /*
         * Ask Code.gs for the actual OTP.
         */

        await prepareOtp();
    }


    /* =====================================================
       PUBLIC CONTROLLER
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


        clearBackendOtp:
            clearBackendOtp
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
