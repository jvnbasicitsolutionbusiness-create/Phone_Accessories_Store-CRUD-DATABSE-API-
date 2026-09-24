/* =========================================================
   STOCKFLOW — SETTINGS MODULE

   Features:
   - Inventory reorder setting
   - System / Light / Dark theme
   - Save Settings
   - Reset / Restore Defaults
   - Cancel / Discard Changes
   - User detection
   - Profile link
   - Logout
   - Mobile sidebar
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STORAGE
    ===================================================== */

    const STORAGE_KEY =
        "stockflow_settings";


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {

        reorder: 5,

        /*
         * IMPORTANT:
         * "system" = STOCKFLOW ORIGINAL
         * WHITE + BLUE DESIGN.
         *
         * It does NOT follow Windows,
         * browser, or OS dark mode.
         */

        theme: "system"

    };


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        currentUser: null,

        initialized: false,

        saving: false,

        resetting: false,

        originalSettings: null

    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = id =>
        document.getElementById(id);


    const VALID_THEMES = [

        "system",
        "light",
        "dark"

    ];


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    const escapeHTML =
        value => {

            return String(
                value ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );

        };


    /* =====================================================
       GET SESSION USER
    ===================================================== */

    const getSessionUser =
        () => {

            try {

                const raw =
                    sessionStorage.getItem(
                        "STOCKFLOW_SESSION"
                    );


                if (!raw) {

                    return null;

                }


                const session =
                    JSON.parse(
                        raw
                    );


                if (!session) {

                    return null;

                }


                return (

                    session.user ||

                    session.data?.user ||

                    session.profile ||

                    null

                );

            } catch (error) {

                console.warn(
                    "STOCKFLOW: Unable to read session user.",
                    error
                );

                return null;

            }

        };


    /* =====================================================
       USER HELPERS
    ===================================================== */

    const getUserName =
        user => {

            return (

                user?.name ||

                user?.fullName ||

                user?.full_name ||

                user?.displayName ||

                user?.username ||

                user?.email ||

                user?.gmail ||

                "STOCKFLOW USER"

            );

        };


    const getUserRole =
        user => {

            return (

                user?.role ||

                user?.position ||

                user?.designation ||

                user?.accountStatus ||

                user?.account_status ||

                "Employee"

            );

        };


    const getUserIdentity =
        user => {

            return (

                user?.username ||

                user?.email ||

                user?.gmail ||

                user?.phone ||

                user?.employeeId ||

                user?.employee_id ||

                user?.id ||

                user?.userId ||

                ""

            );

        };


    const getInitials =
        name => {

            const value =
                String(
                    name ||
                    "STOCKFLOW USER"
                )
                    .trim();


            if (!value) {

                return "SF";

            }


            const parts =
                value
                    .split(/\s+/)
                    .filter(Boolean);


            if (
                parts.length === 1
            ) {

                return parts[0]
                    .substring(
                        0,
                        2
                    )
                    .toUpperCase();

            }


            return (

                parts[0][0] +

                parts[
                    parts.length - 1
                ][0]

            ).toUpperCase();

        };


    /* =====================================================
       USER DISPLAY
    ===================================================== */

    const populateUser =
        userOverride => {

            let user =
                userOverride ||
                state.currentUser ||
                getSessionUser();


            if (!user) {

                try {

                    if (
                        window.StockFlowAuth &&
                        typeof
                        window.StockFlowAuth.getUser ===
                            "function"
                    ) {

                        user =
                            window.StockFlowAuth.getUser();

                    }

                } catch (error) {

                    console.warn(
                        "STOCKFLOW legacy user lookup failed.",
                        error
                    );

                }

            }


            if (!user) {

                return;

            }


            state.currentUser =
                user;


            const name =
                getUserName(
                    user
                );


            const role =
                getUserRole(
                    user
                );


            const initials =
                getInitials(
                    name
                );


            const displayRole =
                String(role)
                    .trim()
                    .toLowerCase() ===
                    "admin"

                        ? "Administrator"

                        : role;


            /* ---------------------------------------------
               DATA ATTRIBUTE USER ELEMENTS
            --------------------------------------------- */

            document
                .querySelectorAll(
                    "[data-user-name]"
                )
                .forEach(
                    element => {

                        element.textContent =
                            name;

                    }
                );


            document
                .querySelectorAll(
                    "[data-user-role]"
                )
                .forEach(
                    element => {

                        element.textContent =
                            displayRole;

                    }
                );


            document
                .querySelectorAll(
                    "[data-user-initials]"
                )
                .forEach(
                    element => {

                        element.textContent =
                            initials;

                    }
                );


            /* ---------------------------------------------
               COMMON USER IDS
            --------------------------------------------- */

            [

                "headerUserName",
                "sidebarUserName",
                "topbarUserName",
                "userName",
                "topUserName"

            ].forEach(
                id => {

                    const element =
                        $(id);


                    if (element) {

                        element.textContent =
                            name;

                    }

                }
            );


            [

                "headerUserRole",
                "sidebarUserRole",
                "topbarUserRole",
                "userRole",
                "topUserRole"

            ].forEach(
                id => {

                    const element =
                        $(id);


                    if (element) {

                        element.textContent =
                            displayRole;

                    }

                }
            );


            [

                "headerUserAvatar",
                "sidebarUserAvatar",
                "topbarAvatar",
                "userAvatar"

            ].forEach(
                id => {

                    const element =
                        $(id);


                    if (element) {

                        element.textContent =
                            initials;

                    }

                }
            );


            /* ---------------------------------------------
               AVATAR CLASSES
            --------------------------------------------- */

            document
                .querySelectorAll(
                    [
                        ".sf-user-avatar",
                        ".sf-header-avatar",
                        ".sf-sidebar-avatar",
                        ".top-user-avatar",
                        ".sidebar-user-avatar"
                    ].join(",")
                )
                .forEach(
                    element => {

                        element.textContent =
                            initials;

                    }
                );


            /* ---------------------------------------------
               EMAIL
            --------------------------------------------- */

            const email =
                user?.email ||
                user?.gmail ||
                "";


            document
                .querySelectorAll(
                    [
                        "#headerUserEmail",
                        "#sidebarUserEmail",
                        "#topbarUserEmail"
                    ].join(",")
                )
                .forEach(
                    element => {

                        if (email) {

                            element.textContent =
                                email;

                        }

                    }
                );

        };


    /* =====================================================
       PROFILE LINKS
    ===================================================== */

    const setupUserProfileLinks =
        () => {

            const selectors = [

                "[data-user-profile]",

                "#userProfile",
                "#topUserProfile",
                "#headerUserProfile",
                "#sidebarUserProfile",

                ".topbar-user",
                ".top-user-profile",
                ".sidebar-user",
                ".sf-user-profile",
                ".user-profile"

            ];


            document
                .querySelectorAll(
                    selectors.join(",")
                )
                .forEach(
                    element => {

                        /*
                         * Never turn logout into profile.
                         */

                        if (

                            element.id ===
                            "logout" ||

                            element.id ===
                            "sidebarLogout" ||

                            element.closest(
                                "#logout"
                            ) ||

                            element.closest(
                                "#sidebarLogout"
                            ) ||

                            element.matches(
                                "[data-logout], .logout-button"
                            )

                        ) {

                            return;

                        }


                        if (

                            element.dataset
                                .stockflowProfileBound ===
                            "true"

                        ) {

                            return;

                        }


                        element.dataset
                            .stockflowProfileBound =
                            "true";


                        if (

                            element.tagName
                                .toLowerCase() ===
                            "a"

                        ) {

                            element.setAttribute(
                                "href",
                                "./profile.html"
                            );


                            return;

                        }


                        element.setAttribute(
                            "role",
                            "link"
                        );


                        element.setAttribute(
                            "tabindex",
                            "0"
                        );


                        element.style.cursor =
                            "pointer";


                        element.addEventListener(
                            "click",
                            () => {

                                window.location.href =
                                    "./profile.html";

                            }
                        );


                        element.addEventListener(
                            "keydown",
                            event => {

                                if (

                                    event.key ===
                                        "Enter" ||

                                    event.key ===
                                        " "

                                ) {

                                    event.preventDefault();


                                    window.location.href =
                                        "./profile.html";

                                }

                            }
                        );

                    }
                );


            /*
             * Make the actual name/avatar clickable
             * even if HTML has no profile wrapper.
             */

            [

                "headerUserName",
                "sidebarUserName",
                "topbarUserName",
                "userName",
                "topUserName",

                "headerUserAvatar",
                "sidebarUserAvatar",
                "topbarAvatar",
                "userAvatar"

            ].forEach(
                id => {

                    const element =
                        $(id);


                    if (!element) {

                        return;

                    }


                    if (

                        element.dataset
                            .stockflowProfileBound ===
                        "true"

                    ) {

                        return;

                    }


                    element.dataset
                        .stockflowProfileBound =
                        "true";


                    element.style.cursor =
                        "pointer";


                    element.addEventListener(
                        "click",
                        () => {

                            window.location.href =
                                "./profile.html";

                        }
                    );

                }
            );

        };


    /* =====================================================
       REFRESH USER SESSION
    ===================================================== */

    const refreshSessionUser =
        async () => {

            const sessionUser =
                getSessionUser();


            if (!sessionUser) {

                populateUser();

                return;

            }


            state.currentUser =
                sessionUser;


            const identity =
                getUserIdentity(
                    sessionUser
                );


            /*
             * Optional backend refresh.
             *
             * If this fails, keep the existing
             * session user. DO NOT LOG OUT.
             */

            if (

                identity &&

                window.StockFlowAPI &&

                typeof
                window.StockFlowAPI.getUser ===
                    "function"

            ) {

                try {

                    const freshUser =
                        await
                        window.StockFlowAPI.getUser(
                            identity
                        );


                    if (freshUser) {

                        state.currentUser =
                            freshUser;

                    }

                } catch (error) {

                    console.warn(
                        "STOCKFLOW: Unable to refresh user profile. Keeping session user.",
                        error
                    );

                }

            }


            populateUser();

        };


    /* =====================================================
       VALIDATE SETTINGS
    ===================================================== */

    const normalizeSettings =
        settings => {

            const reorder =
                Number(
                    settings?.reorder
                );


            const theme =
                VALID_THEMES.includes(
                    settings?.theme
                )

                    ? settings.theme

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

        };


    /* =====================================================
       APPLY SAVED THEME IMMEDIATELY
       
       This runs before page initialization
       to reduce theme flashing.
    ===================================================== */

    const applySavedThemeImmediately =
        () => {

            try {

                const stored =
                    localStorage.getItem(
                        STORAGE_KEY
                    );


                let theme =
                    DEFAULT_SETTINGS.theme;


                if (stored) {

                    const settings =
                        JSON.parse(
                            stored
                        );


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
                    "STOCKFLOW: Unable to apply saved theme.",
                    error
                );

            }

        };


    /* =====================================================
       GET SETTINGS
    ===================================================== */

    const getSettings =
        () => {

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


                return normalizeSettings(
                    parsed
                );

            } catch (error) {

                console.warn(
                    "STOCKFLOW: Unable to read settings.",
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

            const normalized =
                normalizeSettings(
                    settings
                );


            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    normalized
                )
            );

        };


    /* =====================================================
       GET STOCKFLOW SYSTEM THEME
       
       IMPORTANT:
       This is NOT OS detection.
    ===================================================== */

    const getSystemTheme =
        () => {

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
             * DO NOT use matchMedia().
             *
             * "system" means the original
             * STOCKFLOW white + blue theme.
             */

            const resolvedTheme =
                theme;


            const html =
                document.documentElement;


            const body =
                document.body;


            /* ---------------------------------------------
               HTML
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
               BODY
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
               REMOVE OLD CLASSES
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
               ADD CURRENT CLASS
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
               NATIVE COLOR SCHEME
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


    const clearMessage =
        () => {

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
       LOAD SETTINGS INTO FORM
    ===================================================== */

    const loadSettings =
        (
            settingsOverride = null
        ) => {

            const settings =
                normalizeSettings(
                    settingsOverride ||
                    getSettings()
                );


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


            return settings;

        };


    /* =====================================================
       CHECK FORM CHANGES
    ===================================================== */

    const hasUnsavedChanges =
        () => {

            const current =
                getSettings();


            const formSettings = {

                reorder:
                    Number(
                        $("reorder")?.value ??
                        current.reorder
                    ),

                theme:
                    VALID_THEMES.includes(
                        $("theme")?.value
                    )

                        ? $("theme").value

                        : current.theme

            };


            return (

                Number(
                    formSettings.reorder
                ) !==
                Number(
                    current.reorder
                ) ||

                formSettings.theme !==
                current.theme

            );

        };


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    const saveSettings =
        async event => {

            event?.preventDefault();


            if (state.saving) {

                return;

            }


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
               VALIDATE REORDER
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


            const settings = {

                reorder:
                    Math.floor(
                        reorderValue
                    ),

                theme:
                    selectedTheme

            };


            state.saving =
                true;


            const originalText =
                saveButton?.textContent ||
                "Save Settings";


            if (saveButton) {

                saveButton.disabled =
                    true;


                saveButton.textContent =
                    "Saving...";

            }


            clearMessage();


            try {

                saveSettingsToStorage(
                    settings
                );


                applyTheme(
                    settings.theme
                );


                state.originalSettings =
                    {
                        ...settings
                    };


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

                state.saving =
                    false;


                if (saveButton) {

                    saveButton.disabled =
                        false;


                    saveButton.textContent =
                        originalText;

                }

            }

        };


    /* =====================================================
       RESET / RESTORE DEFAULT SETTINGS
       
       This resets:
       - Reorder level → 5
       - Theme → System
       
       It saves the defaults immediately.
    ===================================================== */

    const resetSettings =
        async event => {

            event?.preventDefault();


            if (state.resetting) {

                return;

            }


            const confirmed =
                window.confirm(
                    "Reset STOCKFLOW settings to their default values?\n\n" +
                    "Reorder Level: 5\n" +
                    "Theme: System"
                );


            if (!confirmed) {

                return;

            }


            state.resetting =
                true;


            const resetButtons =
                getResetButtons();


            resetButtons.forEach(
                button => {

                    button.disabled =
                        true;

                }
            );


            try {

                const defaults = {

                    ...DEFAULT_SETTINGS

                };


                saveSettingsToStorage(
                    defaults
                );


                loadSettings(
                    defaults
                );


                state.originalSettings =
                    {
                        ...defaults
                    };


                showMessage(
                    "Settings restored to default values.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "STOCKFLOW reset settings error:",
                    error
                );


                showMessage(
                    "Unable to reset settings.",
                    "error"
                );

            } finally {

                state.resetting =
                    false;


                resetButtons.forEach(
                    button => {

                        button.disabled =
                            false;

                    }
                );

            }

        };


    /* =====================================================
       CANCEL / DISCARD CHANGES
       
       This does NOT delete saved settings.
       
       It simply reloads the currently saved
       settings back into the form.
    ===================================================== */

    const cancelSettings =
        event => {

            event?.preventDefault();


            if (
                !hasUnsavedChanges()
            ) {

                loadSettings();


                clearMessage();


                return;

            }


            const confirmed =
                window.confirm(
                    "Discard your unsaved changes?"
                );


            if (!confirmed) {

                return;

            }


            const saved =
                getSettings();


            loadSettings(
                saved
            );


            state.originalSettings =
                {
                    ...saved
                };


            showMessage(
                "Unsaved changes discarded.",
                "success"
            );

        };


    /* =====================================================
       RESET BUTTON DETECTION
       
       Supports multiple possible HTML IDs/classes.
    ===================================================== */

    const getResetButtons =
        () => {

            const selectors = [

                "#resetSettings",
                "#resetButton",
                "#restoreDefaults",
                "#defaultSettings",
                "#restoreButton",

                "[data-reset-settings]",
                "[data-restore-defaults]"

            ];


            return Array.from(
                document.querySelectorAll(
                    selectors.join(",")
                )
            );

        };


    /* =====================================================
       CANCEL BUTTON DETECTION
       
       Supports multiple possible HTML IDs/classes.
    ===================================================== */

    const getCancelButtons =
        () => {

            const selectors = [

                "#cancelSettings",
                "#cancelButton",
                "#discardChanges",
                "#discardButton",

                "[data-cancel-settings]",
                "[data-discard-changes]"

            ];


            return Array.from(
                document.querySelectorAll(
                    selectors.join(",")
                )
            );

        };


    /* =====================================================
       SETUP RESET BUTTON
    ===================================================== */

    const setupResetButtons =
        () => {

            const buttons =
                getResetButtons();


            buttons.forEach(
                button => {

                    if (
                        button.dataset
                            .stockflowResetBound ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset
                        .stockflowResetBound =
                        "true";


                    button.addEventListener(
                        "click",
                        resetSettings
                    );

                }
            );

        };


    /* =====================================================
       SETUP CANCEL BUTTON
    ===================================================== */

    const setupCancelButtons =
        () => {

            const buttons =
                getCancelButtons();


            buttons.forEach(
                button => {

                    if (
                        button.dataset
                            .stockflowCancelBound ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset
                        .stockflowCancelBound =
                        "true";


                    button.addEventListener(
                        "click",
                        cancelSettings
                    );

                }
            );

        };


    /* =====================================================
       LIVE THEME PREVIEW
    ===================================================== */

    const setupThemePreview =
        () => {

            const theme =
                $("theme");


            if (!theme) {

                return;

            }


            if (
                theme.dataset
                    .stockflowThemeBound ===
                "true"
            ) {

                return;

            }


            theme.dataset
                .stockflowThemeBound =
                "true";


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


                    /*
                     * Do not save here.
                     *
                     * It is only a preview.
                     */

                }
            );

        };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupMobileMenu =
        () => {

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

            const closeMenu =
                () => {

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

            const openMenu =
                () => {

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

            if (
                menuButton.dataset
                    .stockflowMenuBound !==
                "true"
            ) {

                menuButton.dataset
                    .stockflowMenuBound =
                    "true";


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

            }


            /* ---------------------------------------------
               OVERLAY
            --------------------------------------------- */

            if (
                overlay.dataset
                    .stockflowOverlayBound !==
                "true"
            ) {

                overlay.dataset
                    .stockflowOverlayBound =
                    "true";


                overlay.addEventListener(
                    "click",
                    closeMenu
                );

            }


            /* ---------------------------------------------
               NAV LINKS
            --------------------------------------------- */

            sidebar
                .querySelectorAll("a")
                .forEach(
                    link => {

                        if (
                            link.dataset
                                .stockflowNavBound ===
                            "true"
                        ) {

                            return;

                        }


                        link.dataset
                            .stockflowNavBound =
                            "true";


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

            if (
                document.body.dataset
                    .stockflowEscapeBound !==
                "true"
            ) {

                document.body.dataset
                    .stockflowEscapeBound =
                    "true";


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

            }


            /* ---------------------------------------------
               RESIZE
            --------------------------------------------- */

            if (
                document.body.dataset
                    .stockflowResizeBound !==
                "true"
            ) {

                document.body.dataset
                    .stockflowResizeBound =
                    "true";


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

            }

        };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const setupLogout =
        () => {

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
                clickedButton => {

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


                    if (clickedButton) {

                        clickedButton.textContent =
                            "Logging out...";

                    }


                    /*
                     * IMPORTANT:
                     *
                     * We do NOT use
                     * sessionStorage.clear()
                     *
                     * because other session data
                     * may exist.
                     *
                     * Only authentication keys
                     * are removed.
                     */

                    const sessionKeys = [

                        "STOCKFLOW_SESSION",
                        "STOCKFLOW_TOKEN",
                        "stockflow_auth",
                        "stockflow_user",

                        "AUTH_TOKEN",
                        "TOKEN",
                        "authToken",
                        "accessToken"

                    ];


                    sessionKeys.forEach(
                        key => {

                            try {

                                sessionStorage.removeItem(
                                    key
                                );

                            } catch (error) {

                                console.warn(
                                    `Unable to remove ${key}:`,
                                    error
                                );

                            }

                        }
                    );


                    const localKeys = [

                        "STOCKFLOW_TOKEN",
                        "stockflow_auth",
                        "stockflow_user",

                        "AUTH_TOKEN",
                        "TOKEN",
                        "authToken",
                        "accessToken"

                    ];


                    localKeys.forEach(
                        key => {

                            try {

                                localStorage.removeItem(
                                    key
                                );

                            } catch (error) {

                                console.warn(
                                    `Unable to remove ${key}:`,
                                    error
                                );

                            }

                        }
                    );


                    /*
                     * IMPORTANT:
                     *
                     * stockflow_settings is NOT removed.
                     *
                     * This preserves the user's
                     * selected theme after logout.
                     */

                    window.setTimeout(
                        () => {

                            window.location.replace(
                                "./auth.html"
                            );

                        },
                        150
                    );

                };


            buttons.forEach(
                button => {

                    if (
                        button.dataset
                            .stockflowLogoutBound ===
                        "true"
                    ) {

                        return;

                    }


                    button.dataset
                        .stockflowLogoutBound =
                        "true";


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
       
       Uses STOCKFLOW_SESSION as the primary
       authentication source.
    ===================================================== */

    const initializeAuthentication =
        async () => {

            const sessionUser =
                getSessionUser();


            if (sessionUser) {

                state.currentUser =
                    sessionUser;


                populateUser();


                await
                refreshSessionUser();


                return true;

            }


            /*
             * Legacy fallback.
             *
             * We intentionally DO NOT call
             * StockFlowAuth.requireAuth().
             */

            if (

                window.StockFlowAuth &&

                typeof
                window.StockFlowAuth.getUser ===
                    "function"

            ) {

                try {

                    const legacyUser =
                        window.StockFlowAuth.getUser();


                    if (legacyUser) {

                        state.currentUser =
                            legacyUser;


                        populateUser(
                            legacyUser
                        );


                        return true;

                    }

                } catch (error) {

                    console.warn(
                        "STOCKFLOW legacy authentication lookup failed:",
                        error
                    );

                }

            }


            /*
             * No authenticated user.
             */

            console.warn(
                "STOCKFLOW: No active login session."
            );


            window.location.replace(
                "./auth.html"
            );


            return false;

        };


    /* =====================================================
       SETUP SETTINGS FORM
    ===================================================== */

    const setupSettingsForm =
        () => {

            const form =
                $("settings");


            if (!form) {

                return;

            }


            if (
                form.dataset
                    .stockflowSettingsBound ===
                "true"
            ) {

                return;

            }


            form.dataset
                .stockflowSettingsBound =
                "true";


            form.addEventListener(
                "submit",
                saveSettings
            );

        };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize =
        async () => {

            if (
                state.initialized
            ) {

                return;

            }


            state.initialized =
                true;


            /* ---------------------------------------------
               AUTH
            --------------------------------------------- */

            const authenticated =
                await
                initializeAuthentication();


            if (!authenticated) {

                return;

            }


            /* ---------------------------------------------
               USER
            --------------------------------------------- */

            populateUser();

            setupUserProfileLinks();


            /* ---------------------------------------------
               SETTINGS
            --------------------------------------------- */

            const settings =
                loadSettings();


            state.originalSettings =
                {
                    ...settings
                };


            /* ---------------------------------------------
               THEME
            --------------------------------------------- */

            setupThemePreview();


            /* ---------------------------------------------
               BUTTONS
            --------------------------------------------- */

            setupSettingsForm();

            setupResetButtons();

            setupCancelButtons();


            /* ---------------------------------------------
               SIDEBAR
            --------------------------------------------- */

            setupMobileMenu();


            /* ---------------------------------------------
               LOGOUT
            --------------------------------------------- */

            setupLogout();

        };


    /* =====================================================
       APPLY SAVED THEME BEFORE PAGE LOAD
    ===================================================== */

    applySavedThemeImmediately();


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();

    }

})();
