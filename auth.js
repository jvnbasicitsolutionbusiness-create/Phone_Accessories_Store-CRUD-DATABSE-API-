/* ============================================================
   STOCKFLOW — AUTHENTICATION CONTROLLER
   File: auth.js

   Handles:
   - Sign In / Create Account tab switching
   - Login/Register panel visibility
   - Password Show/Hide
   - Authentication navigation
   - URL hash navigation
   - Keyboard accessibility

   NOTE:
   This file does NOT handle:
   - API requests
   - OTP verification
   - Sessions
   - Firebase
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =========================================================
       ELEMENTS
       ========================================================= */

    const authTabs =
        document.querySelectorAll(
            "[data-auth-tab]"
        );


    const authControls =
        document.querySelectorAll(
            "[data-show-auth]"
        );


    const authPanels =
        document.querySelectorAll(
            "[data-auth-view]"
        );


    /*
     * If this page does not contain
     * authentication components, stop safely.
     */

    if (
        !authTabs.length &&
        !authControls.length &&
        !authPanels.length
    ) {
        return;
    }


    /* =========================================================
       SHOW AUTH PANEL
       ========================================================= */

    function showAuthPanel(view, focusInput = true) {

        if (
            view !== "login" &&
            view !== "register"
        ) {
            view = "login";
        }


        /* -----------------------------------------------------
           PANELS
           ----------------------------------------------------- */

        authPanels.forEach(panel => {

            const panelView =
                panel.dataset.authView;


            const active =
                panelView === view;


            panel.classList.toggle(
                "hidden",
                !active
            );


            panel.setAttribute(
                "aria-hidden",
                String(!active)
            );

        });


        /* -----------------------------------------------------
           TABS
           ----------------------------------------------------- */

        authTabs.forEach(tab => {

            const tabView =
                tab.dataset.authTab;


            const active =
                tabView === view;


            tab.classList.toggle(
                "active",
                active
            );


            tab.setAttribute(
                "aria-selected",
                String(active)
            );

        });


        /* -----------------------------------------------------
           ACCESSIBILITY
           ----------------------------------------------------- */

        const activePanel =
            document.querySelector(
                `[data-auth-view="${view}"]`
            );


        if (
            activePanel &&
            focusInput
        ) {

            const firstInput =
                activePanel.querySelector(
                    "input:not([type='hidden'])"
                );


            if (firstInput) {

                setTimeout(() => {

                    firstInput.focus();

                }, 60);

            }

        }


        /* -----------------------------------------------------
           UPDATE HASH
           ----------------------------------------------------- */

        const currentHash =
            window.location.hash;


        const desiredHash =
            "#" + view;


        if (
            currentHash !== desiredHash
        ) {

            /*
             * Replace the hash instead of creating
             * unnecessary browser history entries.
             */

            history.replaceState(
                null,
                "",
                desiredHash
            );

        }

    }


    /* =========================================================
       TAB CLICK
       ========================================================= */

    authTabs.forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                const view =
                    tab.dataset.authTab;


                showAuthPanel(
                    view,
                    true
                );

            }
        );

    });


    /* =========================================================
       AUTH SWITCH LINKS / BUTTONS
       ========================================================= */

    authControls.forEach(control => {

        /*
         * Do not register the tab buttons twice.
         */

        if (
            control.matches(
                "[data-auth-tab]"
            )
        ) {
            return;
        }


        control.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const view =
                    control.dataset.showAuth;


                showAuthPanel(
                    view,
                    true
                );

            }
        );

    });


    /* =========================================================
       PASSWORD SHOW / HIDE
       ========================================================= */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".password-toggle"
                );


            if (!button) {
                return;
            }


            let input = null;


            /* -------------------------------------------------
               EXPLICIT TARGET
               ------------------------------------------------- */

            const targetId =
                button.dataset.target ||
                button.dataset.togglePassword;


            if (targetId) {

                input =
                    document.getElementById(
                        targetId
                    );

            }


            /* -------------------------------------------------
               WRAPPER FALLBACK
               ------------------------------------------------- */

            if (!input) {

                const wrapper =
                    button.closest(
                        ".password-field, .password-wrapper, .password-wrap"
                    );


                if (wrapper) {

                    input =
                        wrapper.querySelector(
                            "input"
                        );

                }

            }


            if (!input) {
                return;
            }


            /* -------------------------------------------------
               SHOW
               ------------------------------------------------- */

            if (
                input.type === "password"
            ) {

                input.type =
                    "text";


                button.textContent =
                    "Hide";


                button.classList.add(
                    "active"
                );


                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );


                button.setAttribute(
                    "aria-pressed",
                    "true"
                );

            }


            /* -------------------------------------------------
               HIDE
               ------------------------------------------------- */

            else {

                input.type =
                    "password";


                button.textContent =
                    "Show";


                button.classList.remove(
                    "active"
                );


                button.setAttribute(
                    "aria-label",
                    "Show password"
                );


                button.setAttribute(
                    "aria-pressed",
                    "false"
                );

            }

        }
    );


    /* =========================================================
       KEYBOARD TAB NAVIGATION
       ========================================================= */

    authTabs.forEach(tab => {

        tab.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "ArrowLeft" &&
                    event.key !== "ArrowRight"
                ) {
                    return;
                }


                event.preventDefault();


                const tabArray =
                    Array.from(
                        authTabs
                    );


                const currentIndex =
                    tabArray.indexOf(
                        tab
                    );


                let nextIndex;


                if (
                    event.key === "ArrowRight"
                ) {

                    nextIndex =
                        currentIndex + 1;


                    if (
                        nextIndex >=
                        tabArray.length
                    ) {

                        nextIndex = 0;

                    }

                }

                else {

                    nextIndex =
                        currentIndex - 1;


                    if (
                        nextIndex < 0
                    ) {

                        nextIndex =
                            tabArray.length - 1;

                    }

                }


                const nextTab =
                    tabArray[nextIndex];


                if (!nextTab) {
                    return;
                }


                nextTab.focus();


                showAuthPanel(
                    nextTab.dataset.authTab,
                    false
                );

            }
        );

    });


    /* =========================================================
       CLEAR AUTH MESSAGES
       ========================================================= */

    function clearInactiveMessages() {

        const messages =
            document.querySelectorAll(
                ".auth-message"
            );


        messages.forEach(message => {

            message.textContent =
                "";

            message.className =
                "auth-message";

        });

    }


    /* =========================================================
       RESET BUTTON STATES
       ========================================================= */

    function resetButtonStates() {

        const buttons =
            document.querySelectorAll(
                ".auth-submit"
            );


        buttons.forEach(button => {

            button.classList.remove(
                "loading"
            );


            button.disabled =
                false;


            const text =
                button.querySelector(
                    ".button-text"
                );


            const loader =
                button.querySelector(
                    ".button-loader"
                );


            if (text) {

                text.style.display =
                    "";

            }


            if (loader) {

                loader.hidden =
                    true;

            }

        });

    }


    /* =========================================================
       HASH ROUTING
       ========================================================= */

    function getHashView() {

        const hash =
            window.location.hash
                .replace("#", "")
                .toLowerCase()
                .trim();


        if (
            hash === "register"
        ) {

            return "register";

        }


        return "login";

    }


    /* =========================================================
       HASH CHANGE
       ========================================================= */

    window.addEventListener(
        "hashchange",
        () => {

            const view =
                getHashView();


            clearInactiveMessages();


            showAuthPanel(
                view,
                false
            );

        }
    );


    /* =========================================================
       INITIAL STATE
       ========================================================= */

    resetButtonStates();


    const initialView =
        getHashView();


    showAuthPanel(
        initialView,
        false
    );


    /* =========================================================
       PUBLIC CONTROLLER
       ========================================================= */

    window.StockFlowAuthUI = {

        showLogin() {

            clearInactiveMessages();


            showAuthPanel(
                "login",
                true
            );

        },


        showRegister() {

            clearInactiveMessages();


            showAuthPanel(
                "register",
                true
            );

        },


        getCurrentView() {

            const activePanel =
                document.querySelector(
                    '[data-auth-view]:not(.hidden)'
                );


            return activePanel
                ? activePanel.dataset.authView
                : "login";

        }

    };

});
