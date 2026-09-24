/* =========================================================
   STOCKFLOW — STOCK OUT
   FULL REPLACEMENT
   =========================================================

   Handles:
   - Authentication / session detection
   - Signed-in user detection
   - Sidebar user
   - Topbar user
   - Clickable profile
   - Logout
   - Mobile sidebar
   - Notifications
   - Connection status
   - Product loading
   - Available stock
   - Stock Out submission
   - Recent Stock Out transactions
   - Preview
   - Modal
   - Refresh
   - Clear
   - Default date
   - Optional activity logging

   IMPORTANT AUTH FIX:
   Uses STOCKFLOW_SESSION directly.

   It DOES NOT use:
       StockFlowAPI.requireSession()

   because requireSession() can cause an unwanted
   redirect/session conflict on this page.

   CURRENT API:
       StockFlowAPI.listProducts()
       StockFlowAPI.getUser()
       StockFlowAPI.createStockOut()
       StockFlowAPI.listStockOut()
       StockFlowAPI.listTransactions()
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       INITIALIZATION GUARD
    ===================================================== */

    if (window.__stockFlowStockOutInitialized) {
        return;
    }

    window.__stockFlowStockOutInitialized = true;


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const state = {

        products: [],

        currentUser: null,

        initialized: false

    };


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    const esc = (value) =>

        String(value ?? "")
            .replace(
                /[&<>"']/g,
                char => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[char])
            );


    /* =====================================================
       PRODUCT HELPERS
    ===================================================== */

    const getProductId = (product) =>

        product?.ID ??
        product?.id ??
        product?.PRODUCT_ID ??
        product?.product_id ??
        "";


    const getProductName = (product) =>

        product?.NAME ??
        product?.name ??
        product?.PRODUCT_NAME ??
        product?.product_name ??
        "Unnamed Product";


    const getProductSku = (product) =>

        product?.SKU ??
        product?.sku ??
        "";


    const getStock = (product) =>

        Number(
            product?.STOCK ??
            product?.stock ??
            product?.QUANTITY ??
            product?.quantity ??
            0
        );


    /* =====================================================
       SHOW / HIDE
    ===================================================== */

    const show = (element) => {

        if (element) {
            element.hidden = false;
        }

    };


    const hide = (element) => {

        if (element) {
            element.hidden = true;
        }

    };


    /* =====================================================
       API
    ===================================================== */

    function requireAPI() {

        if (!window.StockFlowAPI) {

            throw new Error(
                "StockFlowAPI is not loaded. Make sure api.js is loaded before stock-out.js."
            );

        }

        return window.StockFlowAPI;

    }


    /* =====================================================
       AUTHENTICATION
       IMPORTANT:
       DO NOT USE requireSession()
    ===================================================== */

    async function initializeAuthentication() {

        let user = null;


        /* -------------------------------------------------
           STEP 1
           READ THE REAL STOCKFLOW SESSION
        ------------------------------------------------- */

        try {

            const raw =
                sessionStorage.getItem(
                    "STOCKFLOW_SESSION"
                );


            if (raw) {

                const session =
                    JSON.parse(raw);


                user =
                    session?.user ||
                    session?.data?.user ||
                    session?.data ||
                    null;

            }

        } catch (error) {

            console.warn(
                "Unable to read STOCKFLOW_SESSION:",
                error
            );

        }


        /* -------------------------------------------------
           STEP 2
           NO SESSION = LOGIN
        ------------------------------------------------- */

        if (!user) {

            console.warn(
                "StockFlow: no active login session found."
            );


            window.location.replace(
                "./auth.html"
            );


            return false;

        }


        /* -------------------------------------------------
           STEP 3
           USE SESSION USER IMMEDIATELY
        ------------------------------------------------- */

        state.currentUser =
            user;


        updateUserDisplay(
            user
        );


        setupUserProfileLinks();


        /* -------------------------------------------------
           STEP 4
           OPTIONAL PROFILE REFRESH
           
           This NEVER controls authentication.
        ------------------------------------------------- */

        try {

            const api =
                window.StockFlowAPI;


            if (
                api &&
                typeof api.getUser ===
                    "function"
            ) {

                const identity = {

                    username:
                        user.username ||
                        user.USERNAME ||
                        undefined,

                    email:
                        user.email ||
                        user.EMAIL ||
                        user.gmail ||
                        user.GMAIL ||
                        undefined,

                    phone:
                        user.phone ||
                        user.PHONE ||
                        user.phoneNumber ||
                        user["PHONE NO."] ||
                        undefined,

                    userId:
                        user.userId ||
                        user.user_id ||
                        user.id ||
                        user.ID ||
                        undefined

                };


                Object.keys(identity)
                    .forEach(
                        key => {

                            if (
                                identity[key] ===
                                    undefined ||
                                identity[key] ===
                                    null ||
                                identity[key] ===
                                    ""
                            ) {

                                delete identity[key];

                            }

                        }
                    );


                if (
                    Object.keys(identity)
                        .length > 0
                ) {

                    const refreshed =
                        await api.getUser(
                            identity
                        );


                    if (
                        refreshed &&
                        typeof refreshed ===
                            "object"
                    ) {

                        const refreshedUser =
                            refreshed.user ||
                            refreshed.data ||
                            refreshed;


                        if (
                            refreshedUser &&
                            typeof refreshedUser ===
                                "object"
                        ) {

                            state.currentUser =
                                refreshedUser;


                            updateUserDisplay(
                                refreshedUser
                            );

                        }

                    }

                }

            }

        } catch (error) {

            /*
             * VERY IMPORTANT:
             *
             * A getUser() failure does NOT
             * log the user out.
             */

            console.warn(
                "StockFlow profile refresh skipped:",
                error
            );

        }


        return true;

    }


    /* =====================================================
       USER INFORMATION
    ===================================================== */

    function getUserName(user) {

        return (

            user?.name ||

            user?.fullName ||

            user?.fullname ||

            user?.full_name ||

            user?.displayName ||

            user?.username ||

            user?.USERNAME ||

            user?.NAME ||

            user?.email ||

            user?.EMAIL ||

            "StockFlow User"

        );

    }


    function getUserRole(user) {

        const role =

            user?.role ||

            user?.ROLE ||

            user?.position ||

            user?.POSITION ||

            user?.accountStatus ||

            user?.ACCOUNT_S ||

            "Employee";


        const normalized =
            String(role)
                .trim()
                .toLowerCase();


        if (
            normalized === "admin" ||
            normalized === "administrator"
        ) {

            return "Administrator";

        }


        if (
            normalized === "manager" ||
            normalized === "supervisor"
        ) {

            return "Manager";

        }


        if (
            normalized === "staff" ||
            normalized === "worker" ||
            normalized === "employee"
        ) {

            return "Employee";

        }


        return String(role);

    }


    function getInitials(name) {

        const parts =
            String(name || "")
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        return (

            parts
                .slice(0, 2)
                .map(
                    part =>
                        part
                            .charAt(0)
                            .toUpperCase()
                )
                .join("") ||

            "SF"

        );

    }


    /* =====================================================
       USER DISPLAY
    ===================================================== */

    function updateUserDisplay(user) {

        const name =
            getUserName(user);


        const role =
            getUserRole(user);


        const initials =
            getInitials(name);


        /* SIDEBAR NAME */

        if ($("sidebarUserName")) {

            $("sidebarUserName")
                .textContent =
                name;

        }


        /* SIDEBAR ROLE */

        if ($("sidebarUserRole")) {

            $("sidebarUserRole")
                .textContent =
                role;

        }


        /* SIDEBAR AVATAR */

        const sidebarAvatar =

            $("sidebarAvatar") ||

            document.querySelector(
                ".sidebar-user-avatar"
            );


        if (sidebarAvatar) {

            sidebarAvatar.textContent =
                initials;

        }


        /* TOPBAR NAME */

        if ($("topbarUserName")) {

            $("topbarUserName")
                .textContent =
                name;

        }


        /* TOPBAR ROLE */

        if ($("topbarUserRole")) {

            $("topbarUserRole")
                .textContent =
                role;

        }


        /* TOPBAR AVATAR */

        const topbarAvatar =

            $("topbarAvatar") ||

            document.querySelector(
                ".topbar .user-avatar"
            );


        if (topbarAvatar) {

            topbarAvatar.textContent =
                initials;

        }


        window.STOCKFLOW_CURRENT_USER =
            user;

    }


    /* =====================================================
       PROFILE
    ===================================================== */

    function goToProfile() {

        window.location.href =
            "./profile.html";

    }


    function setupUserProfileLinks() {

        const selectors = [

            "[data-user-profile]",

            "#userProfile",

            "#sidebarUser",

            "#sidebarUserProfile",

            ".sidebar-user",

            ".sidebar-user-profile",

            ".sidebar-profile",

            ".top-user",

            ".topbar-user",

            ".topbar-profile",

            ".top-user-profile",

            ".user-profile"

        ];


        const elements = [];


        selectors.forEach(
            selector => {

                document
                    .querySelectorAll(selector)
                    .forEach(
                        element => {

                            if (
                                !elements.includes(
                                    element
                                )
                            ) {

                                elements.push(
                                    element
                                );

                            }

                        }
                    );

            }
        );


        elements.forEach(
            element => {

                if (
                    element.id === "logoutBtn" ||
                    element.id === "logoutButton" ||
                    element.closest(
                        "#logoutBtn, #logoutButton"
                    )
                ) {

                    return;

                }


                if (
                    element.tagName === "A"
                ) {

                    element.href =
                        "./profile.html";

                    return;

                }


                if (
                    element.dataset
                        .stockflowProfileBound
                ) {

                    return;

                }


                element.setAttribute(
                    "role",
                    "link"
                );


                element.setAttribute(
                    "tabindex",
                    "0"
                );


                element.style.cursor =
                    "pointer";


                element.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target.closest(
                                "button"
                            )
                        ) {

                            return;

                        }


                        goToProfile();

                    }
                );


                element.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {

                            event.preventDefault();

                            goToProfile();

                        }

                    }
                );


                element.dataset
                    .stockflowProfileBound =
                    "true";

            }
        );


        /*
         * Direct fallback.
         */

        [

            $("sidebarUserName"),
            $("sidebarAvatar"),
            $("topbarUserName"),
            $("topbarAvatar")

        ]
            .filter(Boolean)
            .forEach(
                element => {

                    if (
                        element.dataset
                            .stockflowProfileBound
                    ) {

                        return;

                    }


                    element.style.cursor =
                        "pointer";


                    element.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();

                            goToProfile();

                        }
                    );


                    element.dataset
                        .stockflowProfileBound =
                        "true";

                }
            );

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

            sidebar.classList.remove(
                "open"
            );


            overlay?.classList.remove(
                "show"
            );


            overlay?.classList.remove(
                "active"
            );


            menu.setAttribute(
                "aria-expanded",
                "false"
            );


            document.body.classList.remove(
                "sidebar-open"
            );

        };


        const open = () => {

            sidebar.classList.add(
                "open"
            );


            overlay?.classList.add(
                "show"
            );


            overlay?.classList.add(
                "active"
            );


            menu.setAttribute(
                "aria-expanded",
                "true"
            );


            document.body.classList.add(
                "sidebar-open"
            );

        };


        menu.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

                    close();

                } else {

                    open();

                }

            }
        );


        overlay?.addEventListener(
            "click",
            close
        );


        sidebar
            .querySelectorAll(
                ".nav-item, a"
            )
            .forEach(
                item => {

                    item.addEventListener(
                        "click",
                        () => {

                            if (
                                window.innerWidth <=
                                    900
                            ) {

                                close();

                            }

                        }
                    );

                }
            );


        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 900
                ) {

                    close();

                }

            }
        );

    }


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    function setupNotifications() {

        let button =
            $("notificationButton") ||
            $("notificationBtn");


        let panel =
            $("notificationPanel");


        let closeButton =
            $("closeNotification") ||
            $("closeNotificationBtn");


        if (button && panel) {

            bindNotificationEvents(
                button,
                panel,
                closeButton
            );

            return;

        }


        const right =
            document.querySelector(
                ".topbar-right"
            );


        if (!right) {
            return;
        }


        const wrapper =
            document.createElement(
                "div"
            );


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

                    <strong>
                        Notifications
                    </strong>

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

                        <strong>
                            System Online
                        </strong>

                        <span>
                            StockFlow inventory services are ready.
                        </span>

                    </div>

                </div>

            </div>

        `;


        const user =
            right.querySelector(
                ".topbar-user"
            );


        right.insertBefore(
            wrapper,
            user || null
        );


        button =
            $("notificationBtn");


        panel =
            $("notificationPanel");


        closeButton =
            $("closeNotificationBtn");


        bindNotificationEvents(
            button,
            panel,
            closeButton
        );

    }


    function bindNotificationEvents(
        button,
        panel,
        closeButton
    ) {

        if (!button || !panel) {
            return;
        }


        if (
            button.dataset
                .stockflowNotificationBound
        ) {

            return;

        }


        button.dataset
            .stockflowNotificationBound =
            "true";


        const close = () => {

            hide(panel);


            button.setAttribute(
                "aria-expanded",
                "false"
            );

        };


        button.addEventListener(
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


        closeButton?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                close();

            }
        );


        panel.addEventListener(
            "click",
            event => {

                event.stopPropagation();

            }
        );


        document.addEventListener(
            "click",
            event => {

                if (
                    !panel.contains(event.target) &&
                    !button.contains(event.target)
                ) {

                    close();

                }

            }
        );

    }


    /* =====================================================
       CONNECTION STATUS
    ===================================================== */

    function showOnline() {

        const box =
            $("connectionMessage");


        const badge =
            $("connectionBadge");


        if (badge) {

            badge.classList.remove(
                "offline"
            );


            badge.classList.add(
                "online"
            );


            const badgeText =
                badge.querySelector(
                    "span:last-child"
                );


            if (badgeText) {

                badgeText.textContent =
                    "System Connected";

            }

        }


        if (!box) {
            return;
        }


        box.classList.remove(
            "offline"
        );


        box.classList.add(
            "online"
        );


        box.innerHTML = `

            <i
                class="fa-solid fa-circle-check"
                aria-hidden="true"
            ></i>

            <span>
                System Connected — StockFlow services are ready.
            </span>

        `;


        show(box);

    }


    function showOffline(message) {

        const box =
            $("connectionMessage");


        const badge =
            $("connectionBadge");


        if (badge) {

            badge.classList.add(
                "offline"
            );


            badge.classList.remove(
                "online"
            );


            const badgeText =
                badge.querySelector(
                    "span:last-child"
                );


            if (badgeText) {

                badgeText.textContent =
                    "System Offline";

            }

        }


        if (!box) {
            return;
        }


        box.classList.remove(
            "online"
        );


        box.classList.add(
            "offline"
        );


        box.innerHTML = `

            <i
                class="fa-solid fa-triangle-exclamation"
                aria-hidden="true"
            ></i>

            <span>
                ${esc(
                    message ||
                    "Unable to connect to StockFlow services."
                )}
            </span>

        `;


        show(box);

    }


    /* =====================================================
       LOAD PRODUCTS
    ===================================================== */

    async function loadProducts() {

        const api =
            requireAPI();


        if (
            typeof api.listProducts !==
                "function"
        ) {

            throw new Error(
                "StockFlowAPI.listProducts() is not available."
            );

        }


        const response =
            await api.listProducts();


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

            Array.isArray(
                response?.products
            )

                ? response.products

                : Array.isArray(
                    response?.data
                )

                    ? response.data

                    : Array.isArray(
                        response
                    )

                        ? response

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
            state.products.filter(
                product => {

                    const status =

                        product.STATUS ??
                        product.status ??
                        "ACTIVE";


                    return (
                        String(status)
                            .trim()
                            .toUpperCase() ===
                        "ACTIVE"
                    );

                }
            );


        select.innerHTML = `

            <option value="">
                Select a product
            </option>

        `;


        active.forEach(
            product => {

                const stock =
                    getStock(product);


                const id =
                    getProductId(product);


                const sku =
                    getProductSku(product);


                const name =
                    getProductName(product);


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(id);


                option.textContent =

                    sku

                        ? `${sku} — ${name} (available: ${stock})`

                        : `${name} (available: ${stock})`;


                select.appendChild(
                    option
                );

            }
        );

    }


    function selectedProduct() {

        const id =
            $("productSelect")?.value;


        if (!id) {
            return null;
        }


        return state.products.find(
            product =>

                String(
                    getProductId(product)
                ) ===

                String(id)

        ) || null;

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

            $("availableStock")
                .textContent =
                stock.toLocaleString(
                    "en-PH"
                );

        }


        if ($("stockAvailabilityHelp")) {

            $("stockAvailabilityHelp")
                .textContent =

                product

                    ? `Current available stock: ${stock.toLocaleString("en-PH")} units.`

                    : "Select a product to view available stock.";

        }


        const quantity =
            $("quantity");


        if (quantity) {

            if (product) {

                quantity.max =
                    String(stock);

            } else {

                quantity.removeAttribute(
                    "max"
                );

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

            reasonSelect
                ?.selectedOptions?.[0]
                ?.textContent
                ?.trim() ||

            "—";


        const recipient =
            $("recipient")
                ?.value
                ?.trim() ||

            "—";


        const reference =
            $("referenceNumber")
                ?.value
                ?.trim() ||

            "—";


        const date =
            $("stockOutDate")
                ?.value ||

            "—";


        if ($("previewProduct")) {

            $("previewProduct")
                .textContent =

                product
                    ? getProductName(product)
                    : "No product selected";

        }


        if ($("previewAvailable")) {

            $("previewAvailable")
                .textContent =
                `Available stock: ${stock.toLocaleString("en-PH")}`;

        }


        if ($("previewQuantity")) {

            $("previewQuantity")
                .textContent =
                quantity.toLocaleString(
                    "en-PH"
                );

        }


        if ($("previewRemaining")) {

            $("previewRemaining")
                .textContent =
                remaining.toLocaleString(
                    "en-PH"
                );

        }


        if ($("previewReason")) {

            $("previewReason")
                .textContent =
                reasonText;

        }


        if ($("previewRecipient")) {

            $("previewRecipient")
                .textContent =
                recipient;

        }


        if ($("previewReference")) {

            $("previewReference")
                .textContent =
                reference;

        }


        if ($("previewDate")) {

            $("previewDate")
                .textContent =
                date;

        }


        const quantityInput =
            $("quantity");


        if (quantityInput) {

            if (
                product &&
                quantity > stock
            ) {

                quantityInput.setCustomValidity(
                    `Only ${stock} units are available.`
                );

            } else {

                quantityInput.setCustomValidity(
                    ""
                );

            }

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

                button.disabled =
                    true;


                button.innerHTML = `

                    <i
                        class="fa-solid fa-spinner fa-spin"
                    ></i>

                    <span>
                        Releasing Stock...
                    </span>

                `;

            }

        } else {

            hide(overlay);


            if (button) {

                button.disabled =
                    false;


                button.innerHTML = `

                    <i
                        class="fa-solid fa-arrow-right-from-bracket"
                    ></i>

                    <span>
                        Release Stock
                    </span>

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

            icon.innerHTML =

                success
                    ? `<i class="fa-solid fa-check"></i>`
                    : `<i class="fa-solid fa-xmark"></i>`;


            icon.classList.toggle(
                "success",
                success
            );


            icon.classList.toggle(
                "error",
                !success
            );

        }


        if ($("stockOutModalTitle")) {

            $("stockOutModalTitle")
                .textContent =
                title;

        }


        if ($("stockOutModalMessage")) {

            $("stockOutModalMessage")
                .textContent =
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
       CLEAR FORM
    ===================================================== */

    function clearForm() {

        $("stockOutForm")
            ?.reset();


        if ($("stockOutDate")) {

            $("stockOutDate")
                .value =
                getToday();

        }


        updateAvailableStock();

        updatePreview();

    }


    /* =====================================================
       DATE
    ===================================================== */

    function getToday() {

        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            String(
                now.getMonth() + 1
            )
                .padStart(2, "0");


        const day =
            String(
                now.getDate()
            )
                .padStart(2, "0");


        return `${year}-${month}-${day}`;

    }


    function setDefaultDate() {

        const input =
            $("stockOutDate");


        if (
            input &&
            !input.value
        ) {

            input.value =
                getToday();

        }

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
            $("stockOutReason")?.value || "";


        if (!reason) {

            openModal(
                false,
                "Reason Required",
                "Please select a reason for releasing the stock."
            );

            return;

        }


        const reference =
            $("referenceNumber")
                ?.value
                ?.trim() || "";


        const recipient =
            $("recipient")
                ?.value
                ?.trim() || "";


        const notes =
            $("notes")
                ?.value
                ?.trim() || "";


        const date =
            $("stockOutDate")
                ?.value || "";


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

            const api =
                requireAPI();


            if (
                typeof api.createStockOut !==
                    "function"
            ) {

                throw new Error(
                    "StockFlowAPI.createStockOut() is not available. Please check api.js."
                );

            }


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


            const payload = {

                productId:
                    getProductId(product),

                quantity:
                    quantity,

                reference:
                    reference,

                note:
                    combinedNote

            };


            const response =
                await api.createStockOut(
                    payload
                );


            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Unable to record stock-out transaction."
                );

            }


            openModal(
                true,
                "Stock Released Successfully",
                response?.message ||
                "The inventory has been updated successfully."
            );


            showOnline();


            clearForm();


            await Promise.all([

                loadProducts(),

                loadRecentTransactions()

            ]);


            await logStockOutActivity(
                product,
                quantity,
                reference
            );

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
       RECENT STOCK OUT
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

                    <i
                        class="fa-solid fa-spinner fa-spin"
                    ></i>

                    Loading stock-out transactions...

                </td>

            </tr>

        `;


        try {

            const api =
                requireAPI();


            let response;


            if (
                typeof api.listStockOut ===
                    "function"
            ) {

                response =
                    await api.listStockOut();

            }

            else if (
                typeof api.listTransactions ===
                    "function"
            ) {

                response =
                    await api.listTransactions({
                        type: "STOCK_OUT"
                    });

            }

            else {

                throw new Error(
                    "StockFlowAPI.listStockOut() is not available."
                );

            }


            if (
                response &&
                response.success === false
            ) {

                throw new Error(
                    response.message ||
                    "Unable to load stock-out transactions."
                );

            }


            const transactions =

                Array.isArray(
                    response?.transactions
                )

                    ? response.transactions

                    : Array.isArray(
                        response?.stockOut
                    )

                        ? response.stockOut

                        : Array.isArray(
                            response?.data
                        )

                            ? response.data

                            : Array.isArray(
                                response
                            )

                                ? response

                                : [];


            if (!transactions.length) {

                tbody.innerHTML = `

                    <tr>

                        <td
                            colspan="7"
                            class="table-empty-state"
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
                    .map(
                        transaction => {

                            const date =

                                transaction.DATE ||
                                transaction.date ||
                                transaction.DATE_OUT ||
                                transaction.stock_out_date ||
                                "—";


                            const product =

                                transaction.PRODUCT_NAME ||
                                transaction.product_name ||
                                transaction.PRODUCT ||
                                "—";


                            const quantity =

                                Number(
                                    transaction.QUANTITY ||
                                    transaction.quantity ||
                                    0
                                );


                            const reference =

                                transaction.REFERENCE ||
                                transaction.reference ||
                                transaction.REFERENCE_NUMBER ||
                                "—";


                            const user =

                                transaction.USER ||
                                transaction.user ||
                                transaction.USERNAME ||
                                transaction.username ||
                                "—";


                            const note =

                                transaction.NOTE ||
                                transaction.note ||
                                transaction.NOTES ||
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
                                            -${quantity.toLocaleString("en-PH")}
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

                        }
                    )
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
                        class="table-error-state"
                    >

                        Unable to load recent stock-out transactions.

                        <br>

                        <small>
                            ${esc(
                                error.message ||
                                "Unknown API error."
                            )}
                        </small>

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

        if (!note) {
            return "";
        }


        const escapedLabel =
            String(label)
                .replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


        const match =
            String(note)
                .match(
                    new RegExp(
                        `${escapedLabel}:\\s*([^|]+)`,
                        "i"
                    )
                );


        return match
            ? match[1].trim()
            : "";

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
       OPTIONAL ACTIVITY LOG
    ===================================================== */

    async function logStockOutActivity(
        product,
        quantity,
        reference
    ) {

        const api =
            window.StockFlowAPI;


        if (!api) {
            return;
        }


        const method = [

            "logActivity",
            "recordActivity",
            "createActivity",
            "addActivity",
            "createAuditLog"

        ].find(
            name =>
                typeof api[name] ===
                    "function"
        );


        if (!method) {
            return;
        }


        const user =
            state.currentUser;


        const payload = {

            action:
                "STOCK_OUT",

            module:
                "Stock Out",

            description:
                `${getUserName(user)} released ${quantity} unit(s) of ${getProductName(product)}${reference ? ` (${reference})` : ""}.`,

            user:
                getUserName(user),

            username:
                user?.username ||
                user?.USERNAME ||
                "",

            email:
                user?.email ||
                user?.EMAIL ||
                user?.gmail ||
                user?.GMAIL ||
                "",

            timestamp:
                new Date().toISOString()

        };


        try {

            await api[method](
                payload
            );

        } catch (error) {

            /*
             * Activity logging is optional.
             * Never break a successful Stock Out.
             */

            console.debug(
                "StockFlow activity logging skipped:",
                error
            );

        }

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    function clearSession() {

        /* PRIMARY SESSION */

        try {

            sessionStorage.removeItem(
                "STOCKFLOW_SESSION"
            );

        } catch (_) {}


        /* OTHER SESSION / AUTH KEYS */

        const keys = [

            "stockflowUser",
            "stockflow_user",
            "currentUser",
            "current_user",
            "loggedInUser",
            "logged_in_user",
            "user",
            "authUser",
            "auth_user",
            "STOCKFLOW_TOKEN"

        ];


        keys.forEach(
            key => {

                try {
                    sessionStorage.removeItem(
                        key
                    );
                } catch (_) {}


                try {
                    localStorage.removeItem(
                        key
                    );
                } catch (_) {}

            }
        );

    }


    function setupLogout() {

        const buttons =
            document.querySelectorAll(
                "#logoutButton, #logoutBtn, [data-logout]"
            );


        buttons.forEach(
            button => {

                if (
                    button.dataset
                        .stockflowLogoutBound
                ) {

                    return;

                }


                button.dataset
                    .stockflowLogoutBound =
                    "true";


                button.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();


                        const original =
                            button.innerHTML;


                        button.disabled =
                            true;


                        button.classList.add(
                            "loading"
                        );


                        button.innerHTML = `

                            <i
                                class="fa-solid fa-spinner fa-spin"
                            ></i>

                            <span>
                                Logging out...
                            </span>

                        `;


                        try {

                            const api =
                                window.StockFlowAPI;


                            /*
                             * API logout is optional.
                             * Local session is always cleared.
                             */

                            if (
                                api &&
                                typeof api.logout ===
                                    "function"
                            ) {

                                try {

                                    await api.logout();

                                } catch (error) {

                                    console.warn(
                                        "API logout failed. Clearing local session anyway.",
                                        error
                                    );

                                }

                            }


                            clearSession();


                            window.location.replace(
                                "./auth.html"
                            );

                        } catch (error) {

                            console.error(
                                "Logout error:",
                                error
                            );


                            clearSession();


                            window.location.replace(
                                "./auth.html"
                            );

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function setupEvents() {

        /* FORM */

        $("stockOutForm")
            ?.addEventListener(
                "submit",
                saveStockOut
            );


        /* PRODUCT */

        $("productSelect")
            ?.addEventListener(
                "change",
                () => {

                    updateAvailableStock();

                    updatePreview();

                }
            );


        /* INPUTS */

        [

            "quantity",
            "referenceNumber",
            "recipient",
            "stockOutDate",
            "notes"

        ].forEach(
            id => {

                $(id)
                    ?.addEventListener(
                        "input",
                        updatePreview
                    );


                $(id)
                    ?.addEventListener(
                        "change",
                        updatePreview
                    );

            }
        );


        /* REASON */

        $("stockOutReason")
            ?.addEventListener(
                "change",
                updatePreview
            );


        /* CLEAR */

        $("clearStockOutBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    clearForm();

                }
            );


        /* REFRESH */

        $("refreshStockOutBtn")
            ?.addEventListener(
                "click",
                async event => {

                    event.preventDefault();


                    const button =
                        $("refreshStockOutBtn");


                    if (button) {

                        button.disabled =
                            true;

                    }


                    try {

                        await Promise.all([

                            loadProducts(),

                            loadRecentTransactions()

                        ]);


                        showOnline();

                    } catch (error) {

                        console.error(
                            "Stock Out refresh error:",
                            error
                        );


                        showOffline(
                            error.message
                        );

                    } finally {

                        if (button) {

                            button.disabled =
                                false;

                        }

                    }

                }
            );


        /* MODAL */

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


        /* ESCAPE */

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
       INITIALIZE
    ===================================================== */

    async function initialize() {

        setupSidebar();

        setupNotifications();

        setupLogout();

        setupEvents();

        setDefaultDate();


        try {

            /*
             * Authentication is checked FIRST.
             *
             * This only reads STOCKFLOW_SESSION.
             */

            const authenticated =
                await initializeAuthentication();


            if (!authenticated) {
                return;
            }


            /*
             * User is authenticated.
             * Now load Stock Out data.
             */

            await Promise.all([

                loadProducts(),

                loadRecentTransactions()

            ]);


            showOnline();


            state.initialized =
                true;

        } catch (error) {

            console.error(
                "Stock Out initialization error:",
                error
            );


            /*
             * IMPORTANT:
             *
             * An API/data error does NOT log
             * the user out.
             */

            showOffline(
                error.message ||
                "Unable to connect to StockFlow services."
            );

        }

    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();

    }


})();
