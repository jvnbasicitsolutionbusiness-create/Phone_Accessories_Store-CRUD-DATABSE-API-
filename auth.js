/* ============================================================
   STOCKFLOW — AUTHENTICATION CONTROLLER
   Handles:
   - Sign In / Create Account tab switching
   - Login/Register panel visibility
   - Password Show/Hide
   - Authentication navigation
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
     * If this is not the authentication page,
     * stop safely.
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

    function showAuthPanel(view) {

        if (
            view !== "login" &&
            view !== "register"
        ) {
            return;
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
           FOCUS FIRST INPUT
           ----------------------------------------------------- */

        const activePanel =
            document.querySelector(
                `[data-auth-view="${view}"]`
            );


        if (!activePanel) {
            return;
        }


        const firstInput =
            activePanel.querySelector(
                "input"
            );


        if (firstInput) {

            setTimeout(() => {

                firstInput.focus();

            }, 50);

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


                showAuthPanel(view);

            }
        );

    });


    /* =========================================================
       AUTH SWITCH LINKS / BUTTONS
       ========================================================= */

    authControls.forEach(control => {

        /*
         * Avoid registering the tab buttons twice.
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


                showAuthPanel(view);

            }
        );

    });


    /* =========================================================
       PASSWORD SHOW / HIDE
       FIXED:
       Supports .password-field and .password-wrapper
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


            /*
             * First use the explicit target ID.
             * This is the safest method because the HTML
             * already provides data-target.
             */

            let input = null;


            const targetId =
                button.dataset.target ||
                button.dataset.togglePassword;


            if (targetId) {

                input =
                    document.getElementById(
                        targetId
                    );

            }


            /*
             * Fallback for wrapper-based markup.
             */

            if (!input) {

                const wrapper =
                    button.closest(
                        ".password-field, .password-wrapper"
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
               SHOW PASSWORD
               ------------------------------------------------- */

            if (
                input.type === "password"
            ) {

                input.type = "text";


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
               HIDE PASSWORD
               ------------------------------------------------- */

            else {

                input.type = "password";


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
       KEYBOARD ACCESSIBILITY
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
                    Array.from(authTabs);


                const currentIndex =
                    tabArray.indexOf(tab);


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


                if (nextTab) {

                    nextTab.focus();


                    showAuthPanel(
                        nextTab.dataset.authTab
                    );

                }

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

            message.textContent = "";

            message.className =
                "auth-message";

        });

    }


    /* =========================================================
       RESET PASSWORD BUTTON STATES
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


            button.disabled = false;


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

                loader.hidden = true;

            }

        });

    }


    /* =========================================================
       INITIAL STATE
       ========================================================= */

    resetButtonStates();

    showAuthPanel("login");


    /* =========================================================
       PUBLIC AUTH CONTROLLER
       ========================================================= */

    window.StockFlowAuthUI = {

        showLogin() {

            clearInactiveMessages();

            showAuthPanel("login");

        },


        showRegister() {

            clearInactiveMessages();

            showAuthPanel("register");

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
