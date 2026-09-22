/* =========================================================
   STOCKFLOW — SETTINGS CONTROLLER
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    try {

        /* =====================================================
           AUTHENTICATION
        ===================================================== */

        if (
            typeof StockFlowAuth === "undefined" ||
            typeof StockFlowAuth.requireAuth !== "function"
        ) {
            console.error("StockFlowAuth is not available.");
            return;
        }

        const user = await StockFlowAuth.requireAuth();

        if (!user) {
            return;
        }


        /* =====================================================
           ELEMENTS
        ===================================================== */

        const settingsForm =
            document.getElementById("settings");

        const reorderInput =
            document.getElementById("reorder");

        const themeSelect =
            document.getElementById("theme");

        const message =
            document.getElementById("msg");

        const logoutButton =
            document.getElementById("logout");

        const menuButton =
            document.querySelector("[data-menu]");

        const sidebar =
            document.querySelector(".sf-side");


        if (
            !settingsForm ||
            !reorderInput ||
            !themeSelect ||
            !message ||
            !logoutButton
        ) {
            console.error(
                "Settings page elements were not found."
            );

            return;
        }


        /* =====================================================
           LOAD SAVED SETTINGS
        ===================================================== */

        const savedReorder =
            localStorage.getItem(
                "stockflow_reorder"
            );

        const savedTheme =
            localStorage.getItem(
                "stockflow_theme"
            );


        if (savedReorder !== null) {
            reorderInput.value = savedReorder;
        }


        if (
            savedTheme !== null &&
            (
                savedTheme === "system" ||
                savedTheme === "light"
            )
        ) {
            themeSelect.value = savedTheme;
        }


        /* =====================================================
           SAVE SETTINGS
        ===================================================== */

        settingsForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();


                const reorderValue =
                    Math.max(
                        0,
                        Number(reorderInput.value) || 0
                    );


                const themeValue =
                    themeSelect.value;


                localStorage.setItem(
                    "stockflow_reorder",
                    String(reorderValue)
                );


                localStorage.setItem(
                    "stockflow_theme",
                    themeValue
                );


                message.textContent =
                    "Settings saved on this browser.";

                message.classList.remove("error");
                message.classList.add("success");


                window.setTimeout(() => {

                    message.textContent = "";

                    message.classList.remove(
                        "success",
                        "error"
                    );

                }, 3000);

            }
        );


        /* =====================================================
           LOGOUT
        ===================================================== */

        logoutButton.addEventListener(
            "click",
            () => {

                if (
                    typeof StockFlowAuth.logout ===
                    "function"
                ) {
                    StockFlowAuth.logout();
                    return;
                }

                console.error(
                    "StockFlowAuth.logout is not available."
                );

            }
        );


        /* =====================================================
           MOBILE SIDEBAR
        ===================================================== */

        if (menuButton && sidebar) {

            menuButton.addEventListener(
                "click",
                () => {

                    const isOpen =
                        sidebar.classList.toggle("open");

                    menuButton.setAttribute(
                        "aria-expanded",
                        String(isOpen)
                    );

                }
            );


            const sidebarLinks =
                sidebar.querySelectorAll("a");

            sidebarLinks.forEach((link) => {

                link.addEventListener(
                    "click",
                    () => {

                        sidebar.classList.remove(
                            "open"
                        );

                        menuButton.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }
                );

            });

        }


    } catch (error) {

        console.error(
            "Unable to initialize settings:",
            error
        );

    }

});
