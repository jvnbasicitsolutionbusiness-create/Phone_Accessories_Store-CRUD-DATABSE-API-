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
- Backend controls authentication.
- Backend controls OTP generation.
- Backend controls account status.
- Backend controls password recovery.

GOOGLE APPS SCRIPT
------------------
Frontend sends JSON using:

    Content-Type: text/plain;charset=utf-8

This avoids an unnecessary CORS preflight request.

Apps Script Web App should be deployed as:

    Execute as: Me
    Who has access: Anyone

ERROR HANDLING
--------------
Backend/business errors are preserved.

Examples:

    ACCOUNT_NOT_FOUND
    INVALID_CREDENTIALS
    ACCOUNT_SUSPENDED
    ACCOUNT_DISABLED
    ACCOUNT_BLOCKED
    ACCOUNT_PENDING
    REQUIRES_VERIFICATION
    INVALID_OTP
    OTP_EXPIRED
    OTP_LOCKED

These are NOT network errors.

Only actual communication/transport problems are
classified as network/API errors.

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
            API_CONFIG.TIMEOUT ??
            CONFIG.API_TIMEOUT ??
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
        String(
            API_CONFIG.CONTENT_TYPE ||
            "text/plain;charset=utf-8"
        );


    /* =====================================================
       CUSTOM ERROR
       ===================================================== */

    class StockFlowAPIError extends Error {

        constructor(
            message,
            options = {}
        ) {

            super(
                message ||
                "An unknown API error occurred."
            );


            this.name =
                "StockFlowAPIError";


            this.code =
                String(
                    options.code ||
                    "API_ERROR"
                )
                    .trim()
                    .toUpperCase();


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


            /*
             * Useful when debugging the
             * actual HTTP response.
             */

            this.rawResponse =
                options.rawResponse ??
                null;


            this.isNetworkError =
                this.code ===
                "NETWORK_ERROR";


            this.isTimeout =
                this.code ===
                "TIMEOUT";


            this.isBackendError =
                !this.isNetworkError &&
                !this.isTimeout &&
                this.code !==
                    "API_URL_MISSING" &&
                this.code !==
                    "API_URL_INVALID" &&
                this.code !==
                    "EMPTY_RESPONSE" &&
                this.code !==
                    "INVALID_JSON" &&
                this.code !==
                    "HTTP_ERROR";

        }

    }


    /* =====================================================
       BASIC HELPERS
       ===================================================== */

    function isObject(
        value
    ) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );

    }


    function cleanValue(
        value
    ) {

        if (
            value === null ||
            typeof value ===
                "undefined"
        ) {

            return "";

        }


        return String(
            value
        ).trim();

    }


    function firstValue() {

        for (
            let i = 0;
            i < arguments.length;
            i++
        ) {

            const value =
                cleanValue(
                    arguments[i]
                );


            if (value) {

                return value;

            }

        }


        return "";

    }


    function normalizeCode(
        value
    ) {

        return cleanValue(
            value
        )
            .toUpperCase()
            .replace(
                /\s+/g,
                "_"
            );

    }


    /* =====================================================
       IDENTITY RESOLUTION
       ===================================================== */

    function resolveIdentity(
        data = {}
    ) {

        if (
            !isObject(data)
        ) {

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

    function normalizeOtpData(
        data = {}
    ) {

        const input =
            isObject(data)
                ? {
                    ...data
                }
                : {};


        const identity =
            resolveIdentity(
                input
            );


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

        if (
            !API_URL
        ) {

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
                .test(
                    API_URL
                )
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
       JSON PARSER
       ===================================================== */

    function parseJson(
        text,
        action
    ) {

        const raw =
            typeof text ===
                "string"
                ? text.trim()
                : "";


        if (
            !raw
        ) {

            throw new StockFlowAPIError(
                "The Google Apps Script returned an empty response.",
                {

                    code:
                        "EMPTY_RESPONSE",

                    action,

                    response:
                        raw,

                    rawResponse:
                        raw

                }
            );

        }


        try {

            return JSON.parse(
                raw
            );

        } catch (
            error
        ) {

            console.error(
                "[STOCKFLOW API] Invalid JSON response:",
                {

                    action,

                    raw

                }
            );


            throw new StockFlowAPIError(
                "The server returned an invalid response. Check the Google Apps Script Web App deployment.",
                {

                    code:
                        "INVALID_JSON",

                    action,

                    response:
                        raw,

                    rawResponse:
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

    function normalizeResponse(
        result
    ) {

        if (
            !isObject(result)
        ) {

            return {

                success:
                    true,

                data:
                    result

            };

        }


        /*
         * Do not destroy or rewrite the backend response.
         *
         * The backend may return:
         *
         * {
         *     success: true,
         *     user: {...}
         * }
         *
         * or:
         *
         * {
         *     success: false,
         *     code: "ACCOUNT_NOT_FOUND",
         *     message: "Account does not exist."
         * }
         *
         * Both must remain intact.
         */

        return {
            ...result
        };

    }


    /* =====================================================
       SUCCESS CHECK
       ===================================================== */

    function isSuccessfulResponse(
        result
    ) {

        if (
            !isObject(result)
        ) {

            return true;

        }


        if (
            result.success ===
                false
        ) {

            return false;

        }


        if (
            result.ok ===
                false
        ) {

            return false;

        }


        if (
            result.status &&
            String(
                result.status
            )
                .toLowerCase() ===
                "error"
        ) {

            return false;

        }


        return true;

    }


    /* =====================================================
       SERVER ERROR MESSAGE
       ===================================================== */

    function getServerErrorMessage(
        result
    ) {

        if (
            !result
        ) {

            return (
                "The server returned an unknown error."
            );

        }


        if (
            typeof result ===
                "string"
        ) {

            return result;

        }


        if (
            !isObject(result)
        ) {

            return (
                "The server rejected the request."
            );

        }


        const nestedData =
            isObject(
                result.data
            )
                ? result.data
                : null;


        return firstValue(

            result.message,

            result.error,

            result.details,

            result.reason,

            nestedData &&
                nestedData.message,

            nestedData &&
                nestedData.error,

            "The server rejected the request."

        );

    }


    /* =====================================================
       SERVER ERROR CODE
       ===================================================== */

    function getServerErrorCode(
        result
    ) {

        if (
            !result
        ) {

            return "SERVER_ERROR";

        }


        if (
            typeof result ===
                "string"
        ) {

            return "SERVER_ERROR";

        }


        if (
            !isObject(result)
        ) {

            return "SERVER_ERROR";

        }


        const nestedData =
            isObject(
                result.data
            )
                ? result.data
                : null;


        return normalizeCode(

            firstValue(

                result.code,

                result.errorCode,

                result.error_code,

                nestedData &&
                    nestedData.code,

                nestedData &&
                    nestedData.errorCode,

                "SERVER_ERROR"

            )

        ) || "SERVER_ERROR";

    }


    /* =====================================================
       DEBUG RESPONSE
       ===================================================== */

    function debugResponse(
        action,
        response,
        result
    ) {

        if (
            CONFIG.DEBUG !== true
        ) {

            return;

        }


        console.log(
            "[STOCKFLOW API] Server response:",
            {

                action,

                httpStatus:
                    response.status,

                httpOk:
                    response.ok,

                result

            }
        );

    }


    /* =====================================================
       DELAY
       ===================================================== */

    function delay(
        ms
    ) {

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
     * Only safe operations may automatically retry.
     *
     * Authentication, registration, OTP generation,
     * password reset and data modification are NOT
     * automatically retried.
     */

    function canRetryAction(
        action
    ) {

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
            String(
                action
            )
        );

    }


    /* =====================================================
       TRANSPORT ERROR DETECTION
       ===================================================== */

    function isNativeTransportError(
        error
    ) {

        if (
            !error
        ) {

            return false;

        }


        if (
            error.name ===
                "AbortError"
        ) {

            return true;

        }


        /*
         * Browsers commonly report failed
         * cross-origin fetches as TypeError.
         */

        if (
            error.name ===
                "TypeError"
        ) {

            return true;

        }


        return false;

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


        if (
            !action
        ) {

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
         * Only safe read operations may use retry.
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
            canRetryAction(
                action
            )
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

                if (
                    CONFIG.DEBUG ===
                        true
                ) {

                    console.log(
                        "[STOCKFLOW API] Request:",
                        {

                            action,

                            url:
                                API_URL,

                            attempt:
                                attempt + 1,

                            payload:
                                body

                        }
                    );

                }


                /* =========================================
                   FETCH
                   ========================================= */

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


                /* =========================================
                   READ RESPONSE
                   ========================================= */

                let text = "";


                try {

                    text =
                        await response.text();

                } catch (
                    readError
                ) {

                    throw new StockFlowAPIError(
                        "Unable to read the response from the Google Apps Script Web App.",
                        {

                            code:
                                "RESPONSE_READ_ERROR",

                            status:
                                response.status,

                            action,

                            originalError:
                                readError

                        }
                    );

                }


                if (
                    CONFIG.DEBUG ===
                        true
                ) {

                    console.log(
                        "[STOCKFLOW API] Raw response:",
                        {

                            action,

                            status:
                                response.status,

                            ok:
                                response.ok,

                            text

                        }
                    );

                }


                /* =========================================
                   PARSE JSON
                   ========================================= */

                let result;


                try {

                    result =
                        parseJson(
                            text,
                            action
                        );

                } catch (
                    parseError
                ) {

                    /*
                     * If HTTP failed AND response is
                     * not valid JSON, expose HTTP error.
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
                                    text,

                                rawResponse:
                                    text,

                                originalError:
                                    parseError

                            }
                        );

                    }


                    throw parseError;

                }


                result =
                    normalizeResponse(
                        result
                    );


                debugResponse(
                    action,
                    response,
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

                    const serverCode =
                        getServerErrorCode(
                            result
                        );


                    const serverMessage =
                        getServerErrorMessage(
                            result
                        );


                    /*
                     * CRITICAL:
                     *
                     * This is a backend/business error.
                     *
                     * It MUST NOT become NETWORK_ERROR.
                     */

                    throw new StockFlowAPIError(
                        serverMessage,
                        {

                            code:
                                serverCode,

                            status:
                                response.status,

                            action,

                            response:
                                result,

                            data:
                                result.data ||
                                null,

                            rawResponse:
                                text

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
                                null,

                            rawResponse:
                                text

                        }
                    );

                }


                /* =========================================
                   SUCCESS
                   ========================================= */

                return result;


            } catch (
                error
            ) {

                clearTimeout(
                    timeoutId
                );


                /* =========================================
                   ALREADY NORMALIZED API ERROR
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
                   NATIVE NETWORK/FETCH ERROR
                   ========================================= */

                else if (
                    isNativeTransportError(
                        error
                    )
                ) {

                    console.error(
                        "[STOCKFLOW API] Fetch failed:",
                        {

                            action,

                            url:
                                API_URL,

                            error

                        }
                    );


                    let message =
                        "Unable to connect to the Google Apps Script Web App.";


                    if (
                        CONFIG.DEBUG ===
                            true &&
                        error &&
                        error.message
                    ) {

                        message +=
                            " " +
                            error.message;

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
                   UNKNOWN JAVASCRIPT ERROR
                   ========================================= */

                else {

                    console.error(
                        "[STOCKFLOW API] Unexpected request error:",
                        {

                            action,

                            error

                        }
                    );


                    lastError =
                        new StockFlowAPIError(
                            (
                                error &&
                                error.message
                            ) ||
                            "An unexpected error occurred while communicating with the server.",
                            {

                                code:
                                    "REQUEST_ERROR",

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
                    attempt <
                    attempts
                ) {

                    console.warn(
                        "[STOCKFLOW API] Retrying safe request:",
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

    async function register(
        data = {}
    ) {

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
       REGISTER ADMIN
       ===================================================== */

    async function registerAdmin(
        data = {}
    ) {

        return request(
            "registerAdmin",
            {

                ...data,

                role:
                    data.role ||
                    "Admin"

            }
        );

    }


    /* =====================================================
       LOGIN
       ===================================================== */

    async function login(
        data = {}
    ) {

        const identity =
            resolveIdentity(
                data
            );


        if (
            !identity
        ) {

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


        if (
            !otpData.identity
        ) {

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


        if (
            !otpData.identity
        ) {

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
       RESEND OTP
       ===================================================== */

    async function resendOtp(
        data = {}
    ) {

        const otpData =
            normalizeOtpData(
                data
            );


        if (
            !otpData.identity
        ) {

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
       REQUEST OTP
       ===================================================== */

    async function requestOtp(
        data = {}
    ) {

        return resendOtp(
            data
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


        if (
            !otpData.identity
        ) {

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


        if (
            !otp
        ) {

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


        if (
            !identity
        ) {

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


        if (
            !otpData.identity
        ) {

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


        if (
            !otp
        ) {

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

        const input =
            isObject(data)
                ? {
                    ...data
                }
                : {};


        return request(
            "resetPassword",
            input
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
        registerAdmin,
        login,
        session,
        requireSession,
        logout,

        /* OTP */
        prepareOtp,
        generateOtp,
        resendOtp,
        requestOtp,
        updateOtp,
        verifyOtp,

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
