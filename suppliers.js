/* =========================================================
   STOCKFLOW — SUPPLIERS
   suppliers.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const form =
        document.getElementById("supplierForm");

    const rows =
        document.getElementById("rows");

    const alertBox =
        document.getElementById("alert");

    const saveButton =
        document.getElementById("saveButton");

    const clearButton =
        document.getElementById("clearButton");

    const menuButton =
        document.querySelector("[data-menu]");

    const sidebar =
        document.querySelector(".sf-side");


    const idInput =
        document.getElementById("id");

    const nameInput =
        document.getElementById("name");

    const contactInput =
        document.getElementById("contactPerson");

    const phoneInput =
        document.getElementById("phone");

    const emailInput =
        document.getElementById("email");

    const addressInput =
        document.getElementById("address");

    const statusInput =
        document.getElementById("status");


    /* =====================================================
       STATE
       ===================================================== */

    let suppliers = [];

    let isSaving = false;


    /* =====================================================
       API
       ===================================================== */

    function getAPI() {

        if (
            window.StockFlowAPI &&
            typeof window.StockFlowAPI.listSuppliers ===
                "function"
        ) {
            return window.StockFlowAPI;
        }

        if (
            window.API &&
            typeof window.API.listSuppliers ===
                "function"
        ) {
            return window.API;
        }

        return null;
    }


    /* =====================================================
       ALERT
       ===================================================== */

    function showAlert(
        message,
        type = "success"
    ) {

        if (!alertBox) {
            return;
        }

        alertBox.textContent =
            message || "";

        alertBox.className =
            "sf-alert";

        if (!message) {
            return;
        }

        alertBox.classList.add(
            "show",
            type
        );

        window.clearTimeout(
            showAlert.timer
        );

        showAlert.timer =
            window.setTimeout(() => {

                alertBox.classList.remove(
                    "show"
                );

            }, 4000);
    }


    /* =====================================================
       VALUE HELPERS
       ===================================================== */

    function clean(value) {

        return String(
            value ?? ""
        ).trim();
    }


    function escapeHTML(value) {

        return clean(value)
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


    function normalizeStatus(status) {

        const value =
            clean(status).toUpperCase();

        return value === "INACTIVE"
            ? "INACTIVE"
            : "ACTIVE";
    }


    /* =====================================================
       RESPONSE NORMALIZATION
       ===================================================== */

    function normalizeSupplierList(
        response
    ) {

        if (
            Array.isArray(response)
        ) {
            return response;
        }

        if (
            Array.isArray(response?.suppliers)
        ) {
            return response.suppliers;
        }

        if (
            Array.isArray(response?.data)
        ) {
            return response.data;
        }

        if (
            Array.isArray(response?.items)
        ) {
            return response.items;
        }

        if (
            Array.isArray(response?.records)
        ) {
            return response.records;
        }

        if (
            Array.isArray(response?.result)
        ) {
            return response.result;
        }

        return [];
    }


    function getSupplierId(
        supplier
    ) {

        return (
            supplier?.id ??
            supplier?.supplier_id ??
            supplier?.supplierId ??
            supplier?.ID ??
            ""
        );
    }


    /* =====================================================
       LOADING TABLE
       ===================================================== */

    function showTableLoading() {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    <span class="sf-loading">
                        <span class="sf-spinner"></span>
                        Loading suppliers...
                    </span>
                </td>
            </tr>
        `;
    }


    /* =====================================================
       EMPTY TABLE
       ===================================================== */

    function showEmpty() {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    No suppliers found.
                </td>
            </tr>
        `;
    }


    /* =====================================================
       RENDER SUPPLIERS
       ===================================================== */

    function renderSuppliers() {

        if (!rows) {
            return;
        }

        if (!suppliers.length) {
            showEmpty();
            return;
        }

        rows.innerHTML =
            suppliers.map(
                (supplier) => {

                    const id =
                        getSupplierId(
                            supplier
                        );

                    const name =
                        clean(
                            supplier.name ??
                            supplier.supplier_name ??
                            supplier.supplierName
                        );

                    const contact =
                        clean(
                            supplier.contactPerson ??
                            supplier.contact_person ??
                            supplier.contact
                        );

                    const phone =
                        clean(
                            supplier.phone ??
                            supplier.phone_number
                        );

                    const email =
                        clean(
                            supplier.email
                        );

                    const address =
                        clean(
                            supplier.address
                        );

                    const status =
                        normalizeStatus(
                            supplier.status
                        );

                    const statusClass =
                        status === "ACTIVE"
                            ? "active"
                            : "inactive";


                    return `
                        <tr>

                            <td>
                                <div
                                    class="supplier-name"
                                >
                                    ${escapeHTML(name || "—")}
                                </div>

                                ${
                                    address
                                        ? `
                                            <div
                                                class="sf-muted"
                                                style="
                                                    margin-top:3px;
                                                    font-size:11px;
                                                "
                                            >
                                                ${escapeHTML(address)}
                                            </div>
                                          `
                                        : ""
                                }
                            </td>

                            <td>
                                <span
                                    class="supplier-contact"
                                >
                                    ${escapeHTML(contact || "—")}
                                </span>
                            </td>

                            <td>
                                ${escapeHTML(phone || "—")}
                            </td>

                            <td>
                                <span
                                    class="supplier-email"
                                >
                                    ${escapeHTML(email || "—")}
                                </span>
                            </td>

                            <td>
                                <span
                                    class="supplier-status ${statusClass}"
                                >
                                    ${escapeHTML(status)}
                                </span>
                            </td>

                            <td>

                                <div
                                    class="supplier-actions"
                                >

                                    <button
                                        type="button"
                                        class="supplier-action edit"
                                        data-edit-id="${escapeHTML(id)}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="supplier-action delete"
                                        data-delete-id="${escapeHTML(id)}"
                                    >
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    /* =====================================================
       LOAD SUPPLIERS
       ===================================================== */

    async function loadSuppliers() {

        const API =
            getAPI();

        if (!API) {

            showTableError(
                "StockFlow API is not available."
            );

            return;
        }

        showTableLoading();

        try {

            const response =
                await API.listSuppliers();

            console.log(
                "StockFlow suppliers response:",
                response
            );

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to load suppliers."
                );
            }

            suppliers =
                normalizeSupplierList(
                    response
                );

            renderSuppliers();

        } catch (error) {

            console.error(
                "Supplier loading error:",
                error
            );

            showTableError(
                error?.message ||
                "Unable to load suppliers."
            );
        }
    }


    /* =====================================================
       TABLE ERROR
       ===================================================== */

    function showTableError(
        message
    ) {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                    style="color:#b42336;"
                >
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }


    /* =====================================================
       FORM DATA
       ===================================================== */

    function getFormData() {

        return {

            id:
                clean(
                    idInput?.value
                ),

            name:
                clean(
                    nameInput?.value
                ),

            contactPerson:
                clean(
                    contactInput?.value
                ),

            phone:
                clean(
                    phoneInput?.value
                ),

            email:
                clean(
                    emailInput?.value
                ),

            address:
                clean(
                    addressInput?.value
                ),

            status:
                normalizeStatus(
                    statusInput?.value
                )
        };
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function validateForm(
        data
    ) {

        if (!data.name) {

            showAlert(
                "Supplier name is required.",
                "error"
            );

            nameInput?.focus();

            return false;
        }

        if (
            data.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                data.email
            )
        ) {

            showAlert(
                "Please enter a valid email address.",
                "error"
            );

            emailInput?.focus();

            return false;
        }

        return true;
    }


    /* =====================================================
       SAVE SUPPLIER
       ===================================================== */

    async function saveSupplier(
        event
    ) {

        event.preventDefault();

        if (isSaving) {
            return;
        }

        const API =
            getAPI();

        if (!API) {

            showAlert(
                "StockFlow API is not available.",
                "error"
            );

            return;
        }

        const data =
            getFormData();

        if (!validateForm(data)) {
            return;
        }

        isSaving = true;

        const editing =
            Boolean(data.id);

        saveButton.disabled = true;

        saveButton.textContent =
            editing
                ? "Updating..."
                : "Saving...";

        try {

            let response;

            if (editing) {

                response =
                    await API.updateSupplier(
                        data
                    );

            } else {

                response =
                    await API.createSupplier(
                        data
                    );
            }

            console.log(
                "StockFlow supplier save response:",
                response
            );

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to save supplier."
                );
            }

            showAlert(
                editing
                    ? "Supplier updated successfully."
                    : "Supplier added successfully.",
                "success"
            );

            clearForm();

            await loadSuppliers();

        } catch (error) {

            console.error(
                "Supplier save error:",
                error
            );

            showAlert(
                error?.message ||
                "Unable to save supplier.",
                "error"
            );

        } finally {

            isSaving = false;

            saveButton.disabled = false;

            saveButton.textContent =
                editing
                    ? "Update Supplier"
                    : "Save Supplier";
        }
    }


    /* =====================================================
       EDIT SUPPLIER
       ===================================================== */

    function editSupplier(
        id
    ) {

        const supplier =
            suppliers.find(
                (item) =>
                    String(
                        getSupplierId(item)
                    ) ===
                    String(id)
            );

        if (!supplier) {

            showAlert(
                "Supplier record could not be found.",
                "error"
            );

            return;
        }

        idInput.value =
            getSupplierId(
                supplier
            );

        nameInput.value =
            clean(
                supplier.name ??
                supplier.supplier_name ??
                supplier.supplierName
            );

        contactInput.value =
            clean(
                supplier.contactPerson ??
                supplier.contact_person ??
                supplier.contact
            );

        phoneInput.value =
            clean(
                supplier.phone ??
                supplier.phone_number
            );

        emailInput.value =
            clean(
                supplier.email
            );

        addressInput.value =
            clean(
                supplier.address
            );

        statusInput.value =
            normalizeStatus(
                supplier.status
            );

        saveButton.textContent =
            "Update Supplier";

        showAlert(
            "Editing supplier. Update the details and save.",
            "info"
        );

        nameInput.focus();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* =====================================================
       DELETE SUPPLIER
       ===================================================== */

    async function deleteSupplier(
        id
    ) {

        const supplier =
            suppliers.find(
                (item) =>
                    String(
                        getSupplierId(item)
                    ) ===
                    String(id)
            );

        if (!supplier) {
            return;
        }

        const name =
            clean(
                supplier.name ??
                supplier.supplier_name ??
                supplier.supplierName
            );

        const confirmed =
            window.confirm(
                `Delete supplier "${name || "this supplier"}"?\n\nThis action cannot be undone.`
            );

        if (!confirmed) {
            return;
        }

        const API =
            getAPI();

        if (!API) {

            showAlert(
                "StockFlow API is not available.",
                "error"
            );

            return;
        }

        try {

            showAlert(
                "Deleting supplier...",
                "info"
            );

            const response =
                await API.deleteSupplier(
                    id
                );

            console.log(
                "StockFlow supplier delete response:",
                response
            );

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to delete supplier."
                );
            }

            if (
                String(
                    idInput?.value
                ) === String(id)
            ) {
                clearForm();
            }

            showAlert(
                "Supplier deleted successfully.",
                "success"
            );

            await loadSuppliers();

        } catch (error) {

            console.error(
                "Supplier delete error:",
                error
            );

            showAlert(
                error?.message ||
                "Unable to delete supplier.",
                "error"
            );
        }
    }


    /* =====================================================
       CLEAR FORM
       ===================================================== */

    function clearForm() {

        if (form) {
            form.reset();
        }

        if (idInput) {
            idInput.value = "";
        }

        if (statusInput) {
            statusInput.value =
                "ACTIVE";
        }

        if (saveButton) {
            saveButton.textContent =
                "Save Supplier";

            saveButton.disabled = false;
        }
    }


    /* =====================================================
       EVENT DELEGATION
       ===================================================== */

    function setupTableActions() {

        if (!rows) {
            return;
        }

        rows.addEventListener(
            "click",
            (event) => {

                const editButton =
                    event.target.closest(
                        "[data-edit-id]"
                    );

                if (editButton) {

                    editSupplier(
                        editButton.dataset.editId
                    );

                    return;
                }

                const deleteButton =
                    event.target.closest(
                        "[data-delete-id]"
                    );

                if (deleteButton) {

                    deleteSupplier(
                        deleteButton.dataset.deleteId
                    );
                }
            }
        );
    }


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    function setupMenu() {

        if (
            !menuButton ||
            !sidebar
        ) {
            return;
        }

        menuButton.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );
            }
        );
    }


    /* =====================================================
       CLOSE MOBILE MENU
       ===================================================== */

    function setupOutsideMenu() {

        document.addEventListener(
            "click",
            (event) => {

                if (
                    window.innerWidth > 800
                ) {
                    return;
                }

                if (
                    !sidebar?.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }

                if (
                    sidebar.contains(
                        event.target
                    ) ||
                    menuButton?.contains(
                        event.target
                    )
                ) {
                    return;
                }

                sidebar.classList.remove(
                    "open"
                );
            }
        );
    }


    /* =====================================================
       FORM EVENTS
       ===================================================== */

    if (form) {

        form.addEventListener(
            "submit",
            saveSupplier
        );
    }

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                clearForm();

                nameInput?.focus();
            }
        );
    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    setupTableActions();

    setupMenu();

    setupOutsideMenu();

    loadSuppliers();

});
