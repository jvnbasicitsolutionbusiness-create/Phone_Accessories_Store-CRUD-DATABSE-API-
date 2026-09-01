/* =========================================================
   CONFIG.JS
   BRSPWA&A — CENTRAL SYSTEM CONFIGURATION

   IMPORTANT:
   - Do NOT place passwords, private API keys, or secrets here.
   - Public frontend configuration only.
   - Backend credentials must remain inside the backend/server.
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       ENVIRONMENT
       ========================================================= */

    const ENVIRONMENT = "production";

    /*
     * Change only when necessary:
     *
     * development
     * testing
     * production
     */
    const IS_PRODUCTION =
        ENVIRONMENT === "production";


    /* =========================================================
       BACKEND / API
       ========================================================= */

    /*
     * Use your deployed backend/API endpoint here.
     *
     * Example:
     *
     * const API_BASE_URL =
     *     "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
     *
     * DO NOT put private credentials here.
     */

    const API_BASE_URL =
        "YOUR_DEPLOYED_API_URL";


    /* =========================================================
       APPLICATION INFORMATION
       ========================================================= */

    const APP_NAME =
        "PHONE ACCESSORIES INVENTORY";

    const APP_SHORT_NAME =
        "STOCKFLOW";

    const APP_VERSION =
        "2.0.0";

    const APP_ENVIRONMENT =
        ENVIRONMENT;


    /* =========================================================
       PAGE ROUTES
       ========================================================= */

    const ROUTES = {

        login:
            "login.html",

        register:
            "register.html",

        verify:
            "verify.html",

        dashboard:
            "dashboard.html",

        serviceRequests:
            "service-requests.html",

        appointments:
            "appointments.html",

        complaints:
            "complaints.html",

        announcements:
            "announcements.html",

        profile:
            "profile.html",

        notifications:
            "notifications.html"
    };


    /* =========================================================
       API ENDPOINT CONFIGURATION
       ========================================================= */

    const API_ENDPOINTS = {

        /*
         * Authentication
         */
        login:
            "",

        verifyOTP:
            "",

        resendOTP:
            "",

        registerResident:
            "",

        logout:
            "",

        verifySession:
            "",


        /*
         * Resident
         */
        residentProfile:
            "",

        updateResidentProfile:
            "",


        /*
         * Dashboard
         */
        dashboard:
            "",


        /*
         * Service Requests
         */
        serviceRequests:
            "",

        serviceRequest:
            "",

        createServiceRequest:
            "",

        cancelServiceRequest:
            "",


        /*
         * Appointments
         */
        appointments:
            "",

        appointment:
            "",

        availableSlots:
            "",

        createAppointment:
            "",

        cancelAppointment:
            "",


        /*
         * Complaints
         */
        complaints:
            "",

        complaint:
            "",

        createComplaint:
            "",


        /*
         * Announcements
         */
        announcements:
            "",

        announcement:
            "",


        /*
         * Notifications
         */
        notifications:
            "",

        markNotificationRead:
            "",

        sendNotification:
            "",


        /*
         * Activity
         */
        recentActivity:
            "",


        /*
         * Reports
         */
        residentReports:
            "",


        /*
         * Documents
         */
        uploadDocument:
            ""
    };


    /* =========================================================
       REQUEST SETTINGS
       ========================================================= */

    const REQUEST_CONFIG = {

        timeout:
            30000,

        retryAttempts:
            2,

        retryDelay:
            1000,

        credentials:
            "same-origin"
    };


    /* =========================================================
       AUTHENTICATION SETTINGS
       ========================================================= */

    const AUTH_CONFIG = {

        sessionStorageKey:
            "brsp_session",

        userStorageKey:
            "brsp_current_user",

        tokenStorageKey:
            "brsp_auth_token",

        roleStorageKey:
            "brsp_user_role",

        sessionDuration:
            24 * 60 * 60 * 1000
    };


    /* =========================================================
       OTP SETTINGS
       ========================================================= */

    const OTP_CONFIG = {

        enabled:
            true,

        length:
            6,

        expirationMinutes:
            5,

        resendCooldownSeconds:
            60,

        maxAttempts:
            5,

        /*
         * The frontend does NOT generate or deliver
         * authentication codes.
         *
         * The backend is responsible for:
         *
         * Gmail / Email delivery
         * SMS delivery
         * OTP validation
         * OTP expiration
         * Attempt limits
         */
        deliveryChannels: [
            "email",
            "sms"
        ]
    };


    /* =========================================================
       NOTIFICATION SETTINGS
       ========================================================= */

    const NOTIFICATION_CONFIG = {

        enabled:
            true,

        channels: {
            email: true,
            sms: true,
            inApp: true
        },

        /*
         * Notification sending must be handled
         * by the backend/API.
         */
        backendManaged:
            true
    };


    /* =========================================================
       MODULE SETTINGS
       ========================================================= */

    const MODULE_CONFIG = {

        serviceRequests: {
            enabled: true,
            route: ROUTES.serviceRequests
        },

        appointments: {
            enabled: true,
            route: ROUTES.appointments
        },

        complaints: {
            enabled: true,
            route: ROUTES.complaints
        },

        announcements: {
            enabled: true,
            route: ROUTES.announcements
        },

        notifications: {
            enabled: true,
            route: ROUTES.notifications
        },

        reports: {
            enabled: true
        }
    };


    /* =========================================================
       DASHBOARD SETTINGS
       ========================================================= */

    const DASHBOARD_CONFIG = {

        refreshInterval:
            60000,

        statistics: {
            serviceRequests: true,
            appointments: true,
            complaints: true,
            announcements: true
        },

        recentActivity:
            true,

        announcementsPreview:
            true
    };


    /* =========================================================
       FILE UPLOAD SETTINGS
       ========================================================= */

    const FILE_CONFIG = {

        maxFileSizeMB:
            10,

        maxFileSizeBytes:
            10 * 1024 * 1024,

        allowedDocumentTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ]
    };


    /* =========================================================
       SYSTEM STATUS
       ========================================================= */

    const SYSTEM_CONFIG = {

        maintenanceMode:
            false,

        showDebugLogs:
            !IS_PRODUCTION,

        timezone:
            "Asia/Manila",

        locale:
            "en-PH",

        currency:
            "PHP",

        dateFormat:
            "MMMM DD, YYYY",

        timeFormat:
            "hh:mm A"
    };


    /* =========================================================
       HELPER FUNCTIONS
       ========================================================= */

    function getApiUrl() {

        return API_BASE_URL
            .replace(/\/+$/, "");
    }


    function getEndpoint(name) {

        if (
            !API_ENDPOINTS ||
            !Object.prototype.hasOwnProperty.call(
                API_ENDPOINTS,
                name
            )
        ) {
            return "";
        }

        return API_ENDPOINTS[name];
    }


    function buildApiUrl(endpoint = "") {

        const base =
            getApiUrl();

        if (!endpoint) {
            return base;
        }

        /*
         * Support absolute URLs.
         */
        if (
            endpoint.startsWith("http://") ||
            endpoint.startsWith("https://")
        ) {
            return endpoint;
        }

        const cleanEndpoint =
            endpoint.replace(/^\/+/, "");

        return `${base}/${cleanEndpoint}`;
    }


    function isConfigured() {

        return Boolean(
            API_BASE_URL &&
            API_BASE_URL !==
                "YOUR_DEPLOYED_API_URL"
        );
    }


    function getEnvironment() {

        return APP_ENVIRONMENT;
    }


    function isProduction() {

        return IS_PRODUCTION;
    }


    /* =========================================================
       PUBLIC CONFIGURATION
       ========================================================= */

    window.APP_CONFIG = {

        /* Application */
        APP_NAME,
        APP_SHORT_NAME,
        APP_VERSION,
        ENVIRONMENT: APP_ENVIRONMENT,

        /* API */
        API_URL: API_BASE_URL,
        API_BASE_URL,

        API_ENDPOINTS,

        /* Routes */
        ROUTES,

        /* Request */
        REQUEST: REQUEST_CONFIG,

        /* Authentication */
        AUTH: AUTH_CONFIG,

        /* OTP */
        OTP: OTP_CONFIG,

        /* Notifications */
        NOTIFICATIONS:
            NOTIFICATION_CONFIG,

        /* Modules */
        MODULES:
            MODULE_CONFIG,

        /* Dashboard */
        DASHBOARD:
            DASHBOARD_CONFIG,

        /* Files */
        FILES:
            FILE_CONFIG,

        /* System */
        SYSTEM:
            SYSTEM_CONFIG,

        /* Helpers */
        getApiUrl,
        getEndpoint,
        buildApiUrl,
        isConfigured,
        getEnvironment,
        isProduction
    };


    /* =========================================================
       BACKWARD COMPATIBILITY
       =========================================================

       API.js can read either APP_CONFIG or CONFIG.
       Keeping CONFIG available also prevents older modules
       from breaking while the system is being updated.
       */

    window.CONFIG = window.APP_CONFIG;


    /* =========================================================
       DEVELOPMENT WARNING
       ========================================================= */

    if (
        !isConfigured() &&
        !IS_PRODUCTION
    ) {

        console.warn(
            "BRSPWA&A: API_BASE_URL has not been configured."
        );
    }


    /* =========================================================
       PRODUCTION WARNING
       ========================================================= */

    if (
        IS_PRODUCTION &&
        !isConfigured()
    ) {

        console.error(
            "BRSPWA&A: Production API URL is not configured. " +
            "Update API_BASE_URL in config.js."
        );
    }


    /* =========================================================
       SYSTEM INITIALIZATION LOG
       ========================================================= */

    if (
        SYSTEM_CONFIG.showDebugLogs
    ) {

        console.info(
            `${APP_SHORT_NAME} v${APP_VERSION} initialized.`,
            {
                environment:
                    APP_ENVIRONMENT,

                apiConfigured:
                    isConfigured(),

                timezone:
                    SYSTEM_CONFIG.timezone
            }
        );
    }

})();
