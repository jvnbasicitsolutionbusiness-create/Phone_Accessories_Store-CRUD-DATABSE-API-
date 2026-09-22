/* =========================================================
   STOCKFLOW — ACTIVITY LOG CONTROLLER
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const rows =
        document.getElementById("rows");

    const refreshButton =
        document.getElementById("refresh");

    const menuButton =
        document.querySelector("[data-menu]");

    const sidebar =
        document.querySelector(".sf-side");


    /* =====================================================
       BASIC ELEMENT CHECK
       ===================================================== */

    if (!rows) {
        console.error(
            "Activity table body was not found."
        );

        return;
    }


    /* =====================================================
       API RESOLVER
       ===================================================== */

    function getAPI() {

        if (
            typeof StockFlowAPI !== "undefined"
        ) {
            return StockFlowAPI;
        }

        if (
            typeof API !== "undefined"
        ) {
            return API;
        }

        return null;
    }


    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    try {

        if (
            typeof StockFlowAuth !== "undefined" &&
            typeof StockFlowAuth.requireAuth ===
                "function"
        ) {
            const user =
                await StockFlowAuth.requireAuth();

            if (!user) {
                return;
            }
        }

    } catch (error) {

        console.error(
            "Activity authentication error:",
            error
        );

        renderMessage(
            "Unable to verify your session."
        );

        return;
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function escapeHTML(value) {

        return String(
            value ?? ""
        )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    }


    function getValue(
        object,
        ...keys
    ) {

        if (!object) {
            return "";
        }

        for (const key of keys) {

            if (
                object[key] !== undefined &&
                object[key] !== null
            ) {
                return object[key];
            }

        }

        return "";

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return escapeHTML(value);
        }

        return date.toLocaleString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    function normalizeAction(value) {

        return String(
            value ?? ""
        )
        .trim()
        .toLowerCase()
        .replaceAll("_", "-")
        .replaceAll(" ", "-");

    }


    function actionClass(action) {

        const normalized =
            normalizeAction(action);

        if (
            normalized.includes("stock-in") ||
            normalized === "in" ||
            normalized.includes("add")
        ) {
            return "in";
        }

        if (
            normalized.includes("stock-out") ||
            normalized === "out" ||
            normalized.includes("remove")
        ) {
            return "out";
        }

        if (
            normalized.includes("delete") ||
            normalized.includes("remove")
        ) {
            return "delete";
        }

        if (
            normalized.includes("create") ||
            normalized.includes("add")
        ) {
            return "create";
        }

        if (
            normalized.includes("update") ||
            normalized.includes("edit")
        ) {
            return "update";
        }

        return "";
    }


    function renderMessage(
        message
    ) {

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
       EXTRACT RESPONSE DATA
       ===================================================== */

    function extractRecords(response) {

        if (!response) {
            return [];
        }


        if (Array.isArray(response)) {
            return response;
        }


        if (
            Array.isArray(response.data)
        ) {
            return response.data;
        }


        if (
            Array.isArray(response.activities)
        ) {
            return response.activities;
        }


        if (
            Array.isArray(response.activity)
        ) {
            return response.activity;
        }


        if (
            Array.isArray(response.rows)
        ) {
            return response.rows;
        }


        if (
            response.data &&
            Array.isArray(response.data.rows)
        ) {
            return response.data.rows;
        }


        return [];

    }


    /* =====================================================
       RENDER ACTIVITY
       ===================================================== */

    function renderActivity(
        records
    ) {

        if (!records.length) {

            renderMessage(
                "No activity records found."
            );

            return;
        }


        rows.innerHTML =
            records.map(
                (record) => {

                    const date =
                        getValue(
                            record,
                            "date",
                            "created_at",
                            "createdAt",
                            "timestamp",
                            "activity_date"
                        );


                    const action =
                        getValue(
                            record,
                            "action",
                            "activity",
                            "type",
                            "movement_type"
                        );


                    const module =
                        getValue(
                            record,
                            "module",
                            "source",
                            "section"
                        );


                    const reference =
                        getValue(
                            record,
                            "reference",
                            "reference_no",
                            "referenceNo",
                            "ref"
                        );


                    const user =
                        getValue(
                            record,
                            "user",
                            "username",
                            "user_name",
                            "created_by",
                            "createdBy"
                        );


                    const details =
                        getValue(
                            record,
                            "details",
                            "description",
                            "message",
                            "remarks"
                        );


                    const badgeClass =
                        actionClass(action);


                    return `
                        <tr>

                            <td>
                                ${formatDate(date)}
                            </td>

                            <td>
                                <span
                                    class="action-badge ${badgeClass}"
                                >
                                    ${escapeHTML(
                                        action || "Activity"
                                    )}
                                </span>
                            </td>

                            <td>
                                <span class="activity-module">
                                    ${escapeHTML(
                                        module || "—"
                                    )}
                                </span>
                            </td>

                            <td>
                                <span class="activity-reference">
                                    ${escapeHTML(
                                        reference || "—"
                                    )}
                                </span>
                            </td>

                            <td>
                                <span class="activity-user">
                                    ${escapeHTML(
                                        user || "—"
                                    )}
                                </span>
                            </td>

                            <td>
                                <span class="activity-details">
                                    ${escapeHTML(
                                        details || "—"
                                    )}
                                </span>
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       LOAD ACTIVITY
       ===================================================== */

    async function loadActivity() {

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    Loading activity...
                </td>
            </tr>
        `;


        const api =
            getAPI();


        if (!api) {

            console.error(
                "StockFlow API is not available."
            );

            renderMessage(
                "API connection is unavailable."
            );

            return;
        }


        try {

            let response;


            if (
                typeof api.listActivity ===
                "function"
            ) {

                response =
                    await api.listActivity();

            }

            else if (
                typeof api.getActivity ===
                "function"
            ) {

                response =
                    await api.getActivity();

            }

            else if (
                typeof api.request ===
                "function"
            ) {

                response =
                    await api.request(
                        "listActivity"
                    );

            }

            else {

                throw new Error(
                    "No activity API method was found."
                );

            }


            const records =
                extractRecords(response);


            renderActivity(records);

        } catch (error) {

            console.error(
                "Unable to load activity:",
                error
            );

            renderMessage(
                error?.message ||
                "Unable to load activity records."
            );

        }

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async () => {

                refreshButton.disabled = true;

                const originalText =
                    refreshButton.textContent;

                refreshButton.textContent =
                    "↻ Loading...";


                try {

                    await loadActivity();

                } finally {

                    refreshButton.disabled = false;

                    refreshButton.textContent =
                        originalText;

                }

            }
        );

    }


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    if (
        menuButton &&
        sidebar
    ) {

        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    sidebar.classList.toggle(
                        "open"
                    );

                menuButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );

            }
        );


        const links =
            sidebar.querySelectorAll("a");


        links.forEach(
            (link) => {

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

            }
        );

    }


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    await loadActivity();

});
