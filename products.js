/* =========================================================
   STOCKFLOW — PRODUCTS UI CONTROLLER
   Sidebar / Notifications / User UI / Product Modal
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener("DOMContentLoaded", () => {

        initSidebar();
        initNotifications();
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


        if (mobileMenuBtn) {

            mobileMenuBtn.addEventListener(
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

        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        /*
         * IMPORTANT:
         * Your new HTML uses .nav-item,
         * not .sidebar-link.
         */

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


        if (!notificationBtn) {
            return;
        }


        function closeNotifications() {

            if (!notificationPanel) {
                return;
            }

            notificationPanel.hidden = true;

            notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        function toggleNotifications() {

            if (!notificationPanel) {
                return;
            }

            const willOpen =
                notificationPanel.hidden;

            notificationPanel.hidden =
                !willOpen;

            notificationBtn.setAttribute(
                "aria-expanded",
                String(willOpen)
            );


            if (
                willOpen &&
                notificationDot
            ) {

                notificationDot.classList.add(
                    "hidden"
                );

            }

        }


        notificationBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleNotifications();

            }
        );


        if (notificationPanel) {

            notificationPanel.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                }
            );

        }


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
           OPEN MODAL
        ------------------------------------------------- */

        function openProductModal() {

            productModal.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "modal-open"
            );


            /*
             * Only reset when creating a new product.
             * products.js can still handle editing separately.
             */

            resetProductForm();


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


            /*
             * Focus first field
             */

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
           CLOSE MODAL
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
           RESET FORM
        ------------------------------------------------- */

        function resetProductForm() {

            if (!productForm) {
                return;
            }


            productForm.reset();


            /*
             * Restore default values
             */

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


            /*
             * Remove previous validation states
             */

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

                message.textContent = "";

                message.className =
                    "form-message";

            }

        }


        /* -------------------------------------------------
           ADD PRODUCT BUTTON
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
           EMPTY STATE ADD BUTTON
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
           CLICK BACKDROP TO CLOSE
        ------------------------------------------------- */

        const backdrop =
            productModal.querySelector(
                ".modal-backdrop"
            );

        if (backdrop) {

            backdrop.addEventListener(
                "click",
                () => {

                    closeProductModalWindow();

                }
            );

        }


        /*
         * IMPORTANT:
         *
         * We DO NOT add another submit handler here.
         *
         * Your products.js should handle:
         *
         * productForm.addEventListener("submit", ...)
         *
         * and send the product to your API/database.
         *
         * This prevents duplicate database inserts.
         */

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function initLogout() {

        /*
         * Your NEW HTML uses:
         * #logoutButton
         */

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


                const originalHTML =
                    logoutBtn.innerHTML;


                try {

                    logoutBtn.disabled = true;

                    logoutBtn.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Logging out...</span>
                    `;


                    /*
                     * STOCKFLOW AUTH
                     */

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


                    /*
                     * FALLBACK AUTH
                     */

                    if (
                        window.Auth &&
                        typeof window.Auth.logout ===
                            "function"
                    ) {

                        await window.Auth.logout();

                        return;

                    }


                    /*
                     * FALLBACK SESSION CLEAR
                     */

                    sessionStorage.clear();
                    localStorage.removeItem(
                        "stockflow_user"
                    );


                    window.location.href =
                        "./auth.html";


                } catch (error) {

                    console.error(
                        "Logout failed:",
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
                    event.key !==
                    "Escape"
                ) {

                    return;

                }


                /*
                 * Close product modal
                 */

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


                /*
                 * Close delete modal
                 */

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


                /*
                 * Close view modal
                 */

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


                /*
                 * Close notification
                 */

                const notificationPanel =
                    document.getElementById(
                        "notificationPanel"
                    );

                if (notificationPanel) {

                    notificationPanel.hidden =
                        true;

                }


                /*
                 * Close sidebar
                 */

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

            }
        );

    }


})();
