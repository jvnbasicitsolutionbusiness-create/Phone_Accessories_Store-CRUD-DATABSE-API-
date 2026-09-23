/* =========================================================
   STOCKFLOW — STOCK OUT MODULE
   stock-out.js

   Handles:
   - Product loading
   - Available stock
   - Live transaction preview
   - Quantity validation
   - Stock-out submission
   - Recent transactions
   - Success/error modal
   - Loading overlay
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

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const logoutBtn =
        document.getElementById("logoutBtn");


    const connectionBadge =
        document.getElementById("connectionBadge");

    const connectionMessage =
        document.getElementById("connectionMessage");


    const stockOutForm =
        document.getElementById("stockOutForm");

    const productSelect =
        document.getElementById("productSelect");

    const quantityInput =
        document.getElementById("quantity");

    const reasonSelect =
        document.getElementById("stockOutReason");

    const referenceInput =
        document.getElementById("referenceNumber");

    const recipientInput =
        document.getElementById("recipient");

    const dateInput =
        document.getElementById("stockOutDate");

    const notesInput =
        document.getElementById("notes");


    const availableStockBox =
        document.getElementById("availableStockBox");

    const availableStock =
        document.getElementById("availableStock");

    const stockAvailabilityHelp =
        document.getElementById(
            "stockAvailabilityHelp"
        );

    const quantityHelp =
        document.getElementById("quantityHelp");


    const clearBtn =
        document.getElementById(
            "clearStockOutBtn"
        );

    const saveBtn =
        document.getElementById(
            "saveStockOutBtn"
        );

    const refreshBtn =
        document.getElementById(
            "refreshStockOutBtn"
        );


    const tableBody =
        document.getElementById(
            "stockOutTableBody"
        );


    /* =====================================================
       PREVIEW ELEMENTS
    ===================================================== */

    const previewProduct =
        document.getElementById(
            "previewProduct"
        );

    const previewAvailable =
        document.getElementById(
            "previewAvailable"
        );

    const previewQuantity =
        document.getElementById(
            "previewQuantity"
        );

    const previewRemaining =
        document.getElementById(
            "previewRemaining"
        );

    const previewReason =
        document.getElementById(
            "previewReason"
        );

    const previewRecipient =
        document.getElementById(
            "previewRecipient"
        );

    const previewReference =
        document.getElementById(
            "previewReference"
        );

    const previewDate =
        document.getElementById(
            "previewDate"
        );


    /* =====================================================
       USER ELEMENTS
    ===================================================== */

    const sidebarAvatar =
        document.getElementById(
            "sidebarAvatar"
        );

    const sidebarUserName =
        document.getElementById(
            "sidebarUserName"
        );

    const sidebarUserRole =
        document.getElementById(
            "sidebarUserRole"
        );

    const topbarAvatar =
        document.getElementById(
            "topbarAvatar"
        );

    const topbarUserName =
        document.getElementById(
            "topbarUserName"
        );

    const topbarUserRole =
        document.getElementById(
            "topbarUserRole"
        );


    /* =====================================================
       MODAL
    ===================================================== */

    const modal =
        document.getElementById(
            "stockOutModal"
        );

    const modalClose =
        document.getElementById(
            "closeStockOutModal"
        );

    const modalOk =
        document.getElementById(
            "stockOutModalOk"
        );

    const modalIcon =
        document.getElementById(
            "stockOutModalIcon"
        );

    const modalTitle =
        document.getElementById(
            "stockOutModalTitle"
        );

    const modalMessage =
        document.getElementById(
            "stockOutModalMessage"
        );


    /* =====================================================
       LOADING
    ===================================================== */

    const loadingOverlay =
        document.getElementById(
            "stockOutLoading"
        );


    /* =====================================================
       STATE
    ===================================================== */

    let products = [];

    let transactions = [];

    let selectedProduct = null;

    let isSaving = false;


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    init();


    async function init() {

        setDefaultDate();

        initializeUser();

        initializeConnection();

        initializeSidebar();

        initializeFormEvents();

        updatePreview();

        await loadInitialData();

    }


    /* =====================================================
       DEFAULT DATE
    ===================================================== */

    function setDefaultDate() {

        if (!dateInput) {
            return;
        }

        if (!dateInput.value) {

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

    }


    /* =====================================================
       USER
    ===================================================== */

    function initializeUser() {

        let user = null;

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth
                    .getCurrentUser === "function"
            ) {

                user =
                    window.StockFlowAuth
                        .getCurrentUser();

            }

        } catch (error) {

            console.warn(
                "Could not read StockFlowAuth:",
                error
            );

        }


        if (!user) {

            try {

                const keys = [
                    "stockflowUser",
                    "currentUser",
                    "user",
                    "loggedInUser"
                ];

                for (const key of keys) {

                    const raw =
                        localStorage.getItem(key);

                    if (!raw) {
                        continue;
                    }

                    try {

                        user =
                            JSON.parse(raw);

                    } catch {

                        user = {
                            name: raw
                        };

                    }

                    if (user) {
                        break;
                    }

                }

            } catch (error) {

                console.warn(
                    "Could not read user from localStorage:",
                    error
                );

            }

        }


        const name =
            pick(
                user,
                "name",
                "fullName",
                "full_name",
                "username",
                "displayName",
                "email"
            ) || "StockFlow User";


        const role =
            pick(
                user,
                "role",
                "accountStatus",
                "account_status",
                "position"
            ) || "Employee";


        const initials =
            getInitials(name);


        setText(
            sidebarUserName,
            name
        );

        setText(
            topbarUserName,
            name
        );

        setText(
            sidebarUserRole,
            role
        );

        setText(
            topbarUserRole,
            role
        );

        setText(
            sidebarAvatar,
            initials
        );

        setText(
            topbarAvatar,
            initials
        );

    }


    function getInitials(name) {

        if (!name) {
            return "SF";
        }

        const parts =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (!parts.length) {
            return "SF";
        }

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
       CONNECTION
    ===================================================== */

    function initializeConnection() {

        setConnection(
            "online",
            "ONLINE"
        );

    }


    function setConnection(
        state,
        label
    ) {

        if (!connectionBadge) {
            return;
        }

        connectionBadge.classList.remove(
            "offline",
            "connecting"
        );

        if (state === "offline") {

            connectionBadge.classList.add(
                "offline"
            );

        } else if (state === "connecting") {

            connectionBadge.classList.add(
                "connecting"
            );

        }

        const labelElement =
            connectionBadge.querySelector(
                "span:last-child"
            );

        if (labelElement) {

            labelElement.textContent =
                label || "ONLINE";

        }

    }


    function showConnectionMessage(
        message,
        type = "error"
    ) {

        if (!connectionMessage) {
            return;
        }

        connectionMessage.textContent =
            message;

        connectionMessage.className =
            `connection-message ${type}`;

        connectionMessage.hidden = false;

    }


    function hideConnectionMessage() {

        if (!connectionMessage) {
            return;
        }

        connectionMessage.hidden = true;

        connectionMessage.textContent = "";

        connectionMessage.className =
            "connection-message";

    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function initializeSidebar() {

        if (mobileMenuBtn) {

            mobileMenuBtn.addEventListener(
                "click",
                toggleSidebar
            );

        }


        if (sidebarOverlay) {

            sidebarOverlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    window.innerWidth <= 960
                ) {

                    closeSidebar();

                }

            }
        );

    }


    function toggleSidebar() {

        if (!sidebar) {
            return;
        }

        const isOpen =
            sidebar.classList.toggle("open");

        if (sidebarOverlay) {

            sidebarOverlay.classList.toggle(
                "active",
                isOpen
            );

        }

        if (mobileMenuBtn) {

            mobileMenuBtn.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        }

    }


    function closeSidebar() {

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove(
                "active"
            );
        }

        if (mobileMenuBtn) {

            mobileMenuBtn.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    /* =====================================================
       FORM EVENTS
    ===================================================== */

    function initializeFormEvents() {

        if (stockOutForm) {

            stockOutForm.addEventListener(
                "submit",
                handleSubmit
            );

        }


        if (productSelect) {

            productSelect.addEventListener(
                "change",
                handleProductChange
            );

        }


        if (quantityInput) {

            quantityInput.addEventListener(
                "input",
                handleQuantityChange
            );

        }


        if (reasonSelect) {

            reasonSelect.addEventListener(
                "change",
                updatePreview
            );

        }


        if (referenceInput) {

            referenceInput.addEventListener(
                "input",
                updatePreview
            );

        }


        if (recipientInput) {

            recipientInput.addEventListener(
                "input",
                updatePreview
            );

        }


        if (dateInput) {

            dateInput.addEventListener(
                "change",
                updatePreview
            );

        }


        if (clearBtn) {

            clearBtn.addEventListener(
                "click",
                clearForm
            );

        }


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                async () => {

                    await loadTransactions();

                }
            );

        }


        if (modalClose) {

            modalClose.addEventListener(
                "click",
                closeModal
            );

        }


        if (modalOk) {

            modalOk.addEventListener(
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


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    modal &&
                    !modal.hidden
                ) {

                    closeModal();

                }

            }
        );


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                handleLogout
            );

        }

    }


    /* =====================================================
       LOAD INITIAL DATA
    ===================================================== */

    async function loadInitialData() {

        setConnection(
            "connecting",
            "CONNECTING"
        );

        hideConnectionMessage();

        try {

            await Promise.all([
                loadProducts(),
                loadTransactions()
            ]);

            setConnection(
                "online",
                "ONLINE"
            );

        } catch (error) {

            console.error(
                "Stock Out initialization failed:",
                error
            );

            setConnection(
                "offline",
                "OFFLINE"
            );

            showConnectionMessage(
                error.message ||
                "Unable to connect to the inventory service.",
                "error"
            );

        }

    }


    /* =====================================================
       API ADAPTER
    ===================================================== */

    async function apiAction(
        action,
        payload = {}
    ) {

        const api =
            window.StockFlowAPI ||
            window.stockFlowAPI ||
            window.StockFlowApi ||
            window.API;


        if (!api) {

            throw new Error(
                "StockFlow API is not available. Please check API.js."
            );

        }


        /*
         * Preferred nested API methods.
         */

        if (
            action === "listProducts" &&
            api.products &&
            typeof api.products.list === "function"
        ) {

            return await api.products.list(
                payload
            );

        }


        if (
            action === "stockOut" &&
            api.stockOut &&
            typeof api.stockOut === "function"
        ) {

            return await api.stockOut(
                payload
            );

        }


        if (
            action === "stockOut" &&
            api.inventory &&
            typeof api.inventory.stockOut === "function"
        ) {

            return await api.inventory.stockOut(
                payload
            );

        }


        if (
            action === "listTransactions" &&
            api.transactions &&
            typeof api.transactions.list === "function"
        ) {

            return await api.transactions.list(
                payload
            );

        }


        /*
         * Common direct methods.
         */

        const directMethods = {

            listProducts: [
                "listProducts",
                "getProducts"
            ],

            stockOut: [
                "stockOut",
                "releaseStock"
            ],

            listTransactions: [
                "listTransactions",
                "getTransactions"
            ]

        };


        const names =
            directMethods[action] || [];


        for (const methodName of names) {

            if (
                typeof api[methodName] ===
                "function"
            ) {

                return await api[methodName](
                    payload
                );

            }

        }


        /*
         * Generic API request methods.
         */

        if (
            typeof api.request ===
            "function"
        ) {

            try {

                return await api.request({
                    action,
                    ...payload
                });

            } catch (firstError) {

                return await api.request(
                    action,
                    payload
                );

            }

        }


        if (
            typeof api.post ===
            "function"
        ) {

            return await api.post(
                action,
                payload
            );

        }


        if (
            typeof api.call ===
            "function"
        ) {

            return await api.call(
                action,
                payload
            );

        }


        if (
            typeof window.apiRequest ===
            "function"
        ) {

            return await window.apiRequest(
                action,
                payload
            );

        }


        throw new Error(
            `No API method found for "${action}".`
        );

    }


    /* =====================================================
       LOAD PRODUCTS
    ===================================================== */

    async function loadProducts() {

        try {

            const response =
                await apiAction(
                    "listProducts"
                );


            const data =
                extractData(response);


            products =
                Array.isArray(data)
                    ? data
                    : [];


            populateProductSelect();

            updateSelectedProduct();


        } catch (error) {

            console.error(
                "Failed to load products:",
                error
            );

            if (productSelect) {

                productSelect.innerHTML = `
                    <option value="">
                        Unable to load products
                    </option>
                `;

            }

            throw error;

        }

    }


    /* =====================================================
       PRODUCT SELECT
    ===================================================== */

    function populateProductSelect() {

        if (!productSelect) {
            return;
        }

        productSelect.innerHTML = `
            <option value="">
                Select a product
            </option>
        `;


        products.forEach(product => {

            const id =
                getProductId(product);

            const name =
                getProductName(product);

            const sku =
                getProductSku(product);

            const stock =
                getProductStock(product);


            if (
                id === null ||
                id === undefined ||
                !name
            ) {

                return;

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(id);


            option.textContent =
                sku
                    ? `${name} — ${sku}`
                    : name;


            option.dataset.stock =
                String(stock);


            productSelect.appendChild(
                option
            );

        });

    }


    /* =====================================================
       PRODUCT CHANGE
    ===================================================== */

    function handleProductChange() {

        updateSelectedProduct();

        updatePreview();

    }


    function updateSelectedProduct() {

        selectedProduct = null;

        if (
            !productSelect ||
            !productSelect.value
        ) {

            setAvailableStock(0);

            return;

        }


        selectedProduct =
            products.find(
                product =>
                    String(
                        getProductId(product)
                    ) ===
                    String(
                        productSelect.value
                    )
            ) || null;


        const stock =
            selectedProduct
                ? getProductStock(
                    selectedProduct
                )
                : 0;


        setAvailableStock(stock);


        if (quantityInput) {

            quantityInput.max =
                String(stock);

        }


        if (selectedProduct) {

            if (stock > 0) {

                if (stockAvailabilityHelp) {

                    stockAvailabilityHelp.textContent =
                        `Available stock: ${formatNumber(stock)} units.`;

                }

            } else {

                if (stockAvailabilityHelp) {

                    stockAvailabilityHelp.textContent =
                        "This product is currently out of stock.";

                }

            }

        } else {

            if (stockAvailabilityHelp) {

                stockAvailabilityHelp.textContent =
                    "Select a product to view available stock.";

            }

        }


        validateQuantity();

    }


    /* =====================================================
       AVAILABLE STOCK
    ===================================================== */

    function setAvailableStock(value) {

        const stock =
            Number(value) || 0;


        if (availableStock) {

            availableStock.textContent =
                formatNumber(stock);

        }


        if (availableStockBox) {

            availableStockBox.classList.remove(
                "low-stock",
                "out-of-stock"
            );


            if (stock <= 0) {

                availableStockBox.classList.add(
                    "out-of-stock"
                );

            } else if (stock <= 10) {

                availableStockBox.classList.add(
                    "low-stock"
                );

            }

        }


        if (previewAvailable) {

            previewAvailable.textContent =
                `Available stock: ${formatNumber(stock)}`;

        }

    }


    /* =====================================================
       QUANTITY
    ===================================================== */

    function handleQuantityChange() {

        validateQuantity();

        updatePreview();

    }


    function validateQuantity() {

        if (!quantityInput) {
            return true;
        }


        const quantity =
            Number(
                quantityInput.value
            ) || 0;


        const stock =
            selectedProduct
                ? getProductStock(
                    selectedProduct
                )
                : 0;


        quantityInput.classList.remove(
            "invalid"
        );


        if (quantityHelp) {

            quantityHelp.classList.remove(
                "quantity-error"
            );

        }


        if (!quantity) {

            return false;

        }


        if (quantity < 1) {

            markQuantityInvalid(
                "Quantity must be at least 1."
            );

            return false;

        }


        if (quantity > stock) {

            markQuantityInvalid(
                `Only ${formatNumber(stock)} unit(s) available.`
            );

            return false;

        }


        return true;

    }


    function markQuantityInvalid(
        message
    ) {

        if (quantityInput) {

            quantityInput.classList.add(
                "invalid"
            );

        }


        const wrapper =
            quantityInput
                ? quantityInput.closest(
                    ".input-wrapper"
                )
                : null;


        if (wrapper) {

            wrapper.classList.add(
                "invalid"
            );

        }


        if (quantityHelp) {

            quantityHelp.textContent =
                message;

            quantityHelp.classList.add(
                "quantity-error"
            );

        }

    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function updatePreview() {

        const product =
            selectedProduct;


        const quantity =
            Number(
                quantityInput
                    ? quantityInput.value
                    : 0
            ) || 0;


        const stock =
            product
                ? getProductStock(product)
                : 0;


        const remaining =
            Math.max(
                stock - quantity,
                0
            );


        const reasonText =
            getSelectedOptionText(
                reasonSelect
            );


        const recipient =
            recipientInput &&
            recipientInput.value.trim()
                ? recipientInput.value.trim()
                : "—";


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


        setText(
            previewProduct,
            product
                ? getProductName(product)
                : "No product selected"
        );


        setText(
            previewAvailable,
            product
                ? `Available stock: ${formatNumber(stock)}`
                : "Available stock: 0"
        );


        setText(
            previewQuantity,
            formatNumber(quantity)
        );


        setText(
            previewRemaining,
            formatNumber(remaining)
        );


        setText(
            previewReason,
            reasonText || "—"
        );


        setText(
            previewRecipient,
            recipient
        );


        setText(
            previewReference,
            reference
        );


        setText(
            previewDate,
            date
        );

    }


    /* =====================================================
       SUBMIT
    ===================================================== */

    async function handleSubmit(event) {

        event.preventDefault();


        if (isSaving) {
            return;
        }


        hideConnectionMessage();


        if (!stockOutForm) {
            return;
        }


        if (
            !stockOutForm.checkValidity()
        ) {

            stockOutForm.reportValidity();

            return;

        }


        if (!selectedProduct) {

            showConnectionMessage(
                "Please select a product.",
                "error"
            );

            return;

        }


        const validQuantity =
            validateQuantity();


        if (!validQuantity) {

            showConnectionMessage(
                "Please enter a valid quantity that does not exceed the available stock.",
                "error"
            );

            quantityInput?.focus();

            return;

        }


        const quantity =
            Number(
                quantityInput.value
            );


        const stock =
            getProductStock(
                selectedProduct
            );


        if (quantity > stock) {

            showConnectionMessage(
                `You cannot release ${formatNumber(quantity)} unit(s). Only ${formatNumber(stock)} unit(s) are available.`,
                "error"
            );

            return;

        }


        const payload = {

            productId:
                getProductId(
                    selectedProduct
                ),

            product:
                getProductId(
                    selectedProduct
                ),

            quantity,

            reason:
                reasonSelect
                    ? reasonSelect.value
                    : "",

            referenceNumber:
                referenceInput
                    ? referenceInput.value.trim()
                    : "",

            reference:
                referenceInput
                    ? referenceInput.value.trim()
                    : "",

            recipient:
                recipientInput
                    ? recipientInput.value.trim()
                    : "",

            stockOutDate:
                dateInput
                    ? dateInput.value
                    : "",

            date:
                dateInput
                    ? dateInput.value
                    : "",

            notes:
                notesInput
                    ? notesInput.value.trim()
                    : "",

            productName:
                getProductName(
                    selectedProduct
                )

        };


        isSaving = true;

        setSavingState(true);

        showLoading();


        try {

            const response =
                await apiAction(
                    "stockOut",
                    payload
                );


            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Stock Out transaction failed."
                );

            }


            hideLoading();

            setSavingState(false);

            isSaving = false;


            showModal(
                true,
                "Stock Released Successfully",
                response?.message ||
                "The inventory has been updated successfully."
            );


            await refreshAfterTransaction();


        } catch (error) {

            console.error(
                "Stock Out failed:",
                error
            );


            hideLoading();

            setSavingState(false);

            isSaving = false;


            showModal(
                false,
                "Unable to Release Stock",
                error.message ||
                "The stock transaction could not be completed."
            );

        }

    }


    /* =====================================================
       REFRESH AFTER SAVE
    ===================================================== */

    async function refreshAfterTransaction() {

        try {

            await Promise.all([
                loadProducts(),
                loadTransactions()
            ]);

            clearForm(false);

        } catch (error) {

            console.error(
                "Refresh after transaction failed:",
                error
            );

        }

    }


    /* =====================================================
       CLEAR FORM
    ===================================================== */

    function clearForm(
        showMessage = true
    ) {

        if (!stockOutForm) {
            return;
        }


        stockOutForm.reset();


        selectedProduct = null;


        setDefaultDate();


        setAvailableStock(0);


        if (quantityInput) {

            quantityInput.classList.remove(
                "invalid"
            );

        }


        const quantityWrapper =
            quantityInput
                ? quantityInput.closest(
                    ".input-wrapper"
                )
                : null;


        if (quantityWrapper) {

            quantityWrapper.classList.remove(
                "invalid"
            );

        }


        if (quantityHelp) {

            quantityHelp.classList.remove(
                "quantity-error"
            );

            quantityHelp.textContent =
                "Quantity must not exceed available stock.";

        }


        if (stockAvailabilityHelp) {

            stockAvailabilityHelp.textContent =
                "Select a product to view available stock.";

        }


        updatePreview();


        if (showMessage) {

            hideConnectionMessage();

        }

    }


    /* =====================================================
       LOAD TRANSACTIONS
    ===================================================== */

    async function loadTransactions() {

        if (!tableBody) {
            return;
        }


        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-loading"
                >
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading stock transactions...
                </td>
            </tr>
        `;


        try {

            const response =
                await apiAction(
                    "listTransactions",
                    {
                        type: "STOCK_OUT",
                        transactionType: "STOCK_OUT",
                        limit: 20
                    }
                );


            const data =
                extractData(response);


            let list =
                Array.isArray(data)
                    ? data
                    : [];


            /*
             * Some APIs return all transactions.
             * Filter them here if needed.
             */

            list =
                list.filter(
                    transaction => {

                        const type =
                            String(
                                pick(
                                    transaction,
                                    "type",
                                    "transactionType",
                                    "transaction_type",
                                    "movementType",
                                    "movement_type"
                                ) || ""
                            ).toUpperCase();


                        if (!type) {
                            return true;
                        }


                        return (
                            type === "STOCK_OUT" ||
                            type === "OUT" ||
                            type === "STOCKOUT"
                        );

                    }
                );


            transactions = list;


            renderTransactions(
                list
            );


        } catch (error) {

            console.error(
                "Failed to load Stock Out transactions:",
                error
            );


            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-row"
                    >
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>
                            Unable to load stock transactions.
                        </span>
                    </td>
                </tr>
            `;


            throw error;

        }

    }


    /* =====================================================
       RENDER TRANSACTIONS
    ===================================================== */

    function renderTransactions(
        list
    ) {

        if (!tableBody) {
            return;
        }


        if (!list.length) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-row"
                    >
                        <i class="fa-solid fa-box-open"></i>
                        <span>
                            No Stock Out transactions found.
                        </span>
                    </td>
                </tr>
            `;

            return;

        }


        tableBody.innerHTML =
            list
                .slice(0, 50)
                .map(
                    transaction =>
                        createTransactionRow(
                            transaction
                        )
                )
                .join("");

    }


    function createTransactionRow(
        transaction
    ) {

        const date =
            pick(
                transaction,
                "date",
                "stockOutDate",
                "stock_out_date",
                "transactionDate",
                "transaction_date",
                "createdAt",
                "created_at"
            );


        const product =
            pick(
                transaction,
                "productName",
                "product_name",
                "product",
                "name"
            ) || "Unknown Product";


        const quantity =
            Number(
                pick(
                    transaction,
                    "quantity",
                    "qty"
                )
            ) || 0;


        const reason =
            pick(
                transaction,
                "reason",
                "stockOutReason",
                "stock_out_reason"
            ) || "—";


        const reference =
            pick(
                transaction,
                "referenceNumber",
                "reference_number",
                "reference"
            ) || "—";


        const recipient =
            pick(
                transaction,
                "recipient",
                "customer",
                "customerName",
                "customer_name"
            ) || "—";


        const user =
            pick(
                transaction,
                "userName",
                "user_name",
                "username",
                "createdBy",
                "created_by",
                "employee"
            ) || "—";


        return `
            <tr>

                <td>
                    ${escapeHtml(
                        formatDateTime(date)
                    )}
                </td>

                <td>
                    <strong>
                        ${escapeHtml(
                            product
                        )}
                    </strong>
                </td>

                <td>
                    <span class="transaction-quantity">
                        -${formatNumber(quantity)}
                    </span>
                </td>

                <td>
                    <span class="transaction-reason">
                        ${escapeHtml(
                            formatReason(
                                reason
                            )
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        reference
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        recipient
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        user
                    )}
                </td>

            </tr>
        `;

    }


    /* =====================================================
       MODAL
    ===================================================== */

    function showModal(
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


        setText(
            modalTitle,
            title
        );

        setText(
            modalMessage,
            message
        );


        modal.hidden = false;

        document.body.style.overflow =
            "hidden";


        if (modalOk) {

            modalOk.textContent =
                success
                    ? "Continue"
                    : "Close";

        }


        setTimeout(() => {

            modalClose?.focus();

        }, 30);

    }


    function closeModal() {

        if (!modal) {
            return;
        }

        modal.hidden = true;

        document.body.style.overflow =
            "";

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


    function setSavingState(
        saving
    ) {

        if (!saveBtn) {
            return;
        }


        saveBtn.disabled =
            saving;


        if (saving) {

            saveBtn.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>
                    Updating...
                </span>
            `;

        } else {

            saveBtn.innerHTML = `
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span>
                    Release Stock
                </span>
            `;

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function handleLogout() {

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth
                    .logout === "function"
            ) {

                await window.StockFlowAuth.logout();

                return;

            }


            if (
                window.StockFlowAuthUI &&
                typeof window.StockFlowAuthUI
                    .logout === "function"
            ) {

                await window.StockFlowAuthUI.logout();

                return;

            }


            localStorage.removeItem(
                "stockflowUser"
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
                "Logout failed:",
                error
            );

            window.location.href =
                "login.html";

        }

    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function extractData(
        response
    ) {

        if (!response) {
            return [];
        }


        if (Array.isArray(response)) {
            return response;
        }


        if (
            Array.isArray(
                response.data
            )
        ) {

            return response.data;

        }


        if (
            Array.isArray(
                response.products
            )
        ) {

            return response.products;

        }


        if (
            Array.isArray(
                response.transactions
            )
        ) {

            return response.transactions;

        }


        if (
            response.data &&
            Array.isArray(
                response.data.products
            )
        ) {

            return response.data.products;

        }


        if (
            response.data &&
            Array.isArray(
                response.data.transactions
            )
        ) {

            return response.data.transactions;

        }


        return [];

    }


    function pick(
        object,
        ...keys
    ) {

        if (
            !object ||
            typeof object !== "object"
        ) {

            return null;

        }


        for (const key of keys) {

            if (
                object[key] !== undefined &&
                object[key] !== null
            ) {

                return object[key];

            }

        }


        return null;

    }


    function getProductId(
        product
    ) {

        return pick(
            product,
            "productId",
            "product_id",
            "id",
            "ID",
            "PRODUCT_ID"
        );

    }


    function getProductName(
        product
    ) {

        return (
            pick(
                product,
                "productName",
                "product_name",
                "name",
                "product",
                "PRODUCT_NAME"
            ) ||
            "Unnamed Product"
        );

    }


    function getProductSku(
        product
    ) {

        return (
            pick(
                product,
                "sku",
                "SKU",
                "productSku",
                "product_sku"
            ) ||
            ""
        );

    }


    function getProductStock(
        product
    ) {

        return Number(
            pick(
                product,
                "stock",
                "quantity",
                "currentStock",
                "current_stock",
                "stockQuantity",
                "stock_quantity",
                "availableStock",
                "available_stock",
                "STOCK"
            )
        ) || 0;

    }


    function getSelectedOptionText(
        select
    ) {

        if (
            !select ||
            select.selectedIndex < 0
        ) {

            return "";

        }


        const option =
            select.options[
                select.selectedIndex
            ];


        return option
            ? option.textContent.trim()
            : "";

    }


    function formatReason(
        reason
    ) {

        const map = {

            SALE:
                "Customer Sale",

            DAMAGED:
                "Damaged",

            DEFECTIVE:
                "Defective",

            RETURN:
                "Supplier Return",

            TRANSFER:
                "Stock Transfer",

            INTERNAL_USE:
                "Internal Use",

            ADJUSTMENT:
                "Inventory Adjustment",

            OTHER:
                "Other"

        };


        const normalized =
            String(reason || "")
                .trim()
                .toUpperCase();


        return (
            map[normalized] ||
            String(reason || "Other")
        );

    }


    function formatNumber(
        value
    ) {

        return Number(
            value || 0
        ).toLocaleString(
            "en-PH"
        );

    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(
                `${value}T00:00:00`
            );


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


    function formatDateTime(
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


    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    function setText(
        element,
        value
    ) {

        if (!element) {
            return;
        }

        element.textContent =
            value ?? "";

    }

});


        document.addEventListener("DOMContentLoaded", () => {

            /* ============================================
               MOBILE SIDEBAR
            ============================================ */

            const sidebar = document.getElementById("sidebar");
            const overlay = document.getElementById("sidebarOverlay");
            const menuBtn = document.getElementById("mobileMenuBtn");

            function openSidebar() {
                if (!sidebar) return;

                sidebar.classList.add("open");

                if (overlay) {
                    overlay.classList.add("show");
                }

                if (menuBtn) {
                    menuBtn.setAttribute("aria-expanded", "true");
                }

                document.body.classList.add("sidebar-open");
            }

            function closeSidebar() {
                if (!sidebar) return;

                sidebar.classList.remove("open");

                if (overlay) {
                    overlay.classList.remove("show");
                }

                if (menuBtn) {
                    menuBtn.setAttribute("aria-expanded", "false");
                }

                document.body.classList.remove("sidebar-open");
            }

            if (menuBtn) {
                menuBtn.addEventListener("click", () => {

                    if (sidebar.classList.contains("open")) {
                        closeSidebar();
                    } else {
                        openSidebar();
                    }

                });
            }

            if (overlay) {
                overlay.addEventListener("click", closeSidebar);
            }


            /* ============================================
               CLOSE MOBILE MENU AFTER NAVIGATION
            ============================================ */

            document.querySelectorAll(".sidebar-nav .nav-item").forEach(link => {

                link.addEventListener("click", () => {

                    if (window.innerWidth <= 1100) {
                        closeSidebar();
                    }

                });

            });


            /* ============================================
               NOTIFICATIONS
            ============================================ */

            const notificationBtn =
                document.getElementById("notificationBtn");

            const notificationPanel =
                document.getElementById("notificationPanel");

            const closeNotificationBtn =
                document.getElementById("closeNotificationBtn");


            function toggleNotifications() {

                if (!notificationPanel) return;

                const isHidden = notificationPanel.hasAttribute("hidden");

                if (isHidden) {

                    notificationPanel.removeAttribute("hidden");

                    if (notificationBtn) {
                        notificationBtn.setAttribute(
                            "aria-expanded",
                            "true"
                        );
                    }

                } else {

                    notificationPanel.setAttribute(
                        "hidden",
                        ""
                    );

                    if (notificationBtn) {
                        notificationBtn.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }

                }

            }


            function closeNotifications() {

                if (!notificationPanel) return;

                notificationPanel.setAttribute(
                    "hidden",
                    ""
                );

                if (notificationBtn) {
                    notificationBtn.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }

            }


            if (notificationBtn) {
                notificationBtn.addEventListener(
                    "click",
                    (event) => {

                        event.stopPropagation();

                        toggleNotifications();

                    }
                );
            }


            if (closeNotificationBtn) {
                closeNotificationBtn.addEventListener(
                    "click",
                    closeNotifications
                );
            }


            document.addEventListener("click", event => {

                if (
                    notificationPanel &&
                    !notificationPanel.hasAttribute("hidden") &&
                    !notificationPanel.contains(event.target) &&
                    notificationBtn &&
                    !notificationBtn.contains(event.target)
                ) {

                    closeNotifications();

                }

            });


            /* ============================================
               ESCAPE KEY
            ============================================ */

            document.addEventListener("keydown", event => {

                if (event.key === "Escape") {

                    closeNotifications();
                    closeSidebar();

                }

            });

        });
