/* =========================================================
   STOCKFLOW — PROFILE MODULE
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const menuButton =
        document.querySelector("[data-menu]");

    const sidebar =
        document.querySelector(".sf-side");

    let overlay =
        document.querySelector(".profile-overlay");


    /* =====================================================
       MOBILE OVERLAY
    ===================================================== */

    if (!overlay) {

        overlay =
            document.createElement("div");

        overlay.className =
            "profile-overlay";

        document.body.appendChild(overlay);
    }


    function openMenu() {

        sidebar?.classList.add("open");
        overlay?.classList.add("active");

        menuButton?.setAttribute(
            "aria-expanded",
            "true"
        );
    }


    function closeMenu() {

        sidebar?.classList.remove("open");
        overlay?.classList.remove("active");

        menuButton?.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    menuButton?.addEventListener(
        "click",
        () => {

            const isOpen =
                sidebar?.classList.contains("open");

            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }
    );


    overlay?.addEventListener(
        "click",
        closeMenu
    );


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeMenu();
            }

        }
    );


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    try {

        if (
            typeof StockFlowAuth === "undefined"
        ) {

            console.error(
                "StockFlowAuth is not available."
            );

            return;
        }


        if (
            typeof StockFlowAuth.requireAuth !==
            "function"
        ) {

            console.error(
                "StockFlowAuth.requireAuth is not available."
            );

            return;
        }


        const user =
            await StockFlowAuth.requireAuth();


        if (!user) {
            return;
        }


        /* =================================================
           USE EXISTING AUTH UI BINDER
        ================================================= */

        if (
            typeof StockFlowAuth.bindUserUI ===
            "function"
        ) {

            StockFlowAuth.bindUserUI(user);

        }


        /* =================================================
           PROFILE FIELDS
        ================================================= */

        const nameElement =
            document.querySelector(
                "[data-user-name]"
            );

        const roleElement =
            document.querySelector(
                "[data-user-role]"
            );

        const emailElement =
            document.querySelector(
                "[data-user-email]"
            );

        const phoneElement =
            document.querySelector(
                "[data-user-phone]"
            );


        const name =
            user.fullName ||
            user.full_name ||
            user.name ||
            user.username ||
            "—";


        const role =
            user.role ||
            user.accountStatus ||
            user.account_status ||
            "Employee";


        const email =
            user.email ||
            user.gmail ||
            user.GMAIL ||
            "—";


        const phone =
            user.phone ||
            user.phoneNumber ||
            user.phone_number ||
            user["PHONE NO."] ||
            "—";


        if (nameElement) {
            nameElement.textContent =
                name;
        }


        if (roleElement) {
            roleElement.textContent =
                role;
        }


        if (emailElement) {
            emailElement.textContent =
                email;
        }


        if (phoneElement) {
            phoneElement.textContent =
                phone;
        }


    } catch (error) {

        console.error(
            "Unable to load profile:",
            error
        );

    }

});
