/* =========================================================
   STOCKFLOW — SYSTEM CONFIGURATION
   File: config.js
   Purpose:
   - Central configuration for the entire STOCKFLOW system
   - Google Apps Script API
   - Firebase configuration
   - Application routes
   - Session settings
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

        APP_NAME: "STOCKFLOW",

        APP_FULL_NAME:
            "Phone Accessories Inventory Management System",

        VERSION: "1.0.0",

        ENVIRONMENT: "production",


        /* -----------------------------------------------------
           GOOGLE APPS SCRIPT BACKEND
           ----------------------------------------------------- */

        API_URL:
            "https://script.google.com/macros/s/AKfycbytfBA-SJDFkD8QlzHqpl65Lqg4CXkLfAZV2vec1Y36RcuIKbcwOER8jgDhIDeHtlgefw/exec",


        /* -----------------------------------------------------
           GOOGLE SHEETS
           ----------------------------------------------------- */

        GOOGLE_SHEET_ID:
            "1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY",


        /* -----------------------------------------------------
           FIREBASE
           
           IMPORTANT:
           Firebase is NOT accessed directly by the browser
           for STOCKFLOW database operations.

           Google Apps Script remains the authoritative
           backend/API layer.
           ----------------------------------------------------- */

        FIREBASE: {
            DATABASE_URL:
                "https://midtermexamproject-default-rtdb.firebaseio.com/"
        },


        /* -----------------------------------------------------
           AUTHENTICATION
           ----------------------------------------------------- */

        AUTH: {

            SESSION_KEY:
                "STOCKFLOW_TOKEN",

            USER_KEY:
                "STOCKFLOW_USER",

            OTP_EMAIL_KEY:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE_KEY:
                "STOCKFLOW_OTP_PHONE",

            OTP_UID_KEY:
                "STOCKFLOW_OTP_UID",

            OTP_CHANNEL_KEY:
                "STOCKFLOW_OTP_CHANNEL",

            REDIRECT_KEY:
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",

            OTP_LENGTH: 6,

            OTP_EXPIRATION_MINUTES: 10,

            OTP_RESEND_COOLDOWN_SECONDS: 60,

            MAX_OTP_ATTEMPTS: 4
        },


        /* -----------------------------------------------------
           API REQUEST CONFIGURATION
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           APPLICATION ROUTES
           ----------------------------------------------------- */

        ROUTES: {

            HOME:
                "index.html",

            LOGIN:
                "auth.html#login",

            REGISTER:
                "auth.html#register",

            AUTH:
                "auth.html",

            OTP:
                "verify-otp.html",

            VERIFY:
                "verify.html",

            FORGOT_PASSWORD:
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


        /* -----------------------------------------------------
           INVENTORY CONFIGURATION
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           USER ROLES
           ----------------------------------------------------- */

        ROLES: {

            ADMIN:
                "Admin",

            EMPLOYEE:
                "Employee"
        },


        /* -----------------------------------------------------
           ACCOUNT STATUS
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           TRANSACTION TYPES
           ----------------------------------------------------- */

        TRANSACTION_TYPES: {

            STOCK_IN:
                "STOCK-IN",

            STOCK_OUT:
                "STOCK-OUT"
        },


        /* -----------------------------------------------------
           PRODUCT STATUS
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           STORAGE
           ----------------------------------------------------- */

        STORAGE: {

            TOKEN:
                "STOCKFLOW_TOKEN",

            USER:
                "STOCKFLOW_USER",

            OTP_EMAIL:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE:
                "STOCKFLOW_OTP_PHONE",

            OTP_UID:
                "STOCKFLOW_OTP_UID",

            OTP_CHANNEL:
                "STOCKFLOW_OTP_CHANNEL",

            REDIRECT_AFTER_LOGIN:
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",

            REORDER_LEVEL:
                "STOCKFLOW_REORDER_LEVEL"
        },


        /* -----------------------------------------------------
           PUBLIC PAGES
           ----------------------------------------------------- */

        PUBLIC_PAGES: [
            "",
            "index.html",
            "auth.html",
            "register.html",
            "verify.html",
            "verify-otp.html",
            "forgotpassword.html"
        ],


        /* -----------------------------------------------------
           DEBUGGING
           ----------------------------------------------------- */

        DEBUG:
            false
    };


    /* =========================================================
       CONFIGURATION VALIDATION
       ========================================================= */

    function validateConfig() {

        const errors = [];

        if (
            !STOCKFLOW_CONFIG.API_URL ||
            STOCKFLOW_CONFIG.API_URL.indexOf(
                "/exec"
            ) === -1
        ) {
            errors.push(
                "Invalid Google Apps Script API URL."
            );
        }

        if (
            !STOCKFLOW_CONFIG.GOOGLE_SHEET_ID
        ) {
            errors.push(
                "Google Sheet ID is missing."
            );
        }

        if (
            !STOCKFLOW_CONFIG.FIREBASE.DATABASE_URL
        ) {
            errors.push(
                "Firebase Database URL is missing."
            );
        }

        if (
            errors.length > 0
        ) {

            console.error(
                "STOCKFLOW CONFIGURATION ERROR:"
            );

            errors.forEach(
                function (error) {
                    console.error(
                        "• " + error
                    );
                }
            );

            return false;
        }

        return true;
    }


    /* =========================================================
       URL HELPERS
       ========================================================= */

    function getApiUrl() {
        return STOCKFLOW_CONFIG.API_URL;
    }

    function getRoute(routeName) {

        if (
            !routeName ||
            !STOCKFLOW_CONFIG.ROUTES[
                routeName
            ]
        ) {
            return (
                STOCKFLOW_CONFIG.ROUTES
                    .DASHBOARD
            );
        }

        return STOCKFLOW_CONFIG.ROUTES[
            routeName
        ];
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

    function isDebug() {
        return (
            STOCKFLOW_CONFIG.DEBUG === true
        );
    }


    /* =========================================================
       GLOBAL CONFIG OBJECTS
       ========================================================= */

    window.STOCKFLOW_CONFIG =
        STOCKFLOW_CONFIG;

    /*
     * Backward-compatible aliases.
     */

    window.CONFIG =
        STOCKFLOW_CONFIG;

    window.StockFlowConfig = {

        config:
            STOCKFLOW_CONFIG,

        getApiUrl:
            getApiUrl,

        getRoute:
            getRoute,

        validate:
            validateConfig,

        isProduction:
            isProduction,

        isDebug:
            isDebug
    };


    /* =========================================================
       VALIDATE WHEN LOADED
       ========================================================= */

    validateConfig();


})();
