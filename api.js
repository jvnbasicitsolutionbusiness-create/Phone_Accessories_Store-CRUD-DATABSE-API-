/*
=========================================================
STOCKFLOW API CLIENT
Phone Accessories Inventory Management System
=========================================================

PURPOSE
-------
Frontend communication layer between:

    HTML / JavaScript
          ↓
       api.js
          ↓
Google Apps Script Web App
          ↓
 Google Sheets / Firebase

IMPORTANT
---------
- api.js DOES NOT generate OTPs.
- api.js DOES NOT redirect pages.
- api.js DOES NOT store passwords.
- OTP generation is handled by the backend.
- In DEMO_MODE, the backend may return demoOtp.
=========================================================
*/

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const CONFIG =
        window.STOCKFLOW_CONFIG ||
        window.CONFIG ||
        {};

    const API_CONFIG =
        CONFIG.API || {};

    const API_URL =
        CONFIG.API_URL ||
        CONFIG.APPS_SCRIPT_URL ||
        CONFIG.GOOGLE_APPS_SCRIPT_URL ||
        CONFIG.BACKEND_URL ||
        "";

    const REQUEST_TIMEOUT =
        Number(
            API_CONFIG.TIMEOUT ||
            CONFIG.API_TIMEOUT ||
            30000
        );

    const RETRY_COUNT =
        Number(
            API_CONFIG.RETRY_COUNT ||
            CONFIG.API_RETRY_COUNT ||
            0
        );

    const RETRY_DELAY =
        Number(
            API_CONFIG.RETRY_DELAY ||
            CONFIG.API_RETRY_DELAY ||
            1000
        );

    const HTTP_METHOD =
        API_CONFIG.METHOD ||
        "POST";

    const CONTENT_TYPE =
        API_CONFIG.CONTENT_TYPE ||
        "text/plain;charset=utf-8";


    /* =====================================================
       CUSTOM ERROR
       ===================================================== */

    class StockFlowAPIError extends Error {

        constructor(
            message,
            options = {}
        ) {

            super(message);

            this.name =
                "StockFlowAPIError";

            this.code =
                options.code ||
                "API_ERROR";

            this.status =
                options.status ||
                null;

            this.action =
                options.action ||
                null;

            this.response =
                options.response ||
                null;

            this.data =
                options.data ||
                null;
        }
    }


    /* =====================================================
       BASIC HELPERS
       ===================================================== */

    function isObject(value) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    function cleanValue(value) {

        if (
            value === null ||
            typeof value === "undefined"
        ) {
            return "";
        }

        return String(value).trim();
    }


    function firstValue() {

        for (
            let i = 0;
            i < arguments.length;
            i++
        ) {

            const value =
                cleanValue(arguments[i]);

            if (value) {
                return value;
            }
        }

        return "";
    }


    /* =====================================================
       IDENTITY RESOLUTION
       ===================================================== */

    /*
     * The backend needs an identity when verifying or
     * preparing an OTP.
     *
     * Priority:
     *
     * identity
     * username
     * gmail
     * email
     * phone
     * uid
     */

    function resolveIdentity(data = {}) {

        return firstValue(
            data.identity,
            data.username,
            data.gmail,
            data.email,
            data.phone,
            data.uid
        );
    }


    /* =====================================================
       NORMALIZE REQUEST DATA
       ===================================================== */

    function normalizeOtpData(data = {}) {

        const input =
            isObject(data)
                ? { ...data }
                : {};

        const identity =
            resolveIdentity(input);

        const username =
            firstValue(
                input.username
            );

        const gmail =
            firstValue(
                input.gmail,
                input.email
            );

        const email =
            firstValue(
                input.email,
                input.gmail
            );

        const phone =
            firstValue(
                input.phone,
                input.phoneNumber,
                input.mobile,
                input.mobileNumber
            );

        const uid =
            firstValue(
                input.uid,
                input.userId,
                input.UID
            );

        const channel =
            firstValue(
                input.channel,
                input.otpChannel
            );

        return {

            ...input,

            identity,

            username,

            gmail,

            email,

            phone,

            uid,

            channel
        };
    }


    /* =====================================================
       API URL VALIDATION
       ===================================================== */

    function validateApiUrl() {

        if (!API_URL) {

            throw new StockFlowAPIError(
                "API URL is not configured.",
                {
                    code: "API_URL_MISSING"
                }
            );
        }


        if (
            !API_URL.includes(
                "script.google.com/macros/s/"
            )
        ) {

            throw new StockFlowAPIError(
                "The configured API URL is not a valid Google Apps Script Web App URL.",
                {
                    code: "API_URL_INVALID"
                }
            );
        }
    }


    /* =====================================================
       JSON PARSER
       ===================================================== */

    function parseJson(text) {

        const raw =
            cleanValue(text);

        if (!raw) {

            throw new StockFlowAPIError(
                "The server returned an empty response.",
                {
                    code: "EMPTY_RESPONSE"
                }
            );
        }


        try {

            return JSON.parse(raw);

        } catch (error) {

            console.error(
                "[STOCKFLOW API] Invalid JSON response:",
                raw
            );

            throw new StockFlowAPIError(
                "The server returned an invalid response.",
                {
                    code: "INVALID_JSON",
                    response: raw
                }
            );
        }
    }


    /* =====================================================
       RESPONSE NORMALIZATION
       ===================================================== */

    function normalizeResponse(result) {

        if (!isObject(result)) {

            return {
                success: true,
                data: result
            };
        }


        /*
         * Some Apps Script responses may return:
         *
         * {
         *     success: true,
         *     data: {...}
         * }
         *
         * Others may return the useful fields directly.
         *
         * Keep the original object intact.
         */

        return result;
    }


    /* =====================================================
       RESPONSE SUCCESS CHECK
       ===================================================== */

    function isSuccessfulResponse(result) {

        if (!isObject(result)) {
            return true;
        }


        if (
            result.success === false ||
            result.ok === false
        ) {
            return false;
        }


        if (
            result.status &&
            String(result.status)
                .toLowerCase() === "error"
        ) {
            return false;
        }


        return true;
    }


    /* =====================================================
       ERROR MESSAGE EXTRACTION
       ===================================================== */

    function getServerErrorMessage(result) {

        if (!result) {

            return "The server returned an error.";
        }


        if (typeof result === "string") {

            return result;
        }


        return firstValue(

            result.message,

            result.error,

            result.details,

            result.data &&
            result.data.message,

            result.data &&
            result.data.error,

            "The server rejected the request."
        );
    }


    /* =====================================================
       DELAY
       ===================================================== */

    function delay(ms) {

        return new Promise(
            resolve =>
                setTimeout(resolve, ms)
        );
    }


    /* =====================================================
       REQUEST
       ===================================================== */

    async function request(
        action,
        payload = {},
        options = {}
    ) {

        validateApiUrl();


        if (!action) {

            throw new StockFlowAPIError(
                "API action is required.",
                {
                    code: "ACTION_MISSING"
                }
            );
        }


        const body = {

            action,

            ...(isObject(payload)
                ? payload
                : {})
        };


        const attempts =
            Math.max(
                0,
                Number(
                    options.retryCount ??
                    RETRY_COUNT
                )
            );


        let lastError = null;


        for (
            let attempt = 0;
            attempt <= attempts;
            attempt++
        ) {

            const controller =
                new AbortController();

            const timeoutId =
                setTimeout(
                    () =>
                        controller.abort(),
                    REQUEST_TIMEOUT
                );


            try {

                const response =
                    await fetch(
                        API_URL,
                        {
                            method:
                                HTTP_METHOD,

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


                clearTimeout(timeoutId);


                const text =
                    await response.text();


                let result;

                try {

                    result =
                        parseJson(text);

                } catch (parseError) {

                    /*
                     * HTTP response succeeded but the
                     * response body was not JSON.
                     */

                    if (
                        !response.ok
                    ) {

                        throw new StockFlowAPIError(
                            "The server returned HTTP " +
                            response.status +
                            ".",
                            {
                                code:
                                    "HTTP_ERROR",

                                status:
                                    response.status,

                                action,

                                response:
                                    text
                            }
                        );
                    }

                    throw parseError;
                }


                result =
                    normalizeResponse(result);


                /* -----------------------------------------
                   SERVER ERROR
                   ----------------------------------------- */

                if (
                    !isSuccessfulResponse(result)
                ) {

                    throw new StockFlowAPIError(
                        getServerErrorMessage(
                            result
                        ),
                        {
                            code:
                                result.code ||
                                "SERVER_ERROR",

                            status:
                                response.status,

                            action,

                            response:
                                result,

                            data:
                                result.data ||
                                null
                        }
                    );
                }


                /* -----------------------------------------
                   HTTP ERROR
                   ----------------------------------------- */

                if (!response.ok) {

                    throw new StockFlowAPIError(
                        getServerErrorMessage(
                            result
                        ),
                        {
                            code:
                                "HTTP_ERROR",

                            status:
                                response.status,

                            action,

                            response:
                                result
                        }
                    );
                }


                return result;


            } catch (error) {

                clearTimeout(timeoutId);


                /*
                 * Preserve our own API errors.
                 */

                if (
                    error instanceof
                    StockFlowAPIError
                ) {

                    lastError =
                        error;

                } else if (
                    error &&
                    error.name ===
                    "AbortError"
                ) {

                    lastError =
                        new StockFlowAPIError(
                            "The request timed out. Please try again.",
                            {
                                code:
                                    "TIMEOUT",

                                action
                            }
                        );

                } else {

                    console.error(
                        "[STOCKFLOW API NETWORK ERROR]",
                        error
                    );

                    lastError =
                        new StockFlowAPIError(
                            "Unable to connect to the verification service.",
                            {
                                code:
                                    "NETWORK_ERROR",

                                action
                            }
                        );
                }


                /*
                 * Retry only when another attempt
                 * is available.
                 */

                if (
                    attempt < attempts
                ) {

                    await delay(
                        RETRY_DELAY
                    );

                    continue;
                }


                throw lastError;
            }
        }


        throw new StockFlowAPIError(
            "Unable to complete the request.",
            {
                code:
                    "REQUEST_FAILED",

                action
            }
        );
    }


    /* =====================================================
       REGISTER
       ===================================================== */

    async function register(data = {}) {

        return request(
            "register",
            {
                ...data,

                role:
                    data.role ||
                    "Employee"
            }
        );
    }


    /* =====================================================
       LOGIN
       ===================================================== */

    async function login(data = {}) {

        const identity =
            resolveIdentity(data);

        return request(
            "login",
            {
                ...data,

                identity
            }
        );
    }


    /* =====================================================
       PREPARE OTP
       ===================================================== */

    /*
     * IMPORTANT:
     *
     * This does NOT generate the OTP locally.
     *
     * The backend generates the OTP and stores it in:
     *
     * Google Sheets
     * Firebase
     *
     * In DEMO_MODE the backend may return:
     *
     * demoOtp
     */

    async function prepareOtp(data = {}) {

        const otpData =
            normalizeOtpData(data);


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username or Gmail is required.",
                {
                    code:
                        "OTP_IDENTITY_MISSING",

                    action:
                        "prepareOtp"
                }
            );
        }


        return request(
            "prepareOtp",
            otpData
        );
    }


    /* =====================================================
       GENERATE OTP
       ===================================================== */

    /*
     * Backend compatibility alias.
     *
     * Some versions of Code.gs use:
     *
     * generateOtp
     *
     * while the frontend uses:
     *
     * prepareOtp
     */

    async function generateOtp(data = {}) {

        const otpData =
            normalizeOtpData(data);


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username or Gmail is required.",
                {
                    code:
                        "OTP_IDENTITY_MISSING",

                    action:
                        "generateOtp"
                }
            );
        }


        return request(
            "generateOtp",
            otpData
        );
    }


    /* =====================================================
       VERIFY OTP
       ===================================================== */

    async function verifyOtp(data = {}) {

        const otpData =
            normalizeOtpData(data);


        const otp =
            firstValue(
                otpData.otp,
                otpData.code,
                otpData.OTP
            );


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username or Gmail is required.",
                {
                    code:
                        "OTP_IDENTITY_MISSING",

                    action:
                        "verifyOtp"
                }
            );
        }


        if (!otp) {

            throw new StockFlowAPIError(
                "Please enter the verification code.",
                {
                    code:
                        "OTP_MISSING",

                    action:
                        "verifyOtp"
                }
            );
        }


        return request(
            "verifyOtp",
            {
                ...otpData,

                otp
            }
        );
    }


    /* =====================================================
       RESEND OTP
       ===================================================== */

    async function resendOtp(
        data = {}
    ) {

        const otpData =
            normalizeOtpData(data);


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username or Gmail is required.",
                {
                    code:
                        "OTP_IDENTITY_MISSING",

                    action:
                        "resendOtp"
                }
            );
        }


        return request(
            "resendOtp",
            otpData
        );
    }


    /* =====================================================
       UPDATE OTP
       ===================================================== */

    async function updateOtp(
        data = {}
    ) {

        /*
         * Backend compatibility alias.
         *
         * Existing frontend code may call updateOtp().
         * The backend's resend operation is the actual
         * OTP regeneration operation.
         */

        return resendOtp(data);
    }


    /* =====================================================
       SESSION
       ===================================================== */

    async function session(
        data = {}
    ) {

        return request(
            "session",
            data
        );
    }


    /* =====================================================
       REQUIRE SESSION
       ===================================================== */

    async function requireSession(
        data = {}
    ) {

        return request(
            "session",
            data
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logout(
        data = {}
    ) {

        return request(
            "logout",
            data
        );
    }


    /* =====================================================
       FORGOT PASSWORD
       ===================================================== */

    async function forgotPassword(
        data = {}
    ) {

        const identity =
            resolveIdentity(data);


        if (!identity) {

            throw new StockFlowAPIError(
                "Username, Gmail, or phone number is required.",
                {
                    code:
                        "RECOVERY_IDENTITY_MISSING",

                    action:
                        "forgotPassword"
                }
            );
        }


        return request(
            "forgotPassword",
            {
                ...data,

                identity
            }
        );
    }


    /* =====================================================
       VERIFY RECOVERY OTP
       ===================================================== */

    async function verifyRecoveryOtp(
        data = {}
    ) {

        const otpData =
            normalizeOtpData(data);


        const otp =
            firstValue(
                otpData.otp,
                otpData.code,
                otpData.OTP
            );


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username, Gmail, or phone number is required.",
                {
                    code:
                        "RECOVERY_IDENTITY_MISSING",

                    action:
                        "verifyRecoveryOtp"
                }
            );
        }


        if (!otp) {

            throw new StockFlowAPIError(
                "Please enter the recovery verification code.",
                {
                    code:
                        "RECOVERY_OTP_MISSING",

                    action:
                        "verifyRecoveryOtp"
                }
            );
        }


        return request(
            "verifyRecoveryOtp",
            {
                ...otpData,

                otp
            }
        );
    }


    /* =====================================================
       RESET PASSWORD
       ===================================================== */

    async function resetPassword(
        data = {}
    ) {

        return request(
            "resetPassword",
            data
        );
    }


    /* =====================================================
       ACTIVITY
       ===================================================== */

    async function listActivity(
        data = {}
    ) {

        return request(
            "listActivity",
            data
        );
    }


    /* =====================================================
       INVENTORY
       ===================================================== */

    async function inventory(
        data = {}
    ) {

        return request(
            "inventory",
            data
        );
    }


    /* =====================================================
       PRODUCTS
       ===================================================== */

    async function listProducts(
        data = {}
    ) {

        return request(
            "listProducts",
            data
        );
    }


    async function createProduct(
        data = {}
    ) {

        return request(
            "createProduct",
            data
        );
    }


    async function updateProduct(
        data = {}
    ) {

        return request(
            "updateProduct",
            data
        );
    }


    async function deleteProduct(
        data = {}
    ) {

        return request(
            "deleteProduct",
            data
        );
    }


    /* =====================================================
       CATEGORIES
       ===================================================== */

    async function listCategories(
        data = {}
    ) {

        return request(
            "listCategories",
            data
        );
    }


    async function createCategory(
        data = {}
    ) {

        return request(
            "createCategory",
            data
        );
    }


    async function updateCategory(
        data = {}
    ) {

        return request(
            "updateCategory",
            data
        );
    }


    async function deleteCategory(
        data = {}
    ) {

        return request(
            "deleteCategory",
            data
        );
    }


    /* =====================================================
       SUPPLIERS
       ===================================================== */

    async function listSuppliers(
        data = {}
    ) {

        return request(
            "listSuppliers",
            data
        );
    }


    async function createSupplier(
        data = {}
    ) {

        return request(
            "createSupplier",
            data
        );
    }


    async function updateSupplier(
        data = {}
    ) {

        return request(
            "updateSupplier",
            data
        );
    }


    async function deleteSupplier(
        data = {}
    ) {

        return request(
            "deleteSupplier",
            data
        );
    }


    /* =====================================================
       STOCK IN
       ===================================================== */

    async function listStockIn(
        data = {}
    ) {

        return request(
            "listStockIn",
            data
        );
    }


    async function createStockIn(
        data = {}
    ) {

        return request(
            "createStockIn",
            data
        );
    }


    /* =====================================================
       STOCK OUT
       ===================================================== */

    async function listStockOut(
        data = {}
    ) {

        return request(
            "listStockOut",
            data
        );
    }


    async function createStockOut(
        data = {}
    ) {

        return request(
            "createStockOut",
            data
        );
    }


    /* =====================================================
       TRANSACTIONS
       ===================================================== */

    async function listTransactions(
        data = {}
    ) {

        return request(
            "listTransactions",
            data
        );
    }


    /* =====================================================
       DASHBOARD
       ===================================================== */

    async function dashboard(
        data = {}
    ) {

        return request(
            "dashboard",
            data
        );
    }


    /* =====================================================
       HEALTH CHECK
       ===================================================== */

    async function health(
        data = {}
    ) {

        return request(
            "health",
            data
        );
    }


    /* =====================================================
       API OBJECT
       ===================================================== */

    const StockFlowAPI = {

        /* Core */
        request,

        /* Authentication */
        register,
        login,
        session,
        requireSession,
        logout,

        /* OTP */
        prepareOtp,
        generateOtp,
        verifyOtp,
        resendOtp,
        updateOtp,

        /* Password Recovery */
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

        /* Health */
        health,

        /* Utilities */
        resolveIdentity,

        /* Error */
        StockFlowAPIError
    };


    /* =====================================================
       GLOBAL EXPORT
       ===================================================== */

    window.StockFlowAPI =
        StockFlowAPI;


    /*
     * Backward compatibility.
     *
     * Some older files may reference:
     *
     * window.API
     */

    window.API =
        StockFlowAPI;


    /* =====================================================
       DEBUG INFORMATION
       ===================================================== */

    if (
        CONFIG.DEBUG === true
    ) {

        console.log(
            "[STOCKFLOW API] Loaded."
        );

        console.log(
            "[STOCKFLOW API] Endpoint:",
            API_URL
        );

        console.log(
            "[STOCKFLOW API] Method:",
            HTTP_METHOD
        );

        console.log(
            "[STOCKFLOW API] Timeout:",
            REQUEST_TIMEOUT + "ms"
        );

        console.log(
            "[STOCKFLOW API] Retry Count:",
            RETRY_COUNT
        );

        console.log(
            "[STOCKFLOW API] Demo Mode:",
            CONFIG.DEMO_MODE === true
        );
    }

})();
