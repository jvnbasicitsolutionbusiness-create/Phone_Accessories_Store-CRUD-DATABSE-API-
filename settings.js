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
   APPLY SAVED THEME IMMEDIATELY
===================================================== */

const applySavedThemeImmediately = () => {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!stored) {
            return;
        }

        const settings =
            JSON.parse(stored);

        const theme =
            VALID_THEMES.includes(
                settings?.theme
            )
                ? settings.theme
                : "system";

        const resolvedTheme =
            theme === "system"
                ? getSystemTheme()
                : theme;

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        document.documentElement.setAttribute(
            "data-resolved-theme",
            resolvedTheme
        );

        document.documentElement.classList.add(
            `sf-theme-${resolvedTheme}`
        );

        document.documentElement.style.colorScheme =
            resolvedTheme;

    } catch (error) {

        console.warn(
            "STOCKFLOW: unable to apply saved theme.",
            error
        );

    }

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
                VALID_THEMES.includes(
                    parsed?.theme
                )
                    ? parsed.theme
                    : "system";


            return {

                reorder:
                    Number.isFinite(reorder) &&
                    reorder >= 0
                        ? Math.floor(reorder)
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
       SAVE SETTINGS
    ===================================================== */

    const saveSettingsToStorage = settings => {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(settings)
        );

    };


    /* =====================================================
       SYSTEM THEME
    ===================================================== */

    const getSystemTheme = () => {

        return window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches
                ? "dark"
                : "light";

    };


   /* =====================================================
   APPLY THEME
===================================================== */

const applyTheme = theme => {

    if (!VALID_THEMES.includes(theme)) {
        theme = "system";
    }

    const resolvedTheme =
        theme === "system"
            ? getSystemTheme()
            : theme;

    const html = document.documentElement;
    const body = document.body;

    /* ---------------------------------------------
       DATA ATTRIBUTES
    --------------------------------------------- */

    html.setAttribute(
        "data-theme",
        theme
    );

    body.setAttribute(
        "data-theme",
        theme
    );

    html.setAttribute(
        "data-resolved-theme",
        resolvedTheme
    );

    body.setAttribute(
        "data-resolved-theme",
        resolvedTheme
    );


    /* ---------------------------------------------
       THEME CLASSES
    --------------------------------------------- */

    html.classList.remove(
        "sf-theme-light",
        "sf-theme-dark"
    );

    body.classList.remove(
        "sf-theme-light",
        "sf-theme-dark"
    );


    html.classList.add(
        `sf-theme-${resolvedTheme}`
    );

    body.classList.add(
        `sf-theme-${resolvedTheme}`
    );


    /* ---------------------------------------------
       COLOR SCHEME
       Helps browser controls such as inputs,
       scrollbars, selects, etc.
    --------------------------------------------- */

    html.style.colorScheme =
        resolvedTheme;

};


    /* =====================================================
       SYSTEM THEME LISTENER
    ===================================================== */

    const setupSystemThemeListener = () => {

        if (
            !window.matchMedia
        ) {

            return;

        }


        const mediaQuery =
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            );


        const updateSystemTheme = () => {

            const settings =
                getSettings();


            if (
                settings.theme === "system"
            ) {

                applyTheme("system");

            }

        };


        if (
            typeof mediaQuery.addEventListener ===
            "function"
        ) {

            mediaQuery.addEventListener(
                "change",
                updateSystemTheme
            );

        } else if (
            typeof mediaQuery.addListener ===
            "function"
        ) {

            mediaQuery.addListener(
                updateSystemTheme
            );

        }

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

    const saveSettings = event => {

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
           VALIDATION
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


        const selectedTheme =
            VALID_THEMES.includes(
                theme.value
            )
                ? theme.value
                : "system";


        /* ---------------------------------------------
           LOADING
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
                    saveButton.dataset.originalText ||
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

                const selectedTheme =
                    VALID_THEMES.includes(
                        theme.value
                    )
                        ? theme.value
                        : "system";


                /*
                 * Preview immediately.
                 * It is permanently stored only
                 * when Save Settings is clicked.
                 */

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


        /*
         * Make sure the sidebar has an ID.
         */

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
            .forEach(link => {

                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <= 900
                        ) {

                            closeMenu();

                        }

                    }
                );

            });


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


        const performLogout = async clickedButton => {

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

                /*
                 * Try the existing authentication
                 * controller first.
                 */

                if (
                    window.StockFlowAuth &&
                    typeof
                    window.StockFlowAuth.logout ===
                        "function"
                ) {

                    await window.StockFlowAuth.logout();

                }

                /*
                 * If the auth controller does not
                 * exist, try the API logout.
                 */

                else if (
                    window.StockFlowAPI &&
                    typeof
                    window.StockFlowAPI.logout ===
                        "function"
                ) {

                    await window.StockFlowAPI.logout();

                }

            } catch (error) {

                console.error(
                    "STOCKFLOW logout request error:",
                    error
                );

            } finally {

                /*
                 * ALWAYS clear local session state.
                 */

                try {

                    sessionStorage.clear();

                } catch (error) {

                    console.warn(
                        "Unable to clear sessionStorage:",
                        error
                    );

                }


                /*
                 * Remove common STOCKFLOW
                 * user/session keys.
                 */

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


                /*
                 * IMPORTANT:
                 *
                 * Do NOT return to dashboard.
                 *
                 * Always send the user to
                 * the authentication page.
                 */

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
             * existing authentication system.
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

    const initialize = async () => {

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

        setupSystemThemeListener();


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
