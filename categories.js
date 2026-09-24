/* =========================================================
   STOCKFLOW — CATEGORIES
   File: categories.js

   Google Apps Script API:

       listCategories
       saveCategory
       deleteCategory

   API URL is configured directly in this file.
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbwhyWms5LL79R3LaHsqLJl3MkgQ6vUssLQriggwSWTp-vFaigiYX87zvFpIpcpFFbRngw/exec";


    console.log(
        "[STOCKFLOW] Categories API:",
        API_URL
    );


    /* =====================================================
       DOM
    ===================================================== */

    const addCategoryBtn =
        document.getElementById(
            "addCategoryBtn"
        );

    const emptyAddCategoryBtn =
        document.getElementById(
            "emptyAddCategoryBtn"
        );

    const categoryModal =
        document.getElementById(
            "categoryModal"
        );

    const closeCategoryModal =
        document.getElementById(
            "closeCategoryModal"
        );

    const cancelCategoryBtn =
        document.getElementById(
            "cancelCategoryBtn"
        );

    const categoryForm =
        document.getElementById(
            "categoryForm"
        );

    const categoryId =
        document.getElementById(
            "categoryId"
        );

    const categoryName =
        document.getElementById(
            "categoryName"
        );

    const categoryDescription =
        document.getElementById(
            "categoryDescription"
        );

    const categoryStatus =
        document.getElementById(
            "categoryStatus"
        );

    const categoryFormMessage =
        document.getElementById(
            "categoryFormMessage"
        );

    const saveCategoryBtn =
        document.getElementById(
            "saveCategoryBtn"
        );

    const saveCategorySpinner =
        document.getElementById(
            "saveCategorySpinner"
        );

    const saveCategoryIcon =
        document.getElementById(
            "saveCategoryIcon"
        );

    const saveCategoryText =
        document.getElementById(
            "saveCategoryText"
        );

    const categoriesTableBody =
        document.getElementById(
            "categoriesTableBody"
        );

    const categoriesLoading =
        document.getElementById(
            "categoriesLoading"
        );

    const categoriesEmpty =
        document.getElementById(
            "categoriesEmpty"
        );

    const categoriesError =
        document.getElementById(
            "categoriesError"
        );

    const categoriesErrorMessage =
        document.getElementById(
            "categoriesErrorMessage"
        );

    const retryCategoriesBtn =
        document.getElementById(
            "retryCategoriesBtn"
        );

    const categorySearch =
        document.getElementById(
            "categorySearch"
        );

    const categoryStatusFilter =
        document.getElementById(
            "categoryStatusFilter"
        );

    const refreshCategoriesBtn =
        document.getElementById(
            "refreshCategoriesBtn"
        );

    const totalCategories =
        document.getElementById(
            "totalCategories"
        );

    const activeCategories =
        document.getElementById(
            "activeCategories"
        );

    const categorizedProducts =
        document.getElementById(
            "categorizedProducts"
        );

    const emptyCategories =
        document.getElementById(
            "emptyCategories"
        );

    const categoryResultsInfo =
        document.getElementById(
            "categoryResultsInfo"
        );

    const categoryPagination =
        document.getElementById(
            "categoryPagination"
        );

    const connectionMessage =
        document.getElementById(
            "connectionMessage"
        );

    const deleteCategoryModal =
        document.getElementById(
            "deleteCategoryModal"
        );

    const deleteCategoryName =
        document.getElementById(
            "deleteCategoryName"
        );

    const deleteCategoryMessage =
        document.getElementById(
            "deleteCategoryMessage"
        );

    const cancelDeleteCategoryBtn =
        document.getElementById(
            "cancelDeleteCategoryBtn"
        );

    const confirmDeleteCategoryBtn =
        document.getElementById(
            "confirmDeleteCategoryBtn"
        );

    const deleteCategorySpinner =
        document.getElementById(
            "deleteCategorySpinner"
        );


    /* =====================================================
       STATE
    ===================================================== */

    let categories = [];

    let filteredCategories = [];

    let categoryToDelete = null;


    /* =====================================================
       API REQUEST
    ===================================================== */

    async function apiRequest(
        action,
        data = {}
    ) {

        const payload = {

            action:
                action,

            data:
                data

        };


        console.log(
            "[STOCKFLOW API] Request:",
            payload
        );


        let response;


        try {

            response =
                await fetch(
                    API_URL,
                    {
                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                        body:
                            JSON.stringify(
                                payload
                            ),

                        redirect:
                            "follow"
                    }
                );

        } catch (networkError) {

            console.error(
                "[STOCKFLOW API] Network error:",
                networkError
            );


            throw new Error(
                "Unable to connect to the StockFlow server. Please check the Apps Script deployment."
            );
        }


        console.log(
            "[STOCKFLOW API] HTTP status:",
            response.status
        );


        console.log(
            "[STOCKFLOW API] Final URL:",
            response.url
        );


        const responseText =
            await response.text();


        console.log(
            "[STOCKFLOW API] Raw response:",
            responseText
        );


        if (!responseText) {

            throw new Error(
                "The StockFlow server returned an empty response."
            );
        }


        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (parseError) {

            console.error(
                "[STOCKFLOW API] JSON parse error:",
                parseError
            );


            throw new Error(
                "StockFlow returned an invalid response. Server response: " +
                responseText.substring(
                    0,
                    500
                )
            );
        }


        console.log(
            "[STOCKFLOW API] Parsed response:",
            result
        );


        if (
            !result ||
            result.success !== true
        ) {

            const serverError =
                result &&
                (
                    result.error ||
                    result.message
                );


            throw new Error(
                serverError ||
                "The API request failed. Server response: " +
                JSON.stringify(
                    result
                )
            );
        }


        return result;
    }


    /* =====================================================
       LOAD
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
                Array.isArray(
                    result.categories
                )
                    ? result.categories
                    : [];


            console.log(
                "[STOCKFLOW] Categories:",
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
                "[STOCKFLOW] Failed to load categories:",
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
       FILTER
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
                        )
                            .toLowerCase();


                    const description =
                        String(
                            category.description ||
                            ""
                        )
                            .toLowerCase();


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
       RENDER
    ===================================================== */

    function renderCategories() {

        if (!categoriesTableBody) {
            return;
        }


        categoriesTableBody.innerHTML =
            "";


        if (
            categoriesLoading
        ) {

            categoriesLoading.hidden =
                true;
        }


        if (
            filteredCategories.length === 0
        ) {

            if (categoriesEmpty) {

                categoriesEmpty.hidden =
                    false;
            }


            if (categoryResultsInfo) {

                categoryResultsInfo.textContent =
                    "Showing 0 categories";
            }


            if (categoryPagination) {

                categoryPagination.innerHTML =
                    "";
            }


            return;
        }


        if (categoriesEmpty) {

            categoriesEmpty.hidden =
                true;
        }


        filteredCategories.forEach(
            function (category) {

                const row =
                    document.createElement(
                        "tr"
                    );


                const status =
                    normalizeStatus(
                        category.status
                    );


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
                                    category.categoryName ||
                                    "Unnamed"
                                )}
                            </strong>

                        </div>

                    </td>


                    <td>
                        ${escapeHtml(
                            category.description ||
                            "—"
                        )}
                    </td>


                    <td>

                        <span class="product-count">
                            ${productCount}
                        </span>

                    </td>


                    <td>

                        <span
                            class="status-badge ${status.toLowerCase()}"
                        >
                            ${
                                status === "ACTIVE"
                                    ? "Active"
                                    : "Inactive"
                            }
                        </span>

                    </td>


                    <td>
                        ${escapeHtml(
                            formatDate(created)
                        )}
                    </td>


                    <td class="action-column">

                        <div class="table-actions">

                            <button
                                type="button"
                                class="table-action-btn delete"
                                data-action="delete"
                                data-id="${escapeAttribute(
                                    category.categoryId ||
                                    ""
                                )}"
                                data-name="${escapeAttribute(
                                    category.categoryName ||
                                    ""
                                )}"
                                title="Delete category"
                                aria-label="Delete category"
                            >

                                <i class="fa-solid fa-trash"></i>

                            </button>

                        </div>

                    </td>

                `;


                categoriesTableBody.appendChild(
                    row
                );
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

            categoryPagination.innerHTML =
                "";
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
                        ) ===
                        "ACTIVE"
                    );
                }
            ).length;


        const productTotal =
            categories.reduce(
                function (
                    total,
                    category
                ) {

                    return (
                        total +
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
       ADD CATEGORY MODAL
    ===================================================== */

    function openCategoryModal() {

        if (!categoryModal) {
            return;
        }


        if (categoryForm) {

            categoryForm.reset();
        }


        if (categoryId) {

            categoryId.value =
                "";
        }


        if (categoryStatus) {

            categoryStatus.value =
                "ACTIVE";
        }


        const modalTitle =
            document.getElementById(
                "categoryModalTitle"
            );


        if (modalTitle) {

            modalTitle.textContent =
                "Add Category";
        }


        if (saveCategoryText) {

            saveCategoryText.textContent =
                "Save Category";
        }


        clearFormMessage();


        categoryModal.hidden =
            false;


        setTimeout(
            function () {

                if (categoryName) {

                    categoryName.focus();
                }

            },
            50
        );
    }


    function closeCategoryModalHandler() {

        if (!categoryModal) {
            return;
        }


        categoryModal.hidden =
            true;


        if (categoryForm) {

            categoryForm.reset();
        }


        if (categoryId) {

            categoryId.value =
                "";
        }


        clearFormMessage();
    }


    /* =====================================================
       SAVE CATEGORY
    ===================================================== */

    async function handleCategorySubmit(
        event
    ) {

        event.preventDefault();


        const name =
            (
                categoryName?.value ||
                ""
            )
                .trim();


        const description =
            (
                categoryDescription?.value ||
                ""
            )
                .trim();


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


        setSaveLoading(
            true
        );


        clearFormMessage();


        try {

            const result =
                await apiRequest(
                    "saveCategory",
                    {

                        categoryName:
                            name,

                        description:
                            description,

                        status:
                            status

                    }
                );


            console.log(
                "[STOCKFLOW] Save successful:",
                result
            );


            closeCategoryModalHandler();


            await loadCategories();


            showToast(
                result.message ||
                "Category saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "[STOCKFLOW] Save category failed:",
                error
            );


            showFormMessage(
                error.message ||
                "Unable to save category."
            );


        } finally {

            setSaveLoading(
                false
            );
        }
    }


    /* =====================================================
       DELETE MODAL
    ===================================================== */

    function openDeleteModal(
        id,
        name
    ) {

        categoryToDelete = {

            id:
                id || "",

            name:
                name || ""

        };


        if (deleteCategoryName) {

            deleteCategoryName.textContent =
                name ||
                "this category";
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

        categoryToDelete =
            null;


        if (deleteCategoryModal) {

            deleteCategoryModal.hidden =
                true;
        }
    }


    async function handleDeleteCategory() {

        if (!categoryToDelete) {
            return;
        }


        setDeleteLoading(
            true
        );


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
                "[STOCKFLOW] Delete category failed:",
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

            setDeleteLoading(
                false
            );
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


    function showError(
        message
    ) {

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
       SAVE LOADING
    ===================================================== */

    function setSaveLoading(
        loading
    ) {

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


    /* =====================================================
       DELETE LOADING
    ===================================================== */

    function setDeleteLoading(
        loading
    ) {

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
       FORM MESSAGE
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
            "form-message " +
            type;


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
            document.getElementById(
                "toastContainer"
            );


        if (!container) {
            return;
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "toast toast-" +
            type;


        const icon =
            type === "success"
                ? "fa-circle-check"
                : "fa-circle-exclamation";


        toast.innerHTML = `

            <i class="fa-solid ${icon}"></i>

            <span>
                ${escapeHtml(message)}
            </span>

        `;


        container.appendChild(
            toast
        );


        requestAnimationFrame(
            function () {

                toast.classList.add(
                    "show"
                );

            }
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

    function normalizeStatus(
        value
    ) {

        const status =
            String(
                value ||
                "ACTIVE"
            )
                .trim()
                .toUpperCase();


        return (
            status ===
            "INACTIVE"
        )
            ? "INACTIVE"
            : "ACTIVE";
    }


    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
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


    function escapeAttribute(
        value
    ) {

        return escapeHtml(
            value
        );
    }


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

            return String(value);
        }


        return date.toLocaleDateString(
            undefined,
            {
                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric"
            }
        );
    }


    /* =====================================================
       EVENT LISTENERS
    ===================================================== */

    addCategoryBtn?.addEventListener(
        "click",
        openCategoryModal
    );


    emptyAddCategoryBtn?.addEventListener(
        "click",
        openCategoryModal
    );


    closeCategoryModal?.addEventListener(
        "click",
        closeCategoryModalHandler
    );


    cancelCategoryBtn?.addEventListener(
        "click",
        closeCategoryModalHandler
    );


    categoryForm?.addEventListener(
        "submit",
        handleCategorySubmit
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


    confirmDeleteCategoryBtn?.addEventListener(
        "click",
        handleDeleteCategory
    );


    cancelDeleteCategoryBtn?.addEventListener(
        "click",
        closeDeleteModal
    );


    categoryModal?.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                categoryModal
            ) {

                closeCategoryModalHandler();
            }
        }
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


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            if (
                categoryModal &&
                !categoryModal.hidden
            ) {

                closeCategoryModalHandler();
            }


            if (
                deleteCategoryModal &&
                !deleteCategoryModal.hidden
            ) {

                closeDeleteModal();
            }
        }
    );


    /* =====================================================
       GLOBAL FUNCTIONS
    ===================================================== */

    window.loadCategories =
        loadCategories;


    window.openCategoryModal =
        openCategoryModal;


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        console.log(
            "[STOCKFLOW] Categories module initialized."
        );


        loadCategories();
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();
