/* =========================================================
   STOCKFLOW — STOCK IN UI CONTROLLER

   Handles:
   - Mobile sidebar
   - Navigation
   - Notifications
   - User display
   - Logout
   - API connection status
   - Default stock-in date
   - Live stock-in preview

   NOTE:
   This file handles UI only.
   Actual Stock In database/API submission
   should remain inside stock-in.js.
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       HELPER
    ===================================================== */

    const $ = (id) => {
        return document.getElementById(id);
    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");

        const menuButton =
            $("mobileMenuBtn");


        if (
            !sidebar ||
            !menuButton
        ) {
            return;
        }


        /* -------------------------------------------------
           OPEN SIDEBAR
        ------------------------------------------------- */

        const openSidebar = () => {

            sidebar.classList.add("open");

            if (overlay) {

                overlay.classList.add("show");
                overlay.classList.add("active");

            }


            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );


            document.body.classList.add(
                "sidebar-open"
            );

        };


        /* -------------------------------------------------
           CLOSE SIDEBAR
        ------------------------------------------------- */

        const closeSidebar = () => {

            sidebar.classList.remove(
                "open"
            );


            if (overlay) {

                overlay.classList.remove(
                    "show"
                );

                overlay.classList.remove(
                    "active"
                );

            }


            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );


            document.body.classList.remove(
                "sidebar-open"
            );

        };


        /* -------------------------------------------------
           MENU BUTTON
        ------------------------------------------------- */

        menuButton.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

                    closeSidebar();

                } else {

                    openSidebar();

                }

            }
        );


        /* -------------------------------------------------
           OVERLAY
        ------------------------------------------------- */

        if (overlay) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        /* -------------------------------------------------
           NAVIGATION LINKS
        -------------------------------------------------

        New StockFlow HTML uses .nav-item.
        ------------------------------------------------- */

        sidebar
            .querySelectorAll(
                ".nav-item, a"
            )
            .forEach(link => {

                link.addEventListener(
                    "click",
                    () => {

                        if (
                            window.innerWidth <= 900
                        ) {

                            closeSidebar();

                        }

                    }
                );

            });


        /* -------------------------------------------------
           WINDOW RESIZE
        ------------------------------------------------- */

        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 900
                ) {

                    closeSidebar();

                }

            }
        );

    };


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    const setupNotifications = () => {

        /*
         * New HTML:
         * notificationButton
         *
         * Old HTML:
         * notificationBtn
         */

        const button =
            $("notificationButton") ||
            $("notificationBtn");


        const panel =
            $("notificationPanel");


        /*
         * New HTML:
         * closeNotification
         *
         * Old HTML:
         * closeNotificationBtn
         */

        const closeButton =
            $("closeNotification") ||
            $("closeNotificationBtn");


        if (
            !button ||
            !panel
        ) {
            return;
        }


        /* -------------------------------------------------
           CLOSE
        ------------------------------------------------- */

        const closePanel = () => {

            panel.hidden = true;

            button.setAttribute(
                "aria-expanded",
                "false"
            );

        };


        /* -------------------------------------------------
           TOGGLE
        ------------------------------------------------- */

        const togglePanel = () => {

            const willOpen =
                panel.hidden;


            panel.hidden =
                !willOpen;


            button.setAttribute(
                "aria-expanded",
                String(willOpen)
            );

        };


        /* -------------------------------------------------
           BUTTON
        ------------------------------------------------- */

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                togglePanel();

            }
        );


        /* -------------------------------------------------
           CLOSE BUTTON
        ------------------------------------------------- */

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closePanel();

                }
            );

        }


        /* -------------------------------------------------
           PREVENT PANEL CLICK FROM CLOSING
        ------------------------------------------------- */

        panel.addEventListener(
            "click",
            event => {

                event.stopPropagation();

            }
        );


        /* -------------------------------------------------
           CLICK OUTSIDE
        ------------------------------------------------- */

        document.addEventListener(
            "click",
            event => {

                if (
                    !panel.contains(
                        event.target
                    ) &&
                    !button.contains(
                        event.target
                    )
                ) {

                    closePanel();

                }

            }
        );

    };


    /* =====================================================
       USER DISPLAY
    ===================================================== */

    const setupUserDisplay = () => {

        let user = null;


        /* -------------------------------------------------
           GET USER FROM STOCKFLOW AUTH
        ------------------------------------------------- */

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
                "Unable to read StockFlow user:",
                error
            );

        }


        /*
         * If no authenticated user is available,
         * keep the default HTML values.
         */

        if (!user) {
            return;
        }


        /* -------------------------------------------------
           USER NAME
        ------------------------------------------------- */

        const name =
            user.name ||
            user.fullName ||
            user.full_name ||
            user.username ||
            user.USERNAME ||
            user.NAME ||
            user.email ||
            user.EMAIL ||
            "StockFlow User";


        /* -------------------------------------------------
           USER ROLE
        ------------------------------------------------- */

        const role =
            user.role ||
            user.ROLE ||
            user.position ||
            user.POSITION ||
            "Employee";


        /* -------------------------------------------------
           INITIALS
        ------------------------------------------------- */

        const initials =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(
                    part =>
                        part
                            .charAt(0)
                            .toUpperCase()
                )
                .join("") ||
            "SF";


        /* -------------------------------------------------
           SIDEBAR NAME
        ------------------------------------------------- */

        const sidebarName =
            $("sidebarUserName");

        if (sidebarName) {

            sidebarName.textContent =
                name;

        }


        /* -------------------------------------------------
           SIDEBAR ROLE
        ------------------------------------------------- */

        const sidebarRole =
            $("sidebarUserRole");

        if (sidebarRole) {

            sidebarRole.textContent =
                role;

        }


        /* -------------------------------------------------
           SIDEBAR AVATAR
        -------------------------------------------------

        New HTML:
        .sidebar-user-avatar

        We support both ID and class.
        ------------------------------------------------- */

        const sidebarAvatar =
            $("sidebarAvatar") ||
            document.querySelector(
                ".sidebar-user-avatar"
            );


        if (sidebarAvatar) {

            sidebarAvatar.textContent =
                initials;

        }


        /* -------------------------------------------------
           TOPBAR NAME
        ------------------------------------------------- */

        const topbarName =
            $("topbarUserName");

        if (topbarName) {

            topbarName.textContent =
                name;

        }


        /* -------------------------------------------------
           TOPBAR ROLE
        ------------------------------------------------- */

        const topbarRole =
            $("topbarUserRole");

        if (topbarRole) {

            topbarRole.textContent =
                role;

        }


        /* -------------------------------------------------
           TOPBAR AVATAR
        ------------------------------------------------- */

        const topbarAvatar =
            $("topbarAvatar") ||
            document.querySelector(
                ".topbar .user-avatar"
            );


        if (topbarAvatar) {

            topbarAvatar.textContent =
                initials;

        }

    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const setupLogout = () => {

        /*
         * New HTML:
         * logoutButton
         *
         * Old HTML:
         * logoutBtn
         */

        const button =
            $("logoutButton") ||
            $("logoutBtn");


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                const originalHTML =
                    button.innerHTML;


                button.disabled = true;


                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Logging out...</span>
                `;


                try {

                    /* -------------------------------------
                       STOCKFLOW AUTH
                    ------------------------------------- */

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


                    /* -------------------------------------
                       FALLBACK AUTH
                    ------------------------------------- */

                    if (
                        window.Auth &&
                        typeof
                        window.Auth.logout ===
                            "function"
                    ) {

                        await
                            window.Auth.logout();

                        return;

                    }


                    /* -------------------------------------
                       FALLBACK SESSION CLEAR
                    ------------------------------------- */

                    try {

                        sessionStorage.clear();

                    } catch (error) {

                        console.warn(
                            "Session clear failed:",
                            error
                        );

                    }


                    window.location.href =
                        "./auth.html";

                } catch (error) {

                    console.error(
                        "Logout failed:",
                        error
                    );


                    button.disabled =
                        false;


                    button.innerHTML =
                        originalHTML;


                    alert(
                        "Unable to logout. Please try again."
                    );

                }

            }
        );

    };


    /* =====================================================
       API CONNECTION STATUS
    ===================================================== */

    const setupConnection = () => {

        const badge =
            $("connectionBadge");


        if (!badge) {
            return;
        }


        /*
         * If StockFlowAPI.health() exists,
         * test the backend.
         */

        if (
            window.StockFlowAPI &&
            typeof
            window.StockFlowAPI.health ===
                "function"
        ) {

            window.StockFlowAPI
                .health()

                .then(() => {

                    badge.classList.remove(
                        "offline"
                    );


                    badge.classList.add(
                        "online"
                    );


                    /*
                     * Try several possible
                     * text elements.
                     */

                    const text =
                        badge.querySelector(
                            "span:last-child"
                        );


                    if (text) {

                        text.textContent =
                            "System Connected";

                    }

                })

                .catch(error => {

                    console.warn(
                        "StockFlow API is offline:",
                        error
                    );


                    badge.classList.add(
                        "offline"
                    );


                    badge.classList.remove(
                        "online"
                    );


                    const text =
                        badge.querySelector(
                            "span:last-child"
                        );


                    if (text) {

                        text.textContent =
                            "System Offline";

                    }

                });

        }

    };


    /* =====================================================
       DEFAULT STOCK-IN DATE
    ===================================================== */

    const setupDefaultDate = () => {

        const dateInput =
            $("stockInDate");


        if (
            !dateInput ||
            dateInput.value
        ) {

            return;

        }


        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            );


        dateInput.value =
            `${year}-${month}-${day}`;


        /*
         * Trigger change so the preview
         * updates immediately.
         */

        dateInput.dispatchEvent(
            new Event(
                "change",
                {
                    bubbles: true
                }
            )
        );

    };


    /* =====================================================
       LIVE STOCK-IN PREVIEW
    ===================================================== */

    const setupPreview = () => {

        const product =
            $("productSelect");


        const supplier =
            $("supplierSelect");


        const quantity =
            $("quantity");


        const unitCost =
            $("unitCost");


        const reference =
            $("referenceNumber");


        const date =
            $("stockInDate");


        /*
         * If none of the preview inputs exist,
         * there is nothing to initialize.
         */

        if (
            !product &&
            !supplier &&
            !quantity &&
            !unitCost &&
            !reference &&
            !date
        ) {

            return;

        }


        /* -------------------------------------------------
           FORMAT CURRENCY
        ------------------------------------------------- */

        const formatCurrency =
            (value) => {

                const number =
                    Number(value || 0);


                return `₱${number.toLocaleString(
                    "en-PH",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )}`;

            };


        /* -------------------------------------------------
           UPDATE PREVIEW
        ------------------------------------------------- */

        const update = () => {

            /* ---------------------------------------------
               PRODUCT
            --------------------------------------------- */

            const previewProduct =
                $("previewProduct");


            if (previewProduct) {

                const selectedOption =
                    product?.selectedOptions?.[0];


                const productText =
                    selectedOption?.text ||
                    "No product selected";


                previewProduct.textContent =
                    product?.value
                        ? productText
                        : "No product selected";

            }


            /* ---------------------------------------------
               SUPPLIER
            --------------------------------------------- */

            const previewSupplier =
                $("previewSupplier");


            if (previewSupplier) {

                const selectedOption =
                    supplier?.selectedOptions?.[0];


                const supplierText =
                    selectedOption?.text ||
                    "No supplier selected";


                previewSupplier.textContent =
                    supplier?.value
                        ? supplierText
                        : "No supplier selected";

            }


            /* ---------------------------------------------
               QUANTITY
            --------------------------------------------- */

            const qty =
                Number(
                    quantity?.value || 0
                );


            const previewQuantity =
                $("previewQuantity");


            if (previewQuantity) {

                previewQuantity.textContent =
                    qty.toLocaleString(
                        "en-PH"
                    );

            }


            /* ---------------------------------------------
               UNIT COST
            --------------------------------------------- */

            const cost =
                Number(
                    unitCost?.value || 0
                );


            const previewUnitCost =
                $("previewUnitCost");


            if (previewUnitCost) {

                previewUnitCost.textContent =
                    formatCurrency(
                        cost
                    );

            }


            /* ---------------------------------------------
               TOTAL
            --------------------------------------------- */

            const total =
                qty * cost;


            const previewTotal =
                $("previewTotal");


            if (previewTotal) {

                previewTotal.textContent =
                    formatCurrency(
                        total
                    );

            }


            /* ---------------------------------------------
               REFERENCE
            --------------------------------------------- */

            const previewReference =
                $("previewReference");


            if (previewReference) {

                const referenceValue =
                    reference?.value
                        ?.trim() ||
                    "—";


                previewReference.textContent =
                    referenceValue;

            }


            /* ---------------------------------------------
               DATE
            --------------------------------------------- */

            const previewDate =
                $("previewDate");


            if (previewDate) {

                if (
                    date?.value
                ) {

                    const parsed =
                        new Date(
                            `${date.value}T00:00:00`
                        );


                    if (
                        !Number.isNaN(
                            parsed.getTime()
                        )
                    ) {

                        previewDate.textContent =
                            parsed.toLocaleDateString(
                                "en-PH",
                                {
                                    month: "short",
                                    day: "2-digit",
                                    year: "numeric"
                                }
                            );

                    } else {

                        previewDate.textContent =
                            "—";

                    }

                } else {

                    previewDate.textContent =
                        "—";

                }

            }

        };


        /* -------------------------------------------------
           LISTEN FOR INPUT CHANGES
        ------------------------------------------------- */

        [
            product,
            supplier,
            quantity,
            unitCost,
            reference,
            date

        ]
            .filter(Boolean)
            .forEach(
                element => {

                    element.addEventListener(
                        "input",
                        update
                    );


                    element.addEventListener(
                        "change",
                        update
                    );

                }
            );


        /*
         * Initial preview
         */

        update();

    };


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setupSidebar();

            setupNotifications();

            setupUserDisplay();

            setupLogout();

            setupConnection();

            setupDefaultDate();

            setupPreview();

        }
    );


})();
