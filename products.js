/* =========================================================
   STOCKFLOW — PRODUCTS UI CONTROLLER
   Sidebar / Notifications / User Profile / Product Modal
   Logout / Keyboard Controls
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener("DOMContentLoaded", () => {

        initSidebar();
        initNotifications();
        initProfileNavigation();
        initProductModal();
        initLogout();
        initEscapeKey();

    });


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function initSidebar() {

        const sidebar =
            document.getElementById("sidebar");

        const overlay =
            document.getElementById("sidebarOverlay");

        const mobileMenuBtn =
            document.getElementById("mobileMenuBtn");


        if (!sidebar) {
            return;
        }


        function openSidebar() {

            sidebar.classList.add("open");

            if (overlay) {

                overlay.classList.add("show");
                overlay.classList.add("active");

            }

            if (mobileMenuBtn) {

                mobileMenuBtn.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

            document.body.classList.add(
                "sidebar-open"
            );

        }


        function closeSidebar() {

            sidebar.classList.remove("open");

            if (overlay) {

                overlay.classList.remove("show");
                overlay.classList.remove("active");

            }

            if (mobileMenuBtn) {

                mobileMenuBtn.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

            document.body.classList.remove(
                "sidebar-open"
            );

        }


        /* -------------------------------------------------
           MOBILE MENU
        ------------------------------------------------- */

        if (mobileMenuBtn) {

            mobileMenuBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        sidebar.classList.contains("open")
                    ) {

                        closeSidebar();

                    } else {

                        openSidebar();

                    }

                }
            );

        }


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
           SIDEBAR NAVIGATION
        ------------------------------------------------- */

        document
            .querySelectorAll(".nav-item")
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
           RESIZE
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

    }


    /* =====================================================
       USER PROFILE NAVIGATION
    ===================================================== */

    function initProfileNavigation() {

        /*
         * Any element with:
         *
         * data-profile-link
         *
         * will open the user's Profile page.
         *
         * Example:
         *
         * <div
         *     class="topbar-user"
         *     data-profile-link="./profile.html"
         * >
         *
         * This keeps the profile navigation independent
         * from authentication logic.
         */


        const profileElements =
            document.querySelectorAll(
                "[data-profile-link]"
            );


        profileElements.forEach(element => {

            const profileUrl =
                element.getAttribute(
                    "data-profile-link"
                ) || "./profile.html";


            /* ---------------------------------------------
               ACCESSIBILITY
            --------------------------------------------- */

            element.setAttribute(
                "role",
                "link"
            );

            element.setAttribute(
                "tabindex",
                "0"
            );

            element.setAttribute(
                "aria-label",
                "Open your profile"
            );


            /* ---------------------------------------------
               CLICK
            --------------------------------------------- */

            element.addEventListener(
                "click",
                event => {

                    /*
                     * Do not allow clicks from an actual
                     * button/link inside the profile block
                     * to trigger profile navigation.
                     */

                    if (
                        event.target.closest(
                            "button, a"
                        )
                    ) {

                        return;

                    }


                    event.preventDefault();

                    window.location.href =
                        profileUrl;

                }
            );


            /* ---------------------------------------------
               KEYBOARD
            --------------------------------------------- */

            element.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        /*
                         * Ignore if the actual focused
                         * element is a button/link.
                         */

                        if (
                            event.target.closest(
                                "button, a"
                            )
                        ) {

                            return;

                        }


                        event.preventDefault();

                        window.location.href =
                            profileUrl;

                    }

                }
            );

        });


        /*
         * BACKWARD-COMPATIBILITY FALLBACK
         *
         * If the HTML does not yet have
         * data-profile-link, detect the common
         * StockFlow user containers automatically.
         */

        if (
            profileElements.length === 0
        ) {

            const possibleUserElements =
                document.querySelectorAll(
                    [
                        ".topbar-user",
                        ".topbar-profile",
                        ".user-profile",
                        ".user-account",
                        ".profile-trigger",
                        ".sidebar-user",
                        ".sf-user-mini"
                    ].join(",")
                );


            possibleUserElements.forEach(
                element => {

                    /*
                     * Do not convert a container into
                     * a profile button if it contains
                     * the logout button.
                     */

                    if (
                        element.querySelector(
                            "#logoutButton, [data-logout]"
                        )
                    ) {

                        return;

                    }


                    element.style.cursor =
                        "pointer";


                    element.setAttribute(
                        "role",
                        "link"
                    );

                    element.setAttribute(
                        "tabindex",
                        "0"
                    );

                    element.setAttribute(
                        "aria-label",
                        "Open your profile"
                    );


                    element.addEventListener(
                        "click",
                        event => {

                            if (
                                event.target.closest(
                                    "button, a"
                                )
                            ) {

                                return;

                            }

                            event.preventDefault();

                            window.location.href =
                                "./profile.html";

                        }
                    );


                    element.addEventListener(
                        "keydown",
                        event => {

                            if (
                                event.key === "Enter" ||
                                event.key === " "
                            ) {

                                if (
                                    event.target.closest(
                                        "button, a"
                                    )
                                ) {

                                    return;

                                }

                                event.preventDefault();

                                window.location.href =
                                    "./profile.html";

                            }

                        }
                    );

                }
            );

        }

    }


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function initNotifications() {

        const notificationBtn =
            document.getElementById(
                "notificationButton"
            );

        const notificationPanel =
            document.getElementById(
                "notificationPanel"
            );

        const notificationDot =
            document.querySelector(
                ".notification-dot"
            );


        if (
            !notificationBtn ||
            !notificationPanel
        ) {

            return;

        }


        function closeNotifications() {

            notificationPanel.hidden =
                true;

            notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        function openNotifications() {

            notificationPanel.hidden =
                false;

            notificationBtn.setAttribute(
                "aria-expanded",
                "true"
            );


            if (notificationDot) {

                notificationDot.classList.add(
                    "hidden"
                );

            }

        }


        function toggleNotifications() {

            if (
                notificationPanel.hidden
            ) {

                openNotifications();

            } else {

                closeNotifications();

            }

        }


        notificationBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();

                toggleNotifications();

            }
        );


        notificationPanel.addEventListener(
            "click",
            event => {

                event.stopPropagation();

            }
        );


        document.addEventListener(
            "click",
            () => {

                closeNotifications();

            }
        );

    }


    /* =====================================================
       PRODUCT MODAL
    ===================================================== */

    function initProductModal() {

        const addProductBtn =
            document.getElementById(
                "addProductBtn"
            );

        const emptyAddProductBtn =
            document.getElementById(
                "emptyAddProductBtn"
            );

        const productModal =
            document.getElementById(
                "productModal"
            );

        const closeProductModal =
            document.getElementById(
                "closeProductModal"
            );

        const cancelProductBtn =
            document.getElementById(
                "cancelProductBtn"
            );

        const productForm =
            document.getElementById(
                "productForm"
            );


        if (!productModal) {
            return;
        }


        /* -------------------------------------------------
           RESET FORM
        ------------------------------------------------- */

        function resetProductForm() {

            if (!productForm) {
                return;
            }


            productForm.reset();


            const status =
                document.getElementById(
                    "productStatus"
                );

            if (status) {

                status.value =
                    "active";

            }


            const unit =
                document.getElementById(
                    "productUnit"
                );

            if (unit) {

                unit.value =
                    "piece";

            }


            productForm
                .querySelectorAll(
                    ".invalid, .is-invalid"
                )
                .forEach(element => {

                    element.classList.remove(
                        "invalid",
                        "is-invalid"
                    );

                });


            const message =
                document.getElementById(
                    "productFormMessage"
                );

            if (message) {

                message.textContent =
                    "";

                message.className =
                    "form-message";

            }

        }


        /* -------------------------------------------------
           OPEN PRODUCT MODAL
        ------------------------------------------------- */

        function openProductModal() {

            resetProductForm();


            productModal.setAttribute(
                "aria-hidden",
                "false"
            );


            document.body.classList.add(
                "modal-open"
            );


            const title =
                document.getElementById(
                    "productModalTitle"
                );

            if (title) {

                title.textContent =
                    "Add Product";

            }


            const saveButton =
                document.getElementById(
                    "saveProductBtn"
                );

            if (saveButton) {

                saveButton.innerHTML = `
                    <i class="fa-solid fa-check"></i>
                    <span>Save Product</span>
                `;

            }


            setTimeout(() => {

                const firstInput =
                    document.getElementById(
                        "productName"
                    );

                if (firstInput) {

                    firstInput.focus();

                }

            }, 100);

        }


        /* -------------------------------------------------
           CLOSE PRODUCT MODAL
        ------------------------------------------------- */

        function closeProductModalWindow() {

            productModal.setAttribute(
                "aria-hidden",
                "true"
            );


            document.body.classList.remove(
                "modal-open"
            );

        }


        /* -------------------------------------------------
           ADD PRODUCT
        ------------------------------------------------- */

        if (addProductBtn) {

            addProductBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openProductModal();

                }
            );

        }


        /* -------------------------------------------------
           EMPTY STATE ADD PRODUCT
        ------------------------------------------------- */

        if (emptyAddProductBtn) {

            emptyAddProductBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openProductModal();

                }
            );

        }


        /* -------------------------------------------------
           CLOSE BUTTON
        ------------------------------------------------- */

        if (closeProductModal) {

            closeProductModal.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeProductModalWindow();

                }
            );

        }


        /* -------------------------------------------------
           CANCEL BUTTON
        ------------------------------------------------- */

        if (cancelProductBtn) {

            cancelProductBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeProductModalWindow();

                }
            );

        }


        /* -------------------------------------------------
           BACKDROP
        ------------------------------------------------- */

        const backdrop =
            productModal.querySelector(
                ".modal-backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeProductModalWindow
            );

        }


        /*
         * IMPORTANT:
         *
         * There is intentionally NO submit listener here.
         *
         * products.js owns product creation/editing
         * and database/API operations.
         */

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function initLogout() {

        const logoutBtn =
            document.getElementById(
                "logoutButton"
            );


        if (!logoutBtn) {
            return;
        }


        logoutBtn.addEventListener(
            "click",
            async event => {

                event.preventDefault();
                event.stopPropagation();


                const originalHTML =
                    logoutBtn.innerHTML;


                try {

                    logoutBtn.disabled =
                        true;


                    logoutBtn.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Logging out...</span>
                    `;


                    /* -----------------------------------------
                       PRIMARY STOCKFLOW AUTH
                    ----------------------------------------- */

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


                    /* -----------------------------------------
                       STOCKFLOW API FALLBACK
                    ----------------------------------------- */

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


                    /* -----------------------------------------
                       GENERIC AUTH FALLBACK
                    ----------------------------------------- */

                    if (
                        window.Auth &&
                        typeof
                        window.Auth.logout ===
                            "function"
                    ) {

                        await window.Auth.logout();

                        return;

                    }


                    /* -----------------------------------------
                       MANUAL SESSION CLEAR
                    ----------------------------------------- */

                    sessionStorage.clear();

                    localStorage.removeItem(
                        "stockflow_user"
                    );

                    localStorage.removeItem(
                        "STOCKFLOW_USER"
                    );


                    window.location.href =
                        "./auth.html";

                } catch (error) {

                    console.error(
                        "StockFlow logout failed:",
                        error
                    );


                    logoutBtn.disabled =
                        false;

                    logoutBtn.innerHTML =
                        originalHTML;


                    alert(
                        "Unable to logout. Please try again."
                    );

                }

            }
        );

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    function initEscapeKey() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Escape"
                ) {

                    return;

                }


                /* -----------------------------------------
                   PRODUCT MODAL
                ----------------------------------------- */

                const productModal =
                    document.getElementById(
                        "productModal"
                    );


                if (
                    productModal &&
                    productModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {

                    productModal.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    document.body.classList.remove(
                        "modal-open"
                    );

                    return;

                }


                /* -----------------------------------------
                   DELETE MODAL
                ----------------------------------------- */

                const deleteModal =
                    document.getElementById(
                        "deleteProductModal"
                    );


                if (
                    deleteModal &&
                    deleteModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {

                    deleteModal.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    return;

                }


                /* -----------------------------------------
                   VIEW MODAL
                ----------------------------------------- */

                const viewModal =
                    document.getElementById(
                        "viewProductModal"
                    );


                if (
                    viewModal &&
                    viewModal.getAttribute(
                        "aria-hidden"
                    ) === "false"
                ) {

                    viewModal.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    return;

                }


                /* -----------------------------------------
                   NOTIFICATIONS
                ----------------------------------------- */

                const notificationPanel =
                    document.getElementById(
                        "notificationPanel"
                    );


                const notificationButton =
                    document.getElementById(
                        "notificationButton"
                    );


                if (notificationPanel) {

                    notificationPanel.hidden =
                        true;

                }


                if (notificationButton) {

                    notificationButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }


                /* -----------------------------------------
                   SIDEBAR
                ----------------------------------------- */

                const sidebar =
                    document.getElementById(
                        "sidebar"
                    );

                const overlay =
                    document.getElementById(
                        "sidebarOverlay"
                    );


                if (sidebar) {

                    sidebar.classList.remove(
                        "open"
                    );

                }


                if (overlay) {

                    overlay.classList.remove(
                        "show",
                        "active"
                    );

                }


                document.body.classList.remove(
                    "sidebar-open"
                );

            }
        );

    }


})();
