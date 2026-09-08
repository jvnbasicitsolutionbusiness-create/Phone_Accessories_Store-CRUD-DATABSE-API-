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

IMPORTANT FOR GOOGLE APPS SCRIPT
--------------------------------
The frontend sends JSON using:

    Content-Type: text/plain;charset=utf-8

This avoids an unnecessary CORS preflight request.

The Apps Script Web App must be deployed as:

    Execute as: Me
    Who has access: Anyone

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


    const RETRY_COUNT =
        Number(
            API_CONFIG.RETRY_COUNT ??
            CONFIG.API_RETRY_COUNT ??
            0
        );


    const RETRY_DELAY =
        Number(
            API_CONFIG.RETRY_DELAY ??
            CONFIG.API_RETRY_DELAY ??
            1000
        );


    const HTTP_METHOD =
        String(
            API_CONFIG.METHOD ||
            "POST"
        ).toUpperCase();


    const CONTENT_TYPE =
        API_CONFIG.CONTENT_TYPE ||
        "text/plain;charset=utf-8";


    /* =====================================================
       CUSTOM ERROR
       ===================================================== */

    class StockFlowAPIError extends Error {

        constructor(message, options = {}) {

            super(
                message ||
                "An unknown API error occurred."
            );

            this.name =
                "StockFlowAPIError";

            this.code =
                options.code ||
                "API_ERROR";

            this.status =
                options.status ??
                null;

            this.action =
                options.action ||
                null;

            this.response =
                options.response ??
                null;

            this.data =
                options.data ??
                null;

            this.originalError =
                options.originalError ??
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

    function resolveIdentity(data = {}) {

        if (!isObject(data)) {

            return "";
        }


        return firstValue(

            data.identity,

            data.username,

            data.gmail,

            data.email,

            data.phone,

            data.phoneNumber,

            data.mobile,

            data.mobileNumber,

            data.uid,

            data.userId,

            data.UID
        );
    }


    /* =====================================================
       OTP DATA NORMALIZATION
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
                "The Google Apps Script API URL is missing.",
                {
                    code:
                        "API_URL_MISSING"
                }
            );
        }


        if (
            !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i
                .test(API_URL)
        ) {

            throw new StockFlowAPIError(
                "The configured API URL is not a valid Google Apps Script Web App URL.",
                {
                    code:
                        "API_URL_INVALID"
                }
            );
        }
    }


    /* =====================================================
       SAFE JSON PARSER
       ===================================================== */

    function parseJson(text) {

        const raw =
            cleanValue(text);


        if (!raw) {

            throw new StockFlowAPIError(
                "The Google Apps Script returned an empty response.",
                {
                    code:
                        "EMPTY_RESPONSE",

                    response:
                        raw
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
                "The server returned an invalid response. Check the Google Apps Script Web App deployment.",
                {
                    code:
                        "INVALID_JSON",

                    response:
                        raw,

                    originalError:
                        error
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

                success:
                    true,

                data:
                    result
            };
        }


        /*
         * Keep the backend response intact.
         *
         * This is important because different
         * StockFlow modules may return:
         *
         * {
         *     success: true,
         *     data: {...}
         * }
         *
         * OR:
         *
         * {
         *     success: true,
         *     token: "...",
         *     user: {...}
         * }
         */

        return result;
    }


    /* =====================================================
       SUCCESS CHECK
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
       SERVER ERROR MESSAGE
       ===================================================== */

    function getServerErrorMessage(result) {

        if (!result) {

            return "The server returned an unknown error.";
        }


        if (
            typeof result === "string"
        ) {

            return result;
        }


        if (
            !isObject(result)
        ) {

            return "The server rejected the request.";
        }


        return firstValue(

            result.message,

            result.error,

            result.details,

            result.reason,

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
                setTimeout(
                    resolve,
                    ms
                )
        );
    }


    /* =====================================================
       RETRY POLICY
       ===================================================== */

    /*
     * NEVER automatically retry operations that can
     * create or modify data.
     *
     * Examples:
     *
     * register
     * createProduct
     * updateProduct
     * deleteProduct
     * createStockIn
     * createStockOut
     * resetPassword
     *
     * Automatic retry is only allowed for safe
     * read/session/health operations.
     */

    function canRetryAction(action) {

        const safeActions = [

            "health",

            "session",

            "listActivity",

            "inventory",

            "listProducts",

            "listCategories",

            "listSuppliers",

            "listStockIn",

            "listStockOut",

            "listTransactions",

            "dashboard"
        ];


        return safeActions.includes(
            String(action)
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
                    code:
                        "ACTION_MISSING"
                }
            );
        }


        const body = {

            action,

            ...(
                isObject(payload)
                    ? payload
                    : {}
            )
        };


        /*
         * Only use configured retries when the
         * action is safe to retry.
         */

        const configuredRetries =
            Math.max(
                0,
                Number(
                    options.retryCount ??
                    RETRY_COUNT
                )
            );


        const attempts =
            canRetryAction(action)
                ? configuredRetries
                : 0;


        let lastError =
            null;


        for (
            let attempt = 0;
            attempt <= attempts;
            attempt++
        ) {

            const controller =
                new AbortController();


            const timeoutId =
                setTimeout(
                    () => {
                        controller.abort();
                    },
                    REQUEST_TIMEOUT
                );


            try {

                /*
                 * IMPORTANT:
                 *
                 * credentials are omitted because
                 * Google Apps Script authentication
                 * is handled by the Web App deployment.
                 */

                const response =
                    await fetch(
                        API_URL,
                        {

                            method:
                                HTTP_METHOD,

                            headers: {

                                "Content-Type":
                                    CONTENT_TYPE,

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    body
                                ),

                            redirect:
                                "follow",

                            credentials:
                                "omit",

                            mode:
                                "cors",

                            signal:
                                controller.signal
                        }
                    );


                clearTimeout(
                    timeoutId
                );


                const text =
                    await response.text();


                console.log(
                    "[STOCKFLOW API] Response",
                    {
                        action,
                        status:
                            response.status,
                        ok:
                            response.ok
                    }
                );


                let result;


                /*
                 * Parse the response.
                 */

                try {

                    result =
                        parseJson(text);

                } catch (parseError) {

                    /*
                     * If HTTP itself failed, expose
                     * the HTTP status instead of hiding it.
                     */

                    if (
                        !response.ok
                    ) {

                        throw new StockFlowAPIError(
                            "Google Apps Script returned HTTP " +
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
                    normalizeResponse(
                        result
                    );


                /* =========================================
                   BACKEND ERROR
                   ========================================= */

                if (
                    !isSuccessfulResponse(
                        result
                    )
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


                /* =========================================
                   HTTP ERROR
                   ========================================= */

                if (
                    !response.ok
                ) {

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
                                result,

                            data:
                                result.data ||
                                null
                        }
                    );
                }


                /*
                 * SUCCESS
                 */

                return result;


            } catch (error) {

                clearTimeout(
                    timeoutId
                );


                /* =========================================
                   OUR OWN API ERROR
                   ========================================= */

                if (
                    error instanceof
                    StockFlowAPIError
                ) {

                    lastError =
                        error;

                }


                /* =========================================
                   TIMEOUT
                   ========================================= */

                else if (
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

                                action,

                                originalError:
                                    error
                            }
                        );
                }


                /* =========================================
                   NETWORK / CORS / FETCH ERROR
                   ========================================= */

                else {

                    console.error(
                        "[STOCKFLOW API] Fetch failed.",
                        {
                            action,
                            url:
                                API_URL,
                            error:
                                error
                        }
                    );


                    let message =
                        "Unable to connect to the verification service.";


                    /*
                     * Give a useful development
                     * message instead of hiding the
                     * actual problem.
                     */

                    if (
                        CONFIG.DEBUG === true
                    ) {

                        if (
                            error &&
                            error.message
                        ) {

                            message =
                                "Unable to connect to the Google Apps Script Web App. " +
                                error.message;
                        }

                    }


                    lastError =
                        new StockFlowAPIError(
                            message,
                            {

                                code:
                                    "NETWORK_ERROR",

                                action,

                                originalError:
                                    error
                            }
                        );
                }


                /* =========================================
                   RETRY
                   ========================================= */

                if (
                    attempt < attempts
                ) {

                    console.warn(
                        "[STOCKFLOW API] Retrying:",
                        {
                            action,
                            attempt:
                                attempt + 1,
                            maxRetries:
                                attempts
                        }
                    );


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
            resolveIdentity(
                data
            );


        if (!identity) {

            throw new StockFlowAPIError(
                "Username, Gmail, or phone number is required.",
                {

                    code:
                        "LOGIN_IDENTITY_MISSING",

                    action:
                        "login"
                }
            );
        }


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

    async function prepareOtp(
        data = {}
    ) {

        const otpData =
            normalizeOtpData(
                data
            );


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username, Gmail, or phone number is required.",
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

    async function generateOtp(
        data = {}
    ) {

        const otpData =
            normalizeOtpData(
                data
            );


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username, Gmail, or phone number is required.",
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

    async function verifyOtp(
        data = {}
    ) {

        const otpData =
            normalizeOtpData(
                data
            );


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
            normalizeOtpData(
                data
            );


        if (!otpData.identity) {

            throw new StockFlowAPIError(
                "Username, Gmail, or phone number is required.",
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

        return resendOtp(
            data
        );
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
            resolveIdentity(
                data
            );


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
            normalizeOtpData(
                data
            );


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
            "=========================================="
        );

        console.log(
            "[STOCKFLOW API] API CLIENT LOADED"
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
            "[STOCKFLOW API] Content-Type:",
            CONTENT_TYPE
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

        console.log(
            "=========================================="
        );
    }

})();
