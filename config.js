(function () {
    "use strict";

    /* =========================================================
       STOCKFLOW CONFIGURATION
       Phone Accessories Inventory Management System
       ========================================================= */

    const STOCKFLOW_CONFIG = {

        /* =====================================================
           APPLICATION
           ===================================================== */

        APP_NAME: "STOCKFLOW",

        APP_FULL_NAME:
            "Phone Accessories Inventory Management System",

        VERSION: "1.0.0",

        ENVIRONMENT: "development",

        /*
         * MIDTERM / DEMO MODE
         *
         * true:
         * - Backend generates the OTP.
         * - OTP is stored in Google Sheets.
         * - OTP is stored/synchronized in Firebase.
         * - Backend may return the generated OTP for demo
         *   auto-fill.
         *
         * false:
         * - OTP must not be exposed to the browser.
         */
        DEMO_MODE: true,


        /* =====================================================
           GOOGLE APPS SCRIPT WEB APP
           ===================================================== */

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
             * Leave empty when Firebase does not require
             * an authentication token for the current
             * midterm/demo setup.
             *
             * For production, use proper Firebase
             * authentication/security rules.
             */
            AUTH_TOKEN: ""
        },


        /* =====================================================
           AUTHENTICATION
           ===================================================== */

        AUTH: {

            /* -----------------------------------------------
               SESSION
               ----------------------------------------------- */

            SESSION_KEY:
                "STOCKFLOW_TOKEN",

            USER_KEY:
                "STOCKFLOW_USER",


            /* -----------------------------------------------
               OTP USER INFORMATION
               ----------------------------------------------- */

            OTP_UID_KEY:
                "STOCKFLOW_OTP_UID",

            OTP_EMAIL_KEY:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE_KEY:
                "STOCKFLOW_OTP_PHONE",

            OTP_USERNAME_KEY:
                "STOCKFLOW_OTP_USERNAME",

            OTP_IDENTITY_KEY:
                "STOCKFLOW_OTP_IDENTITY",

            OTP_CHANNEL_KEY:
                "STOCKFLOW_OTP_CHANNEL",


            /* -----------------------------------------------
               OTP DEMO STORAGE
               ----------------------------------------------- */

            OTP_CODE_KEY:
                "STOCKFLOW_OTP_CODE",

            OTP_READY_KEY:
                "STOCKFLOW_OTP_CODE_READY",

            OTP_EMAIL_SENT_KEY:
                "STOCKFLOW_OTP_EMAIL_SENT",

            OTP_PHONE_SENT_KEY:
                "STOCKFLOW_OTP_PHONE_SENT",


            /* -----------------------------------------------
               OTP SETTINGS
               ----------------------------------------------- */

            OTP_LENGTH: 6,

            OTP_EXPIRATION_MINUTES: 10,

            OTP_RESEND_COOLDOWN_SECONDS: 60,

            /*
             * After 4 incorrect attempts:
             * account/OTP verification is temporarily
             * locked for 30 minutes.
             */
            MAX_OTP_ATTEMPTS: 4,

            OTP_LOCK_MINUTES: 30,


            /* -----------------------------------------------
               DEMO AUTO-FILL
               ----------------------------------------------- */

            DEMO_AUTO_FILL: true,

            /*
             * OTP should appear automatically somewhere
             * between 3 and 5 seconds after preparation.
             */
            DEMO_AUTO_FILL_DELAY_MIN: 3000,

            DEMO_AUTO_FILL_DELAY_MAX: 5000
        },


        /* =====================================================
           API SETTINGS
           ===================================================== */

        API: {

            METHOD: "POST",

            /*
             * text/plain prevents the browser from triggering
             * the normal JSON CORS preflight against Apps Script.
             */
            CONTENT_TYPE:
                "text/plain;charset=utf-8",

            TIMEOUT: 30000,

            RETRY_COUNT: 1,

            RETRY_DELAY: 1000
        },


        /* =====================================================
           ROUTES
           ===================================================== */

        ROUTES: {

            HOME:
                "index.html",

            LOGIN:
                "auth.html#login",

            REGISTER:
                "auth.html#register",

            AUTH:
                "auth.html",

            /*
             * Main OTP verification page.
             */
            VERIFY:
                "verify.html",

            /*
             * Backward-compatible OTP route.
             */
            OTP:
                "verify.html",

            /*
             * Recovery page.
             *
             * This is the page used when the user clicks:
             * "Didn't receive the code? Click here"
             */
            RECOVERY:
                "recovery.html",

            FORGOT_PASSWORD:
                "forgot-password.html",

            /*
             * Legacy route kept for compatibility.
             */
            FORGOT_PASSWORD_LEGACY:
                "forgotpassword.html",

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
           INVENTORY SETTINGS
           ===================================================== */

        INVENTORY: {

            DEFAULT_REORDER_LEVEL: 10,

            MIN_STOCK: 0,

            ALLOW_NEGATIVE_STOCK: false,

            CURRENCY: "PHP",

            CURRENCY_SYMBOL: "₱"
        },


        /* =====================================================
           ROLES
           ===================================================== */

        ROLES: {

            ADMIN: "Admin",

            EMPLOYEE: "Employee"
        },


        /* =====================================================
           ACCOUNT STATUS
           ===================================================== */

        ACCOUNT_STATUS: {

            ACTIVE: "ACTIVE",

            PENDING: "PENDING",

            DISABLED: "DISABLED",

            BLOCKED: "BLOCKED",

            SUSPENDED: "SUSPENDED",

            REJECTED: "REJECTED"
        },


        /* =====================================================
           TRANSACTION TYPES
           ===================================================== */

        TRANSACTION_TYPES: {

            STOCK_IN: "STOCK-IN",

            STOCK_OUT: "STOCK-OUT"
        },


        /* =====================================================
           PRODUCT STATUS
           ===================================================== */

        PRODUCT_STATUS: {

            ACTIVE: "ACTIVE",

            INACTIVE: "INACTIVE",

            LOW_STOCK: "LOW STOCK",

            OUT_OF_STOCK: "OUT OF STOCK"
        },


        /* =====================================================
           STORAGE KEYS
           ===================================================== */

        STORAGE: {

            /* -----------------------------------------------
               SESSION
               ----------------------------------------------- */

            TOKEN:
                "STOCKFLOW_TOKEN",

            USER:
                "STOCKFLOW_USER",


            /* -----------------------------------------------
               OTP
               ----------------------------------------------- */

            OTP_UID:
                "STOCKFLOW_OTP_UID",

            OTP_EMAIL:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE:
                "STOCKFLOW_OTP_PHONE",

            OTP_USERNAME:
                "STOCKFLOW_OTP_USERNAME",

            OTP_IDENTITY:
                "STOCKFLOW_OTP_IDENTITY",

            OTP_CHANNEL:
                "STOCKFLOW_OTP_CHANNEL",

            OTP_CODE:
                "STOCKFLOW_OTP_CODE",

            OTP_READY:
                "STOCKFLOW_OTP_CODE_READY",

            OTP_EMAIL_SENT:
                "STOCKFLOW_OTP_EMAIL_SENT",

            OTP_PHONE_SENT:
                "STOCKFLOW_OTP_PHONE_SENT",


            /* -----------------------------------------------
               OTHER SETTINGS
               ----------------------------------------------- */

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

            "recovery.html",

            "forgot-password.html",

            "forgotpassword.html"
        ],


        /* =====================================================
           DEBUG
           ===================================================== */

        DEBUG: true
    };


    /* =========================================================
       CONFIGURATION VALIDATION
       ========================================================= */

    function validateConfig() {

        const errors = [];


        /* -----------------------------------------------
           API URL
           ----------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.API_URL ||
            typeof STOCKFLOW_CONFIG.API_URL !== "string"
        ) {
            errors.push(
                "API_URL is missing."
            );
        }


        /* -----------------------------------------------
           API URL FORMAT
           ----------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.API_URL &&
            !STOCKFLOW_CONFIG.API_URL.includes(
                "script.google.com/macros/s/"
            )
        ) {
            errors.push(
                "API_URL does not appear to be a valid Google Apps Script Web App URL."
            );
        }


        /* -----------------------------------------------
           FIREBASE URL
           ----------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.FIREBASE ||
            !STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
        ) {
            errors.push(
                "Firebase DATABASE_URL is missing."
            );
        }


        /* -----------------------------------------------
           OTP LENGTH
           ----------------------------------------------- */

        if (
            Number(STOCKFLOW_CONFIG.AUTH.OTP_LENGTH) !== 6
        ) {
            errors.push(
                "OTP_LENGTH must be 6."
            );
        }


        /* -----------------------------------------------
           OTP EXPIRATION
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH.OTP_EXPIRATION_MINUTES
            ) <= 0
        ) {
            errors.push(
                "OTP expiration must be greater than zero."
            );
        }


        /* -----------------------------------------------
           OTP RESEND COOLDOWN
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH.OTP_RESEND_COOLDOWN_SECONDS
            ) < 0
        ) {
            errors.push(
                "OTP resend cooldown cannot be negative."
            );
        }


        /* -----------------------------------------------
           OTP ATTEMPTS
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH.MAX_OTP_ATTEMPTS
            ) <= 0
        ) {
            errors.push(
                "MAX_OTP_ATTEMPTS must be greater than zero."
            );
        }


        /* -----------------------------------------------
           DEMO DELAY
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL_DELAY_MIN
            ) < 0
        ) {
            errors.push(
                "DEMO_AUTO_FILL_DELAY_MIN cannot be negative."
            );
        }


        if (
            Number(
                STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL_DELAY_MAX
            ) <
            Number(
                STOCKFLOW_CONFIG.AUTH.DEMO_AUTO_FILL_DELAY_MIN
            )
        ) {
            errors.push(
                "DEMO_AUTO_FILL_DELAY_MAX must be greater than or equal to DEMO_AUTO_FILL_DELAY_MIN."
            );
        }


        /* -----------------------------------------------
           RETURN
           ----------------------------------------------- */

        if (errors.length > 0) {

            console.error(
                "[STOCKFLOW CONFIG ERROR]",
                errors
            );

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
       FIREBASE URL HELPER
       ========================================================= */

    function getFirebaseUrl() {

        return STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL;
    }


    /* =========================================================
       ROUTE HELPER
       ========================================================= */

    function getRoute(routeName) {

        if (
            !routeName ||
            !STOCKFLOW_CONFIG.ROUTES
        ) {
            return STOCKFLOW_CONFIG.ROUTES.DASHBOARD;
        }

        return (
            STOCKFLOW_CONFIG.ROUTES[routeName] ||
            STOCKFLOW_CONFIG.ROUTES.DASHBOARD
        );
    }


    /* =========================================================
       DEMO MODE HELPER
       ========================================================= */

    function isDemoMode() {

        return (
            STOCKFLOW_CONFIG.DEMO_MODE === true
        );
    }


    /* =========================================================
       PRODUCTION MODE HELPER
       ========================================================= */

    function isProduction() {

        return (
            STOCKFLOW_CONFIG.ENVIRONMENT ===
            "production"
        );
    }


    /* =========================================================
       DEBUG MODE HELPER
       ========================================================= */

    function isDebug() {

        return (
            STOCKFLOW_CONFIG.DEBUG === true
        );
    }


    /* =========================================================
       STORAGE HELPER
       ========================================================= */

    function getStorageKey(keyName) {

        return (
            STOCKFLOW_CONFIG.STORAGE[keyName] ||
            ""
        );
    }


    /* =========================================================
       OTP SETTINGS HELPER
       ========================================================= */

    function getOtpSettings() {

        return {

            length:
                Number(
                    STOCKFLOW_CONFIG.AUTH.OTP_LENGTH
                ),

            expirationMinutes:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .OTP_EXPIRATION_MINUTES
                ),

            resendCooldownSeconds:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .OTP_RESEND_COOLDOWN_SECONDS
                ),

            maxAttempts:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .MAX_OTP_ATTEMPTS
                ),

            lockMinutes:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .OTP_LOCK_MINUTES
                ),

            demoAutoFill:
                Boolean(
                    STOCKFLOW_CONFIG.AUTH
                        .DEMO_AUTO_FILL
                ),

            demoAutoFillDelayMin:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .DEMO_AUTO_FILL_DELAY_MIN
                ),

            demoAutoFillDelayMax:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .DEMO_AUTO_FILL_DELAY_MAX
                )
        };
    }


    /* =========================================================
       RANDOM DEMO DELAY HELPER
       ========================================================= */

    function getDemoAutoFillDelay() {

        const min =
            Number(
                STOCKFLOW_CONFIG.AUTH
                    .DEMO_AUTO_FILL_DELAY_MIN
            );

        const max =
            Number(
                STOCKFLOW_CONFIG.AUTH
                    .DEMO_AUTO_FILL_DELAY_MAX
            );

        if (max <= min) {
            return min;
        }

        return Math.floor(
            Math.random() *
            (max - min + 1)
        ) + min;
    }


    /* =========================================================
       GLOBAL EXPORTS
       ========================================================= */

    /*
     * Main configuration object.
     */
    window.STOCKFLOW_CONFIG =
        STOCKFLOW_CONFIG;


    /*
     * Backward-compatible configuration alias.
     */
    window.CONFIG =
        STOCKFLOW_CONFIG;


    /*
     * Helper API.
     */
    window.StockFlowConfig = {

        config:
            STOCKFLOW_CONFIG,

        getApiUrl:
            getApiUrl,

        getFirebaseUrl:
            getFirebaseUrl,

        getRoute:
            getRoute,

        getStorageKey:
            getStorageKey,

        getOtpSettings:
            getOtpSettings,

        getDemoAutoFillDelay:
            getDemoAutoFillDelay,

        validate:
            validateConfig,

        isDemoMode:
            isDemoMode,

        isProduction:
            isProduction,

        isDebug:
            isDebug
    };


    /* =========================================================
       BACKWARD-COMPATIBILITY GLOBALS
       ========================================================= */

    /*
     * Some older JavaScript files may look for these
     * properties directly on CONFIG.
     *
     * Keep them available while we update the other files.
     */

    if (
        typeof STOCKFLOW_CONFIG.API_TIMEOUT ===
        "undefined"
    ) {
        STOCKFLOW_CONFIG.API_TIMEOUT =
            STOCKFLOW_CONFIG.API.TIMEOUT;
    }


    if (
        typeof STOCKFLOW_CONFIG.API_RETRY_COUNT ===
        "undefined"
    ) {
        STOCKFLOW_CONFIG.API_RETRY_COUNT =
            STOCKFLOW_CONFIG.API.RETRY_COUNT;
    }


    if (
        typeof STOCKFLOW_CONFIG.API_RETRY_DELAY ===
        "undefined"
    ) {
        STOCKFLOW_CONFIG.API_RETRY_DELAY =
            STOCKFLOW_CONFIG.API.RETRY_DELAY;
    }


    /* =========================================================
       VALIDATE CONFIGURATION
       ========================================================= */

    const valid =
        validateConfig();


    /* =========================================================
       DEBUG INFORMATION
       ========================================================= */

    if (
        valid &&
        STOCKFLOW_CONFIG.DEBUG
    ) {

        console.log(
            "=========================================="
        );

        console.log(
            "STOCKFLOW CONFIGURATION"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "App:",
            STOCKFLOW_CONFIG.APP_NAME
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
            "API:",
            STOCKFLOW_CONFIG.API_URL
        );

        console.log(
            "Firebase:",
            STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
        );

        console.log(
            "OTP Length:",
            STOCKFLOW_CONFIG.AUTH.OTP_LENGTH
        );

        console.log(
            "OTP Expiration:",
            STOCKFLOW_CONFIG.AUTH
                .OTP_EXPIRATION_MINUTES +
            " minutes"
        );

        console.log(
            "OTP Resend Cooldown:",
            STOCKFLOW_CONFIG.AUTH
                .OTP_RESEND_COOLDOWN_SECONDS +
            " seconds"
        );

        console.log(
            "OTP Max Attempts:",
            STOCKFLOW_CONFIG.AUTH
                .MAX_OTP_ATTEMPTS
        );

        console.log(
            "OTP Lock:",
            STOCKFLOW_CONFIG.AUTH
                .OTP_LOCK_MINUTES +
            " minutes"
        );

        console.log(
            "Demo Auto Fill:",
            STOCKFLOW_CONFIG.AUTH
                .DEMO_AUTO_FILL
        );

        console.log(
            "Demo Auto Fill Delay:",
            STOCKFLOW_CONFIG.AUTH
                .DEMO_AUTO_FILL_DELAY_MIN +
            "ms - " +
            STOCKFLOW_CONFIG.AUTH
                .DEMO_AUTO_FILL_DELAY_MAX +
            "ms"
        );

        console.log(
            "Recovery Route:",
            STOCKFLOW_CONFIG.ROUTES.RECOVERY
        );

        console.log(
            "=========================================="
        );
    }

})();
