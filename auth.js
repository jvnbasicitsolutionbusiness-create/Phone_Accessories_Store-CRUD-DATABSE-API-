// ============================================================
// STOCKFLOW AUTHENTICATION SYSTEM
// Firebase + Google Apps Script
// ============================================================

const SF = window.STOCKFLOW_CONFIG || {};


// ============================================================
// DEMO ADMIN ACCOUNT
// ============================================================

const DEMO_USER = {
    fullName: "Admin User",
    username: "admin",
    age: 25,
    email: "admin@stockflow.local",
    phone: "09123456789",
    password: "StockFlow@123",
    role: "Admin",
    verified: true
};


// ============================================================
// FIREBASE URL
// ============================================================

function firebaseUrl(path) {

    if (!SF.FIREBASE_DATABASE_URL) {
        throw new Error("Firebase URL is missing.");
    }

    return `${SF.FIREBASE_DATABASE_URL.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}.json`;
}


// ============================================================
// FIREBASE GET
// ============================================================

async function firebaseGet(path) {

    const response = await fetch(firebaseUrl(path));

    if (!response.ok) {
        throw new Error(`Firebase GET failed: ${response.status}`);
    }

    return await response.json();
}


// ============================================================
// FIREBASE PUT
// ============================================================

async function firebasePut(path, data) {

    const response = await fetch(firebaseUrl(path), {
        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Firebase PUT failed: ${response.status}`);
    }

    return await response.json();
}


// ============================================================
// FIREBASE PATCH
// ============================================================

async function firebasePatch(path, data) {

    const response = await fetch(firebaseUrl(path), {
        method: "PATCH",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Firebase PATCH failed: ${response.status}`);
    }

    return await response.json();
}


// ============================================================
// GOOGLE APPS SCRIPT POST
// ============================================================

async function sheetPost(data) {

    if (
        !SF.ENABLE_GOOGLE_SHEET_SYNC ||
        !SF.GOOGLE_APPS_SCRIPT_URL
    ) {
        console.warn("Google Sheet sync disabled.");

        return {
            success: false,
            skipped: true
        };
    }


    const response = await fetch(
        SF.GOOGLE_APPS_SCRIPT_URL,
        {
            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify(data)
        }
    );


    if (!response.ok) {
        throw new Error(
            `Google Apps Script failed: ${response.status}`
        );
    }


    const text = await response.text();


    try {

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "Invalid Apps Script response:",
            text
        );

        throw new Error(
            "Google Apps Script returned an invalid response."
        );
    }
}


// ============================================================
// UI MESSAGE
// ============================================================

function setMessage(element, type, message) {

    if (!element) return;

    element.className =
        `form-message show ${type}`;

    element.textContent = message;
}


// ============================================================
// CLEAR FORM ERRORS
// ============================================================

function clearErrors(form) {

    if (!form) return;

    form.querySelectorAll(".field-error")
        .forEach(element => {
            element.textContent = "";
        });


    form.querySelectorAll("input")
        .forEach(element => {
            element.classList.remove("invalid");
        });
}


// ============================================================
// FIELD ERROR
// ============================================================

function showError(input, message) {

    if (!input) return;

    input.classList.add("invalid");


    const errorElement =
        input.closest(".field")
            ?.querySelector(".field-error");


    if (errorElement) {
        errorElement.textContent = message;
    }
}


// ============================================================
// VALIDATION
// ============================================================

function validEmail(value) {

    return /^\S+@\S+\.\S+$/.test(value);
}


function validPhone(value) {

    const phone =
        value.replace(/[\s-]/g, "");

    return /^(09\d{9}|\+639\d{9})$/.test(phone);
}


// ============================================================
// PASSWORD STRENGTH
// ============================================================

function passwordScore(value) {

    let score = 0;


    if (value.length >= 8) {
        score++;
    }


    if (/[A-Z]/.test(value)) {
        score++;
    }


    if (/[a-z]/.test(value)) {
        score++;
    }


    if (/\d/.test(value)) {
        score++;
    }


    if (/[^A-Za-z0-9]/.test(value)) {
        score++;
    }


    return score;
}


// ============================================================
// PASSWORD TOGGLE
// ============================================================

document
    .querySelectorAll(".password-toggle")
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
                    input.type === "password";


                input.type =
                    show ? "text" : "password";


                button.textContent =
                    show ? "Hide" : "Show";
            }
        );

    });


// ============================================================
// LOGIN
// ============================================================

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            clearErrors(loginForm);


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
                identity.value.trim();


            const passwordValue =
                password.value;


            // ------------------------------
            // VALIDATION
            // ------------------------------

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


                // ==================================================
                // 1. TRY FIREBASE
                // ==================================================

                if (SF.ENABLE_FIREBASE) {

                    try {

                        const users =
                            await firebaseGet("users");


                        if (users) {

                            for (
                                const [uid, account]
                                of Object.entries(users)
                            ) {

                                const matchesIdentity =
                                    account.username === identityValue ||
                                    account.email === identityValue;


                                const matchesPassword =
                                    account.password === passwordValue;


                                if (
                                    matchesIdentity &&
                                    matchesPassword
                                ) {

                                    user = {
                                        ...account,
                                        uid
                                    };

                                    break;
                                }
                            }
                        }

                    } catch (firebaseError) {

                        console.warn(
                            "Firebase login failed:",
                            firebaseError
                        );
                    }
                }


                // ==================================================
                // 2. TRY GOOGLE SHEETS
                // ==================================================

                if (
                    !user &&
                    SF.ENABLE_GOOGLE_SHEET_SYNC
                ) {

                    try {

                        const result =
                            await sheetPost({
                                action: "login",

                                identity:
                                    identityValue,

                                password:
                                    passwordValue
                            });


                        if (result.success) {

                            user = {

                                username:
                                    result.user?.username ||
                                    identityValue,

                                fullName:
                                    result.user?.name ||
                                    result.user?.fullName ||
                                    "StockFlow User",

                                role:
                                    result.user?.accountStatus ||
                                    result.user?.role ||
                                    "Employee",

                                email:
                                    result.user?.gmail ||
                                    result.user?.email ||
                                    "",

                                verified:
                                    result.verified !== false

                            };

                        }

                    } catch (sheetError) {

                        console.warn(
                            "Google Sheet login failed:",
                            sheetError
                        );
                    }
                }


                // ==================================================
                // 3. DEMO ADMIN
                // ==================================================

                if (
                    !user &&
                    identityValue === "admin" &&
                    passwordValue === "StockFlow@123"
                ) {

                    user = {
                        ...DEMO_USER
                    };
                }


                // ==================================================
                // INVALID LOGIN
                // ==================================================

                if (!user) {

                    setMessage(
                        message,
                        "error",
                        "Invalid username/email or password."
                    );

                    return;
                }


                // ==================================================
                // VERIFY ACCOUNT STATUS
                // ==================================================

                if (user.verified === false) {

                    setMessage(
                        message,
                        "error",
                        "Your account is not verified yet."
                    );

                    return;
                }


                // ==================================================
                // CREATE SESSION
                // ==================================================

                const session = {

                    uid:
                        user.uid || null,

                    username:
                        user.username,

                    fullName:
                        user.fullName ||
                        user.name ||
                        "StockFlow User",

                    role:
                        user.role ||
                        user.accountStatus ||
                        "Employee",

                    email:
                        user.email ||
                        user.gmail ||
                        "",

                    verified: true

                };


                sessionStorage.setItem(
                    "stockflow_session",
                    JSON.stringify(session)
                );


                // ==================================================
                // LOGIN SUCCESS
                // ==================================================

                window.location.href =
                    "dashboard.html";

            } catch (error) {

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
    document.getElementById("registerForm");


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


    // ========================================================
    // PASSWORD STRENGTH METER
    // ========================================================

    if (password) {

        password.addEventListener(
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

                    if (strength < 3) {

                        passwordHint.textContent =
                            "Weak password";

                    } else if (strength < 5) {

                        passwordHint.textContent =
                            "Medium password";

                    } else {

                        passwordHint.textContent =
                            "Strong password";
                    }
                }

            }
        );
    }


    // ========================================================
    // REGISTER SUBMIT
    // ========================================================

    registerForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            clearErrors(registerForm);


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


            let valid = true;


            // ==================================================
            // VALIDATION
            // ==================================================

            if (
                fullName.value.trim().length < 2
            ) {

                showError(
                    fullName,
                    "Enter your full name."
                );

                valid = false;
            }


            if (
                !/^[A-Za-z0-9_.-]{4,20}$/
                    .test(username.value.trim())
            ) {

                showError(
                    username,
                    "Use 4–20 valid username characters."
                );

                valid = false;
            }


            if (
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
                !validEmail(
                    email.value.trim()
                )
            ) {

                showError(
                    email,
                    "Enter a valid email."
                );

                valid = false;
            }


            if (
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
                confirmPassword.value !==
                registerPassword.value
            ) {

                showError(
                    confirmPassword,
                    "Passwords do not match."
                );

                valid = false;
            }


            if (!terms.checked) {

                setMessage(
                    message,
                    "error",
                    "Please agree to the Terms and Conditions."
                );

                valid = false;
            }


            if (!valid) return;


            // ==================================================
            // CREATE USER OBJECT
            // ==================================================

            const uid =
                `sf_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;


            const user = {

                fullName:
                    fullName.value.trim(),

                username:
                    username.value.trim(),

                age:
                    Number(age.value),

                email:
                    email.value.trim(),

                phone:
                    phone.value.trim(),

                password:
                    registerPassword.value,

                role:
                    "Employee",

                verified:
                    false,

                accountStatus:
                    "Pending Verification",

                createdAt:
                    new Date().toISOString()

            };


            try {

                // ==================================================
                // GENERATE DEVELOPMENT OTP
                // ==================================================

                const otp =
                    String(
                        Math.floor(
                            100000 +
                            Math.random() * 900000
                        )
                    );


                // ==================================================
                // SAVE TO FIREBASE
                // ==================================================

                if (SF.ENABLE_FIREBASE) {

                    await firebasePut(
                        `users/${uid}`,
                        {
                            ...user,
                            otp: otp
                        }
                    );
                }


                // ==================================================
                // SAVE TO GOOGLE SHEETS
                // ==================================================

                if (
                    SF.ENABLE_GOOGLE_SHEET_SYNC
                ) {

                    try {

                        const sheetResult =
                            await sheetPost({

                                action:
                                    "register",

                                name:
                                    user.fullName,

                                username:
                                    user.username,

                                password:
                                    user.password,

                                age:
                                    user.age,

                                accountStatus:
                                    user.accountStatus,

                                gmail:
                                    user.email,

                                phone:
                                    user.phone,

                                otp:
                                    otp,

                                uid:
                                    uid

                            });


                        if (
                            sheetResult &&
                            sheetResult.otp
                        ) {

                            sessionStorage.setItem(
                                "stockflow_demo_otp",
                                String(
                                    sheetResult.otp
                                )
                            );

                        } else {

                            sessionStorage.setItem(
                                "stockflow_demo_otp",
                                otp
                            );
                        }

                    } catch (sheetError) {

                        console.warn(
                            "Google Sheet registration failed:",
                            sheetError
                        );

                        // Firebase registration is still preserved.
                        sessionStorage.setItem(
                            "stockflow_demo_otp",
                            otp
                        );
                    }

                } else {

                    sessionStorage.setItem(
                        "stockflow_demo_otp",
                        otp
                    );
                }


                // ==================================================
                // STORE PENDING ACCOUNT
                // ==================================================

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
                            user.phone
                    })
                );


                // ==================================================
                // SUCCESS
                // ==================================================

                setMessage(
                    message,
                    "success",
                    "Registration successful. Redirecting to verification..."
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "verify.html";

                    },
                    700
                );

            } catch (error) {

                console.error(
                    "REGISTRATION ERROR:",
                    error
                );


                setMessage(
                    message,
                    "error",
                    "Registration could not be saved. Check Firebase and Google Apps Script configuration."
                );
            }

        }
    );
}


// ============================================================
// OTP VERIFICATION
// ============================================================

const verifyForm =
    document.getElementById(
        "verifyForm"
    );


if (verifyForm) {

    const otpInputs =
        [
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


    if (pending) {

        destination.textContent =
            pending.email;
    }


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

        }
    );


    // ========================================================
    // VERIFY
    // ========================================================

    verifyForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const otp =
                otpInputs
                    .map(input => input.value)
                    .join("");


            const expectedOtp =
                sessionStorage.getItem(
                    "stockflow_demo_otp"
                );


            if (otp.length !== 6) {

                setMessage(
                    message,
                    "error",
                    "Enter the complete 6-digit OTP."
                );

                return;
            }


            if (
                otp !== expectedOtp
            ) {

                setMessage(
                    message,
                    "error",
                    "Incorrect verification code."
                );

                return;
            }


            if (!pending) {

                setMessage(
                    message,
                    "error",
                    "Registration session expired. Please register again."
                );

                return;
            }


            try {

                // ==================================================
                // UPDATE FIREBASE
                // ==================================================

                if (
                    SF.ENABLE_FIREBASE &&
                    pending.uid
                ) {

                    await firebasePatch(
                        `users/${pending.uid}`,
                        {
                            verified: true,

                            accountStatus:
                                "Active",

                            otp: null,

                            verifiedAt:
                                new Date().toISOString()
                        }
                    );
                }


                // ==================================================
                // UPDATE GOOGLE SHEET
                // ==================================================

                if (
                    SF.ENABLE_GOOGLE_SHEET_SYNC
                ) {

                    try {

                        await sheetPost({

                            action:
                                "verifyOtp",

                            identity:
                                pending.username,

                            otp:
                                otp
                        });

                    } catch (sheetError) {

                        console.warn(
                            "Google Sheet verification failed:",
                            sheetError
                        );
                    }
                }


                // ==================================================
                // CLEAN SESSION
                // ==================================================

                sessionStorage.removeItem(
                    "stockflow_pending_user"
                );


                sessionStorage.removeItem(
                    "stockflow_demo_otp"
                );


                // ==================================================
                // SUCCESS
                // ==================================================

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

            } catch (error) {

                console.error(
                    "VERIFICATION ERROR:",
                    error
                );


                setMessage(
                    message,
                    "error",
                    "Verification failed. Please check your database connection."
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


    const timer =
        setInterval(
            () => {

                seconds--;


                if (countdown) {

                    countdown.textContent =
                        seconds;
                }


                if (seconds <= 0) {

                    clearInterval(timer);


                    if (resendButton) {

                        resendButton.disabled =
                            false;

                        resendButton.textContent =
                            "Resend code";
                    }
                }

            },
            1000
        );


    if (resendButton) {

        resendButton.addEventListener(
            "click",
            async () => {

                try {

                    const newOtp =
                        String(
                            Math.floor(
                                100000 +
                                Math.random() *
                                900000
                            )
                        );


                    // ------------------------------------------
                    // FIREBASE
                    // ------------------------------------------

                    if (
                        SF.ENABLE_FIREBASE &&
                        pending?.uid
                    ) {

                        await firebasePatch(
                            `users/${pending.uid}`,
                            {
                                otp: newOtp
                            }
                        );
                    }


                    // ------------------------------------------
                    // GOOGLE SHEETS
                    // ------------------------------------------

                    if (
                        SF.ENABLE_GOOGLE_SHEET_SYNC
                    ) {

                        try {

                            const result =
                                await sheetPost({

                                    action:
                                        "updateOtp",

                                    identity:
                                        pending.username,

                                    otp:
                                        newOtp

                                });


                            sessionStorage.setItem(
                                "stockflow_demo_otp",
                                String(
                                    result?.otp ||
                                    newOtp
                                )
                            );

                        } catch (error) {

                            sessionStorage.setItem(
                                "stockflow_demo_otp",
                                newOtp
                            );
                        }

                    } else {

                        sessionStorage.setItem(
                            "stockflow_demo_otp",
                            newOtp
                        );
                    }


                    // ------------------------------------------
                    // RESET TIMER
                    // ------------------------------------------

                    seconds = 60;


                    resendButton.disabled =
                        true;


                    resendButton.textContent =
                        `Resend in ${seconds}s`;


                    setMessage(
                        message,
                        "success",
                        "A new verification code has been generated."
                    );


                    const resendTimer =
                        setInterval(
                            () => {

                                seconds--;


                                if (countdown) {

                                    countdown.textContent =
                                        seconds;
                                }


                                if (
                                    seconds <= 0
                                ) {

                                    clearInterval(
                                        resendTimer
                                    );


                                    resendButton.disabled =
                                        false;

                                    resendButton.textContent =
                                        "Resend code";
                                }

                            },
                            1000
                        );

                } catch (error) {

                    console.error(
                        "RESEND OTP ERROR:",
                        error
                    );


                    setMessage(
                        message,
                        "error",
                        "Unable to generate a new verification code."
                    );
                }

            }
        );
    }

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


            clearErrors(forgotForm);


            const contact =
                document.getElementById(
                    "recoveryContact"
                );


            const message =
                document.getElementById(
                    "forgotMessage"
                );


            const value =
                contact.value.trim();


            if (!value) {

                showError(
                    contact,
                    "Enter your email or phone number."
                );

                return;
            }


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

                if (
                    SF.ENABLE_GOOGLE_SHEET_SYNC
                ) {

                    await sheetPost({

                        action:
                            "forgotPassword",

                        identity:
                            value
                    });
                }


                setMessage(
                    message,
                    "success",
                    "Recovery request submitted. Check your registered contact for instructions."
                );

            } catch (error) {

                console.error(
                    "FORGOT PASSWORD ERROR:",
                    error
                );


                setMessage(
                    message,
                    "error",
                    "Unable to process the recovery request."
                );
            }

        }
    );
}
