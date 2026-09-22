/* =========================================================
   STOCKFLOW — TRANSACTIONS
   Full transaction history controller
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    let allTransactions = [];

    let currentFilter = "ALL";



    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const rows = $("rows");

    const alertBox = $("alert");

    const transactionCount = $("transactionCount");

    const totalCount = $("totalCount");

    const stockInCount = $("stockInCount");

    const stockOutCount = $("stockOutCount");

    const totalQuantity = $("totalQuantity");

    const tableStatus = $("tableStatus");

    const statusDot = $("statusDot");

    const sidebar = $("sidebar");

    const mobileMenuBtn = $("mobileMenuBtn");

    const refreshBtn = $("refreshBtn");

    const clearFilterBtn = $("clearFilterBtn");

    const transactionModal = $("transactionModal");

    const transactionDetails = $("transactionDetails");

    const transactionModalTitle = $("transactionModalTitle");

    const closeModalBtn = $("closeModalBtn");

    const modalDoneBtn = $("modalDoneBtn");

    const logoutBtn = $("logoutBtn");



    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }



    /* =====================================================
       NUMBER
    ===================================================== */

    function number(value) {

        const n = Number(value);

        return Number.isFinite(n)
            ? n
            : 0;

    }



    /* =====================================================
       CURRENCY
    ===================================================== */

    function currency(value) {

        return "₱" +
            number(value).toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

    }



    /* =====================================================
       DATE FORMAT
    ===================================================== */

    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date = new Date(value);


        if (Number.isNaN(date.getTime())) {

            return escapeHtml(value);

        }


        return date.toLocaleString(
            "en-PH",
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
       ALERT
    ===================================================== */

    function showAlert(message, type = "error") {

        if (!alertBox) {
            return;
        }


        alertBox.textContent = message || "";

        alertBox.className =
            "sf-alert show " +
            (type === "success"
                ? "success"
                : "error");


        window.clearTimeout(
            showAlert.timer
        );


        showAlert.timer =
            window.setTimeout(() => {

                alertBox.className =
                    "sf-alert";

            }, 5000);

    }



    /* =====================================================
       STATUS
    ===================================================== */

    function setStatus(
        message,
        state = "normal"
    ) {

        if (tableStatus) {

            tableStatus.textContent =
                message;

        }


        if (statusDot) {

            statusDot.className =
                "status-dot";

            if (state === "online") {

                statusDot.classList.add(
                    "online"
                );

            }

            if (state === "error") {

                statusDot.classList.add(
                    "error"
                );

            }

        }

    }



    /* =====================================================
       BACKEND REQUEST
    ===================================================== */

    async function requestTransactions(type) {

        if (
            !window.StockFlowAPI ||
            typeof StockFlowAPI.request !== "function"
        ) {

            throw new Error(
                "StockFlow API is not available."
            );

        }


        const response =
            await StockFlowAPI.request({

                action: "listTransactions",

                type: type

            });


        if (!response) {

            throw new Error(
                "No response received from the backend."
            );

        }


        if (!response.success) {

            throw new Error(
                response.message ||
                "Unable to load transactions."
            );

        }


        return Array.isArray(
            response.records
        )
            ? response.records
            : [];

    }



    /* =====================================================
       NORMALIZE TRANSACTION
    ===================================================== */

    function normalizeTransaction(
        transaction,
        forcedType = ""
    ) {

        const rawType =
            String(
                transaction.TYPE ||
                forcedType ||
                ""
            ).toUpperCase();


        let type = rawType;


        if (
            rawType === "IN" ||
            rawType === "STOCK_IN"
        ) {

            type = "STOCK_IN";

        }


        if (
            rawType === "OUT" ||
            rawType === "STOCK_OUT"
        ) {

            type = "STOCK_OUT";

        }


        return {

            ID:
                transaction.ID ||
                transaction.id ||
                "",

            TYPE:
                type,

            PRODUCT_ID:
                transaction.PRODUCT_ID ||
                "",

            SKU:
                transaction.SKU ||
                "",

            PRODUCT_NAME:
                transaction.PRODUCT_NAME ||
                transaction.PRODUCT ||
                "",

            QUANTITY:
                number(
                    transaction.QUANTITY
                ),

            UNIT_COST:
                number(
                    transaction.UNIT_COST
                ),

            TOTAL:
                number(
                    transaction.TOTAL
                ),

            REFERENCE:
                transaction.REFERENCE ||
                "",

            SUPPLIER:
                transaction.SUPPLIER ||
                "",

            NOTE:
                transaction.NOTE ||
                "",

            USER:
                transaction.USER ||
                transaction.CREATED_BY ||
                transaction.username ||
                "",

            DATE:
                transaction.DATE ||
                transaction.CREATED_AT ||
                ""

        };

    }



    /* =====================================================
       LOAD ALL
    ===================================================== */

    async function loadAllTransactions() {

        setStatus(
            "Loading transaction records..."
        );


        rows.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-loading"
                >
                    <span class="loading-spinner"></span>
                    Loading transaction records...
                </td>
            </tr>
        `;


        /*
         * IMPORTANT:
         *
         * The Apps Script backend does not support
         * an empty transaction type.
         *
         * It requires:
         * IN
         * or
         * OUT
         *
         * Therefore "All Transactions" loads both
         * datasets and combines them.
         */

        const [
            incoming,
            outgoing
        ] = await Promise.all([

            requestTransactions("IN"),

            requestTransactions("OUT")

        ]);


        allTransactions = [

            ...incoming.map(
                item =>
                    normalizeTransaction(
                        item,
                        "IN"
                    )
            ),

            ...outgoing.map(
                item =>
                    normalizeTransaction(
                        item,
                        "OUT"
                    )
            )

        ];


        /*
         * Newest transactions first.
         */

        allTransactions.sort(
            (a, b) => {

                const dateA =
                    new Date(a.DATE).getTime();

                const dateB =
                    new Date(b.DATE).getTime();

                return (
                    (Number.isFinite(dateB)
                        ? dateB
                        : 0)
                    -
                    (Number.isFinite(dateA)
                        ? dateA
                        : 0)
                );

            }
        );


        updateSummary();

        renderTransactions();

        setStatus(
            "Transaction records synchronized.",
            "online"
        );

    }



    /* =====================================================
       FILTER
    ===================================================== */

    function getFilteredTransactions() {

        if (currentFilter === "IN") {

            return allTransactions.filter(
                transaction =>
                    transaction.TYPE === "STOCK_IN"
            );

        }


        if (currentFilter === "OUT") {

            return allTransactions.filter(
                transaction =>
                    transaction.TYPE === "STOCK_OUT"
            );

        }


        return allTransactions;

    }



    /* =====================================================
       SUMMARY
    ===================================================== */

    function updateSummary() {

        const incoming =
            allTransactions.filter(
                transaction =>
                    transaction.TYPE === "STOCK_IN"
            );


        const outgoing =
            allTransactions.filter(
                transaction =>
                    transaction.TYPE === "STOCK_OUT"
            );


        const quantity =
            allTransactions.reduce(
                (sum, transaction) =>
                    sum +
                    number(
                        transaction.QUANTITY
                    ),
                0
            );


        if (totalCount) {

            totalCount.textContent =
                allTransactions.length
                    .toLocaleString();

        }


        if (stockInCount) {

            stockInCount.textContent =
                incoming.length
                    .toLocaleString();

        }


        if (stockOutCount) {

            stockOutCount.textContent =
                outgoing.length
                    .toLocaleString();

        }


        if (totalQuantity) {

            totalQuantity.textContent =
                quantity.toLocaleString();

        }

    }



    /* =====================================================
       RENDER
    ===================================================== */

    function renderTransactions() {

        const data =
            getFilteredTransactions();


        if (transactionCount) {

            transactionCount.textContent =
                `${data.length.toLocaleString()} ${
                    data.length === 1
                        ? "record"
                        : "records"
                }`;

        }


        if (!data.length) {

            rows.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="table-empty"
                    >
                        No transactions found
                        for this filter.
                    </td>
                </tr>
            `;

            return;

        }


        rows.innerHTML =
            data.map(
                (transaction, index) =>
                    renderRow(
                        transaction,
                        index
                    )
            ).join("");

    }



    /* =====================================================
       ROW
    ===================================================== */

    function renderRow(
        transaction,
        index
    ) {

        const incoming =
            transaction.TYPE === "STOCK_IN";


        const typeLabel =
            incoming
                ? "STOCK IN"
                : "STOCK OUT";


        return `
            <tr>

                <td>
                    ${formatDate(
                        transaction.DATE
                    )}
                </td>


                <td>

                    <span
                        class="transaction-type ${
                            incoming
                                ? "in"
                                : "out"
                        }"
                    >
                        ${typeLabel}
                    </span>

                </td>


                <td>

                    <span
                        class="transaction-reference"
                    >
                        ${escapeHtml(
                            transaction.REFERENCE ||
                            "—"
                        )}
                    </span>

                </td>


                <td>

                    <strong>
                        ${escapeHtml(
                            transaction.PRODUCT_NAME ||
                            "Unknown Product"
                        )}
                    </strong>

                    ${
                        transaction.SKU
                            ? `
                                <div
                                    style="
                                        margin-top:4px;
                                        color:#8a9ab1;
                                        font-size:11px;
                                    "
                                >
                                    SKU:
                                    ${escapeHtml(
                                        transaction.SKU
                                    )}
                                </div>
                            `
                            : ""
                    }

                </td>


                <td>

                    <span
                        class="transaction-quantity"
                    >
                        ${
                            transaction.QUANTITY
                                .toLocaleString()
                        }
                    </span>

                </td>


                <td>

                    ${currency(
                        transaction.UNIT_COST
                    )}

                </td>


                <td>

                    <span
                        class="transaction-total"
                    >
                        ${currency(
                            transaction.TOTAL
                        )}
                    </span>

                </td>


                <td>

                    <span
                        class="transaction-user"
                    >
                        ${escapeHtml(
                            transaction.USER ||
                            "System"
                        )}
                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="transaction-view"
                        data-view-index="${index}"
                    >
                        View
                    </button>

                </td>

            </tr>
        `;

    }



    /* =====================================================
       FILTER BUTTONS
    ===================================================== */

    function setupFilters() {

        const filterButtons =
            document.querySelectorAll(
                ".transaction-filter"
            );


        filterButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        currentFilter =
                            button.dataset.filter ||
                            "ALL";


                        filterButtons.forEach(
                            item => {

                                const active =
                                    item === button;

                                item.classList.toggle(
                                    "active",
                                    active
                                );

                                item.setAttribute(
                                    "aria-pressed",
                                    active
                                        ? "true"
                                        : "false"
                                );

                            }
                        );


                        renderTransactions();

                    }
                );

            }
        );

    }



    /* =====================================================
       RESET FILTER
    ===================================================== */

    function resetFilter() {

        currentFilter = "ALL";


        document
            .querySelectorAll(
                ".transaction-filter"
            )
            .forEach(button => {

                const active =
                    button.dataset.filter ===
                    "ALL";

                button.classList.toggle(
                    "active",
                    active
                );

                button.setAttribute(
                    "aria-pressed",
                    active
                        ? "true"
                        : "false"
                );

            });


        renderTransactions();

    }



    /* =====================================================
       MODAL
    ===================================================== */

    function openModal(transaction) {

        if (!transactionModal) {
            return;
        }


        const incoming =
            transaction.TYPE === "STOCK_IN";


        const typeLabel =
            incoming
                ? "STOCK IN"
                : "STOCK OUT";


        transactionModalTitle.textContent =
            transaction.REFERENCE ||
            "Transaction Details";


        transactionDetails.innerHTML = `

            <div class="detail-grid">


                <div class="detail-item">

                    <span>
                        Transaction Type
                    </span>

                    <strong>
                        ${typeLabel}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Reference
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.REFERENCE ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Date
                    </span>

                    <strong>
                        ${formatDate(
                            transaction.DATE
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        User
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.USER ||
                            "System"
                        )}
                    </strong>

                </div>


                <div class="detail-item full">

                    <span>
                        Product
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.PRODUCT_NAME ||
                            "Unknown Product"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        SKU
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.SKU ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Product ID
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.PRODUCT_ID ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Quantity
                    </span>

                    <strong>
                        ${
                            transaction.QUANTITY
                                .toLocaleString()
                        }
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Unit Cost
                    </span>

                    <strong>
                        ${currency(
                            transaction.UNIT_COST
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Total
                    </span>

                    <strong>
                        ${currency(
                            transaction.TOTAL
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Supplier
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.SUPPLIER ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="detail-item full">

                    <span>
                        Note
                    </span>

                    <strong>
                        ${escapeHtml(
                            transaction.NOTE ||
                            "No additional note."
                        )}
                    </strong>

                </div>


            </div>

        `;


        transactionModal.classList.add(
            "open"
        );


        transactionModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";

    }



    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {

        if (!transactionModal) {
            return;
        }


        transactionModal.classList.remove(
            "open"
        );


        transactionModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";

    }



    /* =====================================================
       TABLE ACTION
    ===================================================== */

    function setupTableActions() {

        rows.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-view-index]"
                    );


                if (!button) {
                    return;
                }


                const index =
                    Number(
                        button.dataset.viewIndex
                    );


                const data =
                    getFilteredTransactions();


                const transaction =
                    data[index];


                if (transaction) {

                    openModal(
                        transaction
                    );

                }

            }
        );

    }



    /* =====================================================
       REFRESH
    ===================================================== */

    async function refresh() {

        if (refreshBtn) {

            refreshBtn.disabled = true;

            refreshBtn.style.opacity =
                "0.6";

        }


        try {

            await loadAllTransactions();

            showAlert(
                "Transaction records refreshed successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "STOCKFLOW Transactions:",
                error
            );


            rows.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="table-empty"
                    >
                        Unable to load transaction records.
                    </td>
                </tr>
            `;


            setStatus(
                error.message ||
                "Unable to synchronize records.",
                "error"
            );


            showAlert(
                error.message ||
                "Unable to load transactions.",
                "error"
            );

        } finally {

            if (refreshBtn) {

                refreshBtn.disabled = false;

                refreshBtn.style.opacity =
                    "";

            }

        }

    }



    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    function setupMobileNavigation() {

        if (
            !mobileMenuBtn ||
            !sidebar
        ) {

            return;

        }


        mobileMenuBtn.addEventListener(
            "click",
            () => {

                const open =
                    sidebar.classList.toggle(
                        "open"
                    );


                mobileMenuBtn.setAttribute(
                    "aria-expanded",
                    open
                        ? "true"
                        : "false"
                );

            }
        );


        document.addEventListener(
            "click",
            event => {

                if (
                    window.innerWidth > 760
                ) {

                    return;

                }


                if (
                    !sidebar.contains(
                        event.target
                    ) &&
                    !mobileMenuBtn.contains(
                        event.target
                    )
                ) {

                    sidebar.classList.remove(
                        "open"
                    );


                    mobileMenuBtn.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }
        );

    }



    /* =====================================================
       LOGOUT
    ===================================================== */

    function setupLogout() {

        if (!logoutBtn) {
            return;
        }


        logoutBtn.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        window.StockFlowAuth &&
                        typeof StockFlowAuth.logout ===
                            "function"
                    ) {

                        await StockFlowAuth.logout();

                        return;

                    }


                    sessionStorage.clear();

                    window.location.href =
                        "login.html";

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    sessionStorage.clear();

                    window.location.href =
                        "login.html";

                }

            }
        );

    }



    /* =====================================================
       USER DISPLAY
    ===================================================== */

    async function initializeUser() {

        try {

            if (
                window.StockFlowAuth &&
                typeof StockFlowAuth.requireAuth ===
                    "function"
            ) {

                const user =
                    await StockFlowAuth.requireAuth();


                if (!user) {
                    return;
                }


                document
                    .querySelectorAll(
                        "[data-user-name]"
                    )
                    .forEach(
                        element => {

                            element.textContent =
                                user.name ||
                                user.fullName ||
                                user.username ||
                                user.email ||
                                "StockFlow User";

                        }
                    );


                document
                    .querySelectorAll(
                        "[data-user-role]"
                    )
                    .forEach(
                        element => {

                            element.textContent =
                                user.role ||
                                "Employee";

                        }
                    );

            }

        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );

        }

    }



    /* =====================================================
       KEYBOARD
    ===================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeModal();

                    if (sidebar) {

                        sidebar.classList.remove(
                            "open"
                        );

                    }

                }

            }
        );

    }



    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initialize() {

        setupFilters();

        setupTableActions();

        setupMobileNavigation();

        setupLogout();

        setupKeyboard();


        if (clearFilterBtn) {

            clearFilterBtn.addEventListener(
                "click",
                resetFilter
            );

        }


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                refresh
            );

        }


        if (closeModalBtn) {

            closeModalBtn.addEventListener(
                "click",
                closeModal
            );

        }


        if (modalDoneBtn) {

            modalDoneBtn.addEventListener(
                "click",
                closeModal
            );

        }


        if (transactionModal) {

            const backdrop =
                transactionModal.querySelector(
                    ".transaction-modal-backdrop"
                );


            if (backdrop) {

                backdrop.addEventListener(
                    "click",
                    closeModal
                );

            }

        }


        await initializeUser();

        await refresh();

    }



    /* =====================================================
       START
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

})();
