/* =========================================================
   STOCKFLOW — SYSTEM CONFIGURATION
   File: config.js

   Purpose:
   - Central configuration for the entire STOCKFLOW system
   - Google Apps Script API
   - Firebase configuration
   - Application routes
   - Authentication settings
   - Session settings
   - Inventory settings
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

        /*
           Current project is a midterm/demo system.

           IMPORTANT:
           This does NOT mean the application is insecure by
           design. It means the OTP delivery is simulated.

           The backend still generates the authoritative OTP
           and stores it in Google Sheets + Firebase.
        */
        ENVIRONMENT:
            "development",

        DEMO_MODE:
            true,


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
           FIREBASE REALTIME DATABASE
           
           IMPORTANT:
           The browser does NOT directly write authentication
           or OTP information to Firebase.

           Google Apps Script is the authoritative backend.

           Apps Script will synchronize required data to
           Firebase using the Firebase REST API.
           ----------------------------------------------------- */

        FIREBASE: {

            DATABASE_URL:
                "https://midtermexamproject-default-rtdb.firebaseio.com/",

            /*
               Optional Firebase REST authentication token.

               Leave empty for now if your Firebase rules permit
               the Apps Script backend to perform the required
               operations.

               For a more secure production deployment, this
               should be handled through backend credentials.
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
               OTP STORAGE KEYS
               ------------------------------------------------- */

            OTP_EMAIL_KEY:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE_KEY:
                "STOCKFLOW_OTP_PHONE",

            OTP_UID_KEY:
                "STOCKFLOW_OTP_UID",

            OTP_CHANNEL_KEY:
                "STOCKFLOW_OTP_CHANNEL",

            OTP_IDENTITY_KEY:
                "STOCKFLOW_OTP_IDENTITY",


            /* -------------------------------------------------
               REDIRECT
               ------------------------------------------------- */

            REDIRECT_KEY:
                "STOCKFLOW_REDIRECT_AFTER_LOGIN",


            /* -------------------------------------------------
               OTP
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

            /*
               In DEMO_MODE, the backend may return the
               server-generated OTP to the frontend.

               otp.js will use that value to automatically
               populate the six OTP boxes after a short delay.

               The frontend does NOT generate the authoritative
               OTP.
            */

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

            /*
               text/plain prevents unnecessary CORS preflight
               requests when communicating with Google Apps
               Script Web Apps.
            */

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

            /*
               Canonical OTP verification page.
            */

            VERIFY:
                "verify.html",

            /*
               Kept for compatibility with older links.
               verify-otp.html can redirect to verify.html.
            */

            OTP:
                "verify.html",

            /*
               Canonical forgot-password page.
            */

            FORGOT_PASSWORD:
                "forgot-password.html",

            /*
               Legacy filename compatibility.
            */

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
           INVENTORY CONFIGURATION
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

            OTP_EMAIL:
                "STOCKFLOW_OTP_EMAIL",

            OTP_PHONE:
                "STOCKFLOW_OTP_PHONE",

            OTP_UID:
                "STOCKFLOW_OTP_UID",

            OTP_CHANNEL:
                "STOCKFLOW_OTP_CHANNEL",

            OTP_IDENTITY:
                "STOCKFLOW_OTP_IDENTITY",

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

            /*
               Legacy compatibility page.
            */

            "verify-otp.html",

            "forgot-password.html",

            /*
               Legacy compatibility page.
            */

            "forgotpassword.html"
        ],


        /* =====================================================
           DEBUGGING
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
           API URL
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           GOOGLE SHEET
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

        if (
            STOCKFLOW_CONFIG.AUTH.OTP_LENGTH !== 6
        ) {

            errors.push(
                "OTP length must be 6 digits."
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
           ERRORS
           ----------------------------------------------------- */

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

        return (
            STOCKFLOW_CONFIG.API_URL
        );
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


        return (
            STOCKFLOW_CONFIG.ROUTES[
                routeName
            ]
        );
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
       ENVIRONMENT HELPERS
       ========================================================= */

    function isProduction() {

        return (
            STOCKFLOW_CONFIG
                .ENVIRONMENT ===
            "production"
        );
    }


    function isDemoMode() {

        return (
            STOCKFLOW_CONFIG
                .DEMO_MODE === true
        );
    }


    function isDebug() {

        return (
            STOCKFLOW_CONFIG
                .DEBUG === true
        );
    }


    /* =========================================================
       GLOBAL CONFIG OBJECT
       ========================================================= */

    window.STOCKFLOW_CONFIG =
        STOCKFLOW_CONFIG;


    /* =========================================================
       BACKWARD COMPATIBILITY
       ========================================================= */

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
       VALIDATE WHEN LOADED
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
    }


})();
