// ============================================================
// GINGOOG GADGETS DASHBOARD
// ============================================================

const session = JSON.parse(
    sessionStorage.getItem("stockflow_session") || "null"
);

if (!session) {
    window.location.href = "login.html";
}

const qs = selector => document.querySelector(selector);
const id = value => document.getElementById(value);

function initials(name) {

    return String(name || "GG")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();

}

function setText(elementId, value) {

    const element = id(elementId);

    if (element) {
        element.textContent = value ?? "—";
    }

}

function showProfileData() {

    const name =
        session.fullName ||
        session.username ||
        "Gingoog Gadgets User";


    setText(
        "dashUser",
        name
    );


    setText(
        "sidebarUser",
        name
    );


    setText(
        "sidebarRole",
        session.role || "Employee"
    );


    setText(
        "dashAccountStatus",
        session.demo
            ? "DEMO ACCOUNT"
            : session.verified
                ? "Verified account"
                : "Account"
    );


    setText(
        "welcomeTitle",
        `Good afternoon, ${name}.`
    );


    setText(
        "profileName",
        name
    );


    setText(
        "profileUsername",
        session.username || "—"
    );


    setText(
        "profileEmail",
        session.email || "—"
    );


    setText(
        "profilePhone",
        session.phone || "—"
    );


    setText(
        "profileRole",
        session.role || "Employee"
    );


    setText(
        "profileStatus",
        session.demo
            ? "DEMO — NOT VERIFIED"
            : "ACTIVE — VERIFIED"
    );


    const avatarText = initials(name);


    setText(
        "headerAvatar",
        avatarText
    );


    setText(
        "sidebarAvatar",
        avatarText
    );


    const demoBanner =
        id("demoBanner");


    const profileNotice =
        id("profileDemoNotice");


    if (session.demo) {

        if (demoBanner) {
            demoBanner.hidden = false;
        }

        if (profileNotice) {
            profileNotice.hidden = false;
        }

    }

}


function startReverification() {

    if (!session || !session.username) {

        alert(
            "Unable to identify your account."
        );

        return;
    }


    const api =
        window.STOCKFLOW_CONFIG?.GOOGLE_APPS_SCRIPT_URL;


    if (!api) {

        alert(
            "Google Apps Script URL is missing."
        );

        return;
    }


    const buttons = [

        id("reverifyBtn"),
        id("profileReverifyBtn")

    ].filter(Boolean);


    buttons.forEach(button => {

        button.disabled = true;

        button.textContent =
            "Sending OTP...";

    });


    fetch(api, {

        method: "POST",

        headers: {
            "Content-Type":
                "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

            action: "requestOtp",

            identity:
                session.username

        })

    })

        .then(response =>
            response.json()
        )

        .then(result => {

            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Unable to send OTP."
                );

            }


            sessionStorage.setItem(

                "stockflow_pending_user",

                JSON.stringify({

                    uid:
                        session.uid,

                    username:
                        session.username,

                    email:
                        session.email,

                    phone:
                        session.phone

                })

            );


            sessionStorage.setItem(

                "stockflow_verification_mode",

                "reverify"

            );


            sessionStorage.setItem(

                "stockflow_demo_otp",

                window.STOCKFLOW_CONFIG?.DEMO_OTP ||
                "123456"

            );


            window.location.href =
                "verify.html";

        })


        .catch(error => {

            console.error(error);


            alert(

                error.message ||
                "Unable to send the verification email."

            );


            buttons.forEach(button => {

                button.disabled = false;

                button.textContent =
                    "Re-verify account";

            });

        });

}


// ============================================================
// MENU
// ============================================================

const menuBtn =
    id("menuBtn");

const sidebar =
    id("sidebar");

const overlay =
    id("sidebarOverlay");


function closeMenu() {

    sidebar?.classList.remove("open");

    overlay?.classList.remove("show");

}


menuBtn?.addEventListener(
    "click",
    () => {

        sidebar?.classList.add("open");

        overlay?.classList.add("show");

    }
);


overlay?.addEventListener(
    "click",
    closeMenu
);


// ============================================================
// UNCONNECTED MODULES
// ============================================================

document
    .querySelectorAll(".not-connected-link")
    .forEach(link => {

        link.addEventListener(
            "click",
            event => {

                event.preventDefault();


                alert(

                    "This module is currently NOT CONNECTED. " +
                    "The phone-accessories inventory integration " +
                    "will be added later."

                );


                closeMenu();

            }
        );

    });


document
    .querySelectorAll(".sidebar-nav a")
    .forEach(link => {

        link.addEventListener(
            "click",
            () => {

                if (window.innerWidth < 760) {
                    closeMenu();
                }

            }
        );

    });


// ============================================================
// REVERIFICATION
// ============================================================

id("reverifyBtn")
    ?.addEventListener(
        "click",
        startReverification
    );


id("profileReverifyBtn")
    ?.addEventListener(
        "click",
        startReverification
    );


// ============================================================
// LOGOUT
// ============================================================

id("logoutBtn")
    ?.addEventListener(
        "click",
        () => {

            if (
                confirm(
                    "Are you sure you want to log out?"
                )
            ) {

                sessionStorage.removeItem(
                    "stockflow_session"
                );

                window.location.href =
                    "login.html";

            }

        }
    );


// ============================================================
// DATE
// ============================================================

const dateElement =
    id("dashDate");


if (dateElement) {

    dateElement.textContent =
        new Intl.DateTimeFormat(
            "en-US",
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        ).format(new Date());

}


showProfileData();
