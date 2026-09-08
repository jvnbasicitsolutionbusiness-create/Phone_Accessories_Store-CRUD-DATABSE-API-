/* =========================================================
   STOCKFLOW — SYSTEM CONFIGURATION
   File: config.js

   Purpose:
   - Central configuration for STOCKFLOW
   - Google Apps Script API
   - Firebase Realtime Database
   - Application routes
   - Authentication
   - OTP verification
   - Session storage
   - Inventory settings

   IMPORTANT:
   This project is currently running in DEMO / MIDTERM mode.

   OTP FLOW:
   1. Backend generates the OTP.
   2. Backend stores OTP in Google Sheets.
   3. Backend synchronizes OTP to Firebase.
   4. Backend returns the demo OTP when DEMO_MODE is enabled.
   5. otp.js displays the six-digit OTP automatically.
   6. User clicks Verify Account.
   7. Backend verifies the OTP.
========================================================= */

(function () {

    "use strict";


    /* =========================================================
       CORE APPLICATION CONFIGURATION
    ========================================================= */

    const STOCKFLOW_CONFIG = {

        /* -----------------------------------------------------
           APPLICATION
        ----------------------------------------------------- */

        APP_NAME:
            "STOCKFLOW",

        APP_FULL_NAME:
            "Phone Accessories Inventory Management System",

        VERSION:
            "1.0.0",

        ENVIRONMENT:
            "development",

        /*
           Midterm / demonstration mode.

           When true:
           - Backend-generated OTP may be returned to frontend.
           - otp.js may automatically fill the six OTP boxes.
           - No real email delivery is required.
           - No real SMS delivery is required.
        */

        DEMO_MODE:
            true,


        /* =====================================================
           GOOGLE APPS SCRIPT
        ===================================================== */

        /*
           IMPORTANT:
           Keep this as a RAW URL.

           DO NOT paste it as:
           [https://...](https://...)

           The value must be a normal JavaScript string.
        */

        API_URL:
            "https://script.google.com/macros/s/AKfycbytfBA-SJDFkD8QlzHqpl65qL4gCXkLfAZV2vec1Y36RcuIKbcwOER8jgDhIDeHtlgefw/exec",


        /* =====================================================
           GOOGLE SHEETS
        ===================================================== */

        GOOGLE_SHEET_ID:
            "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY",


        /* =====================================================
           FIREBASE REALTIME DATABASE
        ===================================================== */

        FIREBASE: {

            DATABASE_URL:
                "https://midtermexamproject-default-rtdb.firebaseio.com/",

            /*
               Optional Firebase REST token.

               Leave empty if the Firebase rules currently allow
               the Apps Script backend to perform the required
               REST operations.

               For production this should be secured.
            */

            AUTH_TOKEN:
                ""
        },


        /* =====================================================
           AUTHENTICATION
        ===================================================== */

        AUTH: {

            /* -------------------------------------------------
               SESSION
            ------------------------------------------------- */

            SESSION_KEY:
                "STOCKFLOW_TOKEN",

            USER_KEY:
                "STOCKFLOW_USER",

            SESSION_DURATION_MINUTES:
                480,


            /* -------------------------------------------------
               OTP IDENTITY STORAGE
            ------------------------------------------------- */

            OTP_UID_KEY:
                "STOCKFLOW_OTP_UID",

            OTP_IDENTITY_KEY:
                "STOCKFLOW_OTP_IDENTITY",

            OTP_USERNAME_KEY:
                "STOCKFLOW_OTP_USERNAME",

            OTP_EMAIL_KEY:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE_KEY:
                "STOCKFLOW_OTP_PHONE",

            OTP_CHANNEL_KEY:
                "STOCKFLOW_OTP_CHANNEL",


            /* -------------------------------------------------
               OTP DEMO STATE
            ------------------------------------------------- */

            OTP_CODE_KEY:
                "STOCKFLOW_OTP_CODE",

            OTP_CODE_READY_KEY:
                "STOCKFLOW_OTP_CODE_READY",

            OTP_EMAIL_SENT_KEY:
                "STOCKFLOW_OTP_EMAIL_SENT",

            OTP_PHONE_SENT_KEY:
                "STOCKFLOW_OTP_PHONE_SENT",


            /* -------------------------------------------------
               REDIRECT
            ------------------------------------------------- */

            REDIRECT_KEY:
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",


            /* =================================================
               OTP SETTINGS
            ================================================= */

            OTP_LENGTH:
                6,

            OTP_EXPIRATION_MINUTES:
                10,

            OTP_RESEND_COOLDOWN_SECONDS:
                60,

            MAX_OTP_ATTEMPTS:
                4,

            OTP_LOCK_MINUTES:
                30,


            /* -------------------------------------------------
               OTP IDENTITY REQUIREMENT
            ------------------------------------------------- */

            REQUIRE_IDENTITY:
                true,

            /*
               The verification request may use:

               - UID
               - Username
               - Gmail
               - Phone number

               Backend decides which identity is authoritative.
            */


            /* -------------------------------------------------
               OTP CHANNELS
            ------------------------------------------------- */

            CHANNELS: {

                EMAIL:
                    "email",

                PHONE:
                    "phone"
            },


            /* -------------------------------------------------
               DEFAULT OTP CHANNEL
            ------------------------------------------------- */

            DEFAULT_CHANNEL:
                "email",


            /* =================================================
               DEMO OTP AUTO-FILL
            ================================================= */

            /*
               The frontend must NEVER generate the authoritative
               OTP.

               The backend generates it.

               In demo mode, the backend may return the generated
               OTP to the browser.

               otp.js then fills the six boxes automatically.
            */

            DEMO_AUTO_FILL:
                true,

            DEMO_AUTO_FILL_DELAY_MIN:
                3000,

            DEMO_AUTO_FILL_DELAY_MAX:
                5000,


            /* -------------------------------------------------
               OTP PREPARATION
            ------------------------------------------------- */

            AUTO_PREPARE_OTP:
                true,


            /* -------------------------------------------------
               OTP INPUT
            ------------------------------------------------- */

            OTP_INPUT_CLASS:
                "otp-digit",

            OTP_HIDDEN_INPUT_ID:
                "otp",


            /* -------------------------------------------------
               VERIFICATION PAGE
            ------------------------------------------------- */

            VERIFY_PAGE:
                "verify.html"
        },


        /* =====================================================
           API REQUEST CONFIGURATION
        ===================================================== */

        API: {

            METHOD:
                "POST",

            CONTENT_TYPE:
                "text/plain;charset=utf-8",

            TIMEOUT:
                30000,

            RETRY_COUNT:
                2,

            RETRY_DELAY:
                1000
        },


        /* =====================================================
           APPLICATION ROUTES
        ===================================================== */

        ROUTES: {

            /* -------------------------------------------------
               PUBLIC
            ------------------------------------------------- */

            HOME:
                "index.html",

            AUTH:
                "auth.html",

            LOGIN:
                "auth.html#login",

            REGISTER:
                "auth.html#register",

            VERIFY:
                "verify.html",

            OTP:
                "verify.html",

            FORGOT_PASSWORD:
                "forgot-password.html",

            FORGOT_PASSWORD_LEGACY:
                "forgotpassword.html",


            /* -------------------------------------------------
               MAIN SYSTEM
            ------------------------------------------------- */

            DASHBOARD:
                "dashboard.html",

            INVENTORY_DASHBOARD:
                "inventory-dashboard.html",

            PRODUCTS:
                "products.html",

            INVENTORY:
                "inventory.html",

            CATEGORIES:
                "categories.html",

            SUPPLIERS:
                "suppliers.html",

            STOCK_IN:
                "stock-in.html",

            STOCK_OUT:
                "stock-out.html",

            TRANSACTIONS:
                "transactions.html",

            ACTIVITY:
                "activity.html",

            PROFILE:
                "profile.html",

            SETTINGS:
                "settings.html"
        },


        /* =====================================================
           INVENTORY
        ===================================================== */

        INVENTORY: {

            DEFAULT_REORDER_LEVEL:
                10,

            MIN_STOCK:
                0,

            ALLOW_NEGATIVE_STOCK:
                false,

            CURRENCY:
                "PHP",

            CURRENCY_SYMBOL:
                "₱"
        },


        /* =====================================================
           USER ROLES
        ===================================================== */

        ROLES: {

            ADMIN:
                "Admin",

            EMPLOYEE:
                "Employee"
        },


        /* =====================================================
           ACCOUNT STATUS
        ===================================================== */

        ACCOUNT_STATUS: {

            ACTIVE:
                "ACTIVE",

            PENDING:
                "PENDING",

            DISABLED:
                "DISABLED",

            BLOCKED:
                "BLOCKED",

            SUSPENDED:
                "SUSPENDED",

            REJECTED:
                "REJECTED"
        },


        /* =====================================================
           TRANSACTION TYPES
        ===================================================== */

        TRANSACTION_TYPES: {

            STOCK_IN:
                "STOCK-IN",

            STOCK_OUT:
                "STOCK-OUT"
        },


        /* =====================================================
           PRODUCT STATUS
        ===================================================== */

        PRODUCT_STATUS: {

            ACTIVE:
                "ACTIVE",

            INACTIVE:
                "INACTIVE",

            LOW_STOCK:
                "LOW STOCK",

            OUT_OF_STOCK:
                "OUT OF STOCK"
        },


        /* =====================================================
           STORAGE
        ===================================================== */

        STORAGE: {

            TOKEN:
                "STOCKFLOW_TOKEN",

            USER:
                "STOCKFLOW_USER",

            OTP_UID:
                "STOCKFLOW_OTP_UID",

            OTP_IDENTITY:
                "STOCKFLOW_OTP_IDENTITY",

            OTP_USERNAME:
                "STOCKFLOW_OTP_USERNAME",

            OTP_EMAIL:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE:
                "STOCKFLOW_OTP_PHONE",

            OTP_CHANNEL:
                "STOCKFLOW_OTP_CHANNEL",

            OTP_CODE:
                "STOCKFLOW_OTP_CODE",

            OTP_CODE_READY:
                "STOCKFLOW_OTP_CODE_READY",

            OTP_EMAIL_SENT:
                "STOCKFLOW_OTP_EMAIL_SENT",

            OTP_PHONE_SENT:
                "STOCKFLOW_OTP_PHONE_SENT",

            REDIRECT_AFTER_LOGIN:
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",

            REORDER_LEVEL:
                "STOCKFLOW_REORDER_LEVEL"
        },


        /* =====================================================
           PUBLIC PAGES
        ===================================================== */

        PUBLIC_PAGES: [

            "",

            "index.html",

            "auth.html",

            "register.html",

            "verify.html",

            "verify-otp.html",

            "forgot-password.html",

            "forgotpassword.html"
        ],


        /* =====================================================
           DEBUG
        ===================================================== */

        DEBUG:
            true
    };


    /* =========================================================
       CONFIGURATION VALIDATION
    ========================================================= */

    function validateConfig() {

        const errors = [];


        /* -----------------------------------------------------
           API
        ----------------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.API_URL ||
            typeof STOCKFLOW_CONFIG.API_URL !== "string"
        ) {

            errors.push(
                "Google Apps Script API URL is missing."
            );

        } else if (
            !STOCKFLOW_CONFIG.API_URL.includes("/exec")
        ) {

            errors.push(
                "Google Apps Script API URL must end with /exec."
            );
        }


        /* -----------------------------------------------------
           GOOGLE SHEET
        ----------------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.GOOGLE_SHEET_ID ||
            STOCKFLOW_CONFIG.GOOGLE_SHEET_ID.trim() === ""
        ) {

            errors.push(
                "Google Sheet ID is missing."
            );
        }


        /* -----------------------------------------------------
           FIREBASE
        ----------------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.FIREBASE ||
            !STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
        ) {

            errors.push(
                "Firebase Database URL is missing."
            );

        } else if (
            !STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
                .startsWith("https://")
        ) {

            errors.push(
                "Firebase Database URL must use HTTPS."
            );
        }


        /* -----------------------------------------------------
           OTP LENGTH
        ----------------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.AUTH.OTP_LENGTH !== 6
        ) {

            errors.push(
                "OTP length must be exactly 6 digits."
            );
        }


        /* -----------------------------------------------------
           OTP EXPIRATION
        ----------------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.AUTH.OTP_EXPIRATION_MINUTES < 1
        ) {

            errors.push(
                "OTP expiration must be at least 1 minute."
            );
        }


        /* -----------------------------------------------------
           OTP ATTEMPTS
        ----------------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.AUTH.MAX_OTP_ATTEMPTS < 1
        ) {

            errors.push(
                "Maximum OTP attempts must be at least 1."
            );
        }


        /* -----------------------------------------------------
           OTP LOCK
        ----------------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.AUTH.OTP_LOCK_MINUTES < 1
        ) {

            errors.push(
                "OTP lock duration must be at least 1 minute."
            );
        }


        /* -----------------------------------------------------
           DEMO DELAY
        ----------------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL_DELAY_MIN < 0
        ) {

            errors.push(
                "Demo OTP minimum delay cannot be negative."
            );
        }


        if (
            STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL_DELAY_MAX <
            STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL_DELAY_MIN
        ) {

            errors.push(
                "Demo OTP maximum delay cannot be smaller than minimum delay."
            );
        }


        /* -----------------------------------------------------
           RESULT
        ----------------------------------------------------- */

        if (errors.length > 0) {

            console.error(
                "STOCKFLOW CONFIGURATION ERROR"
            );

            errors.forEach(function (error) {

                console.error(
                    "• " + error
                );

            });

            return false;
        }


        return true;
    }


    /* =========================================================
       API URL HELPER
    ========================================================= */

    function getApiUrl() {

        return STOCKFLOW_CONFIG.API_URL;
    }


    /* =========================================================
       ROUTE HELPER
    ========================================================= */

    function getRoute(routeName) {

        if (
            !routeName ||
            !STOCKFLOW_CONFIG.ROUTES[routeName]
        ) {

            return STOCKFLOW_CONFIG.ROUTES.DASHBOARD;
        }


        return STOCKFLOW_CONFIG.ROUTES[routeName];
    }


    /* =========================================================
       FIREBASE URL HELPER
    ========================================================= */

    function getFirebaseUrl() {

        return STOCKFLOW_CONFIG
            .FIREBASE
            .DATABASE_URL;
    }


    /* =========================================================
       ENVIRONMENT HELPERS
    ========================================================= */

    function isProduction() {

        return (
            STOCKFLOW_CONFIG.ENVIRONMENT ===
            "production"
        );
    }


    function isDemoMode() {

        return (
            STOCKFLOW_CONFIG.DEMO_MODE === true
        );
    }


    function isDebug() {

        return (
            STOCKFLOW_CONFIG.DEBUG === true
        );
    }


    /* =========================================================
       OTP HELPERS
    ========================================================= */

    function getOtpLength() {

        return STOCKFLOW_CONFIG
            .AUTH
            .OTP_LENGTH;
    }


    function getOtpChannel(channel) {

        const channels =
            STOCKFLOW_CONFIG.AUTH.CHANNELS;


        if (
            channel === channels.PHONE
        ) {

            return channels.PHONE;
        }


        return channels.EMAIL;
    }


    function getRandomDemoDelay() {

        const min =
            STOCKFLOW_CONFIG.AUTH
                .DEMO_AUTO_FILL_DELAY_MIN;

        const max =
            STOCKFLOW_CONFIG.AUTH
                .DEMO_AUTO_FILL_DELAY_MAX;


        return Math.floor(
            Math.random() *
            (max - min + 1)
        ) + min;
    }


    /* =========================================================
       GLOBAL CONFIGURATION
    ========================================================= */

    window.STOCKFLOW_CONFIG =
        STOCKFLOW_CONFIG;


    /*
       Backward compatibility.

       Existing files may use:

       CONFIG.API_URL
       CONFIG.AUTH.OTP_LENGTH
       CONFIG.ROUTES.DASHBOARD

       Therefore keep CONFIG available.
    */

    window.CONFIG =
        STOCKFLOW_CONFIG;


    /* =========================================================
       STOCKFLOW CONFIG HELPER
    ========================================================= */

    window.StockFlowConfig = {

        config:
            STOCKFLOW_CONFIG,

        getApiUrl:
            getApiUrl,

        getFirebaseUrl:
            getFirebaseUrl,

        getRoute:
            getRoute,

        getOtpLength:
            getOtpLength,

        getOtpChannel:
            getOtpChannel,

        getRandomDemoDelay:
            getRandomDemoDelay,

        validate:
            validateConfig,

        isProduction:
            isProduction,

        isDemoMode:
            isDemoMode,

        isDebug:
            isDebug
    };


    /* =========================================================
       VALIDATE ON LOAD
    ========================================================= */

    const valid =
        validateConfig();


    if (
        valid &&
        STOCKFLOW_CONFIG.DEBUG
    ) {

        console.log(
            "%cSTOCKFLOW CONFIG LOADED",
            "font-weight:bold;"
        );

        console.log(
            "Version:",
            STOCKFLOW_CONFIG.VERSION
        );

        console.log(
            "Environment:",
            STOCKFLOW_CONFIG.ENVIRONMENT
        );

        console.log(
            "Demo Mode:",
            STOCKFLOW_CONFIG.DEMO_MODE
        );

        console.log(
            "OTP Length:",
            STOCKFLOW_CONFIG.AUTH.OTP_LENGTH
        );

        console.log(
            "OTP Auto Fill:",
            STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL
        );

        console.log(
            "API:",
            STOCKFLOW_CONFIG.API_URL
        );

        console.log(
            "Firebase:",
            STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
        );
    }


})();
