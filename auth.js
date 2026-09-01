// ============================================================
// STOCKFLOW AUTHENTICATION
// ============================================================
//
// StockFlow | Phone Accessories Inventory
//
// Supports:
// - Login
// - Registration
// - Gmail OTP
// - OTP verification
// - OTP resend
// - 4-attempt OTP protection
// - Demo OTP 123456
// - Forgot password
// - Recovery OTP
// - Password reset
// - Firebase synchronization
// - Session handling
//
// ============================================================


const SF =
    window.STOCKFLOW_CONFIG || {};


// ============================================================
// CONFIG
// ============================================================

const DEMO_OTP =
    SF.DEMO_OTP || "123456";


const APP_NAME =
    "StockFlow";


// ============================================================
// FIREBASE
// ============================================================

function firebaseUrl(
    path
) {

    if (
        !SF.FIREBASE_DATABASE_URL
    ) {

        throw new Error(
            "Firebase URL is missing."
        );

    }


    return (

        SF.FIREBASE_DATABASE_URL
            .replace(/\/$/, "") +

        "/" +

        String(path)
            .replace(/^\//, "") +

        ".json"

    );

}


async function firebaseGet(
    path
) {

    const response =
        await fetch(
            firebaseUrl(path)
        );


    if (!response.ok) {

        throw new Error(
            "Firebase GET failed."
        );

    }


    return response.json();

}


async function firebasePut(
    path,
    data
) {

    const response =
        await fetch(

            firebaseUrl(path),

            {

                method:
                    "PUT",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(data)

            }

        );


    if (!response.ok) {

        throw new Error(
            "Firebase PUT failed."
        );

    }


    return response.json();

}


async function firebasePatch(
    path,
    data
) {

    const response =
        await fetch(

            firebaseUrl(path),

            {

                method:
                    "PATCH",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(data)

            }

        );


    if (!response.ok) {

        throw new Error(
            "Firebase PATCH failed."
        );

    }


    return response.json();

}


// ============================================================
// GOOGLE APPS SCRIPT
// ============================================================

async function sheetPost(
    data
) {

    if (
        !SF.GOOGLE_APPS_SCRIPT_URL
    ) {

        throw new Error(
            "Google Apps Script URL is missing."
        );

    }


    const response =
        await fetch(

            SF.GOOGLE_APPS_SCRIPT_URL,

            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body:
                    JSON.stringify(data)

            }

        );


    if (!response.ok) {

        throw new Error(
            "Google Apps Script connection failed."
        );

    }


    const text =
        await response.text();


    try {

        return JSON.parse(
            text
        );

    }

    catch {

        console.error(
            "Apps Script response:",
            text
        );


        throw new Error(
            "Apps Script returned an invalid response."
        );

    }

}


// ============================================================
// UI
// ============================================================

function setMessage(
    element,
    type,
    message
) {

    if (!element) return;


    element.className =
        "form-message show " +
        type;


    element.textContent =
        message;

}


function clearErrors(
    form
) {

    if (!form) return;


    form
        .querySelectorAll(
            ".field-error"
        )
        .forEach(
            element => {

                element.textContent =
                    "";

            }
        );


    form
        .querySelectorAll(
            "input, select"
        )
        .forEach(
            element => {

                element.classList
                    .remove(
                        "invalid"
                    );

            }
        );

}


function showError(
    input,
    message
) {

    if (!input) return;


    input.classList.add(
        "invalid"
    );


    const error =
        input
            .closest(".field")
            ?.querySelector(
                ".field-error"
            );


    if (error) {

        error.textContent =
            message;

    }

}


// ============================================================
// VALIDATION
// ============================================================

function validEmail(
    value
) {

    return /^\S+@\S+\.\S+$/
        .test(
            value
        );

}


function validPhone(
    value
) {

    const phone =
        String(
            value || ""
        )
        .replace(
            /[\s-]/g,
            ""
        );


    return /^(09\d{9}|\+639\d{9})$/
        .test(
            phone
        );

}


function normalizePhone(
    value
) {

    let phone =
        String(
            value || ""
        )
        .replace(
            /[\s-]/g,
            ""
        );


    if (
        phone.startsWith("09")
    ) {

        phone =
            "+63" +
            phone.substring(1);

    }


    return phone;

}


function passwordScore(
    value
) {

    return (

        (value.length >= 8
            ? 1
            : 0) +

        (/[A-Z]/.test(value)
            ? 1
            : 0) +

        (/[a-z]/.test(value)
            ? 1
            : 0) +

        (/\d/.test(value)
            ? 1
            : 0) +

        (/[^A-Za-z0-9]/.test(value)
            ? 1
            : 0)

    );

}


// ============================================================
// SESSION
// ============================================================

function saveSession(
    user
) {

    const session = {

        uid:
            user.uid || null,

        username:
            user.username || "",

        fullName:
            user.fullName ||
            user.name ||
            "StockFlow User",

        role:
            user.role ||
            "Employee",

        email:
            user.email ||
            user.gmail ||
            "",

        phone:
            user.phone ||
            "",

        verified:
            user.verified === true,

        demo:
            user.demo === true,

        accountStatus:
            user.accountStatus ||
            "Active"

    };


    sessionStorage.setItem(

        "stockflow_session",

        JSON.stringify(
            session
        )

    );


    return session;

}


function getStockFlowSession() {

    try {

        return JSON.parse(

            sessionStorage.getItem(
                "stockflow_session"
            ) || "null"

        );

    }

    catch {

        return null;

    }

}


function clearVerificationSession() {

    sessionStorage.removeItem(
        "stockflow_pending_user"
    );

    sessionStorage.removeItem(
        "stockflow_demo_otp"
    );

    sessionStorage.removeItem(
        "stockflow_verification_mode"
    );

}


function clearRecoverySession() {

    sessionStorage.removeItem(
        "stockflow_recovery_session"
    );

}


// ============================================================
// PASSWORD TOGGLE
// ============================================================

document
    .querySelectorAll(
        ".password-toggle"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const input =
                        document.getElementById(
                            button.dataset.target
                        );


                    if (!input) return;


                    const show =
                        input.type ===
                        "password";


                    input.type =
                        show
                            ? "text"
                            : "password";


                    button.textContent =
                        show
                            ? "Hide"
                            : "Show";

                }
            );

        }
    );


// ============================================================
// LOGIN
// ============================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            clearErrors(
                loginForm
            );


            const identity =
                document.getElementById(
                    "loginIdentity"
                );


            const password =
                document.getElementById(
                    "loginPassword"
                );


            const message =
                document.getElementById(
                    "loginMessage"
                );


            const identityValue =
                identity?.value
                    .trim() || "";


            const passwordValue =
                password?.value || "";


            if (!identityValue) {

                showError(
                    identity,
                    "Username or email is required."
                );

                return;

            }


            if (!passwordValue) {

                showError(
                    password,
                    "Password is required."
                );

                return;

            }


            try {

                let user =
                    null;


                // ------------------------------------------------
                // GOOGLE APPS SCRIPT LOGIN
                // ------------------------------------------------

                if (
                    SF.ENABLE_GOOGLE_SHEET_SYNC
                ) {

                    const result =
                        await sheetPost({

                            action:
                                "login",

                            identity:
                                identityValue,

                            password:
                                passwordValue

                        });


                    if (
                        result.success
                    ) {

                        user = {

                            uid:
                                result.user?.uid ||
                                null,

                            username:
                                result.user?.username ||
                                identityValue,

                            fullName:
                                result.user?.name ||
                                "StockFlow User",

                            role:
                                result.user?.role ||
                                "Employee",

                            email:
                                result.user?.gmail ||
                                "",

                            phone:
                                result.user?.phone ||
                                "",

                            verified:
                                result.verified === true,

                            demo:
                                result.demo === true,

                            accountStatus:
                                result.user?.accountStatus ||
                                "Active"

                        };

                    }

                    else if (
                        result.message ===
                        "Your account is not verified yet."
                    ) {

                        setMessage(

                            message,

                            "error",

                            result.message

                        );

                        return;

                    }

                }


                // ------------------------------------------------
                // FIREBASE FALLBACK
                // ------------------------------------------------

                if (
                    !user &&
                    SF.ENABLE_FIREBASE
                ) {

                    try {

                        const users =
                            await firebaseGet(
                                "users"
                            );


                        if (users) {

                            for (
                                const [
                                    uid,
                                    account
                                ]
                                of Object.entries(
                                    users
                                )
                            ) {

                                const matches =

                                    String(
                                        account.username ||
                                        ""
                                    )
                                    .toLowerCase()
                                    ===
                                    identityValue
                                        .toLowerCase()

                                    ||

                                    String(
                                        account.email ||
                                        ""
                                    )
                                    .toLowerCase()
                                    ===
                                    identityValue
                                        .toLowerCase();


                                if (

                                    matches &&

                                    account.password ===
                                    passwordValue

                                ) {

                                    user = {

                                        ...account,

                                        uid

                                    };

                                    break;

                                }

                            }

                        }

                    }

                    catch (error) {

                        console.warn(
                            "Firebase login failed:",
                            error
                        );

                    }

                }


                // ------------------------------------------------
                // DEMO ADMIN
                // ------------------------------------------------

                if (

                    !user &&

                    identityValue
                        .toLowerCase()
                        === "admin" &&

                    passwordValue ===
                        "StockFlow@123"

                ) {

                    user = {

                        uid:
                            "stockflow_demo_admin",

                        fullName:
                            "Admin User",

                        username:
                            "admin",

                        age:
                            25,

                        email:
                            "admin@stockflow.local",

                        phone:
                            "09123456789",

                        role:
                            "Admin",

                        password:
                            "StockFlow@123",

                        verified:
                            true,

                        demo:
                            false,

                        accountStatus:
                            "Active"

                    };

                }


                if (!user) {

                    setMessage(

                        message,

                        "error",

                        "Invalid username/email or password."

                    );

                    return;

                }


                if (

                    user.verified === false &&

                    user.demo !== true

                ) {

                    setMessage(

                        message,

                        "error",

                        "Your account is not verified yet."

                    );

                    return;

                }


                saveSession(
                    user
                );


                window.location.href =
                    "dashboard.html";

            }

            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                setMessage(

                    message,

                    "error",

                    error.message ||
                    "Unable to connect to the authentication service."

                );

            }

        }
    );

}


// ============================================================
// REGISTER
// ============================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );


if (registerForm) {

    const password =
        document.getElementById(
            "registerPassword"
        );


    const passwordBar =
        document.getElementById(
            "passwordBar"
        );


    const passwordHint =
        document.getElementById(
            "passwordHint"
        );


    password?.addEventListener(
        "input",
        () => {

            const score =
                passwordScore(
                    password.value
                );


            if (passwordBar) {

                passwordBar.style.width =
                    `${score * 20}%`;

            }


            if (passwordHint) {

                passwordHint.textContent =

                    score < 3

                        ? "Weak password"

                        : score < 5

                            ? "Medium password"

                            : "Strong password";

            }

        }
    );


    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            clearErrors(
                registerForm
            );


            const fullName =
                document.getElementById(
                    "fullName"
                );


            const username =
                document.getElementById(
                    "username"
                );


            const age =
                document.getElementById(
                    "age"
                );


            const email =
                document.getElementById(
                    "email"
                );


            const phone =
                document.getElementById(
                    "phone"
                );


            const registerPassword =
                document.getElementById(
                    "registerPassword"
                );


            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                );


            const terms =
                document.getElementById(
                    "terms"
                );


            const message =
                document.getElementById(
                    "registerMessage"
                );


            let valid =
                true;


            if (
                !fullName ||
                fullName.value.trim().length < 2
            ) {

                showError(
                    fullName,
                    "Enter your full name."
                );

                valid = false;

            }


            if (
                !username ||
                !/^[A-Za-z0-9_.-]{4,20}$/
                    .test(
                        username.value.trim()
                    )
            ) {

                showError(
                    username,
                    "Use 4–20 valid username characters."
                );

                valid = false;

            }


            if (
                !age ||
                Number(age.value) < 18 ||
                Number(age.value) > 100
            ) {

                showError(
                    age,
                    "Age must be 18–100."
                );

                valid = false;

            }


            if (
                !email ||
                !validEmail(
                    email.value.trim()
                )
            ) {

                showError(
                    email,
                    "Enter a valid email address."
                );

                valid = false;

            }


            if (
                !phone ||
                !validPhone(
                    phone.value.trim()
                )
            ) {

                showError(
                    phone,
                    "Use 09XXXXXXXXX or +639XXXXXXXXX."
                );

                valid = false;

            }


            if (
                !registerPassword ||
                passwordScore(
                    registerPassword.value
                ) < 5
            ) {

                showError(
                    registerPassword,
                    "Use 8+ characters, uppercase, lowercase, number and symbol."
                );

                valid = false;

            }


            if (
                !confirmPassword ||
                confirmPassword.value !==
                registerPassword.value
            ) {

                showError(
                    confirmPassword,
                    "Passwords do not match."
                );

                valid = false;

            }


            if (
                !terms ||
                !terms.checked
            ) {

                setMessage(

                    message,

                    "error",

                    "Please agree to the Terms and Conditions."

                );

                valid = false;

            }


            if (!valid) return;


            const uid =

                "sf_" +
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2, 8);


            const user = {

                fullName:
                    fullName.value.trim(),

                username:
                    username.value.trim(),

                age:
                    Number(
                        age.value
                    ),

                email:
                    email.value
                        .trim()
                        .toLowerCase(),

                phone:
                    normalizePhone(
                        phone.value
                    ),

                password:
                    registerPassword.value,

                role:
                    "Employee",

                verified:
                    false,

                demo:
                    false,

                accountStatus:
                    "Pending Verification",

                verificationMethod:
                    "gmail",

                createdAt:
                    new Date()
                        .toISOString()

            };


            try {

                const result =
                    await sheetPost({

                        action:
                            "register",

                        uid:
                            uid,

                        name:
                            user.fullName,

                        username:
                            user.username,

                        password:
                            user.password,

                        age:
                            user.age,

                        gmail:
                            user.email,

                        phone:
                            user.phone,

                        role:
                            "Employee",

                        otpChannel:
                            "gmail"

                    });


                if (
                    !result.success
                ) {

                    throw new Error(

                        result.message ||
                        "Registration failed."

                    );

                }


                // ------------------------------------------------
                // FIREBASE
                // ------------------------------------------------

                if (
                    SF.ENABLE_FIREBASE
                ) {

                    try {

                        await firebasePut(

                            `users/${uid}`,

                            user

                        );

                    }

                    catch (firebaseError) {

                        console.warn(
                            "Firebase registration sync failed:",
                            firebaseError
                        );

                    }

                }


                // ------------------------------------------------
                // PENDING USER
                // ------------------------------------------------

                sessionStorage.setItem(

                    "stockflow_pending_user",

                    JSON.stringify({

                        uid:
                            uid,

                        username:
                            user.username,

                        email:
                            user.email,

                        phone:
                            user.phone,

                        verificationMethod:
                            "gmail"

                    })

                );


                sessionStorage.setItem(

                    "stockflow_verification_mode",

                    "registration"

                );


                sessionStorage.setItem(

                    "stockflow_demo_otp",

                    DEMO_OTP

                );


                setMessage(

                    message,

                    "success",

                    "Registration saved. Check your Gmail for the 6-digit verification code."

                );


                setTimeout(

                    () => {

                        window.location.href =
                            "verify.html";

                    },

                    900

                );

            }

            catch (error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );


                setMessage(

                    message,

                    "error",

                    error.message ||
                    "Registration could not be completed."

                );

            }

        }
    );

}


// ============================================================
// VERIFY PAGE
// ============================================================

const verifyForm =
    document.getElementById(
        "verifyForm"
    );


if (verifyForm) {

    const otpInputs = [

        ...document.querySelectorAll(
            "#otpInputs input"
        )

    ];


    const destination =
        document.getElementById(
            "verifyDestination"
        );


    const message =
        document.getElementById(
            "verifyMessage"
        );


    const pending =

        JSON.parse(

            sessionStorage.getItem(
                "stockflow_pending_user"
            ) || "null"

        );


    let currentChannel =

        pending?.verificationMethod ||
        "gmail";


    // --------------------------------------------------------
    // DISPLAY DESTINATION
    // --------------------------------------------------------

    function updateVerificationUI() {

        if (
            destination &&
            pending
        ) {

            if (
                currentChannel ===
                "phone"
            ) {

                destination.textContent =
                    pending.phone ||
                    "your registered phone number";

            }

            else {

                destination.textContent =
                    pending.email ||
                    "your registered Gmail";

            }

        }


        const paragraph =
            document.querySelector(
                ".auth-card-head p"
            );


        if (paragraph) {

            paragraph.textContent =

                currentChannel === "phone"

                    ? "Enter the 6-digit verification code sent to your registered phone."

                    : "Enter the 6-digit verification code sent to your registered Gmail.";

        }


        updateMethodButtons();

    }


    // --------------------------------------------------------
    // VERIFICATION METHOD BUTTONS
    // --------------------------------------------------------

    function updateMethodButtons() {

        const gmailButton =
            document.getElementById(
                "useGmailVerification"
            );


        const phoneButton =
            document.getElementById(
                "usePhoneVerification"
            );


        if (gmailButton) {

            gmailButton.style.display =

                currentChannel === "gmail"
                    ? "none"
                    : "inline-flex";

        }


        if (phoneButton) {

            phoneButton.style.display =

                currentChannel === "phone"
                    ? "none"
                    : "inline-flex";

        }

    }


    updateVerificationUI();


    // --------------------------------------------------------
    // OTP INPUTS
    // --------------------------------------------------------

    otpInputs.forEach(

        (
            input,
            index
        ) => {

            input.addEventListener(
                "input",
                () => {

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
                            otpInputs.length - 1
                    ) {

                        otpInputs[
                            index + 1
                        ].focus();

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

                        otpInputs[
                            index - 1
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
                        .slice(
                            0,
                            6
                        );


                    pasted
                        .split("")
                        .forEach(
                            (
                                digit,
                                i
                            ) => {

                                if (
                                    otpInputs[i]
                                ) {

                                    otpInputs[i]
                                        .value =
                                        digit;

                                }

                            }
                        );


                    otpInputs[
                        Math.min(
                            pasted.length,
                            otpInputs.length - 1
                        )
                    ]?.focus();

                }
            );

        }
    );


    // --------------------------------------------------------
    // VERIFY
    // --------------------------------------------------------

    verifyForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const otp =

                otpInputs
                    .map(
                        input =>
                            input.value
                    )
                    .join("");


            if (
                otp.length !== 6
            ) {

                setMessage(

                    message,

                    "error",

                    "Enter the complete 6-digit OTP."

                );

                return;

            }


            if (!pending) {

                setMessage(

                    message,

                    "error",

                    "Verification session expired. Please register again."

                );

                return;

            }


            // ------------------------------------------------
            // DEMO MODE
            // ------------------------------------------------

            if (
                otp === DEMO_OTP
            ) {

                const demoSession = {

                    uid:
                        pending.uid,

                    username:
                        pending.username,

                    fullName:
                        "StockFlow User",

                    role:
                        "Employee",

                    email:
                        pending.email,

                    phone:
                        pending.phone,

                    verified:
                        false,

                    demo:
                        true,

                    accountStatus:
                        "Demo"

                };


                try {

                    if (
                        SF.ENABLE_FIREBASE &&
                        pending.uid
                    ) {

                        const firebaseUser =
                            await firebaseGet(
                                `users/${pending.uid}`
                            );


                        if (
                            firebaseUser
                        ) {

                            demoSession.fullName =
                                firebaseUser.fullName ||
                                demoSession.fullName;

                            demoSession.role =
                                firebaseUser.role ||
                                "Employee";

                        }

                    }

                }

                catch (error) {

                    console.warn(
                        "Demo Firebase load failed:",
                        error
                    );

                }


                saveSession(
                    demoSession
                );


                clearVerificationSession();


                setMessage(

                    message,

                    "success",

                    "DEMO access granted. Your account is NOT fully verified."

                );


                setTimeout(

                    () => {

                        window.location.href =
                            "dashboard.html";

                    },

                    900

                );


                return;

            }


            try {

                const result =
                    await sheetPost({

                        action:
                            "verifyOtp",

                        identity:
                            pending.username,

                        otp:
                            otp,

                        verificationMethod:
                            currentChannel

                    });


                if (
                    !result.success
                ) {

                    setMessage(

                        message,

                        "error",

                        result.message ||
                        "Invalid verification code."

                    );

                    return;

                }


                // ------------------------------------------------
                // FIREBASE SYNC
                // ------------------------------------------------

                if (
                    SF.ENABLE_FIREBASE &&
                    pending.uid
                ) {

                    try {

                        await firebasePatch(

                            `users/${pending.uid}`,

                            {

                                verified:
                                    true,

                                demo:
                                    false,

                                accountStatus:
                                    "Active",

                                verifiedAt:
                                    new Date()
                                        .toISOString()

                            }

                        );

                    }

                    catch (firebaseError) {

                        console.warn(
                            "Firebase verification sync failed:",
                            firebaseError
                        );

                    }

                }


                clearVerificationSession();


                setMessage(

                    message,

                    "success",

                    "Account verified successfully. Redirecting to login..."

                );


                setTimeout(

                    () => {

                        window.location.href =
                            "login.html";

                    },

                    1000

                );

            }

            catch (error) {

                console.error(
                    "VERIFY ERROR:",
                    error
                );


                setMessage(

                    message,

                    "error",

                    error.message ||
                    "Verification failed."

                );

            }

        }
    );


    // --------------------------------------------------------
    // RESEND
    // --------------------------------------------------------

    const resendButton =
        document.getElementById(
            "resendOtp"
        );


    const countdown =
        document.getElementById(
            "countdown"
        );


    let seconds =
        60;


    function updateCountdown() {

        if (countdown) {

            countdown.textContent =
                seconds;

        }


        if (
            seconds <= 0
        ) {

            if (resendButton) {

                resendButton.disabled =
                    false;

                resendButton.textContent =
                    "Resend code";

            }

            return;

        }


        if (resendButton) {

            resendButton.disabled =
                true;

            resendButton.textContent =
                `Resend in ${seconds}s`;

        }


        seconds--;


        setTimeout(
            updateCountdown,
            1000
        );

    }


    updateCountdown();


    resendButton?.addEventListener(
        "click",
        async () => {

            if (!pending) {

                setMessage(

                    message,

                    "error",

                    "Verification session expired."

                );

                return;

            }


            try {

                resendButton.disabled =
                    true;


                resendButton.textContent =
                    "Sending...";


                const result =
                    await sheetPost({

                        action:
                            "requestOtp",

                        identity:
                            pending.username,

                        verificationMethod:
                            currentChannel

                    });


                if (
                    !result.success
                ) {

                    throw new Error(

                        result.message ||
                        "Unable to send OTP."

                    );

                }


                seconds =
                    60;


                setMessage(

                    message,

                    "success",

                    "A new OTP was sent to your registered Gmail."

                );


                updateCountdown();

            }

            catch (error) {

                resendButton.disabled =
                    false;

                resendButton.textContent =
                    "Resend code";


                setMessage(

                    message,

                    "error",

                    error.message ||
                    "Unable to send OTP."

                );

            }

        }
    );


    // --------------------------------------------------------
    // USE GMAIL
    // --------------------------------------------------------

    document
        .getElementById(
            "useGmailVerification"
        )
        ?.addEventListener(
            "click",
            async () => {

                currentChannel =
                    "gmail";


                if (pending) {

                    pending.verificationMethod =
                        "gmail";


                    sessionStorage.setItem(

                        "stockflow_pending_user",

                        JSON.stringify(
                            pending
                        )

                    );

                }


                updateVerificationUI();


                setMessage(

                    message,

                    "success",

                    "Gmail verification selected."

                );


                try {

                    const result =
                        await sheetPost({

                            action:
                                "requestOtp",

                            identity:
                                pending.username,

                            verificationMethod:
                                "gmail"

                        });


                    if (
                        !result.success
                    ) {

                        throw new Error(
                            result.message
                        );

                    }


                    setMessage(

                        message,

                        "success",

                        "A new OTP was sent to your Gmail."

                    );

                }

                catch (error) {

                    setMessage(

                        message,

                        "error",

                        error.message

                    );

                }

            }
        );


    // --------------------------------------------------------
    // USE PHONE
    // --------------------------------------------------------

    document
        .getElementById(
            "usePhoneVerification"
        )
        ?.addEventListener(
            "click",
            async () => {

                currentChannel =
                    "phone";


                if (pending) {

                    pending.verificationMethod =
                        "phone";


                    sessionStorage.setItem(

                        "stockflow_pending_user",

                        JSON.stringify(
                            pending
                        )

                    );

                }


                updateVerificationUI();


                setMessage(

                    message,

                    "error",

                    "Phone SMS is not connected yet. Please use Gmail verification."

                );

            }
        );

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

const forgotForm =
    document.getElementById(
        "forgotForm"
    );


if (forgotForm) {

    forgotForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            clearErrors(
                forgotForm
            );


            const contact =
                document.getElementById(
                    "recoveryContact"
                );


            const message =
                document.getElementById(
                    "forgotMessage"
                );


            const submit =
                document.getElementById(
                    "forgotSubmit"
                );


            const submitText =
                document.getElementById(
                    "forgotSubmitText"
                );


            const value =
                contact?.value
                    .trim() || "";


            if (!value) {

                showError(

                    contact,

                    "Enter your email or phone number."

                );

                return;

            }


            if (
                value.includes("@")
            ) {

                if (
                    !validEmail(
                        value
                    )
                ) {

                    showError(

                        contact,

                        "Enter a valid email address."

                    );

                    return;

                }

            }

            else {

                if (
                    !validPhone(
                        value
                    )
                ) {

                    showError(

                        contact,

                        "Enter a valid phone number."

                    );

                    return;

                }

            }


            try {

                if (submit) {

                    submit.disabled =
                        true;

                }


                if (submitText) {

                    submitText.textContent =
                        "Sending...";

                }


                const result =
                    await sheetPost({

                        action:
                            "forgotPassword",

                        identity:
                            value

                    });


                if (
                    !result.success
                ) {

                    throw new Error(

                        result.message ||
                        "Recovery request failed."

                    );

                }


                // ------------------------------------------------
                // SAVE RECOVERY SESSION
                // ------------------------------------------------

                sessionStorage.setItem(

                    "stockflow_recovery_session",

                    JSON.stringify({

                        uid:
                            result.uid,

                        username:
                            result.username,

                        email:
                            result.email,

                        phone:
                            result.phone,

                        verificationMethod:
                            "gmail"

                    })

                );


                sessionStorage.setItem(

                    "stockflow_recovery_destination",

                    result.destination ||
                    result.email

                );


                setMessage(

                    message,

                    "success",

                    "Recovery code sent to your registered Gmail."

                );


                setTimeout(

                    () => {

                        window.location.href =
                            "recovery.html";

                    },

                    800

                );

            }

            catch (error) {

                console.error(
                    "FORGOT PASSWORD ERROR:",
                    error
                );


                setMessage(

                    message,

                    "error",

                    error.message ||
                    "Unable to process recovery request."

                );


                if (submit) {

                    submit.disabled =
                        false;

                }


                if (submitText) {

                    submitText.textContent =
                        "Send recovery code";

                }

            }

        }
    );

}


// ============================================================
// RECOVERY PAGE
// ============================================================

const recoveryOtpForm =
    document.getElementById(
        "recoveryOtpForm"
    );


if (recoveryOtpForm) {

    const recoverySession =

        JSON.parse(

            sessionStorage.getItem(
                "stockflow_recovery_session"
            ) || "null"

        );


    const recoveryDestination =
        document.getElementById(
            "recoveryDestination"
        );


    const recoveryMessage =
        document.getElementById(
            "recoveryMessage"
        );


    const recoveryInputs = [

        ...document.querySelectorAll(
            "#recoveryOtpInputs input"
        )

    ];


    const otpStep =
        document.getElementById(
            "recoveryOtpStep"
        );


    const passwordStep =
        document.getElementById(
            "newPasswordStep"
        );


    const successStep =
        document.getElementById(
            "recoverySuccessStep"
        );


    if (
        !recoverySession
    ) {

        setMessage(

            recoveryMessage,

            "error",

            "Recovery session expired. Please start again."

        );

    }


    if (
        recoveryDestination &&
        recoverySession
    ) {

        recoveryDestination.textContent =

            sessionStorage.getItem(
                "stockflow_recovery_destination"
            ) ||

            recoverySession.email ||

            "your registered Gmail";

    }


    // --------------------------------------------------------
    // RECOVERY OTP INPUTS
    // --------------------------------------------------------

    recoveryInputs.forEach(

        (
            input,
            index
        ) => {

            input.addEventListener(
                "input",
                () => {

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
                            recoveryInputs.length - 1
                    ) {

                        recoveryInputs[
                            index + 1
                        ].focus();

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

                        recoveryInputs[
                            index - 1
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
                        .slice(
                            0,
                            6
                        );


                    pasted
                        .split("")
                        .forEach(
                            (
                                digit,
                                i
                            ) => {

                                if (
                                    recoveryInputs[i]
                                ) {

                                    recoveryInputs[i]
                                        .value =
                                        digit;

                                }

                            }
                        );

                }
            );

        }
    );


    // --------------------------------------------------------
    // VERIFY RECOVERY OTP
    // --------------------------------------------------------

    recoveryOtpForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const otp =

                recoveryInputs
                    .map(
                        input =>
                            input.value
                    )
                    .join("");


            if (
                otp.length !== 6
            ) {

                setMessage(

                    recoveryMessage,

                    "error",

                    "Enter the complete 6-digit recovery code."

                );

                return;

            }


            if (
                !recoverySession
            ) {

                setMessage(

                    recoveryMessage,

                    "error",

                    "Recovery session expired."

                );

                return;

            }


            try {

                const result =
                    await sheetPost({

                        action:
                            "verifyRecoveryOtp",

                        identity:
                            recoverySession.username,

                        otp:
                            otp

                    });


                if (
                    !result.success
                ) {

                    setMessage(

                        recoveryMessage,

                        "error",

                        result.message ||
                        "Invalid recovery code."

                    );

                    return;

                }


                sessionStorage.setItem(

                    "stockflow_recovery_token",

                    result.recoveryToken

                );


                sessionStorage.setItem(

                    "stockflow_recovery_uid",

                    result.uid || ""

                );


                if (otpStep) {

                    otpStep.style.display =
                        "none";

                }


                if (passwordStep) {

                    passwordStep.style.display =
                        "block";

                }

            }

            catch (error) {

                console.error(
                    "RECOVERY VERIFY ERROR:",
                    error
                );


                setMessage(

                    recoveryMessage,

                    "error",

                    error.message ||
                    "Recovery verification failed."

                );

            }

        }
    );


    // --------------------------------------------------------
    // RECOVERY RESEND
    // --------------------------------------------------------

    const resendRecovery =
        document.getElementById(
            "resendRecoveryOtp"
        );


    const recoveryCountdown =
        document.getElementById(
            "recoveryCountdown"
        );


    let recoverySeconds =
        60;


    function recoveryTimer() {

        if (
            recoveryCountdown
        ) {

            recoveryCountdown.textContent =
                recoverySeconds;

        }


        if (
            recoverySeconds <= 0
        ) {

            if (
                resendRecovery
            ) {

                resendRecovery.disabled =
                    false;

                resendRecovery.textContent =
                    "Resend code";

            }

            return;

        }


        if (
            resendRecovery
        ) {

            resendRecovery.disabled =
                true;

            resendRecovery.textContent =
                `Resend in ${recoverySeconds}s`;

        }


        recoverySeconds--;


        setTimeout(
            recoveryTimer,
            1000
        );

    }


    recoveryTimer();


    resendRecovery?.addEventListener(
        "click",
        async () => {

            if (
                !recoverySession
            ) return;


            try {

                resendRecovery.disabled =
                    true;


                resendRecovery.textContent =
                    "Sending...";


                const result =
                    await sheetPost({

                        action:
                            "forgotPassword",

                        identity:
                            recoverySession.username

                    });


                if (
                    !result.success
                ) {

                    throw new Error(
                        result.message
                    );

                }


                recoverySeconds =
                    60;


                setMessage(

                    recoveryMessage,

                    "success",

                    "A new recovery code was sent to your Gmail."

                );


                recoveryTimer();

            }

            catch (error) {

                resendRecovery.disabled =
                    false;

                resendRecovery.textContent =
                    "Resend code";


                setMessage(

                    recoveryMessage,

                    "error",

                    error.message

                );

            }

        }
    );

}


// ============================================================
// NEW PASSWORD
// ============================================================

const newPasswordForm =
    document.getElementById(
        "newPasswordForm"
    );


if (newPasswordForm) {

    const newPassword =
        document.getElementById(
            "newPassword"
        );


    const confirmNewPassword =
        document.getElementById(
            "confirmNewPassword"
        );


    const passwordBar =
        document.getElementById(
            "recoveryPasswordBar"
        );


    const passwordHint =
        document.getElementById(
            "recoveryPasswordHint"
        );


    const message =
        document.getElementById(
            "passwordMessage"
        );


    const otpStep =
        document.getElementById(
            "recoveryOtpStep"
        );


    const passwordStep =
        document.getElementById(
            "newPasswordStep"
        );


    const successStep =
        document.getElementById(
            "recoverySuccessStep"
        );


    newPassword?.addEventListener(
        "input",
        () => {

            const score =
                passwordScore(
                    newPassword.value
                );


            if (passwordBar) {

                passwordBar.style.width =
                    `${score * 20}%`;

            }


            if (passwordHint) {

                passwordHint.textContent =

                    score < 3

                        ? "Weak password"

                        : score < 5

                            ? "Medium password"

                            : "Strong password";

            }

        }
    );


    newPasswordForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            clearErrors(
                newPasswordForm
            );


            const token =
                sessionStorage.getItem(
                    "stockflow_recovery_token"
                );


            if (!token) {

                setMessage(

                    message,

                    "error",

                    "Recovery session expired. Please start again."

                );

                return;

            }


            if (
                passwordScore(
                    newPassword.value
                ) < 5
            ) {

                showError(

                    newPassword,

                    "Use 8+ characters with uppercase, lowercase, number and symbol."

                );

                return;

            }


            if (
                newPassword.value !==
                confirmNewPassword.value
            ) {

                showError(

                    confirmNewPassword,

                    "Passwords do not match."

                );

                return;

            }


            try {

                const result =
                    await sheetPost({

                        action:
                            "resetPassword",

                        recoveryToken:
                            token,

                        newPassword:
                            newPassword.value

                    });


                if (
                    !result.success
                ) {

                    throw new Error(
                        result.message
                    );

                }


                // ------------------------------------------------
                // FIREBASE PASSWORD SYNC
                // ------------------------------------------------

                const uid =
                    sessionStorage.getItem(
                        "stockflow_recovery_uid"
                    );


                if (
                    SF.ENABLE_FIREBASE &&
                    uid
                ) {

                    try {

                        await firebasePatch(

                            `users/${uid}`,

                            {

                                password:
                                    newPassword.value

                            }

                        );

                    }

                    catch (firebaseError) {

                        console.warn(
                            "Firebase password sync failed:",
                            firebaseError
                        );

                    }

                }


                sessionStorage.removeItem(
                    "stockflow_recovery_token"
                );


                sessionStorage.removeItem(
                    "stockflow_recovery_uid"
                );


                sessionStorage.removeItem(
                    "stockflow_recovery_session"
                );


                if (passwordStep) {

                    passwordStep.style.display =
                        "none";

                }


                if (otpStep) {

                    otpStep.style.display =
                        "none";

                }


                if (successStep) {

                    successStep.style.display =
                        "block";

                }

            }

            catch (error) {

                console.error(
                    "PASSWORD RESET ERROR:",
                    error
                );


                setMessage(

                    message,

                    "error",

                    error.message ||
                    "Password reset failed."

                );

            }

        }
    );

}


// ============================================================
// RECOVERY SUCCESS → LOGIN
// ============================================================

document
    .getElementById(
        "recoveryLoginButton"
    )
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "login.html";

        }
    );


// ============================================================
// LOGOUT
// ============================================================

function stockflowLogout() {

    sessionStorage.clear();

    window.location.href =
        "login.html";

}
