/* =====================================================
   STOCKFLOW
   MANUAL EMAIL / PHONE OTP VERIFICATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const verifyForm =
        document.getElementById("verifyForm");

    const otpInput =
        document.getElementById("otp");

    const otpBoxes =
        document.querySelectorAll(".otp-digit");

    const verifyBtn =
        document.getElementById("verifyOtpBtn");

    const otpMessage =
        document.getElementById("otpMessage");

    const otpHelp =
        document.getElementById("otpHelp");

    const description =
        document.getElementById("verificationDescription");

    const destination =
        document.getElementById("otpDestination");

    const emailStatus =
        document.getElementById("emailDeliveryStatus");

    const phoneStatus =
        document.getElementById("phoneDeliveryStatus");

    const sendEmailBtn =
        document.getElementById("sendEmailCode");

    const sendPhoneBtn =
        document.getElementById("sendPhoneCode");

    const emailTimer =
        document.getElementById("emailOtpTimer");

    const phoneTimer =
        document.getElementById("phoneOtpTimer");


    /* =====================================================
       STORAGE KEYS
    ===================================================== */

    const STORAGE_KEYS = [

        "STOCKFLOW_VERIFICATION_STATE",
        "STOCKFLOW_SESSION",
        "STOCKFLOW_AUTH",
        "STOCKFLOW_USER",

        "STOCKFLOW_OTP_EMAIL",
        "STOCKFLOW_OTP_PHONE",
        "STOCKFLOW_OTP_USERNAME",
        "STOCKFLOW_OTP_IDENTITY",
        "STOCKFLOW_OTP_CHANNEL",

        "STOCKFLOW_PENDING_VERIFICATION",
        "STOCKFLOW_PENDING_REGISTRATION",
        "STOCKFLOW_REGISTRATION",
        "STOCKFLOW_REGISTER_DATA",
        "STOCKFLOW_USER_DATA"

    ];


    /* =====================================================
       STORAGE HELPERS
    ===================================================== */

    function safeGet(storage, key) {

        try {

            return storage.getItem(key);

        } catch (error) {

            console.error(
                "Storage read error:",
                error
            );

            return null;

        }

    }


    function getStoredValue(key) {

        const sessionValue =
            safeGet(
                sessionStorage,
                key
            );

        if (sessionValue !== null) {

            return sessionValue;

        }


        return safeGet(
            localStorage,
            key
        );

    }


    function parseObject(value) {

        if (!value) {

            return null;

        }


        if (
            typeof value ===
            "object"
        ) {

            return value;

        }


        try {

            const parsed =
                JSON.parse(value);


            if (
                parsed &&
                typeof parsed ===
                "object"
            ) {

                return parsed;

            }

        } catch (error) {

            // Value is not JSON.

        }


        return null;

    }


    /* =====================================================
       FIND USER VERIFICATION DATA
    ===================================================== */

    function getVerificationData() {

        const result = {

            email: "",
            phone: "",
            username: "",
            identity: "",
            uid: "",
            channel: "email"

        };


        /*
         * First check known STOCKFLOW storage keys.
         */

        for (
            const key of STORAGE_KEYS
        ) {

            const raw =
                getStoredValue(key);


            if (!raw) {

                continue;

            }


            const data =
                parseObject(raw);


            if (!data) {

                /*
                 * Some keys may contain
                 * a plain email/phone.
                 */

                if (
                    key ===
                    "STOCKFLOW_OTP_EMAIL" &&
                    raw.includes("@")
                ) {

                    result.email =
                        raw.trim();

                }


                if (
                    key ===
                    "STOCKFLOW_OTP_PHONE"
                ) {

                    result.phone =
                        raw.trim();

                }


                if (
                    key ===
                    "STOCKFLOW_OTP_USERNAME"
                ) {

                    result.username =
                        raw.trim();

                }


                if (
                    key ===
                    "STOCKFLOW_OTP_IDENTITY"
                ) {

                    result.identity =
                        raw.trim();

                }


                continue;

            }


            /*
             * Accept several possible
             * registration property names.
             */

            result.email =
                result.email ||
                data.email ||
                data.gmail ||
                data.emailAddress ||
                data.gmailAddress ||
                "";


            result.phone =
                result.phone ||
                data.phone ||
                data.phoneNumber ||
                data.mobile ||
                data.mobileNumber ||
                "";


            result.username =
                result.username ||
                data.username ||
                data.userName ||
                "";


            result.uid =
                result.uid ||
                data.uid ||
                data.userId ||
                data.id ||
                "";


            result.identity =
                result.identity ||
                data.identity ||
                data.uid ||
                data.userId ||
                data.username ||
                data.email ||
                "";


            result.channel =
                data.channel ||
                data.verificationMethod ||
                data.method ||
                result.channel;

        }


        /* =================================================
           SCAN STORAGE AS FALLBACK
        ================================================= */

        if (
            !result.email &&
            !result.phone
        ) {

            const storages = [

                localStorage,
                sessionStorage

            ];


            for (
                const storage of storages
            ) {

                for (
                    let i = 0;
                    i < storage.length;
                    i++
                ) {

                    const key =
                        storage.key(i);


                    if (!key) {

                        continue;

                    }


                    const raw =
                        safeGet(
                            storage,
                            key
                        );


                    const data =
                        parseObject(raw);


                    if (!data) {

                        continue;

                    }


                    const foundEmail =
                        data.email ||
                        data.gmail ||
                        data.emailAddress ||
                        data.gmailAddress ||
                        "";


                    const foundPhone =
                        data.phone ||
                        data.phoneNumber ||
                        data.mobile ||
                        data.mobileNumber ||
                        "";


                    if (
                        foundEmail ||
                        foundPhone
                    ) {

                        result.email =
                            result.email ||
                            foundEmail;


                        result.phone =
                            result.phone ||
                            foundPhone;


                        result.username =
                            result.username ||
                            data.username ||
                            data.userName ||
                            "";


                        result.uid =
                            result.uid ||
                            data.uid ||
                            data.userId ||
                            data.id ||
                            "";


                        result.identity =
                            result.identity ||
                            data.identity ||
                            data.uid ||
                            data.userId ||
                            data.username ||
                            foundEmail ||
                            "";


                        break;

                    }

                }


                if (
                    result.email ||
                    result.phone
                ) {

                    break;

                }

            }

        }


        /* =================================================
           URL PARAMETER FALLBACK
        ================================================= */

        const params =
            new URLSearchParams(
                window.location.search
            );


        result.email =
            result.email ||
            params.get("email") ||
            params.get("gmail") ||
            "";


        result.phone =
            result.phone ||
            params.get("phone") ||
            "";


        result.username =
            result.username ||
            params.get("username") ||
            "";


        result.uid =
            result.uid ||
            params.get("uid") ||
            "";


        result.identity =
            result.identity ||
            params.get("identity") ||
            result.uid ||
            result.username ||
            result.email ||
            "";


        return result;

    }


    /* =====================================================
       USER DATA
    ===================================================== */

    const verificationData =
        getVerificationData();


    const email =
        String(
            verificationData.email || ""
        ).trim();


    const phone =
        String(
            verificationData.phone || ""
        ).trim();


    const username =
        String(
            verificationData.username || ""
        ).trim();


    const identity =
        String(
            verificationData.identity ||
            email ||
            username ||
            ""
        ).trim();


    const uid =
        String(
            verificationData.uid || ""
        ).trim();


    const channel =
        verificationData.channel ||
        "email";


    console.log(
        "STOCKFLOW verification data:",
        {
            email: email,
            phone: phone,
            username: username,
            identity: identity,
            uid: uid,
            channel: channel
        }
    );


    /* =====================================================
       EMAIL MASK
    ===================================================== */

    function maskEmail(value) {

        if (
            !value ||
            !value.includes("@")
        ) {

            return value;

        }


        const parts =
            value.split("@");


        const name =
            parts[0];


        const domain =
            parts[1];


        if (
            name.length <= 2
        ) {

            return (
                name.charAt(0) +
                "***@" +
                domain
            );

        }


        return (
            name.substring(0, 2) +
            "***@" +
            domain
        );

    }


    /* =====================================================
       PHONE MASK
    ===================================================== */

    function maskPhone(value) {

        if (!value) {

            return "";

        }


        const clean =
            String(value);


        if (
            clean.length <= 4
        ) {

            return "****";

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


    /* =====================================================
       MESSAGE
    ===================================================== */

    function showMessage(
        message,
        type = "error"
    ) {

        if (!otpMessage) {

            return;

        }


        otpMessage.textContent =
            message;


        otpMessage.hidden =
            false;


        otpMessage.className =
            "otp-message " + type;

    }


    function hideMessage() {

        if (!otpMessage) {

            return;

        }


        otpMessage.hidden =
            true;


        otpMessage.textContent =
            "";

    }


    /* =====================================================
       DISABLE OTP
    ===================================================== */

    function disableOTP() {

        otpBoxes.forEach(
            input => {

                input.disabled =
                    true;

                input.value =
                    "";

            }
        );


        if (otpInput) {

            otpInput.value =
                "";

        }


        if (verifyBtn) {

            verifyBtn.disabled =
                true;

        }

    }


    /* =====================================================
       ENABLE OTP
    ===================================================== */

    function enableOTP() {

        otpBoxes.forEach(
            input => {

                input.disabled =
                    false;

            }
        );


        updateOTP();

    }


    /* =====================================================
       CHECK USER INFORMATION
    ===================================================== */

    if (
        !email &&
        !phone &&
        !identity
    ) {

        console.error(
            "STOCKFLOW: No verification identity found."
        );


        if (description) {

            description.textContent =
                "We could not find your registration information.";

        }


        if (otpHelp) {

            otpHelp.textContent =
                "Please return to registration and register again.";

        }


        if (emailStatus) {

            emailStatus.textContent =
                "No registered email was found.";

        }


        disableOTP();

    } else {

        /*
         * User information exists.
         * OTP boxes can now be manually used.
         */

        enableOTP();


        if (description) {

            if (email) {

                description.textContent =
                    "Enter the 6-digit verification code sent to your registered Gmail.";

            } else {

                description.textContent =
                    "Enter the 6-digit verification code sent to your registered phone.";

            }

        }


        if (emailStatus) {

            if (email) {

                emailStatus.textContent =
                    "A 6-digit code will be sent to " +
                    maskEmail(email) +
                    ".";

            } else {

                emailStatus.textContent =
                    "No registered Gmail address was found.";

            }

        }


        if (phoneStatus) {

            if (phone) {

                phoneStatus.textContent =
                    "Your registered phone can be used as a backup.";

            } else {

                phoneStatus.textContent =
                    "No registered phone number was found.";

            }

        }


        if (destination) {

            if (email) {

                destination.textContent =
                    "Verification code destination: " +
                    maskEmail(email);

            } else if (phone) {

                destination.textContent =
                    "Verification code destination: " +
                    maskPhone(phone);

            }

        }


        if (otpHelp) {

            otpHelp.textContent =
                "Check your Gmail for the 6-digit verification code, then enter it manually.";

        }

    }


    /* =====================================================
       OTP INPUT
    ===================================================== */

    otpBoxes.forEach(
        (input, index) => {

            input.addEventListener(
                "input",
                () => {

                    let value =
                        input.value
                            .replace(/\D/g, "")
                            .slice(0, 1);


                    input.value =
                        value;


                    if (
                        value &&
                        index <
                        otpBoxes.length - 1
                    ) {

                        otpBoxes[index + 1]
                            .focus();

                    }


                    updateOTP();

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

                        otpBoxes[index - 1]
                            .focus();

                    }


                    if (
                        event.key ===
                        "ArrowLeft" &&
                        index > 0
                    ) {

                        event.preventDefault();


                        otpBoxes[index - 1]
                            .focus();

                    }


                    if (
                        event.key ===
                        "ArrowRight" &&
                        index <
                        otpBoxes.length - 1
                    ) {

                        event.preventDefault();


                        otpBoxes[index + 1]
                            .focus();

                    }

                }
            );


            input.addEventListener(
                "paste",
                event => {

                    event.preventDefault();


                    const clipboard =
                        event.clipboardData ||
                        window.clipboardData;


                    if (!clipboard) {

                        return;

                    }


                    const pasted =
                        clipboard
                            .getData("text")
                            .replace(/\D/g, "")
                            .slice(0, 6);


                    if (!pasted) {

                        return;

                    }


                    pasted
                        .split("")
                        .forEach(
                            (
                                digit,
                                digitIndex
                            ) => {

                                if (
                                    otpBoxes[
                                        digitIndex
                                    ]
                                ) {

                                    otpBoxes[
                                        digitIndex
                                    ].value =
                                        digit;

                                }

                            }
                        );


                    updateOTP();


                    const lastIndex =
                        Math.min(
                            pasted.length - 1,
                            otpBoxes.length - 1
                        );


                    otpBoxes[
                        lastIndex
                    ].focus();

                }
            );

        }
    );


    /* =====================================================
       GET OTP
    ===================================================== */

    function getOTP() {

        return Array
            .from(otpBoxes)
            .map(
                input =>
                    input.value
            )
            .join("");

    }


    /* =====================================================
       UPDATE OTP
    ===================================================== */

    function updateOTP() {

        const otp =
            getOTP();


        if (otpInput) {

            otpInput.value =
                otp;

        }


        if (verifyBtn) {

            verifyBtn.disabled =
                otp.length !== 6;

        }

    }


    /* =====================================================
       CLEAR OTP
    ===================================================== */

    function clearOTP() {

        otpBoxes.forEach(
            input => {

                input.value =
                    "";

            }
        );


        if (otpInput) {

            otpInput.value =
                "";

        }


        if (verifyBtn) {

            verifyBtn.disabled =
                true;

        }

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(loading) {

        if (!verifyBtn) {

            return;

        }


        const buttonText =
            verifyBtn.querySelector(
                ".button-text"
            );


        const buttonLoader =
            verifyBtn.querySelector(
                ".button-loader"
            );


        verifyBtn.disabled =
            loading ||
            getOTP().length !== 6;


        if (buttonText) {

            buttonText.hidden =
                loading;

        }


        if (buttonLoader) {

            buttonLoader.hidden =
                !loading;

        }

    }


    /* =====================================================
       VERIFY OTP
    ===================================================== */

    if (verifyForm) {

        verifyForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const otp =
                    getOTP();


                if (
                    !/^\d{6}$/.test(otp)
                ) {

                    showMessage(
                        "Please enter the complete 6-digit verification code.",
                        "error"
                    );

                    return;

                }


                if (
                    typeof API ===
                    "undefined" ||
                    typeof API.verifyOtp !==
                    "function"
                ) {

                    console.error(
                        "API.verifyOtp() is not available."
                    );


                    showMessage(
                        "Verification service is unavailable.",
                        "error"
                    );

                    return;

                }


                hideMessage();


                setLoading(true);


                try {

                    const result =
                        await API.verifyOtp({

                            uid:
                                uid,

                            identity:
                                identity,

                            username:
                                username,

                            email:
                                email,

                            gmail:
                                email,

                            phone:
                                phone,

                            channel:
                                channel,

                            otp:
                                otp

                        });


                    console.log(
                        "OTP verification response:",
                        result
                    );


                    if (
                        result &&
                        result.success
                    ) {

                        showMessage(
                            "Account verified successfully.",
                            "success"
                        );


                        setTimeout(
                            () => {

                                window.location.href =
                                    "auth.html#login";

                            },
                            1000
                        );


                        return;

                    }


                    showMessage(

                        result &&
                        result.message

                            ? result.message

                            : "Invalid verification code.",

                        "error"

                    );


                    clearOTP();


                } catch (error) {

                    console.error(
                        "OTP verification error:",
                        error
                    );


                    showMessage(
                        "Unable to verify the code. Please try again.",
                        "error"
                    );


                } finally {

                    setLoading(false);

                }

            }
        );

    }


    /* =====================================================
       SEND / RESEND OTP
    ===================================================== */

    if (sendEmailBtn) {

        sendEmailBtn.addEventListener(
            "click",
            async () => {

                await sendCode("email");

            }
        );

    }


    if (sendPhoneBtn) {

        sendPhoneBtn.addEventListener(
            "click",
            async () => {

                await sendCode("phone");

            }
        );

    }


    /* =====================================================
       SEND CODE
    ===================================================== */

    async function sendCode(method) {

        const button =
            method === "email"
                ? sendEmailBtn
                : sendPhoneBtn;


        const timer =
            method === "email"
                ? emailTimer
                : phoneTimer;


        if (method === "email" && !email) {

            showMessage(
                "No registered Gmail address was found.",
                "error"
            );

            return;

        }


        if (method === "phone" && !phone) {

            showMessage(
                "No registered phone number was found.",
                "error"
            );

            return;

        }


        if (
            typeof API ===
            "undefined" ||
            typeof API.resendOtp !==
            "function"
        ) {

            console.error(
                "API.resendOtp() is not available."
            );


            showMessage(
                "Verification service is unavailable.",
                "error"
            );

            return;

        }


        if (button) {

            button.disabled =
                true;

        }


        hideMessage();


        try {

            const result =
                await API.resendOtp({

                    uid:
                        uid,

                    identity:
                        identity,

                    username:
                        username,

                    email:
                        email,

                    gmail:
                        email,

                    phone:
                        phone,

                    channel:
                        method

                });


            console.log(
                "OTP send response:",
                result
            );


            if (
                result &&
                result.success
            ) {

                if (
                    method ===
                    "email"
                ) {

                    if (emailStatus) {

                        emailStatus.textContent =
                            "Verification code sent to " +
                            maskEmail(email) +
                            ".";

                    }


                    if (description) {

                        description.textContent =
                            "Check your Gmail and enter the 6-digit verification code.";

                    }


                    if (otpHelp) {

                        otpHelp.textContent =
                            "The code was sent to your Gmail. Enter it manually below.";

                    }


                    showMessage(
                        "Verification code sent to your Gmail.",
                        "success"
                    );

                } else {

                    if (phoneStatus) {

                        phoneStatus.textContent =
                            "Verification code sent to " +
                            maskPhone(phone) +
                            ".";

                    }


                    showMessage(
                        "Verification code sent to your phone.",
                        "success"
                    );

                }


                clearOTP();


                startCooldown(
                    button,
                    timer
                );


                return;

            }


            showMessage(

                result &&
                result.message

                    ? result.message

                    : "Unable to send verification code.",

                "error"

            );


            if (button) {

                button.disabled =
                    false;

            }


        } catch (error) {

            console.error(
                "OTP send error:",
                error
            );


            showMessage(
                "Unable to send verification code. Please try again.",
                "error"
            );


            if (button) {

                button.disabled =
                    false;

            }

        }

    }


    /* =====================================================
       COOLDOWN
    ===================================================== */

    function startCooldown(
        button,
        timerElement
    ) {

        if (
            !button ||
            !timerElement
        ) {

            return;

        }


        let seconds = 120;


        button.disabled =
            true;


        const originalText =
            button.textContent;


        const interval =
            setInterval(
                () => {

                    const minutes =
                        Math.floor(
                            seconds / 60
                        );


                    const remaining =
                        seconds % 60;


                    timerElement.textContent =
                        "New code available in " +
                        minutes +
                        ":" +
                        String(
                            remaining
                        ).padStart(
                            2,
                            "0"
                        );


                    seconds--;


                    if (
                        seconds < 0
                    ) {

                        clearInterval(
                            interval
                        );


                        button.disabled =
                            false;


                        button.textContent =
                            originalText;


                        timerElement.textContent =
                            "Code available.";

                    }

                },
                1000
            );

    }


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    updateOTP();


    /*
     * IMPORTANT
     *
     * NO OTP IS GENERATED HERE.
     *
     * NO OTP IS STORED IN localStorage.
     *
     * NO OTP IS AUTOMATICALLY PLACED
     * INTO THE SIX INPUT BOXES.
     *
     * FLOW:
     *
     * 1. User registers.
     * 2. Registration information is stored.
     * 3. User opens verification page.
     * 4. User clicks "Send code by email".
     * 5. API/backend sends the OTP to Gmail.
     * 6. User opens Gmail.
     * 7. User manually types the 6-digit code.
     * 8. User clicks "Verify Account".
     * 9. API.verifyOtp() checks the code.
     */

});
