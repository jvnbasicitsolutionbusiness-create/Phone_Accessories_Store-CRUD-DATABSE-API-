/* ============================================================
   STOCKFLOW | STOCK OUT MODULE
   stock-out.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const user = await StockFlowAuth.requireAuth();
    if (!user) return;

    StockFlowAuth.bindUserUI(user);

    const tableBody =
        document.getElementById("stockOutTableBody");

    const searchInput =
        document.getElementById("stockOutSearch");

    const form =
        document.getElementById("stockOutForm");

    const productSelect =
        document.getElementById("stockOutProduct");

    const quantityInput =
        document.getElementById("stockOutQuantity");

    const reasonInput =
        document.getElementById("stockOutReason");

    const referenceInput =
        document.getElementById("stockOutReference");

    const dateInput =
        document.getElementById("stockOutDate");

    const submitBtn =
        document.getElementById("stockOutSubmit");

    const cancelBtn =
        document.getElementById("stockOutCancel");

    const modal =
        document.getElementById("stockOutModal");

    const openBtn =
        document.getElementById("openStockOutModal");

    const closeBtn =
        document.getElementById("closeStockOutModal");

    let transactions = [];
    let products = [];

    /* ==========================================================
       INITIALIZATION
       ========================================================== */

    setDefaultDate();
    await loadProducts();
    await loadStockOut();

    /* ==========================================================
       EVENTS
       ========================================================== */

    searchInput?.addEventListener("input", () => {
        renderTable(searchInput.value);
    });

    openBtn?.addEventListener("click", () => {
        openModal();
    });

    closeBtn?.addEventListener("click", () => {
        closeModal();
    });

    cancelBtn?.addEventListener("click", () => {
        closeModal();
    });

    modal?.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    productSelect?.addEventListener("change", updateAvailableStock);

    quantityInput?.addEventListener("input", validateQuantity);

    form?.addEventListener("submit", handleStockOut);

    /* ==========================================================
       LOAD PRODUCTS
       ========================================================== */

    async function loadProducts() {

        try {

            const response =
                await StockFlowAPI.getProducts();

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Unable to load products."
                );
            }

            products =
                response.products ||
                response.data ||
                [];

            populateProductSelect();

        } catch (error) {

            console.error(
                "StockFlow products error:",
                error
            );

            showToast(
                error.message ||
                "Unable to load products.",
                "error"
            );

        }

    }

    /* ==========================================================
       PRODUCT DROPDOWN
       ========================================================== */

    function populateProductSelect() {

        if (!productSelect) return;

        productSelect.innerHTML = `
            <option value="">
                Select product
            </option>
        `;

        products.forEach(product => {

            const id =
                product.id ||
                product.ID ||
                product.productId ||
                product.PRODUCT_ID ||
                product.uid;

            const name =
                product.name ||
                product.NAME ||
                product.productName ||
                product.PRODUCT_NAME;

            const stock =
                Number(
                    product.stock ??
                    product.STOCK ??
                    product.quantity ??
                    product.QUANTITY ??
                    product.stockQuantity ??
                    0
                );

            if (!id || !name) return;

            const option =
                document.createElement("option");

            option.value = id;

            option.textContent =
                `${name} — ${stock} available`;

            option.dataset.stock = stock;
            option.dataset.name = name;

            productSelect.appendChild(option);

        });

    }

    /* ==========================================================
       AVAILABLE STOCK
       ========================================================== */

    function updateAvailableStock() {

        if (!productSelect) return;

        const option =
            productSelect.options[
                productSelect.selectedIndex
            ];

        const available =
            Number(
                option?.dataset?.stock || 0
            );

        const stockDisplay =
            document.getElementById(
                "availableStock"
            );

        if (stockDisplay) {

            stockDisplay.textContent =
                available.toLocaleString();

        }

        if (quantityInput) {

            quantityInput.max =
                available;

            quantityInput.value = "";

        }

        validateQuantity();

    }

    /* ==========================================================
       QUANTITY VALIDATION
       ========================================================== */

    function validateQuantity() {

        if (!quantityInput || !productSelect) {
            return;
        }

        const option =
            productSelect.options[
                productSelect.selectedIndex
            ];

        const available =
            Number(
                option?.dataset?.stock || 0
            );

        const quantity =
            Number(
                quantityInput.value || 0
            );

        const warning =
            document.getElementById(
                "stockOutQuantityWarning"
            );

        if (
            quantity > 0 &&
            quantity > available
        ) {

            if (warning) {

                warning.textContent =
                    `Only ${available} unit(s) available.`;

                warning.hidden = false;

            }

            if (submitBtn) {
                submitBtn.disabled = true;
            }

            return;

        }

        if (warning) {
            warning.hidden = true;
        }

        if (submitBtn) {
            submitBtn.disabled =
                !productSelect.value ||
                quantity <= 0;
        }

    }

    /* ==========================================================
       LOAD STOCK OUT TRANSACTIONS
       ========================================================== */

    async function loadStockOut() {

        setLoading(true);

        try {

            const response =
                await getStockOutAPI();

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Unable to load stock-out records."
                );
            }

            transactions =
                response.stockOut ||
                response.transactions ||
                response.data ||
                [];

            renderTable();

            updateSummary();

        } catch (error) {

            console.error(
                "Stock-out loading error:",
                error
            );

            if (tableBody) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-state">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <strong>
                                    Unable to load stock-out records
                                </strong>
                                <small>
                                    ${escapeHTML(error.message)}
                                </small>
                            </div>
                        </td>
                    </tr>
                `;

            }

            showToast(
                error.message ||
                "Unable to load stock-out records.",
                "error"
            );

        } finally {

            setLoading(false);

        }

    }

    /* ==========================================================
       API COMPATIBILITY LAYER
       ========================================================== */

    async function getStockOutAPI() {

        if (
            typeof StockFlowAPI.stockOut ===
            "function"
        ) {

            return await StockFlowAPI.stockOut();

        }

        if (
            typeof StockFlowAPI.getStockOut ===
            "function"
        ) {

            return await StockFlowAPI.getStockOut();

        }

        if (
            typeof StockFlowAPI.getStockOutTransactions ===
            "function"
        ) {

            return await StockFlowAPI
                .getStockOutTransactions();

        }

        if (
            typeof StockFlowAPI.inventoryTransactions ===
            "function"
        ) {

            return await StockFlowAPI
                .inventoryTransactions(
                    "OUT"
                );

        }

        throw new Error(
            "Stock-out API method is not available in API.js."
        );

    }

    /* ==========================================================
       CREATE STOCK OUT
       ========================================================== */

    async function handleStockOut(event) {

        event.preventDefault();

        if (!productSelect) return;

        const selectedOption =
            productSelect.options[
                productSelect.selectedIndex
            ];

        const productId =
            productSelect.value;

        const productName =
            selectedOption?.dataset?.name ||
            selectedOption?.textContent ||
            "";

        const quantity =
            Number(
                quantityInput?.value || 0
            );

        const reason =
            String(
                reasonInput?.value || ""
            ).trim();

        const reference =
            String(
                referenceInput?.value || ""
            ).trim();

        const date =
            dateInput?.value ||
            new Date().toISOString();

        const available =
            Number(
                selectedOption?.dataset?.stock || 0
            );

        /* ------------------------------------------------------
           VALIDATION
           ------------------------------------------------------ */

        if (!productId) {

            showToast(
                "Please select a product.",
                "error"
            );

            return;

        }

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {

            showToast(
                "Please enter a valid quantity.",
                "error"
            );

            return;

        }

        if (quantity > available) {

            showToast(
                `Insufficient stock. Only ${available} unit(s) available.`,
                "error"
            );

            return;

        }

        /* ------------------------------------------------------
           CONFIRMATION
           ------------------------------------------------------ */

        const confirmed =
            window.confirm(
                `Stock Out Confirmation\n\n` +
                `Product: ${productName}\n` +
                `Quantity: ${quantity}\n` +
                `Reason: ${reason || "Not specified"}\n\n` +
                `Continue?`
            );

        if (!confirmed) return;

        setSubmitting(true);

        try {

            const payload = {

                action:
                    "stockOut",

                productId:
                    productId,

                productID:
                    productId,

                productName:
                    productName,

                quantity:
                    quantity,

                reason:
                    reason,

                reference:
                    reference,

                date:
                    date,

                type:
                    "OUT",

                transactionType:
                    "STOCK_OUT",

                userId:
                    user.uid ||
                    user.id ||
                    "",

                username:
                    user.username ||
                    user.email ||
                    "",

                performedBy:
                    user.name ||
                    user.username ||
                    user.email ||
                    ""

            };

            const response =
                await saveStockOutAPI(
                    payload
                );

            if (!response?.success) {

                throw new Error(
                    response?.message ||
                    "Stock-out transaction failed."
                );

            }

            showToast(
                "Stock-out recorded successfully.",
                "success"
            );

            closeModal();

            await loadProducts();
            await loadStockOut();

        } catch (error) {

            console.error(
                "Stock-out error:",
                error
            );

            showToast(
                error.message ||
                "Unable to save stock-out transaction.",
                "error"
            );

        } finally {

            setSubmitting(false);

        }

    }

    /* ==========================================================
       SAVE STOCK OUT API
       ========================================================== */

    async function saveStockOutAPI(payload) {

        if (
            typeof StockFlowAPI.stockOut ===
            "function"
        ) {

            return await StockFlowAPI.stockOut(
                payload
            );

        }

        if (
            typeof StockFlowAPI.createStockOut ===
            "function"
        ) {

            return await StockFlowAPI.createStockOut(
                payload
            );

        }

        if (
            typeof StockFlowAPI.addStockOut ===
            "function"
        ) {

            return await StockFlowAPI.addStockOut(
                payload
            );

        }

        if (
            typeof StockFlowAPI.saveStockOut ===
            "function"
        ) {

            return await StockFlowAPI.saveStockOut(
                payload
            );

        }

        if (
            typeof StockFlowAPI.inventoryTransaction ===
            "function"
        ) {

            return await StockFlowAPI
                .inventoryTransaction(
                    payload
                );

        }

        throw new Error(
            "Stock-out save API method is not available in API.js."
        );

    }

    /* ==========================================================
       RENDER TABLE
       ========================================================== */

    function renderTable(filter = "") {

        if (!tableBody) return;

        const query =
            String(filter || "")
                .trim()
                .toLowerCase();

        const filtered =
            transactions.filter(item => {

                if (!query) return true;

                return [

                    item.id,
                    item.ID,
                    item.productId,
                    item.PRODUCT_ID,
                    item.productName,
                    item.PRODUCT_NAME,
                    item.reason,
                    item.REASON,
                    item.reference,
                    item.REFERENCE,
                    item.username,
                    item.USERNAME,
                    item.performedBy,
                    item.PERFORMED_BY

                ]
                .some(value =>
                    String(value ?? "")
                        .toLowerCase()
                        .includes(query)
                );

            });

        if (!filtered.length) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="fa-solid fa-box-open"></i>
                            <strong>
                                No stock-out records found
                            </strong>
                            <small>
                                Stock-out transactions will appear here.
                            </small>
                        </div>
                    </td>
                </tr>
            `;

            return;

        }

        tableBody.innerHTML =
            filtered.map(
                (item, index) => {

                    const id =
                        item.id ||
                        item.ID ||
                        item.transactionId ||
                        item.TRANSACTION_ID ||
                        `OUT-${index + 1}`;

                    const product =
                        item.productName ||
                        item.PRODUCT_NAME ||
                        item.name ||
                        item.NAME ||
                        "Unknown product";

                    const quantity =
                        Number(
                            item.quantity ??
                            item.QUANTITY ??
                            item.stockOut ??
                            item.STOCK_OUT ??
                            0
                        );

                    const reason =
                        item.reason ||
                        item.REASON ||
                        "—";

                    const reference =
                        item.reference ||
                        item.REFERENCE ||
                        "—";

                    const performedBy =
                        item.performedBy ||
                        item.PERFORMED_BY ||
                        item.username ||
                        item.USERNAME ||
                        "—";

                    const date =
                        item.date ||
                        item.DATE ||
                        item.createdAt ||
                        item.CREATED_AT ||
                        "";

                    return `
                        <tr data-id="${escapeHTML(id)}">

                            <td>
                                <span class="transaction-id">
                                    ${escapeHTML(id)}
                                </span>
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(product)}
                                </strong>
                            </td>

                            <td>
                                <span class="stock-out-quantity">
                                    -${quantity.toLocaleString()}
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(reason)}
                            </td>

                            <td>
                                ${escapeHTML(reference)}
                            </td>

                            <td>
                                ${escapeHTML(performedBy)}
                            </td>

                            <td>
                                ${formatDate(date)}
                            </td>

                            <td>
                                <span class="status-badge status-success">
                                    COMPLETED
                                </span>
                            </td>

                        </tr>
                    `;

                }
            ).join("");

    }

    /* ==========================================================
       SUMMARY
       ========================================================== */

    function updateSummary() {

        const totalTransactions =
            transactions.length;

        const totalUnits =
            transactions.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.quantity ??
                        item.QUANTITY ??
                        0
                    ),
                0
            );

        const transactionCount =
            document.getElementById(
                "stockOutTransactionCount"
            );

        const unitCount =
            document.getElementById(
                "stockOutUnitCount"
            );

        if (transactionCount) {

            transactionCount.textContent =
                totalTransactions.toLocaleString();

        }

        if (unitCount) {

            unitCount.textContent =
                totalUnits.toLocaleString();

        }

    }

    /* ==========================================================
       MODAL
       ========================================================== */

    function openModal() {

        modal?.classList.add("show");
        modal?.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

        setDefaultDate();

        setTimeout(
            () =>
                productSelect?.focus(),
            100
        );

    }

    function closeModal() {

        modal?.classList.remove("show");
        modal?.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );

        form?.reset();

        updateAvailableStock();

        if (submitBtn) {
            submitBtn.disabled = true;
        }

    }

    /* ==========================================================
       DEFAULT DATE
       ========================================================== */

    function setDefaultDate() {

        if (!dateInput) return;

        const today =
            new Date();

        const localDate =
            new Date(
                today.getTime() -
                today.getTimezoneOffset() *
                60000
            )
            .toISOString()
            .split("T")[0];

        dateInput.value =
            localDate;

    }

    /* ==========================================================
       LOADING
       ========================================================== */

    function setLoading(loading) {

        if (!tableBody) return;

        if (loading) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="loading-state">
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            <span>
                                Loading stock-out records...
                            </span>
                        </div>
                    </td>
                </tr>
            `;

        }

    }

    /* ==========================================================
       SUBMITTING
       ========================================================== */

    function setSubmitting(submitting) {

        if (!submitBtn) return;

        submitBtn.disabled =
            submitting;

        if (submitting) {

            submitBtn.dataset.originalText =
                submitBtn.innerHTML;

            submitBtn.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Processing...
            `;

        } else {

            submitBtn.innerHTML =
                submitBtn.dataset.originalText ||
                `
                    <i class="fa-solid fa-arrow-up"></i>
                    Record Stock Out
                `;

        }

    }

    /* ==========================================================
       TOAST
       ========================================================== */

    function showToast(
        message,
        type = "info"
    ) {

        if (
            typeof window.showToast ===
            "function" &&
            window.showToast !== showToast
        ) {

            window.showToast(
                message,
                type
            );

            return;

        }

        let container =
            document.getElementById(
                "toastContainer"
            );

        if (!container) {

            container =
                document.createElement(
                    "div"
                );

            container.id =
                "toastContainer";

            container.className =
                "toast-container";

            document.body.appendChild(
                container
            );

        }

        const toast =
            document.createElement(
                "div"
            );

        toast.className =
            `toast toast-${type}`;

        toast.innerHTML = `
            <i class="fa-solid ${
                type === "success"
                    ? "fa-circle-check"
                    : type === "error"
                        ? "fa-circle-exclamation"
                        : "fa-circle-info"
            }"></i>

            <span>
                ${escapeHTML(message)}
            </span>
        `;

        container.appendChild(
            toast
        );

        setTimeout(() => {

            toast.classList.add(
                "toast-hide"
            );

            setTimeout(
                () => toast.remove(),
                300
            );

        }, 4000);

    }

    /* ==========================================================
       DATE FORMATTER
       ========================================================== */

    function formatDate(value) {

        if (!value) return "—";

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return escapeHTML(
                String(value)
            );

        }

        return date.toLocaleString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );

    }

    /* ==========================================================
       HTML ESCAPE
       ========================================================== */

    function escapeHTML(value) {

        return String(
            value ?? ""
        )
        .replace(
            /[&<>"']/g,
            char =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[char]
        );

    }

});
