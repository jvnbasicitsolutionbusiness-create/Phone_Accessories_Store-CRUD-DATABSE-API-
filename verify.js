/* =====================================================
   STOCKFLOW
   MANUAL OTP VERIFICATION
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
       STORAGE HELPERS
    ===================================================== */

    const STORAGE_KEYS = {

        verification:
            "STOCKFLOW_VERIFICATION_STATE",

        session:
            "STOCKFLOW_SESSION",

        auth:
            "STOCKFLOW_AUTH",

        user:
            "STOCKFLOW_USER",

        email:
            "STOCKFLOW_OTP_EMAIL",

        phone:
            "STOCKFLOW_OTP_PHONE",

        username:
            "STOCKFLOW_OTP_USERNAME",

        identity:
            "STOCKFLOW_OTP_IDENTITY",

        channel:
            "STOCKFLOW_OTP_CHANNEL",

        emailSent:
            "STOCKFLOW_OTP_EMAIL_SENT",

        phoneSent:
            "STOCKFLOW_OTP_PHONE_SENT"

    };


    function readStorage(key) {

        try {

            return localStorage.getItem(key);

        } catch (error) {

            console.error(
                "localStorage error:",
                error
            );

            return null;
        }

    }


    function readSession(key) {

        try {

            return sessionStorage.getItem(key);

        } catch (error) {

            console.error(
                "sessionStorage error:",
                error
            );

            return null;
        }

    }


    function getValue(key) {

        return (
            readSession(key) ||
            readStorage(key)
        );

    }


    function parseJSON(value) {

        if (!value) {
            return null;
        }

        try {

            return JSON.parse(value);

        } catch (error) {

            return null;

        }

    }


    /* =====================================================
       GET VERIFICATION STATE
    ===================================================== */

    function getVerificationState() {

        const possibleValues = [

            getValue(
                STORAGE_KEYS.verification
            ),

            getValue(
                STORAGE_KEYS.session
            ),

            getValue(
                STORAGE_KEYS.auth
            ),

            getValue(
                STORAGE_KEYS.user
            )

        ];


        for (const value of possibleValues) {

            const parsed =
                parseJSON(value);

            if (
                parsed &&
                typeof parsed === "object"
            ) {

                return parsed;

            }

        }


        return {};

    }


    const verificationState =
        getVerificationState();


    /* =====================================================
       NORMALIZE USER INFORMATION
    ===================================================== */

    const email =
        verificationState.email ||
        verificationState.gmail ||
        getValue(STORAGE_KEYS.email) ||
        "";


    const phone =
        verificationState.phone ||
        getValue(STORAGE_KEYS.phone) ||
        "";


    const username =
        verificationState.username ||
        getValue(STORAGE_KEYS.username) ||
        "";


    const identity =
        verificationState.identity ||
        verificationState.uid ||
        getValue(STORAGE_KEYS.identity) ||
        email ||
        username ||
        "";


    const channel =
        verificationState.channel ||
        getValue(STORAGE_KEYS.channel) ||
        "email";


    const uid =
        verificationState.uid ||
        verificationState.userId ||
        "";


    /* =====================================================
       CHECK VERIFICATION INFORMATION
    ===================================================== */

    if (!email && !phone && !identity) {

        console.error(
            "STOCKFLOW verification information is missing.",
            verificationState
        );


        if (description) {

            description.textContent =
                "Verification information is missing. Please return to registration.";

        }


        if (otpHelp) {

            otpHelp.textContent =
                "Please return to registration and register again.";

        }


        disableOTP();

        return;

    }


    /* =====================================================
       DISPLAY DESTINATION
    ===================================================== */

    if (email) {

        if (emailStatus) {

            emailStatus.textContent =
                "A 6-digit verification code will be sent to your registered Gmail.";

        }

    }


    if (phone) {

        if (phoneStatus) {

            phoneStatus.textContent =
                "Your registered phone can be used as a backup.";

        }

    }


    if (description) {

        description.textContent =
            "Enter the 6-digit verification code sent to your registered email.";

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


    /* =====================================================
       ENABLE OTP INPUTS
    ===================================================== */

    otpBoxes.forEach(input => {

        input.disabled = false;

    });


    /* =====================================================
       EMAIL MASK
    ===================================================== */

    function maskEmail(value) {

        if (!value || !value.includes("@")) {

            return value;

        }


        const parts =
            value.split("@");

        const name =
            parts[0];

        const domain =
            parts[1];


        if (name.length <= 2) {

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


        if (clean.length <= 4) {

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
       OTP INPUT
       MANUAL ENTRY ONLY
    ===================================================== */

    otpBoxes.forEach((input, index) => {


        input.addEventListener(
            "input",
            () => {

                let value =
                    input.value.replace(
                        /\D/g,
                        ""
                    );


                input.value =
                    value.slice(0, 1);


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

                    otpBoxes[index - 1]
                        .focus();

                }


                if (
                    event.key ===
                    "ArrowRight" &&
                    index <
                    otpBoxes.length - 1
                ) {

                    otpBoxes[index + 1]
                        .focus();

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
                    .getData("text")
                    .replace(/\D/g, "")
                    .slice(0, 6);


                if (!pasted) {
                    return;
                }


                pasted
                    .split("")
                    .forEach(
                        (digit, digitIndex) => {

                            if (
                                otpBoxes[digitIndex]
                            ) {

                                otpBoxes[digitIndex]
                                    .value =
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


                otpBoxes[lastIndex]
                    .focus();

            }
        );

    });


    /* =====================================================
       UPDATE OTP
    ===================================================== */

    function updateOTP() {

        const otp =
            Array.from(otpBoxes)
                .map(input => input.value)
                .join("");


        if (otpInput) {

            otpInput.value = otp;

        }


        if (verifyBtn) {

            verifyBtn.disabled =
                otp.length !== 6;

        }

    }


    /* =====================================================
       DISABLE OTP
    ===================================================== */

    function disableOTP() {

        otpBoxes.forEach(input => {

            input.disabled = true;
            input.value = "";

        });


        if (otpInput) {

            otpInput.value = "";

        }


        if (verifyBtn) {

            verifyBtn.disabled = true;

        }

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


        otpMessage.hidden = false;


        otpMessage.className =
            "otp-message " + type;

    }


    /* =====================================================
       HIDE MESSAGE
    ===================================================== */

    function hideMessage() {

        if (!otpMessage) {
            return;
        }


        otpMessage.hidden = true;

        otpMessage.textContent = "";

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
                    Array.from(otpBoxes)
                        .map(input => input.value)
                        .join("");


                if (!/^\d{6}$/.test(otp)) {

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

                    showMessage(
                        "Verification service is unavailable.",
                        "error"
                    );

                    console.error(
                        "API.verifyOtp() is not available."
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


                        /*
                         * Give the success message
                         * a moment before redirecting.
                         */

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
       CLEAR OTP
    ===================================================== */

    function clearOTP() {

        otpBoxes.forEach(input => {

            input.value = "";

        });


        if (otpInput) {

            otpInput.value = "";

        }


        if (verifyBtn) {

            verifyBtn.disabled = true;

        }


        if (otpBoxes[0]) {

            otpBoxes[0].focus();

        }

    }


    /* =====================================================
       LOADING STATE
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
       GET CURRENT OTP
    ===================================================== */

    function getOTP() {

        return Array.from(otpBoxes)
            .map(input => input.value)
            .join("");

    }


    /* =====================================================
       RESEND EMAIL CODE
    ===================================================== */

    if (sendEmailBtn) {

        sendEmailBtn.addEventListener(
            "click",
            async () => {

                await resendCode("email");

            }
        );

    }


    /* =====================================================
       RESEND PHONE CODE
    ===================================================== */

    if (sendPhoneBtn) {

        sendPhoneBtn.addEventListener(
            "click",
            async () => {

                await resendCode("phone");

            }
        );

    }


    /* =====================================================
       RESEND CODE
    ===================================================== */

    async function resendCode(method) {

        if (
            typeof API ===
            "undefined" ||
            typeof API.resendOtp !==
            "function"
        ) {

            showMessage(
                "Verification service is unavailable.",
                "error"
            );

            console.error(
                "API.resendOtp() is not available."
            );

            return;

        }


        const button =
            method === "email"
                ? sendEmailBtn
                : sendPhoneBtn;


        if (button) {

            button.disabled = true;

        }


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
                "Resend response:",
                result
            );


            if (
                result &&
                result.success
            ) {

                showMessage(

                    method === "email"

                        ? "A new verification code has been sent to your Gmail."

                        : "A new verification code has been sent to your phone.",

                    "success"

                );


                if (method === "email") {

                    startCooldown(
                        sendEmailBtn,
                        emailTimer
                    );

                } else {

                    startCooldown(
                        sendPhoneBtn,
                        phoneTimer
                    );

                }


                clearOTP();


                return;

            }


            showMessage(

                result &&
                result.message

                    ? result.message

                    : "Unable to send verification code.",

                "error"

            );


        } catch (error) {

            console.error(
                "Resend OTP error:",
                error
            );


            showMessage(
                "Unable to send verification code.",
                "error"
            );


        } finally {

            if (button) {

                button.disabled = false;

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

        if (!button || !timerElement) {
            return;
        }


        let seconds = 120;


        button.disabled = true;


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
                        ).padStart(2, "0");


                    seconds--;


                    if (seconds < 0) {

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
     * IMPORTANT:
     *
     * We DO NOT call:
     *
     * API.prepareOtp()
     * API.generateOtp()
     * API.generateOtp()
     *
     * and we DO NOT retrieve an OTP from
     * localStorage/sessionStorage.
     *
     * The user must manually enter the
     * code received through Gmail.
     */

});
