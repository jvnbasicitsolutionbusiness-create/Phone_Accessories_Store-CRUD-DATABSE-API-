/**
 * ================================================================
 * STOCKFLOW - OTP HELPER MODULE
 * ================================================================
 *
 * Purpose:
 *   Helper functions used by the main Code.gs authentication/OTP
 *   system.
 *
 * IMPORTANT:
 *   - Code.gs is the SINGLE source of truth for the API.
 *   - This file does NOT define:
 *       doGet()
 *       doPost()
 *       generateOtp()
 *       verifyOtp()
 *       resendOtp()
 *       prepareOtp()
 *       requestOtp()
 *
 *   - Do NOT generate OTPs in the frontend.
 *   - OTP generation happens in Code.gs.
 *   - OTP storage/verification is controlled by Code.gs.
 *
 * This module only provides uniquely named helper functions so it
 * cannot conflict with the main API functions.
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
 * Converts an OTP value into a clean six-digit string.
 *
 * Example:
 *   123456       -> "123456"
 *   "123456"     -> "123456"
 *   " 123456 "   -> "123456"
 */
function sfOtpHelperNormalizeCode(value) {

    if (value === null || value === undefined) {
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
 * Returns true only when the value is exactly six digits.
 */
function sfOtpHelperIsValidFormat(value) {

    var otp = sfOtpHelperNormalizeCode(value);

    return /^\d{6}$/.test(otp);
}


/* ================================================================
   4. OTP EXPIRATION
   ================================================================ */

/**
 * Creates an expiration Date from a creation time.
 *
 * @param {Date|string|number} createdAt
 * @param {number} minutes
 * @return {Date|null}
 */
function sfOtpHelperCreateExpiration(createdAt, minutes) {

    var date = sfOtpHelperParseDate(createdAt);

    if (!date) {
        return null;
    }

    var expirationMinutes =
        Number(minutes);

    if (!isFinite(expirationMinutes) ||
        expirationMinutes <= 0) {

        expirationMinutes =
            SF_OTP_HELPER.EXPIRATION_MINUTES;
    }

    return new Date(
        date.getTime() +
        (expirationMinutes * 60 * 1000)
    );
}


/* ================================================================
   5. CHECK OTP EXPIRATION
   ================================================================ */

/**
 * Determines whether an OTP has expired.
 *
 * @param {Date|string|number} expiresAt
 * @return {boolean}
 */
function sfOtpHelperIsExpired(expiresAt) {

    var expiration =
        sfOtpHelperParseDate(expiresAt);

    if (!expiration) {
        return true;
    }

    return new Date().getTime() >=
        expiration.getTime();
}


/* ================================================================
   6. CHECK OTP ACTIVE
   ================================================================ */

/**
 * Determines whether an OTP is still usable.
 *
 * @param {Object} record
 * @return {boolean}
 */
function sfOtpHelperIsActive(record) {

    if (!record || typeof record !== "object") {
        return false;
    }

    var otp =
        sfOtpHelperNormalizeCode(
            record.OTP_CODE ||
            record.otp ||
            record.code ||
            ""
        );

    if (!sfOtpHelperIsValidFormat(otp)) {
        return false;
    }

    var verified =
        String(
            record.VERIFIED || ""
        ).toUpperCase();

    if (
        verified === "TRUE" ||
        verified === "YES" ||
        verified === "VERIFIED"
    ) {
        return false;
    }

    var expiresAt =
        record.OTP_EXPIRES_AT ||
        record.otpExpiresAt ||
        record.expiresAt ||
        "";

    if (!expiresAt) {
        return false;
    }

    return !sfOtpHelperIsExpired(expiresAt);
}


/* ================================================================
   7. SAFE OTP COMPARISON
   ================================================================ */

/**
 * Compares two OTP values after normalization.
 */
function sfOtpHelperCompareCodes(expected, provided) {

    var expectedOtp =
        sfOtpHelperNormalizeCode(expected);

    var providedOtp =
        sfOtpHelperNormalizeCode(provided);

    if (!sfOtpHelperIsValidFormat(expectedOtp)) {
        return false;
    }

    if (!sfOtpHelperIsValidFormat(providedOtp)) {
        return false;
    }

    return expectedOtp === providedOtp;
}


/* ================================================================
   8. ATTEMPT COUNTER
   ================================================================ */

/**
 * Converts an attempt value into a safe integer.
 */
function sfOtpHelperNormalizeAttempts(value) {

    var attempts = Number(value);

    if (!isFinite(attempts) || attempts < 0) {
        return 0;
    }

    return Math.floor(attempts);
}


/**
 * Returns true if the maximum OTP attempts have been reached.
 */
function sfOtpHelperMaxAttemptsReached(value) {

    var attempts =
        sfOtpHelperNormalizeAttempts(value);

    return attempts >=
        SF_OTP_HELPER.MAX_ATTEMPTS;
}


/* ================================================================
   9. OTP LOCK
   ================================================================ */

/**
 * Creates an OTP lock expiration date.
 */
function sfOtpHelperCreateLockExpiration(
    lockMinutes
) {

    var minutes =
        Number(lockMinutes);

    if (!isFinite(minutes) || minutes <= 0) {
        minutes =
            SF_OTP_HELPER.LOCK_MINUTES;
    }

    return new Date(
        Date.now() +
        (minutes * 60 * 1000)
    );
}


/**
 * Determines whether the current OTP lock is still active.
 */
function sfOtpHelperIsLocked(lockUntil) {

    var date =
        sfOtpHelperParseDate(lockUntil);

    if (!date) {
        return false;
    }

    return Date.now() <
        date.getTime();
}


/* ================================================================
   10. RESEND COOLDOWN
   ================================================================ */

/**
 * Creates a future cooldown timestamp.
 */
function sfOtpHelperCreateCooldown(
    seconds
) {

    var cooldownSeconds =
        Number(seconds);

    if (
        !isFinite(cooldownSeconds) ||
        cooldownSeconds < 0
    ) {
        cooldownSeconds =
            SF_OTP_HELPER.RESEND_COOLDOWN_SECONDS;
    }

    return new Date(
        Date.now() +
        (cooldownSeconds * 1000)
    );
}


/**
 * Determines whether a resend cooldown is active.
 */
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

    return Date.now() <
        date.getTime();
}


/**
 * Returns remaining cooldown seconds.
 */
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

    if (remaining <= 0) {
        return 0;
    }

    return Math.ceil(
        remaining / 1000
    );
}


/* ================================================================
   11. CHANNEL NORMALIZATION
   ================================================================ */

/**
 * Normalizes email/phone channel names.
 */
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
   12. IDENTITY NORMALIZATION
   ================================================================ */

/**
 * Creates a normalized identity value.
 *
 * Email:
 *   lowercase + trim
 *
 * Phone:
 *   digits only, preserving Philippine country code when supplied.
 */
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

    if (normalizedChannel === "email") {
        return identity.toLowerCase();
    }

    if (normalizedChannel === "phone") {

        identity =
            identity.replace(
                /[^\d+]/g,
                ""
            );

        return identity;
    }

    return identity.toLowerCase();
}


/* ================================================================
   13. MASK EMAIL
   ================================================================ */

/**
 * Example:
 *   john.doe@gmail.com
 *   -> j******e@gmail.com
 */
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

    if (atIndex <= 0) {
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

    if (local.length <= 2) {

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
   14. MASK PHONE
   ================================================================ */

/**
 * Example:
 *   09171234567
 *   -> 0917******67
 */
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

    if (digits.length <= 4) {
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

    if (middleLength <= 0) {
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
   15. OTP METADATA BUILDER
   ================================================================ */

/**
 * Creates a safe metadata object for logging/debugging.
 *
 * IMPORTANT:
 *   The OTP itself is intentionally NOT returned here.
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
        channel: normalizedChannel,
        username:
            username === null ||
            username === undefined
                ? ""
                : String(username).trim(),

        maskedIdentity:
            normalizedChannel === "email"
                ? sfOtpHelperMaskEmail(
                    normalizedIdentity
                )
                : normalizedChannel === "phone"
                    ? sfOtpHelperMaskPhone(
                        normalizedIdentity
                    )
                    : "",

        timestamp:
            new Date().toISOString()
    };
}


/* ================================================================
   16. OTP FIELD CLEARING OBJECT
   ================================================================ */

/**
 * Returns the standard OTP fields that should be cleared
 * after successful verification or invalidation.
 *
 * This function DOES NOT write to the spreadsheet.
 * Code.gs remains responsible for database writes.
 */
function sfOtpHelperGetClearFields() {

    return {
        OTP_CODE: "",
        OTP_CREATED_AT: "",
        OTP_EXPIRES_AT: "",
        OTP_ATTEMPTS: 0,
        OTP_LOCKED_UNTIL: "",
        OTP_CHANNEL: "",
        OTP_REQUESTED_AT: "",
        OTP_EMAIL_SENT: false,
        OTP_PHONE_SENT: false
    };
}


/* ================================================================
   17. OTP RECORD BUILDER
   ================================================================ */

/**
 * Builds OTP metadata without generating an OTP.
 *
 * IMPORTANT:
 *   This helper does NOT call Math.random().
 *   It does NOT create a verification code.
 *
 * Code.gs must generate the actual OTP.
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
        OTP_CHANNEL:
            normalizedChannel,

        OTP_CREATED_AT:
            created
                ? created.toISOString()
                : "",

        OTP_EXPIRES_AT:
            expires
                ? expires.toISOString()
                : "",

        OTP_ATTEMPTS:
            0,

        OTP_LOCKED_UNTIL:
            "",

        OTP_REQUESTED_AT:
            new Date().toISOString()
    };
}


/* ================================================================
   18. VERIFY RESULT BUILDER
   ================================================================ */

/**
 * Creates a consistent helper result object.
 *
 * This is only a data helper.
 * It does not verify the OTP itself.
 */
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
            .forEach(function (key) {

                result[key] =
                    extra[key];

            });
    }

    return result;
}


/* ================================================================
   19. DATE PARSER
   ================================================================ */

/**
 * Safely parses dates used by the OTP system.
 *
 * Supports:
 *   Date
 *   ISO string
 *   numeric timestamp
 *   Google Sheets date values
 */
function sfOtpHelperParseDate(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

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
   20. SAFE STRING
   ================================================================ */

/**
 * Converts values safely to trimmed strings.
 */
function sfOtpHelperSafeString(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


/* ================================================================
   21. BOOLEAN NORMALIZATION
   ================================================================ */

/**
 * Converts common Sheet/API boolean representations
 * into an actual Boolean.
 */
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
   22. CONFIGURATION READER
   ================================================================ */

/**
 * Attempts to read OTP settings from the main SF_CONFIG
 * if Code.gs exposes one.
 *
 * Falls back to the helper defaults.
 *
 * This does not create or modify the main configuration.
 */
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


    try {

        if (
            typeof SF_CONFIG !== "undefined" &&
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
   23. VALIDATE OTP SETTINGS
   ================================================================ */

/**
 * Checks OTP configuration without modifying it.
 */
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
            "OTP length must be 6."
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
   24. DEBUG SUMMARY
   ================================================================ */

/**
 * Returns a safe diagnostic summary.
 *
 * Does NOT expose OTP codes.
 */
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

        randomOtpGeneration:
            false,

        resendCooldown:
            validation.settings
                .resendCooldownSeconds +
            " seconds"
    };
}


/* ================================================================
   25. STARTUP LOG
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
