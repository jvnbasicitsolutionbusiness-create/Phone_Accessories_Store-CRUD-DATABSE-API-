/* =========================================================
   STOCKFLOW — STOCK IN
   stock-in.js

   Handles:
   - Product loading
   - Supplier loading
   - Stock In form
   - Live transaction preview
   - Recent Stock In transactions
   - Save stock transaction
   - Success / error modal
   - Loading state
   - Connection status
   - User information
   - Mobile sidebar
   - Logout
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const form =
        document.getElementById("stockInForm");

    const productSelect =
        document.getElementById("productSelect");

    const quantityInput =
        document.getElementById("quantity");

    const unitCostInput =
        document.getElementById("unitCost");

    const supplierSelect =
        document.getElementById("supplierSelect");

    const referenceInput =
        document.getElementById("referenceNumber");

    const dateInput =
        document.getElementById("stockInDate");

    const notesInput =
        document.getElementById("notes");

    const clearButton =
        document.getElementById("clearStockInBtn");

    const saveButton =
        document.getElementById("saveStockInBtn");

    const refreshButton =
        document.getElementById("refreshStockInBtn");

    const tableBody =
        document.getElementById("stockInTableBody");

    const connectionBadge =
        document.getElementById("connectionBadge");

    const connectionMessage =
        document.getElementById("connectionMessage");

    const loadingOverlay =
        document.getElementById("stockInLoading");

    const modal =
        document.getElementById("stockInModal");

    const modalIcon =
        document.getElementById("stockInModalIcon");

    const modalTitle =
        document.getElementById("stockInModalTitle");

    const modalMessage =
        document.getElementById("stockInModalMessage");

    const modalOk =
        document.getElementById("stockInModalOk");

    const modalClose =
        document.getElementById("closeStockInModal");

    const mobileMenuButton =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    const logoutButton =
        document.getElementById("logoutBtn");


    /* =====================================================
       PREVIEW ELEMENTS
    ===================================================== */

    const previewProduct =
        document.getElementById("previewProduct");

    const previewSupplier =
        document.getElementById("previewSupplier");

    const previewQuantity =
        document.getElementById("previewQuantity");

    const previewUnitCost =
        document.getElementById("previewUnitCost");

    const previewTotal =
        document.getElementById("previewTotal");

    const previewReference =
        document.getElementById("previewReference");

    const previewDate =
        document.getElementById("previewDate");


    /* =====================================================
       STATE
    ===================================================== */

    let products = [];

    let suppliers = [];

    let transactions = [];

    let isSaving = false;

    let currentUser = null;


    /* =====================================================
       HELPER — PICK VALUE
    ===================================================== */

    function pick(object, ...keys) {

        if (!object) {
            return "";
        }

        for (const key of keys) {

            if (
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
       HELPER — PARSE RESPONSE
    ===================================================== */

    function parseApiResponse(response) {

        if (typeof response === "string") {

            try {
                return JSON.parse(response);
            } catch {
                return response;
            }
        }

        return response;
    }


    /* =====================================================
       HELPER — API CALL
    ===================================================== */

    async function callApi(action, payload = {}) {

        const api =
            window.StockFlowAPI ||
            window.StockflowAPI ||
            window.stockFlowAPI ||
            window.API ||
            window.api;


        /* -----------------------------------------------
           NESTED STOCKFLOW API
        ------------------------------------------------ */

        if (api) {

            if (
                action === "listProducts" &&
                api.products &&
                typeof api.products.list === "function"
            ) {
                return parseApiResponse(
                    await api.products.list(payload)
                );
            }


            if (
                action === "listSuppliers" &&
                api.suppliers &&
                typeof api.suppliers.list === "function"
            ) {
                return parseApiResponse(
                    await api.suppliers.list(payload)
                );
            }


            if (
                action === "stockIn" &&
                api.stockIn &&
                typeof api.stockIn === "function"
            ) {
                return parseApiResponse(
                    await api.stockIn(payload)
                );
            }


            if (
                action === "listTransactions" &&
                api.stockIn &&
                typeof api.stockIn.list === "function"
            ) {
                return parseApiResponse(
                    await api.stockIn.list(payload)
                );
            }


            /* -------------------------------------------
               GENERIC REQUEST METHOD
            ------------------------------------------- */

            if (typeof api.request === "function") {

                try {

                    return parseApiResponse(
                        await api.request({
                            action,
                            ...payload
                        })
                    );

                } catch (firstError) {

                    try {

                        return parseApiResponse(
                            await api.request(
                                action,
                                payload
                            )
                        );

                    } catch {
                        throw firstError;
                    }
                }
            }


            /* -------------------------------------------
               GENERIC POST METHOD
            ------------------------------------------- */

            if (typeof api.post === "function") {

                try {

                    return parseApiResponse(
                        await api.post({
                            action,
                            ...payload
                        })
                    );

                } catch (firstError) {

                    try {

                        return parseApiResponse(
                            await api.post(
                                action,
                                payload
                            )
                        );

                    } catch {
                        throw firstError;
                    }
                }
            }


            /* -------------------------------------------
               GENERIC CALL METHOD
            ------------------------------------------- */

            if (typeof api.call === "function") {

                return parseApiResponse(
                    await api.call(
                        action,
                        payload
                    )
                );
            }


            /* -------------------------------------------
               DIRECT METHODS
            ------------------------------------------- */

            const directMethod =
                api[action];

            if (
                typeof directMethod === "function"
            ) {

                return parseApiResponse(
                    await directMethod.call(
                        api,
                        payload
                    )
                );
            }
        }


        /* =================================================
           GLOBAL API FUNCTIONS
        ================================================= */

        const globalFunctions = [
            "apiRequest",
            "requestAPI",
            "callAPI",
            "sendAPIRequest"
        ];

        for (const functionName of globalFunctions) {

            if (
                typeof window[functionName] ===
                "function"
            ) {

                return parseApiResponse(
                    await window[functionName](
                        action,
                        payload
                    )
                );
            }
        }


        throw new Error(
            "StockFlow API module is not available."
        );
    }


    /* =====================================================
       RESPONSE DATA EXTRACTION
    ===================================================== */

    function extractArray(response, keys = []) {

        response = parseApiResponse(response);

        if (Array.isArray(response)) {
            return response;
        }

        if (!response || typeof response !== "object") {
            return [];
        }

        for (const key of keys) {

            if (Array.isArray(response[key])) {
                return response[key];
            }
        }

        if (
            response.data &&
            Array.isArray(response.data)
        ) {
            return response.data;
        }

        if (
            response.data &&
            typeof response.data === "object"
        ) {

            for (const key of keys) {

                if (
                    Array.isArray(
                        response.data[key]
                    )
                ) {
                    return response.data[key];
                }
            }
        }

        return [];
    }


    /* =====================================================
       RESPONSE SUCCESS CHECK
    ===================================================== */

    function ensureSuccess(response) {

        response = parseApiResponse(response);

        if (
            response &&
            typeof response === "object" &&
            response.success === false
        ) {

            throw new Error(
                response.message ||
                "The server rejected the request."
            );
        }

        return response;
    }


    /* =====================================================
       CONNECTION STATUS
    ===================================================== */

    function setConnected() {

        if (!connectionBadge) {
            return;
        }

        connectionBadge.classList.remove(
            "offline"
        );

        const text =
            connectionBadge.querySelector(
                "span:last-child"
            );

        if (text) {
            text.textContent = "ONLINE";
        }

        if (connectionMessage) {

            connectionMessage.hidden = true;

            connectionMessage.textContent = "";
            connectionMessage.className =
                "connection-message";
        }
    }


    function setOffline(message = "System connection unavailable.") {

        if (!connectionBadge) {
            return;
        }

        connectionBadge.classList.add(
            "offline"
        );

        const text =
            connectionBadge.querySelector(
                "span:last-child"
            );

        if (text) {
            text.textContent = "OFFLINE";
        }

        if (connectionMessage) {

            connectionMessage.hidden = false;

            connectionMessage.className =
                "connection-message error";

            connectionMessage.textContent =
                message;
        }
    }


    function showConnectionMessage(
        message,
        type = "success"
    ) {

        if (!connectionMessage) {
            return;
        }

        connectionMessage.hidden = false;

        connectionMessage.className =
            `connection-message ${type}`;

        connectionMessage.textContent =
            message;
    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading() {

        if (!loadingOverlay) {
            return;
        }

        loadingOverlay.hidden = false;
    }


    function hideLoading() {

        if (!loadingOverlay) {
            return;
        }

        loadingOverlay.hidden = true;
    }


    /* =====================================================
       MODAL
    ===================================================== */

    function openModal(
        success,
        title,
        message
    ) {

        if (!modal) {
            return;
        }

        if (modalIcon) {

            modalIcon.classList.toggle(
                "error",
                !success
            );

            modalIcon.innerHTML =
                success
                    ? '<i class="fa-solid fa-check"></i>'
                    : '<i class="fa-solid fa-xmark"></i>';
        }

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (modalMessage) {
            modalMessage.textContent = message;
        }

        modal.hidden = false;

        document.body.style.overflow =
            "hidden";
    }


    function closeModal() {

        if (!modal) {
            return;
        }

        modal.hidden = true;

        document.body.style.overflow = "";
    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    function openSidebar() {

        if (sidebar) {
            sidebar.classList.add("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.add("show");
        }
    }


    function closeSidebar() {

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove("show");
        }
    }


    if (mobileMenuButton) {

        mobileMenuButton.addEventListener(
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


    if (sidebarOverlay) {

        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );
    }


    /* =====================================================
       USER INFORMATION
    ===================================================== */

    function findUser() {

        const possibleSources = [

            window.StockFlowAuth,

            window.StockFlowAuthUI,

            window.auth,

            window.Auth

        ];

        for (const source of possibleSources) {

            if (!source) {
                continue;
            }

            try {

                if (
                    typeof source.getCurrentUser ===
                    "function"
                ) {

                    const user =
                        source.getCurrentUser();

                    if (user) {
                        return user;
                    }
                }

                if (
                    typeof source.getUser ===
                    "function"
                ) {

                    const user =
                        source.getUser();

                    if (user) {
                        return user;
                    }
                }

            } catch {
                // Continue to localStorage.
            }
        }


        /* ---------------------------------------------
           LOCAL STORAGE FALLBACK
        --------------------------------------------- */

        const storageKeys = [
            "stockflowUser",
            "StockFlowUser",
            "currentUser",
            "user",
            "loggedInUser"
        ];

        for (const key of storageKeys) {

            try {

                const value =
                    localStorage.getItem(key);

                if (!value) {
                    continue;
                }

                const parsed =
                    JSON.parse(value);

                if (parsed) {
                    return parsed;
                }

            } catch {
                // Ignore invalid storage values.
            }
        }

        return null;
    }


    function updateUserUI() {

        currentUser = findUser();

        if (!currentUser) {
            return;
        }

        const name =
            pick(
                currentUser,
                "fullName",
                "fullname",
                "name",
                "username",
                "email"
            ) || "User";

        const role =
            pick(
                currentUser,
                "role",
                "accountRole",
                "account_status",
                "accountStatus"
            ) || "Employee";

        const initials =
            getInitials(name);


        const sidebarName =
            document.getElementById(
                "sidebarUserName"
            );

        const sidebarRole =
            document.getElementById(
                "sidebarUserRole"
            );

        const sidebarAvatar =
            document.getElementById(
                "sidebarAvatar"
            );

        const topbarName =
            document.getElementById(
                "topbarUserName"
            );

        const topbarRole =
            document.getElementById(
                "topbarUserRole"
            );

        const topbarAvatar =
            document.getElementById(
                "topbarAvatar"
            );


        if (sidebarName) {
            sidebarName.textContent = name;
        }

        if (sidebarRole) {
            sidebarRole.textContent = role;
        }

        if (sidebarAvatar) {
            sidebarAvatar.textContent =
                initials;
        }

        if (topbarName) {
            topbarName.textContent = name;
        }

        if (topbarRole) {
            topbarRole.textContent = role;
        }

        if (topbarAvatar) {
            topbarAvatar.textContent =
                initials;
        }
    }


    function getInitials(name) {

        if (!name) {
            return "U";
        }

        const parts =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (parts.length === 1) {
            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                try {

                    if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.logout ===
                        "function"
                    ) {

                        await window.StockFlowAuth.logout();

                        return;
                    }


                    if (
                        window.StockFlowAuthUI &&
                        typeof window.StockFlowAuthUI.logout ===
                        "function"
                    ) {

                        await window.StockFlowAuthUI.logout();

                        return;
                    }


                    localStorage.removeItem(
                        "stockflowUser"
                    );

                    localStorage.removeItem(
                        "StockFlowUser"
                    );

                    localStorage.removeItem(
                        "currentUser"
                    );

                    localStorage.removeItem(
                        "user"
                    );

                    window.location.href =
                        "login.html";

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                    window.location.href =
                        "login.html";
                }
            }
        );
    }


    /* =====================================================
       LOAD PRODUCTS
    ===================================================== */

    async function loadProducts() {

        try {

            const response =
                await callApi(
                    "listProducts"
                );

            ensureSuccess(response);

            products =
                extractArray(
                    response,
                    [
                        "products",
                        "items",
                        "rows",
                        "result"
                    ]
                );

            populateProductSelect();

        } catch (error) {

            console.error(
                "Load products error:",
                error
            );

            products = [];

            populateProductSelect();

            setOffline(
                "Unable to load products from the inventory system."
            );
        }
    }


    function populateProductSelect() {

        if (!productSelect) {
            return;
        }

        const currentValue =
            productSelect.value;

        productSelect.innerHTML =
            '<option value="">Select a product</option>';


        products.forEach(product => {

            const id =
                pick(
                    product,
                    "id",
                    "productId",
                    "product_id",
                    "ID"
                );

            const name =
                pick(
                    product,
                    "name",
                    "productName",
                    "product_name",
                    "ProductName"
                );

            const sku =
                pick(
                    product,
                    "sku",
                    "SKU",
                    "productSku",
                    "product_sku"
                );

            const stock =
                pick(
                    product,
                    "stock",
                    "quantity",
                    "currentStock",
                    "stock_quantity"
                );


            if (!id || !name) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );

            option.value = id;

            option.textContent =
                sku
                    ? `${name} — ${sku}`
                    : name;

            option.dataset.stock =
                stock || 0;

            productSelect.appendChild(
                option
            );
        });


        if (
            currentValue &&
            [...productSelect.options]
                .some(
                    option =>
                        option.value ===
                        String(currentValue)
                )
        ) {
            productSelect.value =
                currentValue;
        }
    }


    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    async function loadSuppliers() {

        try {

            const response =
                await callApi(
                    "listSuppliers"
                );

            ensureSuccess(response);

            suppliers =
                extractArray(
                    response,
                    [
                        "suppliers",
                        "items",
                        "rows",
                        "result"
                    ]
                );

            populateSupplierSelect();

        } catch (error) {

            console.error(
                "Load suppliers error:",
                error
            );

            suppliers = [];

            populateSupplierSelect();
        }
    }


    function populateSupplierSelect() {

        if (!supplierSelect) {
            return;
        }

        const currentValue =
            supplierSelect.value;

        supplierSelect.innerHTML =
            '<option value="">Select supplier</option>';


        suppliers.forEach(supplier => {

            const id =
                pick(
                    supplier,
                    "id",
                    "supplierId",
                    "supplier_id",
                    "ID"
                );

            const name =
                pick(
                    supplier,
                    "name",
                    "supplierName",
                    "supplier_name",
                    "companyName",
                    "company_name"
                );


            if (!id || !name) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );

            option.value = id;

            option.textContent = name;

            supplierSelect.appendChild(
                option
            );
        });


        if (
            currentValue &&
            [...supplierSelect.options]
                .some(
                    option =>
                        option.value ===
                        String(currentValue)
                )
        ) {
            supplierSelect.value =
                currentValue;
        }
    }


    /* =====================================================
       LOAD RECENT TRANSACTIONS
    ===================================================== */

    async function loadTransactions() {

        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-loading">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading stock transactions...
                </td>
            </tr>
        `;


        try {

            const response =
                await callApi(
                    "listTransactions",
                    {
                        type: "stock_in",
                        transactionType: "stock_in"
                    }
                );

            ensureSuccess(response);

            transactions =
                extractArray(
                    response,
                    [
                        "transactions",
                        "stockIn",
                        "stockIns",
                        "items",
                        "rows",
                        "result"
                    ]
                );

            renderTransactions();

            setConnected();

        } catch (error) {

            console.error(
                "Load transactions error:",
                error
            );

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <strong>Unable to load transactions</strong>
                        <span>Check your API connection and try again.</span>
                    </td>
                </tr>
            `;

            setOffline(
                "Unable to connect to the inventory API."
            );
        }
    }


    /* =====================================================
       RENDER TRANSACTIONS
    ===================================================== */

    function renderTransactions() {

        if (!tableBody) {
            return;
        }


        if (!transactions.length) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        <i class="fa-solid fa-box-open"></i>
                        <strong>No stock-in transactions yet</strong>
                        <span>Incoming inventory transactions will appear here.</span>
                    </td>
                </tr>
            `;

            return;
        }


        const sorted =
            [...transactions]
                .sort(
                    (a, b) =>
                        new Date(
                            getTransactionDate(b)
                        ) -
                        new Date(
                            getTransactionDate(a)
                        )
                )
                .slice(0, 20);


        tableBody.innerHTML =
            sorted
                .map(
                    transaction =>
                        createTransactionRow(
                            transaction
                        )
                )
                .join("");
    }


    function createTransactionRow(transaction) {

        const date =
            getTransactionDate(
                transaction
            );

        const product =
            pick(
                transaction,
                "productName",
                "product_name",
                "name",
                "product"
            ) || "Unknown Product";

        const quantity =
            Number(
                pick(
                    transaction,
                    "quantity",
                    "qty",
                    "stockIn",
                    "stock_in"
                )
            ) || 0;

        const supplier =
            pick(
                transaction,
                "supplierName",
                "supplier_name",
                "supplier"
            ) || "—";

        const reference =
            pick(
                transaction,
                "referenceNumber",
                "reference_number",
                "reference",
                "refNo",
                "ref_no"
            ) || "—";

        const user =
            pick(
                transaction,
                "userName",
                "user_name",
                "createdBy",
                "created_by",
                "username",
                "user"
            ) || "—";


        return `
            <tr>

                <td>
                    ${escapeHtml(
                        formatDate(date)
                    )}
                </td>

                <td class="product-name-cell">
                    ${escapeHtml(product)}
                </td>

                <td>
                    <span class="quantity-badge">
                        +${escapeHtml(quantity)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(supplier)}
                </td>

                <td class="reference-cell">
                    ${escapeHtml(reference)}
                </td>

                <td class="user-cell">
                    ${escapeHtml(user)}
                </td>

            </tr>
        `;
    }


    function getTransactionDate(transaction) {

        return pick(
            transaction,
            "date",
            "stockInDate",
            "stock_in_date",
            "transactionDate",
            "transaction_date",
            "createdAt",
            "created_at",
            "timestamp"
        ) || "";
    }


    /* =====================================================
       DATE FORMAT
    ===================================================== */

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
            return String(value);
        }

        return date.toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }


    /* =====================================================
       MONEY FORMAT
    ===================================================== */

    function formatPeso(value) {

        const number =
            Number(value) || 0;

        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 2
            }
        ).format(number);
    }


    /* =====================================================
       LIVE PREVIEW
    ===================================================== */

    function updatePreview() {

        const selectedProduct =
            productSelect
                ? productSelect.options[
                    productSelect.selectedIndex
                ]
                : null;

        const selectedSupplier =
            supplierSelect
                ? supplierSelect.options[
                    supplierSelect.selectedIndex
                ]
                : null;


        const productName =
            selectedProduct &&
            selectedProduct.value
                ? selectedProduct.textContent
                : "No product selected";


        const supplierName =
            selectedSupplier &&
            selectedSupplier.value
                ? selectedSupplier.textContent
                : "No supplier selected";


        const quantity =
            Math.max(
                0,
                Number(
                    quantityInput
                        ? quantityInput.value
                        : 0
                ) || 0
            );


        const unitCost =
            Math.max(
                0,
                Number(
                    unitCostInput
                        ? unitCostInput.value
                        : 0
                ) || 0
            );


        const total =
            quantity * unitCost;


        const reference =
            referenceInput &&
            referenceInput.value.trim()
                ? referenceInput.value.trim()
                : "—";


        const date =
            dateInput &&
            dateInput.value
                ? formatDate(
                    dateInput.value
                )
                : "—";


        if (previewProduct) {
            previewProduct.textContent =
                productName;
        }

        if (previewSupplier) {
            previewSupplier.textContent =
                supplierName;
        }

        if (previewQuantity) {
            previewQuantity.textContent =
                quantity.toLocaleString(
                    "en-PH"
                );
        }

        if (previewUnitCost) {
            previewUnitCost.textContent =
                formatPeso(unitCost);
        }

        if (previewTotal) {
            previewTotal.textContent =
                formatPeso(total);
        }

        if (previewReference) {
            previewReference.textContent =
                reference;
        }

        if (previewDate) {
            previewDate.textContent =
                date;
        }
    }


    /* =====================================================
       CLEAR FORM
    ===================================================== */

    function clearForm() {

        if (!form) {
            return;
        }

        form.reset();

        setDefaultDate();

        updatePreview();

        if (productSelect) {
            productSelect.focus();
        }
    }


    /* =====================================================
       DEFAULT DATE
    ===================================================== */

    function setDefaultDate() {

        if (!dateInput) {
            return;
        }

        if (dateInput.value) {
            return;
        }

        const now =
            new Date();

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
    }


    /* =====================================================
       VALIDATE FORM
    ===================================================== */

    function validateForm() {

        if (!productSelect?.value) {

            showConnectionMessage(
                "Please select a product.",
                "error"
            );

            productSelect?.focus();

            return false;
        }


        const quantity =
            Number(
                quantityInput?.value
            );


        if (
            !Number.isFinite(quantity) ||
            quantity < 1 ||
            !Number.isInteger(quantity)
        ) {

            showConnectionMessage(
                "Quantity must be a whole number greater than 0.",
                "error"
            );

            quantityInput?.focus();

            return false;
        }


        const unitCost =
            Number(
                unitCostInput?.value || 0
            );


        if (
            !Number.isFinite(unitCost) ||
            unitCost < 0
        ) {

            showConnectionMessage(
                "Unit cost cannot be negative.",
                "error"
            );

            unitCostInput?.focus();

            return false;
        }


        if (!dateInput?.value) {

            showConnectionMessage(
                "Please select the stock-in date.",
                "error"
            );

            dateInput?.focus();

            return false;
        }


        return true;
    }


    /* =====================================================
       SAVE STOCK IN
    ===================================================== */

    async function saveStockIn() {

        if (isSaving) {
            return;
        }


        if (!validateForm()) {
            return;
        }


        const quantity =
            Number(
                quantityInput.value
            );

        const unitCost =
            Number(
                unitCostInput.value || 0
            );


        const productId =
            productSelect.value;

        const supplierId =
            supplierSelect?.value || "";

        const referenceNumber =
            referenceInput?.value.trim() || "";

        const stockInDate =
            dateInput.value;

        const notes =
            notesInput?.value.trim() || "";


        const selectedProduct =
            productSelect.options[
                productSelect.selectedIndex
            ];


        const selectedSupplier =
            supplierSelect &&
            supplierSelect.options[
                supplierSelect.selectedIndex
            ];


        const productName =
            selectedProduct
                ? selectedProduct.textContent
                : "";

        const supplierName =
            selectedSupplier &&
            selectedSupplier.value
                ? selectedSupplier.textContent
                : "";


        const payload = {

            productId,

            product_id: productId,

            productName,

            product_name:
                productName,

            quantity,

            qty: quantity,

            unitCost,

            unit_cost:
                unitCost,

            supplierId,

            supplier_id:
                supplierId,

            supplierName,

            supplier_name:
                supplierName,

            referenceNumber,

            reference_number:
                referenceNumber,

            stockInDate,

            stock_in_date:
                stockInDate,

            notes

        };


        isSaving = true;

        if (saveButton) {
            saveButton.disabled = true;

            saveButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Saving...</span>
            `;
        }


        showLoading();


        try {

            const response =
                await callApi(
                    "stockIn",
                    payload
                );


            const result =
                ensureSuccess(
                    response
                );


            hideLoading();

            isSaving = false;


            if (saveButton) {

                saveButton.disabled = false;

                saveButton.innerHTML = `
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>Add Stock</span>
                `;
            }


            setConnected();


            openModal(
                true,
                "Stock Added Successfully",
                "The inventory quantity has been updated and the stock-in transaction has been recorded."
            );


            clearForm();


            await Promise.all([
                loadProducts(),
                loadTransactions()
            ]);


        } catch (error) {

            console.error(
                "Stock In error:",
                error
            );


            hideLoading();

            isSaving = false;


            if (saveButton) {

                saveButton.disabled = false;

                saveButton.innerHTML = `
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>Add Stock</span>
                `;
            }


            setOffline(
                error?.message ||
                "Unable to save the stock-in transaction."
            );


            openModal(
                false,
                "Stock In Failed",
                error?.message ||
                "The stock-in transaction could not be saved. Please check your connection and try again."
            );
        }
    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
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


    /* =====================================================
       EVENT — FORM SUBMIT
    ===================================================== */

    if (form) {

        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                saveStockIn();
            }
        );
    }


    /* =====================================================
       EVENT — CLEAR
    ===================================================== */

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                clearForm();
            }
        );
    }


    /* =====================================================
       EVENT — REFRESH
    ===================================================== */

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                refreshButton.disabled = true;

                refreshButton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Refreshing
                `;


                try {

                    await Promise.all([
                        loadProducts(),
                        loadSuppliers(),
                        loadTransactions()
                    ]);

                } finally {

                    refreshButton.disabled =
                        false;

                    refreshButton.innerHTML = `
                        <i class="fa-solid fa-arrows-rotate"></i>
                        Refresh
                    `;
                }
            }
        );
    }


    /* =====================================================
       EVENT — PREVIEW
    ===================================================== */

    [
        productSelect,
        quantityInput,
        unitCostInput,
        supplierSelect,
        referenceInput,
        dateInput
    ]
        .filter(Boolean)
        .forEach(element => {

            element.addEventListener(
                "input",
                updatePreview
            );

            element.addEventListener(
                "change",
                updatePreview
            );
        });


    /* =====================================================
       EVENT — MODAL
    ===================================================== */

    if (modalOk) {

        modalOk.addEventListener(
            "click",
            closeModal
        );
    }


    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeModal
        );
    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {
                    closeModal();
                }
            }
        );
    }


    /* =====================================================
       ESC KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                if (
                    modal &&
                    !modal.hidden
                ) {
                    closeModal();
                }

                closeSidebar();
            }
        }
    );


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    async function initialize() {

        try {

            updateUserUI();

            setDefaultDate();

            updatePreview();

            setConnected();


            /*
             * Load the initial data.
             * The loading overlay is intentionally NOT
             * shown here, preventing the white flashing
             * effect during page startup.
             */

            await Promise.all([
                loadProducts(),
                loadSuppliers(),
                loadTransactions()
            ]);


            updatePreview();


        } catch (error) {

            console.error(
                "Stock In initialization error:",
                error
            );

            setOffline(
                "Stock In module could not connect to the inventory system."
            );
        }
    }


    initialize();

});
