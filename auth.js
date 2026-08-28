// ============================================================
// STOCKFLOW AUTHENTICATION
// Firebase + Google Apps Script + real Gmail OTP
// ============================================================

const SF = window.STOCKFLOW_CONFIG || {};
const DEMO_OTP = SF.DEMO_OTP || "123456";

const DEMO_USER = {
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

function firebaseUrl(path) {
    if (!SF.FIREBASE_DATABASE_URL) {
        throw new Error("Firebase URL is missing.");
    }

    return `${SF.FIREBASE_DATABASE_URL.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}.json`;
}

async function firebaseGet(path) {
    const response = await fetch(firebaseUrl(path));

    if (!response.ok) {
        throw new Error(`Firebase GET failed: ${response.status}`);
    }

    return response.json();
}

async function firebasePut(path, data) {
    const response = await fetch(firebaseUrl(path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Firebase PUT failed: ${response.status}`);
    }

    return response.json();
}

async function firebasePatch(path, data) {
    const response = await fetch(firebaseUrl(path), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Firebase PATCH failed: ${response.status}`);
    }

    return response.json();
}

async function sheetPost(data) {
    if (!SF.ENABLE_GOOGLE_SHEET_SYNC || !SF.GOOGLE_APPS_SCRIPT_URL) {
        throw new Error("Google Apps Script is disabled or missing.");
    }

    const response = await fetch(SF.GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Google Apps Script failed: ${response.status}`);
    }

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch {
        console.error("Invalid Apps Script response:", text);
        throw new Error("Apps Script returned an invalid response.");
    }
}

function setMessage(element, type, message) {
    if (!element) return;

    element.className = `form-message show ${type}`;
    element.textContent = message;
}

function clearErrors(form) {
    if (!form) return;

    form.querySelectorAll(".field-error").forEach(el => {
        el.textContent = "";
    });

    form.querySelectorAll("input").forEach(el => {
        el.classList.remove("invalid");
    });
}

function showError(input, message) {
    if (!input) return;

    input.classList.add("invalid");

    const errorElement =
        input.closest(".field")?.querySelector(".field-error");

    if (errorElement) {
        errorElement.textContent = message;
    }
}

function validEmail(value) {
    return /^\S+@\S+\.\S+$/.test(value);
}

function validPhone(value) {
    const phone = value.replace(/[\s-]/g, "");
    return /^(09\d{9}|\+639\d{9})$/.test(phone);
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

// Password toggle
document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.target);
        if (!input) return;

        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.textContent = show ? "Hide" : "Show";
    });
});

// ============================================================
// LOGIN
// ============================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearErrors(loginForm);

        const identity = document.getElementById("loginIdentity");
        const password = document.getElementById("loginPassword");
        const message = document.getElementById("loginMessage");

        const identityValue = identity?.value.trim() || "";
        const passwordValue = password?.value || "";

        if (!identityValue) {
            showError(identity, "Username or email is required.");
            return;
        }

        if (!passwordValue) {
            showError(password, "Password is required.");
            return;
        }

        try {
            let user = null;

            // Firebase first
            if (SF.ENABLE_FIREBASE) {
                try {
                    const users = await firebaseGet("users");

                    if (users) {
                        for (const [uid, account] of Object.entries(users)) {
                            const identityMatches =
                                account.username === identityValue ||
                                account.email === identityValue;

                            if (
                                identityMatches &&
                                account.password === passwordValue
                            ) {
                                user = { ...account, uid };
                                break;
                            }
                        }
                    }
                } catch (error) {
                    console.warn("Firebase login failed:", error);
                }
            }

            // Apps Script / Sheet fallback
            if (!user && SF.ENABLE_GOOGLE_SHEET_SYNC) {
                try {
                    const result = await sheetPost({
                        action: "login",
                        identity: identityValue,
                        password: passwordValue
                    });

                    if (result.success) {
                        user = {
                            uid: result.user?.uid || null,
                            username: result.user?.username || identityValue,
                            fullName:
                                result.user?.name ||
                                result.user?.fullName ||
                                "StockFlow User",
                            role:
                                result.user?.role ||
                                result.user?.accountStatus ||
                                "Employee",
                            email:
                                result.user?.gmail ||
                                result.user?.email ||
                                "",
                            phone: result.user?.phone || "",
                            verified: result.verified === true,
                            demo: result.demo === true,
                            accountStatus:
                                result.user?.accountStatus ||
                                (result.demo ? "Demo" : "Active")
                        };
                    } else if (
                        result.message === "Your account is not verified yet."
                    ) {
                        setMessage(message, "error", result.message);
                        return;
                    }
                } catch (error) {
                    console.warn("Apps Script login failed:", error);
                }
            }

            // Demo admin shortcut
            if (
                !user &&
                identityValue === "admin" &&
                passwordValue === "StockFlow@123"
            ) {
                user = { ...DEMO_USER };
            }

            if (!user) {
                setMessage(
                    message,
                    "error",
                    "Invalid username/email or password."
                );
                return;
            }

            // A real account must be verified.
            // A demo account is intentionally allowed.
            if (user.verified === false && user.demo !== true) {
                setMessage(
                    message,
                    "error",
                    "Your account is not verified yet. Please complete verification first."
                );
                return;
            }

            const session = {
                uid: user.uid || null,
                username: user.username,
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
                phone: user.phone || "",
                verified: user.verified === true,
                demo: user.demo === true,
                accountStatus:
                    user.accountStatus ||
                    (user.demo ? "Demo" : "Active")
            };

            sessionStorage.setItem(
                "stockflow_session",
                JSON.stringify(session)
            );

            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("LOGIN ERROR:", error);

            setMessage(
                message,
                "error",
                "Unable to connect to the authentication service."
            );
        }
    });
}

// ============================================================
// REGISTER
// ============================================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const password = document.getElementById("registerPassword");
    const passwordBar = document.getElementById("passwordBar");
    const passwordHint = document.getElementById("passwordHint");

    password?.addEventListener("input", () => {
        const strength = passwordScore(password.value);

        if (passwordBar) {
            passwordBar.style.width = `${strength * 20}%`;
        }

        if (passwordHint) {
            passwordHint.textContent =
                strength < 3
                    ? "Weak password"
                    : strength < 5
                        ? "Medium password"
                        : "Strong password";
        }
    });

    registerForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearErrors(registerForm);

        const fullName = document.getElementById("fullName");
        const username = document.getElementById("username");
        const age = document.getElementById("age");
        const email = document.getElementById("email");
        const phone = document.getElementById("phone");
        const registerPassword =
            document.getElementById("registerPassword");
        const confirmPassword =
            document.getElementById("confirmPassword");
        const terms = document.getElementById("terms");
        const message = document.getElementById("registerMessage");

        let valid = true;

        if (fullName.value.trim().length < 2) {
            showError(fullName, "Enter your full name.");
            valid = false;
        }

        if (!/^[A-Za-z0-9_.-]{4,20}$/.test(username.value.trim())) {
            showError(username, "Use 4–20 valid username characters.");
            valid = false;
        }

        if (Number(age.value) < 18 || Number(age.value) > 100) {
            showError(age, "Age must be 18–100.");
            valid = false;
        }

        if (!validEmail(email.value.trim())) {
            showError(email, "Enter a valid email.");
            valid = false;
        }

        if (!validPhone(phone.value.trim())) {
            showError(phone, "Use 09XXXXXXXXX or +639XXXXXXXXX.");
            valid = false;
        }

        if (passwordScore(registerPassword.value) < 5) {
            showError(
                registerPassword,
                "Use 8+ characters, uppercase, lowercase, number and symbol."
            );
            valid = false;
        }

        if (confirmPassword.value !== registerPassword.value) {
            showError(confirmPassword, "Passwords do not match.");
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

        const uid =
            `sf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const user = {
            fullName: fullName.value.trim(),
            username: username.value.trim(),
            age: Number(age.value),
            email: email.value.trim(),
            phone: phone.value.trim(),
            password: registerPassword.value,
            role: "Employee",
            verified: false,
            demo: false,
            accountStatus: "Pending Verification",
            createdAt: new Date().toISOString()
        };

        try {
            // Apps Script creates the server-side real OTP
            // and sends it to Gmail.
            const sheetResult = await sheetPost({
                action: "register",
                uid,
                name: user.fullName,
                username: user.username,
                password: user.password,
                age: user.age,
                gmail: user.email,
                phone: user.phone
            });

            if (!sheetResult.success) {
                throw new Error(
                    sheetResult.message || "Google Sheet registration failed."
                );
            }

            // Save the account in Firebase.
            // IMPORTANT: do not save the real OTP in Firebase.
            if (SF.ENABLE_FIREBASE) {
                await firebasePut(`users/${uid}`, user);
            }

            sessionStorage.setItem(
                "stockflow_pending_user",
                JSON.stringify({
                    uid,
                    username: user.username,
                    email: user.email,
                    phone: user.phone
                })
            );

            sessionStorage.setItem(
                "stockflow_verification_mode",
                "registration"
            );

            // Only the DEMO OTP is stored client-side.
            sessionStorage.setItem(
                "stockflow_demo_otp",
                DEMO_OTP
            );

            setMessage(
                message,
                "success",
                "Registration saved. A real OTP was sent to your Gmail. You may use 123456 for DEMO access only."
            );

            setTimeout(() => {
                window.location.href = "verify.html";
            }, 800);
        } catch (error) {
            console.error("REGISTRATION ERROR:", error);

            setMessage(
                message,
                "error",
                error.message ||
                "Registration could not be saved. Check Firebase and Google Apps Script configuration."
            );
        }
    });
}

// ============================================================
// VERIFY
// ============================================================

const verifyForm = document.getElementById("verifyForm");

if (verifyForm) {
    const otpInputs = [
        ...document.querySelectorAll("#otpInputs input")
    ];

    const pending = JSON.parse(
        sessionStorage.getItem("stockflow_pending_user") || "null"
    );

    const destination =
        document.getElementById("verifyDestination");

    const message =
        document.getElementById("verifyMessage");

    const mode =
        sessionStorage.getItem("stockflow_verification_mode") ||
        "registration";

    if (pending && destination) {
        destination.textContent = pending.email;
    }

    if (mode === "reverify") {
        const heading = document.querySelector(".auth-card-head h2");
        const paragraph = document.querySelector(".auth-card-head p");

        if (heading) heading.textContent = "Re-verify your account";
        if (paragraph) {
            paragraph.textContent =
                "Use the real 6-digit code sent to your registered Gmail.";
        }
    }

    otpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");

            if (
                input.value &&
                index < otpInputs.length - 1
            ) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", event => {
            if (
                event.key === "Backspace" &&
                !input.value &&
                index > 0
            ) {
                otpInputs[index - 1].focus();
            }
        });
    });

    verifyForm.addEventListener("submit", async event => {
        event.preventDefault();

        const otp = otpInputs
            .map(input => input.value)
            .join("");

        if (otp.length !== 6) {
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
                "Verification session expired. Please register or start re-verification again."
            );
            return;
        }

        try {
            const result = await sheetPost({
                action: "verifyOtp",
                identity: pending.username,
                otp
            });

            if (!result.success) {
                setMessage(
                    message,
                    "error",
                    result.message || "Incorrect verification code."
                );
                return;
            }

            // Demo OTP 123456:
            // account remains NOT VERIFIED and is marked DEMO.
            // Real OTP:
            // account becomes ACTIVE and VERIFIED.
            if (SF.ENABLE_FIREBASE && pending.uid) {
                await firebasePatch(`users/${pending.uid}`, {
                    verified: result.verified === true,
                    demo: result.demo === true,
                    accountStatus:
                        result.demo ? "Demo" : "Active",
                    verifiedAt:
                        result.verified === true
                            ? new Date().toISOString()
                            : null
                });
            }

            sessionStorage.removeItem("stockflow_pending_user");
            sessionStorage.removeItem("stockflow_demo_otp");
            sessionStorage.removeItem("stockflow_verification_mode");

            if (result.demo) {
                setMessage(
                    message,
                    "success",
                    "DEMO access granted. Your account is NOT fully verified. Redirecting to the dashboard..."
                );

                setTimeout(() => {
                    // Create demo session for immediate dashboard access.
                    const session = {
                        uid: pending.uid,
                        username: pending.username,
                        fullName: "StockFlow User",
                        role: "Employee",
                        email: pending.email,
                        phone: pending.phone,
                        verified: false,
                        demo: true,
                        accountStatus: "Demo"
                    };

                    // Recover the full name from Firebase if available.
                    if (SF.ENABLE_FIREBASE) {
                        firebaseGet(`users/${pending.uid}`)
                            .then(user => {
                                if (user) {
                                    session.fullName =
                                        user.fullName || session.fullName;
                                    session.role =
                                        user.role || session.role;
                                }
                            })
                            .catch(() => {})
                            .finally(() => {
                                sessionStorage.setItem(
                                    "stockflow_session",
                                    JSON.stringify(session)
                                );
                                window.location.href = "dashboard.html";
                            });
                    } else {
                        sessionStorage.setItem(
                            "stockflow_session",
                            JSON.stringify(session)
                        );
                        window.location.href = "dashboard.html";
                    }
                }, 900);

                return;
            }

            setMessage(
                message,
                "success",
                "Account fully verified. Redirecting to login..."
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        } catch (error) {
            console.error("VERIFICATION ERROR:", error);

            setMessage(
                message,
                "error",
                error.message ||
                "Verification failed. Check your connection."
            );
        }
    });

    // ========================================================
    // RESEND
    // ========================================================

    let seconds = 60;
    const resendButton =
        document.getElementById("resendOtp");
    const countdown =
        document.getElementById("countdown");

    const updateCountdown = () => {
        if (countdown) countdown.textContent = seconds;

        if (seconds <= 0) {
            if (resendButton) {
                resendButton.disabled = false;
                resendButton.textContent = "Resend code";
            }
            return;
        }

        seconds--;
        setTimeout(updateCountdown, 1000);
    };

    updateCountdown();

    resendButton?.addEventListener("click", async () => {
        if (!pending) return;

        try {
            resendButton.disabled = true;

            const result = await sheetPost({
                action: "requestOtp",
                identity: pending.username
            });

            if (!result.success) {
                throw new Error(
                    result.message || "Unable to send OTP."
                );
            }

            seconds = 60;
            resendButton.textContent = "Resend in 60s";
            updateCountdown();

            setMessage(
                message,
                "success",
                "A new REAL OTP was sent to your registered Gmail. 123456 remains DEMO ONLY."
            );
        } catch (error) {
            resendButton.disabled = false;
            resendButton.textContent = "Resend code";

            setMessage(
                message,
                "error",
                error.message || "Unable to send a new OTP."
            );
        }
    });
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

const forgotForm = document.getElementById("forgotForm");

if (forgotForm) {
    forgotForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearErrors(forgotForm);

        const contact =
            document.getElementById("recoveryContact");
        const message =
            document.getElementById("forgotMessage");

        const value = contact.value.trim();

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
            const result = await sheetPost({
                action: "forgotPassword",
                identity: value
            });

            setMessage(
                message,
                result.success ? "success" : "error",
                result.message ||
                "Recovery request submitted."
            );
        } catch (error) {
            setMessage(
                message,
                "error",
                "Unable to process the recovery request."
            );
        }
    });
}
