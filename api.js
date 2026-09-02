/* ============================================================
   STOCKFLOW — API CLIENT
   Phone Accessories Inventory Management System
   ============================================================
   Purpose:
   - Centralized communication with Google Apps Script
   - Authentication
   - OTP verification
   - Password recovery
   - Session management
   - User management
   - Inventory modules
   - Dashboard statistics

   IMPORTANT:
   - Keep the Apps Script /exec URL in config.js
   - Do NOT put Firebase database writes directly in the browser
   ============================================================ */

(function () {
    "use strict";

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const CONFIG = window.STOCKFLOW_CONFIG || {};

    const API_URL = CONFIG.API_URL || "";
    const SESSION_KEY = CONFIG.SESSION_KEY || "STOCKFLOW_SESSION";

    /* =========================================================
       BASIC HELPERS
       ========================================================= */

    function getToken() {
        return sessionStorage.getItem(SESSION_KEY) || "";
    }

    function saveToken(token) {
        if (token) {
            sessionStorage.setItem(SESSION_KEY, token);
        }
    }

    function clearToken() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function getSessionUser() {
        try {
            const raw = sessionStorage.getItem("STOCKFLOW_USER");

            if (!raw) {
                return null;
            }

            return JSON.parse(raw);
        } catch (error) {
            console.error("Unable to read stored user:", error);
            return null;
        }
    }

    function saveSessionUser(user) {
        if (user) {
            sessionStorage.setItem(
                "STOCKFLOW_USER",
                JSON.stringify(user)
            );
        }
    }

    function clearSessionUser() {
        sessionStorage.removeItem("STOCKFLOW_USER");
    }

    /* =========================================================
       VALIDATE API CONFIGURATION
       ========================================================= */

    function validateApiUrl() {
        if (!API_URL) {
            throw new Error(
                "STOCKFLOW API URL is not configured. Please update config.js."
            );
        }

        if (!API_URL.includes("/exec")) {
            throw new Error(
                "Invalid Apps Script URL. Use the deployed Web App /exec URL."
            );
        }
    }

    /* =========================================================
       CENTRAL REQUEST FUNCTION
       ========================================================= */

    async function request(payload = {}) {

        validateApiUrl();

        const requestPayload = {
            ...payload
        };

        /*
         * Automatically attach session token when available.
         *
         * This allows protected backend operations such as:
         * - inventory
         * - transactions
         * - activity
         * - user management
         * - dashboard statistics
         */
        if (!requestPayload.token) {
            const token = getToken();

            if (token) {
                requestPayload.token = token;
            }
        }

        let response;

        try {

            response = await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },

                body: JSON.stringify(requestPayload),

                cache: "no-store"
            });

        } catch (networkError) {

            console.error(
                "STOCKFLOW API Network Error:",
                networkError
            );

            throw new Error(
                "Unable to connect to the STOCKFLOW server. Please check your internet connection or Apps Script deployment."
            );
        }

        let responseText = "";

        try {
            responseText = await response.text();
        } catch (readError) {

            console.error(
                "Unable to read server response:",
                readError
            );

            throw new Error(
                "The server returned an unreadable response."
            );
        }

        if (!responseText) {
            throw new Error(
                "The STOCKFLOW server returned an empty response."
            );
        }

        let result;

        try {

            result = JSON.parse(responseText);

        } catch (parseError) {

            console.error(
                "Invalid server response:",
                responseText
            );

            throw new Error(
                "The backend returned an invalid response. Check the Apps Script deployment and doPost() function."
            );
        }

        /*
         * HTTP status may still be 200 with an application-level
         * success:false response from Apps Script.
         */
        if (!response.ok) {

            throw new Error(
                result.message ||
                `Server request failed (${response.status}).`
            );
        }

        /*
         * Standardize failed API responses.
         */
        if (
            result &&
            result.success === false &&
            result.message
        ) {

            const error = new Error(result.message);

            error.response = result;

            throw error;
        }

        return result;
    }

    /* =========================================================
       HEALTH CHECK
       ========================================================= */

    async function health() {

        validateApiUrl();

        try {

            const response = await fetch(
                API_URL + "?action=health",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

            const text = await response.text();

            try {
                return JSON.parse(text);
            } catch (error) {
                throw new Error(
                    "Health check returned an invalid response."
                );
            }

        } catch (error) {

            console.error(
                "STOCKFLOW health check failed:",
                error
            );

            throw error;
        }
    }

    /* =========================================================
       AUTHENTICATION
       ========================================================= */

    async function register(data = {}) {

        return request({
            action: "register",
            ...data
        });
    }

    async function login(data = {}) {

        const result = await request({
            action: "login",
            ...data
        });

        /*
         * If login returns a session token, save it immediately.
         */
        if (result && result.token) {
            saveToken(result.token);
        }

        /*
         * Save returned user information.
         */
        if (result && result.user) {
            saveSessionUser(result.user);
        }

        return result;
    }

    async function logout() {

        const token = getToken();

        try {

            if (token) {

                await request({
                    action: "logout",
                    token: token
                });

            }

        } catch (error) {

            /*
             * Even if the backend logout fails,
             * the browser session must still be cleared.
             */
            console.warn(
                "Backend logout failed:",
                error
            );

        } finally {

            clearToken();
            clearSessionUser();
        }

        return {
            success: true
        };
    }

    /* =========================================================
       OTP
       ========================================================= */

    async function verifyOtp(data = {}) {

        return request({
            action: "verifyOtp",
            ...data
        });
    }

    async function resendOtp(data = {}) {

        return request({
            action: "resendOtp",
            ...data
        });
    }

    async function requestOtp(data = {}) {

        return request({
            action: "requestOtp",
            ...data
        });
    }

    /* =========================================================
       PASSWORD RECOVERY
       ========================================================= */

    async function forgotPassword(data = {}) {

        return request({
            action: "forgotPassword",
            ...data
        });
    }

    async function verifyRecoveryOtp(data = {}) {

        return request({
            action: "verifyRecoveryOtp",
            ...data
        });
    }

    async function resetPassword(data = {}) {

        return request({
            action: "resetPassword",
            ...data
        });
    }

    /* =========================================================
       SESSION
       ========================================================= */

    async function session() {

        const token = getToken();

        if (!token) {

            return {
                success: false,
                authenticated: false,
                message: "No active session."
            };
        }

        const result = await request({
            action: "session",
            token: token
        });

        if (
            result &&
            result.authenticated === false
        ) {

            clearToken();
            clearSessionUser();
        }

        if (
            result &&
            result.authenticated === true &&
            result.user
        ) {

            saveSessionUser(result.user);
        }

        return result;
    }

    /* =========================================================
       USER MANAGEMENT
       ========================================================= */

    async function getUser(identity) {

        return request({
            action: "getUser",
            identity: identity
        });
    }

    async function listUsers() {

        return request({
            action: "listUsers",
            token: getToken()
        });
    }

    async function updateStatus(
        username,
        status
    ) {

        return request({
            action: "updateStatus",
            username: username,
            status: status,
            token: getToken()
        });
    }

    /* =========================================================
       INVENTORY — PRODUCTS
       ========================================================= */

    async function listProducts() {

        return request({
            action: "listProducts"
        });
    }

    async function getProduct(id) {

        return request({
            action: "getProduct",
            id: id
        });
    }

    async function createProduct(data = {}) {

        return request({
            action: "createProduct",
            ...data,
            token: getToken()
        });
    }

    async function updateProduct(data = {}) {

        return request({
            action: "updateProduct",
            ...data,
            token: getToken()
        });
    }

    async function deleteProduct(id) {

        return request({
            action: "deleteProduct",
            id: id,
            token: getToken()
        });
    }

    /* =========================================================
       INVENTORY — CATEGORIES
       ========================================================= */

    async function listCategories() {

        return request({
            action: "listCategories"
        });
    }

    async function createCategory(data = {}) {

        return request({
            action: "createCategory",
            ...data,
            token: getToken()
        });
    }

    async function updateCategory(data = {}) {

        return request({
            action: "updateCategory",
            ...data,
            token: getToken()
        });
    }

    async function deleteCategory(id) {

        return request({
            action: "deleteCategory",
            id: id,
            token: getToken()
        });
    }

    /* =========================================================
       INVENTORY — SUPPLIERS
       ========================================================= */

    async function listSuppliers() {

        return request({
            action: "listSuppliers"
        });
    }

    async function createSupplier(data = {}) {

        return request({
            action: "createSupplier",
            ...data,
            token: getToken()
        });
    }

    async function updateSupplier(data = {}) {

        return request({
            action: "updateSupplier",
            ...data,
            token: getToken()
        });
    }

    async function deleteSupplier(id) {

        return request({
            action: "deleteSupplier",
            id: id,
            token: getToken()
        });
    }

    /* =========================================================
       STOCK IN
       ========================================================= */

    async function stockIn(data = {}) {

        return request({
            action: "stockIn",
            ...data,
            token: getToken()
        });
    }

    /* =========================================================
       STOCK OUT
       ========================================================= */

    async function stockOut(data = {}) {

        return request({
            action: "stockOut",
            ...data,
            token: getToken()
        });
    }

    /* =========================================================
       TRANSACTIONS
       ========================================================= */

    async function listTransactions(filters = {}) {

        return request({
            action: "listTransactions",
            ...filters,
            token: getToken()
        });
    }

    /* =========================================================
       ACTIVITY LOG
       ========================================================= */

    async function listActivity(filters = {}) {

        return request({
            action: "listActivity",
            ...filters,
            token: getToken()
        });
    }

    /* =========================================================
       DASHBOARD
       ========================================================= */

    async function dashboardStats() {

        return request({
            action: "dashboardStats",
            token: getToken()
        });
    }

    /* =========================================================
       GENERIC INVENTORY DISPATCHER
       =========================================================
       Useful if inventorymodule.gs uses one central action
       dispatcher.
       ========================================================= */

    async function inventoryAction(
        action,
        data = {}
    ) {

        return request({
            action: action,
            ...data,
            token: getToken()
        });
    }

    /* =========================================================
       SESSION STATE HELPERS
       ========================================================= */

    function isLoggedIn() {

        return Boolean(getToken());
    }

    function currentUser() {

        return getSessionUser();
    }

    function currentRole() {

        const user = getSessionUser();

        if (!user) {
            return "";
        }

        return String(
            user.role ||
            user.ROLE ||
            ""
        ).toUpperCase();
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    const StockFlowAPI = {

        /* Core */
        request,
        health,

        /* Token / Session */
        getToken,
        token: getToken,
        saveToken,
        clearToken,

        isLoggedIn,
        currentUser,
        currentRole,

        /* Authentication */
        register,
        login,
        logout,

        /* OTP */
        verifyOtp,
        resendOtp,
        requestOtp,

        /* Recovery */
        forgotPassword,
        verifyRecoveryOtp,
        resetPassword,

        /* Session */
        session,

        /* Users */
        getUser,
        listUsers,
        updateStatus,

        /* Products */
        listProducts,
        getProduct,
        createProduct,
        updateProduct,
        deleteProduct,

        /* Categories */
        listCategories,
        createCategory,
        updateCategory,
        deleteCategory,

        /* Suppliers */
        listSuppliers,
        createSupplier,
        updateSupplier,
        deleteSupplier,

        /* Stock */
        stockIn,
        stockOut,

        /* Transactions */
        listTransactions,

        /* Activity */
        listActivity,

        /* Dashboard */
        dashboardStats,

        /* Generic Inventory */
        inventoryAction
    };

    /* =========================================================
       GLOBAL EXPORTS
       ========================================================= */

    window.StockFlowAPI = StockFlowAPI;

    /*
     * Backward compatibility.
     *
     * Existing STOCKFLOW pages may already use:
     * window.API
     */
    window.API = StockFlowAPI;

})();
