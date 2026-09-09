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
         * - Backend generates the real OTP.
         * - OTP is stored in Google Sheets.
         * - OTP is synchronized with Firebase.
         * - Backend may return the generated OTP to the
         *   frontend for the school-project auto-fill flow.
         *
         * IMPORTANT:
         * The frontend NEVER generates the OTP.
         */
        DEMO_MODE: true,


        /* =====================================================
           GOOGLE APPS SCRIPT WEB APP
           ===================================================== */

        /*
         * CURRENT WORKING DEPLOYMENT
         */
        API_URL:
            "https://script.google.com/macros/s/AKfycbytfBA-SJDFkD8QlzHqpl65Lqg4CXkLfAZV2vec1Y36RcuIKbcwOER8jgDhIDeHtlgefw/exec",


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
             * Leave empty for the current midterm/demo setup.
             *
             * Production should use proper Firebase
             * Authentication and Database Security Rules.
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
               OTP BACKEND RESPONSE STORAGE
               ----------------------------------------------- */

            /*
             * These keys are used by the frontend to temporarily
             * store the REAL OTP returned by Code.gs.
             *
             * The OTP is NOT generated here.
             */

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

            /*
             * Exactly six digits.
             */
            OTP_LENGTH: 6,

            /*
             * OTP remains valid for 10 minutes.
             */
            OTP_EXPIRATION_MINUTES: 10,

            /*
             * IMPORTANT:
             * Email and phone resend cooldowns use 120 seconds.
             *
             * Code.gs is also configured for 120 seconds.
             */
            OTP_RESEND_COOLDOWN_SECONDS: 120,

            /*
             * After 4 incorrect verification attempts,
             * verification is temporarily locked.
             */
            MAX_OTP_ATTEMPTS: 4,

            /*
             * Temporary verification lock duration.
             */
            OTP_LOCK_MINUTES: 30,


            /* -----------------------------------------------
               DEMO AUTO-FILL
               ----------------------------------------------- */

            /*
             * The backend returns the actual generated OTP
             * for this midterm/demo flow.
             *
             * otp.js receives that backend OTP and displays it
             * after a short delay.
             */
            DEMO_AUTO_FILL: true,

            /*
             * Minimum auto-display delay:
             * 3 seconds
             */
            DEMO_AUTO_FILL_DELAY_MIN: 3000,

            /*
             * Maximum auto-display delay:
             * 5 seconds
             */
            DEMO_AUTO_FILL_DELAY_MAX: 5000
        },


        /* =====================================================
           API SETTINGS
           ===================================================== */

        API: {

            METHOD: "POST",

            /*
             * text/plain prevents the browser from performing
             * the normal JSON CORS preflight against Apps Script.
             */
            CONTENT_TYPE:
                "text/plain;charset=utf-8",

            /*
             * Maximum time to wait for Apps Script.
             */
            TIMEOUT: 30000,

            /*
             * Number of retry attempts for recoverable requests.
             */
            RETRY_COUNT: 1,

            /*
             * Delay before retrying.
             */
            RETRY_DELAY: 1000
        },


        /* =====================================================
           ROUTES
           ===================================================== */

        ROUTES: {

            /* -----------------------------------------------
               MAIN PAGES
               ----------------------------------------------- */

            HOME:
                "index.html",

            LOGIN:
                "auth.html#login",

            REGISTER:
                "auth.html#register",

            AUTH:
                "auth.html",


            /* -----------------------------------------------
               OTP VERIFICATION
               ----------------------------------------------- */

            /*
             * Main verification page.
             */
            VERIFY:
                "verify.html",

            /*
             * Backward-compatible OTP route.
             */
            OTP:
                "verify.html",


            /* -----------------------------------------------
               RECOVERY
               ----------------------------------------------- */

            RECOVERY:
                "recovery.html",

            FORGOT_PASSWORD:
                "forgot-password.html",

            /*
             * Legacy compatibility route.
             */
            FORGOT_PASSWORD_LEGACY:
                "forgotpassword.html",


            /* -----------------------------------------------
               DASHBOARD
               ----------------------------------------------- */

            DASHBOARD:
                "dashboard.html",

            INVENTORY_DASHBOARD:
                "inventory-dashboard.html",


            /* -----------------------------------------------
               INVENTORY MODULES
               ----------------------------------------------- */

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


            /* -----------------------------------------------
               USER MODULES
               ----------------------------------------------- */

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

            /*
             * Negative inventory is not permitted.
             */
            ALLOW_NEGATIVE_STOCK: false,

            CURRENCY: "PHP",

            CURRENCY_SYMBOL: "₱"
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
           GOOGLE SHEET ID
           ----------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.GOOGLE_SHEET_ID ||
            typeof STOCKFLOW_CONFIG.GOOGLE_SHEET_ID !== "string"
        ) {

            errors.push(
                "GOOGLE_SHEET_ID is missing."
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
            Number(
                STOCKFLOW_CONFIG.AUTH.OTP_LENGTH
            ) !== 6
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
                STOCKFLOW_CONFIG.AUTH
                    .OTP_EXPIRATION_MINUTES
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
                STOCKFLOW_CONFIG.AUTH
                    .OTP_RESEND_COOLDOWN_SECONDS
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
                STOCKFLOW_CONFIG.AUTH
                    .MAX_OTP_ATTEMPTS
            ) <= 0
        ) {

            errors.push(
                "MAX_OTP_ATTEMPTS must be greater than zero."
            );
        }


        /* -----------------------------------------------
           OTP LOCK
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH
                    .OTP_LOCK_MINUTES
            ) <= 0
        ) {

            errors.push(
                "OTP lock duration must be greater than zero."
            );
        }


        /* -----------------------------------------------
           DEMO AUTO-FILL MINIMUM DELAY
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH
                    .DEMO_AUTO_FILL_DELAY_MIN
            ) < 0
        ) {

            errors.push(
                "DEMO_AUTO_FILL_DELAY_MIN cannot be negative."
            );
        }


        /* -----------------------------------------------
           DEMO AUTO-FILL MAXIMUM DELAY
           ----------------------------------------------- */

        if (
            Number(
                STOCKFLOW_CONFIG.AUTH
                    .DEMO_AUTO_FILL_DELAY_MAX
            ) <
            Number(
                STOCKFLOW_CONFIG.AUTH
                    .DEMO_AUTO_FILL_DELAY_MIN
            )
        ) {

            errors.push(
                "DEMO_AUTO_FILL_DELAY_MAX must be greater than or equal to DEMO_AUTO_FILL_DELAY_MIN."
            );
        }


        /* -----------------------------------------------
           API SETTINGS
           ----------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.API ||
            STOCKFLOW_CONFIG.API.METHOD !== "POST"
        ) {

            errors.push(
                "API METHOD must be POST."
            );
        }


        if (
            !STOCKFLOW_CONFIG.API.CONTENT_TYPE
        ) {

            errors.push(
                "API CONTENT_TYPE is missing."
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

        return (
            STOCKFLOW_CONFIG
                .FIREBASE
                .DATABASE_URL
        );
    }


    /* =========================================================
       ROUTE HELPER
       ========================================================= */

    function getRoute(routeName) {

        if (
            !routeName ||
            !STOCKFLOW_CONFIG.ROUTES
        ) {

            return (
                STOCKFLOW_CONFIG
                    .ROUTES
                    .DASHBOARD
            );
        }

        return (
            STOCKFLOW_CONFIG
                .ROUTES[routeName] ||
            STOCKFLOW_CONFIG
                .ROUTES
                .DASHBOARD
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
       STORAGE KEY HELPER
       ========================================================= */

    function getStorageKey(keyName) {

        return (
            STOCKFLOW_CONFIG
                .STORAGE[keyName] ||
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
                    STOCKFLOW_CONFIG.AUTH
                        .OTP_LENGTH
                ),

            expirationMinutes:
                Number(
                    STOCKFLOW_CONFIG.AUTH
                        .OTP_EXPIRATION_MINUTES
                ),

            /*
             * 120 seconds.
             */
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
       AUTO-FILL DISPLAY DELAY
       ========================================================= */

    /*
     * IMPORTANT:
     *
     * This function does NOT generate an OTP.
     *
     * It only selects a visual delay between 3 and 5 seconds
     * before otp.js displays the OTP returned by Code.gs.
     *
     * The actual OTP is generated ONLY by the Apps Script
     * backend.
     */
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
       GLOBAL CONFIGURATION EXPORT
       ========================================================= */

    /*
     * Main configuration object.
     */
    window.STOCKFLOW_CONFIG =
        STOCKFLOW_CONFIG;


    /*
     * Backward-compatible alias.
     */
    window.CONFIG =
        STOCKFLOW_CONFIG;


    /*
     * Public configuration helper API.
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
     * Older JavaScript files may directly reference:
     *
     * CONFIG.API_TIMEOUT
     * CONFIG.API_RETRY_COUNT
     * CONFIG.API_RETRY_DELAY
     *
     * Keep these aliases available.
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
            "Google Sheet:",
            STOCKFLOW_CONFIG.GOOGLE_SHEET_ID
        );

        console.log(
            "Firebase:",
            STOCKFLOW_CONFIG
                .FIREBASE
                .DATABASE_URL
        );

        console.log(
            "OTP Length:",
            STOCKFLOW_CONFIG.AUTH
                .OTP_LENGTH
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
            STOCKFLOW_CONFIG.ROUTES
                .RECOVERY
        );

        console.log(
            "=========================================="
        );
    }

})();
