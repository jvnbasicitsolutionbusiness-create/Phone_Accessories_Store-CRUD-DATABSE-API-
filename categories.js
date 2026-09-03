/* ============================================================
   STOCKFLOW | CATEGORIES MODULE
   categories.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    "use strict";

    /* ========================================================
       ELEMENT HELPERS
       ======================================================== */

    const $ = (selector) =>
        document.querySelector(selector);

    const $$ = (selector) =>
        document.querySelectorAll(selector);


    const getElement = (id) =>
        document.getElementById(id);


    /* ========================================================
       STATE
       ======================================================== */

    let categories = [];

    let filteredCategories = [];

    let editingCategoryId = null;

    let currentPage = 1;

    const itemsPerPage = 9;


    /* ========================================================
       AUTHENTICATION
       ======================================================== */

    try {

        if (
            typeof StockFlowAuth !== "undefined" &&
            typeof StockFlowAuth.requireAuth === "function"
        ) {

            const user =
                await StockFlowAuth.requireAuth();

            if (!user) {
                return;
            }

            if (
                typeof StockFlowAuth.bindUserUI ===
                "function"
            ) {

                StockFlowAuth.bindUserUI(user);

            }

        }

    } catch (error) {

        console.error(
            "StockFlow authentication error:",
            error
        );

        return;

    }


    /* ========================================================
       COMMON UI
       ======================================================== */

    bindNavigation();

    bindSearch();

    bindFilters();

    bindModalEvents();

    bindCategoryForm();

    bindRefresh();

    bindLogout();


    /* ========================================================
       INITIAL LOAD
       ======================================================== */

    await loadCategories();


    /* ========================================================
       NAVIGATION
       ======================================================== */

    function bindNavigation() {

        const mobileMenuBtn =
            getElement("mobileMenuBtn");

        const sidebarOverlay =
            getElement("sidebarOverlay");


        mobileMenuBtn?.addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "sidebar-open"
                );

            }
        );


        sidebarOverlay?.addEventListener(
            "click",
            () => {

                document.body.classList.remove(
                    "sidebar-open"
                );

            }
        );

    }


    /* ========================================================
       LOGOUT
       ======================================================== */

    function bindLogout() {

        const logoutBtn =
            getElement("logoutBtn");


        logoutBtn?.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        typeof StockFlowAuth !==
                        "undefined" &&
                        typeof StockFlowAuth.logout ===
                        "function"
                    ) {

                        await StockFlowAuth.logout();

                    }

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                }

            }
        );

    }


    /* ========================================================
       LOAD CATEGORIES
       ======================================================== */

    async function loadCategories() {

        showLoading();

        setConnectionStatus(
            "CONNECTING"
        );


        try {

            if (
                typeof StockFlowAPI ===
                "undefined"
            ) {

                throw new Error(
                    "StockFlowAPI is not loaded."
                );

            }


            let response;


            /*
             * Preferred API method.
             */

            if (
                typeof StockFlowAPI.getCategories ===
                "function"
            ) {

                response =
                    await StockFlowAPI.getCategories();

            }

            /*
             * Alternative API method.
             */

            else if (
                typeof StockFlowAPI.categories ===
                "function"
            ) {

                response =
                    await StockFlowAPI.categories();

            }

            else {

                throw new Error(
                    "Categories API method is missing from API.js."
                );

            }


            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Unable to load categories."
                );

            }


            categories =
                normalizeCategories(
                    response
                );


            filteredCategories =
                [...categories];


            currentPage = 1;


            renderCategories();

            updateSummary();


            setConnectionStatus(
                "ONLINE"
            );


        } catch (error) {

            console.error(
                "Category loading error:",
                error
            );


            categories = [];

            filteredCategories = [];


            renderError(
                error.message ||
                "Unable to load categories."
            );


            setConnectionStatus(
                "OFFLINE"
            );

        }

    }


    /* ========================================================
       NORMALIZE API RESPONSE
       ======================================================== */

    function normalizeCategories(response) {

        if (!response) {
            return [];
        }


        let list = [];


        if (
            Array.isArray(response)
        ) {

            list =
                response;

        }

        else if (
            Array.isArray(
                response.categories
            )
        ) {

            list =
                response.categories;

        }

        else if (
            response.data &&
            Array.isArray(
                response.data.categories
            )
        ) {

            list =
                response.data.categories;

        }

        else if (
            Array.isArray(
                response.data
            )
        ) {

            list =
                response.data;

        }


        return list
            .filter(Boolean)
            .map(
                normalizeCategory
            );

    }


    /* ========================================================
       NORMALIZE SINGLE CATEGORY
       ======================================================== */

    function normalizeCategory(item) {

        return {

            id:
                item.id ??
                item.ID ??
                item.categoryId ??
                item.CATEGORY_ID ??
                item.uid ??
                item.UID ??
                "",


            name:
                item.name ??
                item.NAME ??
                item.categoryName ??
                item.CATEGORY_NAME ??
                "",


            description:
                item.description ??
                item.DESCRIPTION ??
                "",


            status:
                String(
                    item.status ??
                    item.STATUS ??
                    "ACTIVE"
                )
                .toUpperCase(),


            productCount:
                Number(
                    item.productCount ??
                    item.PRODUCT_COUNT ??
                    item.products ??
                    item.PRODUCTS ??
                    item.totalProducts ??
                    0
                ),


            createdAt:
                item.createdAt ??
                item.CREATED_AT ??
                item.created_at ??
                "",


            updatedAt:
                item.updatedAt ??
                item.UPDATED_AT ??
                item.updated_at ??
                ""

        };

    }


    /* ========================================================
       RENDER CATEGORIES
       ======================================================== */

    function renderCategories() {

        const grid =
            getElement("categoriesGrid") ||
            getElement("categoryGrid") ||
            $(".categories-grid") ||
            $(".category-grid");


        const tableBody =
            getElement("categoriesTableBody") ||
            getElement("categoryTableBody");


        if (
            !grid &&
            !tableBody
        ) {

            console.warn(
                "Category container not found."
            );

            return;

        }


        if (
            filteredCategories.length === 0
        ) {

            if (grid) {

                grid.innerHTML =
                    emptyStateHTML();

            }


            if (tableBody) {

                tableBody.innerHTML =
                    `
                    <tr>
                        <td colspan="7">
                            ${emptyStateHTML()}
                        </td>
                    </tr>
                    `;

            }


            updatePagination();

            return;

        }


        const start =
            (currentPage - 1) *
            itemsPerPage;


        const end =
            start +
            itemsPerPage;


        const pageItems =
            filteredCategories.slice(
                start,
                end
            );


        if (grid) {

            grid.innerHTML =
                pageItems
                    .map(
                        categoryCardHTML
                    )
                    .join("");

        }


        if (tableBody) {

            tableBody.innerHTML =
                pageItems
                    .map(
                        categoryRowHTML
                    )
                    .join("");

        }


        bindCategoryActions();

        updatePagination();

    }


    /* ========================================================
       CATEGORY CARD
       ======================================================== */

    function categoryCardHTML(category) {

        const id =
            escapeHTML(
                category.id
            );


        const name =
            escapeHTML(
                category.name ||
                "Unnamed Category"
            );


        const description =
            escapeHTML(
                category.description ||
                "No description available."
            );


        const status =
            String(
                category.status ||
                "ACTIVE"
            )
            .toUpperCase();


        const productCount =
            Number(
                category.productCount ||
                0
            );


        return `

            <article
                class="category-card"
                data-category-id="${id}"
            >

                <div class="category-card-header">

                    <div class="category-card-icon">

                        <i class="fa-solid fa-layer-group"></i>

                    </div>


                    <div class="category-card-menu">

                        <button
                            type="button"
                            class="btn btn-secondary btn-icon edit-category-btn"
                            data-id="${id}"
                            title="Edit category"
                            aria-label="Edit category"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="btn btn-danger btn-icon delete-category-btn"
                            data-id="${id}"
                            title="Delete category"
                            aria-label="Delete category"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </div>


                <div class="category-card-body">

                    <h3 class="category-card-title">
                        ${name}
                    </h3>


                    <p class="category-card-description">
                        ${description}
                    </p>

                </div>


                <div class="category-card-footer">

                    <span class="category-product-count">

                        <strong>
                            ${productCount}
                        </strong>

                        <span>
                            product${productCount === 1 ? "" : "s"}
                        </span>

                    </span>


                    ${statusBadge(status)}

                </div>

            </article>

        `;

    }


    /* ========================================================
       CATEGORY TABLE ROW
       ======================================================== */

    function categoryRowHTML(category) {

        const id =
            escapeHTML(
                category.id
            );


        const name =
            escapeHTML(
                category.name ||
                "Unnamed Category"
            );


        const description =
            escapeHTML(
                category.description ||
                "No description"
            );


        const status =
            String(
                category.status ||
                "ACTIVE"
            )
            .toUpperCase();


        const productCount =
            Number(
                category.productCount ||
                0
            );


        const createdAt =
            formatDate(
                category.createdAt
            );


        return `

            <tr
                data-category-id="${id}"
            >

                <td>

                    <div class="category-name-cell">

                        <div class="category-table-icon">

                            <i class="fa-solid fa-layer-group"></i>

                        </div>


                        <div>

                            <strong>
                                ${name}
                            </strong>

                            <small>
                                ${description}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${productCount}
                </td>


                <td>
                    ${statusBadge(status)}
                </td>


                <td>
                    ${createdAt || "—"}
                </td>


                <td>

                    <div class="action-buttons">

                        <button
                            type="button"
                            class="btn btn-secondary btn-icon edit-category-btn"
                            data-id="${id}"
                            title="Edit"
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            type="button"
                            class="btn btn-danger btn-icon delete-category-btn"
                            data-id="${id}"
                            title="Delete"
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }


    /* ========================================================
       STATUS BADGE
       ======================================================== */

    function statusBadge(status) {

        const normalized =
            String(
                status ||
                "ACTIVE"
            )
            .toUpperCase();


        let className =
            "status-active";


        if (
            normalized ===
            "INACTIVE"
        ) {

            className =
                "status-inactive";

        }


        if (
            normalized ===
            "PENDING"
        ) {

            className =
                "status-pending";

        }


        return `

            <span
                class="status-badge ${className}"
            >

                <i class="fa-solid fa-circle"
                   style="font-size:6px;">
                </i>

                ${escapeHTML(normalized)}

            </span>

        `;

    }


    /* ========================================================
       EMPTY STATE
       ======================================================== */

    function emptyStateHTML() {

        return `

            <div class="empty-state">

                <i class="fa-solid fa-layer-group"></i>

                <strong>
                    No categories found
                </strong>

                <p>
                    Create your first product category
                    to start organizing your inventory.
                </p>

            </div>

        `;

    }


    /* ========================================================
       ERROR STATE
       ======================================================== */

    function renderError(message) {

        const grid =
            getElement("categoriesGrid") ||
            getElement("categoryGrid") ||
            $(".categories-grid") ||
            $(".category-grid");


        const tableBody =
            getElement("categoriesTableBody") ||
            getElement("categoryTableBody");


        const html = `

            <div class="empty-state">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <strong>
                    Unable to load categories
                </strong>

                <p>
                    ${escapeHTML(message)}
                </p>


                <button
                    type="button"
                    class="btn btn-primary"
                    id="retryCategoriesBtn"
                    style="margin-top:15px;"
                >

                    <i class="fa-solid fa-rotate-right"></i>

                    Retry

                </button>

            </div>

        `;


        if (grid) {

            grid.innerHTML =
                html;

        }


        if (tableBody) {

            tableBody.innerHTML =
                `
                <tr>
                    <td colspan="7">
                        ${html}
                    </td>
                </tr>
                `;

        }


        getElement(
            "retryCategoriesBtn"
        )?.addEventListener(
            "click",
            loadCategories
        );

    }


    /* ========================================================
       LOADING STATE
       ======================================================== */

    function showLoading() {

        const grid =
            getElement("categoriesGrid") ||
            getElement("categoryGrid") ||
            $(".categories-grid") ||
            $(".category-grid");


        const tableBody =
            getElement("categoriesTableBody") ||
            getElement("categoryTableBody");


        const html = `

            <div class="loading-state">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Loading categories...
                </span>

            </div>

        `;


        if (grid) {

            grid.innerHTML =
                html;

        }


        if (tableBody) {

            tableBody.innerHTML =
                `
                <tr>
                    <td colspan="7">
                        ${html}
                    </td>
                </tr>
                `;

        }

    }


    /* ========================================================
       SUMMARY
       ======================================================== */

    function updateSummary() {

        const total =
            categories.length;


        const active =
            categories.filter(
                c =>
                    String(
                        c.status
                    )
                    .toUpperCase()
                    === "ACTIVE"
            ).length;


        const inactive =
            categories.filter(
                c =>
                    String(
                        c.status
                    )
                    .toUpperCase()
                    === "INACTIVE"
            ).length;


        const totalProducts =
            categories.reduce(
                (
                    total,
                    category
                ) =>
                    total +
                    Number(
                        category.productCount ||
                        0
                    ),
                0
            );


        setText(
            [
                "categoriesCount",
                "totalCategories",
                "categoryCount"
            ],
            total
        );


        setText(
            [
                "activeCategoriesCount",
                "activeCategoryCount"
            ],
            active
        );


        setText(
            [
                "inactiveCategoriesCount",
                "inactiveCategoryCount"
            ],
            inactive
        );


        setText(
            [
                "categoryProductsCount",
                "totalCategoryProducts"
            ],
            totalProducts
        );

    }


    /* ========================================================
       SEARCH
       ======================================================== */

    function bindSearch() {

        const searchInput =
            getElement("categorySearch") ||
            getElement("searchCategory") ||
            document.querySelector(
                'input[name="categorySearch"]'
            ) ||
            document.querySelector(
                '.search-box input'
            );


        searchInput?.addEventListener(
            "input",
            () => {

                applyFilters(
                    searchInput.value
                );

            }
        );

    }


    /* ========================================================
       FILTERS
       ======================================================== */

    function bindFilters() {

        const filter =
            getElement("categoryStatusFilter") ||
            getElement("statusFilter") ||
            document.querySelector(
                'select[name="categoryStatus"]'
            );


        filter?.addEventListener(
            "change",
            () => {

                const search =
                    getSearchValue();


                applyFilters(
                    search
                );

            }
        );

    }


    function applyFilters(searchValue = "") {

        const search =
            String(
                searchValue ||
                ""
            )
            .trim()
            .toLowerCase();


        const statusFilter =
            getStatusFilter();


        filteredCategories =
            categories.filter(
                category => {

                    const matchesSearch =
                        !search ||
                        String(
                            category.name
                        )
                        .toLowerCase()
                        .includes(search) ||

                        String(
                            category.description
                        )
                        .toLowerCase()
                        .includes(search);


                    const matchesStatus =
                        !statusFilter ||
                        statusFilter === "ALL" ||
                        String(
                            category.status
                        )
                        .toUpperCase()
                        === statusFilter;


                    return (
                        matchesSearch &&
                        matchesStatus
                    );

                }
            );


        currentPage = 1;

        renderCategories();

    }


    function getSearchValue() {

        const input =
            getElement("categorySearch") ||
            getElement("searchCategory") ||
            document.querySelector(
                'input[name="categorySearch"]'
            ) ||
            document.querySelector(
                '.search-box input'
            );


        return input?.value || "";

    }


    function getStatusFilter() {

        const filter =
            getElement("categoryStatusFilter") ||
            getElement("statusFilter") ||
            document.querySelector(
                'select[name="categoryStatus"]'
            );


        return String(
            filter?.value ||
            "ALL"
        )
        .toUpperCase();

    }


    /* ========================================================
       CATEGORY ACTIONS
       ======================================================== */

    function bindCategoryActions() {

        $$(".edit-category-btn")
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const id =
                                button.dataset.id;

                            openEditCategory(
                                id
                            );

                        }
                    );

                }
            );


        $$(".delete-category-btn")
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const id =
                                button.dataset.id;

                            deleteCategory(
                                id
                            );

                        }
                    );

                }
            );

    }


    /* ========================================================
       REFRESH
       ======================================================== */

    function bindRefresh() {

        const refreshButtons =
            [
                getElement("refreshCategoriesBtn"),
                getElement("refreshBtn")
            ]
            .filter(Boolean);


        refreshButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const original =
                            button.innerHTML;


                        button.disabled =
                            true;


                        button.innerHTML =
                            `
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            Refreshing
                            `;


                        try {

                            await loadCategories();

                        }

                        finally {

                            button.disabled =
                                false;

                            button.innerHTML =
                                original;

                        }

                    }
                );

            }
        );

    }


    /* ========================================================
       MODAL
       ======================================================== */

    function bindModalEvents() {

        const addButtons =
            [
                getElement("addCategoryBtn"),
                getElement("createCategoryBtn"),
                getElement("newCategoryBtn")
            ]
            .filter(Boolean);


        addButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openAddCategory();

                    }
                );

            }
        );


        const closeButtons =
            document.querySelectorAll(
                ".modal-close, [data-close-modal]"
            );


        closeButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    closeAllModals
                );

            }
        );


        document.addEventListener(
            "click",
            event => {

                if (
                    event.target.classList.contains(
                        "modal-overlay"
                    )
                ) {

                    closeAllModals();

                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeAllModals();

                }

            }
        );

    }


    /* ========================================================
       OPEN ADD CATEGORY
       ======================================================== */

    function openAddCategory() {

        editingCategoryId =
            null;


        resetCategoryForm();


        setModalTitle(
            "Add Category"
        );


        setModalOpen(
            true
        );

    }


    /* ========================================================
       OPEN EDIT CATEGORY
       ======================================================== */

    function openEditCategory(id) {

        const category =
            categories.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(id)
            );


        if (!category) {

            showNotification(
                "Category not found.",
                "error"
            );

            return;

        }


        editingCategoryId =
            category.id;


        setFormValue(
            [
                "categoryId",
                "categoryID",
                "editCategoryId"
            ],
            category.id
        );


        setFormValue(
            [
                "categoryName",
                "name"
            ],
            category.name
        );


        setFormValue(
            [
                "categoryDescription",
                "description"
            ],
            category.description
        );


        setFormValue(
            [
                "categoryStatus",
                "status"
            ],
            category.status
        );


        setModalTitle(
            "Edit Category"
        );


        setModalOpen(
            true
        );

    }


    /* ========================================================
       CATEGORY FORM
       ======================================================== */

    function bindCategoryForm() {

        const form =
            getElement("categoryForm");


        if (!form) {

            return;

        }


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await saveCategory(
                    form
                );

            }
        );

    }


    /* ========================================================
       SAVE CATEGORY
       ======================================================== */

    async function saveCategory(form) {

        const submitButton =
            form.querySelector(
                'button[type="submit"]'
            );


        const name =
            getFormValue(
                [
                    "categoryName",
                    "name"
                ]
            );


        const description =
            getFormValue(
                [
                    "categoryDescription",
                    "description"
                ]
            );


        const status =
            getFormValue(
                [
                    "categoryStatus",
                    "status"
                ]
            ) ||
            "ACTIVE";


        if (!name.trim()) {

            showNotification(
                "Category name is required.",
                "error"
            );

            return;

        }


        const duplicate =
            categories.find(
                category =>
                    String(
                        category.name
                    )
                    .trim()
                    .toLowerCase()
                    ===
                    name
                        .trim()
                        .toLowerCase()
                    &&
                    String(
                        category.id
                    ) !==
                    String(
                        editingCategoryId
                    )
            );


        if (duplicate) {

            showNotification(
                "A category with this name already exists.",
                "error"
            );

            return;

        }


        const payload = {

            action:
                editingCategoryId
                    ? "updateCategory"
                    : "createCategory",

            id:
                editingCategoryId ||
                undefined,

            categoryId:
                editingCategoryId ||
                undefined,

            name:
                name.trim(),

            categoryName:
                name.trim(),

            description:
                description.trim(),

            status:
                String(
                    status
                ).toUpperCase()

        };


        try {

            setButtonLoading(
                submitButton,
                true,
                editingCategoryId
                    ? "Updating..."
                    : "Creating..."
            );


            let response;


            if (
                editingCategoryId
            ) {

                if (
                    typeof StockFlowAPI.updateCategory ===
                    "function"
                ) {

                    response =
                        await StockFlowAPI.updateCategory(
                            payload
                        );

                }

                else {

                    response =
                        await callGenericAPI(
                            payload
                        );

                }

            }

            else {

                if (
                    typeof StockFlowAPI.createCategory ===
                    "function"
                ) {

                    response =
                        await StockFlowAPI.createCategory(
                            payload
                        );

                }

                else if (
                    typeof StockFlowAPI.addCategory ===
                    "function"
                ) {

                    response =
                        await StockFlowAPI.addCategory(
                            payload
                        );

                }

                else {

                    response =
                        await callGenericAPI(
                            payload
                        );

                }

            }


            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Unable to save category."
                );

            }


            showNotification(
                editingCategoryId
                    ? "Category updated successfully."
                    : "Category created successfully.",
                "success"
            );


            closeAllModals();


            await loadCategories();


        } catch (error) {

            console.error(
                "Save category error:",
                error
            );


            showNotification(
                error.message ||
                "Unable to save category.",
                "error"
            );


        } finally {

            setButtonLoading(
                submitButton,
                false
            );

        }

    }


    /* ========================================================
       DELETE CATEGORY
       ======================================================== */

    async function deleteCategory(id) {

        const category =
            categories.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(id)
            );


        if (!category) {

            showNotification(
                "Category not found.",
                "error"
            );

            return;

        }


        const productCount =
            Number(
                category.productCount ||
                0
            );


        let message =
            `Delete "${category.name}"?`;


        if (
            productCount > 0
        ) {

            message +=
                ` This category currently has ${productCount} product${productCount === 1 ? "" : "s"}.`;

        }


        const confirmed =
            window.confirm(
                message
            );


        if (!confirmed) {

            return;

        }


        try {

            let response;


            const payload = {

                action:
                    "deleteCategory",

                id:
                    category.id,

                categoryId:
                    category.id

            };


            if (
                typeof StockFlowAPI.deleteCategory ===
                "function"
            ) {

                response =
                    await StockFlowAPI.deleteCategory(
                        payload
                    );

            }

            else {

                response =
                    await callGenericAPI(
                        payload
                    );

            }


            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Unable to delete category."
                );

            }


            showNotification(
                "Category deleted successfully.",
                "success"
            );


            await loadCategories();


        } catch (error) {

            console.error(
                "Delete category error:",
                error
            );


            showNotification(
                error.message ||
                "Unable to delete category.",
                "error"
            );

        }

    }


    /* ========================================================
       GENERIC API FALLBACK
       ======================================================== */

    async function callGenericAPI(payload) {

        if (
            typeof StockFlowAPI.request ===
            "function"
        ) {

            return await StockFlowAPI.request(
                payload
            );

        }


        if (
            typeof StockFlowAPI.post ===
            "function"
        ) {

            return await StockFlowAPI.post(
                payload
            );

        }


        if (
            typeof StockFlowAPI.apiRequest ===
            "function"
        ) {

            return await StockFlowAPI.apiRequest(
                payload
            );

        }


        throw new Error(
            "The required Categories API method is not available in API.js."
        );

    }


    /* ========================================================
       PAGINATION
       ======================================================== */

    function updatePagination() {

        const total =
            filteredCategories.length;


        const pages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    itemsPerPage
                )
            );


        if (
            currentPage >
            pages
        ) {

            currentPage =
                pages;

        }


        const pageInfo =
            getElement(
                "paginationInfo"
            );


        if (pageInfo) {

            if (total === 0) {

                pageInfo.textContent =
                    "No categories";

            }

            else {

                const start =
                    (currentPage - 1) *
                    itemsPerPage +
                    1;


                const end =
                    Math.min(
                        currentPage *
                        itemsPerPage,
                        total
                    );


                pageInfo.textContent =
                    `Showing ${start}–${end} of ${total} categories`;

            }

        }


        const pagination =
            getElement(
                "paginationButtons"
            );


        if (!pagination) {

            return;

        }


        if (
            pages <= 1
        ) {

            pagination.innerHTML =
                "";

            return;

        }


        let html = "";


        html += `

            <button
                type="button"
                class="pagination-btn"
                data-page="${currentPage - 1}"
                ${currentPage === 1 ? "disabled" : ""}
            >

                <i class="fa-solid fa-chevron-left"></i>

            </button>

        `;


        for (
            let page = 1;
            page <= pages;
            page++
        ) {

            html += `

                <button
                    type="button"
                    class="pagination-btn ${page === currentPage ? "active" : ""}"
                    data-page="${page}"
                >

                    ${page}

                </button>

            `;

        }


        html += `

            <button
                type="button"
                class="pagination-btn"
                data-page="${currentPage + 1}"
                ${currentPage === pages ? "disabled" : ""}
            >

                <i class="fa-solid fa-chevron-right"></i>

            </button>

        `;


        pagination.innerHTML =
            html;


        pagination
            .querySelectorAll(
                "[data-page]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const page =
                                Number(
                                    button.dataset.page
                                );


                            if (
                                page < 1 ||
                                page > pages
                            ) {

                                return;

                            }


                            currentPage =
                                page;


                            renderCategories();

                        }
                    );

                }
            );

    }


    /* ========================================================
       FORM HELPERS
       ======================================================== */

    function getFormValue(ids) {

        for (
            const id of ids
        ) {

            const element =
                getElement(id);


            if (
                element
            ) {

                return element.value ||
                    "";

            }

        }


        return "";

    }


    function setFormValue(
        ids,
        value
    ) {

        for (
            const id of ids
        ) {

            const element =
                getElement(id);


            if (
                element
            ) {

                element.value =
                    value ??
                    "";

                return;

            }

        }

    }


    function resetCategoryForm() {

        const form =
            getElement(
                "categoryForm"
            );


        if (
            form
        ) {

            form.reset();

        }


        setFormValue(
            [
                "categoryStatus",
                "status"
            ],
            "ACTIVE"
        );

    }


    /* ========================================================
       MODAL HELPERS
       ======================================================== */

    function setModalTitle(title) {

        const elements =
            [
                getElement("categoryModalTitle"),
                getElement("modalTitle"),
                document.querySelector(
                    ".modal-header h2"
                ),
                document.querySelector(
                    ".modal-header h3"
                )
            ]
            .filter(Boolean);


        if (
            elements.length
        ) {

            elements[0].textContent =
                title;

        }

    }


    function setModalOpen(open) {

        const modal =
            getElement(
                "categoryModal"
            ) ||
            getElement(
                "categoryModalOverlay"
            ) ||
            document.querySelector(
                ".modal-overlay"
            );


        if (!modal) {

            return;

        }


        if (open) {

            modal.classList.add(
                "active"
            );

            modal.classList.add(
                "show"
            );


            modal.setAttribute(
                "aria-hidden",
                "false"
            );

        }

        else {

            modal.classList.remove(
                "active"
            );

            modal.classList.remove(
                "show"
            );


            modal.setAttribute(
                "aria-hidden",
                "true"
            );

        }

    }


    function closeAllModals() {

        document
            .querySelectorAll(
                ".modal-overlay"
            )
            .forEach(
                modal => {

                    modal.classList.remove(
                        "active"
                    );

                    modal.classList.remove(
                        "show"
                    );

                    modal.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                }
            );


        editingCategoryId =
            null;

    }


    /* ========================================================
       CONNECTION STATUS
       ======================================================== */

    function setConnectionStatus(status) {

        const badge =
            getElement(
                "connectionBadge"
            );


        if (!badge) {

            return;

        }


        badge.textContent =
            status;


        badge.classList.remove(
            "online",
            "offline",
            "connecting"
        );


        const normalized =
            String(
                status
            )
            .toLowerCase();


        if (
            normalized ===
            "online"
        ) {

            badge.classList.add(
                "online"
            );

        }

        else if (
            normalized ===
            "offline"
        ) {

            badge.classList.add(
                "offline"
            );

        }

        else {

            badge.classList.add(
                "connecting"
            );

        }

    }


    /* ========================================================
       BUTTON LOADING
       ======================================================== */

    function setButtonLoading(
        button,
        loading,
        text = "Saving..."
    ) {

        if (!button) {

            return;

        }


        if (
            loading
        ) {

            button.dataset.originalText =
                button.innerHTML;


            button.disabled =
                true;


            button.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>
                ${escapeHTML(text)}
                `;

        }

        else {

            button.disabled =
                false;


            if (
                button.dataset.originalText
            ) {

                button.innerHTML =
                    button.dataset.originalText;

            }

        }

    }


    /* ========================================================
       NOTIFICATION
       ======================================================== */

    function showNotification(
        message,
        type = "info"
    ) {

        let container =
            getElement(
                "notificationContainer"
            );


        if (!container) {

            container =
                document.createElement(
                    "div"
                );


            container.id =
                "notificationContainer";


            container.style.position =
                "fixed";

            container.style.top =
                "20px";

            container.style.right =
                "20px";

            container.style.zIndex =
                "10000";

            container.style.display =
                "flex";

            container.style.flexDirection =
                "column";

            container.style.gap =
                "10px";


            document.body.appendChild(
                container
            );

        }


        const notification =
            document.createElement(
                "div"
            );


        notification.style.padding =
            "13px 16px";

        notification.style.borderRadius =
            "10px";

        notification.style.background =
            "#ffffff";

        notification.style.border =
            "1px solid #e3eaf3";

        notification.style.boxShadow =
            "0 10px 30px rgba(15,35,65,.12)";

        notification.style.fontSize =
            "13px";

        notification.style.fontWeight =
            "600";

        notification.style.maxWidth =
            "340px";


        const icon =
            type === "success"
                ? "fa-circle-check"
                : type === "error"
                    ? "fa-circle-exclamation"
                    : "fa-circle-info";


        notification.innerHTML =
            `

            <div style="
                display:flex;
                align-items:flex-start;
                gap:9px;
            ">

                <i
                    class="fa-solid ${icon}"
                    style="margin-top:2px;"
                ></i>

                <span>
                    ${escapeHTML(message)}
                </span>

            </div>

            `;


        container.appendChild(
            notification
        );


        setTimeout(
            () => {

                notification.style.opacity =
                    "0";

                notification.style.transform =
                    "translateY(-5px)";

                notification.style.transition =
                    "all .2s ease";


                setTimeout(
                    () => {

                        notification.remove();

                    },
                    220
                );

            },
            3500
        );

    }


    /* ========================================================
       TEXT HELPER
       ======================================================== */

    function setText(
        ids,
        value
    ) {

        ids.forEach(
            id => {

                const element =
                    getElement(id);


                if (
                    element
                ) {

                    element.textContent =
                        value ??
                        0;

                }

            }
        );

    }


    /* ========================================================
       DATE FORMAT
       ======================================================== */

    function formatDate(value) {

        if (!value) {

            return "";

        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(
                value
            );

        }


        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    }


    /* ========================================================
       HTML ESCAPE
       ======================================================== */

    function escapeHTML(value) {

        return String(
            value ??
            ""
        )
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


    /* ========================================================
       EXPOSE REFRESH FOR OTHER MODULES
       ======================================================== */

    window.StockFlowCategories = {

        reload:
            loadCategories,

        getCategories:
            () => [
                ...categories
            ],

        getFilteredCategories:
            () => [
                ...filteredCategories
            ]

    };

});
