/* ============================================================
   STOCKFLOW | SHARED UI CONTROLLER
   ============================================================
   Handles:
   - Current year
   - Logout buttons
   - Mobile sidebar/menu
   - Active navigation
   - Outside-click menu closing
   - Escape-key menu closing
   - Scroll behavior
   - Page loading state
   - Network status
   - Shared notification/toast messages
   - Keyboard accessibility
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENT HELPERS
       ========================================================= */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];


    /* =========================================================
       CURRENT YEAR
       ========================================================= */

    const currentYear = new Date().getFullYear();

    $$("[data-year]").forEach(element => {
        element.textContent = currentYear;
    });


    /* =========================================================
       MOBILE SIDEBAR / MENU
       ========================================================= */

    const side = $(".sf-side");
    const menuToggle = $("[data-menu]");

    const openMenu = () => {
        document.body.classList.add("sf-menu-open");

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "true");
        }

        if (side) {
            side.setAttribute("aria-hidden", "false");
        }
    };

    const closeMenu = () => {
        document.body.classList.remove("sf-menu-open");

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
        }

        if (side) {
            side.setAttribute("aria-hidden", "true");
        }
    };

    const toggleMenu = () => {
        if (document.body.classList.contains("sf-menu-open")) {
            closeMenu();
        } else {
            openMenu();
        }
    };


    if (menuToggle) {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Toggle navigation menu");

        menuToggle.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            toggleMenu();
        });
    }


    /* =========================================================
       SIDEBAR NAVIGATION
       ========================================================= */

    const navLinks = $$(".sf-side a");

    if (navLinks.length) {

        const currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase() || "index.html";

        navLinks.forEach(link => {

            const href =
                link.getAttribute("href") || "";

            const linkPage =
                href.split("/")
                    .pop()
                    .split("?")[0]
                    .split("#")[0]
                    .toLowerCase();

            /*
             * Do not treat external links as active.
             */
            if (
                linkPage &&
                linkPage === currentPage &&
                !href.startsWith("http")
            ) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }


            /*
             * Close mobile sidebar after navigation.
             */
            link.addEventListener("click", () => {

                if (
                    window.innerWidth <= 900 ||
                    document.body.classList.contains("sf-menu-open")
                ) {
                    closeMenu();
                }
            });

        });
    }


    /* =========================================================
       OUTSIDE CLICK
       ========================================================= */

    document.addEventListener("click", event => {

        if (!document.body.classList.contains("sf-menu-open")) {
            return;
        }

        const clickedInsideSidebar =
            side && side.contains(event.target);

        const clickedMenuButton =
            menuToggle && menuToggle.contains(event.target);

        if (!clickedInsideSidebar && !clickedMenuButton) {
            closeMenu();
        }
    });


    /* =========================================================
       ESCAPE KEY
       ========================================================= */

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeMenu();

            /*
             * Close generic notification panels.
             */
            $$(".sf-notification-panel.show").forEach(panel => {
                panel.classList.remove("show");
            });
        }

    });


    /* =========================================================
       LOGOUT
       ========================================================= */

    $$("[data-logout]").forEach(button => {

        button.addEventListener("click", async event => {

            event.preventDefault();

            /*
             * Prevent multiple logout clicks.
             */
            if (button.dataset.loggingOut === "true") {
                return;
            }

            button.dataset.loggingOut = "true";
            button.disabled = true;

            const originalHTML = button.innerHTML;

            button.innerHTML = `
                <span class="sf-btn-spinner" aria-hidden="true"></span>
                <span>Signing out...</span>
            `;

            try {

                if (
                    window.StockFlowAuth &&
                    typeof StockFlowAuth.logout === "function"
                ) {
                    await StockFlowAuth.logout();
                } else {
                    console.warn(
                        "StockFlowAuth.logout() is not available."
                    );
                }

            } catch (error) {

                console.error(
                    "Logout failed:",
                    error
                );

                button.disabled = false;
                button.dataset.loggingOut = "false";
                button.innerHTML = originalHTML;

                showToast(
                    "Unable to sign out. Please try again.",
                    "error"
                );
            }

        });

    });


    /* =========================================================
       NETWORK STATUS
       ========================================================= */

    const updateNetworkStatus = () => {

        const online = navigator.onLine;

        document.body.classList.toggle(
            "sf-offline",
            !online
        );

        document.body.classList.toggle(
            "sf-online",
            online
        );

        /*
         * Update elements using data-network-status.
         */
        $$("[data-network-status]").forEach(element => {

            element.textContent =
                online
                    ? "Online"
                    : "Offline";

            element.classList.toggle(
                "online",
                online
            );

            element.classList.toggle(
                "offline",
                !online
            );
        });

    };


    updateNetworkStatus();

    window.addEventListener(
        "online",
        () => {

            updateNetworkStatus();

            showToast(
                "Connection restored.",
                "success"
            );

        }
    );


    window.addEventListener(
        "offline",
        () => {

            updateNetworkStatus();

            showToast(
                "You are currently offline.",
                "warning"
            );

        }
    );


    /* =========================================================
       SHARED TOAST / NOTIFICATION SYSTEM
       ========================================================= */

    function createToastContainer() {

        let container =
            document.getElementById(
                "sfToastContainer"
            );

        if (container) {
            return container;
        }

        container =
            document.createElement("div");

        container.id =
            "sfToastContainer";

        container.className =
            "sf-toast-container";

        container.setAttribute(
            "aria-live",
            "polite"
        );

        container.setAttribute(
            "aria-atomic",
            "true"
        );

        document.body.appendChild(container);

        return container;
    }


    function showToast(
        message,
        type = "info",
        duration = 4000
    ) {

        if (!message) {
            return;
        }

        const container =
            createToastContainer();

        const toast =
            document.createElement("div");

        toast.className =
            `sf-toast sf-toast-${type}`;

        const icons = {
            success: "✓",
            error: "!",
            warning: "⚠",
            info: "i"
        };

        const icon =
            icons[type] || icons.info;

        toast.innerHTML = `
            <div class="sf-toast-icon">
                ${icon}
            </div>

            <div class="sf-toast-message">
                ${escapeHTML(message)}
            </div>

            <button
                type="button"
                class="sf-toast-close"
                aria-label="Close notification"
            >
                ×
            </button>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });


        const closeToast = () => {

            toast.classList.remove("show");

            setTimeout(() => {
                toast.remove();
            }, 250);
        };


        $(".sf-toast-close", toast)
            ?.addEventListener(
                "click",
                closeToast
            );


        if (duration > 0) {

            setTimeout(
                closeToast,
                duration
            );

        }

    }


    /* =========================================================
       SAFE HTML ESCAPING
       ========================================================= */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(
                /[&<>"']/g,
                character => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[character])
            );

    }


    /* =========================================================
       PAGE LOADING HELPER
       ========================================================= */

    const pageLoader =
        document.querySelector(
            "[data-page-loader]"
        );

    if (pageLoader) {

        window.addEventListener(
            "load",
            () => {

                pageLoader.classList.add(
                    "loaded"
                );

                setTimeout(() => {
                    pageLoader.remove();
                }, 300);

            }
        );

    }


    /* =========================================================
       BUTTON LOADING HELPER
       ========================================================= */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-loading-button]"
                );

            if (!button) {
                return;
            }

            if (
                button.dataset.loading === "true"
            ) {
                event.preventDefault();
                return;
            }

            button.dataset.loading =
                "true";

            button.classList.add(
                "is-loading"
            );

            button.setAttribute(
                "aria-busy",
                "true"
            );

        }
    );


    /* =========================================================
       SMOOTH SCROLL
       ========================================================= */

    $$('a[href^="#"]').forEach(link => {

        link.addEventListener(
            "click",
            event => {

                const targetID =
                    link.getAttribute("href");

                if (
                    !targetID ||
                    targetID === "#"
                ) {
                    return;
                }

                const target =
                    document.querySelector(
                        targetID
                    );

                if (!target) {
                    return;
                }

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }
        );

    });


    /* =========================================================
       TABLE RESPONSIVENESS
       ========================================================= */

    $$(".sf-table-wrap").forEach(wrapper => {

        const table =
            $("table", wrapper);

        if (!table) {
            return;
        }

        /*
         * Allow horizontal scrolling on smaller screens.
         */
        wrapper.setAttribute(
            "tabindex",
            "0"
        );

        wrapper.setAttribute(
            "role",
            "region"
        );

        wrapper.setAttribute(
            "aria-label",
            "Scrollable data table"
        );

    });


    /* =========================================================
       DISABLE TRANSITIONS DURING RESIZE
       ========================================================= */

    let resizeTimer;

    window.addEventListener(
        "resize",
        () => {

            document.body.classList.add(
                "sf-resizing"
            );

            clearTimeout(resizeTimer);

            resizeTimer =
                setTimeout(() => {

                    document.body.classList.remove(
                        "sf-resizing"
                    );

                }, 150);

        }
    );


    /* =========================================================
       INITIALIZE SIDEBAR STATE
       ========================================================= */

    if (side) {

        if (window.innerWidth > 900) {
            side.setAttribute(
                "aria-hidden",
                "false"
            );
        } else {
            side.setAttribute(
                "aria-hidden",
                "true"
            );
        }

    }


    /* =========================================================
       RESPONSIVE SIDEBAR STATE
       ========================================================= */

    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 900) {
                closeMenu();

                if (side) {
                    side.setAttribute(
                        "aria-hidden",
                        "false"
                    );
                }

            } else if (
                !document.body.classList.contains(
                    "sf-menu-open"
                )
            ) {

                if (side) {
                    side.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }

            }

        }
    );


    /* =========================================================
       PUBLIC STOCKFLOW UI API
       ========================================================= */

    window.StockFlowUI = {

        openMenu,
        closeMenu,
        toggleMenu,

        showToast,

        updateNetworkStatus,

        escapeHTML

    };


    /* =========================================================
       READY STATE
       ========================================================= */

    document.body.classList.add(
        "sf-ui-ready"
    );

});
