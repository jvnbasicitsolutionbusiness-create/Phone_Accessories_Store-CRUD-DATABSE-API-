/* ============================================================
   STOCKFLOW | PRODUCTS.JS
   Products Module Controller
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENTS
       ========================================================= */

    const page = document.querySelector(".products-page");

    if (!page) {
        return;
    }

    const sidebar =
        document.querySelector(".sidebar");

    const sidebarOverlay =
        document.querySelector(".sidebar-overlay");

    const mobileMenuBtn =
        document.querySelector(".mobile-menu-btn");

    const logoutBtn =
        document.querySelector(".logout-btn");

    const addProductBtn =
        document.getElementById("addProductBtn");

    const emptyAddProductBtn =
        document.getElementById("emptyAddProductBtn");

    const productModal =
        document.getElementById("productModal");

    const deleteModal =
        document.getElementById("deleteModal");

    const viewModal =
        document.getElementById("viewModal");

    const productForm =
        document.getElementById("productForm");

    const productSearch =
        document.getElementById("productSearch");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const statusFilter =
        document.getElementById("statusFilter");

    const productsTableBody =
        document.getElementById("productsTableBody");

    const tableLoading =
        document.getElementById("tableLoading");

    const emptyState =
        document.getElementById("emptyState");

    const globalLoading =
        document.getElementById("globalLoading");

    const notificationBtn =
        document.getElementById("notificationBtn");

    const notificationPanel =
        document.getElementById("notificationPanel");

    const notificationCloseBtn =
        document.getElementById("notificationCloseBtn");

    const notificationList =
        document.getElementById("notificationList");

    const notificationDot =
        document.getElementById("notificationDot");

    const toastContainer =
        document.querySelector(".toast-container");

    /* =========================================================
       STATE
       ========================================================= */

    let products = [];

    let filteredProducts = [];

    let categories = [];

    let currentPage = 1;

    let rowsPerPage = 10;

    let editingProductId = null;

    let deletingProductId = null;

    let notificationItems = [];

    let isLoading = false;


    /* =========================================================
       HELPERS
       ========================================================= */

    function $(id) {
        return document.getElementById(id);
    }

    function safeText(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value);
    }

    function escapeHTML(value) {
        return safeText(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function numberValue(value) {
        const number =
            Number.parseFloat(value);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 2
            }
        ).format(numberValue(value));
    }

    function formatNumber(value) {
        return new Intl.NumberFormat(
            "en-PH"
        ).format(numberValue(value));
    }

    function normalize(value) {
        return safeText(value)
            .trim()
            .toLowerCase();
    }


    /* =========================================================
       LOADING
       ========================================================= */

    function showGlobalLoading(message = "Loading products...") {

        if (!globalLoading) {
            return;
        }

        const text =
            globalLoading.querySelector(
                "span"
            );

        if (text) {
            text.textContent = message;
        }

        globalLoading.classList.remove(
            "hidden"
        );
    }


    function hideGlobalLoading() {

        if (!globalLoading) {
            return;
        }

        globalLoading.classList.add(
            "hidden"
        );
    }


    function showTableLoading() {

        if (tableLoading) {
            tableLoading.style.display =
                "flex";
        }

        if (emptyState) {
            emptyState.classList.add(
                "hidden"
            );
        }

        if (productsTableBody) {
            productsTableBody.innerHTML = "";
        }
    }


    function hideTableLoading() {

        if (tableLoading) {
            tableLoading.style.display =
                "none";
        }
    }


    /* =========================================================
       CONNECTION STATUS
       ========================================================= */

    function setConnection(
        connected,
        message
    ) {

        const badge =
            document.querySelector(
                ".connection-badge"
            );

        const dot =
            document.querySelector(
                ".connection-dot"
            );

        if (!badge) {
            return;
        }

        badge.classList.toggle(
            "offline",
            !connected
        );

        if (dot) {
            dot.style.background =
                connected
                    ? "#16a34a"
                    : "#dc2626";
        }

        badge.innerHTML = `
            <span class="connection-dot"></span>
            ${escapeHTML(
                message ||
                (
                    connected
                        ? "SYSTEM CONNECTED"
                        : "SYSTEM OFFLINE"
                )
            )}
        `;
    }


    function setConnected() {

        setConnection(
            true,
            "SYSTEM CONNECTED"
        );
    }


    function setOffline() {

        setConnection(
            false,
            "SYSTEM OFFLINE"
        );
    }


    /* =========================================================
       TOAST
       ========================================================= */

    function showToast(
        message,
        type = "info",
        title = null
    ) {

        if (!toastContainer) {
            alert(message);
            return;
        }

        const titles = {
            success: "Success",
            error: "Something went wrong",
            warning: "Attention",
            info: "StockFlow"
        };

        const icons = {
            success: "fa-solid fa-check",
            error: "fa-solid fa-circle-exclamation",
            warning: "fa-solid fa-triangle-exclamation",
            info: "fa-solid fa-circle-info"
        };

        const toast =
            document.createElement(
                "div"
            );

        toast.className =
            `toast ${type}`;

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>

            <div class="toast-content">
                <strong>
                    ${escapeHTML(
                        title ||
                        titles[type] ||
                        titles.info
                    )}
                </strong>

                <span>
                    ${escapeHTML(message)}
                </span>
            </div>
        `;

        toastContainer.appendChild(
            toast
        );

        setTimeout(() => {

            toast.style.opacity = "0";
            toast.style.transform =
                "translateY(7px)";

            setTimeout(() => {
                toast.remove();
            }, 180);

        }, 3500);
    }


    /* =========================================================
       MODALS
       ========================================================= */

    function openModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.add("show");
        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }


    function closeModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        const anyModalOpen =
            document.querySelector(
                ".products-page .modal.show, .products-page .modal.active"
            );

        if (!anyModalOpen) {
            document.body.style.overflow =
                "";
        }
    }


    function closeProductModal() {

        closeModal(productModal);

        editingProductId = null;

        if (productForm) {
            productForm.reset();
        }

        clearFormMessage();
    }


    function closeDeleteModal() {

        closeModal(deleteModal);

        deletingProductId = null;
    }


    function closeViewModal() {

        closeModal(viewModal);
    }


    /* =========================================================
       FORM MESSAGE
       ========================================================= */

    function clearFormMessage() {

        const message =
            document.getElementById(
                "formMessage"
            );

        if (!message) {
            return;
        }

        message.textContent = "";

        message.classList.add(
            "hidden"
        );

        message.classList.remove(
            "error-message",
            "success-message"
        );
    }


    function showFormMessage(
        message,
        type = "error"
    ) {

        const element =
            document.getElementById(
                "formMessage"
            );

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.classList.remove(
            "hidden",
            "error-message",
            "success-message"
        );

        element.classList.add(
            type === "success"
                ? "success-message"
                : "error-message"
        );
    }


    /* =========================================================
       ADD PRODUCT
       ========================================================= */

    function openAddProductModal() {

        if (!productModal) {
            showToast(
                "Product modal was not found in the page.",
                "error"
            );

            return;
        }

        editingProductId = null;

        if (productForm) {
            productForm.reset();
        }

        clearFormMessage();

        const title =
            productModal.querySelector(
                ".modal-header h2"
            );

        const eyebrow =
            productModal.querySelector(
                ".modal-eyebrow"
            );

        const submitBtn =
            productModal.querySelector(
                'button[type="submit"]'
            );

        if (title) {
            title.textContent =
                "Add Product";
        }

        if (eyebrow) {
            eyebrow.textContent =
                "Product Management";
        }

        if (submitBtn) {
            submitBtn.innerHTML = `
                <i class="fa-solid fa-plus"></i>
                Add Product
            `;
        }

        openModal(productModal);

        setTimeout(() => {

            const firstInput =
                productForm?.querySelector(
                    "input:not([type='hidden'])"
                );

            if (firstInput) {
                firstInput.focus();
            }

        }, 80);
    }


    /* =========================================================
       EDIT PRODUCT
       ========================================================= */

    function openEditProductModal(
        product
    ) {

        if (!productModal || !product) {
            return;
        }

        editingProductId =
            getProductId(product);

        clearFormMessage();

        const title =
            productModal.querySelector(
                ".modal-header h2"
            );

        const eyebrow =
            productModal.querySelector(
                ".modal-eyebrow"
            );

        const submitBtn =
            productModal.querySelector(
                'button[type="submit"]'
            );

        if (title) {
            title.textContent =
                "Edit Product";
        }

        if (eyebrow) {
            eyebrow.textContent =
                "Update Product";
        }

        if (submitBtn) {
            submitBtn.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Changes
            `;
        }

        fillProductForm(product);

        openModal(productModal);
    }


    function fillProductForm(
        product
    ) {

        const map = {

            productName: [
                "productName",
                "name"
            ],

            productCategory: [
                "productCategory",
                "category",
                "categoryName"
            ],

            productPrice: [
                "productPrice",
                "price"
            ],

            productStock: [
                "productStock",
                "stock",
                "quantity"
            ],

            productSku: [
                "productSku",
                "sku",
                "productCode"
            ],

            productDescription: [
                "productDescription",
                "description"
            ]
        };


        Object.entries(map)
            .forEach(
                ([elementId, keys]) => {

                    const element =
                        document.getElementById(
                            elementId
                        );

                    if (!element) {
                        return;
                    }

                    let value = "";

                    for (
                        const key of keys
                    ) {

                        if (
                            product[key] !==
                            undefined &&
                            product[key] !==
                            null
                        ) {

                            value =
                                product[key];

                            break;
                        }
                    }

                    element.value =
                        value;
                }
            );


        /*
         * Fallback:
         * If your HTML uses names instead
         * of the expected IDs.
         */

        if (productForm) {

            const fields =
                productForm.querySelectorAll(
                    "input, select, textarea"
                );

            fields.forEach(
                field => {

                    if (
                        field.value &&
                        field.value !== ""
                    ) {
                        return;
                    }

                    const name =
                        normalize(
                            field.name
                        );

                    if (
                        name ===
                        "name" ||
                        name ===
                        "productname"
                    ) {
                        field.value =
                            product.name ||
                            product.product_name ||
                            "";
                    }

                    if (
                        name ===
                        "category"
                    ) {
                        field.value =
                            product.category ||
                            product.category_name ||
                            "";
                    }

                    if (
                        name ===
                        "price"
                    ) {
                        field.value =
                            product.price ||
                            "";
                    }

                    if (
                        name ===
                        "stock" ||
                        name ===
                        "quantity"
                    ) {
                        field.value =
                            product.stock ??
                            product.quantity ??
                            "";
                    }

                    if (
                        name ===
                        "sku"
                    ) {
                        field.value =
                            product.sku ||
                            "";
                    }
                }
            );
        }
    }


    /* =========================================================
       DELETE
       ========================================================= */

    function openDeleteProductModal(
        product
    ) {

        if (!deleteModal || !product) {
            return;
        }

        deletingProductId =
            getProductId(product);

        const name =
            getProductName(product);

        const target =
            deleteModal.querySelector(
                "[data-delete-product-name]"
            );

        if (target) {
            target.textContent =
                name;
        }

        const text =
            deleteModal.querySelector(
                ".confirm-dialog p"
            );

        if (
            text &&
            !target
        ) {
            text.innerHTML = `
                Are you sure you want to delete
                <strong>${escapeHTML(name)}</strong>?
            `;
        }

        openModal(deleteModal);
    }


    /* =========================================================
       VIEW
       ========================================================= */

    function openViewProductModal(
        product
    ) {

        if (!viewModal || !product) {
            return;
        }

        setDetail(
            "viewProductName",
            getProductName(product)
        );

        setDetail(
            "viewProductCategory",
            getProductCategory(product)
        );

        setDetail(
            "viewProductPrice",
            formatCurrency(
                product.price
            )
        );

        setDetail(
            "viewProductStock",
            formatNumber(
                getProductStock(product)
            )
        );

        setDetail(
            "viewProductSku",
            product.sku ||
            product.product_code ||
            "—"
        );

        setDetail(
            "viewProductDescription",
            product.description ||
            "No description available."
        );

        openModal(viewModal);
    }


    function setDetail(
        id,
        value
    ) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                safeText(value);
        }
    }


    /* =========================================================
       PRODUCT FIELD HELPERS
       ========================================================= */

    function getProductId(
        product
    ) {

        return (
            product.product_id ??
            product.id ??
            product.productId ??
            product.PRODUCT_ID ??
            product.ID
        );
    }


    function getProductName(
        product
    ) {

        return (
            product.product_name ??
            product.name ??
            product.productName ??
            product.PRODUCT_NAME ??
            "Unnamed Product"
        );
    }


    function getProductCategory(
        product
    ) {

        return (
            product.category ??
            product.category_name ??
            product.categoryName ??
            product.CATEGORY ??
            "Uncategorized"
        );
    }


    function getProductStock(
        product
    ) {

        return numberValue(
            product.stock ??
            product.quantity ??
            product.stock_quantity ??
            product.STOCK
        );
    }


    function getProductPrice(
        product
    ) {

        return numberValue(
            product.price ??
            product.unit_price ??
            product.product_price ??
            product.PRICE
        );
    }


    function getProductStatus(
        product
    ) {

        const explicit =
            normalize(
                product.status ??
                product.availability ??
                ""
            );

        if (
            explicit ===
                "out" ||
            explicit ===
                "out of stock"
        ) {
            return "out";
        }

        if (
            explicit ===
                "low" ||
            explicit ===
                "low stock"
        ) {
            return "low";
        }

        const stock =
            getProductStock(product);

        if (stock <= 0) {
            return "out";
        }

        if (stock <= 5) {
            return "low";
        }

        return "available";
    }


    function getStatusLabel(
        status
    ) {

        if (status === "out") {
            return "Out of Stock";
        }

        if (status === "low") {
            return "Low Stock";
        }

        return "Available";
    }


    /* =========================================================
       API ADAPTER
       ========================================================= */

    async function apiRequest(
        action,
        data = {}
    ) {

        /*
         * First use the existing StockFlow API
         * if your api.js exposes one.
         */

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.request ===
                "function"
        ) {

            return await window.StockFlowAPI.request({
                action,
                ...data
            });
        }


        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.post ===
                "function"
        ) {

            return await window.StockFlowAPI.post(
                action,
                data
            );
        }


        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.call ===
                "function"
        ) {

            return await window.StockFlowAPI.call(
                action,
                data
            );
        }


        /*
         * Other common API wrappers.
         */

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.apiRequest ===
                "function"
        ) {

            return await window.StockFlowAPI.apiRequest({
                action,
                ...data
            });
        }


        if (
            typeof window.apiRequest ===
                "function"
        ) {

            return await window.apiRequest({
                action,
                ...data
            });
        }


        /*
         * Existing CRUD helpers.
         */

        const api =
            window.StockFlowAPI ||
            window.StockFlow ||
            window.API;


        if (api) {

            if (
                action ===
                "listProducts"
            ) {

                if (
                    typeof api.listProducts ===
                        "function"
                ) {
                    return await api.listProducts();
                }

                if (
                    api.products &&
                    typeof api.products.list ===
                        "function"
                ) {
                    return await api.products.list();
                }
            }


            if (
                action ===
                "saveProduct"
            ) {

                if (
                    editingProductId !== null &&
                    typeof api.updateProduct ===
                        "function"
                ) {

                    return await api.updateProduct(
                        editingProductId,
                        data
                    );
                }

                if (
                    typeof api.createProduct ===
                        "function"
                ) {
                    return await api.createProduct(
                        data
                    );
                }

                if (
                    api.products &&
                    editingProductId !== null &&
                    typeof api.products.update ===
                        "function"
                ) {

                    return await api.products.update(
                        editingProductId,
                        data
                    );
                }

                if (
                    api.products &&
                    typeof api.products.create ===
                        "function"
                ) {

                    return await api.products.create(
                        data
                    );
                }
            }


            if (
                action ===
                "deleteProduct"
            ) {

                if (
                    typeof api.deleteProduct ===
                        "function"
                ) {

                    return await api.deleteProduct(
                        data.productId
                    );
                }

                if (
                    api.products &&
                    typeof api.products.delete ===
                        "function"
                ) {

                    return await api.products.delete(
                        data.productId
                    );
                }
            }
        }


        throw new Error(
            "StockFlow API is not available."
        );
    }


    /* =========================================================
       RESPONSE NORMALIZER
       ========================================================= */

    function normalizeResponse(
        response
    ) {

        if (
            response ===
            null ||
            response ===
            undefined
        ) {

            return {
                success: false,
                data: null,
                message:
                    "No response from server."
            };
        }


        if (
            typeof response ===
            "string"
        ) {

            try {
                return normalizeResponse(
                    JSON.parse(response)
                );
            } catch {

                return {
                    success: true,
                    data: response,
                    message: ""
                };
            }
        }


        /*
         * Apps Script / API response
         */

        const success =
            response.success ??
            response.ok ??
            response.status ===
                "success";


        const data =
            response.data ??
            response.products ??
            response.result ??
            response.rows ??
            response;


        return {
            success:
                success !== false,

            data,

            message:
                response.message ||
                response.error ||
                ""
        };
    }


    /* =========================================================
       LOAD PRODUCTS
       ========================================================= */

    async function loadProducts(
        showLoader = true
    ) {

        if (isLoading) {
            return;
        }

        isLoading = true;

        if (showLoader) {
            showTableLoading();
        }

        try {

            const response =
                await apiRequest(
                    "listProducts"
                );

            const normalized =
                normalizeResponse(
                    response
                );

            if (
                normalized.success === false
            ) {

                throw new Error(
                    normalized.message ||
                    "Unable to load products."
                );
            }

            products =
                extractArray(
                    normalized.data
                );

            filteredProducts =
                [...products];

            setConnected();

            populateCategories();

            updateStatistics();

            applyFilters();

        } catch (error) {

            console.error(
                "Products load error:",
                error
            );

            setOffline();

            products = [];
            filteredProducts = [];

            updateStatistics();
            renderProducts();

            showToast(
                error.message ||
                "Unable to load products.",
                "error"
            );

        } finally {

            isLoading = false;

            hideTableLoading();
            hideGlobalLoading();
        }
    }


    function extractArray(
        data
    ) {

        if (Array.isArray(data)) {
            return data;
        }

        if (
            data &&
            Array.isArray(data.products)
        ) {
            return data.products;
        }

        if (
            data &&
            Array.isArray(data.data)
        ) {
            return data.data;
        }

        if (
            data &&
            Array.isArray(data.rows)
        ) {
            return data.rows;
        }

        return [];
    }


    /* =========================================================
       CATEGORIES
       ========================================================= */

    function populateCategories() {

        const categorySet =
            new Set();

        products.forEach(
            product => {

                const category =
                    getProductCategory(
                        product
                    );

                if (
                    category &&
                    category !==
                        "Uncategorized"
                ) {

                    categorySet.add(
                        category
                    );
                }
            }
        );

        categories =
            Array.from(categorySet)
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        if (!categoryFilter) {
            return;
        }

        const current =
            categoryFilter.value;

        categoryFilter.innerHTML = `
            <option value="">All Categories</option>
            ${categories
                .map(
                    category => `
                        <option value="${escapeHTML(category)}">
                            ${escapeHTML(category)}
                        </option>
                    `
                )
                .join("")}
        `;

        if (
            categories.includes(current)
        ) {

            categoryFilter.value =
                current;
        }
    }


    /* =========================================================
       FILTER
       ========================================================= */

    function applyFilters() {

        const search =
            normalize(
                productSearch?.value
            );

        const category =
            normalize(
                categoryFilter?.value
            );

        const status =
            normalize(
                statusFilter?.value
            );


        filteredProducts =
            products.filter(
                product => {

                    const name =
                        normalize(
                            getProductName(
                                product
                            )
                        );

                    const sku =
                        normalize(
                            product.sku ||
                            product.product_code ||
                            ""
                        );

                    const productCategory =
                        normalize(
                            getProductCategory(
                                product
                            )
                        );

                    const productStatus =
                        getProductStatus(
                            product
                        );


                    const matchesSearch =
                        !search ||
                        name.includes(
                            search
                        ) ||
                        sku.includes(
                            search
                        ) ||
                        productCategory.includes(
                            search
                        );


                    const matchesCategory =
                        !category ||
                        productCategory ===
                            category;


                    const matchesStatus =
                        !status ||
                        productStatus ===
                            status;


                    return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesStatus
                    );
                }
            );


        currentPage = 1;

        renderProducts();
    }


    /* =========================================================
       RENDER
       ========================================================= */

    function renderProducts() {

        hideTableLoading();

        if (!productsTableBody) {
            return;
        }

        productsTableBody.innerHTML = "";


        if (
            filteredProducts.length ===
            0
        ) {

            if (emptyState) {
                emptyState.classList.remove(
                    "hidden"
                );
            }

            updatePagination();

            return;
        }


        if (emptyState) {
            emptyState.classList.add(
                "hidden"
            );
        }


        const start =
            (
                currentPage -
                1
            ) *
            rowsPerPage;

        const end =
            start +
            rowsPerPage;

        const pageProducts =
            filteredProducts.slice(
                start,
                end
            );


        pageProducts.forEach(
            product => {

                const row =
                    createProductRow(
                        product
                    );

                productsTableBody.appendChild(
                    row
                );
            }
        );


        updatePagination();
    }


    function createProductRow(
        product
    ) {

        const row =
            document.createElement(
                "tr"
            );

        const id =
            getProductId(product);

        const name =
            getProductName(product);

        const category =
            getProductCategory(product);

        const price =
            getProductPrice(product);

        const stock =
            getProductStock(product);

        const status =
            getProductStatus(product);

        const statusLabel =
            getStatusLabel(status);

        const sku =
            product.sku ||
            product.product_code ||
            product.productCode ||
            "";


        row.innerHTML = `

            <td>

                <div class="product-name-cell">

                    <div class="product-thumb">
                        <i class="fa-solid fa-box"></i>
                    </div>

                    <div class="product-name-info">

                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        <small>
                            ${
                                sku
                                    ? escapeHTML(sku)
                                    : "No SKU"
                            }
                        </small>

                    </div>

                </div>

            </td>


            <td>

                <span class="category-badge">
                    ${escapeHTML(category)}
                </span>

            </td>


            <td>

                <span class="price-cell">
                    ${formatCurrency(price)}
                </span>

            </td>


            <td>

                <div class="stock-cell">

                    <span class="stock-number">
                        ${formatNumber(stock)}
                    </span>

                    <span class="stock-label">
                        units
                    </span>

                </div>

            </td>


            <td>

                <span class="status-badge ${status}">
                    ${statusLabel}
                </span>

            </td>


            <td>

                <div
                    class="product-actions"
                    data-product-id="${escapeHTML(id)}"
                >

                    <button
                        type="button"
                        class="table-action view"
                        title="View Product"
                        data-action="view"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>


                    <button
                        type="button"
                        class="table-action edit"
                        title="Edit Product"
                        data-action="edit"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>


                    <button
                        type="button"
                        class="table-action delete"
                        title="Delete Product"
                        data-action="delete"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </td>

        `;


        return row;
    }


    /* =========================================================
       STATISTICS
       ========================================================= */

    function updateStatistics() {

        const total =
            products.length;

        const totalStock =
            products.reduce(
                (
                    sum,
                    product
                ) =>
                    sum +
                    getProductStock(
                        product
                    ),
                0
            );

        const lowStock =
            products.filter(
                product =>
                    getProductStatus(
                        product
                    ) === "low"
            ).length;

        const outOfStock =
            products.filter(
                product =>
                    getProductStatus(
                        product
                    ) === "out"
            ).length;


        setStat(
            [
                "totalProducts",
                "productCount",
                "statTotalProducts"
            ],
            total
        );

        setStat(
            [
                "totalStock",
                "stockCount",
                "statTotalStock"
            ],
            totalStock
        );

        setStat(
            [
                "lowStock",
                "lowStockCount",
                "statLowStock"
            ],
            lowStock
        );

        setStat(
            [
                "outOfStock",
                "outStockCount",
                "statOutOfStock"
            ],
            outOfStock
        );
    }


    function setStat(
        ids,
        value
    ) {

        for (
            const id of ids
        ) {

            const element =
                document.getElementById(
                    id
                );

            if (element) {
                element.textContent =
                    formatNumber(value);

                return;
            }
        }
    }


    /* =========================================================
       PAGINATION
       ========================================================= */

    function updatePagination() {

        const total =
            filteredProducts.length;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    rowsPerPage
                )
            );


        if (
            currentPage >
            totalPages
        ) {

            currentPage =
                totalPages;
        }


        const info =
            document.querySelector(
                ".pagination-info"
            );

        if (info) {

            if (!total) {

                info.textContent =
                    "Showing 0 products";

            } else {

                const start =
                    (
                        currentPage -
                        1
                    ) *
                    rowsPerPage +
                    1;

                const end =
                    Math.min(
                        currentPage *
                            rowsPerPage,
                        total
                    );

                info.textContent =
                    `Showing ${start}-${end} of ${total} products`;
            }
        }


        const container =
            document.querySelector(
                ".pagination-buttons"
            );

        if (!container) {
            return;
        }


        container.innerHTML = "";


        const previous =
            document.createElement(
                "button"
            );

        previous.type =
            "button";

        previous.className =
            "pagination-btn";

        previous.innerHTML =
            '<i class="fa-solid fa-chevron-left"></i>';

        previous.disabled =
            currentPage <= 1;

        previous.addEventListener(
            "click",
            () => {

                if (
                    currentPage >
                    1
                ) {

                    currentPage--;

                    renderProducts();
                }
            }
        );

        container.appendChild(
            previous
        );


        const maxVisible =
            5;

        let startPage =
            Math.max(
                1,
                currentPage -
                    Math.floor(
                        maxVisible / 2
                    )
            );

        let endPage =
            Math.min(
                totalPages,
                startPage +
                    maxVisible -
                    1
            );


        if (
            endPage -
            startPage +
            1 <
            maxVisible
        ) {

            startPage =
                Math.max(
                    1,
                    endPage -
                        maxVisible +
                        1
                );
        }


        for (
            let pageNumber =
                startPage;
            pageNumber <=
                endPage;
            pageNumber++
        ) {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "pagination-btn";

            if (
                pageNumber ===
                currentPage
            ) {

                button.classList.add(
                    "active"
                );
            }

            button.textContent =
                pageNumber;

            button.addEventListener(
                "click",
                () => {

                    currentPage =
                        pageNumber;

                    renderProducts();
                }
            );

            container.appendChild(
                button
            );
        }


        const next =
            document.createElement(
                "button"
            );

        next.type =
            "button";

        next.className =
            "pagination-btn";

        next.innerHTML =
            '<i class="fa-solid fa-chevron-right"></i>';

        next.disabled =
            currentPage >=
            totalPages;

        next.addEventListener(
            "click",
            () => {

                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderProducts();
                }
            }
        );

        container.appendChild(
            next
        );


        const currentPageElement =
            document.querySelector(
                ".current-page"
            );

        if (currentPageElement) {

            currentPageElement.textContent =
                currentPage;
        }
    }


    /* =========================================================
       FORM DATA
       ========================================================= */

    function collectProductData() {

        const getValue =
            (...ids) => {

                for (
                    const id of ids
                ) {

                    const element =
                        document.getElementById(
                            id
                        );

                    if (element) {
                        return element.value.trim();
                    }
                }

                return "";
            };


        return {

            product_name:
                getValue(
                    "productName",
                    "name"
                ),

            category:
                getValue(
                    "productCategory",
                    "category"
                ),

            price:
                numberValue(
                    getValue(
                        "productPrice",
                        "price"
                    )
                ),

            stock:
                numberValue(
                    getValue(
                        "productStock",
                        "stock",
                        "quantity"
                    )
                ),

            sku:
                getValue(
                    "productSku",
                    "sku",
                    "productCode"
                ),

            description:
                getValue(
                    "productDescription",
                    "description"
                )
        };
    }


    /* =========================================================
       SAVE PRODUCT
       ========================================================= */

    async function handleProductSubmit(
        event
    ) {

        event.preventDefault();
        event.stopPropagation();

        if (!productForm) {
            return;
        }


        const data =
            collectProductData();


        if (!data.product_name) {

            showFormMessage(
                "Please enter the product name."
            );

            return;
        }


        if (!data.category) {

            showFormMessage(
                "Please select or enter a category."
            );

            return;
        }


        if (
            data.price < 0
        ) {

            showFormMessage(
                "Product price cannot be negative."
            );

            return;
        }


        if (
            data.stock < 0
        ) {

            showFormMessage(
                "Product stock cannot be negative."
            );

            return;
        }


        const submitBtn =
            productForm.querySelector(
                'button[type="submit"]'
            );


        const originalText =
            submitBtn
                ? submitBtn.innerHTML
                : "";


        if (submitBtn) {

            submitBtn.disabled =
                true;

            submitBtn.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
            `;
        }


        try {

            const payload = {
                ...data
            };


            if (
                editingProductId !==
                null &&
                editingProductId !==
                undefined
            ) {

                payload.productId =
                    editingProductId;

                payload.product_id =
                    editingProductId;

                payload.id =
                    editingProductId;
            }


            const response =
                await apiRequest(
                    "saveProduct",
                    payload
                );


            const normalized =
                normalizeResponse(
                    response
                );


            if (
                normalized.success ===
                false
            ) {

                throw new Error(
                    normalized.message ||
                    "Unable to save product."
                );
            }


            showToast(
                editingProductId !==
                    null
                    ? "Product updated successfully."
                    : "Product added successfully.",
                "success"
            );


            closeProductModal();

            await loadProducts(
                false
            );


        } catch (error) {

            console.error(
                "Save product error:",
                error
            );

            showFormMessage(
                error.message ||
                "Unable to save product."
            );

            showToast(
                error.message ||
                "Unable to save product.",
                "error"
            );

        } finally {

            if (submitBtn) {

                submitBtn.disabled =
                    false;

                submitBtn.innerHTML =
                    originalText;
            }
        }
    }


    /* =========================================================
       DELETE PRODUCT
       ========================================================= */

    async function confirmDeleteProduct() {

        if (
            deletingProductId ===
            null ||
            deletingProductId ===
            undefined
        ) {
            return;
        }


        const button =
            deleteModal?.querySelector(
                ".danger-btn"
            );


        if (button) {

            button.disabled =
                true;

            button.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Deleting...
            `;
        }


        try {

            const response =
                await apiRequest(
                    "deleteProduct",
                    {
                        productId:
                            deletingProductId,

                        product_id:
                            deletingProductId,

                        id:
                            deletingProductId
                    }
                );


            const normalized =
                normalizeResponse(
                    response
                );


            if (
                normalized.success ===
                false
            ) {

                throw new Error(
                    normalized.message ||
                    "Unable to delete product."
                );
            }


            showToast(
                "Product deleted successfully.",
                "success"
            );


            closeDeleteModal();

            await loadProducts(
                false
            );


        } catch (error) {

            console.error(
                "Delete product error:",
                error
            );

            showToast(
                error.message ||
                "Unable to delete product.",
                "error"
            );

        } finally {

            if (button) {

                button.disabled =
                    false;

                button.innerHTML = `
                    <i class="fa-solid fa-trash"></i>
                    Delete Product
                `;
            }
        }
    }


    /* =========================================================
       TABLE ACTIONS
       ========================================================= */

    function handleTableAction(
        event
    ) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }


        const action =
            button.dataset.action;


        const row =
            button.closest("tr");

        if (!row) {
            return;
        }


        const actionContainer =
            button.closest(
                ".product-actions"
            );

        const productId =
            actionContainer?.dataset
                .productId;


        const product =
            products.find(
                item =>
                    String(
                        getProductId(
                            item
                        )
                    ) ===
                    String(
                        productId
                    )
            );


        if (!product) {

            showToast(
                "Product information could not be found.",
                "error"
            );

            return;
        }


        if (
            action ===
            "view"
        ) {

            openViewProductModal(
                product
            );

        } else if (
            action ===
            "edit"
        ) {

            openEditProductModal(
                product
            );

        } else if (
            action ===
            "delete"
        ) {

            openDeleteProductModal(
                product
            );
        }
    }


    /* =========================================================
       NOTIFICATIONS
       ========================================================= */

    function generateNotifications() {

        notificationItems = [];

        const lowStock =
            products.filter(
                product =>
                    getProductStatus(
                        product
                    ) === "low"
            );

        const outOfStock =
            products.filter(
                product =>
                    getProductStatus(
                        product
                    ) === "out"
            );


        outOfStock
            .slice(0, 4)
            .forEach(
                product => {

                    notificationItems.push({
                        type: "danger",
                        icon:
                            "fa-solid fa-box-open",
                        title:
                            `${getProductName(product)} is out of stock`,
                        message:
                            "This product currently has no available stock."
                    });
                }
            );


        lowStock
            .slice(0, 4)
            .forEach(
                product => {

                    notificationItems.push({
                        type: "warning",
                        icon:
                            "fa-solid fa-triangle-exclamation",
                        title:
                            `${getProductName(product)} is low on stock`,
                        message:
                            `${formatNumber(getProductStock(product))} unit(s) remaining.`
                    });
                }
            );


        renderNotifications();
    }


    function renderNotifications() {

        if (!notificationList) {
            return;
        }


        if (
            notificationItems.length ===
            0
        ) {

            notificationList.innerHTML = `
                <div class="notification-empty">

                    <i class="fa-solid fa-bell-slash"></i>

                    <strong>
                        No new notifications
                    </strong>

                    <span>
                        Your inventory looks good.
                    </span>

                </div>
            `;

            if (notificationDot) {
                notificationDot.classList.remove(
                    "show"
                );
            }

            return;
        }


        if (notificationDot) {
            notificationDot.classList.add(
                "show"
            );
        }


        notificationList.innerHTML =
            notificationItems
                .map(
                    item => `
                        <div class="notification-item ${escapeHTML(item.type)}">

                            <div class="notification-icon">
                                <i class="${escapeHTML(item.icon)}"></i>
                            </div>

                            <div class="notification-content">

                                <strong>
                                    ${escapeHTML(item.title)}
                                </strong>

                                <span>
                                    ${escapeHTML(item.message)}
                                </span>

                            </div>

                        </div>
                    `
                )
                .join("");
    }


    function toggleNotifications(
        event
    ) {

        if (event) {
            event.stopPropagation();
        }

        if (!notificationPanel) {
            return;
        }

        notificationPanel.classList.toggle(
            "show"
        );
    }


    function closeNotifications() {

        notificationPanel?.classList.remove(
            "show"
        );
    }


    /* =========================================================
       SIDEBAR
       ========================================================= */

    function openSidebar() {

        sidebar?.classList.add(
            "open"
        );

        sidebarOverlay?.classList.add(
            "show"
        );

        document.body.classList.add(
            "sidebar-open"
        );
    }


    function closeSidebar() {

        sidebar?.classList.remove(
            "open"
        );

        sidebarOverlay?.classList.remove(
            "show"
        );

        document.body.classList.remove(
            "sidebar-open"
        );
    }


    function toggleSidebar() {

        if (
            sidebar?.classList.contains(
                "open"
            )
        ) {

            closeSidebar();

        } else {

            openSidebar();
        }
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function handleLogout(
        event
    ) {

        event.preventDefault();

        if (
            window.StockFlowAuth &&
            typeof window.StockFlowAuth.logout ===
                "function"
        ) {

            try {
                await window.StockFlowAuth.logout();
            } catch (error) {
                console.error(
                    "Logout error:",
                    error
                );
            }

            return;
        }


        if (
            window.StockFlowAuthUI &&
            typeof window.StockFlowAuthUI.logout ===
                "function"
        ) {

            window.StockFlowAuthUI.logout();

            return;
        }


        /*
         * Do NOT destroy the existing auth system.
         * This is only a final fallback.
         */

        sessionStorage.clear();

        window.location.href =
            "login.html";
    }


    /* =========================================================
       EVENT LISTENERS
       ========================================================= */

    /*
     * ADD PRODUCT
     *
     * Delegated listener means the button
     * still works even if HTML is dynamically
     * rendered later.
     */

    document.addEventListener(
        "click",
        event => {

            const addButton =
                event.target.closest(
                    "#addProductBtn, #emptyAddProductBtn"
                );

            if (!addButton) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            openAddProductModal();
        }
    );


    /*
     * TABLE ACTIONS
     */

    productsTableBody?.addEventListener(
        "click",
        handleTableAction
    );


    /*
     * FORM
     */

    productForm?.addEventListener(
        "submit",
        handleProductSubmit
    );


    /*
     * SEARCH
     */

    productSearch?.addEventListener(
        "input",
        applyFilters
    );


    /*
     * CATEGORY
     */

    categoryFilter?.addEventListener(
        "change",
        applyFilters
    );


    /*
     * STATUS
     */

    statusFilter?.addEventListener(
        "change",
        applyFilters
    );


    /*
     * NOTIFICATIONS
     */

    notificationBtn?.addEventListener(
        "click",
        toggleNotifications
    );


    notificationCloseBtn?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            closeNotifications();
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                notificationPanel &&
                !notificationPanel.contains(
                    event.target
                ) &&
                !notificationBtn?.contains(
                    event.target
                )
            ) {

                closeNotifications();
            }
        }
    );


    /*
     * SIDEBAR
     */

    mobileMenuBtn?.addEventListener(
        "click",
        toggleSidebar
    );


    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );


    /*
     * CLOSE MODALS
     */

    document.addEventListener(
        "click",
        event => {

            const closeButton =
                event.target.closest(
                    ".modal-close"
                );

            if (closeButton) {

                const modal =
                    closeButton.closest(
                        ".modal"
                    );

                closeModal(modal);

                return;
            }


            const backdrop =
                event.target.closest(
                    ".modal-backdrop"
                );

            if (backdrop) {

                const modal =
                    backdrop.closest(
                        ".modal"
                    );

                closeModal(modal);
            }
        }
    );


    /*
     * DELETE CONFIRM
     */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-confirm-delete]"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            confirmDeleteProduct();
        }
    );


    /*
     * CANCEL BUTTONS
     */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-close-modal]"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            const modal =
                button.closest(
                    ".modal"
                );

            closeModal(modal);
        }
    );


    logoutBtn?.addEventListener(
        "click",
        handleLogout
    );


    /*
     * ESC KEY
     */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeNotifications();


            document
                .querySelectorAll(
                    ".products-page .modal.show, .products-page .modal.active"
                )
                .forEach(
                    modal =>
                        closeModal(
                            modal
                        )
                );


            closeSidebar();
        }
    );


    /* =========================================================
       INITIALIZE MODALS
       ========================================================= */

    document
        .querySelectorAll(
            ".products-page .modal"
        )
        .forEach(
            modal => {

                modal.classList.remove(
                    "show",
                    "active"
                );

                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        );


    /* =========================================================
       INITIALIZE LOADER
       ========================================================= */

    /*
     * IMPORTANT:
     * Prevent the white flash on page load.
     */

    hideGlobalLoading();


    /* =========================================================
       INITIALIZE CONNECTION
       ========================================================= */

    setConnection(
        true,
        "SYSTEM CONNECTED"
    );


    /* =========================================================
       INITIAL LOAD
       ========================================================= */

    loadProducts(
        true
    );


    /* =========================================================
       REFRESH NOTIFICATIONS AFTER LOAD
       ========================================================= */

    setTimeout(
        generateNotifications,
        500
    );


    /*
     * Keep notifications synchronized
     * whenever products change.
     */

    const originalRenderProducts =
        renderProducts;

    /*
     * Generate after initial data is
     * available.
     */

    setTimeout(
        () => {
            generateNotifications();
        },
        1000
    );


    /* =========================================================
       EXPOSE MODULE FOR DEBUGGING / OTHER MODULES
       ========================================================= */

    window.StockFlowProducts = {

        reload: () =>
            loadProducts(false),

        add: () =>
            openAddProductModal(),

        edit: product =>
            openEditProductModal(product),

        view: product =>
            openViewProductModal(product),

        delete: product =>
            openDeleteProductModal(product),

        getProducts: () =>
            [...products]
    };

});
