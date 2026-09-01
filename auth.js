// ============================================================
// STOCKFLOW AUTHENTICATION
// ============================================================
// #8 AUTH.JS
//
// Supports:
// - Google Apps Script authentication backend
// - Real Gmail OTP
// - OTP expiration
// - OTP resend
// - OTP verification
// - Demo OTP: 123456
// - Demo Mode
// - Employee public registration
// - Protected Admin registration
// - Firebase synchronization
// - Login
// - Forgot Password
//
// IMPORTANT:
// Real OTP generation, storage, expiration and validation
// should be handled by Google Apps Script.
//
// DEMO OTP:
// 123456 is intentionally kept for school/demo purposes.
// It MUST NOT mark the account as fully verified.
// ============================================================


const SF = window.STOCKFLOW_CONFIG || {};


// ============================================================
// CONFIGURATION
// ============================================================

const DEMO_OTP =
    SF.DEMO_OTP || "123456";

const APP_NAME =
    "StockFlow";


// ============================================================
// DEMO ACCOUNT
// ============================================================

const DEMO_USER = {

    uid: "stockflow_demo_admin",

    fullName: "Admin User",

    username: "admin",

    age: 25,

    email: "admin@stockflow.local",

    phone: "09123456789",

    password: "StockFlow@123",

    role: "Admin",

    verified: true,

    demo: false,

    accountStatus: "Active"

};


// ============================================================
// FIREBASE
// ============================================================


function firebaseUrl(path) {

    if (!SF.FIREBASE_DATABASE_URL) {

        throw new Error(
            "Firebase URL is missing."
        );

    }

    return (

        `${SF.FIREBASE_DATABASE_URL.replace(/\/$/, "")}/` +

        `${String(path).replace(/^\//, "")}.json`

    );

}


async function firebaseGet(path) {

    const response =
        await fetch(
            firebaseUrl(path)
        );


    if (!response.ok) {

        throw new Error(
            `Firebase GET failed: ${response.status}`
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

                method: "PUT",

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
            `Firebase PUT failed: ${response.status}`
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

                method: "PATCH",

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
            `Firebase PATCH failed: ${response.status}`
        );

    }


    return response.json();

}


// ============================================================
// GOOGLE APPS SCRIPT
// ============================================================


async function sheetPost(data) {

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

                method: "POST",

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
            `Google Apps Script failed: ${response.status}`
        );

    }


    const text =
        await response.text();


    try {

        return JSON.parse(text);

    }

    catch {

        console.error(
            "Invalid Apps Script response:",
            text
        );


        throw new Error(
            "Apps Script returned an invalid response."
        );

    }

}


// ============================================================
// UI HELPERS
// ============================================================


function setMessage(
    element,
    type,
    message
) {

    if (!element) return;


    element.className =
        `form-message show ${type}`;


    element.textContent =
        message;

}


function clearErrors(form) {

    if (!form) return;


    form.querySelectorAll(
        ".field-error"
    ).forEach(element => {

        element.textContent = "";

    });


    form.querySelectorAll(
        "input, select"
    ).forEach(element => {

        element.classList.remove(
            "invalid"
        );

    });

}


function showError(
    input,
    message
) {

    if (!input) return;


    input.classList.add(
        "invalid"
    );


    const errorElement =
        input
            .closest(".field")
            ?.querySelector(
                ".field-error"
            );


    if (errorElement) {

        errorElement.textContent =
            message;

    }

}


// ============================================================
// VALIDATION
// ============================================================


function validEmail(value) {

    return /^\S+@\S+\.\S+$/.test(
        value
    );

}


function validPhone(value) {

    const phone =
        String(value || "")
            .replace(
                /[\s-]/g,
                ""
            );


    return /^(09\d{9}|\+639\d{9})$/.test(
        phone
    );

}


function normalizePhone(value) {

    let phone =
        String(value || "")
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


function passwordScore(value) {

    return (

        (value.length >= 8 ? 1 : 0) +

        (/[A-Z]/.test(value) ? 1 : 0) +

        (/[a-z]/.test(value) ? 1 : 0) +

        (/\d/.test(value) ? 1 : 0) +

        (/[^A-Za-z0-9]/.test(value) ? 1 : 0)

    );

}


// ============================================================
// SESSION HELPERS
// ============================================================


function saveSession(user) {

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
            (
                user.demo
                    ? "Demo"
                    : "Active"
            )

    };


    sessionStorage.setItem(

        "stockflow_session",

        JSON.stringify(session)

    );


    return session;

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


// ============================================================
// PASSWORD TOGGLE
// ============================================================


document
    .querySelectorAll(
        ".password-toggle"
    )
    .forEach(button => {

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

    });


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


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

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

                let user = null;


                // ============================================
                // FIREBASE LOGIN
                // ============================================

                if (
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

                                const identityMatches =

                                    String(
                                        account.username ||
                                        ""
                                    ).toLowerCase() ===
                                        identityValue.toLowerCase()

                                    ||

                                    String(
                                        account.email ||
                                        ""
                                    ).toLowerCase() ===
                                        identityValue.toLowerCase();


                                if (

                                    identityMatches &&

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


                // ============================================
                // GOOGLE APPS SCRIPT LOGIN
                // ============================================

                if (

                    !user &&

                    SF.ENABLE_GOOGLE_SHEET_SYNC

                ) {

                    try {

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
                                    result.user?.fullName ||
                                    "StockFlow User",

                                role:
                                    result.user?.role ||
                                    "Employee",

                                email:
                                    result.user?.gmail ||
                                    result.user?.email ||
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

                                    (
                                        result.demo
                                            ? "Demo"
                                            : "Active"
                                    )

                            };

                        }

                        else {

                            if (
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

                    }

                    catch (error) {

                        console.warn(
                            "Apps Script login failed:",
                            error
                        );

                    }

                }


                // ============================================
                // LOCAL DEMO ADMIN
                // ============================================

                if (

                    !user &&

                    identityValue.toLowerCase() ===
                        "admin" &&

                    passwordValue ===
                        "StockFlow@123"

                ) {

                    user = {
                        ...DEMO_USER
                    };

                }


                // ============================================
                // INVALID LOGIN
                // ============================================

                if (!user) {

                    setMessage(

                        message,

                        "error",

                        "Invalid username/email or password."

                    );

                    return;

                }


                // ============================================
                // VERIFICATION CHECK
                // ============================================

                if (

                    user.verified === false &&

                    user.demo !== true

                ) {

                    setMessage(

                        message,

                        "error",

                        "Your account is not verified yet. Please complete OTP verification first."

                    );

                    return;

                }


                // ============================================
                // SAVE SESSION
                // ============================================

                saveSession(user);


                // ============================================
                // REDIRECT
                // ============================================

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


    // --------------------------------------------------------
    // PASSWORD STRENGTH
    // --------------------------------------------------------

    password?.addEventListener(
        "input",
        () => {

            const strength =
                passwordScore(
                    password.value
                );


            if (passwordBar) {

                passwordBar.style.width =
                    `${strength * 20}%`;

            }


            if (passwordHint) {

                passwordHint.textContent =

                    strength < 3

                        ? "Weak password"

                        : strength < 5

                            ? "Medium password"

                            : "Strong password";

            }

        }

    );


    // --------------------------------------------------------
    // REGISTRATION
    // --------------------------------------------------------

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


            const verificationMethod =
                document.getElementById(
                    "verificationMethod"
                );


            let valid = true;


            // ------------------------------------------------
            // FULL NAME
            // ------------------------------------------------

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


            // ------------------------------------------------
            // USERNAME
            // ------------------------------------------------

            if (

                !username ||

                !/^[A-Za-z0-9_.-]{4,20}$/.test(
                    username.value.trim()
                )

            ) {

                showError(
                    username,
                    "Use 4–20 valid username characters."
                );

                valid = false;

            }


            // ------------------------------------------------
            // AGE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // EMAIL
            // ------------------------------------------------

            if (

                !email ||

                !validEmail(
                    email.value.trim()
                )

            ) {

                showError(
                    email,
                    "Enter a valid Gmail/email address."
                );

                valid = false;

            }


            // ------------------------------------------------
            // PHONE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // PASSWORD
            // ------------------------------------------------

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


            // ------------------------------------------------
            // CONFIRM PASSWORD
            // ------------------------------------------------

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


            // ------------------------------------------------
            // TERMS
            // ------------------------------------------------

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


            // ------------------------------------------------
            // VERIFICATION CHANNEL
            // ------------------------------------------------

            let otpChannel =

                verificationMethod?.value ||

                "gmail";


            if (

                otpChannel !== "gmail" &&

                otpChannel !== "phone"

            ) {

                otpChannel = "gmail";

            }


            // ------------------------------------------------
            // UID
            // ------------------------------------------------

            const uid =

                `sf_${Date.now()}_` +

                Math.random()
                    .toString(36)
                    .slice(2, 8);


            // ------------------------------------------------
            // USER
            // ------------------------------------------------

            const user = {

                fullName:
                    fullName.value.trim(),

                username:
                    username.value.trim(),

                age:
                    Number(age.value),

                email:
                    email.value.trim().toLowerCase(),

                phone:
                    normalizePhone(
                        phone.value.trim()
                    ),

                password:
                    registerPassword.value,

                // IMPORTANT:
                // Public registration is always Employee.
                role:
                    "Employee",

                verified:
                    false,

                demo:
                    false,

                accountStatus:
                    "Pending Verification",

                verificationMethod:
                    otpChannel,

                createdAt:
                    new Date().toISOString()

            };


            try {

                // ============================================
                // REGISTER ON APPS SCRIPT
                // ============================================

                const result =
                    await sheetPost({

                        action:
                            "register",

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
                            otpChannel

                    });


                if (
                    !result.success
                ) {

                    throw new Error(

                        result.message ||

                        "Registration failed."

                    );

                }


                // ============================================
                // FIREBASE
                // ============================================

                if (
                    SF.ENABLE_FIREBASE
                ) {

                    await firebasePut(

                        `users/${uid}`,

                        user

                    );

                }


                // ============================================
                // PENDING VERIFICATION
                // ============================================

                sessionStorage.setItem(

                    "stockflow_pending_user",

                    JSON.stringify({

                        uid,

                        username:
                            user.username,

                        email:
                            user.email,

                        phone:
                            user.phone,

                        verificationMethod:
                            otpChannel

                    })

                );


                sessionStorage.setItem(

                    "stockflow_verification_mode",

                    "registration"

                );


                // ============================================
                // DEMO OTP
                // ============================================
                //
                // This is intentionally kept because the
                // school/demo version supports Demo Mode.
                //
                // IMPORTANT:
                // The real OTP is NEVER stored here.
                //
                // 123456 is only a public demo shortcut.
                // ============================================

                sessionStorage.setItem(

                    "stockflow_demo_otp",

                    DEMO_OTP

                );


                const destination =

                    otpChannel === "phone"

                        ? user.phone

                        : user.email;


                setMessage(

                    message,

                    "success",

                    `Registration saved. A real OTP was sent to ${destination}.`

                );


                setTimeout(

                    () => {

                        window.location.href =
                            "verify.html";

                    },

                    800

                );


            }

            catch (error) {

                console.error(

                    "REGISTRATION ERROR:",

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
// VERIFY OTP
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


    const pending =

        JSON.parse(

            sessionStorage.getItem(
                "stockflow_pending_user"
            ) || "null"

        );


    const destination =

        document.getElementById(
            "verifyDestination"
        );


    const message =

        document.getElementById(
            "verifyMessage"
        );


    const mode =

        sessionStorage.getItem(
            "stockflow_verification_mode"
        ) || "registration";


    // ========================================================
    // DESTINATION
    // ========================================================

    if (

        pending &&

        destination

    ) {

        const channel =

            pending.verificationMethod ||
            "gmail";


        destination.textContent =

            channel === "phone"

                ? pending.phone

                : pending.email;

    }


    // ========================================================
    // VERIFICATION PAGE TEXT
    // ========================================================

    if (
        mode === "reverify"
    ) {

        const heading =

            document.querySelector(
                ".auth-card-head h2"
            );


        const paragraph =

            document.querySelector(
                ".auth-card-head p"
            );


        if (heading) {

            heading.textContent =
                "Re-verify your account";

        }


        if (paragraph) {

            paragraph.textContent =

                "Enter the 6-digit OTP sent to your registered Gmail or phone.";

        }

    }


    // ========================================================
    // DEMO OTP DISPLAY
    // ========================================================
    //
    // The demo code MUST appear immediately above:
    //
    // "USE ANOTHER VERIFICATION METHOD"
    //
    // This function tries several possible selectors so
    // your existing HTML does not need to be completely
    // rewritten.
    // ========================================================


    function createDemoOtpHint() {

        if (!pending) return;


        // Prevent duplicate creation

        if (
            document.getElementById(
                "stockflowDemoOtp"
            )
        ) {

            return;

        }


        // ----------------------------------------------------
        // Find "USE ANOTHER VERIFICATION METHOD"
        // ----------------------------------------------------

        const allElements =

            [
                ...document.querySelectorAll(
                    "button, a, p, span, div"
                )
            ];


        let target = null;


        for (
            const element of allElements
        ) {

            const text =
                element.textContent
                    ?.trim()
                    .toUpperCase();


            if (
                text ===
                "USE ANOTHER VERIFICATION METHOD"
            ) {

                target = element;

                break;

            }

        }


        // ----------------------------------------------------
        // Create Demo Hint
        // ----------------------------------------------------

        const demoBox =
            document.createElement(
                "div"
            );


        demoBox.id =
            "stockflowDemoOtp";


        demoBox.innerHTML = `

            <div
                style="
                    margin:14px 0 10px;
                    padding:10px 12px;
                    border:1px solid #dbe7f5;
                    background:#f6f9fd;
                    border-radius:10px;
                    text-align:center;
                "
            >

                <div
                    style="
                        font-size:9px;
                        font-weight:800;
                        letter-spacing:.6px;
                        color:#64748b;
                        margin-bottom:4px;
                    "
                >
                    DEMO MODE
                </div>

                <div
                    style="
                        font-size:11px;
                        color:#64748b;
                    "
                >
                    Stuck waiting for the real OTP?
                </div>

                <div
                    style="
                        margin-top:5px;
                        font-size:20px;
                        font-weight:900;
                        letter-spacing:4px;
                        color:#1769e0;
                    "
                >
                    ${DEMO_OTP}
                </div>

                <div
                    style="
                        margin-top:4px;
                        font-size:9px;
                        color:#94a3b8;
                    "
                >
                    Demo access only — account remains unverified.
                </div>

            </div>

        `;


        // ----------------------------------------------------
        // Insert DIRECTLY BEFORE
        // "USE ANOTHER VERIFICATION METHOD"
        // ----------------------------------------------------

        if (target) {

            target.parentNode.insertBefore(
                demoBox,
                target
            );

            return;

        }


        // ----------------------------------------------------
        // Fallback selectors
        // ----------------------------------------------------

        const fallback =

            document.querySelector(
                "#anotherVerificationMethod"
            ) ||

            document.querySelector(
                ".another-verification"
            ) ||

            document.querySelector(
                ".verification-method"
            ) ||

            document.querySelector(
                ".resend-row"
            );


        if (fallback) {

            fallback.parentNode.insertBefore(
                demoBox,
                fallback
            );

            return;

        }


        // ----------------------------------------------------
        // Last fallback:
        // place at bottom of verification card
        // ----------------------------------------------------

        const card =

            document.querySelector(
                ".verification-card"
            ) ||

            document.querySelector(
                ".auth-card"
            );


        if (card) {

            card.appendChild(
                demoBox
            );

        }

    }


    createDemoOtpHint();


    // ========================================================
    // OTP INPUT
    // ========================================================

    otpInputs.forEach(
        (input, index) => {

            input.addEventListener(
                "input",
                () => {

                    input.value =

                        input.value.replace(
                            /\D/g,
                            ""
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
                            .getData("text")
                            .replace(/\D/g, "")
                            .slice(0, 6);


                    if (!pasted) return;


                    pasted
                        .split("")
                        .forEach(
                            (digit, i) => {

                                if (
                                    otpInputs[i]
                                ) {

                                    otpInputs[i]
                                        .value =
                                        digit;

                                }

                            }
                        );


                    const next =
                        otpInputs[
                            Math.min(
                                pasted.length,
                                otpInputs.length - 1
                            )
                        ];


                    next?.focus();

                }
            );

        }
    );


    // ========================================================
    // VERIFY OTP
    // ========================================================

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


            try {

                // ============================================
                // SERVER VERIFICATION
                // ============================================

                const result =

                    await sheetPost({

                        action:
                            "verifyOtp",

                        identity:
                            pending.username,

                        otp,

                        verificationMethod:
                            pending.verificationMethod ||
                            "gmail"

                    });


                if (
                    !result.success
                ) {

                    setMessage(

                        message,

                        "error",

                        result.message ||

                        "Incorrect verification code."

                    );

                    return;

                }


                // ============================================
                // UPDATE FIREBASE
                // ============================================

                if (

                    SF.ENABLE_FIREBASE &&

                    pending.uid

                ) {

                    try {

                        await firebasePatch(

                            `users/${pending.uid}`,

                            {

                                verified:
                                    result.verified === true,

                                demo:
                                    result.demo === true,

                                accountStatus:

                                    result.demo

                                        ? "Demo"

                                        : "Active",

                                verifiedAt:

                                    result.verified === true

                                        ? new Date()
                                            .toISOString()

                                        : null

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


                // ============================================
                // DEMO MODE
                // ============================================

                if (
                    result.demo === true
                ) {

                    setMessage(

                        message,

                        "success",

                        "DEMO access granted. Your account is NOT fully verified."

                    );


                    const session = {

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


                    // ----------------------------------------
                    // Try loading Firebase user information
                    // ----------------------------------------

                    if (

                        SF.ENABLE_FIREBASE &&

                        pending.uid

                    ) {

                        try {

                            const firebaseUser =

                                await firebaseGet(

                                    `users/${pending.uid}`

                                );


                            if (
                                firebaseUser
                            ) {

                                session.fullName =

                                    firebaseUser.fullName ||

                                    session.fullName;


                                session.role =

                                    firebaseUser.role ||

                                    "Employee";

                            }

                        }

                        catch (error) {

                            console.warn(

                                "Unable to load demo user:",

                                error

                            );

                        }

                    }


                    // ----------------------------------------
                    // Save Demo Session
                    // ----------------------------------------

                    saveSession(
                        session
                    );


                    clearVerificationSession();


                    setTimeout(

                        () => {

                            window.location.href =
                                "dashboard.html";

                        },

                        900

                    );


                    return;

                }


                // ============================================
                // REAL VERIFIED ACCOUNT
                // ============================================

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

                    "VERIFICATION ERROR:",

                    error

                );


                setMessage(

                    message,

                    "error",

                    error.message ||

                    "Verification failed. Please try again."

                );

            }

        }

    );


    // ========================================================
    // RESEND OTP
    // ========================================================


    let seconds = 60;


    const resendButton =

        document.getElementById(
            "resendOtp"
        );


    const countdown =

        document.getElementById(
            "countdown"
        );


    function updateCountdown() {

        if (countdown) {

            countdown.textContent =
                seconds;

        }


        if (
            seconds <= 0
        ) {

            if (
                resendButton
            ) {

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
                            pending.verificationMethod ||
                            "gmail"

                    });


                if (
                    !result.success
                ) {

                    throw new Error(

                        result.message ||

                        "Unable to send OTP."

                    );

                }


                seconds = 60;


                setMessage(

                    message,

                    "success",

                    `A new OTP was sent to your registered ${
                        pending.verificationMethod ===
                        "phone"
                            ? "phone number"
                            : "Gmail"
                    }.`

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

                    "Unable to send a new OTP."

                );

            }

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


            const value =
                contact?.value.trim() ||
                "";


            if (!value) {

                showError(

                    contact,

                    "Enter your email or phone number."

                );

                return;

            }


            // ------------------------------------------------
            // EMAIL
            // ------------------------------------------------

            if (

                value.includes("@") &&

                !validEmail(value)

            ) {

                showError(

                    contact,

                    "Enter a valid email address."

                );

                return;

            }


            // ------------------------------------------------
            // PHONE
            // ------------------------------------------------

            if (

                !value.includes("@") &&

                !validPhone(value)

            ) {

                showError(

                    contact,

                    "Enter a valid phone number."

                );

                return;

            }


            try {

                const result =

                    await sheetPost({

                        action:
                            "forgotPassword",

                        identity:
                            value

                    });


                setMessage(

                    message,

                    result.success
                        ? "success"
                        : "error",

                    result.message ||

                    "Recovery request submitted."

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

                    "Unable to process the recovery request."

                );

            }

        }

    );

}


// ============================================================
// OPTIONAL: LOGOUT HELPER
// ============================================================


function stockflowLogout() {

    sessionStorage.removeItem(
        "stockflow_session"
    );


    sessionStorage.removeItem(
        "stockflow_pending_user"
    );


    sessionStorage.removeItem(
        "stockflow_demo_otp"
    );


    sessionStorage.removeItem(
        "stockflow_verification_mode"
    );


    window.location.href =
        "login.html";

}


// ============================================================
// OPTIONAL: GET CURRENT SESSION
// ============================================================


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
