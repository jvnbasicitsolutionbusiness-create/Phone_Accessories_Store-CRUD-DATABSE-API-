/* =========================================================
   STOCKFLOW — SETTINGS MODULE
   Theme / Inventory Settings / Sidebar / Logout
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

    const $ = id =>
        document.getElementById(id);


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {
        reorder: 5,
        theme: "system"
    };


    /* =====================================================
       GET SETTINGS
    ===================================================== */

    const getSettings = () => {

        try {

            const stored =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!stored) {

                return {
                    ...DEFAULT_SETTINGS
                };

            }


            const parsed =
                JSON.parse(stored);


            const reorder =
                Number(parsed?.reorder);


            const theme =
                ["system", "light", "dark"]
                    .includes(parsed?.theme)
                    ? parsed.theme
                    : "system";


            return {

                reorder:
                    Number.isFinite(reorder) &&
                    reorder >= 0
                        ? Math.floor(reorder)
                        : 5,

                theme

            };

        } catch (error) {

            console.warn(
                "STOCKFLOW: unable to read settings.",
                error
            );


            return {
                ...DEFAULT_SETTINGS
            };

        }

    };


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    const saveSettingsToStorage =
        settings => {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );

        };


    /* =====================================================
       THEME
    ===================================================== */

    const applyTheme =
        theme => {

            const validThemes = [
                "system",
                "light",
                "dark"
            ];


            if (
                !validThemes.includes(theme)
            ) {

                theme =
                    "system";

            }


            /*
             * Apply to the root element.
             *
             * CSS handles:
             *
             * system = operating system preference
             * light  = forced light
             * dark   = forced dark
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
       MESSAGE
    ===================================================== */

    const showMessage =
        (
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


        element.textContent =
            "";


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
       SAVE SETTINGS
    ===================================================== */

    const saveSettings =
        event => {

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


            if (
                !reorder ||
                !theme
            ) {

                return;

            }


            const reorderValue =
                Number(
                    reorder.value
                );


            /* ---------------------------------------------
               VALIDATE REORDER LEVEL
            --------------------------------------------- */

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


            /* ---------------------------------------------
               LOADING STATE
            --------------------------------------------- */

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

                const selectedTheme =
                    [
                        "system",
                        "light",
                        "dark"
                    ].includes(
                        theme.value
                    )
                        ? theme.value
                        : "system";


                const settings = {

                    reorder:
                        Math.floor(
                            reorderValue
                        ),

                    theme:
                        selectedTheme

                };


                /* Save */

                saveSettingsToStorage(
                    settings
                );


                /* Apply immediately */

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
       LIVE THEME PREVIEW
    ===================================================== */

    const setupThemePreview = () => {

        const theme =
            $("theme");


        if (!theme) {
            return;
        }


        theme.addEventListener(
            "change",
            () => {

                applyTheme(
                    theme.value
                );

            }
        );

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


        /*
         * Give the sidebar an ID so the
         * hamburger aria-controls points
         * to a real element.
         */

        if (!sidebar.id) {

            sidebar.id =
                "stockflowSidebar";

        }


        let overlay =
            document.querySelector(
                ".sf-sidebar-overlay"
            );


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


        /* ---------------------------------------------
           CLOSE
        --------------------------------------------- */

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


            document.body.classList.remove(
                "sidebar-open"
            );

        };


        /* ---------------------------------------------
           OPEN
        --------------------------------------------- */

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


            document.body.classList.add(
                "sidebar-open"
            );

        };


        /* ---------------------------------------------
           HAMBURGER
        --------------------------------------------- */

        menuButton.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();


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


        /* ---------------------------------------------
           OVERLAY
        --------------------------------------------- */

        overlay.addEventListener(
            "click",
            closeMenu
        );


        /* ---------------------------------------------
           NAV LINKS
        --------------------------------------------- */

        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            if (
                                window.innerWidth <=
                                900
                            ) {

                                closeMenu();

                            }

                        }
                    );

                }
            );


        /* ---------------------------------------------
           ESCAPE
        --------------------------------------------- */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeMenu();

                }

            }
        );


        /* ---------------------------------------------
           RESIZE
        --------------------------------------------- */

        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 900
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


        const sidebarLogout =
            $("sidebarLogout");


        const buttons = [
            logoutButton,
            sidebarLogout
        ].filter(Boolean);


        if (
            buttons.length === 0
        ) {

            return;

        }


        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        if (
                            button.disabled
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


                        buttons.forEach(
                            item => {

                                item.disabled =
                                    true;

                            }
                        );


                        const originalText =
                            button.textContent;


                        button.textContent =
                            "Logging out...";


                        try {

                            /* ---------------------------------
                               STOCKFLOW AUTH
                            --------------------------------- */

                            if (
                                window.StockFlowAuth &&
                                typeof
                                window.StockFlowAuth.logout ===
                                    "function"
                            ) {

                                await
                                    window.StockFlowAuth.logout();

                                return;

                            }


                            /* ---------------------------------
                               STOCKFLOW API
                            --------------------------------- */

                            if (
                                window.StockFlowAPI &&
                                typeof
                                window.StockFlowAPI.logout ===
                                    "function"
                            ) {

                                await
                                    window.StockFlowAPI.logout();

                                return;

                            }


                            /* ---------------------------------
                               FALLBACK
                            --------------------------------- */

                            sessionStorage.clear();


                            localStorage.removeItem(
                                "stockflow_user"
                            );


                            localStorage.removeItem(
                                "STOCKFLOW_USER"
                            );


                            window.location.replace(
                                "./auth.html"
                            );

                        } catch (error) {

                            console.error(
                                "STOCKFLOW logout error:",
                                error
                            );


                            sessionStorage.clear();


                            localStorage.removeItem(
                                "stockflow_user"
                            );


                            localStorage.removeItem(
                                "STOCKFLOW_USER"
                            );


                            window.location.replace(
                                "./auth.html"
                            );

                        }

                    }
                );

            }
        );

    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication =
        async () => {

            /*
             * Keep your existing authentication
             * mechanism untouched.
             */

            if (
                !window.StockFlowAuth ||
                typeof
                window.StockFlowAuth.requireAuth !==
                    "function"
            ) {

                return true;

            }


            try {

                const user =
                    await
                    window.StockFlowAuth.requireAuth();


                return Boolean(
                    user
                );

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

    const initialize =
        async () => {

            const authenticated =
                await
                initializeAuthentication();


            if (!authenticated) {

                return;

            }


            loadSettings();

            setupThemePreview();

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
