/* =========================================================
   STORAGE HELPERS
   ========================================================= */

function readStorage(keys) {

    const list =
        Array.isArray(keys)
            ? keys
            : [keys];


    for (const key of list) {

        if (!key) {
            continue;
        }


        /* -------------------------------------------------
           SESSION STORAGE
        ------------------------------------------------- */

        try {

            const sessionValue =
                sessionStorage.getItem(key);

            if (
                sessionValue !== null &&
                String(sessionValue).trim() !== ""
            ) {

                return String(
                    sessionValue
                ).trim();

            }

        } catch (error) {

            console.warn(
                "StockFlow: sessionStorage read failed.",
                error
            );
        }


        /* -------------------------------------------------
           LOCAL STORAGE
        ------------------------------------------------- */

        try {

            const localValue =
                localStorage.getItem(key);

            if (
                localValue !== null &&
                String(localValue).trim() !== ""
            ) {

                return String(
                    localValue
                ).trim();

            }

        } catch (error) {

            console.warn(
                "StockFlow: localStorage read failed.",
                error
            );
        }
    }


    return "";
}


/* =========================================================
   READ JSON STORAGE
   ========================================================= */

function readJsonStorage(keys) {

    const value =
        readStorage(keys);


    if (!value) {
        return null;
    }


    try {

        return JSON.parse(value);

    } catch (error) {

        return null;
    }
}


/* =========================================================
   WRITE STORAGE
   ========================================================= */

function writeStorage(
    key,
    value
) {

    if (!key) {
        return;
    }


    try {

        sessionStorage.setItem(
            key,
            String(value ?? "")
        );

    } catch (error) {

        console.warn(
            "StockFlow: Unable to write sessionStorage.",
            error
        );
    }
}


/* =========================================================
   REMOVE STORAGE
   ========================================================= */

function removeStorage(
    key
) {

    if (!key) {
        return;
    }


    try {

        sessionStorage.removeItem(
            key
        );

    } catch (error) {

        console.warn(
            "StockFlow: Unable to remove sessionStorage item.",
            error
        );
    }


    try {

        localStorage.removeItem(
            key
        );

    } catch (error) {

        console.warn(
            "StockFlow: Unable to remove localStorage item.",
            error
        );
    }
}


/* =========================================================
   GET STORED VALUE
   ========================================================= */

function getStoredValue(
    name
) {

    const aliases =
        STORAGE_ALIASES[name] || [];


    const primary =
        STORAGE[name];


    return readStorage([
        primary,
        ...aliases
    ]);
}


/* =========================================================
   GET STORED BOOLEAN
   ========================================================= */

function getStoredBoolean(
    name
) {

    return (
        getStoredValue(name)
            .toLowerCase() ===
        "true"
    );
}


/* =========================================================
   REGISTRATION OBJECT FALLBACK
========================================================= */

function getRegistrationObject() {

    const possibleKeys = [

        "STOCKFLOW_REGISTRATION",

        "STOCKFLOW_PENDING_REGISTRATION",

        "STOCKFLOW_REGISTER_DATA",

        "STOCKFLOW_REGISTRATION_DATA",

        "STOCKFLOW_VERIFY_DATA",

        "STOCKFLOW_PENDING_USER",

        "STOCKFLOW_USER_DATA",

        "registrationData",

        "pendingRegistration"

    ];


    for (
        const key of possibleKeys
    ) {

        const data =
            readJsonStorage(key);


        if (
            data &&
            typeof data === "object"
        ) {

            return data;
        }
    }


    return null;
}


/* =========================================================
   GET VERIFICATION STATE
   ========================================================= */

function getVerificationState() {

    const registration =
        getRegistrationObject();


    const state = {

        uid:
            getStoredValue(
                "UID"
            ),

        email:
            getStoredValue(
                "EMAIL"
            ),

        phone:
            getStoredValue(
                "PHONE"
            ),

        username:
            getStoredValue(
                "USERNAME"
            ),

        identity:
            getStoredValue(
                "IDENTITY"
            ),

        channel:
            getStoredValue(
                "CHANNEL"
            ) || "email",

        emailSent:
            getStoredBoolean(
                "EMAIL_SENT"
            ),

        phoneSent:
            getStoredBoolean(
                "PHONE_SENT"
            )
    };


    /* =====================================================
       REGISTRATION OBJECT FALLBACK
    ===================================================== */

    if (registration) {

        state.uid =
            state.uid ||

            registration.uid ||

            registration.UID ||

            registration.userId ||

            registration.userID ||

            "";


        state.email =
            state.email ||

            registration.email ||

            registration.gmail ||

            registration.GMAIL ||

            registration.emailAddress ||

            "";


        state.phone =
            state.phone ||

            registration.phone ||

            registration.phoneNumber ||

            registration.contactNumber ||

            "";


        state.username =
            state.username ||

            registration.username ||

            registration.userName ||

            "";


        state.identity =
            state.identity ||

            registration.identity ||

            registration.username ||

            registration.email ||

            registration.phone ||

            "";
    }


    /* =====================================================
       DERIVE IDENTITY
    ===================================================== */

    if (
        !state.identity
    ) {

        state.identity =

            state.username ||

            state.email ||

            state.phone ||

            state.uid ||

            "";
    }


    /* =====================================================
       NORMALIZE CHANNEL
    ===================================================== */

    state.channel =
        String(
            state.channel ||
            "email"
        )
            .toLowerCase();


    if (
        state.channel !== "email" &&
        state.channel !== "phone"
    ) {

        state.channel =
            "email";
    }


    return state;
}


/* =========================================================
   CHECK VERIFICATION STATE
   ========================================================= */

function hasVerificationState() {

    const state =
        getVerificationState();


    return Boolean(

        state.uid ||

        state.identity ||

        state.username ||

        state.email ||

        state.phone
    );
}
