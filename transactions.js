/* =========================================================
   STOCKFLOW — TRANSACTIONS
   transactions.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const rows =
        document.getElementById("rows");

    const alertBox =
        document.getElementById("alert");

    const transactionCount =
        document.getElementById(
            "transactionCount"
        );

    const allButton =
        document.getElementById("all");

    const stockInButton =
        document.getElementById("ins");

    const stockOutButton =
        document.getElementById("outs");

    const menuButton =
        document.querySelector("[data-menu]");

    const sidebar =
        document.querySelector(".sf-side");


    /* =====================================================
       STATE
       ===================================================== */

    let transactions = [];

    let currentFilter = "ALL";


    /* =====================================================
       API
       ===================================================== */

    function getAPI() {

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.listTransactions ===
                "function"
        ) {
            return window.StockFlowAPI;
        }

        if (
            window.API &&
            typeof window.API.listTransactions ===
                "function"
        ) {
            return window.API;
        }

        return null;
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function clean(value) {

        return String(
            value ?? ""
        ).trim();
    }


    function escapeHTML(value) {

        return clean(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function getValue(
        object,
        keys
    ) {

        for (
            const key of keys
        ) {

            if (
                object &&
                object[key] !== undefined &&
                object[key] !== null &&
                object[key] !== ""
            ) {
                return object[key];
            }

        }

        return "";
    }


    /* =====================================================
       DATE FORMAT
       ===================================================== */

    function formatDate(
        value
    ) {

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

            return escapeHTML(
                value
            );
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


    /* =====================================================
       NUMBER FORMAT
       ===================================================== */

    function formatNumber(
        value
    ) {

        const number =
            Number(value);

        if (
            Number.isNaN(number)
        ) {
            return "—";
        }

        return number.toLocaleString(
            undefined,
            {
                maximumFractionDigits: 2
            }
        );
    }


    /* =====================================================
       MONEY FORMAT
       ===================================================== */

    function formatMoney(
        value
    ) {

        const number =
            Number(value);

        if (
            Number.isNaN(number)
        ) {
            return "—";
        }

        return "₱" +
            number.toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    }


    /* =====================================================
       TRANSACTION TYPE
       ===================================================== */

    function normalizeType(
        transaction
    ) {

        const raw =
            clean(
                getValue(
                    transaction,
                    [
                        "type",
                        "transaction_type",
                        "transactionType",
                        "movement_type",
                        "movementType"
                    ]
                )
            ).toUpperCase();

        if (
            raw === "IN" ||
            raw === "STOCK IN" ||
            raw === "STOCK_IN" ||
            raw === "STOCK-IN"
        ) {
            return "IN";
        }

        if (
            raw === "OUT" ||
            raw === "STOCK OUT" ||
            raw === "STOCK_OUT" ||
            raw === "STOCK-OUT"
        ) {
            return "OUT";
        }

        return raw || "UNKNOWN";
    }


    /* =====================================================
       GET TRANSACTION ID
       ===================================================== */

    function getTransactionId(
        transaction
    ) {

        return getValue(
            transaction,
            [
                "id",
                "transaction_id",
                "transactionId",
                "ID"
            ]
        );
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading() {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="sf-empty transaction-loading"
                >
                    <span
                        class="transaction-loading-state"
                    >
                        <span
                            class="transaction-spinner"
                        ></span>

                        Loading transactions...
                    </span>
                </td>
            </tr>
        `;

        if (transactionCount) {
            transactionCount.textContent = "—";
        }
    }


    /* =====================================================
       EMPTY
       ===================================================== */

    function showEmpty(
        filter
    ) {

        if (!rows) {
            return;
        }

        let message =
            "No transactions found.";

        if (filter === "IN") {
            message =
                "No stock-in transactions found.";
        }

        if (filter === "OUT") {
            message =
                "No stock-out transactions found.";
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="sf-empty"
                >
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;

        if (transactionCount) {
            transactionCount.textContent = "0";
        }
    }


    /* =====================================================
       ERROR
       ===================================================== */

    function showTableError(
        message
    ) {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="sf-empty"
                    style="color:#b42336;"
                >
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;

        if (transactionCount) {
            transactionCount.textContent = "—";
        }
    }


    /* =====================================================
       ALERT
       ===================================================== */

    function showAlert(
        message,
        type = "info"
    ) {

        if (!alertBox) {
            return;
        }

        alertBox.textContent =
            message || "";

        alertBox.className =
            "sf-alert";

        if (!message) {
            return;
        }

        alertBox.classList.add(
            "show",
            type
        );

        clearTimeout(
            showAlert.timer
        );

        showAlert.timer =
            setTimeout(() => {

                alertBox.classList.remove(
                    "show"
                );

            }, 4000);
    }


    /* =====================================================
       NORMALIZE API RESPONSE
       ===================================================== */

    function normalizeTransactionList(
        response
    ) {

        if (
            Array.isArray(response)
        ) {
            return response;
        }

        if (
            Array.isArray(response?.transactions)
        ) {
            return response.transactions;
        }

        if (
            Array.isArray(response?.data)
        ) {
            return response.data;
        }

        if (
            Array.isArray(response?.items)
        ) {
            return response.items;
        }

        if (
            Array.isArray(response?.records)
        ) {
            return response.records;
        }

        if (
            Array.isArray(response?.result)
        ) {
            return response.result;
        }

        return [];
    }


    /* =====================================================
       FILTER TRANSACTIONS
       ===================================================== */

    function getFilteredTransactions() {

        if (
            currentFilter === "ALL"
        ) {
            return transactions;
        }

        return transactions.filter(
            (transaction) => {

                return (
                    normalizeType(
                        transaction
                    ) ===
                    currentFilter
                );
            }
        );
    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderTransactions() {

        const filtered =
            getFilteredTransactions();

        if (!filtered.length) {

            showEmpty(
                currentFilter
            );

            return;
        }

        if (transactionCount) {

            transactionCount.textContent =
                filtered.length.toLocaleString();
        }


        rows.innerHTML =
            filtered.map(
                (
                    transaction
                ) => {

                    const type =
                        normalizeType(
                            transaction
                        );

                    const typeClass =
                        type === "IN"
                            ? "in"
                            : type === "OUT"
                                ? "out"
                                : "";

                    const date =
                        getValue(
                            transaction,
                            [
                                "date",
                                "transaction_date",
                                "transactionDate",
                                "created_at",
                                "createdAt",
                                "timestamp"
                            ]
                        );

                    const reference =
                        getValue(
                            transaction,
                            [
                                "reference",
                                "reference_no",
                                "referenceNo",
                                "ref",
                                "transaction_reference"
                            ]
                        );

                    const product =
                        getValue(
                            transaction,
                            [
                                "product",
                                "product_name",
                                "productName",
                                "name"
                            ]
                        );

                    const sku =
                        getValue(
                            transaction,
                            [
                                "sku",
                                "product_sku",
                                "productSku"
                            ]
                        );

                    const quantity =
                        getValue(
                            transaction,
                            [
                                "quantity",
                                "qty",
                                "stock_quantity"
                            ]
                        );

                    const total =
                        getValue(
                            transaction,
                            [
                                "total",
                                "total_amount",
                                "totalAmount",
                                "amount"
                            ]
                        );

                    const user =
                        getValue(
                            transaction,
                            [
                                "user",
                                "username",
                                "user_name",
                                "userName",
                                "created_by",
                                "createdBy"
                            ]
                        );


                    return `
                        <tr>

                            <td>
                                <span
                                    class="transaction-date"
                                >
                                    ${formatDate(date)}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="transaction-type ${typeClass}"
                                >
                                    ${
                                        type === "IN"
                                            ? "STOCK IN"
                                            : type === "OUT"
                                                ? "STOCK OUT"
                                                : escapeHTML(type)
                                    }
                                </span>
                            </td>


                            <td>
                                <span
                                    class="transaction-reference"
                                >
                                    ${escapeHTML(
                                        reference ||
                                        (
                                            getTransactionId(
                                                transaction
                                            ) || "—"
                                        )
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="transaction-product"
                                >
                                    ${escapeHTML(
                                        product ||
                                        "—"
                                    )}
                                </span>

                                ${
                                    sku
                                        ? `
                                            <span
                                                class="transaction-product-sub"
                                            >
                                                SKU:
                                                ${escapeHTML(sku)}
                                            </span>
                                          `
                                        : ""
                                }
                            </td>


                            <td>
                                <span
                                    class="transaction-qty"
                                >
                                    ${formatNumber(quantity)}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="transaction-total"
                                >
                                    ${formatMoney(total)}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="transaction-user"
                                >
                                    ${escapeHTML(
                                        user ||
                                        "—"
                                    )}
                                </span>
                            </td>

                        </tr>
                    `;

                }
            ).join("");
    }


    /* =====================================================
       LOAD TRANSACTIONS
       ===================================================== */

    async function loadTransactions() {

        const API =
            getAPI();

        if (!API) {

            showTableError(
                "StockFlow API is not available."
            );

            return;
        }

        showLoading();

        try {

            const response =
                await API.listTransactions();

            console.log(
                "StockFlow transactions response:",
                response
            );

            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Unable to load transactions."
                );
            }

            transactions =
                normalizeTransactionList(
                    response
                );

            renderTransactions();

        } catch (error) {

            console.error(
                "Transaction loading error:",
                error
            );

            showTableError(
                error?.message ||
                "Unable to load transactions."
            );

            showAlert(
                error?.message ||
                "Unable to load transactions.",
                "error"
            );
        }
    }


    /* =====================================================
       FILTER BUTTON STATE
       ===================================================== */

    function setFilter(
        filter
    ) {

        currentFilter =
            filter;

        const buttons = [
            allButton,
            stockInButton,
            stockOutButton
        ];

        buttons.forEach(
            (button) => {

                if (!button) {
                    return;
                }

                const isActive =
                    (
                        button.id === "all" &&
                        filter === "ALL"
                    ) ||
                    (
                        button.id === "ins" &&
                        filter === "IN"
                    ) ||
                    (
                        button.id === "outs" &&
                        filter === "OUT"
                    );

                button.classList.toggle(
                    "active",
                    isActive
                );

                button.classList.toggle(
                    "secondary",
                    !isActive
                );

                button.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );
            }
        );

        renderTransactions();
    }


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    function setupMenu() {

        if (
            !menuButton ||
            !sidebar
        ) {
            return;
        }

        menuButton.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );
            }
        );


        document.addEventListener(
            "click",
            (event) => {

                if (
                    window.innerWidth > 800
                ) {
                    return;
                }

                if (
                    !sidebar.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }

                if (
                    sidebar.contains(
                        event.target
                    ) ||
                    menuButton.contains(
                        event.target
                    )
                ) {
                    return;
                }

                sidebar.classList.remove(
                    "open"
                );
            }
        );
    }


    /* =====================================================
       FILTER EVENTS
       ===================================================== */

    if (allButton) {

        allButton.addEventListener(
            "click",
            () => {
                setFilter("ALL");
            }
        );
    }

    if (stockInButton) {

        stockInButton.addEventListener(
            "click",
            () => {
                setFilter("IN");
            }
        );
    }

    if (stockOutButton) {

        stockOutButton.addEventListener(
            "click",
            () => {
                setFilter("OUT");
            }
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    setupMenu();

    setFilter("ALL");

    loadTransactions();

});
