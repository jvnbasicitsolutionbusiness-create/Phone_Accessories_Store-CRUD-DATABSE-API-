/* ============================================================
   STOCKFLOW | STOCK IN
   stock-in.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    // ========================================================
    // AUTHENTICATION
    // ========================================================

    const user = await StockFlowAuth.requireAuth();

    if (!user) {
        return;
    }

    StockFlowAuth.bindUserUI(user);


    // ========================================================
    // BASIC ELEMENTS
    // ========================================================

    const form =
        document.getElementById("stockInForm");

    const productSelect =
        document.getElementById("productSelect");

    const quantityInput =
        document.getElementById("quantity");

    const supplierInput =
        document.getElementById("supplier");

    const referenceInput =
        document.getElementById("reference");

    const notesInput =
        document.getElementById("notes");

    const dateInput =
        document.getElementById("stockInDate");

    const submitBtn =
        document.getElementById("stockInSubmit");

    const resetBtn =
        document.getElementById("stockInReset");

    const tableBody =
        document.getElementById("stockInTableBody");

    const searchInput =
        document.getElementById("stockInSearch");

    const refreshBtn =
        document.getElementById("refreshStockInBtn");

    const connectionBadge =
        document.getElementById("connectionBadge");

    const connectionMessage =
        document.getElementById("connectionMessage");


    // ========================================================
    // MOBILE SIDEBAR
    // ========================================================

    document
        .getElementById("mobileMenuBtn")
        ?.addEventListener(
            "click",
            () => {
                document.body.classList.toggle(
                    "sidebar-open"
                );
            }
        );

    document
        .getElementById("sidebarOverlay")
        ?.addEventListener(
            "click",
            () => {
                document.body.classList.remove(
                    "sidebar-open"
                );
            }
        );


    // ========================================================
    // LOGOUT
    // ========================================================

    document
        .getElementById("logoutBtn")
        ?.addEventListener(
            "click",
            () => StockFlowAuth.logout()
        );


    // ========================================================
    // STATE
    // ========================================================

    let products = [];

    let stockInRecords = [];

    let filteredRecords = [];


    // ========================================================
    // DEFAULT DATE
    // ========================================================

    if (dateInput) {

        const today =
            new Date();

        dateInput.value =
            today.toISOString()
                .split("T")[0];

    }


    // ========================================================
    // LOAD PAGE
    // ========================================================

    await loadProducts();

    await loadStockInRecords();


    // ========================================================
    // PRODUCT LIST
    // ========================================================

    async function loadProducts() {

        try {

            setConnection(
                true,
                "CONNECTED"
            );


            const response =
                await StockFlowAPI.products();


            if (!response?.success) {

                throw new Error(
                    response?.message ||
                    "Unable to load products."
                );

            }


            products =
                normalizeProducts(
                    response
                );


            populateProductSelect();

        }

        catch (error) {

            console.error(
                "StockFlow products error:",
                error
            );


            products = [];

            populateProductSelect();


            setConnection(
                false,
                "OFFLINE"
            );

        }

    }


    // ========================================================
    // LOAD STOCK-IN RECORDS
    // ========================================================

    async function loadStockInRecords() {

        try {

            setLoadingState(
                true
            );


            const response =
                await getStockInAPI();


            if (!response?.success) {

                throw new Error(
                    response?.message ||
                    "Unable to load stock-in records."
                );

            }


            stockInRecords =
                normalizeRecords(
                    response
                );


            filteredRecords =
                [...stockInRecords];


            renderRecords();

            updateStatistics();


            setConnection(
                true,
                "CONNECTED"
            );

        }

        catch (error) {

            console.error(
                "StockFlow stock-in error:",
                error
            );


            stockInRecords = [];

            filteredRecords = [];


            renderEmpty(
                "Unable to load stock-in records."
            );


            setConnection(
                false,
                "OFFLINE"
            );


            if (connectionMessage) {

                connectionMessage.textContent =
                    error.message ||
                    "Unable to connect to the inventory API.";

            }

        }

        finally {

            setLoadingState(
                false
            );

        }

    }


    // ========================================================
    // STOCK-IN API
    // ========================================================
    //
    // Supports several backend API naming conventions so the
    // frontend remains compatible with the updated API.js.
    //
    // ========================================================

    async function getStockInAPI() {

        if (
            typeof StockFlowAPI.stockIn ===
            "function"
        ) {

            return await StockFlowAPI.stockIn();

        }


        if (
            typeof StockFlowAPI.getStockIn ===
            "function"
        ) {

            return await StockFlowAPI.getStockIn();

        }


        if (
            typeof StockFlowAPI.stockInRecords ===
            "function"
        ) {

            return await StockFlowAPI.stockInRecords();

        }


        if (
            typeof StockFlowAPI.inventoryTransactions ===
            "function"
        ) {

            return await StockFlowAPI.inventoryTransactions(
                "STOCK_IN"
            );

        }


        if (
            typeof StockFlowAPI.transactions ===
            "function"
        ) {

            return await StockFlowAPI.transactions({
                type: "STOCK_IN"
            });

        }


        throw new Error(
            "Stock-in API function is not available. Please update API.js."
        );

    }


    // ========================================================
    // SUBMIT STOCK-IN
    // ========================================================

    form?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const productId =
                String(
                    productSelect?.value ||
                    ""
                ).trim();


            const quantity =
                Number(
                    quantityInput?.value ||
                    0
                );


            const supplier =
                String(
                    supplierInput?.value ||
                    ""
                ).trim();


            const reference =
                String(
                    referenceInput?.value ||
                    ""
                ).trim();


            const notes =
                String(
                    notesInput?.value ||
                    ""
                ).trim();


            const date =
                String(
                    dateInput?.value ||
                    ""
                ).trim();


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!productId) {

                showToast(
                    "Please select a product.",
                    "error"
                );

                productSelect?.focus();

                return;

            }


            if (
                !Number.isFinite(quantity) ||
                quantity <= 0
            ) {

                showToast(
                    "Please enter a valid stock-in quantity.",
                    "error"
                );

                quantityInput?.focus();

                return;

            }


            if (
                !Number.isInteger(quantity)
            ) {

                showToast(
                    "Stock quantity must be a whole number.",
                    "error"
                );

                quantityInput?.focus();

                return;

            }


            if (!date) {

                showToast(
                    "Please select a stock-in date.",
                    "error"
                );

                dateInput?.focus();

                return;

            }


            // ------------------------------------------------
            // PRODUCT
            // ------------------------------------------------

            const product =
                findProduct(
                    productId
                );


            if (!product) {

                showToast(
                    "Selected product could not be found.",
                    "error"
                );

                return;

            }


            // ------------------------------------------------
            // CONFIRMATION
            // ------------------------------------------------

            const productName =
                product.PRODUCT_NAME ||
                product.productName ||
                product.NAME ||
                product.name ||
                "Selected product";


            const confirmed =
                window.confirm(
                    `Add ${quantity} unit(s) of "${productName}" to stock?`
                );


            if (!confirmed) {

                return;

            }


            // ------------------------------------------------
            // LOADING
            // ------------------------------------------------

            setSubmitLoading(
                true
            );


            try {

                const payload = {

                    action:
                        "stockIn",

                    productId:
                        getProductId(
                            product
                        ),

                    productID:
                        getProductId(
                            product
                        ),

                    productName:
                        productName,

                    quantity:
                        quantity,

                    supplier:
                        supplier,

                    reference:
                        reference,

                    notes:
                        notes,

                    date:
                        date,

                    type:
                        "STOCK_IN",

                    transactionType:
                        "STOCK_IN",

                    userId:
                        user.uid ||
                        user.id ||
                        "",

                    username:
                        user.username ||
                        "",

                    performedBy:
                        user.username ||
                        user.name ||
                        user.gmail ||
                        ""

                };


                const response =
                    await submitStockIn(
                        payload
                    );


                if (
                    !response?.success
                ) {

                    throw new Error(
                        response?.message ||
                        "Stock-in transaction failed."
                    );

                }


                showToast(
                    "Stock-in recorded successfully.",
                    "success"
                );


                resetForm();

                await loadProducts();

                await loadStockInRecords();

            }

            catch (error) {

                console.error(
                    "Stock-in submission error:",
                    error
                );


                showToast(
                    error.message ||
                    "Unable to record stock-in.",
                    "error"
                );

            }

            finally {

                setSubmitLoading(
                    false
                );

            }

        }
    );


    // ========================================================
    // SUBMIT STOCK-IN API
    // ========================================================

    async function submitStockIn(
        payload
    ) {

        if (
            typeof StockFlowAPI.stockIn ===
            "function"
        ) {

            return await StockFlowAPI.stockIn(
                payload
            );

        }


        if (
            typeof StockFlowAPI.addStockIn ===
            "function"
        ) {

            return await StockFlowAPI.addStockIn(
                payload
            );

        }


        if (
            typeof StockFlowAPI.createStockIn ===
            "function"
        ) {

            return await StockFlowAPI.createStockIn(
                payload
            );

        }


        if (
            typeof StockFlowAPI.inventoryTransaction ===
            "function"
        ) {

            return await StockFlowAPI.inventoryTransaction(
                payload
            );

        }


        if (
            typeof StockFlowAPI.addTransaction ===
            "function"
        ) {

            return await StockFlowAPI.addTransaction(
                payload
            );

        }


        throw new Error(
            "Stock-in submit API is not available. Please update API.js."
        );

    }


    // ========================================================
    // RESET
    // ========================================================

    resetBtn?.addEventListener(
        "click",
        () => {

            resetForm();

        }
    );


    function resetForm() {

        form?.reset();


        if (dateInput) {

            const today =
                new Date();

            dateInput.value =
                today.toISOString()
                    .split("T")[0];

        }


        if (productSelect) {

            productSelect.selectedIndex =
                0;

        }

    }


    // ========================================================
    // REFRESH
    // ========================================================

    refreshBtn?.addEventListener(
        "click",
        async () => {

            refreshBtn.disabled =
                true;


            try {

                await loadProducts();

                await loadStockInRecords();

                showToast(
                    "Stock-in records refreshed.",
                    "success"
                );

            }

            finally {

                refreshBtn.disabled =
                    false;

            }

        }
    );


    // ========================================================
    // SEARCH
    // ========================================================

    searchInput?.addEventListener(
        "input",
        () => {

            const keyword =
                String(
                    searchInput.value ||
                    ""
                )
                .trim()
                .toLowerCase();


            if (!keyword) {

                filteredRecords =
                    [...stockInRecords];

            }

            else {

                filteredRecords =
                    stockInRecords.filter(
                        record => {

                            const text =
                                [

                                    record.productName,

                                    record.PRODUCT_NAME,

                                    record.productId,

                                    record.PRODUCT_ID,

                                    record.supplier,

                                    record.SUPPLIER,

                                    record.reference,

                                    record.REFERENCE,

                                    record.performedBy,

                                    record.PERFORMED_BY

                                ]
                                .join(" ")
                                .toLowerCase();


                            return text.includes(
                                keyword
                            );

                        }
                    );

            }


            renderRecords();

        }
    );


    // ========================================================
    // POPULATE PRODUCT SELECT
    // ========================================================

    function populateProductSelect() {

        if (!productSelect) {
            return;
        }


        const previous =
            productSelect.value;


        productSelect.innerHTML =
            `<option value="">Select product</option>`;


        products.forEach(
            product => {

                const id =
                    getProductId(
                        product
                    );


                if (!id) {
                    return;
                }


                const name =
                    product.PRODUCT_NAME ||
                    product.productName ||
                    product.NAME ||
                    product.name ||
                    "Unnamed Product";


                const sku =
                    product.SKU ||
                    product.sku ||
                    product.PRODUCT_CODE ||
                    product.productCode ||
                    "";


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    id;


                option.textContent =
                    sku
                        ? `${name} — ${sku}`
                        : name;


                productSelect.appendChild(
                    option
                );

            }
        );


        if (previous) {

            productSelect.value =
                previous;

        }

    }


    // ========================================================
    // RENDER RECORDS
    // ========================================================

    function renderRecords() {

        if (!tableBody) {
            return;
        }


        if (
            !filteredRecords.length
        ) {

            renderEmpty(
                "No stock-in transactions found."
            );

            return;

        }


        tableBody.innerHTML =
            filteredRecords
                .slice(0, 100)
                .map(
                    (
                        record,
                        index
                    ) => {

                        const product =
                            record.productName ||
                            record.PRODUCT_NAME ||
                            record.name ||
                            record.NAME ||
                            "Unknown Product";


                        const quantity =
                            Number(
                                record.quantity ||
                                record.QUANTITY ||
                                0
                            );


                        const supplier =
                            record.supplier ||
                            record.SUPPLIER ||
                            "—";


                        const reference =
                            record.reference ||
                            record.REFERENCE ||
                            "—";


                        const date =
                            record.date ||
                            record.DATE ||
                            record.createdAt ||
                            record.CREATED_AT ||
                            "";


                        const performedBy =
                            record.performedBy ||
                            record.PERFORMED_BY ||
                            record.username ||
                            record.USERNAME ||
                            "—";


                        return `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        formatDate(date)
                                    )}
                                </td>

                                <td>

                                    <div class="product-cell">

                                        <strong>
                                            ${escapeHTML(
                                                product
                                            )}
                                        </strong>

                                        ${
                                            record.productId ||
                                            record.PRODUCT_ID
                                                ? `
                                                    <small>
                                                        ${escapeHTML(
                                                            record.productId ||
                                                            record.PRODUCT_ID
                                                        )}
                                                    </small>
                                                  `
                                                : ""
                                        }

                                    </div>

                                </td>

                                <td>

                                    <span class="quantity-badge">

                                        +${formatNumber(
                                            quantity
                                        )}

                                    </span>

                                </td>

                                <td>
                                    ${escapeHTML(
                                        supplier
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        reference
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        performedBy
                                    )}
                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");

    }


    // ========================================================
    // EMPTY TABLE
    // ========================================================

    function renderEmpty(
        message
    ) {

        if (!tableBody) {
            return;
        }


        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-table"
                >

                    <div class="empty-state">

                        <i
                            class="fa-solid fa-box-open"
                        ></i>

                        <strong>
                            ${escapeHTML(
                                message
                            )}
                        </strong>

                        <span>
                            Stock-in transactions will appear here.
                        </span>

                    </div>

                </td>

            </tr>

        `;

    }


    // ========================================================
    // STATISTICS
    // ========================================================

    function updateStatistics() {

        const totalTransactions =
            stockInRecords.length;


        const totalUnits =
            stockInRecords.reduce(
                (
                    total,
                    record
                ) => {

                    const quantity =
                        Number(
                            record.quantity ||
                            record.QUANTITY ||
                            0
                        );


                    return total +
                        (
                            Number.isFinite(
                                quantity
                            )
                                ? quantity
                                : 0
                        );

                },
                0
            );


        const today =
            new Date();


        const todayKey =
            today
                .toISOString()
                .split("T")[0];


        const todayUnits =
            stockInRecords.reduce(
                (
                    total,
                    record
                ) => {

                    const recordDate =
                        getDateKey(
                            record.date ||
                            record.DATE ||
                            record.createdAt ||
                            record.CREATED_AT
                        );


                    if (
                        recordDate !==
                        todayKey
                    ) {

                        return total;

                    }


                    return total +
                        Number(
                            record.quantity ||
                            record.QUANTITY ||
                            0
                        );

                },
                0
            );


        setText(
            "stockInTransactions",
            totalTransactions
        );


        setText(
            "stockInTotal",
            formatNumber(
                totalUnits
            )
        );


        setText(
            "stockInToday",
            formatNumber(
                todayUnits
            )
        );

    }


    // ========================================================
    // PRODUCT HELPERS
    // ========================================================

    function findProduct(
        productId
    ) {

        return products.find(
            product => {

                return String(
                    getProductId(
                        product
                    )
                ) ===
                String(
                    productId
                );

            }
        );

    }


    function getProductId(
        product
    ) {

        return (
            product.uid ||
            product.id ||
            product.ID ||
            product.productId ||
            product.PRODUCT_ID ||
            product.productID ||
            product.PRODUCT_CODE ||
            product.productCode ||
            ""
        );

    }


    // ========================================================
    // NORMALIZE PRODUCTS
    // ========================================================

    function normalizeProducts(
        response
    ) {

        const list =
            response.products ||
            response.data ||
            response.items ||
            response.records ||
            [];


        if (
            !Array.isArray(list)
        ) {

            return [];

        }


        return list;

    }


    // ========================================================
    // NORMALIZE RECORDS
    // ========================================================

    function normalizeRecords(
        response
    ) {

        let list =
            response.stockIn ||
            response.stockInRecords ||
            response.transactions ||
            response.records ||
            response.data ||
            [];


        if (
            response.data &&
            !Array.isArray(list) &&
            typeof response.data ===
            "object"
        ) {

            list =
                response.data.stockIn ||
                response.data.transactions ||
                response.data.records ||
                [];

        }


        if (
            !Array.isArray(list)
        ) {

            return [];

        }


        return list.filter(
            record => {

                const type =
                    String(
                        record.type ||
                        record.TYPE ||
                        record.transactionType ||
                        record.TRANSACTION_TYPE ||
                        record.action ||
                        record.ACTION ||
                        "STOCK_IN"
                    )
                    .trim()
                    .toUpperCase();


                return (
                    type ===
                    "STOCK_IN" ||
                    type ===
                    "STOCK IN" ||
                    type ===
                    "IN"
                );

            }
        );

    }


    // ========================================================
    // CONNECTION
    // ========================================================

    function setConnection(
        online,
        label
    ) {

        if (!connectionBadge) {
            return;
        }


        connectionBadge.textContent =
            label;


        connectionBadge.classList.toggle(
            "online",
            online
        );


        connectionBadge.classList.toggle(
            "offline",
            !online
        );

    }


    // ========================================================
    // LOADING STATE
    // ========================================================

    function setLoadingState(
        loading
    ) {

        if (!tableBody) {
            return;
        }


        if (!loading) {
            return;
        }


        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="loading-table"
                >

                    <div class="loading-state">

                        <span class="spinner"></span>

                        Loading stock-in records...

                    </div>

                </td>

            </tr>

        `;

    }


    // ========================================================
    // BUTTON LOADING
    // ========================================================

    function setSubmitLoading(
        loading
    ) {

        if (!submitBtn) {
            return;
        }


        submitBtn.disabled =
            loading;


        if (loading) {

            submitBtn.dataset.originalText =
                submitBtn.innerHTML;


            submitBtn.innerHTML = `

                <span class="spinner spinner-light"></span>

                Recording...

            `;

        }

        else {

            submitBtn.innerHTML =
                submitBtn.dataset.originalText ||
                `<i class="fa-solid fa-plus"></i> Add Stock`;

        }

    }


    // ========================================================
    // TEXT HELPERS
    // ========================================================

    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value ?? "0";

        }

    }


    function formatNumber(
        value
    ) {

        const number =
            Number(
                value || 0
            );


        return Number.isFinite(
            number
        )
            ? number.toLocaleString()
            : "0";

    }


    // ========================================================
    // DATE HELPERS
    // ========================================================

    function formatDate(
        value
    ) {

        if (!value) {
            return "—";
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
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );

    }


    function getDateKey(
        value
    ) {

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
            ).substring(
                0,
                10
            );

        }


        return date
            .toISOString()
            .split("T")[0];

    }


    // ========================================================
    // TOAST
    // ========================================================

    function showToast(
        message,
        type = "info"
    ) {

        let container =
            document.getElementById(
                "toastContainer"
            );


        if (!container) {

            container =
                document.createElement(
                    "div"
                );


            container.id =
                "toastContainer";


            container.className =
                "toast-container";


            document.body.appendChild(
                container
            );

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast toast-${type}`;


        const icon =
            type === "success"
                ? "fa-circle-check"
                : type === "error"
                    ? "fa-circle-exclamation"
                    : "fa-circle-info";


        toast.innerHTML = `

            <i
                class="fa-solid ${icon}"
            ></i>

            <span>
                ${escapeHTML(message)}
            </span>

        `;


        container.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {
                toast.classList.add(
                    "show"
                );
            }
        );


        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );


                setTimeout(
                    () => {
                        toast.remove();
                    },
                    250
                );

            },
            3500
        );

    }


    // ========================================================
    // HTML ESCAPE
    // ========================================================

    function escapeHTML(
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

});
