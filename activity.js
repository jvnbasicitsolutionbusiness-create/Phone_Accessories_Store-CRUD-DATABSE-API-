"use strict";

/* =========================================================
   STOCKFLOW ACTIVITY LOG
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const rows = document.getElementById("rows");
    const refreshButton = document.getElementById("refresh");


    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char]));

    }


    function showMessage(message) {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;

    }


    /* =====================================================
       NORMALIZE ACTIVITY DATA
       ===================================================== */

    function normalizeActivity(item) {

        return {

            date:
                item.DATE ??
                item.date ??
                item.createdAt ??
                item.created_at ??
                "",

            action:
                item.ACTION ??
                item.action ??
                "",

            module:
                item.MODULE ??
                item.module ??
                "",

            reference:
                item.REFERENCE ??
                item.reference ??
                item.ref ??
                "",

            user:
                item.USER ??
                item.user ??
                item.USERNAME ??
                item.username ??
                "",

            details:
                item.DETAILS ??
                item.details ??
                ""

        };

    }


    /* =====================================================
       RENDER ACTIVITY
       ===================================================== */

    function renderActivity(activity) {

        if (!rows) {
            return;
        }


        if (!Array.isArray(activity) || activity.length === 0) {

            showMessage("No activity yet.");

            return;

        }


        rows.innerHTML = activity
            .map(normalizeActivity)
            .map(item => {

                return `
                    <tr>

                        <td>
                            ${escapeHTML(item.date)}
                        </td>

                        <td>
                            ${escapeHTML(item.action)}
                        </td>

                        <td>
                            ${escapeHTML(item.module)}
                        </td>

                        <td>
                            ${escapeHTML(item.reference)}
                        </td>

                        <td>
                            ${escapeHTML(item.user)}
                        </td>

                        <td>
                            ${escapeHTML(item.details)}
                        </td>

                    </tr>
                `;

            })
            .join("");

    }


    /* =====================================================
       LOAD ACTIVITY
       ===================================================== */

    async function loadActivity() {

        if (!rows) {
            return;
        }


        showMessage("Loading activity...");


        try {

            /*
             * Firebase / Google Sheets connection
             * will be handled later through StockFlowAPI.
             */

            if (
                typeof window.StockFlowAPI === "undefined"
            ) {

                showMessage(
                    "Activity service is not connected yet."
                );

                return;

            }


            let response;


            /*
             * Current API method
             */

            if (
                typeof window.StockFlowAPI.listActivity === "function"
            ) {

                response =
                    await window.StockFlowAPI.listActivity();

            }


            /*
             * Compatibility with older API structure
             */

            else if (
                typeof window.StockFlowInventoryAPI !== "undefined" &&
                typeof window.StockFlowInventoryAPI.activity === "function"
            ) {

                response =
                    await window.StockFlowInventoryAPI.activity();

            }


            else {

                showMessage(
                    "Activity service is not available yet."
                );

                return;

            }


            /* =================================================
               NORMALIZE API RESPONSE
               ================================================= */

            const activity =
                response?.activity ??
                response?.activities ??
                response?.data ??
                [];


            renderActivity(activity);

        }

        catch (error) {

            console.error(
                "STOCKFLOW Activity Error:",
                error
            );


            showMessage(
                "Unable to load activity records."
            );

        }

    }


    /* =====================================================
       REFRESH BUTTON
       ===================================================== */

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadActivity
        );

    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    loadActivity();

});
