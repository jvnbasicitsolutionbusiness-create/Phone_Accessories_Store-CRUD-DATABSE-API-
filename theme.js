/* =========================================================
   STOCKFLOW GLOBAL THEME BOOTSTRAP
   ---------------------------------------------------------
   Themes:
   - system = ORIGINAL STOCKFLOW WHITE + BLUE
   - light  = GREY / WHITE + BLACK TEXT
   - dark   = DARK NAVY / CHARCOAL + WHITE TEXT

   IMPORTANT:
   "system" does NOT follow Windows/browser dark mode.
   It means the original STOCKFLOW system design.
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const STORAGE_KEY = "stockflow_settings";

    const VALID_THEMES = [
        "system",
        "light",
        "dark"
    ];

    const DEFAULT_THEME = "system";


    /* =====================================================
       GET SAVED THEME
       ===================================================== */

    function getSavedTheme() {

        try {

            const storedSettings =
                localStorage.getItem(STORAGE_KEY);

            if (!storedSettings) {
                return DEFAULT_THEME;
            }

            const settings =
                JSON.parse(storedSettings);

            const savedTheme =
                settings?.theme;

            if (VALID_THEMES.includes(savedTheme)) {
                return savedTheme;
            }

        } catch (error) {

            console.warn(
                "STOCKFLOW: Unable to read saved theme.",
                error
            );

        }

        return DEFAULT_THEME;
    }


    /* =====================================================
       APPLY THEME
       ===================================================== */

    function applyTheme(theme) {

        if (!VALID_THEMES.includes(theme)) {
            theme = DEFAULT_THEME;
        }

        const html =
            document.documentElement;

        /* ---------------------------------------------
           Set data attributes
           --------------------------------------------- */

        html.setAttribute(
            "data-theme",
            theme
        );

        html.setAttribute(
            "data-resolved-theme",
            theme
        );


        /* ---------------------------------------------
           Remove old theme classes
           --------------------------------------------- */

        html.classList.remove(
            "sf-theme-system",
            "sf-theme-light",
            "sf-theme-dark"
        );


        /* ---------------------------------------------
           Add selected theme
           --------------------------------------------- */

        html.classList.add(
            `sf-theme-${theme}`
        );


        /* ---------------------------------------------
           Browser UI color scheme
           --------------------------------------------- */

        html.style.colorScheme =
            theme === "dark"
                ? "dark"
                : "light";


        /* ---------------------------------------------
           Apply to body if already available
           --------------------------------------------- */

        if (document.body) {

            document.body.classList.remove(
                "sf-theme-system",
                "sf-theme-light",
                "sf-theme-dark"
            );

            document.body.classList.add(
                `sf-theme-${theme}`
            );
        }
    }


    /* =====================================================
       APPLY THEME IMMEDIATELY
       -----------------------------------------------------
       This prevents the page from briefly showing the
       wrong theme while the page is loading.
       ===================================================== */

    const initialTheme =
        getSavedTheme();

    applyTheme(initialTheme);


    /* =====================================================
       APPLY AGAIN AFTER DOM LOAD
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            const currentTheme =
                getSavedTheme();

            applyTheme(currentTheme);

        }
    );


    /* =====================================================
       GLOBAL THEME API
       -----------------------------------------------------
       Allows settings.js or other scripts to change the
       theme without duplicating theme logic.
       ===================================================== */

    window.StockFlowTheme = {

        /* Get current saved theme */
        getTheme() {
            return getSavedTheme();
        },


        /* Apply a theme */
        setTheme(theme) {

            if (!VALID_THEMES.includes(theme)) {

                console.warn(
                    `STOCKFLOW: Invalid theme "${theme}".`
                );

                return;
            }

            applyTheme(theme);
        },


        /* Reset to original STOCKFLOW design */
        reset() {

            applyTheme(
                DEFAULT_THEME
            );
        },


        /* Available themes */
        getAvailableThemes() {

            return [
                ...VALID_THEMES
            ];
        }
    };

})();
