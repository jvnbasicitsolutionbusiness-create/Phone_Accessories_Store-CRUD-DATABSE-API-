smae thing for stock out, but it's main issue is unknown api, other else are the same thing, buttons, log out, user account clickable and detection, notification icon, etc.


/* =========================================================
   STOCKFLOW — STOCK OUT
   Functional + UI Controller
========================================================= */

(() => {
    "use strict";

    const $ = (id) =>
        document.getElementById(id);

    const state = {
        products: [],
        currentUser: null
    };

    /* =====================================================
       HELPERS
    ===================================================== */

    const esc = (value) =>
        String(value ?? "")
            .replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char]));

    const getProductId = p =>
        p?.ID ??
        p?.id ??
        "";

    const getProductName = p =>
        p?.NAME ??
        p?.name ??
        "Unnamed Product";

    const getStock = p =>
        Number(
            p?.STOCK ??
            p?.stock ??
            0
        );

    const show = el => {
        if (el) el.hidden = false;
    };

    const hide = el => {
        if (el) el.hidden = true;
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
       USER
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
                .map(x =>
                    x.charAt(0).toUpperCase()
                )
                .join("") || "SF";

        if ($("topbarUserName")) {
            $("topbarUserName").textContent =
                name;
        }

        if ($("topbarUserRole")) {
            $("topbarUserRole").textContent =
                role;
        }

        if ($("topbarAvatar")) {
            $("topbarAvatar").textContent =
                initials;
        }
    }

    /* =====================================================
       SIDEBAR
    ===================================================== */

    function setupSidebar() {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");

        const menu =
            $("mobileMenuBtn");

        if (!sidebar || !menu) {
            return;
        }

        const close = () => {

            sidebar.classList.remove("open");
            overlay?.classList.remove("show");

            menu.setAttribute(
                "aria-expanded",
                "false"
            );
        };

        menu.addEventListener(
            "click",
            () => {

                const open =
                    sidebar.classList.toggle("open");

                overlay?.classList.toggle(
                    "show",
                    open
                );

                menu.setAttribute(
                    "aria-expanded",
                    String(open)
                );
            }
        );

        overlay?.addEventListener(
            "click",
            close
        );

        document
            .querySelectorAll(".nav-item")
            .forEach(item => {
                item.addEventListener(
                    "click",
                    close
                );
            });
    }

    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function setupNotifications() {

        const right =
            document.querySelector(".topbar-right");

        if (!right || $("notificationBtn")) {
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
                id="notificationPanel"
                class="stockflow-notification-panel"
                hidden
            >
                <div class="notification-panel-head">
                    <strong>Notifications</strong>

                    <button
                        type="button"
                        id="closeNotificationBtn"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="notification-panel-item">
                    <div class="notification-panel-icon">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>

                    <div>
                        <strong>System Online</strong>
                        <span>
                            StockFlow inventory services are ready.
                        </span>
                    </div>
                </div>
            </div>
        `;

        const user =
            right.querySelector(".topbar-user");

        right.insertBefore(
            wrapper,
            user || null
        );

        const button =
            $("notificationBtn");

        const panel =
            $("notificationPanel");

        const close = () => {

            hide(panel);

            button?.setAttribute(
                "aria-expanded",
                "false"
            );
        };

        button?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                const isHidden =
                    panel.hidden;

                if (isHidden) {
                    show(panel);
                } else {
                    hide(panel);
                }

                button.setAttribute(
                    "aria-expanded",
                    String(isHidden)
                );
            }
        );

        $("closeNotificationBtn")
            ?.addEventListener(
                "click",
                close
            );

        document.addEventListener(
            "click",
            event => {

                if (
                    !wrapper.contains(event.target)
                ) {
                    close();
                }
            }
        );
    }

    /* =====================================================
       CONNECTION
    ===================================================== */

    function showOnline() {

        const box =
            $("connectionMessage");

        if (!box) {
            return;
        }

        box.style.borderColor =
            "#cce8d8";

        box.style.background =
            "linear-gradient(90deg,#f0faf4,#f7fcf9)";

        box.style.color =
            "#1d7748";

        box.innerHTML = `
            <i
                class="fa-solid fa-circle-check"
                style="
                    margin-right:10px;
                    color:#16a05d;
                "
            ></i>

            System Connected — StockFlow services are ready.
        `;

        show(box);
    }

    function showOffline(message) {

        const box =
            $("connectionMessage");

        if (!box) {
            return;
        }

        box.style.borderColor =
            "#f0cccc";

        box.style.background =
            "#fff4f4";

        box.style.color =
            "#9f3030";

        box.innerHTML = `
            <i
                class="fa-solid fa-triangle-exclamation"
                style="
                    margin-right:10px;
                    color:#dc3030;
                "
            ></i>

            ${esc(
                message ||
                "Unable to connect to StockFlow services."
            )}
        `;

        show(box);
    }

    /* =====================================================
       PRODUCTS
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
                : [];

        populateProducts();

        updateAvailableStock();
        updatePreview();
    }

    function populateProducts() {

        const select =
            $("productSelect");

        if (!select) {
            return;
        }

        const active =
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
            active
                .map(product => {

                    const stock =
                        getStock(product);

                    const sku =
                        product.SKU ??
                        product.sku ??
                        "";

                    return `
                        <option
                            value="${esc(
                                getProductId(product)
                            )}"
                        >
                            ${esc(sku)} — 
                            ${esc(getProductName(product))}
                            (available: ${stock})
                        </option>
                    `;
                })
                .join("");
    }

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
                ? getStock(product)
                : 0;

        if ($("availableStock")) {
            $("availableStock").textContent =
                stock.toLocaleString();
        }

        if ($("stockAvailabilityHelp")) {

            $("stockAvailabilityHelp")
                .textContent =
                product
                    ? `Current available stock: ${stock.toLocaleString()} units.`
                    : "Select a product to view available stock.";
        }

        if ($("quantity")) {

            if (product) {
                $("quantity").max =
                    String(stock);
            } else {
                $("quantity")
                    .removeAttribute("max");
            }
        }
    }

    /* =====================================================
       PREVIEW
    ===================================================== */

    function updatePreview() {

        const product =
            selectedProduct();

        const stock =
            product
                ? getStock(product)
                : 0;

        const quantity =
            Math.max(
                0,
                Number(
                    $("quantity")?.value || 0
                )
            );

        const remaining =
            Math.max(
                0,
                stock - quantity
            );

        const reasonSelect =
            $("stockOutReason");

        const reasonText =
            reasonSelect?.selectedOptions?.[0]
                ?.textContent?.trim() ||
            "—";

        const recipient =
            $("recipient")?.value.trim() ||
            "—";

        const reference =
            $("referenceNumber")?.value.trim() ||
            "—";

        const date =
            $("stockOutDate")?.value ||
            "—";

        if ($("previewProduct")) {
            $("previewProduct").textContent =
                product
                    ? getProductName(product)
                    : "No product selected";
        }

        if ($("previewAvailable")) {
            $("previewAvailable").textContent =
                `Available stock: ${stock.toLocaleString()}`;
        }

        if ($("previewQuantity")) {
            $("previewQuantity").textContent =
                quantity.toLocaleString();
        }

        if ($("previewRemaining")) {
            $("previewRemaining").textContent =
                remaining.toLocaleString();
        }

        if ($("previewReason")) {
            $("previewReason").textContent =
                reasonText;
        }

        if ($("previewRecipient")) {
            $("previewRecipient").textContent =
                recipient;
        }

        if ($("previewReference")) {
            $("previewReference").textContent =
                reference;
        }

        if ($("previewDate")) {
            $("previewDate").textContent =
                date;
        }

        /*
         * Visual warning when quantity exceeds stock.
         */

        const quantityInput =
            $("quantity");

        if (
            product &&
            quantity > stock
        ) {

            quantityInput?.setCustomValidity(
                `Only ${stock} units are available.`
            );

        } else {

            quantityInput?.setCustomValidity("");
        }
    }

    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(loading) {

        const overlay =
            $("stockOutLoading");

        const button =
            $("saveStockOutBtn");

        if (loading) {

            show(overlay);

            if (button) {

                button.disabled = true;

                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Releasing Stock...</span>
                `;
            }

        } else {

            hide(overlay);

            if (button) {

                button.disabled = false;

                button.innerHTML = `
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>Release Stock</span>
                `;
            }
        }
    }

    /* =====================================================
       RESULT MODAL
    ===================================================== */

    function openModal(
        success,
        title,
        message
    ) {

        const modal =
            $("stockOutModal");

        if (!modal) {
            return;
        }

        const icon =
            $("stockOutModalIcon");

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

        if ($("stockOutModalTitle")) {
            $("stockOutModalTitle").textContent =
                title;
        }

        if ($("stockOutModalMessage")) {
            $("stockOutModalMessage").textContent =
                message;
        }

        show(modal);
    }

    function closeModal() {

        hide(
            $("stockOutModal")
        );
    }

    /* =====================================================
       CLEAR
    ===================================================== */

    function clearForm() {

        $("stockOutForm")?.reset();

        if ($("stockOutDate")) {

            $("stockOutDate").value =
                new Date()
                    .toISOString()
                    .split("T")[0];
        }

        updateAvailableStock();
        updatePreview();
    }

    /* =====================================================
       SAVE STOCK OUT
    ===================================================== */

    async function saveStockOut(event) {

        event.preventDefault();

        const product =
            selectedProduct();

        if (!product) {

            openModal(
                false,
                "Product Required",
                "Please select a product before releasing stock."
            );

            return;
        }

        const quantity =
            Number(
                $("quantity")?.value || 0
            );

        const available =
            getStock(product);

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {

            openModal(
                false,
                "Invalid Quantity",
                "Quantity must be a positive whole number."
            );

            return;
        }

        if (quantity > available) {

            openModal(
                false,
                "Insufficient Stock",
                `Only ${available} units are currently available.`
            );

            return;
        }

        const reason =
            $("stockOutReason")?.value ||
            "";

        if (!reason) {

            openModal(
                false,
                "Reason Required",
                "Please select a reason for releasing the stock."
            );

            return;
        }

        const reference =
            $("referenceNumber")?.value.trim() ||
            "";

        const recipient =
            $("recipient")?.value.trim() ||
            "";

        const notes =
            $("notes")?.value.trim() ||
            "";

        const date =
            $("stockOutDate")?.value ||
            "";

        if (!date) {

            openModal(
                false,
                "Date Required",
                "Please select the stock-out date."
            );

            return;
        }

        setLoading(true);

        try {

            /*
             * The existing backend uses:
             * productId
             * quantity
             * reference
             * note
             *
             * Recipient/reason/date are included in note
             * so the existing TRANSACTIONS structure remains
             * compatible.
             */

            const combinedNote = [
                `Reason: ${reason}`,
                recipient
                    ? `Recipient: ${recipient}`
                    : "",
                notes
                    ? `Notes: ${notes}`
                    : "",
                date
                    ? `Date: ${date}`
                    : ""
            ]
                .filter(Boolean)
                .join(" | ");

            const response =
                await window.StockFlowAPI.stockOut({

                    productId:
                        getProductId(product),

                    quantity,

                    reference,

                    note:
                        combinedNote
                });

            if (
                !response ||
                response.success === false
            ) {

                throw new Error(
                    response?.message ||
                    "Unable to record stock-out transaction."
                );
            }

            openModal(
                true,
                "Stock Released Successfully",
                response.message ||
                "The inventory has been updated successfully."
            );

            showOnline();

            clearForm();

            await Promise.all([
                loadProducts(),
                loadRecentTransactions()
            ]);

        } catch (error) {

            console.error(
                "Stock Out error:",
                error
            );

            openModal(
                false,
                "Unable to Release Stock",
                error.message ||
                "Something went wrong while saving the transaction."
            );

            showOffline(
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
            $("stockOutTableBody");

        if (!tbody) {
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="table-loading"
                >
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading stock transactions...
                </td>
            </tr>
        `;

        try {

            const response =
                await window.StockFlowAPI.listTransactions({
                    type: "STOCK_OUT"
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
                            colspan="7"
                            style="
                                text-align:center;
                                padding:35px;
                                color:#8794a8;
                            "
                        >
                            No stock-out transactions yet.
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
                            "—";

                        const product =
                            transaction.PRODUCT_NAME ||
                            "—";

                        const quantity =
                            Number(
                                transaction.QUANTITY ||
                                0
                            );

                        const reference =
                            transaction.REFERENCE ||
                            "—";

                        const user =
                            transaction.USER ||
                            "—";

                        const note =
                            transaction.NOTE ||
                            "";

                        const reason =
                            extractNote(
                                note,
                                "Reason"
                            );

                        const recipient =
                            extractNote(
                                note,
                                "Recipient"
                            );

                        return `
                            <tr>

                                <td>
                                    ${esc(
                                        formatDate(date)
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${esc(product)}
                                    </strong>
                                </td>

                                <td>
                                    <strong>
                                        -${quantity.toLocaleString()}
                                    </strong>
                                </td>

                                <td>
                                    ${esc(
                                        reason || "—"
                                    )}
                                </td>

                                <td>
                                    ${esc(reference)}
                                </td>

                                <td>
                                    ${esc(
                                        recipient || "—"
                                    )}
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
                "Stock-out transaction loading error:",
                error
            );

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
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
       NOTE PARSER
    ===================================================== */

    function extractNote(
        note,
        label
    ) {

        const match =
            String(note || "")
                .match(
                    new RegExp(
                        `${label}:\\s*([^|]+)`
                    )
                );

        return match
            ? match[1].trim()
            : "";
    }

    /* =====================================================
       DATE
    ===================================================== */

    function formatDate(value) {

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

                    } catch (_) {

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

        $("stockOutForm")
            ?.addEventListener(
                "submit",
                saveStockOut
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
            "referenceNumber",
            "recipient",
            "stockOutDate",
            "notes"
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

        $("stockOutReason")
            ?.addEventListener(
                "change",
                updatePreview
            );

        $("clearStockOutBtn")
            ?.addEventListener(
                "click",
                clearForm
            );

        $("refreshStockOutBtn")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("refreshStockOutBtn");

                    if (button) {
                        button.disabled = true;
                    }

                    try {

                        await Promise.all([
                            loadProducts(),
                            loadRecentTransactions()
                        ]);

                        showOnline();

                    } catch (error) {

                        showOffline(
                            error.message
                        );

                    } finally {

                        if (button) {
                            button.disabled = false;
                        }
                    }
                }
            );

        $("closeStockOutModal")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("stockOutModalOk")
            ?.addEventListener(
                "click",
                closeModal
            );

        $("stockOutModal")
            ?.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        $("stockOutModal")
                    ) {
                        closeModal();
                    }
                }
            );

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {
                    closeModal();
                }
            }
        );
    }

    /* =====================================================
       DEFAULT DATE
    ===================================================== */

    function setDefaultDate() {

        const input =
            $("stockOutDate");

        if (
            input &&
            !input.value
        ) {

            input.value =
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
                loadRecentTransactions()
            ]);

            showOnline();

        } catch (error) {

            console.error(
                "Stock Out initialization error:",
                error
            );

            showOffline(
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
