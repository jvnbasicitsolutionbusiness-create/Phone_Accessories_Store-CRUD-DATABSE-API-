/* =========================================================
   STOCKFLOW — CATEGORIES UI
   Sidebar + notifications + user display + logout
========================================================= */

(() => {

    "use strict";


    const $ = (id) => {
        return document.getElementById(id);
    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const sidebar = $("sidebar");
        const overlay = $("sidebarOverlay");
        const menuButton = $("mobileMenuBtn");

        if (!sidebar || !overlay || !menuButton) {
            return;
        }


        const closeSidebar = () => {

            sidebar.classList.remove("open");
            overlay.classList.remove("show");

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            document.body.style.overflow = "";
        };


        const openSidebar = () => {

            sidebar.classList.add("open");
            overlay.classList.add("show");

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );

            document.body.style.overflow = "hidden";
        };


        menuButton.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains("open")
                ) {
                    closeSidebar();
                } else {
                    openSidebar();
                }

            }
        );


        overlay.addEventListener(
            "click",
            closeSidebar
        );


        sidebar
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );

            });


        window.addEventListener(
            "resize",
            () => {

                if (window.innerWidth > 1100) {
                    closeSidebar();
                }

            }
        );

    };


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    const setupNotifications = () => {

        const button = $("notificationBtn");
        const panel = $("notificationPanel");
        const closeButton = $("closeNotificationBtn");

        if (!button || !panel) {
            return;
        }


        const closePanel = () => {

            panel.hidden = true;

            button.setAttribute(
                "aria-expanded",
                "false"
            );

        };


        const togglePanel = (event) => {

            event.stopPropagation();

            panel.hidden = !panel.hidden;

            button.setAttribute(
                "aria-expanded",
                String(!panel.hidden)
            );

        };


        button.addEventListener(
            "click",
            togglePanel
        );


        closeButton?.addEventListener(
            "click",
            closePanel
        );


        document.addEventListener(
            "click",
            (event) => {

                if (
                    !panel.contains(event.target) &&
                    !button.contains(event.target)
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


        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.getUser === "function"
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


        if (!user) {
            return;
        }


        const name =
            user.name ||
            user.fullName ||
            user.full_name ||
            user.NAME ||
            user.email ||
            user.EMAIL ||
            "StockFlow User";


        const role =
            user.role ||
            user.ROLE ||
            user.position ||
            user.POSITION ||
            "Employee";


        const initials =
            name
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
            "U";


        if ($("sidebarUserName")) {
            $("sidebarUserName").textContent = name;
        }

        if ($("sidebarUserRole")) {
            $("sidebarUserRole").textContent = role;
        }

        if ($("sidebarUserAvatar")) {
            $("sidebarUserAvatar").textContent = initials;
        }

        if ($("topbarUserName")) {
            $("topbarUserName").textContent = name;
        }

        if ($("topbarUserRole")) {
            $("topbarUserRole").textContent = role;
        }

        if ($("topbarUserAvatar")) {
            $("topbarUserAvatar").textContent = initials;
        }

    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const setupLogout = () => {

        const button = $("logoutBtn");

        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async () => {

                button.disabled = true;


                try {

                    if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.logout === "function"
                    ) {

                        await window.StockFlowAuth.logout();

                        return;
                    }

                } catch (error) {

                    console.warn(
                        "Logout API failed:",
                        error
                    );

                }


                try {
                    sessionStorage.clear();
                } catch (error) {
                    console.warn(error);
                }


                window.location.href =
                    "./auth.html";

            }
        );

    };


    /* =====================================================
       CONNECTION BADGE
    ===================================================== */

    const setupConnection = () => {

        const badge = $("connectionBadge");

        if (!badge) {
            return;
        }


        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.health === "function"
        ) {

            window.StockFlowAPI
                .health()
                .then(() => {

                    badge.classList.remove("offline");

                })
                .catch(() => {

                    badge.classList.add("offline");

                    const text =
                        badge.querySelector("span:last-child");

                    if (text) {
                        text.textContent =
                            "System Offline";
                    }

                });

        }

    };


    /* =====================================================
       INIT
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setupSidebar();
            setupNotifications();
            setupUserDisplay();
            setupLogout();
            setupConnection();

        }
    );

})();
