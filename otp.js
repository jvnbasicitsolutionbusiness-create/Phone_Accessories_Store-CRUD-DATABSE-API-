/* =========================================================
   STOCKFLOW — OTP VERIFICATION CONTROLLER
   File: otp.js

   Canonical page: verify.html

   Responsibilities:
   - Verify one 6-digit OTP
   - Email is the primary delivery method
   - Phone is an optional fallback
   - 2-minute resend cooldown per delivery method
   - Persist OTP state across refreshes
   - Clean verification messages
   ========================================================= */

(function () {
    "use strict";

    const API = window.StockFlowAPI || window.API;
    const Auth = window.StockFlowAuth || window.Auth;
    const CONFIG = window.STOCKFLOW_CONFIG || window.CONFIG || {};

    const OTP_LENGTH = Number(CONFIG.AUTH?.OTP_LENGTH || 6);
    const COOLDOWN_SECONDS = Math.max(
        120,
        Number(CONFIG.AUTH?.OTP_RESEND_COOLDOWN_SECONDS || 120)
    );

    const LOGIN_PAGE =
        CONFIG.ROUTES?.LOGIN || "auth.html#login";

    const STORAGE = {
        UID: "STOCKFLOW_OTP_UID",
        EMAIL: "STOCKFLOW_OTP_EMAIL",
        PHONE: "STOCKFLOW_OTP_PHONE",
        USERNAME: "STOCKFLOW_OTP_USERNAME",
        CHANNEL: "STOCKFLOW_OTP_CHANNEL",
        EMAIL_SENT: "STOCKFLOW_OTP_EMAIL_SENT",
        PHONE_SENT: "STOCKFLOW_OTP_PHONE_SENT"
    };

    let verificationInProgress = false;
    let emailResendInProgress = false;
    let phoneResendInProgress = false;
    let timer = null;

    function getElement(...selectors) {
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    function getOtpInput() {
        return getElement("#otp", "#otpCode", "#verificationCode", "[name='otp']");
    }

    function getVerifyButton() {
        return getElement("#verifyOtpBtn", "#verifyButton", "#verifyBtn", "[data-verify-otp]");
    }

    function getEmailButton() {
        return getElement("#resendEmailOtpBtn", "[data-resend-email-otp]");
    }

    function getPhoneButton() {
        return getElement("#resendPhoneOtpBtn", "[data-resend-phone-otp]");
    }

    function getMessageElement() {
        return getElement("#otpMessage", "#message", "#authAlert", ".otp-message");
    }

    function getState() {
        if (Auth && typeof Auth.getOtpState === "function") {
            return Auth.getOtpState();
        }

        return {
            uid: sessionStorage.getItem(STORAGE.UID) || "",
            email: sessionStorage.getItem(STORAGE.EMAIL) || "",
            phone: sessionStorage.getItem(STORAGE.PHONE) || "",
            username: sessionStorage.getItem(STORAGE.USERNAME) || "",
            channel: sessionStorage.getItem(STORAGE.CHANNEL) || "EMAIL"
        };
    }

    function hasState() {
        const state = getState();
        return Boolean(state.uid || state.email || state.phone || state.username);
    }

    function maskEmail(email) {
        if (!email) return "your registered email";

        const parts = String(email).split("@");
        if (parts.length !== 2) return email;

        const local = parts[0];
        const domain = parts[1];

        if (local.length <= 2) {
            return `${local.charAt(0)}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
        }

        return `${local.substring(0, 2)}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
    }

    function maskPhone(phone) {
        if (!phone) return "your registered phone";

        const value = String(phone);
        if (value.length <= 4) return "*".repeat(value.length);

        return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
    }

    function showMessage(message, type) {
        const element = getMessageElement();
        if (!element) {
            console.log(`[STOCKFLOW OTP ${type || "info"}]`, message);
            return;
        }

        element.textContent = message;
        element.className = `otp-message ${type || "info"}`;
        element.hidden = false;
        element.style.display = "block";
    }

    function clearMessage() {
        const element = getMessageElement();
        if (!element) return;

        element.textContent = "";
        element.hidden = true;
        element.style.display = "none";
        element.className = "otp-message";
    }

    function sanitizeOtp(value) {
        return String(value || "")
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH);
    }

    function getSentKey(channel) {
        return channel === "SMS" ? STORAGE.PHONE_SENT : STORAGE.EMAIL_SENT;
    }

    function getLastSent(channel) {
        return Number(sessionStorage.getItem(getSentKey(channel)) || 0);
    }

    function setLastSent(channel, timestamp) {
        sessionStorage.setItem(getSentKey(channel), String(timestamp || Date.now()));
    }

    function remainingCooldown(channel) {
        const lastSent = getLastSent(channel);
        if (!lastSent) return 0;

        return Math.max(
            0,
            COOLDOWN_SECONDS - Math.floor((Date.now() - lastSent) / 1000)
        );
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainder = String(seconds % 60).padStart(2, "0");
        return `${minutes}:${remainder}`;
    }

    function updateMethodButton(channel) {
        const button = channel === "SMS" ? getPhoneButton() : getEmailButton();
        if (!button) return;

        const remaining = remainingCooldown(channel);
        const isBusy = channel === "SMS" ? phoneResendInProgress : emailResendInProgress;

        button.disabled = remaining > 0 || isBusy;

        const timerElement = channel === "SMS"
            ? getElement("#phoneOtpTimer")
            : getElement("#emailOtpTimer");

        if (timerElement) {
            if (remaining > 0) {
                timerElement.textContent = `Resend available in ${formatTime(remaining)}`;
                timerElement.classList.remove("ready");
            } else {
                timerElement.textContent = "Ready to send a new code.";
                timerElement.classList.add("ready");
            }
        }
    }

    function updateCooldownUI() {
        updateMethodButton("EMAIL");
        updateMethodButton("SMS");

        const emailRemaining = remainingCooldown("EMAIL");
        const phoneRemaining = remainingCooldown("SMS");

        if (emailRemaining <= 0 && phoneRemaining <= 0) {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }
    }

    function startCooldownTicker() {
        if (timer) clearInterval(timer);

        updateCooldownUI();

        timer = setInterval(updateCooldownUI, 1000);
    }

    function setVerifyLoading(loading) {
        const button = getVerifyButton();
        if (!button) return;

        const text = button.querySelector(".button-text");
        const loader = button.querySelector(".button-loader");

        button.disabled = loading || sanitizeOtp(getOtpInput()?.value).length !== OTP_LENGTH;
        button.classList.toggle("loading", loading);

        if (text) text.hidden = loading;

        if (loader) {
            loader.hidden = !loading;
            if (loading) loader.textContent = "Verifying...";
        }
    }

    function updateVerifyButton() {
        const button = getVerifyButton();
        const input = getOtpInput();
        if (!button || !input) return;

        button.disabled =
            verificationInProgress ||
            sanitizeOtp(input.value).length !== OTP_LENGTH;
    }

    function normalizeVerificationError(error) {
        const message = String(error?.message || "");

        if (/username\s*\/\s*email.*otp/i.test(message) || /email.*otp.*required/i.test(message)) {
            return "The verification code is incorrect or has expired.";
        }

        if (/invalid|incorrect|expired|wrong/i.test(message) && /otp|code|verification/i.test(message)) {
            return "The verification code is incorrect or has expired.";
        }

        return message || "We couldn't verify that code. Please try again.";
    }

    async function verifyOtp() {
        if (verificationInProgress) return;

        const input = getOtpInput();
        if (!input) {
            showMessage("Verification code field could not be found.", "error");
            return;
        }

        const code = sanitizeOtp(input.value);

        if (code.length !== OTP_LENGTH) {
            showMessage(`Please enter the ${OTP_LENGTH}-digit verification code.`, "error");
            input.focus();
            return;
        }

        if (!API) {
            showMessage("STOCKFLOW API is unavailable. Please reload the page.", "error");
            return;
        }

        if (!hasState()) {
            showMessage("Your verification session has expired. Please register again.", "error");
            return;
        }

        verificationInProgress = true;
        clearMessage();
        setVerifyLoading(true);

        try {
            const state = getState();
            let result;

            if (Auth && typeof Auth.verifyOtp === "function") {
                result = await Auth.verifyOtp(code, state.channel || "EMAIL");
            } else {
                result = await API.verifyOtp({
                    uid: state.uid,
                    username: state.username || "",
                    email: state.email,
                    phone: state.phone,
                    channel: state.channel || "EMAIL",
                    otpChannel: state.channel || "EMAIL",
                    otp: code
                });
            }

            if (!result || result.success === false) {
                throw new Error(
                    result?.message ||
                    "The verification code is incorrect or has expired."
                );
            }

            showMessage("Verification successful. Signing you in...", "success");

        } catch (error) {
            console.error("STOCKFLOW OTP verification error:", error);
            showMessage(normalizeVerificationError(error), "error");
            input.value = "";
            updateVerifyButton();
            input.focus();
        } finally {
            verificationInProgress = false;

            if (document.body.contains(getVerifyButton())) {
                setVerifyLoading(false);
            }

            updateVerifyButton();
        }
    }

    async function sendCode(channel) {
        const normalizedChannel = channel === "SMS" ? "SMS" : "EMAIL";
        const isPhone = normalizedChannel === "SMS";

        if (isPhone ? phoneResendInProgress : emailResendInProgress) return;

        const remaining = remainingCooldown(normalizedChannel);
        if (remaining > 0) {
            updateCooldownUI();
            return;
        }

        if (!API) {
            showMessage("STOCKFLOW API is unavailable. Please reload the page.", "error");
            return;
        }

        const state = getState();
        if (!state.uid && !state.email && !state.phone && !state.username) {
            showMessage("Your verification session has expired. Please register again.", "error");
            return;
        }

        if (isPhone && !state.phone) {
            showMessage("No registered phone number is available for this account.", "error");
            return;
        }

        if (!isPhone && !state.email) {
            showMessage("No registered email address is available for this account.", "error");
            return;
        }

        if (isPhone) phoneResendInProgress = true;
        else emailResendInProgress = true;

        const button = isPhone ? getPhoneButton() : getEmailButton();
        const originalText = button?.textContent || "";

        if (button) {
            button.disabled = true;
            button.textContent = "Sending...";
        }

        clearMessage();

        try {
            let result;

            if (Auth && typeof Auth.resendOtp === "function") {
                result = await Auth.resendOtp(normalizedChannel);
            } else {
                result = await API.resendOtp({
                    uid: state.uid,
                    username: state.username || "",
                    email: state.email,
                    phone: state.phone,
                    channel: normalizedChannel,
                    otpChannel: normalizedChannel
                });
            }

            if (!result || result.success === false) {
                throw new Error(
                    result?.message ||
                    `Unable to send a new verification code to your ${isPhone ? "phone" : "email"}.`
                );
            }

            if (result.uid || result.email || result.phone || result.channel) {
                saveReturnedState(result);
            }

            setLastSent(normalizedChannel, Date.now());

            const destination = isPhone
                ? maskPhone(getState().phone)
                : maskEmail(getState().email);

            showMessage(
                `A new 6-digit verification code has been sent to ${destination}.`,
                "success"
            );

            const input = getOtpInput();
            if (input) {
                input.value = "";
                updateVerifyButton();
                input.focus();
            }

            updateCooldownUI();
            startCooldownTicker();

        } catch (error) {
            console.error("STOCKFLOW OTP delivery error:", error);
            showMessage(
                String(error?.message || "We couldn't send a new verification code. Please try again."),
                "error"
            );

        } finally {
            if (isPhone) phoneResendInProgress = false;
            else emailResendInProgress = false;

            if (button) button.textContent = originalText;
            updateCooldownUI();
        }
    }

    function saveReturnedState(result) {
        const current = getState();

        if (Auth && typeof Auth.getOtpState === "function") {
            return;
        }

        if (result.uid) sessionStorage.setItem(STORAGE.UID, result.uid);
        if (result.email) sessionStorage.setItem(STORAGE.EMAIL, result.email);
        if (result.phone) sessionStorage.setItem(STORAGE.PHONE, result.phone);
        if (result.channel) sessionStorage.setItem(STORAGE.CHANNEL, result.channel);

        if (current.username) {
            sessionStorage.setItem(STORAGE.USERNAME, current.username);
        }
    }

    function displayDestinations() {
        const state = getState();
        const email = maskEmail(state.email);
        const phone = maskPhone(state.phone);

        document.querySelectorAll("[data-otp-email]").forEach((element) => {
            element.textContent = email;
        });

        document.querySelectorAll("[data-otp-phone]").forEach((element) => {
            element.textContent = phone;
        });

        const destination = getElement("[data-otp-destination]");
        if (destination) destination.textContent = email;

        const primaryStatus = getElement("#emailDeliveryStatus");
        if (primaryStatus) {
            primaryStatus.textContent = `Code sent to ${email}`;
        }

        const phoneStatus = getElement("#phoneDeliveryStatus");
        if (phoneStatus) {
            phoneStatus.textContent = state.phone
                ? `Use ${phone} if you cannot access your email.`
                : "No phone number is available for this account.";
        }
    }

    function initializeSentTimes() {
        /* Registration/login already sent the primary email code. */
        if (getState().email && !getLastSent("EMAIL")) {
            setLastSent("EMAIL", Date.now());
        }
    }

    function setupInput() {
        const input = getOtpInput();
        if (!input) return;

        input.maxLength = OTP_LENGTH;
        input.inputMode = "numeric";
        input.autocomplete = "one-time-code";

        input.addEventListener("input", () => {
            input.value = sanitizeOtp(input.value);
            clearMessage();
            updateVerifyButton();
        });

        input.addEventListener("paste", (event) => {
            event.preventDefault();
            const text = event.clipboardData?.getData("text") || "";
            input.value = sanitizeOtp(text);
            updateVerifyButton();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                verifyOtp();
            }
        });
    }

    function setupButtons() {
        const form = getElement("#otpForm", "#verifyOtpForm");
        if (form) {
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                verifyOtp();
            });
        }

        const emailButton = getEmailButton();
        if (emailButton) {
            emailButton.addEventListener("click", (event) => {
                event.preventDefault();
                sendCode("EMAIL");
            });
        }

        const phoneButton = getPhoneButton();
        if (phoneButton) {
            phoneButton.addEventListener("click", (event) => {
                event.preventDefault();
                sendCode("SMS");
            });
        }

        const backButton = getElement("[data-back-login]");
        if (backButton) {
            backButton.addEventListener("click", () => {
                if (Auth && typeof Auth.clearOtpState === "function") {
                    Auth.clearOtpState();
                } else {
                    Object.values(STORAGE).forEach((key) => sessionStorage.removeItem(key));
                }
            });
        }
    }

    function validatePage() {
        const path = window.location.pathname.split("/").pop().toLowerCase();
        if (path !== "verify.html" && path !== "verify-otp.html") return;

        if (!hasState()) {
            showMessage(
                "No active verification request was found. Please register or sign in again.",
                "error"
            );

            setTimeout(() => {
                window.location.replace(LOGIN_PAGE);
            }, 2500);
        }
    }

    function initialize() {
        const path = window.location.pathname.split("/").pop().toLowerCase();

        if (path === "verify-otp.html") {
            window.location.replace("verify.html");
            return;
        }

        if (path !== "verify.html") return;

        setupInput();
        setupButtons();
        displayDestinations();
        initializeSentTimes();
        updateCooldownUI();
        startCooldownTicker();
        validatePage();
        updateVerifyButton();
    }

    window.StockFlowOTP = {
        verify: verifyOtp,
        resend: (channel = "EMAIL") => sendCode(channel),
        sanitize: sanitizeOtp,
        getState,
        maskEmail,
        maskPhone
    };

    window.OTP = window.StockFlowOTP;

    document.addEventListener("DOMContentLoaded", initialize);
})();
