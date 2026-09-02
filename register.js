document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.getElementById("registerForm");

    if (!form) return;

    const message = document.getElementById("message");
    const button =
        document.getElementById("registerButton") ||
        form.querySelector('button[type="submit"]');

    const nameInput =
        document.getElementById("registerName") ||
        form.elements["name"];

    const usernameInput =
        document.getElementById("registerUsername") ||
        form.elements["username"];

    const ageInput =
        document.getElementById("registerAge") ||
        form.elements["age"];

    const gmailInput =
        document.getElementById("registerGmail") ||
        form.elements["gmail"] ||
        form.elements["email"];

    const phoneInput =
        document.getElementById("registerPhone") ||
        form.elements["phone"];

    const passwordInput =
        document.getElementById("registerPassword") ||
        form.elements["password"];

    const confirmPasswordInput =
        document.getElementById("registerConfirmPassword") ||
        form.elements["confirmPassword"] ||
        form.elements["confirm_password"];

    function showMessage(text, type = "error") {
        if (!message) return;

        message.textContent = text || "";
        message.className = "auth-message " + type;
    }

    function clearMessage() {
        if (!message) return;

        message.textContent = "";
        message.className = "auth-message";
    }

    function setLoading(loading) {
        if (!button) return;

        button.disabled = loading;
        button.classList.toggle("loading", loading);

        const text = button.querySelector(".button-text");
        const loader = button.querySelector(".button-loader");

        if (text) {
            text.hidden = loading;
        }

        if (loader) {
            loader.hidden = !loading;
        }

        if (!text && !loader) {
            button.textContent = loading
                ? "Creating Account..."
                : "Create Account";
        }
    }

    function getValue(input) {
        return input ? input.value.trim() : "";
    }

    function validateRegistration(data) {
        if (!data.name) {
            return "Please enter your full name.";
        }

        if (!data.username) {
            return "Please enter a username.";
        }

        if (data.username.length < 3) {
            return "Username must contain at least 3 characters.";
        }

        if (!data.age || Number.isNaN(data.age)) {
            return "Please enter your age.";
        }

        if (data.age < 18 || data.age > 100) {
            return "Please enter a valid age.";
        }

        if (!data.gmail) {
            return "Please enter your Gmail address.";
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(data.gmail)) {
            return "Please enter a valid email address.";
        }

        if (!data.phone) {
            return "Please enter your Philippine mobile number.";
        }

        const phonePattern =
            /^09\d{9}$/;

        if (!phonePattern.test(data.phone)) {
            return "Phone number must be in 09XXXXXXXXX format.";
        }

        if (!data.password) {
            return "Please create a password.";
        }

        if (data.password.length < 8) {
            return "Password must contain at least 8 characters.";
        }

        if (data.password !== data.confirmPassword) {
            return "Passwords do not match.";
        }

        return null;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const data = {
            name: getValue(nameInput),
            username: getValue(usernameInput),
            age: Number(getValue(ageInput)),
            gmail: getValue(gmailInput),
            phone: getValue(phoneInput),
            password: passwordInput
                ? passwordInput.value
                : "",
            confirmPassword: confirmPasswordInput
                ? confirmPasswordInput.value
                : ""
        };

        const validationError =
            validateRegistration(data);

        if (validationError) {
            showMessage(validationError, "error");
            return;
        }

        setLoading(true);

        try {
            if (
                !window.StockFlowAPI ||
                typeof StockFlowAPI.register !== "function"
            ) {
                throw new Error(
                    "StockFlow registration service is unavailable."
                );
            }

            const response =
                await StockFlowAPI.register({
                    name: data.name,
                    username: data.username,
                    age: data.age,
                    gmail: data.gmail,
                    phone: data.phone,
                    password: data.password
                });

            if (!response) {
                throw new Error(
                    "No response was received from the server."
                );
            }

            if (!response.success) {
                showMessage(
                    response.message ||
                    "Registration failed. Please try again.",
                    "error"
                );

                return;
            }

            /*
             * Save the identity returned by the backend.
             * Username is used as a fallback for compatibility.
             */
            const otpIdentity =
                response.identity ||
                response.username ||
                response.gmail ||
                data.username;

            if (
                window.STOCKFLOW_CONFIG &&
                STOCKFLOW_CONFIG.OTP_KEY
            ) {
                sessionStorage.setItem(
                    STOCKFLOW_CONFIG.OTP_KEY,
                    otpIdentity
                );
            }

            // Compatibility with older verification code.
            sessionStorage.setItem(
                "stockflow_otp_identity",
                otpIdentity
            );

            showMessage(
                response.message ||
                "Registration successful. A verification code has been sent to your email and phone.",
                "success"
            );

            setTimeout(() => {
                window.location.replace(
                    "verify-otp.html"
                );
            }, 500);

        } catch (error) {
            console.error(
                "StockFlow registration error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to create your account. Please try again.",
                "error"
            );

        } finally {
            setLoading(false);
        }
    });
});
