/* =========================================================
   STOCKFLOW — API CONNECTION
   File: api.js

   FRONTEND
       ↓
   StockFlowAPI
       ↓
   GOOGLE APPS SCRIPT WEB APP
       ↓
   GOOGLE SHEETS + FIREBASE

   IMPORTANT:
   - OTP generation is ONLY done by Code.gs.
   - This file NEVER generates OTPs.
   - This file NEVER displays OTPs.
   - This file NEVER auto-fills OTPs.
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
        Math.max(
            0,
            Number(
                API_CONFIG.RETRY_COUNT ??
                CONFIG.API_RETRY_COUNT ??
                0
            )
        );


    const RETRY_DELAY =
        Math.max(
            0,
            Number(
                API_CONFIG.RETRY_DELAY ??
                CONFIG.API_RETRY_DELAY ??
                1000
            )
        );


    /*
     * IMPORTANT
     *
     * text/plain is intentionally used.
     *
     * Google Apps Script does not need an
     * application/json Content-Type for our
     * JSON.stringify() request body.
     *
     * text/plain is a CORS-safelisted content type
     * and avoids the normal JSON preflight.
     */

    const CONTENT_TYPE =
        API_CONFIG.CONTENT_TYPE ||
        "text/plain;charset=utf-8";


    const SESSION_KEY =
        CONFIG.AUTH?.SESSION_KEY ||
        CONFIG.SESSION_KEY ||
        "STOCKFLOW_TOKEN";


    const USER_KEY =
        CONFIG.AUTH?.USER_KEY ||
        CONFIG.USER_KEY ||
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


            this.isBusinessError =
                details?.isBusinessError === true;


            this.isTimeout =
                this.code ===
                "TIMEOUT";


            this.isNetworkError =
                this.code ===
                "NETWORK_ERROR";
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


    function sleep(milliseconds) {

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
       SESSION STORAGE
       ========================================================= */

    function getToken() {

        try {

            return (
                sessionStorage.getItem(
                    SESSION_KEY
                ) ||

                localStorage.getItem(
                    SESSION_KEY
                ) ||

                sessionStorage.getItem(
                    "STOCKFLOW_TOKEN"
                ) ||

                localStorage.getItem(
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
                SESSION_KEY,
                token
            );

        } catch (_) {}


        /*
         * Backward compatibility.
         */

        try {

            localStorage.setItem(
                "STOCKFLOW_TOKEN",
                token
            );

        } catch (_) {}
    }


    function clearToken() {

        const keys = [

            SESSION_KEY,
            "STOCKFLOW_TOKEN"

        ];


        keys.forEach(
            key => {

                try {

                    sessionStorage.removeItem(
                        key
                    );

                } catch (_) {}


                try {

                    localStorage.removeItem(
                        key
                    );

                } catch (_) {}
            }
        );
    }


    function getStoredUser() {

        let raw = "";


        try {

            raw =
                sessionStorage.getItem(
                    USER_KEY
                ) || "";

        } catch (_) {}


        if (!raw) {

            try {

                raw =
                    localStorage.getItem(
                        USER_KEY
                    ) || "";

            } catch (_) {}
        }


        if (!raw) {

            try {

                raw =
                    sessionStorage.getItem(
                        "STOCKFLOW_USER"
                    ) || "";

            } catch (_) {}
        }


        if (!raw) {

            try {

                raw =
                    localStorage.getItem(
                        "STOCKFLOW_USER"
                    ) || "";

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

            localStorage.setItem(
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

        const keys = [

            USER_KEY,
            "STOCKFLOW_USER"

        ];


        keys.forEach(
            key => {

                try {

                    sessionStorage.removeItem(
                        key
                    );

                } catch (_) {}


                try {

                    localStorage.removeItem(
                        key
                    );

                } catch (_) {}
            }
        );
    }


    /* =========================================================
       API URL VALIDATION
       ========================================================= */

    function validateApiUrl() {

        if (!API_URL) {

            throw new StockFlowAPIError(

                "StockFlow API URL is missing. Please check config.js.",

                "MISSING_API_URL",

                {

                    isTransportError:
                        false
                }
            );
        }


        let parsedURL;


        try {

            parsedURL =
                new URL(
                    API_URL
                );

        } catch (error) {

            throw new StockFlowAPIError(

                "StockFlow API URL is invalid. Please check config.js.",

                "INVALID_API_URL",

                {

                    originalError:
                        error,

                    isTransportError:
                        false
                }
            );
        }


        if (
            parsedURL.protocol !==
            "https:"
        ) {

            throw new StockFlowAPIError(

                "StockFlow API must use HTTPS.",

                "INVALID_API_URL",

                {

                    isTransportError:
                        false
                }
            );
        }


        if (
            !parsedURL.hostname.includes(
                "script.google.com"
            )
        ) {

            console.warn(
                "[STOCKFLOW] API URL is not a Google Apps Script URL:",
                API_URL
            );
        }


        if (
            !API_URL.endsWith(
                "/exec"
            )
        ) {

            console.warn(
                "[STOCKFLOW] API URL does not end with /exec:",
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
       RESPONSE UNWRAPPER
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
         * Handle possible wrappers:
         *
         * {
         *   data: {...}
         * }
         *
         * {
         *   response: {...}
         * }
         *
         * {
         *   result: {...}
         * }
         */

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            if (
                !current ||
                typeof current !==
                    "object" ||
                Array.isArray(current)
            ) {

                break;
            }


            /*
             * Already looks like the real
             * StockFlow API response.
             */

            if (

                current.success !==
                    undefined ||

                current.ok !==
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


            /*
             * data wrapper
             */

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


            /*
             * response wrapper
             */

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


            /*
             * result wrapper
             */

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


            break;
        }


        return current;
    }


    /* =========================================================
       BUSINESS FAILURE DETECTION
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


        if (
            data.error &&
            data.success !==
            true
        ) {

            return true;
        }


        return false;
    }


    /* =========================================================
       RESPONSE MESSAGE
       ========================================================= */

    function getResponseMessage(
        data
    ) {

        if (!data) {

            return "";
        }


        return (

            safeString(
                data.message
            ) ||

            safeString(
                data.error
            ) ||

            safeString(
                data.details
            ) ||

            ""
        );
    }


    /* =========================================================
       RESPONSE CODE
       ========================================================= */

    function getResponseCode(
        data
    ) {

        if (!data) {

            return "";
        }


        return (

            safeString(
                data.code
            ) ||

            safeString(
                data.errorCode
            ) ||

            "REQUEST_FAILED"
        );
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

                "The StockFlow server responded, but the response could not be read.",

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
         * Parse backend JSON.
         */

        const data =
            unwrapResponse(
                trimmed
            );


        if (!data) {

            /*
             * VERY IMPORTANT:
             *
             * The browser DID receive a response.
             *
             * Therefore this is NOT a
             * NETWORK_ERROR.
             */

            throw new StockFlowAPIError(

                "The StockFlow backend responded, but returned an invalid JSON response.",

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
         * HTTP failure.
         */

        if (
            !response.ok
        ) {

            throw new StockFlowAPIError(

                getResponseMessage(
                    data
                ) ||

                `StockFlow server request failed with HTTP ${response.status}.`,

                getResponseCode(
                    data
                ),

                {

                    status:
                        response.status,

                    action,

                    data,

                    response,

                    rawResponse:
                        text,

                    isTransportError:
                        false,

                    isBusinessError:
                        true
                }
            );
        }


        /*
         * Application/business failure.
         *
         * Google Apps Script normally returns HTTP 200
         * even when Code.gs returns success:false.
         *
         * Preserve that exact error.
         */

        if (
            isFailedResponse(
                data
            )
        ) {

            throw new StockFlowAPIError(

                getResponseMessage(
                    data
                ) ||

                "The StockFlow server rejected the request.",

                getResponseCode(
                    data
                ),

                {

                    status:
                        response.status,

                    action,

                    data,

                    response,

                    rawResponse:
                        text,

                    isTransportError:
                        false,

                    isBusinessError:
                        true
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
         * Add token when available.
         *
         * Login/register/OTP can work
         * without a token.
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


        const retries =
            Number.isFinite(
                Number(
                    options.retries
                )
            )

                ? Math.max(
                    0,
                    Number(
                        options.retries
                    )
                )

                : RETRY_COUNT;


        let lastError =
            null;


        for (
            let attempt = 0;
            attempt <= retries;
            attempt++
        ) {

            const controller =
                new AbortController();


            const timeoutId =
                window.setTimeout(

                    () => {

                        controller.abort();

                    },

                    REQUEST_TIMEOUT
                );


            try {

                console.debug(
                    "[STOCKFLOW API] REQUEST",
                    {

                        url:
                            API_URL,

                        action,

                        attempt:
                            attempt + 1,

                        payload:
                            {
                                ...requestPayload,

                                /*
                                 * Never print password
                                 * values in console.
                                 */

                                password:
                                    requestPayload.password
                                        ? "[REDACTED]"
                                        : undefined,

                                confirmPassword:
                                    requestPayload.confirmPassword
                                        ? "[REDACTED]"
                                        : undefined,

                                newPassword:
                                    requestPayload.newPassword
                                        ? "[REDACTED]"
                                        : undefined,

                                otp:
                                    requestPayload.otp
                                        ? "[REDACTED]"
                                        : undefined
                            }
                    }
                );


                /*
                 * IMPORTANT:
                 *
                 * Do not use application/json.
                 *
                 * text/plain avoids the normal
                 * JSON CORS preflight.
                 */

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
                 * If fetch reached this point,
                 * the browser successfully obtained
                 * a response.
                 *
                 * Therefore parse errors must NEVER
                 * become NETWORK_ERROR.
                 */

                const result =
                    await parseResponse(
                        response,
                        action
                    );


                console.debug(
                    "[STOCKFLOW API] RESPONSE",
                    {

                        action,

                        status:
                            response.status,

                        result
                    }
                );


                return result;

            } catch (error) {

                /*
                 * -------------------------------------------------
                 * TIMEOUT
                 * -------------------------------------------------
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
                 * -------------------------------------------------
                 * OUR API ERROR
                 * -------------------------------------------------
                 */

                else if (
                    error instanceof
                    StockFlowAPIError
                ) {

                    lastError =
                        error;
                }


                /*
                 * -------------------------------------------------
                 * NATIVE FETCH FAILURE
                 * -------------------------------------------------
                 *
                 * This is the ONLY place where a browser
                 * connection failure becomes NETWORK_ERROR.
                 *
                 * Typical browser causes:
                 *
                 * - Apps Script deployment inaccessible
                 * - deployment requires Google login
                 * - CORS failure
                 * - DNS/network problem
                 * - browser blocked the request
                 * - invalid/removed deployment
                 * - redirect could not be followed
                 */

                else {

                    const originalMessage =
                        safeString(
                            error?.message
                        );


                    lastError =
                        new StockFlowAPIError(

                            originalMessage

                                ? `Unable to reach the StockFlow Web App. Browser error: ${originalMessage}`

                                : "Unable to reach the StockFlow Web App. Please verify the Google Apps Script deployment and Web App access settings.",

                            "NETWORK_ERROR",

                            {

                                action,

                                originalError:
                                    error,

                                isTransportError:
                                    true,

                                browserMessage:
                                    originalMessage,

                                apiUrl:
                                    API_URL
                            }
                        );


                    console.error(
                        "[STOCKFLOW API] NETWORK FAILURE",
                        {

                            action,

                            url:
                                API_URL,

                            browserError:
                                error
                        }
                    );
                }


                /*
                 * Never retry business errors.
                 *
                 * Retry only:
                 *
                 * NETWORK_ERROR
                 * TIMEOUT
                 */

                if (
                    !lastError.isTransportError
                ) {

                    throw lastError;
                }


                if (
                    attempt >=
                    retries
                ) {

                    throw lastError;
                }


                console.warn(
                    "[STOCKFLOW API] Retrying request...",
                    {

                        action,

                        nextAttempt:
                            attempt + 2,

                        delay:
                            RETRY_DELAY
                    }
                );


                await sleep(
                    RETRY_DELAY
                );

            } finally {

                window.clearTimeout(
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
             * Only use resendOtp fallback if
             * the backend specifically says that
             * prepareOtp does not exist.
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

                code ===
                    "ACTION_NOT_FOUND" ||

                message.includes(
                    "unknown api action"
                ) ||

                message.includes(
                    "unknown action"
                ) ||

                message.includes(
                    "unsupported action"
                );


            if (
                !unknownAction
            ) {

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

                /*
                 * The user manually enters this OTP.
                 *
                 * This file does NOT generate it.
                 */

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
             * Always clear local session.
             */

            clearToken();
            clearStoredUser();


            throw error;
        }
    }


    /* =========================================================
       USERS
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
            window.setTimeout(

                () => {

                    controller.abort();

                },

                REQUEST_TIMEOUT
            );


        try {

            console.debug(
                "[STOCKFLOW API] HEALTH CHECK",
                API_URL
            );


            const response =
                await fetch(

                    API_URL,

                    {

                        method:
                            "GET",

                        headers: {

                            "Accept":
                                "application/json"
                        },

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

                    "The Google Apps Script Web App responded, but did not return valid JSON.",

                    "INVALID_JSON",

                    {

                        status:
                            response.status,

                        rawResponse:
                            text,

                        response,

                        isTransportError:
                            false
                    }
                );
            }


            if (
                !response.ok
            ) {

                throw new StockFlowAPIError(

                    getResponseMessage(
                        data
                    ) ||

                    `Health check failed with HTTP ${response.status}.`,

                    getResponseCode(
                        data
                    ) ||

                    "HEALTH_CHECK_FAILED",

                    {

                        status:
                            response.status,

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
             * Health endpoint should normally
             * return success:true.
             */

            if (
                isFailedResponse(
                    data
                )
            ) {

                throw new StockFlowAPIError(

                    getResponseMessage(
                        data
                    ) ||

                    "The StockFlow backend health check failed.",

                    getResponseCode(
                        data
                    ),

                    {

                        status:
                            response.status,

                        data,

                        response,

                        rawResponse:
                            text,

                        isTransportError:
                            false,

                        isBusinessError:
                            true
                    }
                );
            }


            console.info(
                "[STOCKFLOW API] HEALTH CHECK OK",
                data
            );


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

                        apiUrl:
                            API_URL,

                        isTransportError:
                            true
                    }
                );
            }


            console.error(
                "[STOCKFLOW API] HEALTH CHECK FAILED",
                {

                    url:
                        API_URL,

                    error
                }
            );


            throw new StockFlowAPIError(

                error?.message

                    ? `Unable to reach the StockFlow backend. Browser error: ${error.message}`

                    : "Unable to reach the StockFlow backend. Please verify the Google Apps Script Web App deployment.",

                "NETWORK_ERROR",

                {

                    originalError:
                        error,

                    apiUrl:
                        API_URL,

                    isTransportError:
                        true
                }
            );

        } finally {

            window.clearTimeout(
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
     * Existing files use window.API.
     *
     * Keep this alias.
     */

    window.API =
        StockFlowAPI;


    /* =========================================================
       STARTUP DIAGNOSTICS
       ========================================================= */

    console.log(
        "%c==========================================",
        "font-weight:bold;"
    );


    console.log(
        "%cSTOCKFLOW API LOADED",
        "font-weight:bold;"
    );


    console.log(
        "API URL:",
        API_URL ||
        "(NOT CONFIGURED)"
    );


    console.log(
        "API Method:",
        "POST"
    );


    console.log(
        "Content-Type:",
        CONTENT_TYPE
    );


    console.log(
        "Timeout:",
        REQUEST_TIMEOUT +
        " ms"
    );


    console.log(
        "Retries:",
        RETRY_COUNT
    );


    console.log(
        "Session Key:",
        SESSION_KEY
    );


    console.log(
        "Available API methods:",
        Object.keys(
            StockFlowAPI
        )
    );


    console.log(
        "%c==========================================",
        "font-weight:bold;"
    );


    /*
     * Validate immediately so configuration
     * mistakes are visible in the console.
     */

    try {

        validateApiUrl();

    } catch (error) {

        console.error(
            "[STOCKFLOW API CONFIG ERROR]",
            error
        );
    }


})(window);
