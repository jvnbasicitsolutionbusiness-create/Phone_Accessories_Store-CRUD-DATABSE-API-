/* =========================================================
   STOCKFLOW — STOCK IN UI
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


        button.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                panel.hidden = !panel.hidden;

                button.setAttribute(
                    "aria-expanded",
                    String(!panel.hidden)
                );

            }
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

        if ($("sidebarAvatar")) {
            $("sidebarAvatar").textContent = initials;
        }

        if ($("topbarUserName")) {
            $("topbarUserName").textContent = name;
        }

        if ($("topbarUserRole")) {
            $("topbarUserRole").textContent = role;
        }

        if ($("topbarAvatar")) {
            $("topbarAvatar").textContent = initials;
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
       CONNECTION
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
       DEFAULT DATE
    ===================================================== */

    const setupDefaultDate = () => {

        const dateInput = $("stockInDate");

        if (
            !dateInput ||
            dateInput.value
        ) {
            return;
        }


        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");


        dateInput.value =
            `${year}-${month}-${day}`;

    };


    /* =====================================================
       LIVE PREVIEW
       This only updates UI and does not replace
       stock-in.js backend logic.
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


        const update = () => {

            if ($("previewProduct")) {

                const productText =
                    product?.selectedOptions?.[0]?.text ||
                    "No product selected";

                $("previewProduct").textContent =
                    product?.value
                        ? productText
                        : "No product selected";
            }


            if ($("previewSupplier")) {

                const supplierText =
                    supplier?.selectedOptions?.[0]?.text ||
                    "No supplier selected";

                $("previewSupplier").textContent =
                    supplier?.value
                        ? supplierText
                        : "No supplier selected";
            }


            const qty =
                Number(quantity?.value || 0);

            const cost =
                Number(unitCost?.value || 0);

            const total =
                qty * cost;


            if ($("previewQuantity")) {
                $("previewQuantity").textContent =
                    qty.toLocaleString("en-PH");
            }


            if ($("previewUnitCost")) {
                $("previewUnitCost").textContent =
                    `₱${cost.toLocaleString(
                        "en-PH",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )}`;
            }


            if ($("previewTotal")) {
                $("previewTotal").textContent =
                    `₱${total.toLocaleString(
                        "en-PH",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )}`;
            }


            if ($("previewReference")) {

                $("previewReference").textContent =
                    reference?.value.trim() ||
                    "—";

            }


            if ($("previewDate")) {

                if (date?.value) {

                    const parsed =
                        new Date(
                            `${date.value}T00:00:00`
                        );

                    $("previewDate").textContent =
                        parsed.toLocaleDateString(
                            "en-PH",
                            {
                                month: "short",
                                day: "2-digit",
                                year: "numeric"
                            }
                        );

                } else {

                    $("previewDate").textContent =
                        "—";

                }

            }

        };


        [
            product,
            supplier,
            quantity,
            unitCost,
            reference,
            date
        ]
            .filter(Boolean)
            .forEach(element => {

                element.addEventListener(
                    "input",
                    update
                );

                element.addEventListener(
                    "change",
                    update
                );

            });


        update();

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
            setupDefaultDate();
            setupPreview();

        }
    );

})();
