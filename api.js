/* =========================================================
   STOCKFLOW — API CONNECTION
   File: api.js

   PURPOSE:
   Frontend ↔ Google Apps Script Web App

   FLOW:
   HTML / JS
        ↓
   StockFlowAPI
        ↓
   Google Apps Script
        ↓
   Google Sheets / Firebase

   IMPORTANT:
   - This file does NOT generate OTPs.
   - This file does NOT handle OTP UI.
   - This file does NOT redirect pages.
   - OTP generation/verification belongs to the backend + otp.js.
   ========================================================= */

(function (window) {

    "use strict";


    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};

    /*
       Supports several possible names so this API remains
       compatible with your existing config.js.
    */

    const API_URL =
        CONFIG.API_URL ||
        CONFIG.APPS_SCRIPT_URL ||
        CONFIG.GOOGLE_APPS_SCRIPT_URL ||
        CONFIG.BACKEND_URL ||
        "";


    /* =========================================================
       INTERNAL SETTINGS
       ========================================================= */

    const REQUEST_TIMEOUT =
        Number(CONFIG.API_TIMEOUT || 30000);


    /* =========================================================
       VALIDATE API URL
       ========================================================= */

    function validateApiUrl() {

        if (!API_URL) {
            throw new Error(
                "StockFlow API URL is not configured. " +
                "Please check config.js."
            );
        }

        if (
            !API_URL.includes(
                "script.google.com/macros/s/"
            )
        ) {
            console.warn(
                "StockFlow API URL does not look like " +
                "a Google Apps Script Web App URL."
            );
        }
    }


    /* =========================================================
       ERROR CLASS
       ========================================================= */

    class StockFlowAPIError extends Error {

        constructor(
            message,
            code = "API_ERROR",
            details = null
        ) {

            super(message);

            this.name = "StockFlowAPIError";
            this.code = code;
            this.details = details;
        }
    }


    /* =========================================================
       PARSE RESPONSE
       ========================================================= */

    async function parseResponse(response) {

        const text =
            await response.text();

        let data;

        try {

            data =
                text
                    ? JSON.parse(text)
                    : {};

        } catch (error) {

            throw new StockFlowAPIError(
                "The server returned an invalid response.",
                "INVALID_JSON",
                text
            );
        }


        /*
           HTTP-level failure
        */

        if (!response.ok) {

            throw new StockFlowAPIError(
                data.message ||
                data.error ||
                `Server returned HTTP ${response.status}.`,
                data.code ||
                "HTTP_ERROR",
                data
            );
        }


        /*
           Application-level failure
        */

        if (
            data &&
            (
                data.success === false ||
                data.ok === false
            )
        ) {

            throw new StockFlowAPIError(
                data.message ||
                data.error ||
                "The request was rejected by the server.",
                data.code ||
                "REQUEST_FAILED",
                data
            );
        }


        return data;
    }


    /* =========================================================
       GENERIC API REQUEST
       ========================================================= */

    async function request(
        action,
        payload = {}
    ) {

        validateApiUrl();


        if (!action) {

            throw new StockFlowAPIError(
                "API action is required.",
                "MISSING_ACTION"
            );
        }


        /*
           Apps Script Web Apps work well with text/plain
           because it avoids unnecessary CORS preflight.
        */

        const body = {

            action: action,

            ...payload
        };


        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                REQUEST_TIMEOUT
            );


        try {

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "text/plain;charset=utf-8"
                        },

                        body:
                            JSON.stringify(body),

                        redirect: "follow",

                        signal:
                            controller.signal
                    }
                );


            return await parseResponse(
                response
            );

        } catch (error) {

            /*
               Request timeout
            */

            if (
                error &&
                error.name === "AbortError"
            ) {

                throw new StockFlowAPIError(
                    "The server took too long to respond.",
                    "TIMEOUT"
                );
            }


            /*
               Already our custom error
            */

            if (
                error instanceof
                StockFlowAPIError
            ) {

                throw error;
            }


            /*
               Network / CORS / connection error
            */

            throw new StockFlowAPIError(
                "Unable to connect to the StockFlow server. " +
                "Please check your internet connection " +
                "and Google Apps Script deployment.",
                "NETWORK_ERROR",
                error
            );

        } finally {

            clearTimeout(timeout);
        }
    }


    /* =========================================================
       NORMALIZE RESULT
       ========================================================= */

    function normalizeResult(result) {

        if (!result) {
            return {
                success: false,
                message: "Empty server response."
            };
        }

        return result;
    }


    /* =========================================================
       AUTHENTICATION
       ========================================================= */


    /**
     * REGISTER
     *
     * Backend action:
     * register
     *
     * Sends registration information to Apps Script.
     *
     * The backend is responsible for:
     * - creating UID
     * - generating OTP
     * - saving user to Google Sheets
     * - saving OTP to Google Sheets
     * - syncing OTP/user data to Firebase
     */
    async function register(data = {}) {

        return normalizeResult(
            await request(
                "register",
                {
                    name:
                        data.name || "",

                    username:
                        data.username || "",

                    age:
                        data.age || "",

                    gmail:
                        data.gmail ||
                        data.email ||
                        "",

                    phone:
                        data.phone || "",

                    password:
                        data.password || "",

                    role:
                        data.role ||
                        "Employee"
                }
            )
        );
    }


    /**
     * LOGIN
     *
     * Backend action:
     * login
     */
    async function login(data = {}) {

        return normalizeResult(
            await request(
                "login",
                {
                    identity:
                        data.identity || "",

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    phone:
                        data.phone || "",

                    password:
                        data.password || ""
                }
            )
        );
    }


    /**
     * VERIFY OTP
     *
     * Backend action:
     * verifyOtp
     *
     * IMPORTANT:
     * api.js does NOT generate the OTP.
     *
     * The backend verifies the authoritative OTP
     * stored in Google Sheets.
     */
    async function verifyOtp(data = {}) {

        return normalizeResult(
            await request(
                "verifyOtp",
                {
                    uid:
                        data.uid || "",

                    identity:
                        data.identity || "",

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail || "",

                    phone:
                        data.phone || "",

                    otp:
                        String(
                            data.otp || ""
                        ).trim()
                }
            )
        );
    }


    /**
     * PREPARE OTP
     *
     * Backend action:
     * prepareOtp
     *
     * This is specifically useful for your
     * midterm demo.
     *
     * The backend can return the currently stored
     * OTP when DEMO_MODE is enabled.
     *
     * otp.js can then wait 3–5 seconds and display
     * that backend-generated OTP inside the six boxes.
     */
    async function prepareOtp(data = {}) {

        return normalizeResult(
            await request(
                "prepareOtp",
                {
                    uid:
                        data.uid || "",

                    identity:
                        data.identity || "",

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail || "",

                    phone:
                        data.phone || ""
                }
            )
        );
    }


    /**
     * RESEND OTP
     *
     * Backend action:
     * resendOtp
     *
     * The backend generates a NEW OTP.
     */
    async function resendOtp(data = {}) {

        return normalizeResult(
            await request(
                "resendOtp",
                {
                    uid:
                        data.uid || "",

                    identity:
                        data.identity || "",

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail || "",

                    phone:
                        data.phone || "",

                    channel:
                        data.channel ||
                        "demo"
                }
            )
        );
    }


    /*
       Alias for older frontend code.
    */

    async function updateOtp(data = {}) {

        return resendOtp(data);
    }


    /* =========================================================
       SESSION
       ========================================================= */


    /**
     * CHECK SESSION
     *
     * Backend action:
     * session
     */
    async function session(data = {}) {

        return normalizeResult(
            await request(
                "session",
                {
                    token:
                        data.token ||
                        localStorage.getItem(
                            "STOCKFLOW_TOKEN"
                        ) ||
                        ""
                }
            )
        );
    }


    /**
     * REQUIRE SESSION
     *
     * Backend action:
     * requireSession
     */
    async function requireSession(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "requireSession",
                {
                    token:
                        data.token ||
                        localStorage.getItem(
                            "STOCKFLOW_TOKEN"
                        ) ||
                        ""
                }
            )
        );
    }


    /**
     * LOGOUT
     *
     * Backend action:
     * logout
     */
    async function logout(data = {}) {

        return normalizeResult(
            await request(
                "logout",
                {
                    token:
                        data.token ||
                        localStorage.getItem(
                            "STOCKFLOW_TOKEN"
                        ) ||
                        ""
                }
            )
        );
    }


    /* =========================================================
       PASSWORD RECOVERY
       ========================================================= */


    /**
     * FORGOT PASSWORD
     *
     * Backend action:
     * forgotPassword
     */
    async function forgotPassword(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "forgotPassword",
                {
                    identity:
                        data.identity || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail || "",

                    phone:
                        data.phone || ""
                }
            )
        );
    }


    /**
     * VERIFY RECOVERY OTP
     *
     * Backend action:
     * verifyRecoveryOtp
     */
    async function verifyRecoveryOtp(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "verifyRecoveryOtp",
                {
                    identity:
                        data.identity || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail || "",

                    phone:
                        data.phone || "",

                    otp:
                        String(
                            data.otp || ""
                        ).trim()
                }
            )
        );
    }


    /**
     * RESET PASSWORD
     *
     * Backend action:
     * resetPassword
     */
    async function resetPassword(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "resetPassword",
                {
                    identity:
                        data.identity || "",

                    token:
                        data.token || "",

                    password:
                        data.password || "",

                    newPassword:
                        data.newPassword || ""
                }
            )
        );
    }


    /* =========================================================
       ACTIVITY LOG
       ========================================================= */


    /**
     * LIST ACTIVITY
     *
     * Backend action:
     * listActivity
     *
     * Used by activity.html / activity.js
     */
    async function listActivity(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "listActivity",
                {
                    token:
                        data.token ||
                        localStorage.getItem(
                            "STOCKFLOW_TOKEN"
                        ) ||
                        "",

                    limit:
                        data.limit || 100
                }
            )
        );
    }


    /* =========================================================
       INVENTORY API
       ========================================================= */


    /**
     * Generic inventory action.
     *
     * This allows future modules such as:
     *
     * Products
     * Categories
     * Suppliers
     * Stock In
     * Stock Out
     * Transactions
     * Inventory Dashboard
     */
    async function inventory(
        action,
        data = {}
    ) {

        if (!action) {

            throw new StockFlowAPIError(
                "Inventory action is required.",
                "MISSING_INVENTORY_ACTION"
            );
        }


        return normalizeResult(
            await request(
                action,
                {
                    token:
                        data.token ||
                        localStorage.getItem(
                            "STOCKFLOW_TOKEN"
                        ) ||
                        "",

                    ...data
                }
            )
        );
    }


    /* =========================================================
       PRODUCT METHODS
       ========================================================= */


    async function listProducts(
        data = {}
    ) {

        return inventory(
            "listProducts",
            data
        );
    }


    async function createProduct(
        data = {}
    ) {

        return inventory(
            "createProduct",
            data
        );
    }


    async function updateProduct(
        data = {}
    ) {

        return inventory(
            "updateProduct",
            data
        );
    }


    async function deleteProduct(
        data = {}
    ) {

        return inventory(
            "deleteProduct",
            data
        );
    }


    /* =========================================================
       CATEGORY METHODS
       ========================================================= */


    async function listCategories(
        data = {}
    ) {

        return inventory(
            "listCategories",
            data
        );
    }


    async function createCategory(
        data = {}
    ) {

        return inventory(
            "createCategory",
            data
        );
    }


    async function updateCategory(
        data = {}
    ) {

        return inventory(
            "updateCategory",
            data
        );
    }


    async function deleteCategory(
        data = {}
    ) {

        return inventory(
            "deleteCategory",
            data
        );
    }


    /* =========================================================
       SUPPLIER METHODS
       ========================================================= */


    async function listSuppliers(
        data = {}
    ) {

        return inventory(
            "listSuppliers",
            data
        );
    }


    async function createSupplier(
        data = {}
    ) {

        return inventory(
            "createSupplier",
            data
        );
    }


    async function updateSupplier(
        data = {}
    ) {

        return inventory(
            "updateSupplier",
            data
        );
    }


    async function deleteSupplier(
        data = {}
    ) {

        return inventory(
            "deleteSupplier",
            data
        );
    }


    /* =========================================================
       STOCK IN
       ========================================================= */


    async function listStockIn(
        data = {}
    ) {

        return inventory(
            "listStockIn",
            data
        );
    }


    async function createStockIn(
        data = {}
    ) {

        return inventory(
            "createStockIn",
            data
        );
    }


    /* =========================================================
       STOCK OUT
       ========================================================= */


    async function listStockOut(
        data = {}
    ) {

        return inventory(
            "listStockOut",
            data
        );
    }


    async function createStockOut(
        data = {}
    ) {

        return inventory(
            "createStockOut",
            data
        );
    }


    /* =========================================================
       TRANSACTIONS
       ========================================================= */


    async function listTransactions(
        data = {}
    ) {

        return inventory(
            "listTransactions",
            data
        );
    }


    /* =========================================================
       DASHBOARD
       ========================================================= */


    async function dashboard(
        data = {}
    ) {

        return inventory(
            "dashboard",
            data
        );
    }


    /* =========================================================
       HEALTH CHECK
       ========================================================= */


    /**
     * Test whether the Apps Script backend
     * is reachable.
     *
     * Uses GET instead of POST.
     */
    async function health() {

        validateApiUrl();


        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                REQUEST_TIMEOUT
            );


        try {

            const response =
                await fetch(
                    API_URL,
                    {
                        method: "GET",

                        redirect: "follow",

                        signal:
                            controller.signal
                    }
                );


            const text =
                await response.text();


            let data;

            try {

                data =
                    text
                        ? JSON.parse(text)
                        : {};

            } catch {

                data = {
                    success:
                        response.ok,

                    raw:
                        text
                };
            }


            return data;

        } catch (error) {

            throw new StockFlowAPIError(
                "Unable to reach the StockFlow backend.",
                "HEALTH_CHECK_FAILED",
                error
            );

        } finally {

            clearTimeout(timeout);
        }
    }


    /* =========================================================
       API OBJECT
       ========================================================= */

    const StockFlowAPI = {

        /* Core */
        request,
        health,

        /* Authentication */
        register,
        login,

        /* OTP */
        verifyOtp,
        prepareOtp,
        resendOtp,
        updateOtp,

        /* Session */
        session,
        requireSession,
        logout,

        /* Password recovery */
        forgotPassword,
        verifyRecoveryOtp,
        resetPassword,

        /* Activity */
        listActivity,

        /* Generic inventory */
        inventory,

        /* Products */
        listProducts,
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
        listStockIn,
        createStockIn,

        listStockOut,
        createStockOut,

        /* Transactions */
        listTransactions,

        /* Dashboard */
        dashboard,

        /* Error class */
        StockFlowAPIError
    };


    /* =========================================================
       GLOBAL EXPORT
       ========================================================= */

    window.StockFlowAPI =
        StockFlowAPI;


    /*
       Backward compatibility.

       Some of your older files may use:
       API.verifyOtp()
       API.login()
       API.register()

       This allows those files to continue working while
       we gradually update them to StockFlowAPI.
    */

    window.API =
        StockFlowAPI;


    /* =========================================================
       DEBUG INFORMATION
       ========================================================= */

    console.log(
        "%cStockFlow API loaded",
        "font-weight:bold;"
    );

    if (API_URL) {

        console.log(
            "StockFlow API endpoint:",
            API_URL
        );

    } else {

        console.warn(
            "StockFlow API URL is currently empty. " +
            "Configure it in config.js."
        );
    }


})(window);
