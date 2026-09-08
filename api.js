/* =========================================================
   STOCKFLOW — API CONNECTION
   File: api.js

   Frontend
       ↓
   StockFlowAPI
       ↓
   Google Apps Script
       ↓
   Google Sheets + Firebase
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


    const API_URL = String(
        CONFIG.API_URL ||
        CONFIG.APPS_SCRIPT_URL ||
        CONFIG.GOOGLE_APPS_SCRIPT_URL ||
        CONFIG.BACKEND_URL ||
        ""
    ).trim();


    const REQUEST_TIMEOUT =
        Number(
            CONFIG.API?.TIMEOUT ||
            CONFIG.API_TIMEOUT ||
            30000
        );


    const CONTENT_TYPE =
        CONFIG.API?.CONTENT_TYPE ||
        "text/plain;charset=utf-8";


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

            this.name =
                "StockFlowAPIError";

            this.code =
                code;

            this.details =
                details;
        }
    }


    /* =========================================================
       VALIDATE URL
       ========================================================= */

    function validateApiUrl() {

        if (!API_URL) {

            throw new StockFlowAPIError(
                "StockFlow API URL is not configured.",
                "MISSING_API_URL"
            );
        }


        if (
            !API_URL.includes(
                "script.google.com/macros/s/"
            )
        ) {

            console.warn(
                "STOCKFLOW: API URL does not look like a Google Apps Script Web App."
            );
        }
    }


    /* =========================================================
       RESPONSE PARSER
       ========================================================= */

    async function parseResponse(response) {

        const text =
            await response.text();

        let data = {};


        try {

            data =
                text
                    ? JSON.parse(text)
                    : {};

        } catch (error) {

            throw new StockFlowAPIError(
                "The server returned an invalid JSON response.",
                "INVALID_JSON",
                text
            );
        }


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
                "The server rejected the request.",
                data.code ||
                "REQUEST_FAILED",
                data
            );
        }


        return data;
    }


    /* =========================================================
       GENERIC REQUEST
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


        const body = {

            action,

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
                                CONTENT_TYPE
                        },

                        body:
                            JSON.stringify(body),

                        redirect:
                            "follow",

                        signal:
                            controller.signal
                    }
                );


            return await parseResponse(
                response
            );

        } catch (error) {

            if (
                error?.name ===
                "AbortError"
            ) {

                throw new StockFlowAPIError(
                    "The StockFlow server took too long to respond.",
                    "TIMEOUT"
                );
            }


            if (
                error instanceof
                StockFlowAPIError
            ) {

                throw error;
            }


            throw new StockFlowAPIError(
                "Unable to connect to the StockFlow server.",
                "NETWORK_ERROR",
                error
            );

        } finally {

            clearTimeout(timeout);
        }
    }


    /* =========================================================
       RESULT NORMALIZATION
       ========================================================= */

    function normalizeResult(result) {

        if (!result) {

            return {

                success:
                    false,

                message:
                    "Empty server response."
            };
        }


        return result;
    }


    /* =========================================================
       IDENTITY BUILDER
       ========================================================= */

    function buildIdentity(data = {}) {

        return String(
            data.identity ||
            data.username ||
            data.gmail ||
            data.email ||
            data.phone ||
            data.uid ||
            ""
        ).trim();
    }


    /* =========================================================
       AUTHENTICATION
       ========================================================= */

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


    async function login(data = {}) {

        return normalizeResult(
            await request(
                "login",
                {

                    identity:
                        buildIdentity(data),

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail || "",

                    phone:
                        data.phone || "",

                    password:
                        data.password || ""
                }
            )
        );
    }


    /* =========================================================
       OTP
       ========================================================= */

    async function verifyOtp(data = {}) {

        return normalizeResult(
            await request(
                "verifyOtp",
                {

                    uid:
                        data.uid || "",

                    identity:
                        buildIdentity(data),

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail ||
                        data.email ||
                        "",

                    phone:
                        data.phone || "",

                    channel:
                        data.channel ||
                        data.otpChannel ||
                        "email",

                    otpChannel:
                        data.otpChannel ||
                        data.channel ||
                        "email",

                    otp:
                        String(
                            data.otp || ""
                        ).trim()
                }
            )
        );
    }


    /*
     * PREPARE OTP
     *
     * Initial verification-code generation.
     */

    async function prepareOtp(data = {}) {

        const payload = {

            uid:
                data.uid || "",

            identity:
                buildIdentity(data),

            username:
                data.username || "",

            email:
                data.email || "",

            gmail:
                data.gmail ||
                data.email ||
                "",

            phone:
                data.phone || "",

            channel:
                data.channel ||
                data.otpChannel ||
                "email",

            otpChannel:
                data.otpChannel ||
                data.channel ||
                "email"
        };


        try {

            return normalizeResult(
                await request(
                    "prepareOtp",
                    payload
                )
            );

        } catch (error) {

            /*
             * Older backend compatibility.
             *
             * If prepareOtp is not yet implemented,
             * use resendOtp as the initial generator.
             */

            const message =
                String(
                    error?.message ||
                    ""
                ).toLowerCase();

            const isMissingAction =
                message.includes(
                    "unknown action"
                ) ||
                message.includes(
                    "unsupported action"
                ) ||
                message.includes(
                    "action not found"
                ) ||
                error?.code ===
                    "UNKNOWN_ACTION";


            if (!isMissingAction) {

                throw error;
            }


            return normalizeResult(
                await request(
                    "resendOtp",
                    payload
                )
            );
        }
    }


    async function resendOtp(data = {}) {

        return normalizeResult(
            await request(
                "resendOtp",
                {

                    uid:
                        data.uid || "",

                    identity:
                        buildIdentity(data),

                    username:
                        data.username || "",

                    email:
                        data.email || "",

                    gmail:
                        data.gmail ||
                        data.email ||
                        "",

                    phone:
                        data.phone || "",

                    channel:
                        data.channel ||
                        data.otpChannel ||
                        "email",

                    otpChannel:
                        data.otpChannel ||
                        data.channel ||
                        "email"
                }
            )
        );
    }


    async function updateOtp(data = {}) {

        return resendOtp(data);
    }


    /* =========================================================
       SESSION
       ========================================================= */

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


    async function requireSession(data = {}) {

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

    async function forgotPassword(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "forgotPassword",
                {

                    identity:
                        buildIdentity(data),

                    email:
                        data.email || "",

                    gmail:
                        data.gmail ||
                        data.email ||
                        "",

                    phone:
                        data.phone || ""
                }
            )
        );
    }


    async function verifyRecoveryOtp(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "verifyRecoveryOtp",
                {

                    identity:
                        buildIdentity(data),

                    email:
                        data.email || "",

                    gmail:
                        data.gmail ||
                        data.email ||
                        "",

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


    async function resetPassword(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "resetPassword",
                {

                    identity:
                        buildIdentity(data),

                    token:
                        data.token || "",

                    password:
                        data.password ||
                        data.newPassword ||
                        "",

                    newPassword:
                        data.newPassword ||
                        data.password ||
                        ""
                }
            )
        );
    }


    /* =========================================================
       ACTIVITY
       ========================================================= */

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
                        data.limit ||
                        100
                }
            )
        );
    }


    /* =========================================================
       INVENTORY
       ========================================================= */

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
       PRODUCTS
       ========================================================= */

    async function listProducts(data = {}) {
        return inventory(
            "listProducts",
            data
        );
    }

    async function createProduct(data = {}) {
        return inventory(
            "createProduct",
            data
        );
    }

    async function updateProduct(data = {}) {
        return inventory(
            "updateProduct",
            data
        );
    }

    async function deleteProduct(data = {}) {
        return inventory(
            "deleteProduct",
            data
        );
    }


    /* =========================================================
       CATEGORIES
       ========================================================= */

    async function listCategories(data = {}) {
        return inventory(
            "listCategories",
            data
        );
    }

    async function createCategory(data = {}) {
        return inventory(
            "createCategory",
            data
        );
    }

    async function updateCategory(data = {}) {
        return inventory(
            "updateCategory",
            data
        );
    }

    async function deleteCategory(data = {}) {
        return inventory(
            "deleteCategory",
            data
        );
    }


    /* =========================================================
       SUPPLIERS
       ========================================================= */

    async function listSuppliers(data = {}) {
        return inventory(
            "listSuppliers",
            data
        );
    }

    async function createSupplier(data = {}) {
        return inventory(
            "createSupplier",
            data
        );
    }

    async function updateSupplier(data = {}) {
        return inventory(
            "updateSupplier",
            data
        );
    }

    async function deleteSupplier(data = {}) {
        return inventory(
            "deleteSupplier",
            data
        );
    }


    /* =========================================================
       STOCK
       ========================================================= */

    async function listStockIn(data = {}) {
        return inventory(
            "listStockIn",
            data
        );
    }

    async function createStockIn(data = {}) {
        return inventory(
            "createStockIn",
            data
        );
    }

    async function listStockOut(data = {}) {
        return inventory(
            "listStockOut",
            data
        );
    }

    async function createStockOut(data = {}) {
        return inventory(
            "createStockOut",
            data
        );
    }


    /* =========================================================
       TRANSACTIONS
       ========================================================= */

    async function listTransactions(data = {}) {
        return inventory(
            "listTransactions",
            data
        );
    }


    /* =========================================================
       DASHBOARD
       ========================================================= */

    async function dashboard(data = {}) {
        return inventory(
            "dashboard",
            data
        );
    }


    /* =========================================================
       HEALTH CHECK
       ========================================================= */

    async function health() {

        validateApiUrl();


        const response =
            await fetch(
                API_URL,
                {
                    method:
                        "GET",

                    redirect:
                        "follow"
                }
            );


        const text =
            await response.text();


        try {

            return text
                ? JSON.parse(text)
                : {};

        } catch {

            return {

                success:
                    response.ok,

                raw:
                    text
            };
        }
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    const StockFlowAPI = {

        request,

        health,

        register,
        login,

        verifyOtp,
        prepareOtp,
        resendOtp,
        updateOtp,

        session,
        requireSession,
        logout,

        forgotPassword,
        verifyRecoveryOtp,
        resetPassword,

        listActivity,

        inventory,

        listProducts,
        createProduct,
        updateProduct,
        deleteProduct,

        listCategories,
        createCategory,
        updateCategory,
        deleteCategory,

        listSuppliers,
        createSupplier,
        updateSupplier,
        deleteSupplier,

        listStockIn,
        createStockIn,

        listStockOut,
        createStockOut,

        listTransactions,

        dashboard,

        StockFlowAPIError
    };


    /* =========================================================
       GLOBAL EXPORT
       ========================================================= */

    window.StockFlowAPI =
        StockFlowAPI;


    /*
     * Legacy compatibility.
     */

    window.API =
        StockFlowAPI;


    /* =========================================================
       DEBUG
       ========================================================= */

    console.log(
        "%cStockFlow API loaded",
        "font-weight:bold;"
    );

    console.log(
        "API endpoint:",
        API_URL || "(not configured)"
    );


})(window);
