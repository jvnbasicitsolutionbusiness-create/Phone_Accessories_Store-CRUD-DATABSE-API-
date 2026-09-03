/* ============================================================
   STOCKFLOW | CATEGORIES
   categories.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    const user = await StockFlowAuth.requireAuth();

    if (!user) return;

    StockFlowAuth.bindUserUI(user);

    /* ========================================================
       GLOBAL UI
       ======================================================== */

    const logoutBtn =
        document.querySelector("#logoutBtn");

    logoutBtn?.addEventListener("click", () => {
        StockFlowAuth.logout();
    });

    const mobileMenuBtn =
        document.querySelector("#mobileMenuBtn");

    mobileMenuBtn?.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-open");
    });

    const sidebarOverlay =
        document.querySelector("#sidebarOverlay");

    sidebarOverlay?.addEventListener("click", () => {
        document.body.classList.remove("sidebar-open");
    });


    /* ========================================================
       ELEMENTS
       ======================================================== */

    const tableBody =
        document.querySelector("#categoriesTableBody");

    const searchInput =
        document.querySelector("#categorySearch");

    const addBtn =
        document.querySelector("#addCategoryBtn");

    const modal =
        document.querySelector("#categoryModal");

    const modalTitle =
        document.querySelector("#categoryModalTitle");

    const form =
        document.querySelector("#categoryForm");

    const categoryIdInput =
        document.querySelector("#categoryId");

    const categoryNameInput =
        document.querySelector("#categoryName");

    const categoryDescriptionInput =
        document.querySelector("#categoryDescription");

    const categoryStatusInput =
        document.querySelector("#categoryStatus");

    const saveBtn =
        document.querySelector("#saveCategoryBtn");

    const closeButtons =
        document.querySelectorAll(
            "[data-close-category-modal]"
        );

    const loading =
        document.querySelector("#categoriesLoading");

    const emptyState =
        document.querySelector("#categoriesEmpty");

    const errorBox =
        document.querySelector("#categoriesError");

    const totalCategories =
        document.querySelector("#totalCategories");

    const activeCategories =
        document.querySelector("#activeCategories");

    const inactiveCategories =
        document.querySelector("#inactiveCategories");


    /* ========================================================
       STATE
       ======================================================== */

    let categories = [];

    let editingId = null;


    /* ========================================================
       LOAD CATEGORIES
       ======================================================== */

    async function loadCategories() {

        showLoading(true);

        hideError();

        try {

            const response =
                await StockFlowAPI.getCategories();

            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to load categories."
                );

            }

            categories =
                response.categories ||
                response.data ||
                [];

            renderCategories();

            updateStatistics();

        }

        catch (error) {

            console.error(
                "Category loading error:",
                error
            );

            showError(
                error.message ||
                "Unable to connect to the server."
            );

            categories = [];

            renderCategories();

            updateStatistics();

        }

        finally {

            showLoading(false);

        }

    }


    /* ========================================================
       RENDER
       ======================================================== */

    function renderCategories() {

        if (!tableBody) return;

        const keyword =
            String(
                searchInput?.value || ""
            )
            .trim()
            .toLowerCase();


        const filtered =
            categories.filter(category => {

                const name =
                    getCategoryName(category)
                        .toLowerCase();

                const description =
                    getCategoryDescription(category)
                        .toLowerCase();

                const status =
                    getCategoryStatus(category)
                        .toLowerCase();

                return (
                    !keyword ||
                    name.includes(keyword) ||
                    description.includes(keyword) ||
                    status.includes(keyword)
                );

            });


        tableBody.innerHTML = "";


        if (!filtered.length) {

            if (emptyState) {

                emptyState.hidden = false;

            }

            return;

        }


        if (emptyState) {

            emptyState.hidden = true;

        }


        filtered.forEach(category => {

            const row =
                document.createElement("tr");

            const id =
                getCategoryId(category);

            const name =
                getCategoryName(category);

            const description =
                getCategoryDescription(category);

            const status =
                getCategoryStatus(category);

            const createdAt =
                getCategoryDate(category);


            row.innerHTML = `

                <td>
                    <span class="category-id">
                        ${escapeHtml(id || "—")}
                    </span>
                </td>

                <td>
                    <div class="category-name-cell">
                        <div class="category-icon">
                            <i class="fa-solid fa-layer-group"></i>
                        </div>

                        <div>
                            <strong>
                                ${escapeHtml(name || "Unnamed Category")}
                            </strong>

                            ${
                                description
                                    ? `
                                        <small>
                                            ${escapeHtml(description)}
                                        </small>
                                      `
                                    : ""
                            }

                        </div>
                    </div>
                </td>

                <td>
                    <span class="
                        status-badge
                        ${status.toLowerCase() === "active"
                            ? "status-active"
                            : "status-inactive"}
                    ">
                        ${escapeHtml(status)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(createdAt || "—")}
                </td>

                <td>
                    <div class="table-actions">

                        <button
                            type="button"
                            class="icon-btn edit-category-btn"
                            title="Edit category"
                            data-id="${escapeHtml(id)}"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            type="button"
                            class="icon-btn delete-category-btn danger"
                            title="Delete category"
                            data-id="${escapeHtml(id)}"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>

                    </div>
                </td>

            `;


            tableBody.appendChild(row);

        });


        bindRowActions();

    }


    /* ========================================================
       STATISTICS
       ======================================================== */

    function updateStatistics() {

        const total =
            categories.length;

        const active =
            categories.filter(
                category =>
                    getCategoryStatus(category)
                        .toUpperCase() === "ACTIVE"
            ).length;

        const inactive =
            total - active;


        setText(
            totalCategories,
            total
        );

        setText(
            activeCategories,
            active
        );

        setText(
            inactiveCategories,
            inactive
        );

    }


    /* ========================================================
       ADD CATEGORY
       ======================================================== */

    function openAddModal() {

        editingId = null;

        if (modalTitle) {

            modalTitle.textContent =
                "Add Category";

        }

        resetForm();

        setInputValue(
            categoryStatusInput,
            "ACTIVE"
        );

        showModal();

    }


    /* ========================================================
       EDIT CATEGORY
       ======================================================== */

    function openEditModal(id) {

        const category =
            categories.find(
                item =>
                    String(
                        getCategoryId(item)
                    ) === String(id)
            );


        if (!category) {

            showError(
                "Category could not be found."
            );

            return;

        }


        editingId = id;


        if (modalTitle) {

            modalTitle.textContent =
                "Edit Category";

        }


        setInputValue(
            categoryIdInput,
            getCategoryId(category)
        );

        setInputValue(
            categoryNameInput,
            getCategoryName(category)
        );

        setInputValue(
            categoryDescriptionInput,
            getCategoryDescription(category)
        );

        setInputValue(
            categoryStatusInput,
            getCategoryStatus(category)
        );


        showModal();

    }


    /* ========================================================
       SAVE CATEGORY
       ======================================================== */

    async function saveCategory() {

        const name =
            String(
                categoryNameInput?.value || ""
            ).trim();

        const description =
            String(
                categoryDescriptionInput?.value || ""
            ).trim();

        const status =
            String(
                categoryStatusInput?.value ||
                "ACTIVE"
            ).trim().toUpperCase();


        if (!name) {

            showFormMessage(
                "Category name is required."
            );

            categoryNameInput?.focus();

            return;

        }


        if (name.length < 2) {

            showFormMessage(
                "Category name must contain at least 2 characters."
            );

            categoryNameInput?.focus();

            return;

        }


        setSaving(true);


        try {

            let response;


            if (editingId) {

                response =
                    await StockFlowAPI.updateCategory({

                        id:
                            editingId,

                        categoryId:
                            editingId,

                        name:
                            name,

                        categoryName:
                            name,

                        description:
                            description,

                        status:
                            status

                    });

            }

            else {

                response =
                    await StockFlowAPI.createCategory({

                        name:
                            name,

                        categoryName:
                            name,

                        description:
                            description,

                        status:
                            status

                    });

            }


            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to save category."
                );

            }


            closeModal();

            await loadCategories();

            showToast(
                editingId
                    ? "Category updated successfully."
                    : "Category created successfully.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Save category error:",
                error
            );

            showFormMessage(
                error.message ||
                "Unable to save category."
            );

        }

        finally {

            setSaving(false);

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
                        getCategoryId(item)
                    ) === String(id)
            );


        if (!category) return;


        const name =
            getCategoryName(category);


        const confirmed =
            window.confirm(
                `Delete category "${name}"?\n\n` +
                "This action may affect products assigned to this category."
            );


        if (!confirmed) return;


        try {

            const response =
                await StockFlowAPI.deleteCategory({

                    id:
                        id,

                    categoryId:
                        id

                });


            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to delete category."
                );

            }


            await loadCategories();


            showToast(
                "Category deleted successfully.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Delete category error:",
                error
            );

            showToast(
                error.message ||
                "Unable to delete category.",
                "error"
            );

        }

    }


    /* ========================================================
       ROW ACTIONS
       ======================================================== */

    function bindRowActions() {

        document
            .querySelectorAll(
                ".edit-category-btn"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        openEditModal(
                            button.dataset.id
                        );

                    }
                );

            });


        document
            .querySelectorAll(
                ".delete-category-btn"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        deleteCategory(
                            button.dataset.id
                        );

                    }
                );

            });

    }


    /* ========================================================
       MODAL
       ======================================================== */

    function showModal() {

        if (!modal) return;

        modal.hidden = false;

        document.body.classList.add(
            "modal-open"
        );


        setTimeout(() => {

            categoryNameInput?.focus();

        }, 50);

    }


    function closeModal() {

        if (!modal) return;

        modal.hidden = true;

        document.body.classList.remove(
            "modal-open"
        );

        editingId = null;

        resetForm();

        clearFormMessage();

    }


    function resetForm() {

        form?.reset();

        setInputValue(
            categoryIdInput,
            ""
        );

    }


    /* ========================================================
       SEARCH
       ======================================================== */

    searchInput?.addEventListener(
        "input",
        () => {

            renderCategories();

        }
    );


    /* ========================================================
       BUTTON EVENTS
       ======================================================== */

    addBtn?.addEventListener(
        "click",
        openAddModal
    );


    closeButtons.forEach(button => {

        button.addEventListener(
            "click",
            closeModal
        );

    });


    form?.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            saveCategory();

        }
    );


    /* ========================================================
       ESCAPE KEY
       ======================================================== */

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


    /* ========================================================
       HELPER FUNCTIONS
       ======================================================== */

    function getCategoryId(category) {

        return (
            category?.id ??
            category?.ID ??
            category?.categoryId ??
            category?.CATEGORY_ID ??
            category?.uid ??
            ""
        );

    }


    function getCategoryName(category) {

        return String(

            category?.name ??
            category?.NAME ??
            category?.categoryName ??
            category?.CATEGORY_NAME ??
            ""

        );

    }


    function getCategoryDescription(category) {

        return String(

            category?.description ??
            category?.DESCRIPTION ??
            ""

        );

    }


    function getCategoryStatus(category) {

        return String(

            category?.status ??
            category?.STATUS ??
            category?.accountStatus ??
            "ACTIVE"

        ).trim().toUpperCase();

    }


    function getCategoryDate(category) {

        const value =

            category?.createdAt ??
            category?.CREATED_AT ??
            category?.created_at ??
            category?.dateCreated ??
            "";


        if (!value) return "";


        const date =
            new Date(value);


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleDateString(
                undefined,
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }
            );

        }


        return String(value);

    }


    function escapeHtml(value) {

        return String(
            value ?? ""
        )
        .replace(
            /[&<>"']/g,
            character => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[character])
        );

    }


    function setText(element, value) {

        if (element) {

            element.textContent =
                String(value ?? "");

        }

    }


    function setInputValue(element, value) {

        if (element) {

            element.value =
                value ?? "";

        }

    }


    function showLoading(value) {

        if (loading) {

            loading.hidden =
                !value;

        }

    }


    function showError(message) {

        if (!errorBox) {

            console.error(message);

            return;

        }


        errorBox.textContent =
            message || "An error occurred.";

        errorBox.hidden = false;

    }


    function hideError() {

        if (errorBox) {

            errorBox.hidden = true;

            errorBox.textContent = "";

        }

    }


    function showFormMessage(message) {

        let messageBox =
            document.querySelector(
                "#categoryFormMessage"
            );


        if (!messageBox) {

            messageBox =
                document.createElement("div");

            messageBox.id =
                "categoryFormMessage";

            messageBox.className =
                "form-message error";

            form?.prepend(
                messageBox
            );

        }


        messageBox.textContent =
            message;

        messageBox.hidden = false;

    }


    function clearFormMessage() {

        const messageBox =
            document.querySelector(
                "#categoryFormMessage"
            );


        if (messageBox) {

            messageBox.hidden = true;

            messageBox.textContent = "";

        }

    }


    function setSaving(value) {

        if (!saveBtn) return;


        saveBtn.disabled =
            value;


        if (value) {

            saveBtn.dataset.originalText =
                saveBtn.textContent;

            saveBtn.innerHTML =
                `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                `;

        }

        else {

            saveBtn.innerHTML =
                `
                    <i class="fa-solid fa-floppy-disk"></i>
                    ${
                        saveBtn.dataset.originalText ||
                        "Save Category"
                    }
                `;

        }

    }


    function showToast(message, type = "success") {

        let container =
            document.querySelector(
                "#toastContainer"
            );


        if (!container) {

            container =
                document.createElement("div");

            container.id =
                "toastContainer";

            container.className =
                "toast-container";

            document.body.appendChild(
                container
            );

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


        container.appendChild(
            toast
        );


        setTimeout(() => {

            toast.classList.add(
                "toast-hide"
            );

            setTimeout(() => {

                toast.remove();

            }, 300);

        }, 3500);

    }


    /* ========================================================
       INITIALIZE
       ======================================================== */

    await loadCategories();

});
