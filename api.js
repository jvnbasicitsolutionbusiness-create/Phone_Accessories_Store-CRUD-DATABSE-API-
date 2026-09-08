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
   Google Sheets
        ↓
   Firebase

   IMPORTANT:
   - api.js does NOT generate OTPs.
   - api.js does NOT control OTP boxes.
   - api.js does NOT redirect pages.
   - Backend generates the authoritative OTP.
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

    const API_CONFIG =
        CONFIG.API ||
        {};


    const API_URL =
        String(
            CONFIG.API_URL ||
            CONFIG.APPS_SCRIPT_URL ||
            CONFIG.GOOGLE_APPS_SCRIPT_URL ||
            CONFIG.BACKEND_URL ||
            ""
        ).trim();


    const REQUEST_TIMEOUT =
        Number(
            API_CONFIG.TIMEOUT ||
            CONFIG.API_TIMEOUT ||
            30000
        );


    const CONTENT_TYPE =
        API_CONFIG.CONTENT_TYPE ||
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
       API URL VALIDATION
       ========================================================= */

    function validateApiUrl() {

        if (!API_URL) {

            throw new StockFlowAPIError(
                "StockFlow API URL is not configured. " +
                "Please check config.js.",
                "API_NOT_CONFIGURED"
            );
        }


        if (
            !API_URL.includes(
                "script.google.com/macros/s/"
            )
        ) {

            throw new StockFlowAPIError(
                "The configured API URL is not a valid " +
                "Google Apps Script Web App URL.",
                "INVALID_API_URL"
            );
        }


        if (
            !API_URL.endsWith("/exec")
        ) {

            throw new StockFlowAPIError(
                "The Google Apps Script URL must end with /exec.",
                "INVALID_API_ENDPOINT"
            );
        }
    }


    /* =========================================================
       RESPONSE PARSER
       ========================================================= */

    async function parseResponse(
        response
    ) {

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


        /* -----------------------------------------------------
           HTTP FAILURE
           ----------------------------------------------------- */

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


        /* -----------------------------------------------------
           APPLICATION FAILURE
           ----------------------------------------------------- */

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
                        method:
                            API_CONFIG.METHOD ||
                            "POST",

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

            /* -------------------------------------------------
               TIMEOUT
               ------------------------------------------------- */

            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                throw new StockFlowAPIError(
                    "The StockFlow server took too long " +
                    "to respond.",
                    "TIMEOUT"
                );
            }


            /* -------------------------------------------------
               OUR ERROR
               ------------------------------------------------- */

            if (
                error instanceof
                StockFlowAPIError
            ) {

                throw error;
            }


            /* -------------------------------------------------
               NETWORK / CORS
               ------------------------------------------------- */

            throw new StockFlowAPIError(
                "Unable to connect to the StockFlow server. " +
                "Please check your internet connection " +
                "and Apps Script deployment.",
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

    function normalizeResult(
        result
    ) {

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
       AUTHENTICATION
       ========================================================= */

    async function register(
        data = {}
    ) {

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


    async function login(
        data = {}
    ) {

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

    async function verifyOtp(
        data = {}
    ) {

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


    async function prepareOtp(
        data = {}
    ) {

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


    async function resendOtp(
        data = {}
    ) {

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


    async function updateOtp(
        data = {}
    ) {

        return resendOtp(data);
    }


    /* =========================================================
       SESSION
       ========================================================= */

    function getToken(
        suppliedToken = ""
    ) {

        return (
            suppliedToken ||
            localStorage.getItem(
                "STOCKFLOW_TOKEN"
            ) ||
            ""
        );
    }


    async function session(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "session",
                {

                    token:
                        getToken(
                            data.token
                        )
                }
            )
        );
    }


    async function requireSession(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "requireSession",
                {

                    token:
                        getToken(
                            data.token
                        )
                }
            )
        );
    }


    async function logout(
        data = {}
    ) {

        return normalizeResult(
            await request(
                "logout",
                {

                    token:
                        getToken(
                            data.token
                        )
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
                        getToken(
                            data.token
                        ),

                    limit:
                        data.limit || 100
                }
            )
        );
    }


    /* =========================================================
       GENERIC INVENTORY
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
                        getToken(
                            data.token
                        ),

                    ...data
                }
            )
        );
    }


    /* =========================================================
       PRODUCTS
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
       CATEGORIES
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
       SUPPLIERS
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
       STOCK
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
                        method:
                            "GET",

                        redirect:
                            "follow",

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
       PUBLIC API
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

        /* Inventory */
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

        /* Error */
        StockFlowAPIError
    };


    /* =========================================================
       GLOBAL EXPORT
       ========================================================= */

    window.StockFlowAPI =
        StockFlowAPI;


    /*
     * Compatibility with older files.
     */
    window.API =
        StockFlowAPI;


    /* =========================================================
       DEBUG
       ========================================================= */

    if (
        CONFIG.DEBUG === true
    ) {

        console.log(
            "%cStockFlow API loaded",
            "font-weight:bold;"
        );

        console.log(
            "API endpoint:",
            API_URL
        );

        console.log(
            "Request timeout:",
            REQUEST_TIMEOUT + "ms"
        );
    }


})(window);
