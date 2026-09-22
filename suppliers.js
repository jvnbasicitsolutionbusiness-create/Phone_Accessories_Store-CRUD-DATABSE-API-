/* =========================================================
   STOCKFLOW — SUPPLIERS MODULE
   Supplier Management + CRUD
========================================================= */

(() => {
    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        suppliers: [],

        editingId: null,

        loading: false,
        saving: false,
        deleting: false
    };


    let pendingDelete = null;


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) => document.getElementById(id);


    const escapeHTML = (value) => {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };


    const getSupplierId = (supplier) => {

        return (
            supplier?.ID ??
            supplier?.id ??
            supplier?.supplierId ??
            supplier?.supplier_id ??
            ""
        );
    };


    const getSupplierName = (supplier) => {

        return (
            supplier?.NAME ??
            supplier?.name ??
            supplier?.supplierName ??
            ""
        );
    };


    const getContactPerson = (supplier) => {

        return (
            supplier?.CONTACT_PERSON ??
            supplier?.contactPerson ??
            supplier?.contact_person ??
            ""
        );
    };


    const getPhone = (supplier) => {

        return (
            supplier?.PHONE ??
            supplier?.phone ??
            ""
        );
    };


    const getEmail = (supplier) => {

        return (
            supplier?.EMAIL ??
            supplier?.email ??
            ""
        );
    };


    const getAddress = (supplier) => {

        return (
            supplier?.ADDRESS ??
            supplier?.address ??
            ""
        );
    };


    const getStatus = (supplier) => {

        return String(
            supplier?.STATUS ??
            supplier?.status ??
            "ACTIVE"
        )
            .trim()
            .toUpperCase();
    };


    /* =====================================================
       API RESPONSE NORMALIZATION
    ===================================================== */

    const extractSuppliers = (response) => {

        if (!response) {
            return [];
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response.suppliers)) {
            return response.suppliers;
        }

        if (Array.isArray(response.data)) {
            return response.data;
        }

        if (Array.isArray(response.rows)) {
            return response.rows;
        }

        return [];
    };


    /* =====================================================
       ALERT
    ===================================================== */

    const showAlert = (
        message,
        type = "success"
    ) => {

        const alert = $("alert");

        if (!alert) {
            return;
        }

        alert.textContent =
            message || "";

        alert.className =
            `sf-alert ${type} show`;

        window.clearTimeout(
            showAlert.timeout
        );

        showAlert.timeout =
            window.setTimeout(
                () => {
                    hideAlert();
                },
                4500
            );
    };


    const hideAlert = () => {

        const alert = $("alert");

        if (!alert) {
            return;
        }

        alert.textContent = "";

        alert.className =
            "sf-alert";
    };


    /* =====================================================
       SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const button =
            document.querySelector(
                "[data-menu]"
            );

        const sidebar =
            document.querySelector(
                ".sf-side"
            );

        if (!button || !sidebar) {
            return;
        }


        const overlay =
            document.createElement("div");

        overlay.className =
            "sf-mobile-overlay";

        document.body.appendChild(
            overlay
        );


        const openMenu = () => {

            sidebar.classList.add(
                "open"
            );

            overlay.classList.add(
                "show"
            );

            document.body.style.overflow =
                "hidden";
        };


        const closeMenu = () => {

            sidebar.classList.remove(
                "open"
            );

            overlay.classList.remove(
                "show"
            );

            document.body.style.overflow =
                "";
        };


        button.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "open"
                    )
                ) {
                    closeMenu();
                } else {
                    openMenu();
                }
            }
        );


        overlay.addEventListener(
            "click",
            closeMenu
        );


        sidebar
            .querySelectorAll("a")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeMenu
                );
            });


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {
                    closeMenu();
                }
            }
        );
    };


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const initializeAuthentication =
        async () => {

            if (
                !window.StockFlowAuth ||
                typeof
                window.StockFlowAuth.requireAuth !==
                    "function"
            ) {
                return true;
            }

            const user =
                await window.StockFlowAuth
                    .requireAuth();

            return Boolean(user);
        };


    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    const loadSuppliers =
        async () => {

            if (
                !window.StockFlowAPI ||
                typeof
                window.StockFlowAPI.listSuppliers !==
                    "function"
            ) {

                throw new Error(
                    "Supplier API is not available."
                );
            }


            state.loading = true;


            renderLoading();


            try {

                const response =
                    await window.StockFlowAPI
                        .listSuppliers();


                if (
                    response &&
                    response.success === false
                ) {

                    throw new Error(
                        response.message ||
                        "Unable to load suppliers."
                    );
                }


                state.suppliers =
                    extractSuppliers(
                        response
                    );


                renderSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow suppliers load error:",
                    error
                );


                renderError(
                    error.message ||
                    "Unable to load suppliers."
                );


                throw error;


            } finally {

                state.loading = false;
            }
        };


    /* =====================================================
       LOADING STATE
    ===================================================== */

    const renderLoading = () => {

        const rows = $("rows");

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
    };


    /* =====================================================
       ERROR STATE
    ===================================================== */

    const renderError = (
        message
    ) => {

        const rows = $("rows");

        if (!rows) {
            return;
        }

        rows.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sf-empty"
                >
                    <strong>
                        Unable to load suppliers.
                    </strong>
                    <br>
                    <span>
                        ${escapeHTML(
                            message ||
                            "Please try again."
                        )}
                    </span>
                </td>
            </tr>
        `;
    };


    /* =====================================================
       RENDER SUPPLIERS
    ===================================================== */

    const renderSuppliers = () => {

        const rows = $("rows");

        if (!rows) {
            return;
        }


        if (!state.suppliers.length) {

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

            return;
        }


        rows.innerHTML =
            state.suppliers
                .map(
                    renderSupplierRow
                )
                .join("");


        bindRowActions();
    };


    /* =====================================================
       SUPPLIER ROW
    ===================================================== */

    const renderSupplierRow =
        (supplier) => {

            const id =
                getSupplierId(
                    supplier
                );

            const name =
                getSupplierName(
                    supplier
                ) ||
                "Unnamed Supplier";

            const contact =
                getContactPerson(
                    supplier
                ) ||
                "—";

            const phone =
                getPhone(
                    supplier
                ) ||
                "—";

            const email =
                getEmail(
                    supplier
                ) ||
                "—";

            const status =
                getStatus(
                    supplier
                );


            const statusClass =
                status === "ACTIVE"
                    ? "active"
                    : "inactive";


            return `
                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(contact)}
                    </td>

                    <td>
                        ${escapeHTML(phone)}
                    </td>

                    <td>
                        ${escapeHTML(email)}
                    </td>

                    <td>
                        <span
                            class="sf-status ${statusClass}"
                        >
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>

                        <div
                            class="sf-actions"
                        >

                            <button
                                type="button"
                                class="sf-action"
                                data-action="edit"
                                data-id="${escapeHTML(id)}"
                                title="Edit supplier"
                                aria-label="Edit ${escapeHTML(name)}"
                            >
                                ✎
                            </button>

                            <button
                                type="button"
                                class="sf-action delete"
                                data-action="delete"
                                data-id="${escapeHTML(id)}"
                                title="Delete supplier"
                                aria-label="Delete ${escapeHTML(name)}"
                            >
                                ×
                            </button>

                        </div>

                    </td>

                </tr>
            `;
        };


    /* =====================================================
       ROW ACTIONS
    ===================================================== */

    const bindRowActions = () => {

        document
            .querySelectorAll(
                '[data-action="edit"]'
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const supplier =
                            state.suppliers.find(
                                item =>
                                    String(
                                        getSupplierId(
                                            item
                                        )
                                    ) ===
                                    String(
                                        button.dataset.id
                                    )
                            );


                        if (supplier) {

                            editSupplier(
                                supplier
                            );
                        }
                    }
                );
            });


        document
            .querySelectorAll(
                '[data-action="delete"]'
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const supplier =
                            state.suppliers.find(
                                item =>
                                    String(
                                        getSupplierId(
                                            item
                                        )
                                    ) ===
                                    String(
                                        button.dataset.id
                                    )
                            );


                        if (supplier) {

                            deleteSupplier(
                                supplier
                            );
                        }
                    }
                );
            });
    };


    /* =====================================================
       EDIT SUPPLIER
    ===================================================== */

    const editSupplier =
        (supplier) => {

            state.editingId =
                String(
                    getSupplierId(
                        supplier
                    )
                );


            $("id").value =
                getSupplierId(
                    supplier
                );

            $("name").value =
                getSupplierName(
                    supplier
                );

            $("contactPerson").value =
                getContactPerson(
                    supplier
                );

            $("phone").value =
                getPhone(
                    supplier
                );

            $("email").value =
                getEmail(
                    supplier
                );

            $("address").value =
                getAddress(
                    supplier
                );

            $("status").value =
                getStatus(
                    supplier
                );


            $("saveButton").textContent =
                "Update Supplier";


            document
                .querySelector(
                    ".sf-card form"
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


            $("name")?.focus();
        };


    /* =====================================================
       CLEAR FORM
    ===================================================== */

    const clearForm = () => {

        const form =
            $("supplierForm");

        if (!form) {
            return;
        }


        form.reset();


        $("id").value = "";

        $("status").value =
            "ACTIVE";


        state.editingId =
            null;


        $("saveButton").textContent =
            "Save Supplier";


        hideAlert();
    };


    /* =====================================================
       VALIDATION
    ===================================================== */

    const validateSupplier =
        () => {

            const name =
                $("name")
                    .value
                    .trim();

            const phone =
                $("phone")
                    .value
                    .trim();

            const email =
                $("email")
                    .value
                    .trim();


            if (!name) {

                showAlert(
                    "Supplier name is required.",
                    "error"
                );

                $("name").focus();

                return false;
            }


            if (name.length > 100) {

                showAlert(
                    "Supplier name cannot exceed 100 characters.",
                    "error"
                );

                $("name").focus();

                return false;
            }


            if (
                phone &&
                !/^[0-9+\-\s()]{7,20}$/.test(
                    phone
                )
            ) {

                showAlert(
                    "Please enter a valid phone number.",
                    "error"
                );

                $("phone").focus();

                return false;
            }


            if (
                email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(email)
            ) {

                showAlert(
                    "Please enter a valid email address.",
                    "error"
                );

                $("email").focus();

                return false;
            }


            return true;
        };


    /* =====================================================
       SAVE SUPPLIER
    ===================================================== */

    const saveSupplier =
        async (event) => {

            event.preventDefault();


            if (state.saving) {
                return;
            }


            if (!validateSupplier()) {
                return;
            }


            if (
                !window.StockFlowAPI ||
                typeof
                window.StockFlowAPI.saveSupplier !==
                    "function"
            ) {

                showAlert(
                    "Supplier save API is not available.",
                    "error"
                );

                return;
            }


            const payload = {

                id:
                    $("id").value ||
                    state.editingId ||
                    "",

                name:
                    $("name")
                        .value
                        .trim(),

                contactPerson:
                    $("contactPerson")
                        .value
                        .trim(),

                phone:
                    $("phone")
                        .value
                        .trim(),

                email:
                    $("email")
                        .value
                        .trim(),

                address:
                    $("address")
                        .value
                        .trim(),

                status:
                    $("status")
                        .value
            };


            state.saving = true;


            const button =
                $("saveButton");


            const originalText =
                state.editingId
                    ? "Update Supplier"
                    : "Save Supplier";


            button.disabled = true;

            button.innerHTML = `
                <span class="sf-loading">
                    <span class="sf-spinner"></span>
                    Saving...
                </span>
            `;


            hideAlert();


            try {

                /*
                 * IMPORTANT:
                 * This is the actual module/API connection.
                 *
                 * api.js must expose:
                 * StockFlowAPI.saveSupplier(payload)
                 */

                const response =
                    await window.StockFlowAPI
                        .saveSupplier(
                            payload
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


                const wasEditing =
                    Boolean(
                        state.editingId
                    );


                clearForm();


                showAlert(
                    response?.message ||
                    (
                        wasEditing
                            ? "Supplier updated successfully."
                            : "Supplier saved successfully."
                    ),
                    "success"
                );


                await loadSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow supplier save error:",
                    error
                );


                showAlert(
                    error.message ||
                    "Unable to save supplier.",
                    "error"
                );


            } finally {

                state.saving = false;


                button.disabled =
                    false;


                button.textContent =
                    state.editingId
                        ? "Update Supplier"
                        : originalText;
            }
        };


    /* =====================================================
       DELETE SUPPLIER
    ===================================================== */

    const deleteSupplier =
        async (supplier) => {

            if (state.deleting) {
                return;
            }


            const id =
                getSupplierId(
                    supplier
                );


            const name =
                getSupplierName(
                    supplier
                ) ||
                "this supplier";


            if (!id) {

                showAlert(
                    "Supplier ID is missing.",
                    "error"
                );

                return;
            }


            const confirmed =
                window.confirm(
                    `Delete ${name}?\n\nThis action cannot be undone.`
                );


            if (!confirmed) {
                return;
            }


            if (
                !window.StockFlowAPI ||
                typeof
                window.StockFlowAPI.deleteSupplier !==
                    "function"
            ) {

                showAlert(
                    "Supplier delete API is not available.",
                    "error"
                );

                return;
            }


            state.deleting = true;


            try {

                const response =
                    await window.StockFlowAPI
                        .deleteSupplier(
                            id
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
                    response?.message ||
                    `${name} deleted successfully.`,
                    "success"
                );


                await loadSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow supplier delete error:",
                    error
                );


                showAlert(
                    error.message ||
                    "Unable to delete supplier.",
                    "error"
                );


            } finally {

                state.deleting = false;
            }
        };


    /* =====================================================
       EVENTS
    ===================================================== */

    const setupEvents = () => {

        $("supplierForm")
            ?.addEventListener(
                "submit",
                saveSupplier
            );


        $("clearButton")
            ?.addEventListener(
                "click",
                clearForm
            );
    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize =
        async () => {

            setupSidebar();

            setupEvents();


            try {

                const authenticated =
                    await initializeAuthentication();


                if (!authenticated) {
                    return;
                }


                await loadSuppliers();


            } catch (error) {

                console.error(
                    "StockFlow Suppliers initialization error:",
                    error
                );
            }
        };


    /* =====================================================
       START
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

})();
