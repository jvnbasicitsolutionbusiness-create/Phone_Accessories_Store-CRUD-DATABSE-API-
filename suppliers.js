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

    const saveButton =
        document.getElementById("saveButton");

    const clearButton =
        document.getElementById("clearButton");

    const rows =
        document.getElementById("rows");

    const alertBox =
        document.getElementById("alert");

    const menuButton =
        document.querySelector("[data-menu]");

    const sidebar =
        document.querySelector(".sf-side");


    /* =====================================================
       API
       ===================================================== */

    function getAPI() {

        if (
            window.StockFlowAPI
        ) {
            return window.StockFlowAPI;
        }

        if (
            window.API
        ) {
            return window.API;
        }

        return null;
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function clean(value) {

        return String(
            value ?? ""
        ).trim();
    }


    function escapeHTML(value) {

        return clean(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getValue(
        object,
        keys
    ) {

        for (
            const key of keys
        ) {

            if (
                object &&
                object[key] !== undefined &&
                object[key] !== null
            ) {

                return object[key];
            }
        }

        return "";
    }


    /* =====================================================
       ALERT
       ===================================================== */

    function showAlert(
        message,
        type = "info"
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

        clearTimeout(
            showAlert.timer
        );

        showAlert.timer =
            setTimeout(() => {

                alertBox.classList.remove(
                    "show"
                );

            }, 4000);
    }


    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading() {

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    Loading suppliers...
                </td>
            </tr>
        `;
    }


    /* =====================================================
       EMPTY
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
            statusInput.value = "ACTIVE";
        }

        if (saveButton) {
            saveButton.textContent =
                "Save Supplier";
        }

        if (nameInput) {
            nameInput.focus();
        }
    }


    /* =====================================================
       EXTRACT SUPPLIER LIST
       ===================================================== */

    function normalizeSuppliers(
        response
    ) {

        if (
            Array.isArray(response)
        ) {
            return response;
        }

        if (
            Array.isArray(
                response?.suppliers
            )
        ) {
            return response.suppliers;
        }

        if (
            Array.isArray(
                response?.data
            )
        ) {
            return response.data;
        }

        if (
            Array.isArray(
                response?.items
            )
        ) {
            return response.items;
        }

        if (
            Array.isArray(
                response?.records
            )
        ) {
            return response.records;
        }

        return [];
    }


    /* =====================================================
       LOAD SUPPLIERS
       ===================================================== */

    async function loadSuppliers() {

        const API =
            getAPI();

        if (
            !API ||
            typeof API.listSuppliers !==
                "function"
        ) {

            showAlert(
                "Supplier API is not available.",
                "error"
            );

            return;
        }

        showLoading();

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

            const suppliers =
                normalizeSuppliers(
                    response
                );

            renderSuppliers(
                suppliers
            );

        } catch (error) {

            console.error(
                "Supplier loading error:",
                error
            );

            rows.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="sf-empty"
                        style="color:#b42336;"
                    >
                        ${escapeHTML(
                            error?.message ||
                            "Unable to load suppliers."
                        )}
                    </td>
                </tr>
            `;

            showAlert(
                error?.message ||
                "Unable to load suppliers.",
                "error"
            );
        }
    }


    /* =====================================================
       RENDER SUPPLIERS
       ===================================================== */

    function renderSuppliers(
        suppliers
    ) {

        if (!suppliers.length) {

            showEmpty();

            return;
        }

        rows.innerHTML =
            suppliers.map(
                supplier => {

                    const id =
                        getValue(
                            supplier,
                            [
                                "id",
                                "supplier_id",
                                "supplierId"
                            ]
                        );

                    const name =
                        getValue(
                            supplier,
                            [
                                "name",
                                "supplier_name",
                                "supplierName"
                            ]
                        );

                    const contact =
                        getValue(
                            supplier,
                            [
                                "contactPerson",
                                "contact_person",
                                "contact",
                                "contactName"
                            ]
                        );

                    const phone =
                        getValue(
                            supplier,
                            [
                                "phone",
                                "phoneNumber",
                                "phone_number"
                            ]
                        );

                    const email =
                        getValue(
                            supplier,
                            [
                                "email",
                                "emailAddress"
                            ]
                        );

                    const status =
                        clean(
                            getValue(
                                supplier,
                                [
                                    "status",
                                    "supplier_status"
                                ]
                            )
                        ).toUpperCase() ||
                        "ACTIVE";


                    const statusClass =
                        status === "ACTIVE"
                            ? "active"
                            : "inactive";


                    return `
                        <tr>

                            <td>
                                <span
                                    class="supplier-name"
                                >
                                    ${escapeHTML(
                                        name || "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="supplier-contact"
                                >
                                    ${escapeHTML(
                                        contact || "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="supplier-phone"
                                >
                                    ${escapeHTML(
                                        phone || "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="supplier-email"
                                >
                                    ${escapeHTML(
                                        email || "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="supplier-status ${statusClass}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>
                            </td>


                            <td>

                                <div
                                    class="supplier-actions"
                                >

                                    <button
                                        type="button"
                                        class="supplier-action"
                                        data-action="edit"
                                        data-id="${escapeHTML(id)}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="supplier-action delete"
                                        data-action="delete"
                                        data-id="${escapeHTML(id)}"
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
       FIND SUPPLIER
       ===================================================== */

    async function findSupplier(
        id
    ) {

        const API =
            getAPI();

        if (
            !API ||
            typeof API.listSuppliers !==
                "function"
        ) {
            return null;
        }

        const response =
            await API.listSuppliers();

        const suppliers =
            normalizeSuppliers(
                response
            );

        return suppliers.find(
            supplier => {

                const supplierId =
                    getValue(
                        supplier,
                        [
                            "id",
                            "supplier_id",
                            "supplierId"
                        ]
                    );

                return String(
                    supplierId
                ) === String(id);

            }
        ) || null;
    }


    /* =====================================================
       EDIT SUPPLIER
       ===================================================== */

    async function editSupplier(
        id
    ) {

        try {

            const supplier =
                await findSupplier(
                    id
                );

            if (!supplier) {

                showAlert(
                    "Supplier not found.",
                    "error"
                );

                return;
            }

            idInput.value =
                getValue(
                    supplier,
                    [
                        "id",
                        "supplier_id",
                        "supplierId"
                    ]
                );

            nameInput.value =
                getValue(
                    supplier,
                    [
                        "name",
                        "supplier_name",
                        "supplierName"
                    ]
                );

            contactInput.value =
                getValue(
                    supplier,
                    [
                        "contactPerson",
                        "contact_person",
                        "contact"
                    ]
                );

            phoneInput.value =
                getValue(
                    supplier,
                    [
                        "phone",
                        "phoneNumber",
                        "phone_number"
                    ]
                );

            emailInput.value =
                getValue(
                    supplier,
                    [
                        "email",
                        "emailAddress"
                    ]
                );

            addressInput.value =
                getValue(
                    supplier,
                    [
                        "address",
                        "supplier_address"
                    ]
                );

            statusInput.value =
                clean(
                    getValue(
                        supplier,
                        [
                            "status",
                            "supplier_status"
                        ]
                    )
                ).toUpperCase() ||
                "ACTIVE";

            saveButton.textContent =
                "Update Supplier";

            nameInput.focus();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch (error) {

            console.error(
                "Edit supplier error:",
                error
            );

            showAlert(
                error?.message ||
                "Unable to load supplier.",
                "error"
            );
        }
    }


    /* =====================================================
       SAVE SUPPLIER
       ===================================================== */

    async function saveSupplier(
        event
    ) {

        event.preventDefault();

        const API =
            getAPI();

        if (
            !API ||
            typeof API.saveSupplier !==
                "function"
        ) {

            showAlert(
                "Supplier save API is not available.",
                "error"
            );

            return;
        }


        const name =
            clean(
                nameInput.value
            );

        if (!name) {

            showAlert(
                "Supplier name is required.",
                "error"
            );

            nameInput.focus();

            return;
        }


        const payload = {

            id:
                clean(
                    idInput.value
                ),

            name:
                name,

            contactPerson:
                clean(
                    contactInput.value
                ),

            phone:
                clean(
                    phoneInput.value
                ),

            email:
                clean(
                    emailInput.value
                ),

            address:
                clean(
                    addressInput.value
                ),

            status:
                clean(
                    statusInput.value
                ).toUpperCase()

        };


        const isEdit =
            Boolean(
                payload.id
            );


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                isEdit
                    ? "Updating..."
                    : "Saving...";
        }


        try {

            const response =
                await API.saveSupplier(
                    payload
                );

            console.log(
                "Save supplier response:",
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
                isEdit
                    ? "Supplier updated successfully."
                    : "Supplier saved successfully.",
                "success"
            );

            clearForm();

            await loadSuppliers();

        } catch (error) {

            console.error(
                "Save supplier error:",
                error
            );

            showAlert(
                error?.message ||
                "Unable to save supplier.",
                "error"
            );

        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Supplier";
            }
        }
    }


    /* =====================================================
       DELETE SUPPLIER
       ===================================================== */

    async function deleteSupplier(
        id
    ) {

        const API =
            getAPI();

        if (
            !API ||
            typeof API.deleteSupplier !==
                "function"
        ) {

            showAlert(
                "Supplier delete API is not available.",
                "error"
            );

            return;
        }


        const confirmed =
            window.confirm(
                "Are you sure you want to delete this supplier?"
            );

        if (!confirmed) {
            return;
        }


        try {

            const response =
                await API.deleteSupplier(
                    id
                );

            console.log(
                "Delete supplier response:",
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

            showAlert(
                "Supplier deleted successfully.",
                "success"
            );

            await loadSuppliers();

        } catch (error) {

            console.error(
                "Delete supplier error:",
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
       TABLE ACTIONS
       ===================================================== */

    if (rows) {

        rows.addEventListener(
            "click",
            async event => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!button) {
                    return;
                }

                const action =
                    button.dataset.action;

                const id =
                    button.dataset.id;

                if (!id) {
                    return;
                }

                if (
                    action === "edit"
                ) {

                    await editSupplier(
                        id
                    );

                    return;
                }

                if (
                    action === "delete"
                ) {

                    await deleteSupplier(
                        id
                    );
                }

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

                showAlert(
                    "",
                    "info"
                );
            }
        );
    }


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    if (
        menuButton &&
        sidebar
    ) {

        menuButton.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );
            }
        );


        document.addEventListener(
            "click",
            event => {

                if (
                    window.innerWidth > 800
                ) {
                    return;
                }

                if (
                    !sidebar.classList.contains(
                        "open"
                    )
                ) {
                    return;
                }

                if (
                    sidebar.contains(
                        event.target
                    ) ||
                    menuButton.contains(
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
       INITIALIZE
       ===================================================== */

    clearForm();

    loadSuppliers();

});
