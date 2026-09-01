// ============================================================
// STOCKFLOW GOOGLE APPS SCRIPT BACKEND
// ============================================================
//
// StockFlow | Phone Accessories Inventory
//
// Authentication backend:
// - Registration
// - Login
// - Gmail OTP
// - OTP expiration
// - OTP attempt limit
// - 30-minute OTP lock
// - OTP resend
// - Forgot password
// - Recovery OTP
// - Password reset
//
// IMPORTANT:
// Real OTPs are NOT returned to the browser.
// They are sent through Gmail using MailApp.
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_NAME = "USER";

const APP_NAME =
    "StockFlow | Phone Accessories Inventory";

const OTP_MINUTES = 10;

const MAX_OTP_ATTEMPTS = 4;

const LOCK_MINUTES = 30;


// ============================================================
// SHEET HEADERS
// ============================================================

const HEADERS = [

    "ID",
    "NAME",
    "USERNAME",
    "PASSWORD",
    "AGE",
    "ACCOUNT_S",
    "GMAIL",
    "PHONE NO.",
    "ROLE",
    "VERIFIED",
    "OTP",
    "OTP EXPIRES",
    "OTP ATTEMPT",
    "OTP TYPE",
    "OTP CHANNEL",
    "OTP LOCKED UNTIL",
    "RECOVERY TOKEN",
    "RECOVERY EXPIRES",
    "VERIFIED AT",
    "CREATED AT"

];


// ============================================================
// JSON RESPONSE
// ============================================================

function json_(data) {

    return ContentService
        .createTextOutput(
            JSON.stringify(data)
        )
        .setMimeType(
            ContentService.MimeType.JSON
        );

}


// ============================================================
// GET SHEET
// ============================================================

function getSheet_() {

    const ss =
        SpreadsheetApp.getActiveSpreadsheet();

    let sheet =
        ss.getSheetByName(
            SHEET_NAME
        );

    if (!sheet) {

        sheet =
            ss.insertSheet(
                SHEET_NAME
            );

    }


    if (sheet.getLastRow() === 0) {

        sheet
            .getRange(
                1,
                1,
                1,
                HEADERS.length
            )
            .setValues([
                HEADERS
            ]);

    }

    else {

        ensureHeaders_(sheet);

        migrateLegacyRows_(sheet);

    }


    return sheet;

}


// ============================================================
// ENSURE HEADERS
// ============================================================

function ensureHeaders_(sheet) {

    const requiredLength =
        Math.max(
            sheet.getLastColumn(),
            HEADERS.length
        );


    const currentHeaders =
        sheet
            .getRange(
                1,
                1,
                1,
                requiredLength
            )
            .getValues()[0];


    const existing =
        currentHeaders.map(
            value =>
                String(value || "")
                    .trim()
                    .toUpperCase()
        );


    HEADERS.forEach(
        (header, index) => {

            if (!existing[index]) {

                sheet
                    .getRange(
                        1,
                        index + 1
                    )
                    .setValue(
                        header
                    );

            }

        }
    );

}


// ============================================================
// HEADER MAP
// ============================================================

function headerMap_(sheet) {

    const lastColumn =
        Math.max(
            sheet.getLastColumn(),
            HEADERS.length
        );


    const headers =
        sheet
            .getRange(
                1,
                1,
                1,
                lastColumn
            )
            .getValues()[0];


    const map = {};


    headers.forEach(
        (header, index) => {

            const key =
                String(header || "")
                    .trim()
                    .toUpperCase();


            if (key) {

                map[key] =
                    index + 1;

            }

        }
    );


    return map;

}


// ============================================================
// LEGACY DATA MIGRATION
// ============================================================
//
// Your screenshot shows that the previous system stored:
//
// NAME
// USERNAME
// PASSWORD
// AGE
// ACCOUNT STATUS
// GMAIL
// PHONE
//
// starting at column A.
//
// The new sheet starts with ID.
//
// This migration fixes that old layout automatically.
// ============================================================

function migrateLegacyRows_(sheet) {

    const map =
        headerMap_(sheet);


    const lastRow =
        sheet.getLastRow();


    if (lastRow < 2) {

        return;

    }


    const columnCount =
        Math.max(
            sheet.getLastColumn(),
            HEADERS.length
        );


    const values =
        sheet
            .getRange(
                2,
                1,
                lastRow - 1,
                columnCount
            )
            .getValues();


    values.forEach(
        (row, index) => {

            const rowNumber =
                index + 2;


            const a =
                String(
                    row[0] || ""
                ).trim();


            const b =
                String(
                    row[1] || ""
                ).trim();


            const c =
                String(
                    row[2] || ""
                ).trim();


            const d =
                String(
                    row[3] || ""
                ).trim();


            const e =
                String(
                    row[4] || ""
                )
                .trim()
                .toUpperCase();


            const f =
                String(
                    row[5] || ""
                ).trim();


            const g =
                String(
                    row[6] || ""
                ).trim();


            const looksLegacy =

                a &&
                b &&
                c &&
                /^\d+$/.test(d) &&
                [
                    "PENDING",
                    "VERIFIED",
                    "ACTIVE",
                    "INACTIVE",
                    "DISABLED"
                ].includes(e) &&
                f &&
                g &&
                !String(
                    row[7] || ""
                ).trim();


            if (!looksLegacy) {

                return;

            }


            const newRow =
                Array(
                    HEADERS.length
                ).fill("");


            newRow[
                map["ID"] - 1
            ] =
                "sf_" +
                Utilities.getUuid();


            newRow[
                map["NAME"] - 1
            ] =
                a;


            newRow[
                map["USERNAME"] - 1
            ] =
                b;


            newRow[
                map["PASSWORD"] - 1
            ] =
                c;


            newRow[
                map["AGE"] - 1
            ] =
                d;


            newRow[
                map["ACCOUNT_S"] - 1
            ] =

                e === "VERIFIED"
                    ? "ACTIVE"
                    : e;


            newRow[
                map["GMAIL"] - 1
            ] =
                f.toLowerCase();


            newRow[
                map["PHONE NO."] - 1
            ] =
                normalizePhone_(g);


            newRow[
                map["ROLE"] - 1
            ] =
                "Employee";


            newRow[
                map["VERIFIED"] - 1
            ] =

                e === "VERIFIED"
                    ? "YES"
                    : "NO";


            newRow[
                map["CREATED AT"] - 1
            ] =
                new Date();


            if (
                e === "VERIFIED"
            ) {

                newRow[
                    map["VERIFIED AT"] - 1
                ] =
                    new Date();

            }


            sheet
                .getRange(
                    rowNumber,
                    1,
                    1,
                    HEADERS.length
                )
                .clearContent();


            sheet
                .getRange(
                    rowNumber,
                    1,
                    1,
                    HEADERS.length
                )
                .setValues([
                    newRow
                ]);

        }
    );

}


// ============================================================
// GET
// ============================================================

function doGet(e) {

    const action =

        String(
            e &&
            e.parameter &&
            e.parameter.action ||
            "health"
        );


    // --------------------------------------------------------
    // HEALTH
    // --------------------------------------------------------

    if (
        action === "health"
    ) {

        return json_({

            success: true,

            service:
                APP_NAME,

            status:
                "online",

            sheet:
                SHEET_NAME

        });

    }


    // --------------------------------------------------------
    // USERS
    // --------------------------------------------------------

    if (
        action === "users"
    ) {

        const sheet =
            getSheet_();

        const map =
            headerMap_(
                sheet
            );

        const values =
            sheet
                .getDataRange()
                .getValues();


        const users =
            values
                .slice(1)
                .map(
                    row => ({

                        uid:
                            cell_(
                                row,
                                map["ID"]
                            ),

                        name:
                            cell_(
                                row,
                                map["NAME"]
                            ),

                        username:
                            cell_(
                                row,
                                map["USERNAME"]
                            ),

                        age:
                            cell_(
                                row,
                                map["AGE"]
                            ),

                        accountStatus:
                            cell_(
                                row,
                                map["ACCOUNT_S"]
                            ),

                        gmail:
                            cell_(
                                row,
                                map["GMAIL"]
                            ),

                        phone:
                            cell_(
                                row,
                                map["PHONE NO."]
                            ),

                        role:
                            cell_(
                                row,
                                map["ROLE"]
                            ),

                        verified:
                            String(
                                cell_(
                                    row,
                                    map["VERIFIED"]
                                )
                            ).toUpperCase()
                            === "YES"

                    })
                );


        return json_({

            success: true,

            users:
                users

        });

    }


    return json_({

        success: false,

        message:
            "Unknown GET action."

    });

}


// ============================================================
// POST ROUTER
// ============================================================

function doPost(e) {

    const lock =
        LockService
            .getScriptLock();


    try {

        lock.waitLock(
            10000
        );


        const body =

            JSON.parse(
                (
                    e &&
                    e.postData &&
                    e.postData.contents
                ) || "{}"
            );


        const action =
            String(
                body.action || ""
            ).trim();


        switch (action) {


            case "register":

                return register_(
                    body
                );


            case "login":

                return login_(
                    body
                );


            case "verifyOtp":

                return verifyOtp_(
                    body
                );


            case "requestOtp":

                return requestOtp_(
                    body
                );


            case "updateOtp":

                return requestOtp_(
                    body
                );


            case "forgotPassword":

                return forgotPassword_(
                    body
                );


            case "verifyRecoveryOtp":

                return verifyRecoveryOtp_(
                    body
                );


            case "resetPassword":

                return resetPassword_(
                    body
                );


            default:

                return json_({

                    success: false,

                    message:
                        "Unknown API action: " +
                        action

                });

        }

    }

    catch (error) {

        return json_({

            success: false,

            message:
                error.message ||
                "Server error."

        });

    }

    finally {

        try {

            lock.releaseLock();

        }

        catch (_) {}

    }

}


// ============================================================
// REGISTER
// ============================================================

function register_(data) {

    const sheet =
        getSheet_();

    const map =
        headerMap_(
            sheet
        );

    const values =
        sheet
            .getDataRange()
            .getValues();


    const username =
        String(
            data.username || ""
        ).trim();


    const gmail =
        String(
            data.gmail || ""
        )
        .trim()
        .toLowerCase();


    const phone =
        normalizePhone_(
            data.phone || ""
        );


    if (
        !username ||
        !gmail ||
        !phone
    ) {

        return json_({

            success: false,

            message:
                "Required registration fields are missing."

        });

    }


    // --------------------------------------------------------
    // DUPLICATE CHECK
    // --------------------------------------------------------

    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        const existingUsername =

            String(
                cell_(
                    values[i],
                    map["USERNAME"]
                )
            )
            .trim()
            .toLowerCase();


        const existingEmail =

            String(
                cell_(
                    values[i],
                    map["GMAIL"]
                )
            )
            .trim()
            .toLowerCase();


        const existingPhone =

            normalizePhone_(
                cell_(
                    values[i],
                    map["PHONE NO."]
                )
            );


        if (
            existingUsername ===
            username.toLowerCase()
        ) {

            return json_({

                success: false,

                message:
                    "Username already exists."

            });

        }


        if (
            existingEmail ===
            gmail
        ) {

            return json_({

                success: false,

                message:
                    "Email already exists."

            });

        }


        if (
            existingPhone &&
            existingPhone ===
            phone
        ) {

            return json_({

                success: false,

                message:
                    "Phone number already exists."

            });

        }

    }


    const uid =

        String(
            data.uid ||
            "sf_" +
            Utilities.getUuid()
        );


    const otp =
        generateOtp_();


    const expires =

        new Date(
            Date.now() +
            OTP_MINUTES * 60000
        );


    const row =
        Array(
            HEADERS.length
        ).fill("");


    row[
        map["ID"] - 1
    ] =
        uid;


    row[
        map["NAME"] - 1
    ] =
        String(
            data.name || ""
        ).trim();


    row[
        map["USERNAME"] - 1
    ] =
        username;


    row[
        map["PASSWORD"] - 1
    ] =
        String(
            data.password || ""
        );


    row[
        map["AGE"] - 1
    ] =
        Number(
            data.age || 0
        );


    row[
        map["ACCOUNT_S"] - 1
    ] =
        "PENDING";


    row[
        map["GMAIL"] - 1
    ] =
        gmail;


    row[
        map["PHONE NO."] - 1
    ] =
        phone;


    row[
        map["ROLE"] - 1
    ] =
        "Employee";


    row[
        map["VERIFIED"] - 1
    ] =
        "NO";


    row[
        map["OTP"] - 1
    ] =
        otp;


    row[
        map["OTP EXPIRES"] - 1
    ] =
        expires;


    row[
        map["OTP ATTEMPT"] - 1
    ] =
        0;


    row[
        map["OTP TYPE"] - 1
    ] =
        "VERIFICATION";


    row[
        map["OTP CHANNEL"] - 1
    ] =
        "GMAIL";


    row[
        map["CREATED AT"] - 1
    ] =
        new Date();


    sheet
        .getRange(
            sheet.getLastRow() + 1,
            1,
            1,
            row.length
        )
        .setValues([
            row
        ]);


    // --------------------------------------------------------
    // SEND REAL GMAIL OTP
    // --------------------------------------------------------

    const sendResult =
        sendOtp_(
            gmail,
            phone,
            otp,
            "verification",
            "GMAIL"
        );


    if (
        !sendResult.success
    ) {

        return json_({

            success: false,

            message:
                "Registration was saved, but Gmail delivery failed. " +
                sendResult.message

        });

    }


    return json_({

        success: true,

        message:
            "Registration saved. A verification code was sent to your Gmail.",

        uid:
            uid,

        verificationMethod:
            "gmail",

        destination:
            maskEmail_(
                gmail
            ),

        expiresAt:
            expires.toISOString()

    });

}


// ============================================================
// LOGIN
// ============================================================

function login_(data) {

    const sheet =
        getSheet_();

    const map =
        headerMap_(
            sheet
        );

    const values =
        sheet
            .getDataRange()
            .getValues();


    const identity =
        String(
            data.identity || ""
        )
        .trim()
        .toLowerCase();


    const password =
        String(
            data.password || ""
        );


    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        const username =

            String(
                cell_(
                    values[i],
                    map["USERNAME"]
                )
            )
            .trim()
            .toLowerCase();


        const gmail =

            String(
                cell_(
                    values[i],
                    map["GMAIL"]
                )
            )
            .trim()
            .toLowerCase();


        if (
            (
                username === identity ||
                gmail === identity
            ) &&
            String(
                cell_(
                    values[i],
                    map["PASSWORD"]
                )
            ) === password
        ) {

            const verified =

                String(
                    cell_(
                        values[i],
                        map["VERIFIED"]
                    )
                )
                .toUpperCase()
                === "YES";


            const status =

                String(
                    cell_(
                        values[i],
                        map["ACCOUNT_S"]
                    )
                )
                .toUpperCase();


            if (
                !verified ||
                status !== "ACTIVE"
            ) {

                return json_({

                    success: false,

                    verified: false,

                    message:
                        "Your account is not verified yet."

                });

            }


            return json_({

                success: true,

                verified: true,

                demo: false,

                user:
                    publicUser_(
                        values[i],
                        map
                    )

            });

        }

    }


    return json_({

        success: false,

        message:
            "Invalid username/email or password."

    });

}


// ============================================================
// REQUEST / RESEND OTP
// ============================================================

function requestOtp_(data) {

    const sheet =
        getSheet_();

    const map =
        headerMap_(
            sheet
        );

    const values =
        sheet
            .getDataRange()
            .getValues();


    const identity =
        String(
            data.identity || ""
        )
        .trim()
        .toLowerCase();


    const requestedChannel =

        String(
            data.verificationMethod ||
            data.otpChannel ||
            "gmail"
        )
        .toLowerCase();


    const channel =

        requestedChannel === "phone"
            ? "PHONE"
            : "GMAIL";


    const found =
        findUser_(
            values,
            map,
            identity
        );


    if (!found) {

        return json_({

            success: false,

            message:
                "Account not found."

        });

    }


    if (
        channel === "PHONE"
    ) {

        return json_({

            success: false,

            message:
                "Phone SMS is not connected yet. Please use Gmail verification."

        });

    }


    const row =
        found.row;


    const rowNumber =
        found.rowNumber;


    const lockedUntil =
        parseDate_(
            cell_(
                row,
                map["OTP LOCKED UNTIL"]
            )
        );


    if (
        lockedUntil &&
        lockedUntil.getTime() >
            Date.now()
    ) {

        return json_({

            success: false,

            locked: true,

            message:
                "Too many incorrect OTP attempts. Try again in 30 minutes."

        });

    }


    const otp =
        generateOtp_();


    const expires =

        new Date(
            Date.now() +
            OTP_MINUTES * 60000
        );


    const gmail =

        String(
            cell_(
                row,
                map["GMAIL"]
            )
        )
        .trim()
        .toLowerCase();


    const sendResult =
        sendOtp_(
            gmail,
            cell_(
                row,
                map["PHONE NO."]
            ),
            otp,
            "verification",
            "GMAIL"
        );


    if (
        !sendResult.success
    ) {

        return json_({

            success: false,

            message:
                sendResult.message

        });

    }


    // Only save OTP after successful email delivery.

    sheet
        .getRange(
            rowNumber,
            map["OTP"]
        )
        .setValue(
            otp
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP EXPIRES"]
        )
        .setValue(
            expires
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP ATTEMPT"]
        )
        .setValue(
            0
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP TYPE"]
        )
        .setValue(
            "VERIFICATION"
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP CHANNEL"]
        )
        .setValue(
            "GMAIL"
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP LOCKED UNTIL"]
        )
        .clearContent();


    return json_({

        success: true,

        message:
            "A new verification code was sent to your Gmail.",

        verificationMethod:
            "gmail",

        destination:
            maskEmail_(
                gmail
            ),

        expiresAt:
            expires.toISOString()

    });

}


// ============================================================
// VERIFY ACCOUNT OTP
// ============================================================

function verifyOtp_(data) {

    return verifyCode_(
        data,
        "VERIFICATION"
    );

}


// ============================================================
// VERIFY RECOVERY OTP
// ============================================================

function verifyRecoveryOtp_(data) {

    return verifyCode_(
        data,
        "RECOVERY"
    );

}


// ============================================================
// VERIFY CODE
// ============================================================

function verifyCode_(
    data,
    expectedType
) {

    const sheet =
        getSheet_();

    const map =
        headerMap_(
            sheet
        );

    const values =
        sheet
            .getDataRange()
            .getValues();


    const identity =
        String(
            data.identity || ""
        )
        .trim()
        .toLowerCase();


    const otp =
        String(
            data.otp || ""
        ).trim();


    const found =
        findUser_(
            values,
            map,
            identity
        );


    if (!found) {

        return json_({

            success: false,

            message:
                "Account not found."

        });

    }


    const row =
        found.row;


    const rowNumber =
        found.rowNumber;


    const lockedUntil =
        parseDate_(
            cell_(
                row,
                map["OTP LOCKED UNTIL"]
            )
        );


    if (
        lockedUntil &&
        lockedUntil.getTime() >
            Date.now()
    ) {

        return json_({

            success: false,

            locked: true,

            message:
                "Too many incorrect OTP attempts. Try again in 30 minutes."

        });

    }


    const storedType =

        String(
            cell_(
                row,
                map["OTP TYPE"]
            )
        )
        .toUpperCase();


    if (
        storedType !==
        expectedType
    ) {

        return json_({

            success: false,

            message:
                "This OTP is no longer valid."

        });

    }


    const expires =
        parseDate_(
            cell_(
                row,
                map["OTP EXPIRES"]
            )
        );


    if (
        !expires ||
        expires.getTime() <
            Date.now()
    ) {

        return json_({

            success: false,

            message:
                "This OTP has expired. Please request a new code."

        });

    }


    const storedOtp =

        String(
            cell_(
                row,
                map["OTP"]
            )
        ).trim();


    // --------------------------------------------------------
    // WRONG OTP
    // --------------------------------------------------------

    if (
        storedOtp !== otp
    ) {

        const attempts =

            Number(
                cell_(
                    row,
                    map["OTP ATTEMPT"]
                ) || 0
            ) + 1;


        sheet
            .getRange(
                rowNumber,
                map["OTP ATTEMPT"]
            )
            .setValue(
                attempts
            );


        if (
            attempts >=
            MAX_OTP_ATTEMPTS
        ) {

            const lockUntil =

                new Date(
                    Date.now() +
                    LOCK_MINUTES * 60000
                );


            sheet
                .getRange(
                    rowNumber,
                    map["OTP LOCKED UNTIL"]
                )
                .setValue(
                    lockUntil
                );


            return json_({

                success: false,

                locked: true,

                message:
                    "Too many incorrect OTP attempts. Your verification is locked for 30 minutes."

            });

        }


        return json_({

            success: false,

            attemptsRemaining:
                MAX_OTP_ATTEMPTS -
                attempts,

            message:
                "Invalid OTP."

        });

    }


    // --------------------------------------------------------
    // CORRECT OTP
    // --------------------------------------------------------

    sheet
        .getRange(
            rowNumber,
            map["OTP"]
        )
        .clearContent();


    sheet
        .getRange(
            rowNumber,
            map["OTP EXPIRES"]
        )
        .clearContent();


    sheet
        .getRange(
            rowNumber,
            map["OTP ATTEMPT"]
        )
        .setValue(
            0
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP LOCKED UNTIL"]
        )
        .clearContent();


    // --------------------------------------------------------
    // ACCOUNT VERIFICATION
    // --------------------------------------------------------

    if (
        expectedType ===
        "VERIFICATION"
    ) {

        sheet
            .getRange(
                rowNumber,
                map["ACCOUNT_S"]
            )
            .setValue(
                "ACTIVE"
            );


        sheet
            .getRange(
                rowNumber,
                map["VERIFIED"]
            )
            .setValue(
                "YES"
            );


        sheet
            .getRange(
                rowNumber,
                map["VERIFIED AT"]
            )
            .setValue(
                new Date()
            );


        sheet
            .getRange(
                rowNumber,
                map["OTP TYPE"]
            )
            .clearContent();


        return json_({

            success: true,

            verified: true,

            demo: false,

            message:
                "Account verified successfully.",

            user:
                publicUser_(
                    row,
                    map
                )

        });

    }


    // --------------------------------------------------------
    // PASSWORD RECOVERY TOKEN
    // --------------------------------------------------------

    const token =

        Utilities.getUuid() +
        Utilities.getUuid();


    const tokenExpires =

        new Date(
            Date.now() +
            10 * 60000
        );


    sheet
        .getRange(
            rowNumber,
            map["RECOVERY TOKEN"]
        )
        .setValue(
            token
        );


    sheet
        .getRange(
            rowNumber,
            map["RECOVERY EXPIRES"]
        )
        .setValue(
            tokenExpires
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP TYPE"]
        )
        .clearContent();


    return json_({

        success: true,

        message:
            "Recovery code verified.",

        recoveryToken:
            token,

        recoveryExpiresAt:
            tokenExpires.toISOString(),

        uid:
            cell_(
                row,
                map["ID"]
            ),

        user:
            publicUser_(
                row,
                map
            )

    });

}


// ============================================================
// FORGOT PASSWORD
// ============================================================

function forgotPassword_(data) {

    const sheet =
        getSheet_();

    const map =
        headerMap_(
            sheet
        );

    const values =
        sheet
            .getDataRange()
            .getValues();


    const identity =
        String(
            data.identity || ""
        )
        .trim()
        .toLowerCase();


    const found =
        findUser_(
            values,
            map,
            identity
        );


    if (!found) {

        return json_({

            success: false,

            message:
                "No StockFlow account was found for that contact."

        });

    }


    const row =
        found.row;


    const rowNumber =
        found.rowNumber;


    const verified =

        String(
            cell_(
                row,
                map["VERIFIED"]
            )
        )
        .toUpperCase()
        === "YES";


    if (!verified) {

        return json_({

            success: false,

            message:
                "This account must be verified before password recovery."

        });

    }


    const gmail =

        String(
            cell_(
                row,
                map["GMAIL"]
            )
        )
        .trim()
        .toLowerCase();


    const otp =
        generateOtp_();


    const expires =

        new Date(
            Date.now() +
            OTP_MINUTES * 60000
        );


    // --------------------------------------------------------
    // SEND TO GMAIL
    // --------------------------------------------------------

    const sendResult =
        sendOtp_(
            gmail,
            cell_(
                row,
                map["PHONE NO."]
            ),
            otp,
            "recovery",
            "GMAIL"
        );


    if (
        !sendResult.success
    ) {

        return json_({

            success: false,

            message:
                sendResult.message

        });

    }


    // --------------------------------------------------------
    // SAVE RECOVERY OTP
    // --------------------------------------------------------

    sheet
        .getRange(
            rowNumber,
            map["OTP"]
        )
        .setValue(
            otp
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP EXPIRES"]
        )
        .setValue(
            expires
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP ATTEMPT"]
        )
        .setValue(
            0
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP TYPE"]
        )
        .setValue(
            "RECOVERY"
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP CHANNEL"]
        )
        .setValue(
            "GMAIL"
        );


    sheet
        .getRange(
            rowNumber,
            map["OTP LOCKED UNTIL"]
        )
        .clearContent();


    sheet
        .getRange(
            rowNumber,
            map["RECOVERY TOKEN"]
        )
        .clearContent();


    sheet
        .getRange(
            rowNumber,
            map["RECOVERY EXPIRES"]
        )
        .clearContent();


    return json_({

        success: true,

        message:
            "A password recovery code was sent to your registered Gmail.",

        uid:
            cell_(
                row,
                map["ID"]
            ),

        username:
            cell_(
                row,
                map["USERNAME"]
            ),

        email:
            gmail,

        phone:
            cell_(
                row,
                map["PHONE NO."]
            ),

        verificationMethod:
            "gmail",

        destination:
            maskEmail_(
                gmail
            ),

        expiresAt:
            expires.toISOString()

    });

}


// ============================================================
// RESET PASSWORD
// ============================================================

function resetPassword_(data) {

    const sheet =
        getSheet_();

    const map =
        headerMap_(
            sheet
        );

    const values =
        sheet
            .getDataRange()
            .getValues();


    const token =
        String(
            data.recoveryToken || ""
        ).trim();


    const newPassword =
        String(
            data.newPassword || ""
        );


    if (!token) {

        return json_({

            success: false,

            message:
                "Recovery session is missing."

        });

    }


    if (
        !passwordStrong_(
            newPassword
        )
    ) {

        return json_({

            success: false,

            message:
                "Password must be 8+ characters with uppercase, lowercase, number and symbol."

        });

    }


    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        const storedToken =

            String(
                cell_(
                    values[i],
                    map["RECOVERY TOKEN"]
                )
            ).trim();


        if (
            storedToken !==
            token
        ) {

            continue;

        }


        const expires =
            parseDate_(
                cell_(
                    values[i],
                    map["RECOVERY EXPIRES"]
                )
            );


        if (
            !expires ||
            expires.getTime() <
                Date.now()
        ) {

            return json_({

                success: false,

                message:
                    "Recovery session expired. Please start again."

            });

        }


        const rowNumber =
            i + 1;


        sheet
            .getRange(
                rowNumber,
                map["PASSWORD"]
            )
            .setValue(
                newPassword
            );


        sheet
            .getRange(
                rowNumber,
                map["RECOVERY TOKEN"]
            )
            .clearContent();


        sheet
            .getRange(
                rowNumber,
                map["RECOVERY EXPIRES"]
            )
            .clearContent();


        sheet
            .getRange(
                rowNumber,
                map["OTP"]
            )
            .clearContent();


        sheet
            .getRange(
                rowNumber,
                map["OTP EXPIRES"]
            )
            .clearContent();


        sheet
            .getRange(
                rowNumber,
                map["OTP ATTEMPT"]
            )
            .setValue(
                0
            );


        sheet
            .getRange(
                rowNumber,
                map["OTP TYPE"]
            )
            .clearContent();


        sheet
            .getRange(
                rowNumber,
                map["OTP LOCKED UNTIL"]
            )
            .clearContent();


        return json_({

            success: true,

            message:
                "Password reset successfully."

        });

    }


    return json_({

        success: false,

        message:
            "Invalid or expired recovery session."

    });

}


// ============================================================
// SEND OTP THROUGH GMAIL
// ============================================================

function sendOtp_(
    gmail,
    phone,
    otp,
    purpose,
    channel
) {

    channel =
        String(
            channel || "GMAIL"
        ).toUpperCase();


    // --------------------------------------------------------
    // PHONE
    // --------------------------------------------------------

    if (
        channel === "PHONE"
    ) {

        return {

            success: false,

            message:
                "Phone SMS is not connected yet. Please choose Gmail verification."

        };

    }


    gmail =
        String(
            gmail || ""
        )
        .trim()
        .toLowerCase();


    if (
        !gmail ||
        !/@/.test(gmail)
    ) {

        return {

            success: false,

            message:
                "No valid Gmail address is registered for this account."

        };

    }


    const subject =

        purpose === "recovery"

            ? "StockFlow password recovery code"

            : "StockFlow account verification code";


    const title =

        purpose === "recovery"

            ? "Password Recovery"

            : "Account Verification";


    const plainText =

        "StockFlow | Phone Accessories Inventory\n\n" +

        title +
        "\n\n" +

        "Your 6-digit verification code is:\n\n" +

        otp +

        "\n\n" +

        "This code expires in " +
        OTP_MINUTES +
        " minutes.\n\n" +

        "Never share this code with anyone.\n\n" +

        "If you did not request this code, you can safely ignore this email.";


    const htmlBody =

        "<div style=\"" +
        "font-family:Arial,sans-serif;" +
        "max-width:560px;" +
        "margin:auto;" +
        "padding:28px;" +
        "\">" +

        "<h2 style=\"" +
        "margin:0 0 8px;" +
        "color:#123b68;" +
        "\">" +

        "StockFlow" +

        "</h2>" +

        "<p style=\"" +
        "color:#64748b;" +
        "\">" +

        "Phone Accessories Inventory" +

        "</p>" +

        "<h3>" +

        title +

        "</h3>" +

        "<p>Your verification code is:</p>" +

        "<div style=\"" +
        "font-size:32px;" +
        "font-weight:800;" +
        "letter-spacing:8px;" +
        "padding:18px;" +
        "background:#f3f7fc;" +
        "border-radius:12px;" +
        "text-align:center;" +
        "color:#1769e0;" +
        "\">" +

        otp +

        "</div>" +

        "<p>This code expires in " +
        OTP_MINUTES +
        " minutes.</p>" +

        "<p style=\"" +
        "font-size:12px;" +
        "color:#94a3b8;" +
        "\">" +

        "Never share this code with anyone." +

        "</p>" +

        "</div>";


    try {

        if (
            MailApp
                .getRemainingDailyQuota() <
            1
        ) {

            return {

                success: false,

                message:
                    "The Gmail sending quota has been reached."

            };

        }


        MailApp.sendEmail({

            to:
                gmail,

            subject:
                subject,

            body:
                plainText,

            htmlBody:
                htmlBody,

            name:
                "StockFlow"

        });


        return {

            success: true

        };

    }

    catch (error) {

        return {

            success: false,

            message:
                "Gmail delivery failed: " +
                error.message

        };

    }

}


// ============================================================
// FIND USER
// ============================================================

function findUser_(
    values,
    map,
    identity
) {

    const normalizedIdentity =
        normalizePhone_(
            identity
        );


    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        const username =

            String(
                cell_(
                    values[i],
                    map["USERNAME"]
                )
            )
            .trim()
            .toLowerCase();


        const gmail =

            String(
                cell_(
                    values[i],
                    map["GMAIL"]
                )
            )
            .trim()
            .toLowerCase();


        const phone =

            normalizePhone_(
                cell_(
                    values[i],
                    map["PHONE NO."]
                )
            );


        if (

            username ===
                identity ||

            gmail ===
                identity ||

            (
                phone &&
                phone ===
                    normalizedIdentity
            )

        ) {

            return {

                row:
                    values[i],

                rowNumber:
                    i + 1

            };

        }

    }


    return null;

}


// ============================================================
// PUBLIC USER
// ============================================================

function publicUser_(
    row,
    map
) {

    return {

        uid:
            cell_(
                row,
                map["ID"]
            ),

        name:
            cell_(
                row,
                map["NAME"]
            ),

        username:
            cell_(
                row,
                map["USERNAME"]
            ),

        age:
            cell_(
                row,
                map["AGE"]
            ),

        accountStatus:
            cell_(
                row,
                map["ACCOUNT_S"]
            ),

        gmail:
            cell_(
                row,
                map["GMAIL"]
            ),

        phone:
            cell_(
                row,
                map["PHONE NO."]
            ),

        role:
            cell_(
                row,
                map["ROLE"]
            )

    };

}


// ============================================================
// CELL HELPER
// ============================================================

function cell_(
    row,
    column
) {

    return column
        ? row[column - 1]
        : "";

}


// ============================================================
// OTP GENERATOR
// ============================================================

function generateOtp_() {

    return String(

        Math.floor(
            100000 +
            Math.random() *
            900000
        )

    );

}


// ============================================================
// PHONE NORMALIZER
// ============================================================

function normalizePhone_(
    value
) {

    let phone =
        String(
            value || ""
        )
        .replace(
            /[\s-]/g,
            ""
        );


    if (
        phone.startsWith("09")
    ) {

        phone =
            "+63" +
            phone.substring(1);

    }


    return phone;

}


// ============================================================
// DATE PARSER
// ============================================================

function parseDate_(
    value
) {

    if (!value) {

        return null;

    }


    if (
        Object.prototype.toString
            .call(value)
        === "[object Date]"
    ) {

        if (
            !isNaN(
                value.getTime()
            )
        ) {

            return value;

        }

    }


    const date =
        new Date(
            value
        );


    return isNaN(
        date.getTime()
    )
        ? null
        : date;

}


// ============================================================
// PASSWORD STRENGTH
// ============================================================

function passwordStrong_(
    value
) {

    return (

        value.length >= 8 &&

        /[A-Z]/.test(value) &&

        /[a-z]/.test(value) &&

        /\d/.test(value) &&

        /[^A-Za-z0-9]/.test(value)

    );

}


// ============================================================
// MASK EMAIL
// ============================================================

function maskEmail_(
    email
) {

    const value =
        String(
            email || ""
        );


    const at =
        value.indexOf("@");


    if (
        at <= 1
    ) {

        return value;

    }


    return (

        value.charAt(0) +

        "••••" +

        value.substring(
            at - 1
        )

    );

}
