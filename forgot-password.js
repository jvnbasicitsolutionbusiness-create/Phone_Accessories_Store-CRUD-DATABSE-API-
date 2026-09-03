/* ============================================================
   STOCKFLOW — PASSWORD RECOVERY CONTROLLER
   Handles:
   - Request recovery code
   - Verify recovery OTP
   - Reset password
   - Show / Hide password
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const form =
        document.querySelector("#forgotForm");

    const msg =
        document.querySelector("#message");

    const identity =
        document.querySelector("#identity");

    const otpForm =
        document.querySelector("#recoveryOtpForm");

    const resetForm =
        document.querySelector("#resetForm");


    const steps = {

        request:
            document.querySelector("#requestStep"),

        otp:
            document.querySelector("#otpStep"),

        reset:
            document.querySelector("#resetStep")

    };


    /* =========================================================
       STATE
       ========================================================= */

    let savedIdentity = "";
    let savedOtp = "";


    /* =========================================================
       MESSAGE
       ========================================================= */

    const show = (
        message,
        success = false
    ) => {

        if (!msg) {
            return;
        }

        msg.textContent = message;

        msg.className =
            success
                ? "success"
                : "error";

    };


    /* =========================================================
       PASSWORD SHOW / HIDE
       ========================================================= */

    document.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    ".password-toggle"
                );


            if (!button) {
                return;
            }


            const wrapper =
                button.closest(
                    ".password-wrapper"
                );


            if (!wrapper) {
                return;
            }


            const input =
                wrapper.querySelector(
                    "input"
                );


            if (!input) {
                return;
            }


            if (
                input.type ===
                "password"
            ) {

                input.type = "text";

                button.textContent =
                    "Hide";

                button.classList.add(
                    "active"
                );

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                input.type = "password";

                button.textContent =
                    "Show";

                button.classList.remove(
                    "active"
                );

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );

            }

        }
    );


    /* =========================================================
       REQUEST RECOVERY CODE
       ========================================================= */

    form?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            savedIdentity =
                identity.value.trim();


            if (!savedIdentity) {
                return;
            }


            const button =
                form.querySelector(
                    "button"
                );


            button.disabled = true;


            try {

                const response =
                    await StockFlowAPI.forgotPassword({
                        identity:
                            savedIdentity
                    });


                show(
                    response.message ||
                    "Recovery code sent.",
                    true
                );


                steps.request
                    ?.classList.add(
                        "hidden"
                    );


                steps.otp
                    ?.classList.remove(
                        "hidden"
                    );


            } catch (error) {

                show(
                    error.message ||
                    "Unable to send recovery code."
                );


            } finally {

                button.disabled = false;

            }

        }
    );


    /* =========================================================
       VERIFY RECOVERY OTP
       ========================================================= */

    otpForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            savedOtp =
                otpForm
                    .querySelector(
                        "[name=otp]"
                    )
                    .value
                    .trim();


            if (
                !/^\d{6}$/.test(
                    savedOtp
                )
            ) {

                return show(
                    "Enter the 6-digit recovery code."
                );

            }


            const button =
                otpForm.querySelector(
                    "button"
                );


            button.disabled = true;


            try {

                const response =
                    await StockFlowAPI.verifyRecoveryOtp({
                        identity:
                            savedIdentity,

                        otp:
                            savedOtp
                    });


                if (!response.success) {

                    throw new Error(
                        response.message
                    );

                }


                show(
                    "Code verified. Create a new password.",
                    true
                );


                steps.otp
                    ?.classList.add(
                        "hidden"
                    );


                steps.reset
                    ?.classList.remove(
                        "hidden"
                    );


            } catch (error) {

                show(
                    error.message ||
                    "Invalid recovery code."
                );


            } finally {

                button.disabled = false;

            }

        }
    );


    /* =========================================================
       RESET PASSWORD
       ========================================================= */

    resetForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const password =
                resetForm.newPassword.value;


            const confirmPassword =
                resetForm.confirmPassword.value;


            if (
                password.length < 8
            ) {

                return show(
                    "Password must be at least 8 characters."
                );

            }


            if (
                password !==
                confirmPassword
            ) {

                return show(
                    "Passwords do not match."
                );

            }


            const button =
                resetForm.querySelector(
                    "button"
                );


            button.disabled = true;


            try {

                const response =
                    await StockFlowAPI.resetPassword({

                        identity:
                            savedIdentity,

                        otp:
                            savedOtp,

                        newPassword:
                            password

                    });


                if (!response.success) {

                    throw new Error(
                        response.message
                    );

                }


                show(
                    response.message ||
                    "Password reset successfully.",
                    true
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "auth.html";

                    },
                    1000
                );


            } catch (error) {

                show(
                    error.message ||
                    "Unable to reset password."
                );


            } finally {

                button.disabled = false;

            }

        }
    );

});
