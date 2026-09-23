/* =========================================================
   STOCKFLOW — STOCK IN
   Functional + UI Controller
========================================================= */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    const state = {
        products: [],
        suppliers: [],
        currentUser: null
    };

    /* =====================================================
       HELPERS
    ===================================================== */

    const esc = (value) =>
        String(value ?? "")
            .replace(/[&<>"']/g, (char) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char]));

    const money = (value) =>
        `₱${Number(value || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const getProductName = (p) =>
        p?.NAME ??
        p?.name ??
        "Unnamed Product";

    const getProductId = (p) =>
        p?.ID ??
        p?.id ??
        "";

    const getProductStock = (p) =>
        Number(p?.STOCK ?? p?.stock ?? 0);

    const getSupplierName = (s) =>
        s?.NAME ??
        s?.name ??
        "Unnamed Supplier";

    const getSupplierId = (s) =>
        s?.ID ??
        s?.id ??
        "";

    const show = (element) => {
        if (element) element.hidden = false;
    };

    const hide = (element) => {
        if (element) element.hidden = true;
    };

    /* =====================================================
       AUTH
    ===================================================== */

    async function initializeAuthentication() {

        if (
            !window.StockFlowAuth ||
            typeof window.StockFlowAuth.requireAuth !== "function"
        ) {
            return true;
        }

        const user =
            await window.StockFlowAuth.requireAuth();

        if (!user) {
            return false;
        }

        state.currentUser = user;

        updateUserDisplay(user);

        return true;
    }

    /* =====================================================
       USER DISPLAY
    ===================================================== */

    function updateUserDisplay(user) {

        const name =
            user?.name ||
            user?.fullname ||
            user?.username ||
            "StockFlow User";

        const role =
            user?.role ||
            user?.ROLE ||
            "Employee";

        const initials =
            name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part.charAt(0).toUpperCase())
                .join("") || "SF";

        if ($("topbarUserName")) {
            $("topbarUserName").textContent = name;
        }

        if ($("topbarUserRole")) {
            $("topbarUserRole").textContent = role;
        }

        if ($("topbarAvatar")) {
            $("topbarAvatar").textContent = initials;
        }

        /*
         * If old sidebar-user markup still exists,
         * hide it rather than creating a second user display.
         */

        if ($("sidebarUserName")) {
            $("sidebarUserName").textContent = name;
        }

        if ($("sidebarUserRole")) {
            $("sidebarUserRole").textContent = role;
        }

        if ($("sidebarAvatar")) {
            $("sidebarAvatar").textContent = initials;
        }
    }

    /* =====================================================
       SIDEBAR
    ===================================================== */

    function setupSidebar() {

        const sidebar = $("sidebar");
        const overlay = $("sidebarOverlay");
        const menuBtn = $("mobileMenuBtn");

        if (!sidebar || !menuBtn) {
            return;
        }

        const closeMenu = () => {

            sidebar.classList.remove("open");

            if (overlay) {
                overlay.classList.remove("show");
            }

            menuBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        };

        const openMenu = () => {

            sidebar.classList.add("open");

            if (overlay) {
                overlay.classList.add("show");
            }

            menuBtn.setAttribute(
                "aria-expanded",
                "true"
            );
        };

        menuBtn.addEventListener("click", () => {

            if (sidebar.classList.contains("open")) {
                closeMenu();
            } else {
                openMenu();
            }

        });

        overlay?.addEventListener(
            "click",
            closeMenu
        );

        document
            .querySelectorAll(".nav-item")
            .forEach(link => {

                link.addEventListener(
                    "click",
                    closeMenu
                );

            });

        window.addEventListener(
            "resize",
            () => {

                if (window.innerWidth > 980) {
                    closeMenu();
                }

            }
        );
    }

    /* =====================================================
       NOTIFICATION
    ===================================================== */

    function setupNotifications() {

        const topbarRight =
            document.querySelector(".topbar-right");

        if (!topbarRight) {
            return;
        }

        /*
         * Do not create another notification button
         * if one already exists.
         */

        if ($("notificationBtn")) {
            return;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "notification-wrapper";

        wrapper.innerHTML = `
            <button
                type="button"
                class="notification-btn"
                id="notificationBtn"
                aria-label="Notifications"
                aria-expanded="false"
            >
                <i class="fa-regular fa-bell"></i>
                <span
                    class="notification-dot"
                    id="notificationDot"
                ></span>
            </button>

            <div
                class="stockflow-notification-panel"
                id="notificationPanel"
                hidden
            >
                <div class="notification-panel-head">
                    <strong>Notifications</strong>
                    <button
                        type="button"
                        id="closeNotificationBtn"
                        aria-label="Close notifications"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="notification-panel-item">
                    <div class="notification-panel-icon">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>

                    <div>
                        <strong>StockFlow is online</strong>
                        <span>
                            Inventory services are available.
                        </span>
                    </div>
                </div>
            </div>
        `;

        /*
         * Notification should appear BEFORE user.
         */

        const user =
            topbarRight.querySelector(".topbar-user");

        topbarRight.insertBefore(
            wrapper,
            user || null
        );

        const btn = $("notificationBtn");
        const panel = $("notificationPanel");

        const close = () => {

            hide(panel);

            btn?.setAttribute(
                "aria-expanded",
                "false"
            );
        };

        btn?.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                if (panel.hidden) {

                    show(panel);

                    btn.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                } else {

                    close();
                }
            }
        );

        $("closeNotificationBtn")
            ?.addEventListener(
                "click",
                close
            );

        document.addEventListener(
            "click",
            (event) => {

                if (
                    !wrapper.contains(event.target)
                ) {
                    close();
                }

            }
        );
    }

    /* =====================================================
       CONNECTION MESSAGE
    ===================================================== */

    function showConnectionMessage(
        message = "System Connected — StockFlow services are ready."
    ) {

        const box =
            $("connectionMessage");

        if (!box) {
            return;
        }

        box.innerHTML = `
            <i
                class="fa-solid fa-circle-check"
                style="
                    margin-right:10px;
                    color:#16a05d;
                "
            ></i>

            ${esc(message)}
        `;

        show(box);
    }

    function showConnectionError(message) {

        const box =
            $("connectionMessage");

        if (!box) {
            return;
        }

        box.innerHTML = `
            <i
                class="fa-solid fa-triangle-exclamation"
                style="
                    margin-right:10px;
                    color:#dc3030;
                "
            ></i>

            ${esc(message)}
        `;

        box.style.borderColor = "#f0cccc";
        box.style.background = "#fff4f4";
        box.style.color = "#9f3030";

        show(box);
    }

    /* =====================================================
       LOAD PRODUCTS
    ===================================================== */

    async function loadProducts() {

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.listProducts !== "function"
        ) {
            throw new Error(
                "Product API is not available."
            );
        }

        const response =
            await window.StockFlowAPI.listProducts();

        if (
            response &&
            response.success === false
        ) {
            throw new Error(
                response.message ||
                "Unable to load products."
            );
        }

        state.products =
            Array.isArray(response?.products)
                ? response.products
                : Array.isArray(response)
                    ? response
                    : [];

        populateProductSelect();

        updateAvailableStock();

        updatePreview();
    }

    /* =====================================================
       LOAD SUPPLIERS
    ===================================================== */

    async function loadSuppliers() {

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.listSuppliers !== "function"
        ) {
            return;
        }

        try {

            const response =
                await window.StockFlowAPI.listSuppliers();

            if (
                response &&
                response.success === false
            ) {
                return;
            }

            state.suppliers =
                Array.isArray(response?.suppliers)
                    ? response.suppliers
                    : [];

            populateSupplierSelect();

        } catch (error) {

            console.warn(
                "Unable to load suppliers:",
                error
            );
        }
    }

    /* =====================================================
       PRODUCT SELECT
    ===================================================== */

    function populateProductSelect() {

        const select =
            $("productSelect");

        if (!select) {
            return;
        }

        const activeProducts =
            state.products.filter(product =>
                String(
                    product.STATUS ??
                    product.status ??
                    "ACTIVE"
                ).toUpperCase() === "ACTIVE"
            );

        select.innerHTML =
            `
                <option value="">
                    Select a product
                </option>
            ` +
            activeProducts
                .map(product => {

                    const id =
                        getProductId(product);

                    const sku =
                        product.SKU ??
                        product.sku ??
                        "";

                    const name =
                        getProductName(product);

                    const stock =
                        getProductStock(product);

                    return `
                        <option
                            value="${esc(id)}"
                        >
                            ${esc(sku)} — ${esc(name)}
                            (stock: ${stock})
                        </option>
                    `;
                })
                .join("");
    }

    /* =====================================================
       SUPPLIER SELECT
    ===================================================== */

    function populateSupplierSelect() {

        const select =
            $("supplierSelect");

        if (!select) {
            return;
        }

        select.innerHTML =
            `
                <option value="">
                    Select supplier
                </option>
            ` +
            state.suppliers
                .filter(supplier =>
                    String(
                        supplier.STATUS ??
                        supplier.status ??
                        "ACTIVE"
                    ).toUpperCase() === "ACTIVE"
                )
                .map(supplier => `
                    <option
                        value="${esc(getSupplierName(supplier))}"
                    >
                        ${esc(getSupplierName(supplier))}
                    </option>
                `)
                .join("");
    }

    /* =====================================================
       FIND SELECTED PRODUCT
    ===================================================== */

    function selectedProduct() {

        const id =
            $("productSelect")?.value;

        return state.products.find(
            product =>
                String(getProductId(product)) ===
                String(id)
        );
    }

    /* =====================================================
       AVAILABLE STOCK
    ===================================================== */

    function updateAvailableStock() {

        const product =
            selectedProduct();

        const stock =
            product
                ? getProductStock(product)
                : 0;

        if ($("availableStock")) {
            $("availableStock").textContent =
                stock.toLocaleString();
        }

        if ($("stockAvailabilityHelp")) {

            $("stockAvailabilityHelp").textContent =
                product
                    ? `Current available stock: ${stock.toLocaleString()} units.`
                    : "Select a product to view available stock.";
        }
    }

    /* =====================================================
       PREVIEW
    ===================================================== */

    function updatePreview() {

        const product =
            selectedProduct();

        const supplier =
            $("supplierSelect")?.value || "";

        const quantity =
            Math.max(
                0,
                Number($("quantity")?.value || 0)
            );

        const unitCost =
            Math.max(
                0,
                Number($("unitCost")?.value || 0)
            );

        const reference =
            $("referenceNumber")?.value.trim() ||
            "—";

        const date =
            $("stockInDate")?.value ||
            "—";

        const stock =
            product
                ? getProductStock(product)
                : 0;

        const productName =
            product
                ? getProductName(product)
                : "No product selected";

        const total =
            quantity * unitCost;

        if ($("previewProduct")) {
            $("previewProduct").textContent =
                productName;
        }

        if ($("previewSupplier")) {
            $("previewSupplier").textContent =
                supplier ||
                "No supplier selected";
        }

        if ($("previewQuantity")) {
            $("previewQuantity").textContent =
                quantity.toLocaleString();
        }

        if ($("previewUnitCost")) {
            $("previewUnitCost").textContent =
                money(unitCost);
        }

        if ($("previewTotal")) {
            $("previewTotal").textContent =
                money(total);
        }

        if ($("previewReference")) {
            $("previewReference").textContent =
                reference;
        }

        if ($("previewDate")) {
            $("previewDate").textContent =
                date;
        }

        if ($("quantity")) {

            if (product) {
                $("quantity").max =
                    String(stock);
            } else {
                $("quantity").removeAttribute("max");
            }
        }
    }

    /* =====================================================
       MODAL
    ===================================================== */

    function openResultModal(
        success,
        title,
        message
    ) {

        const modal =
            $("stockInModal");

        if (!modal) {
            return;
        }

        const icon =
            $("stockInModalIcon");

        if (icon) {

            icon.innerHTML = success
                ? `<i class="fa-solid fa-check"></i>`
                : `<i class="fa-solid fa-xmark"></i>`;

            icon.style.background =
                success
                    ? "#eaf8f0"
                    : "#fff0f0";

            icon.style.color =
                success
                    ? "#16a05d"
                    : "#dc3030";
        }

        if ($("stockInModalTitle")) {
            $("stockInModalTitle").textContent =
                title;
        }

        if ($("stockInModalMessage")) {
            $("stockInModalMessage").textContent =
                message;
        }

        show(modal);
    }

    function closeResultModal() {
        hide($("stockInModal"));
    }

    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(loading) {

        const overlay =
            $("stockInLoading");

        const button =
            $("saveStockInBtn");

        if (loading) {

            show(overlay);

            if (button) {
                button.disabled = true;

                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Saving Stock...</span>
                `;
            }

        } else {

            hide(overlay);

            if (button) {

                button.disabled = false;

                button.innerHTML = `
                    <i class="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>Add Stock</span>
                `;
            }
        }
    }

    /* =====================================================
       CLEAR FORM
    ===================================================== */

    function clearForm() {

        const form =
            $("stockInForm");

        form?.reset();

        if ($("stockInDate")) {
            $("stockInDate").value =
                new Date()
                    .toISOString()
                    .split("T")[0];
        }

        updateAvailableStock();
        updatePreview();
    }

    /* =====================================================
       SAVE STOCK IN
    ===================================================== */

    async function saveStockIn(event) {

        event.preventDefault();

        const product =
            selectedProduct();

        if (!product) {

            openResultModal(
                false,
                "Product Required",
                "Please select a product before adding stock."
            );

            return;
        }

        const quantity =
            Number($("quantity")?.value || 0);

        const stock =
            getProductStock(product);

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {

            openResultModal(
                false,
                "Invalid Quantity",
                "Quantity must be a positive whole number."
            );

            return;
        }

        const unitCost =
            Math.max(
                0,
                Number($("unitCost")?.value || 0)
            );

        const supplier =
            $("supplierSelect")?.value.trim() ||
            "";

        const reference =
            $("referenceNumber")?.value.trim() ||
            "";

        const note =
            $("notes")?.value.trim() ||
            "";

        const date =
            $("stockInDate")?.value ||
            "";

        if (!date) {

            openResultModal(
                false,
                "Date Required",
                "Please select the stock-in date."
            );

            return;
        }

        setLoading(true);

        try {

            const response =
                await window.StockFlowAPI.stockIn({

                    productId:
                        getProductId(product),

                    quantity,

                    unitCost,

                    reference,

                    supplier,

                    note,

                    date
                });

            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to record stock-in transaction."
                );
            }

            openResultModal(
                true,
                "Stock Added Successfully",
                response.message ||
                "The inventory has been updated successfully."
            );

            showConnectionMessage(
                "System Connected — StockFlow services are ready."
            );

            clearForm();

            await Promise.all([
                loadProducts(),
                loadRecentTransactions()
            ]);

        } catch (error) {

            console.error(
                "Stock In error:",
                error
            );

            openResultModal(
                false,
                "Unable to Add Stock",
                error.message ||
                "Something went wrong while saving the transaction."
            );

            showConnectionError(
                error.message ||
                "Unable to connect to StockFlow services."
            );

        } finally {

            setLoading(false);
        }
    }

    /* =====================================================
       RECENT TRANSACTIONS
    ===================================================== */

    async function loadRecentTransactions() {

        const tbody =
            $("stockInTableBody");

        if (!tbody) {
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="table-loading"
                >
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading stock transactions...
                </td>
            </tr>
        `;

        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.listTransactions !== "function"
        ) {
            return;
        }

        try {

            const response =
                await window.StockFlowAPI.listTransactions({
                    type: "STOCK_IN"
                });

            if (
                response &&
                response.success === false
            ) {
                throw new Error(
                    response.message ||
                    "Unable to load transactions."
                );
            }

            const transactions =
                Array.isArray(response?.transactions)
                    ? response.transactions
                    : [];

            if (!transactions.length) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="6"
                            style="
                                text-align:center;
                                padding:35px;
                                color:#8794a8;
                            "
                        >
                            No stock-in transactions yet.
                        </td>
                    </tr>
                `;

                return;
            }

            tbody.innerHTML =
                transactions
                    .slice(0, 10)
                    .map(transaction => {

                        const date =
                            transaction.DATE ||
                            transaction.date ||
                            "—";

                        const product =
                            transaction.PRODUCT_NAME ||
                            transaction.productName ||
                            "—";

                        const quantity =
                            transaction.QUANTITY ??
                            transaction.quantity ??
                            0;

                        const supplier =
                            transaction.SUPPLIER ||
                            transaction.supplier ||
                            "—";

                        const reference =
                            transaction.REFERENCE ||
                            transaction.reference ||
                            "—";

                        const user =
                            transaction.USER ||
                            transaction.user ||
                            "—";

                        return `
                            <tr>

                                <td>
                                    ${esc(formatDate(date))}
                                </td>

                                <td>
                                    <strong>
                                        ${esc(product)}
                                    </strong>
                                </td>

                                <td>
                                    <strong>
                                        +${Number(quantity).toLocaleString()}
                                    </strong>
                                </td>

                                <td>
                                    ${esc(supplier)}
                                </td>

                                <td>
                                    ${esc(reference)}
                                </td>

                                <td>
                                    ${esc(user)}
                                </td>

                            </tr>
                        `;
                    })
                    .join("");

        } catch (error) {

            console.error(
                "Transaction loading error:",
                error
            );

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        style="
                            text-align:center;
                            padding:35px;
                            color:#c53b3b;
                        "
                    >
                        Unable to load recent transactions.
                    </td>
                </tr>
            `;
        }
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

        return date.toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    function setupLogout() {

        $("logoutBtn")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("logoutBtn");

                    if (button) {
                        button.disabled = true;
                    }

                    try {

                        if (
                            window.StockFlowAuth &&
                            typeof window.StockFlowAuth.logout === "function"
                        ) {
                            await window.StockFlowAuth.logout();
                        } else {

                            sessionStorage.clear();

                            location.href =
                                "auth.html";
                        }

                    } catch (error) {

                        sessionStorage.clear();

                        location.href =
                            "auth.html";
                    }

                }
            );
    }

    /* =====================================================
       EVENTS
    ===================================================== */

    function setupEvents() {

        $("stockInForm")
            ?.addEventListener(
                "submit",
                saveStockIn
            );

        $("productSelect")
            ?.addEventListener(
                "change",
                () => {

                    updateAvailableStock();
                    updatePreview();

                }
            );

        [
            "quantity",
            "unitCost",
            "referenceNumber",
            "stockInDate"
        ].forEach(id => {

            $(id)?.addEventListener(
                "input",
                updatePreview
            );

            $(id)?.addEventListener(
                "change",
                updatePreview
            );
        });

        $("supplierSelect")
            ?.addEventListener(
                "change",
                updatePreview
            );

        $("clearStockInBtn")
            ?.addEventListener(
                "click",
                clearForm
            );

        $("refreshStockInBtn")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("refreshStockInBtn");

                    if (button) {
                        button.disabled = true;
                    }

                    try {

                        await Promise.all([
                            loadProducts(),
                            loadSuppliers(),
                            loadRecentTransactions()
                        ]);

                        showConnectionMessage(
                            "System Connected — StockFlow services are ready."
                        );

                    } catch (error) {

                        showConnectionError(
                            error.message ||
                            "Unable to refresh StockFlow."
                        );

                    } finally {

                        if (button) {
                            button.disabled = false;
                        }
                    }
                }
            );

        $("closeStockInModal")
            ?.addEventListener(
                "click",
                closeResultModal
            );

        $("stockInModalOk")
            ?.addEventListener(
                "click",
                closeResultModal
            );

        $("stockInModal")
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        $("stockInModal")
                    ) {
                        closeResultModal();
                    }
                }
            );

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {
                    closeResultModal();
                }

            }
        );
    }

    /* =====================================================
       DEFAULT DATE
    ===================================================== */

    function setDefaultDate() {

        const date =
            $("stockInDate");

        if (
            date &&
            !date.value
        ) {
            date.value =
                new Date()
                    .toISOString()
                    .split("T")[0];
        }
    }

    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initialize() {

        setupSidebar();
        setupNotifications();
        setupLogout();
        setupEvents();
        setDefaultDate();

        try {

            const authenticated =
                await initializeAuthentication();

            if (!authenticated) {
                return;
            }

            await Promise.all([
                loadProducts(),
                loadSuppliers(),
                loadRecentTransactions()
            ]);

            showConnectionMessage(
                "System Connected — StockFlow services are ready."
            );

        } catch (error) {

            console.error(
                "Stock In initialization error:",
                error
            );

            showConnectionError(
                error.message ||
                "Unable to connect to StockFlow services."
            );
        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

})();
