/**
 * ================================================================
 * STOCKFLOW - OTP HELPER MODULE
 * ================================================================
 *
 * File:
 *   otp.gs
 *
 * PURPOSE:
 *   Safe helper functions used by Code.gs for OTP processing.
 *
 * IMPORTANT SECURITY RULES:
 *
 *   1. OTP generation happens ONLY in Code.gs.
 *   2. OTP delivery happens ONLY through Code.gs.
 *   3. This file NEVER generates an OTP.
 *   4. This file NEVER sends an OTP.
 *   5. This file NEVER returns an OTP.
 *   6. This file NEVER exposes an OTP.
 *   7. This file NEVER auto-fills an OTP.
 *   8. Frontend verification boxes remain EMPTY until the
 *      USER manually types the code received through email/SMS.
 *   9. Code.gs remains the single source of truth.
 *
 * COMPATIBILITY:
 *   This helper uses the actual StockFlow sheet field names:
 *
 *      OTP
 *      OTP EXPIRES
 *      OTP ATTEMPTS
 *      OTP LOCK UNTIL
 *      OTP CHANNEL
 *
 * ================================================================
 */


/* ================================================================
   1. OTP CONSTANTS
   ================================================================ */

var SF_OTP_HELPER = {

    LENGTH: 6,

    EXPIRATION_MINUTES: 10,

    MAX_ATTEMPTS: 4,

    LOCK_MINUTES: 30,

    RESEND_COOLDOWN_SECONDS: 120
};


/* ================================================================
   2. NORMALIZE OTP
   ================================================================ */

/**
 * Converts an OTP value into a clean string.
 *
 * IMPORTANT:
 *   This does NOT generate an OTP.
 */
function sfOtpHelperNormalizeCode(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }

    return String(value)
        .trim()
        .replace(/\s+/g, "");
}


/* ================================================================
   3. VALIDATE OTP FORMAT
   ================================================================ */

/**
 * Returns true only when the value contains exactly six digits.
 */
function sfOtpHelperIsValidFormat(value) {

    var otp =
        sfOtpHelperNormalizeCode(value);

    return /^\d{6}$/.test(otp);
}


/* ================================================================
   4. DATE PARSER
   ================================================================ */

/**
 * Safely parses:
 *
 *   Date
 *   ISO date string
 *   numeric timestamp
 *   Google Sheets date values
 */
function sfOtpHelperParseDate(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    /* ------------------------------------------------------------
       Date object
       ------------------------------------------------------------ */

    if (
        Object.prototype.toString.call(value) ===
        "[object Date]"
    ) {

        if (
            isNaN(
                value.getTime()
            )
        ) {

            return null;
        }

        return new Date(
            value.getTime()
        );
    }


    /* ------------------------------------------------------------
       Numeric timestamp
       ------------------------------------------------------------ */

    if (
        typeof value === "number"
    ) {

        var numericDate =
            new Date(value);


        if (
            isNaN(
                numericDate.getTime()
            )
        ) {

            return null;
        }


        return numericDate;
    }


    /* ------------------------------------------------------------
       String date
       ------------------------------------------------------------ */

    var stringValue =
        String(value).trim();


    if (!stringValue) {
        return null;
    }


    var parsed =
        new Date(stringValue);


    if (
        isNaN(
            parsed.getTime()
        )
    ) {

        return null;
    }


    return parsed;
}


/* ================================================================
   5. CREATE OTP EXPIRATION
   ================================================================ */

/**
 * Creates an expiration date.
 *
 * This does NOT generate the OTP itself.
 */
function sfOtpHelperCreateExpiration(
    createdAt,
    minutes
) {

    var date =
        sfOtpHelperParseDate(
            createdAt
        );


    if (!date) {
        return null;
    }


    var expirationMinutes =
        Number(minutes);


    if (
        !isFinite(
            expirationMinutes
        ) ||
        expirationMinutes <= 0
    ) {

        expirationMinutes =
            SF_OTP_HELPER.EXPIRATION_MINUTES;
    }


    return new Date(
        date.getTime() +
        (
            expirationMinutes *
            60 *
            1000
        )
    );
}


/* ================================================================
   6. CHECK OTP EXPIRATION
   ================================================================ */

function sfOtpHelperIsExpired(
    expiresAt
) {

    var expiration =
        sfOtpHelperParseDate(
            expiresAt
        );


    if (!expiration) {
        return true;
    }


    return (
        Date.now() >=
        expiration.getTime()
    );
}


/* ================================================================
   7. CHECK OTP ACTIVE
   ================================================================ */

/**
 * Checks whether an OTP record is still usable.
 *
 * Supports the actual StockFlow field names:
 *
 *   OTP
 *   OTP EXPIRES
 *   OTP ATTEMPTS
 *   OTP LOCK UNTIL
 *   VERIFIED
 */
function sfOtpHelperIsActive(
    record
) {

    if (
        !record ||
        typeof record !== "object"
    ) {

        return false;
    }


    /* ------------------------------------------------------------
       ACTUAL SHEET FIELD:
       OTP
       ------------------------------------------------------------ */

    var otp =
        sfOtpHelperNormalizeCode(
            record.OTP ||
            record.OTP_CODE ||
            record.otp ||
            record.code ||
            ""
        );


    if (
        !sfOtpHelperIsValidFormat(
            otp
        )
    ) {

        return false;
    }


    /* ------------------------------------------------------------
       VERIFIED CHECK
       ------------------------------------------------------------ */

    var verified =
        String(
            record.VERIFIED ||
            ""
        )
        .trim()
        .toUpperCase();


    if (
        verified === "TRUE" ||
        verified === "YES" ||
        verified === "VERIFIED"
    ) {

        return false;
    }


    /* ------------------------------------------------------------
       ACTUAL SHEET FIELD:
       OTP EXPIRES
       ------------------------------------------------------------ */

    var expiresAt =
        record["OTP EXPIRES"] ||
        record.OTP_EXPIRES ||
        record.OTP_EXPIRES_AT ||
        record.otpExpiresAt ||
        record.expiresAt ||
        "";


    if (!expiresAt) {
        return false;
    }


    if (
        sfOtpHelperIsExpired(
            expiresAt
        )
    ) {

        return false;
    }


    /* ------------------------------------------------------------
       LOCK CHECK
       ------------------------------------------------------------ */

    var lockUntil =
        record["OTP LOCK UNTIL"] ||
        record.OTP_LOCK_UNTIL ||
        record.OTP_LOCKED_UNTIL ||
        record.otpLockedUntil ||
        "";


    if (
        lockUntil &&
        sfOtpHelperIsLocked(
            lockUntil
        )
    ) {

        return false;
    }


    return true;
}


/* ================================================================
   8. SAFE OTP COMPARISON
   ================================================================ */

/**
 * Compares the OTP stored by Code.gs with the OTP manually
 * entered by the user.
 *
 * This helper does NOT retrieve the OTP from the spreadsheet.
 * Code.gs must provide the expected value.
 */
function sfOtpHelperCompareCodes(
    expected,
    provided
) {

    var expectedOtp =
        sfOtpHelperNormalizeCode(
            expected
        );


    var providedOtp =
        sfOtpHelperNormalizeCode(
            provided
        );


    if (
        !sfOtpHelperIsValidFormat(
            expectedOtp
        )
    ) {

        return false;
    }


    if (
        !sfOtpHelperIsValidFormat(
            providedOtp
        )
    ) {

        return false;
    }


    return (
        expectedOtp ===
        providedOtp
    );
}


/* ================================================================
   9. NORMALIZE ATTEMPTS
   ================================================================ */

function sfOtpHelperNormalizeAttempts(
    value
) {

    var attempts =
        Number(value);


    if (
        !isFinite(attempts) ||
        attempts < 0
    ) {

        return 0;
    }


    return Math.floor(
        attempts
    );
}


/* ================================================================
   10. MAX ATTEMPTS
   ================================================================ */

function sfOtpHelperMaxAttemptsReached(
    value
) {

    var attempts =
        sfOtpHelperNormalizeAttempts(
            value
        );


    return (
        attempts >=
        SF_OTP_HELPER.MAX_ATTEMPTS
    );
}


/* ================================================================
   11. CREATE OTP LOCK
   ================================================================ */

function sfOtpHelperCreateLockExpiration(
    lockMinutes
) {

    var minutes =
        Number(lockMinutes);


    if (
        !isFinite(minutes) ||
        minutes <= 0
    ) {

        minutes =
            SF_OTP_HELPER.LOCK_MINUTES;
    }


    return new Date(
        Date.now() +
        (
            minutes *
            60 *
            1000
        )
    );
}


/* ================================================================
   12. CHECK OTP LOCK
   ================================================================ */

function sfOtpHelperIsLocked(
    lockUntil
) {

    var date =
        sfOtpHelperParseDate(
            lockUntil
        );


    if (!date) {
        return false;
    }


    return (
        Date.now() <
        date.getTime()
    );
}


/* ================================================================
   13. CREATE RESEND COOLDOWN
   ================================================================ */

function sfOtpHelperCreateCooldown(
    seconds
) {

    var cooldownSeconds =
        Number(seconds);


    if (
        !isFinite(
            cooldownSeconds
        ) ||
        cooldownSeconds < 0
    ) {

        cooldownSeconds =
            SF_OTP_HELPER.RESEND_COOLDOWN_SECONDS;
    }


    return new Date(
        Date.now() +
        (
            cooldownSeconds *
            1000
        )
    );
}


/* ================================================================
   14. CHECK RESEND COOLDOWN
   ================================================================ */

function sfOtpHelperIsCooldownActive(
    cooldownUntil
) {

    var date =
        sfOtpHelperParseDate(
            cooldownUntil
        );


    if (!date) {
        return false;
    }


    return (
        Date.now() <
        date.getTime()
    );
}


/* ================================================================
   15. GET REMAINING COOLDOWN
   ================================================================ */

function sfOtpHelperGetCooldownSeconds(
    cooldownUntil
) {

    var date =
        sfOtpHelperParseDate(
            cooldownUntil
        );


    if (!date) {
        return 0;
    }


    var remaining =
        date.getTime() -
        Date.now();


    if (
        remaining <= 0
    ) {

        return 0;
    }


    return Math.ceil(
        remaining / 1000
    );
}


/* ================================================================
   16. NORMALIZE CHANNEL
   ================================================================ */

function sfOtpHelperNormalizeChannel(
    channel
) {

    if (
        channel === null ||
        channel === undefined
    ) {

        return "";
    }


    var value =
        String(channel)
            .trim()
            .toLowerCase();


    if (
        value === "email" ||
        value === "gmail" ||
        value === "mail"
    ) {

        return "email";
    }


    if (
        value === "phone" ||
        value === "mobile" ||
        value === "sms"
    ) {

        return "phone";
    }


    return "";
}


/* ================================================================
   17. NORMALIZE IDENTITY
   ================================================================ */

function sfOtpHelperNormalizeIdentity(
    value,
    channel
) {

    var normalizedChannel =
        sfOtpHelperNormalizeChannel(
            channel
        );


    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    var identity =
        String(value).trim();


    if (
        normalizedChannel ===
        "email"
    ) {

        return identity.toLowerCase();
    }


    if (
        normalizedChannel ===
        "phone"
    ) {

        return identity.replace(
            /[^\d+]/g,
            ""
        );
    }


    return identity.toLowerCase();
}


/* ================================================================
   18. MASK EMAIL
   ================================================================ */

function sfOtpHelperMaskEmail(
    email
) {

    var value =
        sfOtpHelperNormalizeIdentity(
            email,
            "email"
        );


    if (!value) {
        return "";
    }


    var atIndex =
        value.indexOf("@");


    if (
        atIndex <= 0
    ) {

        return value;
    }


    var local =
        value.substring(
            0,
            atIndex
        );


    var domain =
        value.substring(
            atIndex
        );


    if (
        local.length <= 2
    ) {

        return (
            local.charAt(0) +
            "*" +
            domain
        );
    }


    return (
        local.charAt(0) +
        "*".repeat(
            Math.max(
                1,
                local.length - 2
            )
        ) +
        local.charAt(
            local.length - 1
        ) +
        domain
    );
}


/* ================================================================
   19. MASK PHONE
   ================================================================ */

function sfOtpHelperMaskPhone(
    phone
) {

    var value =
        sfOtpHelperNormalizeIdentity(
            phone,
            "phone"
        );


    if (!value) {
        return "";
    }


    var digits =
        value.replace(
            /\D/g,
            ""
        );


    if (
        digits.length <= 4
    ) {

        return value;
    }


    var visibleStart =
        Math.min(
            4,
            digits.length
        );


    var visibleEnd =
        Math.min(
            2,
            Math.max(
                0,
                digits.length -
                visibleStart
            )
        );


    var middleLength =
        digits.length -
        visibleStart -
        visibleEnd;


    if (
        middleLength <= 0
    ) {

        return value;
    }


    return (
        digits.substring(
            0,
            visibleStart
        ) +
        "*".repeat(
            middleLength
        ) +
        digits.substring(
            digits.length -
            visibleEnd
        )
    );
}


/* ================================================================
   20. SAFE OTP METADATA
   ================================================================ */

/**
 * Builds diagnostic metadata.
 *
 * NEVER includes the actual OTP.
 */
function sfOtpHelperBuildMetadata(
    channel,
    identity,
    username
) {

    var normalizedChannel =
        sfOtpHelperNormalizeChannel(
            channel
        );


    var normalizedIdentity =
        sfOtpHelperNormalizeIdentity(
            identity,
            normalizedChannel
        );


    return {

        channel:
            normalizedChannel,


        username:
            username === null ||
            username === undefined
                ? ""
                : String(
                    username
                ).trim(),


        maskedIdentity:
            normalizedChannel ===
            "email"

                ? sfOtpHelperMaskEmail(
                    normalizedIdentity
                )

                : normalizedChannel ===
                  "phone"

                    ? sfOtpHelperMaskPhone(
                        normalizedIdentity
                    )

                    : "",


        timestamp:
            new Date().toISOString()
    };
}


/* ================================================================
   21. OTP CLEAR FIELDS
   ================================================================ */

/**
 * Returns field names compatible with the actual StockFlow
 * Google Sheet.
 *
 * Code.gs remains responsible for writing them.
 */
function sfOtpHelperGetClearFields() {

    return {

        OTP:
            "",

        "OTP EXPIRES":
            "",

        "OTP ATTEMPTS":
            0,

        "OTP LOCK UNTIL":
            "",

        "OTP CHANNEL":
            "",

        "OTP REQUESTED AT":
            "",

        "OTP EMAIL SENT":
            false,

        "OTP PHONE SENT":
            false
    };
}


/* ================================================================
   22. OTP RECORD BUILDER
   ================================================================ */

/**
 * Builds OTP metadata only.
 *
 * IMPORTANT:
 *
 * This function does NOT:
 *
 *   - generate an OTP
 *   - call Math.random()
 *   - send an email
 *   - send an SMS
 *   - expose an OTP
 */
function sfOtpHelperBuildRecord(
    channel,
    createdAt,
    expiresAt
) {

    var normalizedChannel =
        sfOtpHelperNormalizeChannel(
            channel
        );


    var created =
        sfOtpHelperParseDate(
            createdAt
        );


    var expires =
        sfOtpHelperParseDate(
            expiresAt
        );


    return {

        "OTP CHANNEL":
            normalizedChannel,


        "OTP CREATED AT":
            created
                ? created.toISOString()
                : "",


        "OTP EXPIRES":
            expires
                ? expires.toISOString()
                : "",


        "OTP ATTEMPTS":
            0,


        "OTP LOCK UNTIL":
            "",


        "OTP REQUESTED AT":
            new Date().toISOString()
    };
}


/* ================================================================
   23. RESULT BUILDER
   ================================================================ */

function sfOtpHelperResult(
    success,
    status,
    message,
    extra
) {

    var result = {

        success:
            Boolean(success),

        status:
            status || "",

        message:
            message || ""
    };


    if (
        extra &&
        typeof extra === "object"
    ) {

        Object.keys(extra)
            .forEach(
                function (key) {

                    result[key] =
                        extra[key];

                }
            );
    }


    return result;
}


/* ================================================================
   24. SAFE STRING
   ================================================================ */

function sfOtpHelperSafeString(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
        .trim();
}


/* ================================================================
   25. BOOLEAN NORMALIZATION
   ================================================================ */

function sfOtpHelperToBoolean(
    value
) {

    if (
        value === true ||
        value === false
    ) {

        return value;
    }


    if (
        value === null ||
        value === undefined
    ) {

        return false;
    }


    var normalized =
        String(value)
            .trim()
            .toLowerCase();


    return (
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "1" ||
        normalized === "verified" ||
        normalized === "active"
    );
}


/* ================================================================
   26. OTP SETTINGS
   ================================================================ */

function sfOtpHelperGetSettings() {

    var settings = {

        length:
            SF_OTP_HELPER.LENGTH,

        expirationMinutes:
            SF_OTP_HELPER.EXPIRATION_MINUTES,

        maxAttempts:
            SF_OTP_HELPER.MAX_ATTEMPTS,

        lockMinutes:
            SF_OTP_HELPER.LOCK_MINUTES,

        resendCooldownSeconds:
            SF_OTP_HELPER.RESEND_COOLDOWN_SECONDS
    };


    /*
     * If Code.gs exposes SF_CONFIG, use it.
     *
     * Otherwise the safe helper defaults remain active.
     */

    try {

        if (
            typeof SF_CONFIG !==
            "undefined" &&
            SF_CONFIG &&
            SF_CONFIG.AUTH
        ) {

            if (
                SF_CONFIG.AUTH.OTP_LENGTH !==
                undefined
            ) {

                settings.length =
                    Number(
                        SF_CONFIG.AUTH.OTP_LENGTH
                    );
            }


            if (
                SF_CONFIG.AUTH.OTP_EXPIRATION_MINUTES !==
                undefined
            ) {

                settings.expirationMinutes =
                    Number(
                        SF_CONFIG.AUTH.OTP_EXPIRATION_MINUTES
                    );
            }


            if (
                SF_CONFIG.AUTH.MAX_OTP_ATTEMPTS !==
                undefined
            ) {

                settings.maxAttempts =
                    Number(
                        SF_CONFIG.AUTH.MAX_OTP_ATTEMPTS
                    );
            }


            if (
                SF_CONFIG.AUTH.OTP_LOCK_MINUTES !==
                undefined
            ) {

                settings.lockMinutes =
                    Number(
                        SF_CONFIG.AUTH.OTP_LOCK_MINUTES
                    );
            }


            if (
                SF_CONFIG.AUTH.OTP_RESEND_COOLDOWN_SECONDS !==
                undefined
            ) {

                settings.resendCooldownSeconds =
                    Number(
                        SF_CONFIG.AUTH.OTP_RESEND_COOLDOWN_SECONDS
                    );
            }
        }

    } catch (error) {

        console.warn(
            "[STOCKFLOW OTP HELPER] " +
            "Unable to read SF_CONFIG. " +
            "Using helper defaults.",
            error
        );
    }


    return settings;
}


/* ================================================================
   27. VALIDATE SETTINGS
   ================================================================ */

function sfOtpHelperValidateSettings() {

    var settings =
        sfOtpHelperGetSettings();


    var errors = [];


    if (
        !Number.isFinite(
            settings.length
        ) ||
        settings.length !== 6
    ) {

        errors.push(
            "OTP length must be exactly 6."
        );
    }


    if (
        !Number.isFinite(
            settings.expirationMinutes
        ) ||
        settings.expirationMinutes <= 0
    ) {

        errors.push(
            "OTP expiration must be greater than zero."
        );
    }


    if (
        !Number.isFinite(
            settings.maxAttempts
        ) ||
        settings.maxAttempts <= 0
    ) {

        errors.push(
            "Maximum OTP attempts must be greater than zero."
        );
    }


    if (
        !Number.isFinite(
            settings.lockMinutes
        ) ||
        settings.lockMinutes <= 0
    ) {

        errors.push(
            "OTP lock duration must be greater than zero."
        );
    }


    if (
        !Number.isFinite(
            settings.resendCooldownSeconds
        ) ||
        settings.resendCooldownSeconds < 0
    ) {

        errors.push(
            "OTP resend cooldown cannot be negative."
        );
    }


    return {

        valid:
            errors.length === 0,

        errors:
            errors,

        settings:
            settings
    };
}


/* ================================================================
   28. DIAGNOSTICS
   ================================================================ */

function sfOtpHelperDiagnostics() {

    var validation =
        sfOtpHelperValidateSettings();


    return {

        module:
            "STOCKFLOW OTP HELPER",

        status:
            validation.valid
                ? "READY"
                : "CONFIGURATION ERROR",

        settings:
            validation.settings,

        errors:
            validation.errors,

        generatedBy:
            "Code.gs",

        frontendGeneration:
            false,

        frontendAutofill:
            false,

        otpReturnedToFrontend:
            false,

        resendCooldown:
            validation.settings
                .resendCooldownSeconds +
            " seconds"
    };
}


/* ================================================================
   29. STARTUP DIAGNOSTIC
   ================================================================ */

try {

    var sfOtpHelperCheck =
        sfOtpHelperValidateSettings();


    if (
        sfOtpHelperCheck.valid
    ) {

        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "Loaded successfully."
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "OTP generation source: Code.gs"
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "Frontend OTP generation: DISABLED"
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "Frontend OTP autofill: DISABLED"
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "OTP expiration: " +
            sfOtpHelperCheck.settings
                .expirationMinutes +
            " minutes"
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "Maximum attempts: " +
            sfOtpHelperCheck.settings
                .maxAttempts
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "Temporary lock: " +
            sfOtpHelperCheck.settings
                .lockMinutes +
            " minutes"
        );


        console.log(
            "[STOCKFLOW OTP HELPER] " +
            "Resend cooldown: " +
            sfOtpHelperCheck.settings
                .resendCooldownSeconds +
            " seconds"
        );

    } else {

        console.warn(
            "[STOCKFLOW OTP HELPER] " +
            "Configuration warnings:",
            sfOtpHelperCheck.errors
        );
    }

} catch (error) {

    console.warn(
        "[STOCKFLOW OTP HELPER] " +
        "Startup diagnostic failed:",
        error
    );
}


/* ================================================================
   END OF OTP HELPER MODULE
   ================================================================ */
