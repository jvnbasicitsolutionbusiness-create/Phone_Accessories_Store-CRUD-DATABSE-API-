/* =========================================================
   STOCKFLOW - CATEGORIES
   Complete CRUD frontend
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       CONFIG
    ===================================================== */

    const API_URL =
        window.API_URL ||
        window.STOCKFLOW_API_URL ||
        "";

    if (!API_URL) {
        console.error(
            "StockFlow: API_URL is missing. Check config.js."
        );
    }


    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const addCategoryBtn =
        $("addCategoryBtn");

    const emptyAddCategoryBtn =
        $("emptyAddCategoryBtn");

    const categoryModal =
        $("categoryModal");

    const closeCategoryModal =
        $("closeCategoryModal");

    const cancelCategoryBtn =
        $("cancelCategoryBtn");

    const categoryForm =
        $("categoryForm");

    const categoryId =
        $("categoryId");

    const categoryName =
        $("categoryName");

    const categoryDescription =
        $("categoryDescription");

    const categoryStatus =
        $("categoryStatus");

    const categoryFormMessage =
        $("categoryFormMessage");

    const saveCategoryBtn =
        $("saveCategoryBtn");

    const saveCategorySpinner =
        $("saveCategorySpinner");

    const saveCategoryIcon =
        $("saveCategoryIcon");

    const saveCategoryText =
        $("saveCategoryText");

    const categoriesTableBody =
        $("categoriesTableBody");

    const categoriesLoading =
        $("categoriesLoading");

    const categoriesEmpty =
        $("categoriesEmpty");

    const categoriesError =
        $("categoriesError");

    const categoriesErrorMessage =
        $("categoriesErrorMessage");

    const retryCategoriesBtn =
        $("retryCategoriesBtn");

    const categorySearch =
        $("categorySearch");

    const categoryStatusFilter =
        $("categoryStatusFilter");

    const refreshCategoriesBtn =
        $("refreshCategoriesBtn");

    const totalCategories =
        $("totalCategories");

    const activeCategories =
        $("activeCategories");

    const categorizedProducts =
        $("categorizedProducts");

    const emptyCategories =
        $("emptyCategories");

    const categoryResultsInfo =
        $("categoryResultsInfo");

    const categoryPagination =
        $("categoryPagination");

    const connectionMessage =
        $("connectionMessage");

    const deleteCategoryModal =
        $("deleteCategoryModal");

    const deleteCategoryName =
        $("deleteCategoryName");

    const deleteCategoryMessage =
        $("deleteCategoryMessage");

    const cancelDeleteCategoryBtn =
        $("cancelDeleteCategoryBtn");

    const confirmDeleteCategoryBtn =
        $("confirmDeleteCategoryBtn");

    const deleteCategorySpinner =
        $("deleteCategorySpinner");


    /* =====================================================
       STATE
    ===================================================== */

    let categories = [];

    let filteredCategories = [];

    let categoryToDelete = null;


    /* =====================================================
       API
    ===================================================== */

    async function apiRequest(action, data = {}) {

        if (!API_URL) {
            throw new Error(
                "API URL is not configured."
            );
        }


        const payload = {
            action: action,
            data: data
        };


        console.log(
            "StockFlow API request:",
            payload
        );


        const response = await fetch(
            API_URL,
            {
                method: "POST",

                /*
                 * IMPORTANT:
                 * Do NOT use application/json here.
                 *
                 * Google Apps Script Web Apps can trigger
                 * a CORS preflight with application/json.
                 *
                 * text/plain avoids that problem.
                 */
                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body: JSON.stringify(payload)
            }
        );


        if (!response.ok) {
            throw new Error(
                "API returned HTTP " +
                response.status
            );
        }


        const text =
            await response.text();


        console.log(
            "StockFlow API response:",
            text
        );


        let result;


        try {

            result = JSON.parse(text);

        } catch (error) {

            console.error(
                "Invalid JSON from API:",
                text
            );

            throw new Error(
                "The server returned an invalid response."
            );
        }


        if (!result.success) {

            throw new Error(
                result.error ||
                "The request failed."
            );
        }


        return result;
    }


    /* =====================================================
       LOAD CATEGORIES
    ===================================================== */

    async function loadCategories() {

        showLoading();

        hideError();


        try {

            const result =
                await apiRequest(
                    "listCategories"
                );


            categories =
                Array.isArray(result.categories)
                    ? result.categories
                    : [];


            console.log(
                "Loaded categories:",
                categories
            );


            applyFilters();

            updateStatistics();

            showConnectionMessage(
                "Categories loaded successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "loadCategories error:",
                error
            );


            categories = [];

            filteredCategories = [];

            renderCategories();

            showError(
                error.message ||
                "Unable to load categories."
            );
        }
    }


    /* =====================================================
       FILTERING
    ===================================================== */

    function applyFilters() {

        const search =
            (
                categorySearch?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const status =
            categoryStatusFilter?.value ||
            "ALL";


        filteredCategories =
            categories.filter(
                function (category) {

                    const name =
                        String(
                            category.categoryName ||
                            ""
                        ).toLowerCase();


                    const description =
                        String(
                            category.description ||
                            ""
                        ).toLowerCase();


                    const categoryStatus =
                        normalizeStatus(
                            category.status
                        );


                    const matchesSearch =
                        !search ||
                        name.includes(search) ||
                        description.includes(search);


                    const matchesStatus =
                        status === "ALL" ||
                        categoryStatus === status;


                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );


        renderCategories();
    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderCategories() {

        if (!categoriesTableBody) {
            return;
        }


        categoriesTableBody.innerHTML = "";


        if (!filteredCategories.length) {

            categoriesTableBody.innerHTML = "";

            if (categoriesEmpty) {
                categoriesEmpty.hidden = false;
            }

            if (categoryResultsInfo) {
                categoryResultsInfo.textContent =
                    "Showing 0 categories";
            }

            if (categoryPagination) {
                categoryPagination.innerHTML = "";
            }

            return;
        }


        if (categoriesEmpty) {
            categoriesEmpty.hidden = true;
        }


        filteredCategories.forEach(
            function (category) {

                const row =
                    document.createElement("tr");


                const status =
                    normalizeStatus(
                        category.status
                    );


                const statusText =
                    status === "ACTIVE"
                        ? "Active"
                        : "Inactive";


                const productCount =
                    Number(
                        category.productCount ??
                        category.products ??
                        0
                    );


                const created =
                    category.createdAt ||
                    category.created ||
                    "—";


                row.innerHTML = `
                    <td>
                        <div class="category-name-cell">
                            <div class="category-table-icon">
                                <i class="fa-solid fa-layer-group"></i>
                            </div>

                            <strong>
                                ${escapeHtml(
                                    category.categoryName || "Unnamed"
                                )}
                            </strong>
                        </div>
                    </td>

                    <td>
                        ${escapeHtml(
                            category.description || "—"
                        )}
                    </td>

                    <td>
                        <span class="product-count">
                            ${productCount}
                        </span>
                    </td>

                    <td>
                        <span class="status-badge ${status.toLowerCase()}">
                            ${statusText}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(created)}
                    </td>

                    <td class="action-column">
                        <div class="table-actions">

                            <button
                                type="button"
                                class="table-action-btn delete"
                                data-action="delete"
                                data-id="${escapeAttribute(
                                    category.categoryId || ""
                                )}"
                                data-name="${escapeAttribute(
                                    category.categoryName || ""
                                )}"
                                title="Delete category"
                                aria-label="Delete category"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>
                    </td>
                `;


                categoriesTableBody.appendChild(row);
            }
        );


        if (categoryResultsInfo) {

            const count =
                filteredCategories.length;

            categoryResultsInfo.textContent =
                `Showing ${count} ${
                    count === 1
                        ? "category"
                        : "categories"
                }`;
        }


        if (categoryPagination) {
            categoryPagination.innerHTML = "";
        }
    }


    /* =====================================================
       STATISTICS
    ===================================================== */

    function updateStatistics() {

        const total =
            categories.length;


        const active =
            categories.filter(
                function (category) {
                    return (
                        normalizeStatus(
                            category.status
                        ) === "ACTIVE"
                    );
                }
            ).length;


        const productTotal =
            categories.reduce(
                function (sum, category) {

                    return (
                        sum +
                        Number(
                            category.productCount ??
                            category.products ??
                            0
                        )
                    );

                },
                0
            );


        const empty =
            categories.filter(
                function (category) {

                    return (
                        Number(
                            category.productCount ??
                            category.products ??
                            0
                        ) === 0
                    );
                }
            ).length;


        if (totalCategories) {
            totalCategories.textContent =
                total;
        }

        if (activeCategories) {
            activeCategories.textContent =
                active;
        }

        if (categorizedProducts) {
            categorizedProducts.textContent =
                productTotal;
        }

        if (emptyCategories) {
            emptyCategories.textContent =
                empty;
        }
    }


    /* =====================================================
       ADD MODAL
    ===================================================== */

    function openAddCategoryModal() {

        if (!categoryModal) {
            return;
        }


        categoryForm?.reset();


        if (categoryId) {
            categoryId.value = "";
        }


        if (categoryStatus) {
            categoryStatus.value =
                "ACTIVE";
        }


        const title =
            $("categoryModalTitle");

        if (title) {
            title.textContent =
                "Add Category";
        }


        if (saveCategoryText) {
            saveCategoryText.textContent =
                "Save Category";
        }


        clearFormMessage();


        categoryModal.hidden = false;


        setTimeout(
            function () {

                categoryName?.focus();

            },
            50
        );
    }


    function closeAddCategoryModal() {

        if (!categoryModal) {
            return;
        }


        categoryModal.hidden = true;

        categoryForm?.reset();


        if (categoryId) {
            categoryId.value = "";
        }


        clearFormMessage();
    }


    /* =====================================================
       SAVE CATEGORY
    ===================================================== */

    async function saveCategory() {

        const name =
            (
                categoryName?.value ||
                ""
            ).trim();


        const description =
            (
                categoryDescription?.value ||
                ""
            ).trim();


        const status =
            categoryStatus?.value ||
            "ACTIVE";


        if (!name) {

            showFormMessage(
                "Category name is required."
            );

            categoryName?.focus();

            return;
        }


        if (name.length > 100) {

            showFormMessage(
                "Category name must be 100 characters or less."
            );

            categoryName?.focus();

            return;
        }


        setSaveLoading(true);

        clearFormMessage();


        try {

            const result =
                await apiRequest(
                    "saveCategory",
                    {
                        categoryName: name,
                        description: description,
                        status: status
                    }
                );


            console.log(
                "Category saved:",
                result
            );


            closeAddCategoryModal();


            await loadCategories();


            showToast(
                result.message ||
                "Category saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "saveCategory error:",
                error
            );


            showFormMessage(
                error.message ||
                "Unable to save category."
            );


        } finally {

            setSaveLoading(false);
        }
    }


    /* =====================================================
       DELETE
    ===================================================== */

    function openDeleteModal(
        id,
        name
    ) {

        categoryToDelete = {
            id: id,
            name: name
        };


        if (deleteCategoryName) {
            deleteCategoryName.textContent =
                name || "this category";
        }


        if (deleteCategoryMessage) {
            deleteCategoryMessage.hidden =
                true;

            deleteCategoryMessage.textContent =
                "";
        }


        if (deleteCategoryModal) {
            deleteCategoryModal.hidden =
                false;
        }
    }


    function closeDeleteModal() {

        categoryToDelete = null;


        if (deleteCategoryModal) {
            deleteCategoryModal.hidden =
                true;
        }
    }


    async function deleteSelectedCategory() {

        if (!categoryToDelete) {
            return;
        }


        setDeleteLoading(true);


        try {

            const result =
                await apiRequest(
                    "deleteCategory",
                    {
                        categoryId:
                            categoryToDelete.id,

                        categoryName:
                            categoryToDelete.name
                    }
                );


            closeDeleteModal();


            await loadCategories();


            showToast(
                result.message ||
                "Category deleted successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "deleteCategory error:",
                error
            );


            if (deleteCategoryMessage) {

                deleteCategoryMessage.textContent =
                    error.message ||
                    "Unable to delete category.";

                deleteCategoryMessage.hidden =
                    false;
            }


        } finally {

            setDeleteLoading(false);
        }
    }


    /* =====================================================
       LOADING UI
    ===================================================== */

    function showLoading() {

        if (categoriesLoading) {
            categoriesLoading.hidden =
                false;
        }

        if (categoriesEmpty) {
            categoriesEmpty.hidden =
                true;
        }

        if (categoriesError) {
            categoriesError.hidden =
                true;
        }
    }


    function showError(message) {

        if (categoriesLoading) {
            categoriesLoading.hidden =
                true;
        }

        if (categoriesEmpty) {
            categoriesEmpty.hidden =
                true;
        }

        if (categoriesError) {
            categoriesError.hidden =
                false;
        }

        if (categoriesErrorMessage) {
            categoriesErrorMessage.textContent =
                message;
        }
    }


    function hideError() {

        if (categoriesError) {
            categoriesError.hidden =
                true;
        }
    }


    /* =====================================================
       FORM LOADING
    ===================================================== */

    function setSaveLoading(loading) {

        if (saveCategoryBtn) {
            saveCategoryBtn.disabled =
                loading;
        }

        if (saveCategorySpinner) {
            saveCategorySpinner.hidden =
                !loading;
        }

        if (saveCategoryIcon) {
            saveCategoryIcon.hidden =
                loading;
        }

        if (saveCategoryText) {
            saveCategoryText.textContent =
                loading
                    ? "Saving..."
                    : "Save Category";
        }
    }


    function setDeleteLoading(loading) {

        if (confirmDeleteCategoryBtn) {
            confirmDeleteCategoryBtn.disabled =
                loading;
        }

        if (deleteCategorySpinner) {
            deleteCategorySpinner.hidden =
                !loading;
        }
    }


    /* =====================================================
       FORM MESSAGES
    ===================================================== */

    function showFormMessage(
        message,
        type = "error"
    ) {

        if (!categoryFormMessage) {
            return;
        }


        categoryFormMessage.textContent =
            message;


        categoryFormMessage.className =
            "form-message " + type;


        categoryFormMessage.hidden =
            false;
    }


    function clearFormMessage() {

        if (!categoryFormMessage) {
            return;
        }


        categoryFormMessage.textContent =
            "";

        categoryFormMessage.hidden =
            true;

        categoryFormMessage.className =
            "form-message";
    }


    /* =====================================================
       CONNECTION MESSAGE
    ===================================================== */

    function showConnectionMessage(
        message,
        type
    ) {

        if (!connectionMessage) {
            return;
        }


        connectionMessage.textContent =
            message;


        connectionMessage.className =
            "connection-message " +
            (type || "");


        connectionMessage.hidden =
            false;


        setTimeout(
            function () {

                connectionMessage.hidden =
                    true;

            },
            3000
        );
    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message,
        type = "success"
    ) {

        const container =
            $("toastContainer");


        if (!container) {
            return;
        }


        const toast =
            document.createElement("div");


        toast.className =
            `toast toast-${type}`;


        toast.innerHTML = `
            <i class="fa-solid ${
                type === "success"
                    ? "fa-circle-check"
                    : "fa-circle-exclamation"
            }"></i>

            <span>
                ${escapeHtml(message)}
            </span>
        `;


        container.appendChild(toast);


        setTimeout(
            function () {

                toast.classList.add(
                    "show"
                );

            },
            10
        );


        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

                setTimeout(
                    function () {
                        toast.remove();
                    },
                    300
                );

            },
            3500
        );
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function normalizeStatus(value) {

        const status =
            String(
                value || "ACTIVE"
            )
                .trim()
                .toUpperCase();


        return status === "INACTIVE"
            ? "INACTIVE"
            : "ACTIVE";
    }


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


    function escapeAttribute(value) {

        return escapeHtml(value);
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    addCategoryBtn?.addEventListener(
        "click",
        openAddCategoryModal
    );


    emptyAddCategoryBtn?.addEventListener(
        "click",
        openAddCategoryModal
    );


    closeCategoryModal?.addEventListener(
        "click",
        closeAddCategoryModal
    );


    cancelCategoryBtn?.addEventListener(
        "click",
        closeAddCategoryModal
    );


    categoryModal?.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                categoryModal
            ) {

                closeAddCategoryModal();
            }
        }
    );


    categoryForm?.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            saveCategory();
        }
    );


    categorySearch?.addEventListener(
        "input",
        applyFilters
    );


    categoryStatusFilter?.addEventListener(
        "change",
        applyFilters
    );


    refreshCategoriesBtn?.addEventListener(
        "click",
        loadCategories
    );


    retryCategoriesBtn?.addEventListener(
        "click",
        loadCategories
    );


    categoriesTableBody?.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            if (
                button.dataset.action ===
                "delete"
            ) {

                openDeleteModal(
                    button.dataset.id,
                    button.dataset.name
                );
            }
        }
    );


    cancelDeleteCategoryBtn?.addEventListener(
        "click",
        closeDeleteModal
    );


    confirmDeleteCategoryBtn?.addEventListener(
        "click",
        deleteSelectedCategory
    );


    deleteCategoryModal?.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                deleteCategoryModal
            ) {

                closeDeleteModal();
            }
        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                if (
                    categoryModal &&
                    !categoryModal.hidden
                ) {
                    closeAddCategoryModal();
                }


                if (
                    deleteCategoryModal &&
                    !deleteCategoryModal.hidden
                ) {
                    closeDeleteModal();
                }
            }
        }
    );


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.loadCategories =
        loadCategories;


    window.openCategoryModal =
        openAddCategoryModal;


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            loadCategories();

        }
    );

})();
