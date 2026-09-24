/* =========================================================
   STOCKFLOW — SETTINGS MODULE
   Theme / Inventory Settings / Sidebar / Logout
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE_KEY = "stockflow_settings";


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {
        reorder: 5,
        theme: "system"
    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = id =>
        document.getElementById(id);


    /* =====================================================
       VALID THEMES
    ===================================================== */

    const VALID_THEMES = [
        "system",
        "light",
        "dark"
    ];


    /* =====================================================
       APPLY SAVED THEME IMMEDIATELY
       
       IMPORTANT:
       "system" means STOCKFLOW's ORIGINAL
       WHITE + BLUE DESIGN.

       It does NOT follow:
       - Windows dark mode
       - Browser dark mode
       - OS color preference
    ===================================================== */

    const applySavedThemeImmediately = () => {

        try {

            const stored =
                localStorage.getItem(
                    STORAGE_KEY
                );

            let theme =
                DEFAULT_SETTINGS.theme;


            if (stored) {

                const settings =
                    JSON.parse(stored);


                if (
                    VALID_THEMES.includes(
                        settings?.theme
                    )
                ) {

                    theme =
                        settings.theme;

                }

            }


            const html =
                document.documentElement;


            html.setAttribute(
                "data-theme",
                theme
            );


            html.setAttribute(
                "data-resolved-theme",
                theme
            );


            html.classList.remove(
                "sf-theme-system",
                "sf-theme-light",
                "sf-theme-dark"
            );


            html.classList.add(
                `sf-theme-${theme}`
            );


            html.style.colorScheme =
                theme === "dark"
                    ? "dark"
                    : "light";


        } catch (error) {

            console.warn(
                "STOCKFLOW: unable to apply saved theme.",
                error
            );


            const html =
                document.documentElement;


            html.setAttribute(
                "data-theme",
                "system"
            );


            html.setAttribute(
                "data-resolved-theme",
                "system"
            );


            html.classList.remove(
                "sf-theme-light",
                "sf-theme-dark"
            );


            html.classList.add(
                "sf-theme-system"
            );


            html.style.colorScheme =
                "light";

        }

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
                JSON.parse(
                    stored
                );


            const reorder =
                Number(
                    parsed?.reorder
                );


            const theme =
                VALID_THEMES.includes(
                    parsed?.theme
                )
                    ? parsed.theme
                    : DEFAULT_SETTINGS.theme;


            return {

                reorder:
                    Number.isFinite(
                        reorder
                    ) &&
                    reorder >= 0

                        ? Math.floor(
                            reorder
                        )

                        : DEFAULT_SETTINGS.reorder,

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
       SAVE SETTINGS TO LOCAL STORAGE
    ===================================================== */

    const saveSettingsToStorage =
        settings => {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    settings
                )
            );

        };


    /* =====================================================
       STOCKFLOW DEFAULT / SYSTEM THEME
       
       IMPORTANT:
       "system" is NOT OS detection.

       It represents the original
       STOCKFLOW white + blue interface.
    ===================================================== */

    const getSystemTheme = () => {

        return "system";

    };


    /* =====================================================
       APPLY THEME
    ===================================================== */

    const applyTheme =
        theme => {

            if (
                !VALID_THEMES.includes(
                    theme
                )
            ) {

                theme =
                    getSystemTheme();

            }


            /*
             * Do NOT resolve "system" using
             * window.matchMedia().
             *
             * The STOCKFLOW system theme is
             * always the original white + blue
             * design.
             */

            const resolvedTheme =
                theme;


            const html =
                document.documentElement;


            const body =
                document.body;


            /* ---------------------------------------------
               HTML ATTRIBUTES
            --------------------------------------------- */

            html.setAttribute(
                "data-theme",
                theme
            );


            html.setAttribute(
                "data-resolved-theme",
                resolvedTheme
            );


            /* ---------------------------------------------
               BODY ATTRIBUTES
            --------------------------------------------- */

            if (body) {

                body.setAttribute(
                    "data-theme",
                    theme
                );


                body.setAttribute(
                    "data-resolved-theme",
                    resolvedTheme
                );

            }


            /* ---------------------------------------------
               REMOVE OLD THEME CLASSES
            --------------------------------------------- */

            html.classList.remove(
                "sf-theme-system",
                "sf-theme-light",
                "sf-theme-dark"
            );


            if (body) {

                body.classList.remove(
                    "sf-theme-system",
                    "sf-theme-light",
                    "sf-theme-dark"
                );

            }


            /* ---------------------------------------------
               ADD CURRENT THEME CLASS
            --------------------------------------------- */

            html.classList.add(
                `sf-theme-${resolvedTheme}`
            );


            if (body) {

                body.classList.add(
                    `sf-theme-${resolvedTheme}`
                );

            }


            /* ---------------------------------------------
               COLOR SCHEME
               
               This controls native browser UI
               such as form controls.

               It does NOT determine the STOCKFLOW
               theme itself.
            --------------------------------------------- */

            html.style.colorScheme =
                resolvedTheme === "dark"
                    ? "dark"
                    : "light";

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
               VALIDATE THEME
            --------------------------------------------- */

            const selectedTheme =
                VALID_THEMES.includes(
                    theme.value
                )
                    ? theme.value
                    : getSystemTheme();


            /* ---------------------------------------------
               BUTTON LOADING STATE
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

                const settings = {

                    reorder:
                        Math.floor(
                            reorderValue
                        ),

                    theme:
                        selectedTheme

                };


                /* -----------------------------------------
                   SAVE
                ----------------------------------------- */

                saveSettingsToStorage(
                    settings
                );


                /* -----------------------------------------
                   APPLY
                ----------------------------------------- */

                applyTheme(
                    settings.theme
                );


                /* -----------------------------------------
                   SUCCESS
                ----------------------------------------- */

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
                        saveButton.dataset.originalText ||
                        "Save Settings";

                }

            }

        };


    /* =====================================================
       LIVE THEME PREVIEW
       
       Changing the dropdown immediately previews
       the selected theme.

       The setting is permanently saved only
       after clicking Save Settings.
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

                const selectedTheme =
                    VALID_THEMES.includes(
                        theme.value
                    )
                        ? theme.value
                        : getSystemTheme();


                applyTheme(
                    selectedTheme
                );

            }
        );

    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupMobileMenu = () => {

        const sidebar =
            document.getElementById(
                "stockflowSidebar"
            ) ||
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

            console.warn(
                "STOCKFLOW: sidebar or hamburger button not found."
            );

            return;

        }


        /* ---------------------------------------------
           MAKE SURE SIDEBAR HAS ID
        --------------------------------------------- */

        if (!sidebar.id) {

            sidebar.id =
                "stockflowSidebar";

        }


        /* ---------------------------------------------
           OVERLAY
        --------------------------------------------- */

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
           CLOSE MENU
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
           OPEN MENU
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


                if (
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

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
           NAVIGATION LINKS
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
           ESCAPE KEY
        --------------------------------------------- */

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


        /* ---------------------------------------------
           WINDOW RESIZE
        --------------------------------------------- */

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


        const performLogout =
            async clickedButton => {

                if (
                    buttons.some(
                        button =>
                            button.disabled
                    )
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
                    button => {

                        button.disabled =
                            true;

                    }
                );


                const originalText =
                    clickedButton.textContent;


                clickedButton.textContent =
                    "Logging out...";


                try {

                    /* -----------------------------------------
                       AUTH CONTROLLER
                    ----------------------------------------- */

                    if (
                        window.StockFlowAuth &&
                        typeof
                        window.StockFlowAuth.logout ===
                            "function"
                    ) {

                        await
                        window.StockFlowAuth.logout();

                    }


                    /* -----------------------------------------
                       API FALLBACK
                    ----------------------------------------- */

                    else if (
                        window.StockFlowAPI &&
                        typeof
                        window.StockFlowAPI.logout ===
                            "function"
                    ) {

                        await
                        window.StockFlowAPI.logout();

                    }

                } catch (error) {

                    console.error(
                        "STOCKFLOW logout request error:",
                        error
                    );

                } finally {

                    /* -----------------------------------------
                       CLEAR SESSION STORAGE
                    ----------------------------------------- */

                    try {

                        sessionStorage.clear();

                    } catch (error) {

                        console.warn(
                            "Unable to clear sessionStorage:",
                            error
                        );

                    }


                    /* -----------------------------------------
                       CLEAR COMMON AUTH KEYS
                    ----------------------------------------- */

                    const localKeys = [

                        "stockflow_user",

                        "STOCKFLOW_USER",

                        "stockflow_token",

                        "STOCKFLOW_TOKEN",

                        "stockflow_session",

                        "STOCKFLOW_SESSION"

                    ];


                    localKeys.forEach(
                        key => {

                            localStorage.removeItem(
                                key
                            );

                        }
                    );


                    /* -----------------------------------------
                       REDIRECT TO AUTH
                    ----------------------------------------- */

                    window.location.replace(
                        "./auth.html"
                    );

                }

            };


        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        performLogout(
                            button
                        );

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
             * Keep compatibility with the
             * existing STOCKFLOW authentication system.
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


            /* ---------------------------------------------
               LOAD SETTINGS
            --------------------------------------------- */

            loadSettings();


            /* ---------------------------------------------
               THEME PREVIEW
            --------------------------------------------- */

            setupThemePreview();


            /* ---------------------------------------------
               MOBILE SIDEBAR
            --------------------------------------------- */

            setupMobileMenu();


            /* ---------------------------------------------
               LOGOUT
            --------------------------------------------- */

            setupLogout();


            /* ---------------------------------------------
               SETTINGS FORM
            --------------------------------------------- */

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

    /*
     * Apply the saved theme BEFORE the page finishes
     * loading to prevent a theme flash.
     */

    applySavedThemeImmediately();


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
