/* =========================================================
   API.JS
   BRSPWA&A — Central API / Backend Communication Layer

   Purpose:
   - Centralize all frontend ↔ backend requests
   - Work with config.js
   - Support Google Apps Script / deployed API
   - Support REST-style APIs when configured
   - Keep authentication/session headers centralized
   - Normalize API responses
   - Prevent modules from directly handling backend URLs

   IMPORTANT:
   Actual SMS/Gmail delivery must be performed by the backend
   (e.g. code.gs / server API). This file only communicates with
   those backend functions/endpoints.
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const DEFAULT_TIMEOUT = 30000;

    const API_CONFIG = {

        /*
         * API URL is read from config.js whenever available.
         *
         * Supported examples:
         * window.APP_CONFIG.API_URL
         * window.APP_CONFIG.API_BASE_URL
         * window.CONFIG.API_URL
         * window.CONFIG.API_BASE_URL
         * window.API_URL
         */
        getBaseUrl() {

            const config =
                window.APP_CONFIG ||
                window.CONFIG ||
                window.AppConfig ||
                {};

            return (
                config.API_URL ||
                config.API_BASE_URL ||
                config.BACKEND_URL ||
                window.API_URL ||
                ""
            ).trim();
        },

        timeout: DEFAULT_TIMEOUT
    };


    /* =========================================================
       GENERAL HELPERS
       ========================================================= */

    function getBaseUrl() {
        return API_CONFIG.getBaseUrl();
    }


    function getToken() {

        try {

            if (
                window.Auth &&
                typeof window.Auth.getToken === "function"
            ) {
                return window.Auth.getToken();
            }

            return (
                localStorage.getItem("brsp_auth_token") ||
                localStorage.getItem("authToken") ||
                localStorage.getItem("token") ||
                ""
            );

        } catch (error) {
            return "";
        }
    }


    function getCurrentUser() {

        try {

            if (
                window.Auth &&
                typeof window.Auth.getCurrentUser === "function"
            ) {
                return window.Auth.getCurrentUser();
            }

            const stored =
                localStorage.getItem(
                    "brsp_current_user"
                );

            return stored
                ? JSON.parse(stored)
                : null;

        } catch (error) {
            return null;
        }
    }


    function getUserId() {

        const user = getCurrentUser();

        if (!user) {
            return "";
        }

        return (
            user.id ||
            user.userId ||
            user.accountId ||
            user.residentId ||
            user.resident_id ||
            ""
        );
    }


    function createHeaders(extraHeaders = {}) {

        const headers = {
            Accept: "application/json",
            "Content-Type": "application/json"
        };

        const token = getToken();

        if (token) {
            headers.Authorization =
                `Bearer ${token}`;
        }

        return {
            ...headers,
            ...extraHeaders
        };
    }


    function buildUrl(endpoint) {

        if (!endpoint) {
            return getBaseUrl();
        }

        /*
         * If the endpoint is already an absolute URL,
         * do not prepend the configured API URL.
         */
        if (
            endpoint.startsWith("http://") ||
            endpoint.startsWith("https://")
        ) {
            return endpoint;
        }

        const baseUrl =
            getBaseUrl().replace(/\/+$/, "");

        const path =
            endpoint.replace(/^\/+/, "");

        if (!baseUrl) {
            return path;
        }

        return `${baseUrl}/${path}`;
    }


    function normalizeResponse(response) {

        if (!response) {
            return {
                success: false,
                message: "No response received from server.",
                data: null
            };
        }

        /*
         * Already normalized.
         */
        if (
            Object.prototype.hasOwnProperty.call(
                response,
                "success"
            )
        ) {
            return response;
        }

        /*
         * Common Apps Script response format.
         */
        if (
            Object.prototype.hasOwnProperty.call(
                response,
                "status"
            )
        ) {

            return {
                success:
                    response.status === "success" ||
                    response.status === true ||
                    response.status === 200,

                message:
                    response.message ||
                    "",

                data:
                    response.data ??
                    response.result ??
                    null,

                raw: response
            };
        }

        /*
         * If the backend directly returns an object,
         * consider it successful.
         */
        return {
            success: true,
            message: "",
            data: response,
            raw: response
        };
    }


    async function parseResponse(response) {

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";

        if (
            contentType.includes(
                "application/json"
            )
        ) {
            return response.json();
        }

        const text =
            await response.text();

        /*
         * Some Apps Script endpoints may return
         * JSON as text.
         */
        try {
            return JSON.parse(text);
        } catch (error) {
            return {
                success: response.ok,
                message: text,
                data: text
            };
        }
    }


    function createTimeoutSignal(timeout) {

        const controller =
            new AbortController();

        const timer =
            setTimeout(
                () => controller.abort(),
                timeout
            );

        return {
            signal: controller.signal,
            clear: () => clearTimeout(timer)
        };
    }


    /* =========================================================
       CORE REQUEST
       ========================================================= */

    async function request(
        endpoint,
        options = {}
    ) {

        const url =
            buildUrl(endpoint);

        if (!url) {

            throw new Error(
                "API URL is not configured. Check config.js."
            );
        }

        const method =
            (
                options.method ||
                "GET"
            ).toUpperCase();

        const timeout =
            options.timeout ||
            API_CONFIG.timeout;

        const timeoutController =
            createTimeoutSignal(timeout);

        const fetchOptions = {
            method,
            headers: createHeaders(
                options.headers || {}
            ),
            signal: timeoutController.signal
        };

        if (
            options.body !== undefined &&
            method !== "GET" &&
            method !== "HEAD"
        ) {

            fetchOptions.body =
                typeof options.body === "string"
                    ? options.body
                    : JSON.stringify(options.body);
        }

        try {

            const response =
                await fetch(
                    url,
                    fetchOptions
                );

            const parsed =
                await parseResponse(response);

            const normalized =
                normalizeResponse(parsed);

            if (!response.ok) {

                return {
                    ...normalized,
                    success: false,
                    httpStatus: response.status,
                    message:
                        normalized.message ||
                        `Request failed with HTTP ${response.status}.`
                };
            }

            return {
                ...normalized,
                httpStatus: response.status
            };

        } catch (error) {

            if (
                error &&
                error.name === "AbortError"
            ) {

                return {
                    success: false,
                    message:
                        "The request timed out. Please try again.",
                    error: "TIMEOUT"
                };
            }

            console.error(
                "API request error:",
                error
            );

            return {
                success: false,
                message:
                    error?.message ||
                    "Unable to connect to the server.",
                error: "NETWORK_ERROR"
            };

        } finally {

            timeoutController.clear();
        }
    }


    /* =========================================================
       GET
       ========================================================= */

    async function get(
        endpoint,
        params = {},
        options = {}
    ) {

        let url =
            buildUrl(endpoint);

        const searchParams =
            new URLSearchParams();

        Object.entries(params || {}).forEach(
            ([key, value]) => {

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ""
                ) {
                    searchParams.append(
                        key,
                        value
                    );
                }
            }
        );

        const query =
            searchParams.toString();

        if (query) {
            url +=
                (url.includes("?") ? "&" : "?") +
                query;
        }

        return request(
            url,
            {
                ...options,
                method: "GET"
            }
        );
    }


    /* =========================================================
       POST
       ========================================================= */

    async function post(
        endpoint,
        data = {},
        options = {}
    ) {

        return request(
            endpoint,
            {
                ...options,
                method: "POST",
                body: data
            }
        );
    }


    /* =========================================================
       PUT
       ========================================================= */

    async function put(
        endpoint,
        data = {},
        options = {}
    ) {

        return request(
            endpoint,
            {
                ...options,
                method: "PUT",
                body: data
            }
        );
    }


    /* =========================================================
       DELETE
       ========================================================= */

    async function remove(
        endpoint,
        data = {},
        options = {}
    ) {

        return request(
            endpoint,
            {
                ...options,
                method: "DELETE",
                body: data
            }
        );
    }


    /* =========================================================
       APPS SCRIPT COMPATIBILITY
       =========================================================

       Google Apps Script Web Apps normally receive POST
       requests through doPost(e).

       This wrapper makes it easy for code.gs to receive
       an action + payload object.
       */

    async function appsScript(
        action,
        data = {},
        options = {}
    ) {

        if (!action) {

            return {
                success: false,
                message:
                    "API action is required."
            };
        }

        return post(
            "",
            {
                action,
                data,
                userId: getUserId()
            },
            options
        );
    }


    /* =========================================================
       AUTHENTICATION
       ========================================================= */

    async function login(
        credentials
    ) {

        return appsScript(
            "login",
            credentials
        );
    }


    async function verifyOTP(
        payload
    ) {

        return appsScript(
            "verifyOTP",
            payload
        );
    }


    async function resendOTP(
        payload
    ) {

        return appsScript(
            "resendOTP",
            payload
        );
    }


    async function registerResident(
        registrationData
    ) {

        return appsScript(
            "registerResident",
            registrationData
        );
    }


    async function logout() {

        return appsScript(
            "logout",
            {
                userId: getUserId()
            }
        );
    }


    async function verifySession() {

        return appsScript(
            "verifySession",
            {
                userId: getUserId(),
                token: getToken()
            }
        );
    }


    /* =========================================================
       RESIDENT
       ========================================================= */

    async function getResidentProfile(
        residentId = getUserId()
    ) {

        return appsScript(
            "getResidentProfile",
            {
                residentId
            }
        );
    }


    async function updateResidentProfile(
        profileData
    ) {

        return appsScript(
            "updateResidentProfile",
            {
                residentId: getUserId(),
                ...profileData
            }
        );
    }


    /* =========================================================
       DASHBOARD
       ========================================================= */

    async function getDashboardData(
        residentId = getUserId()
    ) {

        return appsScript(
            "getDashboardData",
            {
                residentId
            }
        );
    }


    /* =========================================================
       SERVICE REQUESTS
       ========================================================= */

    async function getServiceRequests(
        residentId = getUserId()
    ) {

        return appsScript(
            "getServiceRequests",
            {
                residentId
            }
        );
    }


    async function getServiceRequest(
        requestId
    ) {

        return appsScript(
            "getServiceRequest",
            {
                requestId,
                residentId: getUserId()
            }
        );
    }


    async function createServiceRequest(
        requestData
    ) {

        return appsScript(
            "createServiceRequest",
            {
                residentId: getUserId(),
                ...requestData
            }
        );
    }


    async function cancelServiceRequest(
        requestId,
        reason = ""
    ) {

        return appsScript(
            "cancelServiceRequest",
            {
                requestId,
                residentId: getUserId(),
                reason
            }
        );
    }


    /* =========================================================
       APPOINTMENTS
       ========================================================= */

    async function getAppointments(
        residentId = getUserId()
    ) {

        return appsScript(
            "getAppointments",
            {
                residentId
            }
        );
    }


    async function getAppointment(
        appointmentId
    ) {

        return appsScript(
            "getAppointment",
            {
                appointmentId,
                residentId: getUserId()
            }
        );
    }


    async function getAvailableAppointmentSlots(
        serviceId,
        date
    ) {

        return appsScript(
            "getAvailableAppointmentSlots",
            {
                serviceId,
                date
            }
        );
    }


    async function createAppointment(
        appointmentData
    ) {

        return appsScript(
            "createAppointment",
            {
                residentId: getUserId(),
                ...appointmentData
            }
        );
    }


    async function cancelAppointment(
        appointmentId,
        reason = ""
    ) {

        return appsScript(
            "cancelAppointment",
            {
                appointmentId,
                residentId: getUserId(),
                reason
            }
        );
    }


    /* =========================================================
       COMPLAINTS
       ========================================================= */

    async function getComplaints(
        residentId = getUserId()
    ) {

        return appsScript(
            "getComplaints",
            {
                residentId
            }
        );
    }


    async function getComplaint(
        complaintId
    ) {

        return appsScript(
            "getComplaint",
            {
                complaintId,
                residentId: getUserId()
            }
        );
    }


    async function createComplaint(
        complaintData
    ) {

        return appsScript(
            "createComplaint",
            {
                residentId: getUserId(),
                ...complaintData
            }
        );
    }


    /* =========================================================
       ANNOUNCEMENTS
       ========================================================= */

    async function getAnnouncements(
        options = {}
    ) {

        return appsScript(
            "getAnnouncements",
            {
                residentId: getUserId(),
                ...options
            }
        );
    }


    async function getAnnouncement(
        announcementId
    ) {

        return appsScript(
            "getAnnouncement",
            {
                announcementId,
                residentId: getUserId()
            }
        );
    }


    /* =========================================================
       NOTIFICATIONS
       =========================================================

       These functions retrieve notification records.

       Actual Gmail/SMS sending belongs to the backend.
       */

    async function getNotifications(
        residentId = getUserId()
    ) {

        return appsScript(
            "getNotifications",
            {
                residentId
            }
        );
    }


    async function markNotificationRead(
        notificationId
    ) {

        return appsScript(
            "markNotificationRead",
            {
                notificationId,
                residentId: getUserId()
            }
        );
    }


    async function sendNotification(
        notificationData
    ) {

        return appsScript(
            "sendNotification",
            {
                residentId: getUserId(),
                ...notificationData
            }
        );
    }


    /* =========================================================
       ACTIVITY
       ========================================================= */

    async function getRecentActivity(
        residentId = getUserId()
    ) {

        return appsScript(
            "getRecentActivity",
            {
                residentId
            }
        );
    }


    /* =========================================================
       REPORTS / ANALYTICS
       ========================================================= */

    async function getResidentReports(
        filters = {}
    ) {

        return appsScript(
            "getResidentReports",
            {
                residentId: getUserId(),
                ...filters
            }
        );
    }


    /* =========================================================
       FILE / DOCUMENT SUPPORT
       ========================================================= */

    async function uploadDocument(
        documentData
    ) {

        return appsScript(
            "uploadDocument",
            {
                residentId: getUserId(),
                ...documentData
            }
        );
    }


    /* =========================================================
       GENERIC ACTION
       =========================================================

       Useful for modules that are added later without changing
       the core API layer.
       */

    async function action(
        actionName,
        payload = {},
        options = {}
    ) {

        return appsScript(
            actionName,
            payload,
            options
        );
    }


    /* =========================================================
       RESPONSE HELPERS
       ========================================================= */

    function isSuccess(response) {

        return Boolean(
            response &&
            response.success === true
        );
    }


    function getData(response) {

        if (!response) {
            return null;
        }

        return (
            response.data ??
            response.result ??
            null
        );
    }


    function getMessage(response) {

        return (
            response?.message ||
            ""
        );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.API = {

        /* Core */
        request,
        get,
        post,
        put,
        delete: remove,

        /* Apps Script */
        appsScript,
        action,

        /* Authentication */
        login,
        verifyOTP,
        resendOTP,
        registerResident,
        logout,
        verifySession,

        /* Resident */
        getResidentProfile,
        updateResidentProfile,

        /* Dashboard */
        getDashboardData,

        /* Service Requests */
        getServiceRequests,
        getServiceRequest,
        createServiceRequest,
        cancelServiceRequest,

        /* Appointments */
        getAppointments,
        getAppointment,
        getAvailableAppointmentSlots,
        createAppointment,
        cancelAppointment,

        /* Complaints */
        getComplaints,
        getComplaint,
        createComplaint,

        /* Announcements */
        getAnnouncements,
        getAnnouncement,

        /* Notifications */
        getNotifications,
        markNotificationRead,
        sendNotification,

        /* Activity */
        getRecentActivity,

        /* Reports */
        getResidentReports,

        /* Documents */
        uploadDocument,

        /* Helpers */
        isSuccess,
        getData,
        getMessage,

        /* Session */
        getCurrentUser,
        getUserId,
        getToken
    };


    /* =========================================================
       DEBUG INFORMATION
       ========================================================= */

    if (window.location.hostname === "localhost") {

        console.info(
            "BRSPWA&A API initialized.",
            {
                baseURL: getBaseUrl(),
                authenticated: Boolean(getToken()),
                userId: getUserId()
            }
        );
    }

})();
