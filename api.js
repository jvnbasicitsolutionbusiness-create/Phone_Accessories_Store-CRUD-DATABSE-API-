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

   IMPORTANT:
   - No OTP generation happens here.
   - OTPs are generated only by Code.gs.
   - This file never creates an OTP.
   - This file never auto-fills an OTP.
   - Backend business errors are preserved.
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


    const RETRY_COUNT =
        Number(
            API_CONFIG.RETRY_COUNT ??
            API_CONFIG.RETRY ??
            CONFIG.API_RETRY_COUNT ??
            CONFIG.API_RETRY ??
            0
        );


    const RETRY_DELAY =
        Number(
            API_CONFIG.RETRY_DELAY ??
            CONFIG.API_RETRY_DELAY ??
            1000
        );


    /*
     * IMPORTANT:
     *
     * text/plain is intentionally used.
     *
     * This avoids sending an application/json request to
     * Google Apps Script, which can trigger unnecessary
     * CORS preflight behavior.
     */
    const CONTENT_TYPE =
        API_CONFIG.CONTENT_TYPE ||
        "text/plain;charset=utf-8";


    const SESSION_KEY =
        CONFIG.SESSION_KEY ||
        CONFIG.AUTH?.SESSION_KEY ||
        "STOCKFLOW_TOKEN";


    const USER_KEY =
        CONFIG.USER_KEY ||
        CONFIG.AUTH?.USER_KEY ||
        "STOCKFLOW_USER";


    /* =========================================================
       ERROR CLASS
       ========================================================= */

    class StockFlowAPIError extends Error {

        constructor(
            message,
            code = "API_ERROR",
            details = {}
        ) {

            super(
                message ||
                "StockFlow API error."
            );


            this.name =
                "StockFlowAPIError";


            this.code =
                code ||
                "API_ERROR";


            this.details =
                details || {};


            this.status =
                details?.status ??
                null;


            this.action =
                details?.action ??
                null;


            this.data =
                details?.data ??
                null;


            this.response =
                details?.response ??
                null;


            this.rawResponse =
                details?.rawResponse ??
                null;


            this.originalError =
                details?.originalError ??
                null;


            this.isTransportError =
                details?.isTransportError === true;
        }
    }


    /* =========================================================
       BASIC HELPERS
       ========================================================= */

    function safeString(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        return String(
            value
        ).trim();
    }


    function parseJSON(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return null;
        }


        if (
            typeof value ===
            "object"
        ) {

            return value;
        }


        if (
            typeof value !==
            "string"
        ) {

            return null;
        }


        try {

            return JSON.parse(
                value
            );

        } catch (_) {

            return null;
        }
    }


    function getToken() {

        try {

            return (
                sessionStorage.getItem(
                    SESSION_KEY
                ) ||

                localStorage.getItem(
                    SESSION_KEY
                ) ||

                localStorage.getItem(
                    "STOCKFLOW_TOKEN"
                ) ||

                sessionStorage.getItem(
                    "STOCKFLOW_TOKEN"
                ) ||

                ""
            );

        } catch (_) {

            return "";
        }
    }


    function saveToken(token) {

        token =
            safeString(
                token
            );


        if (!token) {
            return;
        }


        try {

            sessionStorage.setItem(
                SESSION_KEY,
                token
            );

        } catch (_) {}


        try {

            localStorage.setItem(
                "STOCKFLOW_TOKEN",
                token
            );

        } catch (_) {}
    }


    function clearToken() {

        try {

            sessionStorage.removeItem(
                SESSION_KEY
            );

        } catch (_) {}


        try {

            localStorage.removeItem(
                SESSION_KEY
            );

        } catch (_) {}


        try {

            sessionStorage.removeItem(
                "STOCKFLOW_TOKEN"
            );

        } catch (_) {}


        try {

            localStorage.removeItem(
                "STOCKFLOW_TOKEN"
            );

        } catch (_) {}
    }


    function getStoredUser() {

        let raw = null;


        try {

            raw =
                sessionStorage.getItem(
                    USER_KEY
                ) ||

                sessionStorage.getItem(
                    "STOCKFLOW_USER"
                );

        } catch (_) {}


        if (!raw) {

            try {

                raw =
                    localStorage.getItem(
                        USER_KEY
                    ) ||

                    localStorage.getItem(
                        "STOCKFLOW_USER"
                    );

            } catch (_) {}
        }


        return parseJSON(
            raw
        );
    }


    function saveStoredUser(user) {

        if (!user) {
            return;
        }


        const value =
            JSON.stringify(
                user
            );


        try {

            sessionStorage.setItem(
                USER_KEY,
                value
            );

        } catch (_) {}


        try {

            sessionStorage.setItem(
                "STOCKFLOW_USER",
                value
            );

        } catch (_) {}
    }


    function clearStoredUser() {

        try {

            sessionStorage.removeItem(
                USER_KEY
            );

        } catch (_) {}


        try {

            sessionStorage.removeItem(
                "STOCKFLOW_USER"
            );

        } catch (_) {}


        try {

            localStorage.removeItem(
                USER_KEY
            );

        } catch (_) {}


        try {

            localStorage.removeItem(
                "STOCKFLOW_USER"
            );

        } catch (_) {}
    }


    /* =========================================================
       API URL VALIDATION
       ========================================================= */

    function validateApiUrl() {

        if (!API_URL) {

            throw new StockFlowAPIError(

                "StockFlow API URL is not configured. Please update config.js.",

                "MISSING_API_URL",

                {
                    isTransportError:
                        false
                }
            );
        }


        let parsed;


        try {

            parsed =
                new URL(
                    API_URL
                );

        } catch (_) {

            throw new StockFlowAPIError(

                "The StockFlow API URL is invalid.",

                "INVALID_API_URL"
            );
        }


        if (
            parsed.protocol !==
            "https:"
        ) {

            throw new StockFlowAPIError(

                "The StockFlow API must use HTTPS.",

                "INVALID_API_URL"
            );
        }


        if (
            !API_URL.includes(
                "script.google.com/macros/s/"
            )
        ) {

            console.warn(
                "STOCKFLOW: API URL does not look like a Google Apps Script Web App:",
                API_URL
            );
        }


        if (
            !API_URL.endsWith(
                "/exec"
            )
        ) {

            console.warn(
                "STOCKFLOW: API URL should end with /exec:",
                API_URL
            );
        }
    }


    /* =========================================================
       IDENTITY
       ========================================================= */

    function buildIdentity(
        data = {}
    ) {

        return safeString(

            data.identity ||

            data.username ||

            data.gmail ||

            data.email ||

            data.phone ||

            data.uid ||

            ""
        );
    }


    /* =========================================================
       RESPONSE OBJECT EXTRACTION
       ========================================================= */

    function unwrapResponse(
        value
    ) {

        let current =
            parseJSON(
                value
            );


        if (!current) {
            return null;
        }


        /*
         * Some wrappers return:
         *
         * {
         *     data: {...}
         * }
         *
         * or:
         *
         * {
         *     response: {...}
         * }
         *
         * or:
         *
         * {
         *     result: {...}
         * }
         *
         * Keep the actual API response.
         */

        for (
            let i = 0;
            i < 4;
            i++
        ) {

            if (
                current &&
                typeof current ===
                    "object" &&
                !Array.isArray(current)
            ) {

                if (
                    current.success !==
                        undefined ||
                    current.code !==
                        undefined ||
                    current.message !==
                        undefined ||
                    current.status !==
                        undefined ||
                    current.error !==
                        undefined
                ) {

                    return current;
                }


                if (
                    current.data !==
                        undefined
                ) {

                    const next =
                        parseJSON(
                            current.data
                        );


                    if (next) {

                        current =
                            next;

                        continue;
                    }
                }


                if (
                    current.response !==
                        undefined
                ) {

                    const next =
                        parseJSON(
                            current.response
                        );


                    if (next) {

                        current =
                            next;

                        continue;
                    }
                }


                if (
                    current.result !==
                        undefined
                ) {

                    const next =
                        parseJSON(
                            current.result
                        );


                    if (next) {

                        current =
                            next;

                        continue;
                    }
                }
            }


            break;
        }


        return current;
    }


    /* =========================================================
       SUCCESS / FAILURE
       ========================================================= */

    function isFailedResponse(
        data
    ) {

        if (!data) {
            return true;
        }


        if (
            data.success ===
            false
        ) {

            return true;
        }


        if (
            data.ok ===
            false
        ) {

            return true;
        }


        if (
            String(
                data.status ||
                ""
            ).toLowerCase() ===
            "error"
        ) {

            return true;
        }


        return false;
    }


    /* =========================================================
       RESPONSE PARSER
       ========================================================= */

    async function parseResponse(
        response,
        action
    ) {

        let text = "";


        try {

            text =
                await response.text();

        } catch (error) {

            throw new StockFlowAPIError(

                "The server response could not be read.",

                "RESPONSE_READ_ERROR",

                {

                    status:
                        response.status,

                    action,

                    response,

                    originalError:
                        error,

                    isTransportError:
                        false
                }
            );
        }


        const trimmed =
            safeString(
                text
            );


        /*
         * Empty response.
         */

        if (!trimmed) {

            throw new StockFlowAPIError(

                response.ok

                    ? "The StockFlow server returned an empty response."

                    : `The StockFlow server returned HTTP ${response.status}.`,

                response.ok
                    ? "EMPTY_RESPONSE"
                    : "HTTP_ERROR",

                {

                    status:
                        response.status,

                    action,

                    response,

                    rawResponse:
                        text,

                    isTransportError:
                        false
                }
            );
        }


        /*
         * Parse JSON.
         */

        const data =
            unwrapResponse(
                trimmed
            );


        if (!data) {

            /*
             * This is NOT a network error.
             *
             * The server answered, but the response was
             * not valid JSON.
             */

            throw new StockFlowAPIError(

                "The backend returned an invalid response. Please check the deployed Google Apps Script Web App.",

                "INVALID_JSON",

                {

                    status:
                        response.status,

                    action,

                    response,

                    rawResponse:
                        text,

                    isTransportError:
                        false
                }
            );
        }


        /*
         * HTTP-level failure.
         */

        if (
            !response.ok
        ) {

            throw new StockFlowAPIError(

                safeString(
                    data.message
                ) ||

                safeString(
                    data.error
                ) ||

                `Server request failed (${response.status}).`,

                safeString(
                    data.code
                ) ||

                "HTTP_ERROR",

                {

                    status:
                        response.status,

                    action,

                    data,

                    response,

                    rawResponse:
                        text,

                    isTransportError:
                        false
                }
            );
        }


        /*
         * IMPORTANT:
         *
         * Google Apps Script normally returns HTTP 200
         * even when our application reports:
         *
         * success: false
         *
         * Preserve that business error.
         */

        if (
            isFailedResponse(
                data
            )
        ) {

            throw new StockFlowAPIError(

                safeString(
                    data.message
                ) ||

                safeString(
                    data.error
                ) ||

                "The server rejected the request.",

                safeString(
                    data.code
                ) ||

                "REQUEST_FAILED",

                {

                    status:
                        response.status,

                    action,

                    data,

                    response,

                    rawResponse:
                        text,

                    isTransportError:
                        false
                }
            );
        }


        return data;
    }


    /* =========================================================
       REQUEST
       ========================================================= */

    async function request(
        action,
        payload = {},
        options = {}
    ) {

        validateApiUrl();


        action =
            safeString(
                action
            );


        if (!action) {

            throw new StockFlowAPIError(

                "API action is required.",

                "MISSING_ACTION"
            );
        }


        const requestPayload = {

            action:

                action,

            ...(
                payload &&
                typeof payload ===
                    "object"

                    ? payload

                    : {}
            )
        };


        /*
         * Attach session token only when one exists.
         *
         * Login/register/OTP requests work without it.
         */

        if (
            !requestPayload.token
        ) {

            const token =
                getToken();


            if (token) {

                requestPayload.token =
                    token;
            }
        }


        const maxRetries =
            Number.isFinite(
                Number(
                    options.retries
                )
            )

                ? Number(
                    options.retries
                )

                : RETRY_COUNT;


        let lastError =
            null;


        for (
            let attempt = 0;
            attempt <= maxRetries;
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

                console.debug(
                    "STOCKFLOW API REQUEST",
                    {
                        action,
                        attempt:
                            attempt + 1
                    }
                );


                const response =
                    await fetch(

                        API_URL,

                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    CONTENT_TYPE,

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestPayload
                                ),

                            mode:
                                "cors",

                            credentials:
                                "omit",

                            redirect:
                                "follow",

                            cache:
                                "no-store",

                            signal:
                                controller.signal
                        }
                    );


                /*
                 * IMPORTANT:
                 *
                 * If fetch succeeds, the backend answered.
                 *
                 * Do NOT convert parse/business errors into
                 * NETWORK_ERROR.
                 */

                const result =
                    await parseResponse(
                        response,
                        action
                    );


                console.debug(
                    "STOCKFLOW API RESPONSE",
                    {
                        action,
                        result
                    }
                );


                return result;

            } catch (error) {

                /*
                 * Timeout.
                 */

                if (
                    error?.name ===
                    "AbortError"
                ) {

                    lastError =
                        new StockFlowAPIError(

                            "The StockFlow server took too long to respond.",

                            "TIMEOUT",

                            {

                                action,

                                originalError:
                                    error,

                                isTransportError:
                                    true
                            }
                        );
                }


                /*
                 * Our API error.
                 *
                 * IMPORTANT:
                 *
                 * Keep it exactly as it is.
                 *
                 * This is what preserves:
                 *
                 * INVALID_CREDENTIALS
                 * ACCOUNT_NOT_FOUND
                 * ACCOUNT_BLOCKED
                 * INVALID_OTP
                 * OTP_EXPIRED
                 * OTP_LOCKED
                 * etc.
                 */

                else if (
                    error instanceof
                    StockFlowAPIError
                ) {

                    lastError =
                        error;
                }


                /*
                 * Native fetch failure.
                 *
                 * This is the ONLY situation where the
                 * connection error is generated.
                 */

                else {

                    lastError =
                        new StockFlowAPIError(

                            "Unable to connect to the StockFlow server. Please check your internet connection and make sure the Google Apps Script Web App is deployed and accessible.",

                            "NETWORK_ERROR",

                            {

                                action,

                                originalError:
                                    error,

                                isTransportError:
                                    true
                            }
                        );
                }


                /*
                 * Retry only actual transport errors.
                 *
                 * Never retry:
                 *
                 * - wrong password
                 * - account not found
                 * - duplicate account
                 * - invalid OTP
                 * - expired OTP
                 * - blocked account
                 * - etc.
                 */

                if (
                    !lastError.isTransportError ||
                    attempt >=
                        maxRetries
                ) {

                    throw lastError;
                }


                await wait(
                    RETRY_DELAY
                );

            } finally {

                clearTimeout(
                    timeoutId
                );
            }
        }


        throw (

            lastError ||

            new StockFlowAPIError(

                "Unknown StockFlow API error.",

                "API_ERROR"
            )
        );
    }


    /* =========================================================
       DELAY
       ========================================================= */

    function wait(
        milliseconds
    ) {

        return new Promise(
            resolve => {

                setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    }


    /* =========================================================
       REGISTER
       ========================================================= */

    async function register(
        data = {}
    ) {

        const firstName =
            safeString(
                data.firstName
            );


        const lastName =
            safeString(
                data.lastName
            );


        const name =
            safeString(
                data.name
            ) ||

            [
                firstName,
                lastName
            ]
                .filter(Boolean)
                .join(" ");


        return request(

            "register",

            {

                firstName,

                lastName,

                name,

                username:
                    safeString(
                        data.username
                    ),

                age:
                    data.age ??
                    "",

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                email:
                    safeString(
                        data.email ||
                        data.gmail
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                password:
                    safeString(
                        data.password
                    ),

                confirmPassword:
                    safeString(
                        data.confirmPassword
                    ),

                role:
                    safeString(
                        data.role
                    ) ||

                    "Employee"
            }
        );
    }


    /* =========================================================
       ADMIN REGISTER
       ========================================================= */

    async function registerAdmin(
        data = {}
    ) {

        const firstName =
            safeString(
                data.firstName
            );


        const lastName =
            safeString(
                data.lastName
            );


        const name =
            safeString(
                data.name
            ) ||

            [
                firstName,
                lastName
            ]
                .filter(Boolean)
                .join(" ");


        return request(

            "registerAdmin",

            {

                firstName,

                lastName,

                name,

                username:
                    safeString(
                        data.username
                    ),

                age:
                    data.age ??
                    "",

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                email:
                    safeString(
                        data.email ||
                        data.gmail
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                password:
                    safeString(
                        data.password
                    ),

                confirmPassword:
                    safeString(
                        data.confirmPassword
                    ),

                role:
                    "Admin",

                adminRegistrationKey:
                    safeString(
                        data.adminRegistrationKey
                    )
            }
        );
    }


    /* =========================================================
       LOGIN
       ========================================================= */

    async function login(
        data = {}
    ) {

        const identity =
            buildIdentity(
                data
            );


        return request(

            "login",

            {

                identity,

                username:
                    safeString(
                        data.username
                    ),

                email:
                    safeString(
                        data.email
                    ),

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                password:
                    safeString(
                        data.password
                    )
            }
        );
    }


    /* =========================================================
       PREPARE OTP
       ========================================================= */

    async function prepareOtp(
        data = {}
    ) {

        const channel =
            safeString(

                data.channel ||

                data.otpChannel ||

                "email"

            ).toLowerCase();


        const normalizedChannel =
            channel === "phone"
                ? "phone"
                : "email";


        const payload = {

            uid:
                safeString(
                    data.uid
                ),

            identity:
                buildIdentity(
                    data
                ),

            username:
                safeString(
                    data.username
                ),

            email:
                safeString(
                    data.email
                ),

            gmail:
                safeString(
                    data.gmail ||
                    data.email
                ),

            phone:
                safeString(
                    data.phone
                ),

            channel:
                normalizedChannel,

            otpChannel:
                normalizedChannel,

            purpose:
                safeString(
                    data.purpose
                ) ||

                "verification"
        };


        try {

            return await request(

                "prepareOtp",

                payload
            );

        } catch (error) {

            /*
             * Compatibility with older Code.gs versions.
             *
             * Only fall back when the backend says the
             * action itself does not exist.
             */

            const code =
                safeString(
                    error?.code
                ).toUpperCase();


            const message =
                safeString(
                    error?.message
                ).toLowerCase();


            const unknownAction =
                code ===
                    "UNKNOWN_ACTION" ||

                message.includes(
                    "unknown api action"
                ) ||

                message.includes(
                    "unknown action"
                ) ||

                message.includes(
                    "unsupported action"
                );


            if (!unknownAction) {

                throw error;
            }


            return request(

                "resendOtp",

                payload
            );
        }
    }


    /* =========================================================
       RESEND OTP
       ========================================================= */

    async function resendOtp(
        data = {}
    ) {

        const channel =
            safeString(

                data.channel ||

                data.otpChannel ||

                "email"

            ).toLowerCase();


        const normalizedChannel =
            channel === "phone"
                ? "phone"
                : "email";


        return request(

            "resendOtp",

            {

                uid:
                    safeString(
                        data.uid
                    ),

                identity:
                    buildIdentity(
                        data
                    ),

                username:
                    safeString(
                        data.username
                    ),

                email:
                    safeString(
                        data.email
                    ),

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                channel:
                    normalizedChannel,

                otpChannel:
                    normalizedChannel,

                purpose:
                    safeString(
                        data.purpose
                    ) ||

                    "verification"
            }
        );
    }


    /* =========================================================
       REQUEST OTP
       ========================================================= */

    async function requestOtp(
        data = {}
    ) {

        return prepareOtp(
            data
        );
    }


    /* =========================================================
       UPDATE OTP
       ========================================================= */

    async function updateOtp(
        data = {}
    ) {

        return resendOtp(
            data
        );
    }


    /* =========================================================
       VERIFY OTP
       ========================================================= */

    async function verifyOtp(
        data = {}
    ) {

        const channel =
            safeString(

                data.channel ||

                data.otpChannel ||

                "email"

            ).toLowerCase();


        const normalizedChannel =
            channel === "phone"
                ? "phone"
                : "email";


        return request(

            "verifyOtp",

            {

                uid:
                    safeString(
                        data.uid
                    ),

                identity:
                    buildIdentity(
                        data
                    ),

                username:
                    safeString(
                        data.username
                    ),

                email:
                    safeString(
                        data.email
                    ),

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                channel:
                    normalizedChannel,

                otpChannel:
                    normalizedChannel,

                otp:
                    safeString(
                        data.otp
                    )
            }
        );
    }


    /* =========================================================
       GET USER
       ========================================================= */

    async function getUser(
        identityOrData
    ) {

        const data =

            identityOrData &&
            typeof identityOrData ===
                "object"

                ? identityOrData

                : {

                    identity:
                        safeString(
                            identityOrData
                        )
                };


        return request(

            "getUser",

            {

                uid:
                    safeString(
                        data.uid
                    ),

                identity:
                    buildIdentity(
                        data
                    ),

                username:
                    safeString(
                        data.username
                    ),

                email:
                    safeString(
                        data.email
                    ),

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                phone:
                    safeString(
                        data.phone
                    )
            }
        );
    }


    /* =========================================================
       PASSWORD RECOVERY
       ========================================================= */

    async function forgotPassword(
        data = {}
    ) {

        const channel =
            safeString(

                data.channel ||

                data.otpChannel ||

                "email"

            ).toLowerCase();


        const normalizedChannel =
            channel === "phone"
                ? "phone"
                : "email";


        return request(

            "forgotPassword",

            {

                identity:
                    buildIdentity(
                        data
                    ),

                uid:
                    safeString(
                        data.uid
                    ),

                username:
                    safeString(
                        data.username
                    ),

                email:
                    safeString(
                        data.email
                    ),

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                channel:
                    normalizedChannel,

                otpChannel:
                    normalizedChannel
            }
        );
    }


    /* =========================================================
       VERIFY RECOVERY OTP
       ========================================================= */

    async function verifyRecoveryOtp(
        data = {}
    ) {

        return request(

            "verifyRecoveryOtp",

            {

                identity:
                    buildIdentity(
                        data
                    ),

                uid:
                    safeString(
                        data.uid
                    ),

                username:
                    safeString(
                        data.username
                    ),

                email:
                    safeString(
                        data.email
                    ),

                gmail:
                    safeString(
                        data.gmail ||
                        data.email
                    ),

                phone:
                    safeString(
                        data.phone
                    ),

                channel:
                    safeString(
                        data.channel ||
                        data.otpChannel ||
                        "email"
                    ),

                otpChannel:
                    safeString(
                        data.otpChannel ||
                        data.channel ||
                        "email"
                    ),

                otp:
                    safeString(
                        data.otp
                    )
            }
        );
    }


    /* =========================================================
       RESET PASSWORD
       ========================================================= */

    async function resetPassword(
        data = {}
    ) {

        const password =
            safeString(

                data.newPassword ||

                data.password
            );


        const recoveryToken =
            safeString(

                data.recoveryToken ||

                data.token
            );


        return request(

            "resetPassword",

            {

                identity:
                    buildIdentity(
                        data
                    ),

                uid:
                    safeString(
                        data.uid
                    ),

                token:
                    recoveryToken,

                recoveryToken:
                    recoveryToken,

                password,

                newPassword:
                    password,

                confirmPassword:
                    safeString(
                        data.confirmPassword
                    )
            }
        );
    }


    /* =========================================================
       SESSION
       ========================================================= */

    async function session(
        data = {}
    ) {

        return request(

            "session",

            {

                token:
                    safeString(
                        data.token
                    ) ||

                    getToken()
            }
        );
    }


    /* =========================================================
       REQUIRE SESSION
       ========================================================= */

    async function requireSession(
        data = {}
    ) {

        return request(

            "requireSession",

            {

                token:
                    safeString(
                        data.token
                    ) ||

                    getToken()
            }
        );
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout(
        data = {}
    ) {

        try {

            const result =
                await request(

                    "logout",

                    {

                        token:
                            safeString(
                                data.token
                            ) ||

                            getToken()
                    }
                );


            clearToken();
            clearStoredUser();


            return result;

        } catch (error) {

            /*
             * Clear local session even if the server
             * logout request fails.
             */

            clearToken();
            clearStoredUser();


            throw error;
        }
    }


    /* =========================================================
       LIST USERS
       ========================================================= */

    async function listUsers(
        data = {}
    ) {

        return request(

            "listUsers",

            {

                token:
                    safeString(
                        data.token
                    ) ||

                    getToken()
            }
        );
    }


    /* =========================================================
       UPDATE STATUS
       ========================================================= */

    async function updateStatus(
        username,
        status,
        token = ""
    ) {

        if (
            username &&
            typeof username ===
                "object"
        ) {

            const data =
                username;


            return request(

                "updateStatus",

                {

                    username:
                        safeString(
                            data.username
                        ),

                    status:
                        safeString(
                            data.status
                        ),

                    token:
                        safeString(
                            data.token
                        ) ||

                        getToken()
                }
            );
        }


        return request(

            "updateStatus",

            {

                username:
                    safeString(
                        username
                    ),

                status:
                    safeString(
                        status
                    ),

                token:
                    safeString(
                        token
                    ) ||

                    getToken()
            }
        );
    }


    /* =========================================================
       ACTIVITY
       ========================================================= */

    async function listActivity(
        data = {}
    ) {

        return request(

            "listActivity",

            {

                token:
                    safeString(
                        data.token
                    ) ||

                    getToken(),

                limit:
                    Number(
                        data.limit
                    ) || 100
            }
        );
    }


    /* =========================================================
       GENERIC INVENTORY
       ========================================================= */

    async function inventory(
        action,
        data = {}
    ) {

        action =
            safeString(
                action
            );


        if (!action) {

            throw new StockFlowAPIError(

                "Inventory action is required.",

                "MISSING_INVENTORY_ACTION"
            );
        }


        return request(

            action,

            {

                ...data,

                token:
                    safeString(
                        data.token
                    ) ||

                    getToken()
            }
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

    async function health() {

        validateApiUrl();


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
             * Use the actual Web App endpoint.
             *
             * Code.gs doGet() returns:
             *
             * {
             *   success: true,
             *   code: "ONLINE",
             *   status: "ONLINE"
             * }
             */

            const response =
                await fetch(

                    API_URL,

                    {

                        method:
                            "GET",

                        mode:
                            "cors",

                        credentials:
                            "omit",

                        redirect:
                            "follow",

                        cache:
                            "no-store",

                        signal:
                            controller.signal
                    }
                );


            const text =
                await response.text();


            const data =
                unwrapResponse(
                    text
                );


            if (!data) {

                throw new StockFlowAPIError(

                    "The health check returned an invalid response.",

                    "INVALID_JSON",

                    {

                        status:
                            response.status,

                        rawResponse:
                            text,

                        response
                    }
                );
            }


            if (
                !response.ok
            ) {

                throw new StockFlowAPIError(

                    data.message ||

                    `Health check failed (${response.status}).`,

                    data.code ||
                    "HEALTH_CHECK_FAILED",

                    {

                        status:
                            response.status,

                        data,

                        response,

                        rawResponse:
                            text
                    }
                );
            }


            return data;

        } catch (error) {

            if (
                error instanceof
                StockFlowAPIError
            ) {

                throw error;
            }


            if (
                error?.name ===
                "AbortError"
            ) {

                throw new StockFlowAPIError(

                    "The StockFlow backend health check timed out.",

                    "TIMEOUT",

                    {

                        originalError:
                            error,

                        isTransportError:
                            true
                    }
                );
            }


            throw new StockFlowAPIError(

                "Unable to reach the StockFlow backend.",

                "HEALTH_CHECK_FAILED",

                {

                    originalError:
                        error,

                    isTransportError:
                        true
                }
            );

        } finally {

            clearTimeout(
                timeoutId
            );
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
        registerAdmin,
        login,

        /* OTP */
        prepareOtp,
        requestOtp,
        resendOtp,
        updateOtp,
        verifyOtp,

        /* Users */
        getUser,
        listUsers,
        updateStatus,

        /* Password recovery */
        forgotPassword,
        verifyRecoveryOtp,
        resetPassword,

        /* Session */
        session,
        requireSession,
        logout,

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

        /* Stock In */
        listStockIn,
        createStockIn,

        /* Stock Out */
        listStockOut,
        createStockOut,

        /* Transactions */
        listTransactions,

        /* Dashboard */
        dashboard,

        /* Error */
        StockFlowAPIError,

        /* Session helpers */
        getToken,
        saveToken,
        clearToken,
        getStoredUser,
        saveStoredUser,
        clearStoredUser
    };


    /* =========================================================
       GLOBAL EXPORT
       ========================================================= */

    window.StockFlowAPI =
        StockFlowAPI;


    /*
     * Legacy compatibility.
     *
     * Existing login.js, register.js, verify.js,
     * recovery.js, dashboard.js, etc. can continue
     * using window.API.
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


    console.log(
        "StockFlow API endpoint:",
        API_URL ||
        "(not configured)"
    );


    console.log(
        "StockFlow API session key:",
        SESSION_KEY
    );


    console.log(
        "StockFlow API methods:",
        Object.keys(
            StockFlowAPI
        )
    );


})(window);
