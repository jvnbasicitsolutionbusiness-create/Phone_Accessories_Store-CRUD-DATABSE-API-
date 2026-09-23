/* =========================================================
   STOCKFLOW — PRODUCTS UI
   Sidebar / Notification / User UI
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       SIDEBAR
    ===================================================== */

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");


    function openSidebar() {

        if (!sidebar) return;

        sidebar.classList.add("open");

        if (overlay) {
            overlay.classList.add("show");
        }

        if (mobileMenuBtn) {
            mobileMenuBtn.setAttribute(
                "aria-expanded",
                "true"
            );
        }

    }


    function closeSidebar() {

        if (!sidebar) return;

        sidebar.classList.remove("open");

        if (overlay) {
            overlay.classList.remove("show");
        }

        if (mobileMenuBtn) {
            mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }

    }


    if (mobileMenuBtn) {

        mobileMenuBtn.addEventListener(
            "click",
            () => {

                if (
                    sidebar &&
                    sidebar.classList.contains("open")
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


    document
        .querySelectorAll(".sidebar-link")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <= 850
                    ) {
                        closeSidebar();
                    }

                }
            );

        });


    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 850) {
                closeSidebar();
            }

        }
    );


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const notificationDot =
        document.getElementById("notificationDot");


    function closeNotifications() {

        if (!notificationPanel) return;

        notificationPanel.hidden = true;

        if (notificationBtn) {
            notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }

    }


    function toggleNotifications() {

        if (!notificationPanel) return;

        const willOpen =
            notificationPanel.hidden;

        notificationPanel.hidden = !willOpen;

        if (notificationBtn) {
            notificationBtn.setAttribute(
                "aria-expanded",
                String(willOpen)
            );
        }

        if (
            willOpen &&
            notificationDot
        ) {
            notificationDot.classList.add("hidden");
        }

    }


    if (notificationBtn) {

        notificationBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleNotifications();

            }
        );

    }


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


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }

            closeNotifications();
            closeSidebar();

        }
    );


    /* =====================================================
       LOGOUT
       Uses STOCKFLOW auth.js when available
    ===================================================== */

    const logoutBtn =
        document.getElementById("logoutBtn");


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.logout === "function"
                    ) {

                        await window.StockFlowAuth.logout();

                        return;
                    }


                    if (
                        window.Auth &&
                        typeof window.Auth.logout === "function"
                    ) {

                        await window.Auth.logout();

                        return;
                    }


                    sessionStorage.clear();

                    window.location.href =
                        "./auth.html";

                } catch (error) {

                    console.error(
                        "Logout failed:",
                        error
                    );

                }

            }
        );

    }


})();
