/* =========================================================
   STOCKFLOW — STOCK IN
   stock-in.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const form = document.getElementById("stockInForm");

    if (!form) {
        return;
    }

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

    const modalClose =
        document.getElementById("closeStockInModal");

    const modalOk =
        document.getElementById("stockInModalOk");

    const mobileMenuBtn =
        document.getElementById("mobileMenuBtn");

    const sidebar =
        document.getElementById("sidebar");

    const sidebarOverlay =
        document.getElementById("sidebarOverlay");

    const logoutBtn =
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

    let saving = false;


    /* =====================================================
       HELPERS
    ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function pick(object, keys, fallback = "") {

        if (!object) {
            return fallback;
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

        return fallback;
    }


    function number(value) {

        const parsed = Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : 0;
    }


    function peso(value) {

        return "₱" + number(value).toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
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


    function todayISO() {

        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            String(now.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(now.getDate())
                .padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function showConnectionMessage(
        message,
        type = "success"
    ) {

        if (!connectionMessage) {
            return;
        }

        connectionMessage.textContent = message;

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
       CONNECTION
    ===================================================== */

    function setOnline() {

        if (!connectionBadge) {
            return;
        }

        connectionBadge.classList.remove("offline");

        const text =
            connectionBadge.querySelector(
                "span:last-child"
            );

        if (text) {
            text.textContent = "ONLINE";
        }
    }


    function setOffline() {

        if (!connectionBadge) {
            return;
        }

        connectionBadge.classList.add("offline");

        const text =
            connectionBadge.querySelector(
                "span:last-child"
            );

        if (text) {
            text.textContent = "OFFLINE";
        }
    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading() {

        if (loadingOverlay) {
            loadingOverlay.hidden = false;
        }

        if (saveButton) {
            saveButton.disabled = true;
        }
    }


    function hideLoading() {

        if (loadingOverlay) {
            loadingOverlay.hidden = true;
        }

        if (!saving && saveButton) {
            saveButton.disabled = false;
        }
    }


    /* =====================================================
       API ADAPTER
    ===================================================== */

    async function callAPI(
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
                "StockFlow API is not available."
            );
        }


        /*
         * -------------------------------------------------
         * NESTED PRODUCTS API
         * -------------------------------------------------
         */

        if (
            action === "listProducts" &&
            api.products &&
            typeof api.products.list === "function"
        ) {
            return await api.products.list(payload);
        }


        /*
         * -------------------------------------------------
         * NESTED SUPPLIERS API
         * -------------------------------------------------
         */

        if (
            action === "listSuppliers" &&
            api.suppliers &&
            typeof api.suppliers.list === "function"
        ) {
            return await api.suppliers.list(payload);
        }


        /*
         * -------------------------------------------------
         * NESTED STOCK API
         * -------------------------------------------------
         */

        if (
            action === "stockIn" &&
            api.stockIn &&
            typeof api.stockIn === "function"
        ) {
            return await api.stockIn(payload);
        }


        if (
            action === "listTransactions" &&
            api.stockIn &&
            typeof api.stockIn.list === "function"
        ) {
            return await api.stockIn.list(payload);
        }


        /*
         * -------------------------------------------------
         * DIRECT METHODS
         * -------------------------------------------------
         */

        const directMethodMap = {

            listProducts: [
                "listProducts",
                "getProducts"
            ],

            listSuppliers: [
                "listSuppliers",
                "getSuppliers"
            ],

            stockIn: [
                "stockIn",
                "addStockIn",
                "createStockIn"
            ],

            listTransactions: [
                "listTransactions",
                "getTransactions",
                "listStockIn"
            ]
        };


        const methods =
            directMethodMap[action] || [];


        for (const methodName of methods) {

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
         * -------------------------------------------------
         * GENERIC REQUEST METHOD
         * -------------------------------------------------
         */

        if (typeof api.request === "function") {

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


        if (typeof api.post === "function") {

            return await api.post(
                action,
                payload
            );
        }


        if (typeof api.call === "function") {

            return await api.call(
                action,
                payload
            );
        }


        /*
         * -------------------------------------------------
         * GLOBAL API FUNCTIONS
         * -------------------------------------------------
         */

        if (
            typeof window.apiRequest ===
            "function"
        ) {

            return await window.apiRequest({
                action,
                ...payload
            });
        }


        throw new Error(
            `API method for "${action}" was not found.`
        );
    }


    /* =====================================================
       NORMALIZE API RESPONSE
    ===================================================== */

    function normalizeResponse(response) {

        if (!response) {
            return {
                success: true,
                data: []
            };
        }


        if (
            response.success === false ||
            response.ok === false
        ) {

            throw new Error(
                response.message ||
                response.error ||
                "The server rejected the request."
            );
        }


        return response;
    }


    function extractArray(
        response,
        possibleKeys = []
    ) {

        const data =
            response?.data ??
            response?.result ??
            response;


        if (Array.isArray(data)) {
            return data;
        }


        for (const key of possibleKeys) {

            if (
                Array.isArray(
                    data?.[key]
                )
            ) {
                return data[key];
            }

            if (
                Array.isArray(
                    response?.[key]
                )
            ) {
                return response[key];
            }
        }


        return [];
    }


    /* =====================================================
       PRODUCT HELPERS
    ===================================================== */

    function productId(product) {

        return pick(
            product,
            [
                "product_id",
                "productId",
                "id",
                "ID"
            ]
        );
    }


    function productName(product) {

        return pick(
            product,
            [
                "product_name",
                "productName",
                "name",
                "Name"
            ],
            "Unnamed Product"
        );
    }


    function supplierId(supplier) {

        return pick(
            supplier,
            [
                "supplier_id",
                "supplierId",
                "id",
                "ID"
            ]
        );
    }


    function supplierName(supplier) {

        return pick(
            supplier,
            [
                "supplier_name",
                "supplierName",
                "name",
                "Name"
            ],
            "Unnamed Supplier"
        );
    }


    /* =====================================================
       LOAD PRODUCTS
    ===================================================== */

    async function loadProducts() {

        try {

            const response =
                normalizeResponse(
                    await callAPI(
                        "listProducts"
                    )
                );


            products =
                extractArray(
                    response,
                    [
                        "products",
                        "items",
                        "rows"
                    ]
                );


            populateProducts();

            setOnline();

        } catch (error) {

            console.error(
                "Stock In products:",
                error
            );

            productSelect.innerHTML = `
                <option value="">
                    Unable to load products
                </option>
            `;

            setOffline();

            showConnectionMessage(
                error.message ||
                "Unable to load products.",
                "error"
            );
        }
    }


    /* =====================================================
       POPULATE PRODUCT SELECT
    ===================================================== */

    function populateProducts() {

        if (!productSelect) {
            return;
        }


        const currentValue =
            productSelect.value;


        productSelect.innerHTML = `
            <option value="">
                Select a product
            </option>
        `;


        products.forEach(product => {

            const id =
                productId(product);

            const name =
                productName(product);

            if (!id) {
                return;
            }


            const sku =
                pick(
                    product,
                    [
                        "sku",
                        "SKU",
                        "product_sku"
                    ]
                );


            const stock =
                pick(
                    product,
                    [
                        "stock",
                        "quantity",
                        "current_stock"
                    ],
                    ""
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value = id;

            option.textContent =
                sku
                    ? `${name} — ${sku}`
                    : `${name}${stock !== "" ? ` — Stock: ${stock}` : ""}`;


            option.dataset.name =
                name;

            option.dataset.stock =
                stock;


            productSelect.appendChild(
                option
            );
        });


        if (currentValue) {

            productSelect.value =
                currentValue;
        }
    }


    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    async function loadSuppliers() {

        if (!supplierSelect) {
            return;
        }


        try {

            const response =
                normalizeResponse(
                    await callAPI(
                        "listSuppliers"
                    )
                );


            suppliers =
                extractArray(
                    response,
                    [
                        "suppliers",
                        "items",
                        "rows"
                    ]
                );


            populateSuppliers();

        } catch (error) {

            console.error(
                "Stock In suppliers:",
                error
            );


            supplierSelect.innerHTML = `
                <option value="">
                    Supplier unavailable
                </option>
            `;
        }
    }


    /* =====================================================
       POPULATE SUPPLIERS
    ===================================================== */

    function populateSuppliers() {

        const currentValue =
            supplierSelect.value;


        supplierSelect.innerHTML = `
            <option value="">
                Select supplier
            </option>
        `;


        suppliers.forEach(supplier => {

            const id =
                supplierId(supplier);

            const name =
                supplierName(supplier);


            if (!id) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );


            option.value = id;

            option.textContent =
                name;

            option.dataset.name =
                name;


            supplierSelect.appendChild(
                option
            );
        });


        if (currentValue) {

            supplierSelect.value =
                currentValue;
        }
    }


    /* =====================================================
       PREVIEW
    ===================================================== */

    function updatePreview() {

        const selectedProduct =
            productSelect?.selectedOptions?.[0];


        const selectedSupplier =
            supplierSelect?.selectedOptions?.[0];


        const quantity =
            Math.max(
                0,
                number(quantityInput?.value)
            );


        const unitCost =
            Math.max(
                0,
                number(unitCostInput?.value)
            );


        const total =
            quantity * unitCost;


        if (previewProduct) {

            previewProduct.textContent =
                selectedProduct &&
                selectedProduct.value
                    ? selectedProduct.dataset.name ||
                      selectedProduct.textContent
                    : "No product selected";
        }


        if (previewSupplier) {

            previewSupplier.textContent =
                selectedSupplier &&
                selectedSupplier.value
                    ? selectedSupplier.dataset.name ||
                      selectedSupplier.textContent
                    : "No supplier selected";
        }


        if (previewQuantity) {

            previewQuantity.textContent =
                quantity.toLocaleString(
                    "en-PH"
                );
        }


        if (previewUnitCost) {

            previewUnitCost.textContent =
                peso(unitCost);
        }


        if (previewTotal) {

            previewTotal.textContent =
                peso(total);
        }


        if (previewReference) {

            previewReference.textContent =
                referenceInput?.value.trim() ||
                "—";
        }


        if (previewDate) {

            previewDate.textContent =
                dateInput?.value
                    ? formatDate(
                        dateInput.value
                    )
                    : "—";
        }
    }


    /* =====================================================
       VALIDATION
    ===================================================== */

    function validateForm() {

        const product =
            productSelect?.value;

        const quantity =
            number(
                quantityInput?.value
            );

        const date =
            dateInput?.value;


        if (!product) {

            showConnectionMessage(
                "Please select a product.",
                "error"
            );

            productSelect.focus();

            return false;
        }


        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {

            showConnectionMessage(
                "Quantity must be at least 1.",
                "error"
            );

            quantityInput.focus();

            return false;
        }


        if (!date) {

            showConnectionMessage(
                "Please select the stock-in date.",
                "error"
            );

            dateInput.focus();

            return false;
        }


        return true;
    }


    /* =====================================================
       SUBMIT STOCK IN
    ===================================================== */

    async function submitStockIn() {

        if (saving) {
            return;
        }


        hideConnectionMessage();


        if (!validateForm()) {
            return;
        }


        const selectedProduct =
            productSelect.selectedOptions[0];


        const selectedSupplier =
            supplierSelect.selectedOptions[0];


        const productIdValue =
            productSelect.value;


        const supplierIdValue =
            supplierSelect.value;


        const quantity =
            number(
                quantityInput.value
            );


        const unitCost =
            Math.max(
                0,
                number(
                    unitCostInput.value
                )
            );


        const referenceNumber =
            referenceInput.value.trim();


        const stockInDate =
            dateInput.value;


        const notes =
            notesInput.value.trim();


        /*
         * Send several common field names.
         * This makes the module compatible
         * with the existing API wrapper.
         */

        const payload = {

            productId:
                productIdValue,

            product_id:
                productIdValue,

            product:
                productIdValue,

            productName:
                selectedProduct?.dataset?.name ||
                selectedProduct?.textContent ||
                "",

            quantity,

            unitCost,

            unit_cost:
                unitCost,

            supplierId:
                supplierIdValue || "",

            supplier_id:
                supplierIdValue || "",

            supplier:
                supplierIdValue || "",

            supplierName:
                selectedSupplier?.dataset?.name ||
                "",

            referenceNumber,

            reference_number:
                referenceNumber,

            date:
                stockInDate,

            stockInDate,

            stock_in_date:
                stockInDate,

            notes
        };


        saving = true;

        showLoading();


        try {

            const response =
                normalizeResponse(
                    await callAPI(
                        "stockIn",
                        payload
                    )
                );


            console.log(
                "Stock In saved:",
                response
            );


            setOnline();

            hideLoading();

            showResultModal(
                true,
                "Stock Added Successfully",
                "The inventory has been updated successfully."
            );


            /*
             * Reset after successful save.
             */

            resetForm();


            /*
             * Refresh recent transactions.
             */

            await loadTransactions();


        } catch (error) {

            console.error(
                "Stock In save error:",
                error
            );


            hideLoading();

            setOffline();


            showResultModal(
                false,
                "Unable to Add Stock",
                error.message ||
                "Something went wrong while saving the stock transaction."
            );

        } finally {

            saving = false;

            if (saveButton) {
                saveButton.disabled = false;
            }
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
                normalizeResponse(
                    await callAPI(
                        "listTransactions",
                        {
                            type: "stock_in",
                            limit: 20
                        }
                    )
                );


            transactions =
                extractArray(
                    response,
                    [
                        "transactions",
                        "stockIn",
                        "stock_ins",
                        "items",
                        "rows"
                    ]
                );


            renderTransactions();

            setOnline();

        } catch (error) {

            console.error(
                "Stock In transactions:",
                error
            );


            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-loading">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        Unable to load stock transactions.
                    </td>
                </tr>
            `;

            setOffline();
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
                    <td colspan="6" class="table-loading">
                        <i class="fa-solid fa-inbox"></i>
                        No stock-in transactions found.
                    </td>
                </tr>
            `;

            return;
        }


        /*
         * Show newest transactions first.
         */

        const rows =
            [...transactions]
                .slice(0, 20);


        tableBody.innerHTML =
            rows.map(transaction => {

                const date =
                    pick(
                        transaction,
                        [
                            "stock_in_date",
                            "stockInDate",
                            "date",
                            "transaction_date",
                            "created_at",
                            "createdAt"
                        ]
                    );


                const product =
                    pick(
                        transaction,
                        [
                            "product_name",
                            "productName",
                            "product"
                        ],
                        "Unknown Product"
                    );


                const quantity =
                    number(
                        pick(
                            transaction,
                            [
                                "quantity",
                                "qty",
                                "stock_in"
                            ],
                            0
                        )
                    );


                const supplier =
                    pick(
                        transaction,
                        [
                            "supplier_name",
                            "supplierName",
                            "supplier"
                        ],
                        "—"
                    );


                const reference =
                    pick(
                        transaction,
                        [
                            "reference_number",
                            "referenceNumber",
                            "reference",
                            "ref_no"
                        ],
                        "—"
                    );


                const user =
                    pick(
                        transaction,
                        [
                            "username",
                            "user_name",
                            "userName",
                            "created_by",
                            "employee_name",
                            "employee"
                        ],
                        "StockFlow User"
                    );


                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                formatDate(date)
                            )}
                        </td>

                        <td>

                            <div class="transaction-product">

                                <div class="transaction-product-icon">
                                    <i class="fa-solid fa-box"></i>
                                </div>

                                <span class="transaction-product-name">
                                    ${escapeHTML(product)}
                                </span>

                            </div>

                        </td>

                        <td>
                            <span class="quantity-badge">
                                +${quantity.toLocaleString("en-PH")}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(supplier)}
                        </td>

                        <td>
                            <span class="reference-text">
                                ${escapeHTML(reference)}
                            </span>
                        </td>

                        <td>
                            <span class="user-text">
                                ${escapeHTML(user)}
                            </span>
                        </td>

                    </tr>
                `;

            }).join("");
    }


    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetForm() {

        form.reset();


        /*
         * Always restore today's date.
         */

        if (dateInput) {
            dateInput.value =
                todayISO();
        }


        updatePreview();

        hideConnectionMessage();
    }


    /* =====================================================
       MODAL
    ===================================================== */

    function showResultModal(
        success,
        title,
        message
    ) {

        if (!modal) {
            return;
        }


        modal.hidden = false;


        if (modalIcon) {

            modalIcon.classList.toggle(
                "error",
                !success
            );


            modalIcon.innerHTML = success
                ? `<i class="fa-solid fa-check"></i>`
                : `<i class="fa-solid fa-xmark"></i>`;
        }


        if (modalTitle) {
            modalTitle.textContent =
                title;
        }


        if (modalMessage) {
            modalMessage.textContent =
                message;
        }


        if (modalOk) {

            modalOk.textContent =
                success
                    ? "Continue"
                    : "Close";
        }
    }


    function closeModal() {

        if (modal) {
            modal.hidden = true;
        }
    }


    /* =====================================================
       SIDEBAR
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


    /* =====================================================
       USER INFORMATION
    ===================================================== */

    function getCurrentUser() {

        const possibleAuth =
            window.StockFlowAuth ||
            window.StockFlowAuthUI;


        if (
            possibleAuth &&
            typeof possibleAuth.getCurrentUser ===
            "function"
        ) {

            try {

                const user =
                    possibleAuth.getCurrentUser();

                if (user) {
                    return user;
                }

            } catch (error) {

                console.warn(
                    "Could not get current user:",
                    error
                );
            }
        }


        /*
         * Fallback localStorage lookup.
         */

        const keys = [
            "stockflowUser",
            "currentUser",
            "user",
            "loggedInUser"
        ];


        for (const key of keys) {

            try {

                const raw =
                    localStorage.getItem(key);

                if (!raw) {
                    continue;
                }


                const parsed =
                    JSON.parse(raw);

                if (parsed) {
                    return parsed;
                }

            } catch (error) {
                /*
                 * Ignore invalid localStorage data.
                 */
            }
        }


        return null;
    }


    function updateUserUI() {

        const user =
            getCurrentUser();


        if (!user) {
            return;
        }


        const name =
            pick(
                user,
                [
                    "fullName",
                    "full_name",
                    "name",
                    "username",
                    "email"
                ],
                "StockFlow User"
            );


        const role =
            pick(
                user,
                [
                    "role",
                    "accountRole",
                    "account_role",
                    "position"
                ],
                "Employee"
            );


        const avatar =
            String(name)
                .trim()
                .charAt(0)
                .toUpperCase() || "SF";


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
            sidebarAvatar.textContent = avatar;
        }

        if (topbarName) {
            topbarName.textContent = name;
        }

        if (topbarRole) {
            topbarRole.textContent = role;
        }

        if (topbarAvatar) {
            topbarAvatar.textContent = avatar;
        }
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

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


            /*
             * Fallback only.
             */

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
                "Logout error:",
                error
            );

            window.location.href =
                "login.html";
        }
    }


    /* =====================================================
       EVENTS — PREVIEW
    ===================================================== */

    productSelect?.addEventListener(
        "change",
        updatePreview
    );


    supplierSelect?.addEventListener(
        "change",
        updatePreview
    );


    quantityInput?.addEventListener(
        "input",
        updatePreview
    );


    unitCostInput?.addEventListener(
        "input",
        updatePreview
    );


    referenceInput?.addEventListener(
        "input",
        updatePreview
    );


    dateInput?.addEventListener(
        "change",
        updatePreview
    );


    /* =====================================================
       EVENTS — FORM
    ===================================================== */

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            submitStockIn();
        }
    );


    clearButton?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            resetForm();
        }
    );


    refreshButton?.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            const icon =
                refreshButton.querySelector(
                    "i"
                );


            if (icon) {
                icon.classList.add(
                    "fa-spin"
                );
            }


            try {

                await Promise.all([
                    loadProducts(),
                    loadSuppliers(),
                    loadTransactions()
                ]);

            } finally {

                if (icon) {
                    icon.classList.remove(
                        "fa-spin"
                    );
                }
            }
        }
    );


    /* =====================================================
       EVENTS — MODAL
    ===================================================== */

    modalClose?.addEventListener(
        "click",
        closeModal
    );


    modalOk?.addEventListener(
        "click",
        closeModal
    );


    modal?.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {
                closeModal();
            }
        }
    );


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


    /* =====================================================
       EVENTS — MOBILE SIDEBAR
    ===================================================== */

    mobileMenuBtn?.addEventListener(
        "click",
        openSidebar
    );


    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );


    document
        .querySelectorAll(
            ".sidebar .nav-item"
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <=
                        760
                    ) {
                        closeSidebar();
                    }
                }
            );
        });


    /* =====================================================
       EVENTS — LOGOUT
    ===================================================== */

    logoutBtn?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            logout();
        }
    );


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    async function initialize() {

        /*
         * IMPORTANT:
         * Do NOT show the large loading overlay
         * during normal page initialization.
         *
         * This prevents the white flash.
         */

        updateUserUI();


        if (dateInput) {
            dateInput.value =
                todayISO();
        }


        updatePreview();


        /*
         * Load everything independently.
         * If one endpoint fails, the others
         * can still work.
         */

        await Promise.allSettled([
            loadProducts(),
            loadSuppliers(),
            loadTransactions()
        ]);


        setOnline();
    }


    initialize();

});
