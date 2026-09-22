/* =========================================================
   STOCKFLOW — CATEGORIES MODULE
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

    const totalCategories =
        document.getElementById("totalCategories");

    const activeCategories =
        document.getElementById("activeCategories");

    const categorizedProducts =
        document.getElementById("categorizedProducts");

    const emptyCategories =
        document.getElementById("emptyCategories");

    const addCategoryBtn =
        document.getElementById("addCategoryBtn");

    const emptyAddCategoryBtn =
        document.getElementById("emptyAddCategoryBtn");

    const refreshCategoriesBtn =
        document.getElementById("refreshCategoriesBtn");

    const retryCategoriesBtn =
        document.getElementById("retryCategoriesBtn");

    const categorySearch =
        document.getElementById("categorySearch");

    const categoryStatusFilter =
        document.getElementById("categoryStatusFilter");

    const categoriesTable =
        document.getElementById("categoriesTable");

    const categoriesTableBody =
        document.getElementById("categoriesTableBody");

    const categoriesLoading =
        document.getElementById("categoriesLoading");

    const categoriesEmpty =
        document.getElementById("categoriesEmpty");

    const categoriesError =
        document.getElementById("categoriesError");

    const categoriesErrorMessage =
        document.getElementById("categoriesErrorMessage");

    const categoryResultsInfo =
        document.getElementById("categoryResultsInfo");

    const categoryPagination =
        document.getElementById("categoryPagination");

    /* MODAL */

    const categoryModal =
        document.getElementById("categoryModal");

    const categoryModalTitle =
        document.getElementById("categoryModalTitle");

    const closeCategoryModal =
        document.getElementById("closeCategoryModal");

    const cancelCategoryBtn =
        document.getElementById("cancelCategoryBtn");

    const categoryForm =
        document.getElementById("categoryForm");

    const categoryId =
        document.getElementById("categoryId");

    const categoryName =
        document.getElementById("categoryName");

    const categoryDescription =
        document.getElementById("categoryDescription");

    const categoryStatus =
        document.getElementById("categoryStatus");

    const categoryFormMessage =
        document.getElementById("categoryFormMessage");

    const saveCategoryBtn =
        document.getElementById("saveCategoryBtn");

    const saveCategorySpinner =
        document.getElementById("saveCategorySpinner");

    const saveCategoryIcon =
        document.getElementById("saveCategoryIcon");

    const saveCategoryText =
        document.getElementById("saveCategoryText");

    /* DELETE MODAL */

    const deleteCategoryModal =
        document.getElementById("deleteCategoryModal");

    const deleteCategoryName =
        document.getElementById("deleteCategoryName");

    const deleteCategoryMessage =
        document.getElementById("deleteCategoryMessage");

    const cancelDeleteCategoryBtn =
        document.getElementById("cancelDeleteCategoryBtn");

    const confirmDeleteCategoryBtn =
        document.getElementById("confirmDeleteCategoryBtn");

    const deleteCategorySpinner =
        document.getElementById("deleteCategorySpinner");

    /* TOAST */

    const toastContainer =
        document.getElementById("toastContainer");


    /* =====================================================
       STATE
    ===================================================== */

    let categories = [];
    let filteredCategories = [];
    let editingCategory = null;
    let deletingCategory = null;

    let currentPage = 1;

    const itemsPerPage = 8;


    /* =====================================================
       API RESOLVER
    ===================================================== */

    function getAPI() {

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI === "object"
        ) {
            return window.StockFlowAPI;
        }

        if (
            window.API &&
            typeof window.API === "object"
        ) {
            return window.API;
        }

        return null;
    }


    /* =====================================================
       API CALL
    ===================================================== */

    async function callAPI(action, payload = {}) {

        const api = getAPI();

        if (!api) {
            throw new Error(
                "StockFlow API is not available."
            );
        }

        /*
         * Supports:
         * StockFlowAPI.request(action, payload)
         * StockFlowAPI[action](payload)
         * API.request(action, payload)
         * API[action](payload)
         */

        if (typeof api.request === "function") {
            return await api.request(
                action,
                payload
            );
        }

        if (typeof api[action] === "function") {
            return await api[action](payload);
        }

        throw new Error(
            `API action "${action}" is not available.`
        );
    }


    /* =====================================================
       AUTH / USER UI
    ===================================================== */

    function loadUserUI() {

        const user =
            getCurrentUser();

        if (!user) {
            return;
        }

        const name =
            user.fullName ||
            user.name ||
            user.username ||
            "User";

        const role =
            user.role ||
            user.accountStatus ||
            "Employee";

        const avatar =
            name
                .trim()
                .charAt(0)
                .toUpperCase() || "U";

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
                "sidebarUserAvatar"
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
                "topbarUserAvatar"
            );

        if (sidebarName)
            sidebarName.textContent = name;

        if (sidebarRole)
            sidebarRole.textContent = role;

        if (sidebarAvatar)
            sidebarAvatar.textContent = avatar;

        if (topbarName)
            topbarName.textContent = name;

        if (topbarRole)
            topbarRole.textContent = role;

        if (topbarAvatar)
            topbarAvatar.textContent = avatar;
    }


    function getCurrentUser() {

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.getCurrentUser === "function"
            ) {
                return window.StockFlowAuth.getCurrentUser();
            }

        } catch (error) {
            console.warn(
                "Unable to read StockFlowAuth user.",
                error
            );
        }

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
                    return JSON.parse(raw);
                } catch {
                    return {
                        username: raw
                    };
                }
            }

        } catch (error) {
            console.warn(
                "Unable to read localStorage user.",
                error
            );
        }

        return null;
    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function handleLogout() {

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.logout === "function"
            ) {
                window.StockFlowAuth.logout();
                return;
            }

        } catch (error) {
            console.warn(error);
        }

        localStorage.removeItem("stockflowUser");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("user");
        localStorage.removeItem("loggedInUser");

        window.location.href =
            "login.html";
    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    function openSidebar() {

        if (sidebar)
            sidebar.classList.add("open");

        if (sidebarOverlay)
            sidebarOverlay.classList.add("active");
    }


    function closeSidebar() {

        if (sidebar)
            sidebar.classList.remove("open");

        if (sidebarOverlay)
            sidebarOverlay.classList.remove("active");
    }


    /* =====================================================
       CONNECTION STATUS
    ===================================================== */

    function setConnection(
        online,
        message = ""
    ) {

        if (connectionBadge) {

            const text =
                connectionBadge.querySelector(
                    "span:last-child"
                );

            if (text) {
                text.textContent =
                    online
                        ? "ONLINE"
                        : "OFFLINE";
            }

            connectionBadge.style.borderColor =
                online
                    ? "#d7e7dc"
                    : "#fecaca";

            connectionBadge.style.background =
                online
                    ? "#f5fbf7"
                    : "#fef2f2";

            connectionBadge.style.color =
                online
                    ? "#16803d"
                    : "#dc2626";

            const dot =
                connectionBadge.querySelector(
                    ".connection-dot"
                );

            if (dot) {
                dot.style.background =
                    online
                        ? "#16a34a"
                        : "#dc2626";
            }
        }

        if (connectionMessage) {

            if (message) {
                connectionMessage.textContent =
                    message;

                connectionMessage.hidden = false;
            } else {
                connectionMessage.hidden = true;
            }
        }
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "info"
    ) {

        if (!toastContainer) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className =
            `toast ${type}`;

        const icon =
            type === "success"
                ? "fa-circle-check"
                : type === "error"
                    ? "fa-circle-exclamation"
                    : "fa-circle-info";

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${escapeHTML(message)}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {

            toast.style.opacity = "0";
            toast.style.transform =
                "translateY(8px)";

            setTimeout(() => {
                toast.remove();
            }, 200);

        }, 3500);
    }


    /* =====================================================
       HTML ESCAPE
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


    /* =====================================================
       NORMALIZE CATEGORY
    ===================================================== */

    function normalizeCategory(item) {

        if (!item || typeof item !== "object") {
            return {};
        }

        return {
            id:
                item.id ??
                item.category_id ??
                item.categoryId ??
                item.ID ??
                "",

            name:
                item.name ??
                item.category_name ??
                item.categoryName ??
                item.NAME ??
                "",

            description:
                item.description ??
                item.category_description ??
                item.categoryDescription ??
                item.DESCRIPTION ??
                "",

            status:
                String(
                    item.status ??
                    item.category_status ??
                    item.categoryStatus ??
                    item.STATUS ??
                    "ACTIVE"
                ).toUpperCase(),

            products:
                Number(
                    item.products ??
                    item.product_count ??
                    item.productCount ??
                    item.PRODUCTS ??
                    0
                ),

            created:
                item.created ??
                item.created_at ??
                item.createdAt ??
                item.CREATED ??
                ""
        };
    }


    /* =====================================================
       LOAD CATEGORIES
    ===================================================== */

    async function loadCategories() {

        showLoading();

        setConnection(
            true,
            ""
        );

        try {

            const response =
                await callAPI(
                    "listCategories"
                );

            const result =
                response?.data ??
                response?.categories ??
                response?.rows ??
                response;

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to load categories."
                );
            }

            const list =
                Array.isArray(result)
                    ? result
                    : Array.isArray(result?.categories)
                        ? result.categories
                        : [];

            categories =
                list.map(normalizeCategory);

            updateStatistics();

            applyFilters();

            setConnection(
                true,
                ""
            );

        } catch (error) {

            console.error(
                "Category loading error:",
                error
            );

            categories = [];

            renderTable();

            showError(
                error?.message ||
                "Unable to load categories."
            );

            setConnection(
                false,
                "Unable to connect to the inventory service. Please check your connection."
            );
        }
    }


    /* =====================================================
       FILTER
    ===================================================== */

    function applyFilters() {

        const search =
            String(
                categorySearch?.value || ""
            )
                .trim()
                .toLowerCase();

        const status =
            categoryStatusFilter?.value ||
            "ALL";

        filteredCategories =
            categories.filter(category => {

                const matchesSearch =
                    !search ||
                    category.name
                        .toLowerCase()
                        .includes(search) ||
                    category.description
                        .toLowerCase()
                        .includes(search);

                const matchesStatus =
                    status === "ALL" ||
                    category.status === status;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            });

        currentPage = 1;

        renderTable();
    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderTable() {

        if (!categoriesTableBody) {
            return;
        }

        hideStateElements();

        if (
            filteredCategories.length === 0
        ) {

            if (categoriesEmpty) {
                categoriesEmpty.hidden = false;
            }

            updateResultsInfo();

            if (categoryPagination) {
                categoryPagination.innerHTML = "";
            }

            return;
        }

        if (categoriesTable) {
            categoriesTable.style.display =
                "table";
        }

        const start =
            (currentPage - 1) *
            itemsPerPage;

        const end =
            start + itemsPerPage;

        const visible =
            filteredCategories.slice(
                start,
                end
            );

        categoriesTableBody.innerHTML =
            visible.map(
                renderCategoryRow
            ).join("");

        updateResultsInfo();
        renderPagination();
    }


    /* =====================================================
       CATEGORY ROW
    ===================================================== */

    function renderCategoryRow(
        category
    ) {

        const status =
            category.status === "ACTIVE"
                ? "ACTIVE"
                : "INACTIVE";

        const statusClass =
            status === "ACTIVE"
                ? "status-active"
                : "status-inactive";

        const created =
            formatDate(
                category.created
            );

        const description =
            category.description ||
            "No description provided.";

        return `
            <tr data-id="${escapeHTML(category.id)}">

                <td>
                    <div class="category-name">

                        <div class="category-icon">
                            <i class="fa-solid fa-layer-group"></i>
                        </div>

                        <div class="category-name-text">

                            <strong>
                                ${escapeHTML(category.name || "Unnamed")}
                            </strong>

                            <span>
                                Category
                            </span>

                        </div>

                    </div>
                </td>

                <td>
                    <div class="description-cell">
                        ${escapeHTML(description)}
                    </div>
                </td>

                <td>
                    <strong>
                        ${Number(category.products || 0).toLocaleString()}
                    </strong>
                </td>

                <td>
                    <span class="status-pill ${statusClass}">
                        ${status}
                    </span>
                </td>

                <td>
                    ${escapeHTML(created)}
                </td>

                <td>

                    <div class="table-actions">

                        <button
                            type="button"
                            class="table-action edit-category-btn"
                            data-id="${escapeHTML(category.id)}"
                            title="Edit category"
                            aria-label="Edit category"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="table-action delete-category-btn"
                            data-id="${escapeHTML(category.id)}"
                            title="Delete category"
                            aria-label="Delete category"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>

                </td>

            </tr>
        `;
    }


    /* =====================================================
       STATES
    ===================================================== */

    function hideStateElements() {

        if (categoriesLoading)
            categoriesLoading.hidden = true;

        if (categoriesEmpty)
            categoriesEmpty.hidden = true;

        if (categoriesError)
            categoriesError.hidden = true;
    }


    function showLoading() {

        if (categoriesTable)
            categoriesTable.style.display =
                "none";

        if (categoriesLoading)
            categoriesLoading.hidden = false;

        if (categoriesEmpty)
            categoriesEmpty.hidden = true;

        if (categoriesError)
            categoriesError.hidden = true;
    }


    function showError(message) {

        if (categoriesTable)
            categoriesTable.style.display =
                "none";

        if (categoriesLoading)
            categoriesLoading.hidden = true;

        if (categoriesEmpty)
            categoriesEmpty.hidden = true;

        if (categoriesError)
            categoriesError.hidden = false;

        if (categoriesErrorMessage)
            categoriesErrorMessage.textContent =
                message;
    }


    /* =====================================================
       STATISTICS
    ===================================================== */

    function updateStatistics() {

        const total =
            categories.length;

        const active =
            categories.filter(
                item => item.status === "ACTIVE"
            ).length;

        const products =
            categories.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.products || 0
                    ),
                0
            );

        const empty =
            categories.filter(
                item =>
                    Number(
                        item.products || 0
                    ) === 0
            ).length;

        if (totalCategories)
            totalCategories.textContent =
                total.toLocaleString();

        if (activeCategories)
            activeCategories.textContent =
                active.toLocaleString();

        if (categorizedProducts)
            categorizedProducts.textContent =
                products.toLocaleString();

        if (emptyCategories)
            emptyCategories.textContent =
                empty.toLocaleString();
    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination() {

        if (!categoryPagination) {
            return;
        }

        const pageCount =
            Math.ceil(
                filteredCategories.length /
                itemsPerPage
            );

        categoryPagination.innerHTML = "";

        if (pageCount <= 1) {
            return;
        }

        const previous =
            document.createElement("button");

        previous.type = "button";
        previous.innerHTML =
            '<i class="fa-solid fa-chevron-left"></i>';

        previous.disabled =
            currentPage === 1;

        previous.addEventListener(
            "click",
            () => {

                if (currentPage > 1) {
                    currentPage--;
                    renderTable();
                }

            }
        );

        categoryPagination.appendChild(
            previous
        );

        for (
            let page = 1;
            page <= pageCount;
            page++
        ) {

            const button =
                document.createElement("button");

            button.type = "button";
            button.textContent = page;

            if (page === currentPage) {
                button.classList.add("active");
            }

            button.addEventListener(
                "click",
                () => {
                    currentPage = page;
                    renderTable();
                }
            );

            categoryPagination.appendChild(
                button
            );
        }

        const next =
            document.createElement("button");

        next.type = "button";
        next.innerHTML =
            '<i class="fa-solid fa-chevron-right"></i>';

        next.disabled =
            currentPage === pageCount;

        next.addEventListener(
            "click",
            () => {

                if (
                    currentPage <
                    pageCount
                ) {
                    currentPage++;
                    renderTable();
                }

            }
        );

        categoryPagination.appendChild(
            next
        );
    }


    function updateResultsInfo() {

        if (!categoryResultsInfo) {
            return;
        }

        const total =
            filteredCategories.length;

        if (total === 0) {

            categoryResultsInfo.textContent =
                "Showing 0 categories";

            return;
        }

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

        categoryResultsInfo.textContent =
            `Showing ${start}-${end} of ${total} categories`;
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

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "2-digit"
            }
        ).format(date);
    }


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    function openAddModal() {

        editingCategory = null;

        categoryForm?.reset();

        if (categoryId)
            categoryId.value = "";

        if (categoryStatus)
            categoryStatus.value =
                "ACTIVE";

        if (categoryModalTitle)
            categoryModalTitle.textContent =
                "Add Category";

        if (saveCategoryText)
            saveCategoryText.textContent =
                "Save Category";

        hideFormMessage();

        openModal(
            categoryModal
        );

        setTimeout(() => {
            categoryName?.focus();
        }, 80);
    }


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    function openEditModal(id) {

        const category =
            categories.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!category) {
            showToast(
                "Category not found.",
                "error"
            );
            return;
        }

        editingCategory =
            category;

        if (categoryId)
            categoryId.value =
                category.id;

        if (categoryName)
            categoryName.value =
                category.name;

        if (categoryDescription)
            categoryDescription.value =
                category.description;

        if (categoryStatus)
            categoryStatus.value =
                category.status;

        if (categoryModalTitle)
            categoryModalTitle.textContent =
                "Edit Category";

        if (saveCategoryText)
            saveCategoryText.textContent =
                "Update Category";

        hideFormMessage();

        openModal(
            categoryModal
        );

        setTimeout(() => {
            categoryName?.focus();
        }, 80);
    }


    /* =====================================================
       MODAL HELPERS
    ===================================================== */

    function openModal(modal) {

        if (!modal) {
            return;
        }

        modal.hidden = false;

        document.body.style.overflow =
            "hidden";
    }


    function closeModal(modal) {

        if (!modal) {
            return;
        }

        modal.hidden = true;

        if (
            categoryModal.hidden &&
            deleteCategoryModal.hidden
        ) {
            document.body.style.overflow =
                "";
        }
    }


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    function showFormMessage(
        element,
        message,
        type = "error"
    ) {

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.className =
            `form-message ${type}`;

        element.hidden = false;
    }


    function hideFormMessage(
        element = categoryFormMessage
    ) {

        if (!element) {
            return;
        }

        element.hidden = true;
        element.textContent = "";
        element.className =
            "form-message";
    }


    /* =====================================================
       SAVE CATEGORY
    ===================================================== */

    async function saveCategory() {

        const name =
            categoryName?.value
                .trim() || "";

        const description =
            categoryDescription?.value
                .trim() || "";

        const status =
            categoryStatus?.value ||
            "ACTIVE";

        if (!name) {

            showFormMessage(
                categoryFormMessage,
                "Category name is required."
            );

            categoryName?.focus();

            return;
        }

        if (name.length > 100) {

            showFormMessage(
                categoryFormMessage,
                "Category name cannot exceed 100 characters."
            );

            return;
        }

        setSaveLoading(true);

        try {

            const payload = {
                id:
                    categoryId?.value ||
                    null,

                name,

                description,

                status
            };

            const action =
                editingCategory
                    ? "saveCategory"
                    : "saveCategory";

            const response =
                await callAPI(
                    action,
                    payload
                );

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to save category."
                );
            }

            closeModal(
                categoryModal
            );

            showToast(
                editingCategory
                    ? "Category updated successfully."
                    : "Category created successfully.",
                "success"
            );

            await loadCategories();

        } catch (error) {

            console.error(
                "Save category error:",
                error
            );

            showFormMessage(
                categoryFormMessage,
                error?.message ||
                "Unable to save category."
            );

        } finally {

            setSaveLoading(false);
        }
    }


    function setSaveLoading(
        loading
    ) {

        if (!saveCategoryBtn) {
            return;
        }

        saveCategoryBtn.disabled =
            loading;

        if (saveCategorySpinner)
            saveCategorySpinner.hidden =
                !loading;

        if (saveCategoryIcon)
            saveCategoryIcon.hidden =
                loading;

        if (saveCategoryText)
            saveCategoryText.textContent =
                loading
                    ? "Saving..."
                    : editingCategory
                        ? "Update Category"
                        : "Save Category";
    }


    /* =====================================================
       DELETE MODAL
    ===================================================== */

    function openDeleteModal(id) {

        const category =
            categories.find(
                item =>
                    String(item.id) ===
                    String(id)
            );

        if (!category) {
            showToast(
                "Category not found.",
                "error"
            );
            return;
        }

        deletingCategory =
            category;

        if (deleteCategoryName)
            deleteCategoryName.textContent =
                category.name;

        hideFormMessage(
            deleteCategoryMessage
        );

        openModal(
            deleteCategoryModal
        );
    }


    function setDeleteLoading(
        loading
    ) {

        if (!confirmDeleteCategoryBtn) {
            return;
        }

        confirmDeleteCategoryBtn.disabled =
            loading;

        if (deleteCategorySpinner)
            deleteCategorySpinner.hidden =
                !loading;
    }


    /* =====================================================
       DELETE CATEGORY
    ===================================================== */

    async function deleteCategory() {

        if (!deletingCategory) {
            return;
        }

        setDeleteLoading(true);

        try {

            const response =
                await callAPI(
                    "deleteCategory",
                    {
                        id:
                            deletingCategory.id
                    }
                );

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to delete category."
                );
            }

            closeModal(
                deleteCategoryModal
            );

            showToast(
                "Category deleted successfully.",
                "success"
            );

            deletingCategory =
                null;

            await loadCategories();

        } catch (error) {

            console.error(
                "Delete category error:",
                error
            );

            showFormMessage(
                deleteCategoryMessage,
                error?.message ||
                "Unable to delete category."
            );

        } finally {

            setDeleteLoading(false);
        }
    }


    /* =====================================================
       EVENT DELEGATION
    ===================================================== */

    categoriesTableBody?.addEventListener(
        "click",
        event => {

            const editButton =
                event.target.closest(
                    ".edit-category-btn"
                );

            if (editButton) {

                openEditModal(
                    editButton.dataset.id
                );

                return;
            }

            const deleteButton =
                event.target.closest(
                    ".delete-category-btn"
                );

            if (deleteButton) {

                openDeleteModal(
                    deleteButton.dataset.id
                );
            }
        }
    );


    /* =====================================================
       EVENTS
    ===================================================== */

    addCategoryBtn?.addEventListener(
        "click",
        openAddModal
    );

    emptyAddCategoryBtn?.addEventListener(
        "click",
        openAddModal
    );

    refreshCategoriesBtn?.addEventListener(
        "click",
        loadCategories
    );

    retryCategoriesBtn?.addEventListener(
        "click",
        loadCategories
    );

    categorySearch?.addEventListener(
        "input",
        applyFilters
    );

    categoryStatusFilter?.addEventListener(
        "change",
        applyFilters
    );

    categoryForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();
            saveCategory();
        }
    );

    closeCategoryModal?.addEventListener(
        "click",
        () => closeModal(categoryModal)
    );

    cancelCategoryBtn?.addEventListener(
        "click",
        () => closeModal(categoryModal)
    );

    cancelDeleteCategoryBtn?.addEventListener(
        "click",
        () => closeModal(deleteCategoryModal)
    );

    confirmDeleteCategoryBtn?.addEventListener(
        "click",
        deleteCategory
    );

    categoryModal?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                categoryModal
            ) {
                closeModal(categoryModal);
            }

        }
    );

    deleteCategoryModal?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                deleteCategoryModal
            ) {
                closeModal(
                    deleteCategoryModal
                );
            }

        }
    );

    mobileMenuBtn?.addEventListener(
        "click",
        openSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        closeSidebar
    );

    logoutBtn?.addEventListener(
        "click",
        handleLogout
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                if (
                    categoryModal &&
                    !categoryModal.hidden
                ) {
                    closeModal(
                        categoryModal
                    );
                }

                if (
                    deleteCategoryModal &&
                    !deleteCategoryModal.hidden
                ) {
                    closeModal(
                        deleteCategoryModal
                    );
                }

                closeSidebar();
            }
        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    loadUserUI();
    loadCategories();

});
