/* =========================================================
   STOCKFLOW — SETTINGS MODULE
   Settings + session controls
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE_KEY =
        "stockflow_settings";


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const getSettings = () => {

        try {

            const stored =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (!stored) {
                return {
                    reorder: 5,
                    theme: "system"
                };
            }

            const parsed =
                JSON.parse(stored);

            return {
                reorder:
                    Number.isFinite(
                        Number(parsed.reorder)
                    )
                        ? Number(parsed.reorder)
                        : 5,

                theme:
                    parsed.theme === "light"
                        ? "light"
                        : "system"
            };

        } catch (error) {

            console.warn(
                "Unable to read STOCKFLOW settings:",
                error
            );

            return {
                reorder: 5,
                theme: "system"
            };
        }
    };


    const saveSettingsToStorage = (
        settings
    ) => {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(settings)
        );
    };


    /* =====================================================
       MESSAGE
    ===================================================== */

    const showMessage = (
        message,
        type = "success"
    ) => {

        const element =
            $("msg");

        if (!element) {
            return;
        }

        element.textContent =
            message || "";

        element.className =
            `settings-message ${type}`;

    };


    const clearMessage = () => {

        const element =
            $("msg");

        if (!element) {
            return;
        }

        element.textContent = "";

        element.className =
            "settings-message";
    };


    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    const loadSettings = () => {

        const settings =
            getSettings();


        const reorder =
            $("reorder");

        const theme =
            $("theme");


        if (reorder) {

            reorder.value =
                settings.reorder;
        }


        if (theme) {

            theme.value =
                settings.theme;
        }


        applyTheme(
            settings.theme
        );
    };


    /* =====================================================
       THEME
    ===================================================== */

    const applyTheme = (
        theme
    ) => {

        /*
         * STOCKFLOW currently uses the
         * existing light interface.
         *
         * "system" and "light" are both
         * intentionally kept compatible
         * with the current design.
         */

        document.documentElement
            .setAttribute(
                "data-theme",
                theme
            );

        document.body
            .setAttribute(
                "data-theme",
                theme
            );
    };


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    const saveSettings = (
        event
    ) => {

        event.preventDefault();

        const form =
            $("settings");

        const saveButton =
            form?.querySelector(
                'button[type="submit"]'
            );

        const reorder =
            $("reorder");

        const theme =
            $("theme");


        if (!reorder || !theme) {
            return;
        }


        const reorderValue =
            Number(
                reorder.value
            );


        /* -----------------------------------------------
           VALIDATION
        ----------------------------------------------- */

        if (
            !Number.isFinite(
                reorderValue
            ) ||
            reorderValue < 0
        ) {

            showMessage(
                "Please enter a valid reorder level.",
                "error"
            );

            reorder.focus();

            return;
        }


        /* -----------------------------------------------
           LOADING STATE
        ----------------------------------------------- */

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.dataset.originalText =
                saveButton.textContent;

            saveButton.textContent =
                "Saving...";
        }


        clearMessage();


        try {

            const settings = {

                reorder:
                    Math.floor(
                        reorderValue
                    ),

                theme:
                    theme.value === "light"
                        ? "light"
                        : "system"
            };


            saveSettingsToStorage(
                settings
            );


            applyTheme(
                settings.theme
            );


            showMessage(
                "Settings saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "STOCKFLOW settings save error:",
                error
            );

            showMessage(
                "Unable to save settings.",
                "error"
            );


        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    saveButton.dataset
                        .originalText ||
                    "Save Settings";
            }
        }
    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupMobileMenu = () => {

        const sidebar =
            document.querySelector(
                ".sf-side"
            );

        const menuButton =
            document.querySelector(
                "[data-menu]"
            );


        if (
            !sidebar ||
            !menuButton
        ) {
            return;
        }


        let overlay =
            document.querySelector(
                ".sf-sidebar-overlay"
            );


        /*
         * Create overlay only if the
         * shared layout does not already
         * provide one.
         */

        if (!overlay) {

            overlay =
                document.createElement(
                    "div"
                );

            overlay.className =
                "sf-sidebar-overlay";

            document.body.appendChild(
                overlay
            );
        }


        const closeMenu = () => {

            sidebar.classList.remove(
                "open"
            );

            overlay.classList.remove(
                "show"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            document.body.style.overflow =
                "";
        };


        const openMenu = () => {

            sidebar.classList.add(
                "open"
            );

            overlay.classList.add(
                "show"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );

            document.body.style.overflow =
                "hidden";
        };


        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    sidebar.classList.contains(
                        "open"
                    );

                if (isOpen) {
                    closeMenu();
                } else {
                    openMenu();
                }
            }
        );


        overlay.addEventListener(
            "click",
            closeMenu
        );


        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        closeMenu
                    );
                }
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {
                    closeMenu();
                }
            }
        );


        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth >
                    900
                ) {
                    closeMenu();
                }
            }
        );
    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const setupLogout = () => {

        const logoutButton =
            $("logout");


        if (!logoutButton) {
            return;
        }


        logoutButton.addEventListener(
            "click",
            async () => {

                if (
                    logoutButton.disabled
                ) {
                    return;
                }


                const confirmed =
                    window.confirm(
                        "Are you sure you want to logout from STOCKFLOW?"
                    );


                if (!confirmed) {
                    return;
                }


                logoutButton.disabled =
                    true;

                logoutButton.textContent =
                    "Logging out...";


                try {

                    if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.logout ===
                            "function"
                    ) {

                        await window.StockFlowAuth.logout();

                        return;
                    }


                    /*
                     * Fallback if auth.js
                     * is unavailable.
                     */

                    sessionStorage.clear();

                    window.location.replace(
                        "auth.html"
                    );

                } catch (error) {

                    console.error(
                        "STOCKFLOW logout error:",
                        error
                    );


                    sessionStorage.clear();

                    window.location.replace(
                        "auth.html"
                    );
                }
            }
        );
    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication =
        async () => {

            if (
                !window.StockFlowAuth ||
                typeof window.StockFlowAuth.requireAuth !==
                    "function"
            ) {

                return true;
            }


            try {

                const user =
                    await window.StockFlowAuth
                        .requireAuth();

                return Boolean(user);

            } catch (error) {

                console.error(
                    "STOCKFLOW settings authentication error:",
                    error
                );

                return false;
            }
        };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize = async () => {

        /*
         * Authentication first so the
         * settings page remains protected.
         */

        const authenticated =
            await initializeAuthentication();


        if (!authenticated) {
            return;
        }


        loadSettings();

        setupMobileMenu();

        setupLogout();


        const form =
            $("settings");


        if (form) {

            form.addEventListener(
                "submit",
                saveSettings
            );
        }


        const theme =
            $("theme");


        if (theme) {

            theme.addEventListener(
                "change",
                () => {

                    applyTheme(
                        theme.value
                    );
                }
            );
        }
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
