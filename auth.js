/* ============================================================
   STOCKFLOW — AUTHENTICATION UI CONTROLLER
   File: auth.js

   RESPONSIBILITIES:
   - Login / Register tab switching
   - Login / Register panel visibility
   - Password show / hide
   - Authentication UI navigation
   - URL hash navigation
   - Keyboard accessibility
   - Authentication UI state reset

   THIS FILE DOES NOT:
   - Call the API
   - Generate OTP
   - Store OTP
   - Verify OTP
   - Handle Firebase
   - Handle Google Apps Script
   - Save authentication sessions
   - Perform login
   - Perform registration

   API:
       api.js

   LOGIN:
       login.js

   REGISTER:
       register.js

   OTP:
       verify.js

   SESSION:
       StockFlowAuth
   ============================================================ */


document.addEventListener(
    "DOMContentLoaded",
    () => {

        "use strict";


        /* =====================================================
           ELEMENTS
           ===================================================== */

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
         * Some pages may not contain the authentication UI.
         *
         * In that situation auth.js must exit safely.
         */

        if (
            !authTabs.length &&
            !authControls.length &&
            !authPanels.length
        ) {

            return;

        }


        /* =====================================================
           VALID AUTH VIEWS
           ===================================================== */

        const VALID_VIEWS = [
            "login",
            "register"
        ];


        /* =====================================================
           NORMALIZE VIEW
           ===================================================== */

        function normalizeView(
            view
        ) {

            const normalized =
                String(
                    view || ""
                )
                    .toLowerCase()
                    .trim();


            if (
                VALID_VIEWS.includes(
                    normalized
                )
            ) {

                return normalized;

            }


            return "login";

        }


        /* =====================================================
           CLEAR AUTH MESSAGES
           ===================================================== */

        function clearInactiveMessages() {

            const messages =
                document.querySelectorAll(
                    ".auth-message"
                );


            messages.forEach(
                message => {

                    message.textContent =
                        "";


                    message.className =
                        "auth-message";

                }
            );

        }


        /* =====================================================
           RESET AUTH BUTTON STATES
           ===================================================== */

        function resetButtonStates() {

            const buttons =
                document.querySelectorAll(
                    ".auth-submit"
                );


            buttons.forEach(
                button => {

                    /*
                     * Remove loading state.
                     */

                    button.classList.remove(
                        "loading"
                    );


                    /*
                     * Restore button availability.
                     */

                    button.disabled =
                        false;


                    button.removeAttribute(
                        "aria-busy"
                    );


                    /*
                     * Restore normal button text.
                     */

                    const text =
                        button.querySelector(
                            ".button-text"
                        );


                    if (text) {

                        text.hidden =
                            false;


                        text.style.display =
                            "";

                    }


                    /*
                     * Hide loader.
                     */

                    const loader =
                        button.querySelector(
                            ".button-loader"
                        );


                    if (loader) {

                        loader.hidden =
                            true;


                        loader.style.display =
                            "";

                    }

                }
            );

        }


        /* =====================================================
           SHOW AUTH PANEL
           ===================================================== */

        function showAuthPanel(
            view,
            focusInput = true
        ) {

            view =
                normalizeView(
                    view
                );


            /* -------------------------------------------------
               PANELS
               ------------------------------------------------- */

            authPanels.forEach(
                panel => {

                    const panelView =
                        normalizeView(
                            panel.dataset.authView
                        );


                    const active =
                        panelView === view;


                    /*
                     * Preserve the existing CSS class
                     * structure.
                     */

                    panel.classList.toggle(
                        "hidden",
                        !active
                    );


                    panel.setAttribute(
                        "aria-hidden",
                        String(
                            !active
                        )
                    );


                    /*
                     * Keep inactive panels out of
                     * keyboard navigation.
                     */

                    if (
                        active
                    ) {

                        panel.removeAttribute(
                            "inert"
                        );

                    } else {

                        /*
                         * Do not force inert when the
                         * browser does not support it.
                         */

                        try {

                            panel.setAttribute(
                                "inert",
                                ""
                            );

                        } catch (
                            error
                        ) {

                            /*
                             * Older browsers may not
                             * support the property.
                             */

                        }

                    }

                }
            );


            /* -------------------------------------------------
               TABS
               ------------------------------------------------- */

            authTabs.forEach(
                tab => {

                    const tabView =
                        normalizeView(
                            tab.dataset.authTab
                        );


                    const active =
                        tabView === view;


                    tab.classList.toggle(
                        "active",
                        active
                    );


                    tab.setAttribute(
                        "aria-selected",
                        String(
                            active
                        )
                    );


                    /*
                     * If tabs behave like ARIA tabs,
                     * maintain tab index.
                     */

                    if (
                        tab.getAttribute(
                            "role"
                        ) === "tab"
                    ) {

                        tab.setAttribute(
                            "tabindex",
                            active
                                ? "0"
                                : "-1"
                        );

                    }

                }
            );


            /* -------------------------------------------------
               FOCUS FIRST INPUT
               ------------------------------------------------- */

            if (
                focusInput
            ) {

                const activePanel =
                    Array.from(
                        authPanels
                    ).find(
                        panel =>
                            normalizeView(
                                panel.dataset.authView
                            ) === view
                    );


                if (
                    activePanel
                ) {

                    const firstInput =
                        activePanel.querySelector(
                            "input:not([type='hidden']):not([disabled])"
                        );


                    if (
                        firstInput
                    ) {

                        window.setTimeout(
                            () => {

                                try {

                                    firstInput.focus();

                                } catch (
                                    error
                                ) {

                                    /*
                                     * Ignore focus errors.
                                     */

                                }

                            },
                            60
                        );

                    }

                }

            }


            /* -------------------------------------------------
               UPDATE URL HASH
               ------------------------------------------------- */

            const desiredHash =
                "#" + view;


            if (
                window.location.hash !==
                desiredHash
            ) {

                /*
                 * replaceState prevents every tab
                 * click from creating a browser-history
                 * entry.
                 */

                try {

                    window.history.replaceState(
                        null,
                        "",
                        desiredHash
                    );

                } catch (
                    error
                ) {

                    /*
                     * Fallback for restricted browsers.
                     */

                    try {

                        window.location.hash =
                            desiredHash;

                    } catch (
                        hashError
                    ) {

                        console.warn(
                            "STOCKFLOW: Unable to update authentication URL hash.",
                            hashError
                        );

                    }

                }

            }


            return view;

        }


        /* =====================================================
           TAB CLICK HANDLERS
           ===================================================== */

        authTabs.forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    event => {

                        /*
                         * If the element is an anchor,
                         * prevent its default navigation.
                         */

                        if (
                            tab.tagName
                                .toLowerCase() ===
                            "a"
                        ) {

                            event.preventDefault();

                        }


                        const view =
                            tab.dataset.authTab;


                        clearInactiveMessages();


                        showAuthPanel(
                            view,
                            true
                        );

                    }
                );

            }
        );


        /* =====================================================
           AUTH SWITCH LINKS / BUTTONS
           ===================================================== */

        authControls.forEach(
            control => {

                /*
                 * Do not attach a second handler
                 * to an actual auth tab.
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


                        clearInactiveMessages();


                        showAuthPanel(
                            view,
                            true
                        );

                    }
                );

            }
        );


        /* =====================================================
           PASSWORD SHOW / HIDE
           ===================================================== */

        function getPasswordInput(
            toggleButton
        ) {

            if (
                !toggleButton
            ) {

                return null;

            }


            let input =
                null;


            /* -------------------------------------------------
               METHOD 1:
               data-target
               ------------------------------------------------- */

            const targetId =
                toggleButton.dataset.target ||
                toggleButton.dataset.togglePassword;


            if (
                targetId
            ) {

                input =
                    document.getElementById(
                        targetId
                    );

            }


            /* -------------------------------------------------
               METHOD 2:
               ARIA CONTROLS
               ------------------------------------------------- */

            if (
                !input
            ) {

                const ariaControls =
                    toggleButton.getAttribute(
                        "aria-controls"
                    );


                if (
                    ariaControls
                ) {

                    input =
                        document.getElementById(
                            ariaControls
                        );

                }

            }


            /* -------------------------------------------------
               METHOD 3:
               PASSWORD FIELD WRAPPER
               ------------------------------------------------- */

            if (
                !input
            ) {

                const wrapper =
                    toggleButton.closest(
                        ".password-field, .password-wrapper, .password-wrap, .input-password"
                    );


                if (
                    wrapper
                ) {

                    input =
                        wrapper.querySelector(
                            "input[type='password'], input[type='text']"
                        );

                }

            }


            /* -------------------------------------------------
               METHOD 4:
               PARENT ELEMENT
               ------------------------------------------------- */

            if (
                !input &&
                toggleButton.parentElement
            ) {

                input =
                    toggleButton.parentElement.querySelector(
                        "input[type='password'], input[type='text']"
                    );

            }


            return input;

        }


        function updatePasswordToggleUI(
            toggleButton,
            visible
        ) {

            if (
                !toggleButton
            ) {

                return;

            }


            /*
             * Preserve icons if the HTML contains
             * a dedicated text/icon element.
             */

            const textElement =
                toggleButton.querySelector(
                    ".toggle-text, .password-toggle-text"
                );


            if (
                textElement
            ) {

                textElement.textContent =
                    visible
                        ? "Hide"
                        : "Show";

            }

            else {

                /*
                 * Only change plain-text buttons.
                 *
                 * If the button contains SVG/icon markup,
                 * don't destroy it.
                 */

                const hasElementChildren =
                    toggleButton.children.length >
                    0;


                if (
                    !hasElementChildren
                ) {

                    toggleButton.textContent =
                        visible
                            ? "Hide"
                            : "Show";

                }

            }


            toggleButton.classList.toggle(
                "active",
                visible
            );


            toggleButton.setAttribute(
                "aria-label",
                visible
                    ? "Hide password"
                    : "Show password"
            );


            toggleButton.setAttribute(
                "aria-pressed",
                String(
                    visible
                )
            );

        }


        document.addEventListener(
            "click",
            event => {

                const toggleButton =
                    event.target.closest(
                        ".password-toggle"
                    );


                if (
                    !toggleButton
                ) {

                    return;

                }


                event.preventDefault();


                const input =
                    getPasswordInput(
                        toggleButton
                    );


                if (
                    !input
                ) {

                    console.warn(
                        "STOCKFLOW: Password toggle could not find its password input."
                    );


                    return;

                }


                const currentlyHidden =
                    input.type ===
                    "password";


                if (
                    currentlyHidden
                ) {

                    input.type =
                        "text";


                    updatePasswordToggleUI(
                        toggleButton,
                        true
                    );

                }

                else {

                    input.type =
                        "password";


                    updatePasswordToggleUI(
                        toggleButton,
                        false
                    );

                }


                /*
                 * Keep the password input focused.
                 */

                try {

                    input.focus();


                    /*
                     * Place cursor at the end.
                     */

                    const length =
                        input.value.length;


                    if (
                        typeof input.setSelectionRange ===
                        "function"
                    ) {

                        input.setSelectionRange(
                            length,
                            length
                        );

                    }

                } catch (
                    error
                ) {

                    /*
                     * Ignore focus/cursor errors.
                     */

                }

            }
        );


        /* =====================================================
           KEYBOARD TAB NAVIGATION
           ===================================================== */

        authTabs.forEach(
            tab => {

                tab.addEventListener(
                    "keydown",
                    event => {

                        const key =
                            event.key;


                        if (
                            key !== "ArrowLeft" &&
                            key !== "ArrowRight" &&
                            key !== "Home" &&
                            key !== "End"
                        ) {

                            return;

                        }


                        event.preventDefault();


                        const tabArray =
                            Array.from(
                                authTabs
                            );


                        if (
                            !tabArray.length
                        ) {

                            return;

                        }


                        const currentIndex =
                            tabArray.indexOf(
                                tab
                            );


                        let nextIndex =
                            currentIndex;


                        /* -----------------------------------------
                           LEFT
                           ----------------------------------------- */

                        if (
                            key === "ArrowLeft"
                        ) {

                            nextIndex =
                                currentIndex - 1;


                            if (
                                nextIndex < 0
                            ) {

                                nextIndex =
                                    tabArray.length - 1;

                            }

                        }


                        /* -----------------------------------------
                           RIGHT
                           ----------------------------------------- */

                        else if (
                            key === "ArrowRight"
                        ) {

                            nextIndex =
                                currentIndex + 1;


                            if (
                                nextIndex >=
                                tabArray.length
                            ) {

                                nextIndex =
                                    0;

                            }

                        }


                        /* -----------------------------------------
                           HOME
                           ----------------------------------------- */

                        else if (
                            key === "Home"
                        ) {

                            nextIndex =
                                0;

                        }


                        /* -----------------------------------------
                           END
                           ----------------------------------------- */

                        else if (
                            key === "End"
                        ) {

                            nextIndex =
                                tabArray.length - 1;

                        }


                        const nextTab =
                            tabArray[
                                nextIndex
                            ];


                        if (
                            !nextTab
                        ) {

                            return;

                        }


                        nextTab.focus();


                        clearInactiveMessages();


                        showAuthPanel(
                            nextTab.dataset.authTab,
                            false
                        );

                    }
                );

            }
        );


        /* =====================================================
           ENTER / SPACE SUPPORT FOR CUSTOM TABS
           ===================================================== */

        authTabs.forEach(
            tab => {

                /*
                 * Native buttons and links already
                 * support keyboard activation.
                 *
                 * Only add manual support for elements
                 * that are not naturally interactive.
                 */

                const tagName =
                    tab.tagName.toLowerCase();


                const naturallyInteractive =
                    tagName === "button" ||
                    tagName === "a" ||
                    tagName === "input";


                if (
                    naturallyInteractive
                ) {

                    return;

                }


                tab.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key !== "Enter" &&
                            event.key !== " "
                        ) {

                            return;

                        }


                        event.preventDefault();


                        const view =
                            tab.dataset.authTab;


                        clearInactiveMessages();


                        showAuthPanel(
                            view,
                            true
                        );

                    }
                );

            }
        );


        /* =====================================================
           HASH ROUTING
           ===================================================== */

        function getHashView() {

            const hash =
                window.location.hash
                    .replace(
                        "#",
                        ""
                    )
                    .toLowerCase()
                    .trim();


            return normalizeView(
                hash
            );

        }


        /* =====================================================
           HASH CHANGE
           ===================================================== */

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


        /* =====================================================
           INITIAL AUTH UI STATE
           ===================================================== */

        resetButtonStates();


        const initialView =
            getHashView();


        showAuthPanel(
            initialView,
            false
        );


        /* =====================================================
           PUBLIC AUTH UI CONTROLLER
           ===================================================== */

        window.StockFlowAuthUI = {

            /* -----------------------------------------------
               SHOW LOGIN
               ----------------------------------------------- */

            showLogin() {

                clearInactiveMessages();


                return showAuthPanel(
                    "login",
                    true
                );

            },


            /* -----------------------------------------------
               SHOW REGISTER
               ----------------------------------------------- */

            showRegister() {

                clearInactiveMessages();


                return showAuthPanel(
                    "register",
                    true
                );

            },


            /* -----------------------------------------------
               GET CURRENT VIEW
               ----------------------------------------------- */

            getCurrentView() {

                const activePanel =
                    Array.from(
                        authPanels
                    ).find(
                        panel =>
                            !panel.classList.contains(
                                "hidden"
                            )
                    );


                if (
                    activePanel
                ) {

                    return normalizeView(
                        activePanel.dataset.authView
                    );

                }


                return "login";

            },


            /* -----------------------------------------------
               CLEAR MESSAGES
               ----------------------------------------------- */

            clearMessages() {

                clearInactiveMessages();

            },


            /* -----------------------------------------------
               RESET BUTTONS
               ----------------------------------------------- */

            resetButtons() {

                resetButtonStates();

            }

        };


    }
);
