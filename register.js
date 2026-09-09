/* ============================================================
   STOCKFLOW — REGISTRATION CONTROLLER
   ============================================================

   REGISTRATION FLOW:

   Register Form
        ↓
   Validate registration data
        ↓
   StockFlowAPI.register()
        ↓
   Google Apps Script
        ↓
   Generate ONE real verification OTP
        ↓
   Save account + OTP + expiry
        ↓
   Google Sheets USER
        ↓
   Save SAME OTP
        ↓
   Firebase
        ↓
   Return registration result
        ↓
   Save verification identity + OTP temporarily
        ↓
   Redirect to verify.html
        ↓
   verify.html / otp.js
        ↓
   Automatically populate six OTP boxes

   IMPORTANT:
   - OTP is generated ONLY by the backend.
   - OTP is stored in Google Sheets.
   - The SAME OTP is stored in Firebase.
   - Frontend does NOT generate an OTP.
   - No demoOtp property is used.
   - No fake Gmail/SMS delivery is claimed.
   ============================================================ */


document.addEventListener(
    "DOMContentLoaded",
    () => {

        "use strict";


        /* =====================================================
           FORM
           ===================================================== */

        const form =
            document.getElementById(
                "registerForm"
            );


        if (!form) {
            return;
        }


        /* =====================================================
           CONFIGURATION
           ===================================================== */

        const CONFIG =
            window.STOCKFLOW_CONFIG ||
            window.CONFIG ||
            {};


        const ROUTES =
            CONFIG.ROUTES ||
            {};


        const VERIFY_PAGE =
            ROUTES.VERIFY ||
            ROUTES.verify ||
            "verify.html";


        const AUTH =
            CONFIG.AUTH ||
            {};


        /* =====================================================
           STORAGE KEYS
           ===================================================== */

        const STORAGE_KEYS = {

            UID:
                AUTH.OTP_UID_KEY ||
                "STOCKFLOW_OTP_UID",

            EMAIL:
                AUTH.OTP_EMAIL_KEY ||
                "STOCKFLOW_OTP_EMAIL",

            PHONE:
                AUTH.OTP_PHONE_KEY ||
                "STOCKFLOW_OTP_PHONE",

            USERNAME:
                AUTH.OTP_USERNAME_KEY ||
                "STOCKFLOW_OTP_USERNAME",

            IDENTITY:
                AUTH.OTP_IDENTITY_KEY ||
                "STOCKFLOW_OTP_IDENTITY",

            CHANNEL:
                AUTH.OTP_CHANNEL_KEY ||
                "STOCKFLOW_OTP_CHANNEL",

            OTP:
                AUTH.OTP_CODE_KEY ||
                "STOCKFLOW_OTP_CODE",

            OTP_READY:
                AUTH.OTP_READY_KEY ||
                "STOCKFLOW_OTP_CODE_READY"

        };


        /* =====================================================
           ELEMENTS
           ===================================================== */

        const message =
            document.getElementById(
                "registerMessage"
            );


        const button =
            document.getElementById(
                "registerButton"
            ) ||
            form.querySelector(
                'button[type="submit"]'
            );


        /* =====================================================
           NAME FIELDS
           ===================================================== */

        const firstNameInput =
            document.getElementById(
                "registerFirstName"
            ) ||
            document.getElementById(
                "firstName"
            );


        const lastNameInput =
            document.getElementById(
                "registerLastName"
            ) ||
            document.getElementById(
                "lastName"
            );


        const oldNameInput =
            document.getElementById(
                "registerName"
            );


        /* =====================================================
           OTHER FIELDS
           ===================================================== */

        const usernameInput =
            document.getElementById(
                "registerUsername"
            );


        const ageInput =
            document.getElementById(
                "registerAge"
            );


        const emailInput =
            document.getElementById(
                "registerEmail"
            );


        const phoneInput =
            document.getElementById(
                "registerPhone"
            );


        const passwordInput =
            document.getElementById(
                "registerPassword"
            );


        const confirmPasswordInput =
            document.getElementById(
                "registerConfirmPassword"
            );


        /* =====================================================
           OPTIONAL CHECKBOXES
           ===================================================== */

        const termsInput =
            document.getElementById(
                "registerTerms"
            ) ||
            document.getElementById(
                "terms"
            ) ||
            document.querySelector(
                '[name="terms"]'
            );


        const communicationsInput =
            document.getElementById(
                "registerCommunications"
            ) ||
            document.getElementById(
                "communications"
            ) ||
            document.querySelector(
                '[name="communications"]'
            );


        /* =====================================================
           MESSAGE
           ===================================================== */

        function showMessage(
            text,
            type = "error"
        ) {

            if (!message) {
                return;
            }


            message.textContent =
                text || "";


            message.className =
                `auth-message ${type}`;

        }


        function clearMessage() {

            if (!message) {
                return;
            }


            message.textContent =
                "";


            message.className =
                "auth-message";

        }


        /* =====================================================
           LOADING
           ===================================================== */

        function setLoading(
            loading
        ) {

            if (!button) {
                return;
            }


            button.disabled =
                loading;


            button.classList.toggle(
                "loading",
                loading
            );


            button.setAttribute(
                "aria-busy",
                String(
                    loading
                )
            );


            const text =
                button.querySelector(
                    ".button-text"
                );


            const loader =
                button.querySelector(
                    ".button-loader"
                );


            if (text) {

                text.hidden =
                    loading;

            }


            if (loader) {

                loader.hidden =
                    !loading;

            }

        }


        /* =====================================================
           VALUE HELPERS
           ===================================================== */

        function getValue(
            input
        ) {

            return input
                ? input.value.trim()
                : "";

        }


        function getPasswordValue(
            input
        ) {

            return input
                ? input.value
                : "";

        }


        /* =====================================================
           PHONE NORMALIZATION
           ===================================================== */

        function normalizePhone(
            value
        ) {

            let phone =
                String(
                    value || ""
                )
                    .trim()
                    .replace(
                        /[\s()-]/g,
                        ""
                    );


            if (
                phone.startsWith(
                    "+63"
                )
            ) {

                phone =
                    "0" +
                    phone.substring(
                        3
                    );

            } else if (
                phone.startsWith(
                    "63"
                )
            ) {

                phone =
                    "0" +
                    phone.substring(
                        2
                    );

            }


            return phone;

        }


        /* =====================================================
           VALIDATION
           ===================================================== */

        function validateRegistration(
            data
        ) {

            if (
                !data.firstName
            ) {

                return (
                    "Please enter your first name."
                );

            }


            if (
                !data.lastName
            ) {

                return (
                    "Please enter your last name."
                );

            }


            const namePattern =
                /^[A-Za-zÀ-ÿ' -]+$/;


            if (
                !namePattern.test(
                    data.firstName
                )
            ) {

                return (
                    "First name contains invalid characters."
                );

            }


            if (
                !namePattern.test(
                    data.lastName
                )
            ) {

                return (
                    "Last name contains invalid characters."
                );

            }


            if (
                !data.username
            ) {

                return (
                    "Please enter a username."
                );

            }


            if (
                data.username.length < 4 ||
                data.username.length > 30
            ) {

                return (
                    "Username must contain 4–30 characters."
                );

            }


            if (
                !/^[A-Za-z0-9._-]+$/.test(
                    data.username
                )
            ) {

                return (
                    "Username may only contain letters, numbers, dots, underscores and hyphens."
                );

            }


            if (
                !Number.isInteger(
                    data.age
                )
            ) {

                return (
                    "Please enter your age."
                );

            }


            if (
                data.age < 18 ||
                data.age > 100
            ) {

                return (
                    "Please enter a valid age between 18 and 100."
                );

            }


            if (
                !data.email
            ) {

                return (
                    "Please enter your Gmail address."
                );

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    data.email
                )
            ) {

                return (
                    "Please enter a valid Gmail address."
                );

            }


            if (
                !data.email
                    .toLowerCase()
                    .endsWith(
                        "@gmail.com"
                    )
            ) {

                return (
                    "Please use a valid @gmail.com address."
                );

            }


            if (
                !data.phone
            ) {

                return (
                    "Please enter your Philippine mobile number."
                );

            }


            const phonePattern =
                /^09\d{9}$/;


            if (
                !phonePattern.test(
                    data.phone
                )
            ) {

                return (
                    "Phone number must be in 09XXXXXXXXX format."
                );

            }


            if (
                !data.password
            ) {

                return (
                    "Please create a password."
                );

            }


            if (
                data.password.length < 8
            ) {

                return (
                    "Password must contain at least 8 characters."
                );

            }


            if (
                !data.confirmPassword
            ) {

                return (
                    "Please confirm your password."
                );

            }


            if (
                data.password !==
                data.confirmPassword
            ) {

                return (
                    "Passwords do not match."
                );

            }


            if (
                termsInput &&
                !termsInput.checked
            ) {

                return (
                    "Please agree to the Privacy Policy and Terms before continuing."
                );

            }


            if (
                communicationsInput &&
                communicationsInput.dataset.required ===
                    "true" &&
                !communicationsInput.checked
            ) {

                return (
                    "Please allow account verification communications to continue."
                );

            }


            return null;

        }


        /* =====================================================
           SAVE VERIFICATION STATE
           ===================================================== */
        //
        // IMPORTANT:
        // otp is the actual OTP generated by Code.gs.
        //
        // It is only stored temporarily in sessionStorage so
        // verify.html can automatically populate the boxes.
        //
        // The authoritative OTP remains in Google Sheets and
        // Firebase.
        //
        /* ===================================================== */

        function saveVerificationState(
            response,
            data
        ) {

            response =
                response || {};


            const identity =
                response.identity ||
                response.uid ||
                response.userId ||
                response.username ||
                response.email ||
                response.gmail ||
                response.phone ||
                data.username;


            const uid =
                response.uid ||
                response.userId ||
                "";


            const email =
                response.email ||
                response.gmail ||
                data.email;


            const phone =
                response.phone ||
                data.phone;


            const username =
                response.username ||
                data.username;


            const id =
                response.id ||
                "";


            const channel =
                response.channel ||
                "both";


            const otp =
                response.otp ||
                "";


            const otpReady =
                response.otpReady === true &&
                /^\d{6}$/.test(
                    String(
                        otp
                    )
                );


            if (
                !identity
            ) {

                throw new Error(
                    "Registration completed, but no verification identity was returned by the server."
                );

            }


            if (
                !otpReady
            ) {

                throw new Error(
                    "Registration completed, but the verification OTP was not returned by the server."
                );

            }


            try {

                sessionStorage.setItem(
                    STORAGE_KEYS.UID,
                    String(
                        uid
                    )
                );


                sessionStorage.setItem(
                    STORAGE_KEYS.EMAIL,
                    String(
                        email
                    )
                );


                sessionStorage.setItem(
                    STORAGE_KEYS.PHONE,
                    String(
                        phone
                    )
                );


                sessionStorage.setItem(
                    STORAGE_KEYS.USERNAME,
                    String(
                        username
                    )
                );


                sessionStorage.setItem(
                    STORAGE_KEYS.IDENTITY,
                    String(
                        identity
                    )
                );


                sessionStorage.setItem(
                    STORAGE_KEYS.CHANNEL,
                    String(
                        channel
                    )
                );


                /*
                 * Actual backend-generated OTP.
                 *
                 * This is temporary browser state used only
                 * to populate the verification UI.
                 */
                sessionStorage.setItem(
                    STORAGE_KEYS.OTP,
                    String(
                        otp
                    )
                );


                sessionStorage.setItem(
                    STORAGE_KEYS.OTP_READY,
                    "true"
                );


                /*
                 * Numeric account ID.
                 */
                sessionStorage.setItem(
                    "STOCKFLOW_OTP_ID",
                    String(
                        id
                    )
                );


                /*
                 * Backward-compatible keys.
                 */
                sessionStorage.setItem(
                    "stockflow_otp_identity",
                    String(
                        identity
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_email",
                    String(
                        email
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_phone",
                    String(
                        phone
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_username",
                    String(
                        username
                    )
                );


                sessionStorage.setItem(
                    "stockflow_otp_code",
                    String(
                        otp
                    )
                );


            } catch (
                storageError
            ) {

                console.error(
                    "STOCKFLOW verification storage error:",
                    storageError
                );


                throw new Error(
                    "Registration succeeded, but the verification information could not be saved in this browser."
                );

            }


            return {

                id:
                    id,

                identity:
                    identity,

                uid:
                    uid,

                email:
                    email,

                phone:
                    phone,

                username:
                    username,

                channel:
                    channel,

                otp:
                    otp,

                otpReady:
                    true

            };

        }


        /* =====================================================
           SUCCESS MESSAGE
           ===================================================== */

        function buildSuccessMessage(
            response
        ) {

            if (
                response &&
                response.message
            ) {

                return response.message;

            }


            return (
                "Registration successful. Your verification OTP is ready."
            );

        }


        /* =====================================================
           REDIRECT
           ===================================================== */

        function redirectToVerification() {

            window.location.replace(
                VERIFY_PAGE
            );

        }


        /* =====================================================
           SUBMIT
           ===================================================== */

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                clearMessage();


                /* =============================================
                   READ NAME
                   ============================================= */

                let firstName =
                    getValue(
                        firstNameInput
                    );


                let lastName =
                    getValue(
                        lastNameInput
                    );


                /* =============================================
                   OLD FULL NAME COMPATIBILITY
                   ============================================= */

                if (
                    (!firstName || !lastName) &&
                    oldNameInput
                ) {

                    const oldName =
                        getValue(
                            oldNameInput
                        );


                    const nameParts =
                        oldName.split(
                            /\s+/
                        );


                    if (
                        !firstName
                    ) {

                        firstName =
                            nameParts.shift() ||
                            "";

                    }


                    if (
                        !lastName
                    ) {

                        lastName =
                            nameParts.join(
                                " "
                            ) ||
                            "";

                    }

                }


                /* =============================================
                   PHONE
                   ============================================= */

                const phone =
                    normalizePhone(
                        getValue(
                            phoneInput
                        )
                    );


                /* =============================================
                   FORM DATA
                   ============================================= */

                const email =
                    getValue(
                        emailInput
                    )
                        .toLowerCase();


                const data = {

                    firstName:
                        firstName,

                    lastName:
                        lastName,

                    name:
                        `${firstName} ${lastName}`
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim(),

                    username:
                        getValue(
                            usernameInput
                        ),

                    age:
                        Number(
                            getValue(
                                ageInput
                            )
                        ),

                    email:
                        email,

                    gmail:
                        email,

                    phone:
                        phone,

                    password:
                        getPasswordValue(
                            passwordInput
                        ),

                    confirmPassword:
                        getPasswordValue(
                            confirmPasswordInput
                        )

                };


                /* =============================================
                   VALIDATE
                   ============================================= */

                const validationError =
                    validateRegistration(
                        data
                    );


                if (
                    validationError
                ) {

                    showMessage(
                        validationError,
                        "error"
                    );

                    return;

                }


                /* =============================================
                   LOADING
                   ============================================= */

                setLoading(
                    true
                );


                try {

                    /* =========================================
                       API CHECK
                       ========================================= */

                    if (
                        !window.StockFlowAPI ||
                        typeof window.StockFlowAPI.register !==
                            "function"
                    ) {

                        throw new Error(
                            "Registration API is not available. Please check api.js."
                        );

                    }


                    /* =========================================
                       REGISTER
                       ========================================= */

                    const response =
                        await window.StockFlowAPI.register({

                            firstName:
                                data.firstName,

                            lastName:
                                data.lastName,

                            name:
                                data.name,

                            username:
                                data.username,

                            age:
                                data.age,

                            email:
                                data.email,

                            gmail:
                                data.gmail,

                            phone:
                                data.phone,

                            password:
                                data.password

                        });


                    /* =========================================
                       EMPTY RESPONSE
                       ========================================= */

                    if (
                        !response
                    ) {

                        throw new Error(
                            "No response was received from the STOCKFLOW server."
                        );

                    }


                    /* =========================================
                       REGISTRATION FAILED
                       ========================================= */

                    if (
                        response.success !== true
                    ) {

                        throw new Error(
                            response.message ||
                            "Registration failed. Please check your information and try again."
                        );

                    }


                    /* =========================================
                       SAVE REAL OTP + IDENTITY
                       ========================================= */

                    const verification =
                        saveVerificationState(
                            response,
                            data
                        );


                    /* =========================================
                       SUCCESS MESSAGE
                       ========================================= */

                    showMessage(
                        buildSuccessMessage(
                            response,
                            verification
                        ),
                        "success"
                    );


                    /* =========================================
                       REDIRECT
                       ========================================= */

                    window.setTimeout(
                        () => {

                            redirectToVerification();

                        },
                        700
                    );


                } catch (
                    error
                ) {

                    console.error(
                        "STOCKFLOW registration error:",
                        error
                    );


                    let errorMessage =
                        error &&
                        error.message
                            ? error.message
                            : "";


                    /*
                     * Keep useful backend errors.
                     *
                     * Only replace truly generic network
                     * errors with the connection message.
                     */
                    if (
                        /failed to fetch|network error|network request|load failed/i
                            .test(
                                errorMessage
                            )
                    ) {

                        errorMessage =
                            "Unable to connect to the registration system. Please check that the Google Apps Script Web App is deployed and accessible.";

                    }


                    showMessage(
                        errorMessage ||
                        "Unable to create your account. Please try again.",
                        "error"
                    );


                } finally {

                    setLoading(
                        false
                    );

                }

            }
        );


        /* =====================================================
           PREVENT DOUBLE SUBMISSION
           ===================================================== */

        form.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" &&
                    button &&
                    button.disabled
                ) {

                    event.preventDefault();

                }

            }
        );

    }
);
