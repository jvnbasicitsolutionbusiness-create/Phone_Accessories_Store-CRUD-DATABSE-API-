/* =========================================================
   STOCKFLOW — PROFILE MODULE
   Current authenticated user information
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (selector) =>
        document.querySelector(selector);


    const getValue = (user, ...keys) => {

        for (const key of keys) {

            const value = user?.[key];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return String(value).trim();
            }

        }

        return "—";
    };


    /* =====================================================
       USER DISPLAY
    ===================================================== */

    const populateProfile = (user) => {

        if (!user) {
            return;
        }


        const name = getValue(
            user,
            "name",
            "fullName",
            "full_name",
            "NAME",
            "FULL_NAME",
            "username",
            "USERNAME"
        );


        const role = getValue(
            user,
            "role",
            "ROLE",
            "position",
            "POSITION",
            "designation",
            "DESIGNATION"
        );


        const email = getValue(
            user,
            "email",
            "EMAIL"
        );


        const phone = getValue(
            user,
            "phone",
            "PHONE",
            "phoneNumber",
            "PHONE_NUMBER",
            "mobile",
            "MOBILE"
        );


        const nameElement =
            $("[data-user-name]");

        const roleElement =
            $("[data-user-role]");

        const emailElement =
            $("[data-user-email]");

        const phoneElement =
            $("[data-user-phone]");


        if (nameElement) {
            nameElement.textContent = name;
        }

        if (roleElement) {
            roleElement.textContent = role;
        }

        if (emailElement) {
            emailElement.textContent = email;
        }

        if (phoneElement) {
            phoneElement.textContent = phone;
        }
    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication = async () => {

        if (
            !window.StockFlowAuth ||
            typeof window.StockFlowAuth.requireAuth !== "function"
        ) {
            console.warn(
                "StockFlowAuth is not available."
            );

            return null;
        }


        try {

            const user =
                await window.StockFlowAuth.requireAuth();

            if (!user) {
                return null;
            }

            return user;

        } catch (error) {

            console.error(
                "Profile authentication error:",
                error
            );

            return null;
        }
    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupMobileMenu = () => {

        const menuButton =
            document.querySelector("[data-menu]");

        const sidebar =
            document.querySelector(".sf-side");


        if (!menuButton || !sidebar) {
            return;
        }


        let overlay =
            document.querySelector(".profile-sidebar-overlay");


        if (!overlay) {

            overlay =
                document.createElement("div");

            overlay.className =
                "profile-sidebar-overlay";

            document.body.appendChild(overlay);
        }


        const closeMenu = () => {

            sidebar.classList.remove("open");
            overlay.classList.remove("show");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            document.body.style.overflow = "";
        };


        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    sidebar.classList.toggle("open");

                overlay.classList.toggle(
                    "show",
                    isOpen
                );

                menuButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );

                document.body.style.overflow =
                    isOpen
                        ? "hidden"
                        : "";
            }
        );


        overlay.addEventListener(
            "click",
            closeMenu
        );


        sidebar
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeMenu
                );
            });


        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {
                    closeMenu();
                }
            }
        );
    };


    /* =====================================================
       PROFILE SIDEBAR MOBILE STYLES
    ===================================================== */

    const injectMobileStyles = () => {

        if (
            document.getElementById(
                "profileMobileStyles"
            )
        ) {
            return;
        }


        const style =
            document.createElement("style");

        style.id =
            "profileMobileStyles";


        style.textContent = `

            @media (max-width: 850px) {

                .sf-side {
                    position: fixed !important;
                    top: 0;
                    left: 0;

                    width: 280px !important;
                    height: 100vh !important;

                    z-index: 2000;

                    transform: translateX(-100%);
                    transition:
                        transform 0.22s ease;

                    overflow-y: auto;
                }

                .sf-side.open {
                    transform: translateX(0);
                }

                .sf-side .sf-nav {
                    display: flex;
                }

                .profile-sidebar-overlay {
                    position: fixed;

                    inset: 0;

                    z-index: 1900;

                    background:
                        rgba(4, 13, 27, 0.55);

                    opacity: 0;
                    visibility: hidden;

                    transition:
                        opacity 0.22s ease,
                        visibility 0.22s ease;
                }

                .profile-sidebar-overlay.show {
                    opacity: 1;
                    visibility: visible;
                }

            }

        `;


        document.head.appendChild(style);
    };


    /* =====================================================
       LOGOUT FALLBACK
    ===================================================== */

    const setupLogout = () => {

        const logoutButton =
            document.getElementById("logoutBtn");


        if (!logoutButton) {
            return;
        }


        logoutButton.addEventListener(
            "click",
            () => {

                if (
                    window.StockFlowAuth &&
                    typeof window.StockFlowAuth.logout === "function"
                ) {

                    window.StockFlowAuth.logout();

                    return;
                }


                sessionStorage.clear();

                window.location.href =
                    "auth.html";
            }
        );
    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize = async () => {

        injectMobileStyles();

        setupMobileMenu();

        setupLogout();


        const user =
            await initializeAuthentication();


        if (!user) {
            return;
        }


        populateProfile(user);
    };


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();
