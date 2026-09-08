/* =========================================================
   STOCKFLOW — SYSTEM CONFIGURATION
   File: config.js

   PURPOSE:
   Central configuration for the STOCKFLOW system.

   RESPONSIBILITIES:
   - Google Apps Script API
   - Firebase
   - Authentication
   - OTP
   - Routes
   - Inventory
   - Storage
   ========================================================= */

(function (window) {

    "use strict";


    /* =========================================================
       CORE CONFIGURATION
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
         * Midterm / demonstration mode.
         *
         * The backend remains responsible for generating
         * the authoritative OTP.
         *
         * The frontend may receive the generated OTP only
         * for this demonstration flow.
         */
        DEMO_MODE:
            true,

        DEBUG:
            true,


        /* =====================================================
           GOOGLE APPS SCRIPT
           ===================================================== */

        /*
         * IMPORTANT:
         * This MUST be a plain URL.
         *
         * Do NOT place:
         * [URL](URL)
         *
         * around it.
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
             * Leave empty for the current midterm setup
             * if Firebase rules permit backend REST access.
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


            /* -------------------------------------------------
               OTP STORAGE
               ------------------------------------------------- */

            OTP_UID_KEY:
                "STOCKFLOW_OTP_UID",

            OTP_IDENTITY_KEY:
                "STOCKFLOW_OTP_IDENTITY",

            OTP_EMAIL_KEY:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE_KEY:
                "STOCKFLOW_OTP_PHONE",

            OTP_CHANNEL_KEY:
                "STOCKFLOW_OTP_CHANNEL",


            /* -------------------------------------------------
               LOGIN REDIRECT
               ------------------------------------------------- */

            REDIRECT_KEY:
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",


            /* -------------------------------------------------
               OTP RULES
               ------------------------------------------------- */

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
               DEMO OTP
               ------------------------------------------------- */

            DEMO_AUTO_FILL:
                true,

            DEMO_AUTO_FILL_DELAY_MIN:
                3000,

            DEMO_AUTO_FILL_DELAY_MAX:
                5000
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

            HOME:
                "index.html",

            LOGIN:
                "auth.html#login",

            REGISTER:
                "auth.html#register",

            AUTH:
                "auth.html",

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

            OTP_EMAIL:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE:
                "STOCKFLOW_OTP_PHONE",

            OTP_CHANNEL:
                "STOCKFLOW_OTP_CHANNEL",

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
        ]
    };


    /* =========================================================
       VALIDATION
       ========================================================= */

    function validateConfig() {

        const errors = [];


        /* -----------------------------------------------------
           API
           ----------------------------------------------------- */

        if (
            typeof STOCKFLOW_CONFIG.API_URL !== "string" ||
            !STOCKFLOW_CONFIG.API_URL.trim()
        ) {

            errors.push(
                "Google Apps Script API URL is missing."
            );

        } else if (
            !STOCKFLOW_CONFIG.API_URL.includes(
                "script.google.com/macros/s/"
            ) ||
            !STOCKFLOW_CONFIG.API_URL.endsWith(
                "/exec"
            )
        ) {

            errors.push(
                "Google Apps Script API URL is invalid."
            );
        }


        /* -----------------------------------------------------
           GOOGLE SHEETS
           ----------------------------------------------------- */

        if (
            !STOCKFLOW_CONFIG.GOOGLE_SHEET_ID
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
        }


        /* -----------------------------------------------------
           OTP
           ----------------------------------------------------- */

        const auth =
            STOCKFLOW_CONFIG.AUTH;

        if (
            auth.OTP_LENGTH !== 6
        ) {

            errors.push(
                "OTP length must be exactly 6."
            );
        }

        if (
            auth.MAX_OTP_ATTEMPTS < 1
        ) {

            errors.push(
                "OTP attempt limit must be at least 1."
            );
        }

        if (
            auth.OTP_EXPIRATION_MINUTES < 1
        ) {

            errors.push(
                "OTP expiration must be at least 1 minute."
            );
        }


        /* -----------------------------------------------------
           API TIMEOUT
           ----------------------------------------------------- */

        if (
            STOCKFLOW_CONFIG.API.TIMEOUT < 5000
        ) {

            errors.push(
                "API timeout is too short."
            );
        }


        /* -----------------------------------------------------
           RESULT
           ----------------------------------------------------- */

        if (errors.length) {

            console.error(
                "STOCKFLOW CONFIGURATION ERROR:"
            );

            errors.forEach(
                error => console.error(
                    "• " + error
                )
            );

            return false;
        }

        return true;
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function getApiUrl() {

        return STOCKFLOW_CONFIG.API_URL;
    }


    function getFirebaseUrl() {

        return STOCKFLOW_CONFIG
            .FIREBASE
            .DATABASE_URL;
    }


    function getRoute(routeName) {

        if (
            routeName &&
            STOCKFLOW_CONFIG.ROUTES[routeName]
        ) {

            return STOCKFLOW_CONFIG
                .ROUTES[routeName];
        }

        return STOCKFLOW_CONFIG
            .ROUTES
            .DASHBOARD;
    }


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
       GLOBAL EXPORT
       ========================================================= */

    window.STOCKFLOW_CONFIG =
        STOCKFLOW_CONFIG;

    /*
     * Backward compatibility.
     */
    window.CONFIG =
        STOCKFLOW_CONFIG;


    /* =========================================================
       HELPER API
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
       INITIAL VALIDATION
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
            "API:",
            STOCKFLOW_CONFIG.API_URL
        );

        console.log(
            "Firebase:",
            STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
        );
    }


})(window);
