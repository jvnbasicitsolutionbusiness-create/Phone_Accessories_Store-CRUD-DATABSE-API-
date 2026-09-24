/* =========================================================
   STOCKFLOW — CATEGORIES MANAGEMENT
   ---------------------------------------------------------
   Features:
   - Sidebar
   - Notifications
   - Clickable user account
   - Working logout
   - Connection status
   - Category loading
   - Product/category usage calculation
   - Active / inactive calculation
   - Search
   - Status filter
   - Pagination
   - Add category
   - Edit category
   - Delete category
   - Refresh
   ========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    const PAGE_SIZE = 8;

    const CATEGORY_ACTIVE_DAYS = 30;


    let categories = [];

    let products = [];

    let filteredCategories = [];

    let currentPage = 1;

    let categoryToDelete = null;


    /* =====================================================
       SAFE TEXT
    ===================================================== */

    const safeText = (value) => {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();

    };


    /* =====================================================
       ESCAPE HTML
       Prevents category names/descriptions from injecting HTML.
    ===================================================== */

    const escapeHTML = (value) => {

        return safeText(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    };


    /* =====================================================
       DATE HELPERS
    ===================================================== */

    const parseDate = (value) => {

        if (!value) {
            return null;
        }

        if (value instanceof Date) {

            return Number.isNaN(
                value.getTime()
            )
                ? null
                : value;

        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date;

    };


    const formatDate = (value) => {

        const date =
            parseDate(value);

        if (!date) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        ).format(date);

    };


    const formatDateTime = (value) => {

        const date =
            parseDate(value);

        if (!date) {
            return "Not used yet";
        }

        return new Intl.DateTimeFormat(
            "en-US",
            {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }
        ).format(date);

    };


    const daysSince = (value) => {

        const date =
            parseDate(value);

        if (!date) {
            return Infinity;
        }

        const now =
            new Date();

        const difference =
            now.getTime() -
            date.getTime();

        return Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        );

    };


    /* =====================================================
       ARRAY NORMALIZER
    ===================================================== */

    const normalizeArray = (
        result,
        keys = []
    ) => {

        if (Array.isArray(result)) {
            return result;
        }

        if (
            result &&
            typeof result === "object"
        ) {

            for (
                const key of keys
            ) {

                if (
                    Array.isArray(
                        result[key]
                    )
                ) {

                    return result[key];

                }

            }

            if (
                result.data &&
                typeof result.data === "object"
            ) {

                for (
                    const key of keys
                ) {

                    if (
                        Array.isArray(
                            result.data[key]
                        )
                    ) {

                        return result.data[key];

                    }

                }

            }

        }

        return [];

    };


    /* =====================================================
       USER SESSION FALLBACK
    ===================================================== */

    const getCurrentUser = () => {

        let user = null;


        /* ---------------------------------------------
           StockFlowAuth compatibility
        --------------------------------------------- */

        try {

            if (
                window.StockFlowAuth &&
                typeof window.StockFlowAuth.getUser ===
                    "function"
            ) {

                user =
                    window.StockFlowAuth.getUser();

            }

        } catch (error) {

            console.warn(
                "StockFlowAuth.getUser failed:",
                error
            );

        }


        if (user) {
            return user;
        }


        /* ---------------------------------------------
           API stored user
        --------------------------------------------- */

        try {

            if (
                window.StockFlowAPI &&
                typeof window.StockFlowAPI.getStoredUser ===
                    "function"
            ) {

                user =
                    window.StockFlowAPI.getStoredUser();

            }

        } catch (error) {

            console.warn(
                "Unable to read stored user:",
                error
            );

        }


        if (user) {
            return user;
        }


        /* ---------------------------------------------
           Legacy STOCKFLOW_SESSION
        --------------------------------------------- */

        try {

            const raw =
                sessionStorage.getItem(
                    "STOCKFLOW_SESSION"
                );

            if (raw) {

                const session =
                    JSON.parse(raw);

                if (
                    session?.user
                ) {

                    return session.user;

                }

                if (
                    session?.data?.user
                ) {

                    return session.data.user;

                }

                if (
                    session?.success &&
                    session.user
                ) {

                    return session.user;

                }

            }

        } catch (error) {

            console.warn(
                "Unable to read STOCKFLOW_SESSION:",
                error
            );

        }


        return null;

    };


    /* =====================================================
       USER DISPLAY
    ===================================================== */

    const setupUserDisplay = () => {

        const user =
            getCurrentUser();


        if (!user) {

            console.warn(
                "StockFlow: no stored user found."
            );

            return;

        }


        const name =
            user.name ||
            user.fullName ||
            user.full_name ||
            user.NAME ||
            user.username ||
            user.USERNAME ||
            user.email ||
            user.EMAIL ||
            "StockFlow User";


        const role =
            user.role ||
            user.ROLE ||
            user.position ||
            user.POSITION ||
            "Employee";


        const initials =
            safeText(name)
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(
                    part =>
                        part
                            .charAt(0)
                            .toUpperCase()
                )
                .join("") ||
            "U";


        if (
            $("sidebarUserName")
        ) {

            $("sidebarUserName")
                .textContent =
                name;

        }


        if (
            $("sidebarUserRole")
        ) {

            $("sidebarUserRole")
                .textContent =
                role;

        }


        if (
            $("sidebarUserAvatar")
        ) {

            $("sidebarUserAvatar")
                .textContent =
                initials;

        }


        if (
            $("topbarUserName")
        ) {

            $("topbarUserName")
                .textContent =
                name;

        }


        if (
            $("topbarUserRole")
        ) {

            $("topbarUserRole")
                .textContent =
                role;

        }


        if (
            $("topbarUserAvatar")
        ) {

            $("topbarUserAvatar")
                .textContent =
                initials;

        }

    };


    /* =====================================================
       CLICKABLE USER ACCOUNT
       -----------------------------------------------------
       Both topbar and sidebar user areas open Profile.
    ===================================================== */

    const setupUserAccount = () => {

        const userElements = [

            document.querySelector(
                ".topbar-user"
            ),

            document.querySelector(
                ".sidebar-user"
            )

        ].filter(Boolean);


        userElements.forEach(
            (element) => {

                element.style.cursor =
                    "pointer";

                element.setAttribute(
                    "role",
                    "button"
                );

                element.setAttribute(
                    "tabindex",
                    "0"
                );


                const openProfile = () => {

                    window.location.href =
                        "./profile.html";

                };


                element.addEventListener(
                    "click",
                    (event) => {

                        /*
                         * Do not trigger when the click
                         * originates from an actual button.
                         */

                        if (
                            event.target.closest(
                                "button,a"
                            )
                        ) {
                            return;
                        }

                        openProfile();

                    }
                );


                element.addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key ===
                                "Enter" ||
                            event.key ===
                                " "
                        ) {

                            event.preventDefault();

                            openProfile();

                        }

                    }
                );

            }
        );

    };


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const setupSidebar = () => {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");

        const menuButton =
            $("mobileMenuBtn");


        if (
            !sidebar ||
            !overlay ||
            !menuButton
        ) {
            return;
        }


        const closeSidebar = () => {

            sidebar.classList.remove(
                "open"
            );

            overlay.classList.remove(
                "show"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

            document.body.style.overflow =
                "";

        };


        const openSidebar = () => {

            sidebar.classList.add(
                "open"
            );

            overlay.classList.add(
                "show"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );

            document.body.style.overflow =
                "hidden";

        };


        menuButton.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "open"
                    )
                ) {

                    closeSidebar();

                } else {

                    openSidebar();

                }

            }
        );


        overlay.addEventListener(
            "click",
            closeSidebar
        );


        sidebar
            .querySelectorAll("a")
            .forEach(
                (link) => {

                    link.addEventListener(
                        "click",
                        closeSidebar
                    );

                }
            );


        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth >
                    1100
                ) {

                    closeSidebar();

                }

            }
        );

    };


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    const setupNotifications = () => {

        const button =
            $("notificationBtn");

        const panel =
            $("notificationPanel");

        const closeButton =
            $("closeNotificationBtn");


        if (
            !button ||
            !panel
        ) {
            return;
        }


        const closePanel = () => {

            panel.hidden =
                true;

            button.setAttribute(
                "aria-expanded",
                "false"
            );

        };


        const togglePanel = (
            event
        ) => {

            event.stopPropagation();

            panel.hidden =
                !panel.hidden;

            button.setAttribute(
                "aria-expanded",
                String(
                    !panel.hidden
                )
            );

        };


        button.addEventListener(
            "click",
            togglePanel
        );


        closeButton?.addEventListener(
            "click",
            closePanel
        );


        document.addEventListener(
            "click",
            (event) => {

                if (
                    !panel.contains(
                        event.target
                    ) &&
                    !button.contains(
                        event.target
                    )
                ) {

                    closePanel();

                }

            }
        );

    };


    /* =====================================================
       LOGOUT
    ===================================================== */

    const clearLocalSession = () => {

        const sessionKeys = [

            "STOCKFLOW_TOKEN",
            "STOCKFLOW_USER",
            "STOCKFLOW_SESSION"

        ];


        sessionKeys.forEach(
            (key) => {

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

    };


    const setupLogout = () => {

        const button =
            $("logoutBtn");


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async (event) => {

                event.preventDefault();


                if (
                    button.disabled
                ) {
                    return;
                }


                button.disabled =
                    true;


                const originalHTML =
                    button.innerHTML;


                button.innerHTML =
                    `
                    <span
                        class="button-spinner"
                        style="
                            display:inline-block;
                        "
                    ></span>
                    <span>Logging out...</span>
                    `;


                try {

                    /*
                     * Use the centralized API logout
                     * when available.
                     */

                    if (
                        window.StockFlowAPI &&
                        typeof window.StockFlowAPI.logout ===
                            "function"
                    ) {

                        await window.StockFlowAPI.logout();

                    } else if (
                        window.StockFlowAuth &&
                        typeof window.StockFlowAuth.logout ===
                            "function"
                    ) {

                        await window.StockFlowAuth.logout();

                    }

                } catch (error) {

                    console.warn(
                        "Server logout failed. Clearing local session:",
                        error
                    );

                } finally {

                    clearLocalSession();


                    window.location.replace(
                        "./auth.html"
                    );

                }


                /*
                 * Restore button only if navigation
                 * somehow does not happen.
                 */

                setTimeout(
                    () => {

                        button.disabled =
                            false;

                        button.innerHTML =
                            originalHTML;

                    },
                    3000
                );

            }
        );

    };


    /* =====================================================
       CONNECTION BADGE
    ===================================================== */

    const setupConnection = () => {

        const badge =
            $("connectionBadge");


        if (!badge) {
            return;
        }


        if (
            !window.StockFlowAPI ||
            typeof window.StockFlowAPI.health !==
                "function"
        ) {

            return;

        }


        window.StockFlowAPI
            .health()
            .then(
                () => {

                    badge.classList.remove(
                        "offline"
                    );

                    const text =
                        badge.querySelector(
                            "span:last-child"
                        );

                    if (text) {

                        text.textContent =
                            "System Online";

                    }

                }
            )
            .catch(
                () => {

                    badge.classList.add(
                        "offline"
                    );

                    const text =
                        badge.querySelector(
                            "span:last-child"
                        );

                    if (text) {

                        text.textContent =
                            "System Offline";

                    }

                }
            );

    };


    /* =====================================================
       CATEGORY API
       -----------------------------------------------------
       IMPORTANT:
       Backend uses:
         listCategories
         saveCategory
         deleteCategory

       Do NOT use createCategory/updateCategory because
       the current Apps Script router uses saveCategory.
    ===================================================== */

    const loadCategoryData = async () => {

        showLoadingState();


        if (
            !window.StockFlowAPI
        ) {

            throw new Error(
                "StockFlow API is not available."
            );

        }


        /*
         * Load categories first.
         *
         * Products are loaded separately so that a product
         * loading failure does not leave the category table
         * permanently stuck.
         */

        const categoryResult =
            await window.StockFlowAPI
                .listCategories();


        categories =
            normalizeArray(
                categoryResult,
                [
                    "categories"
                ]
            );


        /*
         * Products are needed to determine:
         * - product count
         * - category usage
         * - last usage
         */

        try {

            const productResult =
                await window.StockFlowAPI
                    .listProducts();


            products =
                normalizeArray(
                    productResult,
                    [
                        "products"
                    ]
                );

        } catch (productError) {

            console.warn(
                "Unable to load products for category usage:",
                productError
            );

            products = [];

            showConnectionMessage(
                "Categories loaded, but product usage information could not be retrieved.",
                "warning"
            );

        }


        enrichCategories();

        updateStatistics();

        applyFilters();

        hideLoadingState();

    };


    /* =====================================================
       ENRICH CATEGORIES
       -----------------------------------------------------
       Product.updatedAt is used as the "last used" signal.

       Stock In / Stock Out update product.updatedAt in the
       current backend, so this gives us a practical usage
       date without adding another backend endpoint.
    ===================================================== */

    const enrichCategories = () => {

        categories =
            categories.map(
                (category) => {

                    const categoryId =
                        safeText(
                            category.id
                        );


                    const categoryName =
                        safeText(
                            category.name
                        )
                            .toLowerCase();


                    const relatedProducts =
                        products.filter(
                            (product) => {

                                const productCategoryId =
                                    safeText(
                                        product.categoryId
                                    );


                                const productCategoryName =
                                    safeText(
                                        product.category
                                    )
                                        .toLowerCase();


                                if (
                                    categoryId &&
                                    productCategoryId
                                ) {

                                    return (
                                        productCategoryId ===
                                        categoryId
                                    );

                                }


                                return (
                                    productCategoryName ===
                                    categoryName
                                );

                            }
                        );


                    let lastUsedAt =
                        null;


                    relatedProducts.forEach(
                        (product) => {

                            const candidate =
                                product.updatedAt ||
                                product.createdAt;


                            const candidateDate =
                                parseDate(
                                    candidate
                                );


                            if (
                                candidateDate &&
                                (
                                    !lastUsedAt ||
                                    candidateDate >
                                        lastUsedAt
                                )
                            ) {

                                lastUsedAt =
                                    candidateDate;

                            }

                        }
                    );


                    const productCount =
                        relatedProducts.length;


                    const usageDays =
                        lastUsedAt
                            ? daysSince(
                                lastUsedAt
                            )
                            : Infinity;


                    /*
                     * Category is active when:
                     * - it has at least one product
                     * - its latest related product was
                     *   updated within the last 30 days
                     */

                    const usageStatus =
                        (
                            productCount > 0 &&
                            usageDays <=
                                CATEGORY_ACTIVE_DAYS
                        )
                            ? "ACTIVE"
                            : "INACTIVE";


                    return {

                        ...category,

                        productCount,

                        lastUsedAt:
                            lastUsedAt
                                ? lastUsedAt
                                    .toISOString()
                                : "",

                        usageDays,

                        usageStatus

                    };

                }
            );

    };


    /* =====================================================
       STATISTICS
    ===================================================== */

    const updateStatistics = () => {

        const total =
            categories.length;


        const active =
            categories.filter(
                category =>
                    category.usageStatus ===
                    "ACTIVE"
            ).length;


        const categorizedProducts =
            categories.reduce(
                (
                    totalProducts,
                    category
                ) => {

                    return (
                        totalProducts +
                        Number(
                            category.productCount ||
                            0
                        )
                    );

                },
                0
            );


        const empty =
            categories.filter(
                category =>
                    Number(
                        category.productCount ||
                        0
                    ) === 0
            ).length;


        if (
            $("totalCategories")
        ) {

            $("totalCategories")
                .textContent =
                total;

        }


        if (
            $("activeCategories")
        ) {

            $("activeCategories")
                .textContent =
                active;

        }


        if (
            $("categorizedProducts")
        ) {

            $("categorizedProducts")
                .textContent =
                categorizedProducts;

        }


        if (
            $("emptyCategories")
        ) {

            $("emptyCategories")
                .textContent =
                empty;

        }

    };


    /* =====================================================
       SEARCH + FILTER
    ===================================================== */

    const applyFilters = () => {

        const search =
            safeText(
                $("categorySearch")?.value
            )
                .toLowerCase();


        const status =
            safeText(
                $("categoryStatusFilter")?.value
            )
                .toUpperCase();


        filteredCategories =
            categories.filter(
                (category) => {

                    const name =
                        safeText(
                            category.name
                        )
                            .toLowerCase();


                    const description =
                        safeText(
                            category.description
                        )
                            .toLowerCase();


                    const matchesSearch =
                        !search ||
                        name.includes(
                            search
                        ) ||
                        description.includes(
                            search
                        );


                    const matchesStatus =
                        status === "ALL" ||
                        !status ||
                        category.usageStatus ===
                            status;


                    return (
                        matchesSearch &&
                        matchesStatus
                    );

                }
            );


        /*
         * New search/filter starts from page 1.
         */

        currentPage = 1;

        renderCategories();

    };


    /* =====================================================
       RENDER CATEGORIES
    ===================================================== */

    const renderCategories = () => {

        const body =
            $("categoriesTableBody");

        const emptyState =
            $("categoriesEmpty");


        if (!body) {
            return;
        }


        body.innerHTML =
            "";


        const total =
            filteredCategories.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    PAGE_SIZE
                )
            );


        if (
            currentPage >
            totalPages
        ) {

            currentPage =
                totalPages;

        }


        const start =
            (
                currentPage -
                1
            ) *
            PAGE_SIZE;


        const pageItems =
            filteredCategories.slice(
                start,
                start +
                PAGE_SIZE
            );


        /*
         * Empty search/filter result.
         */

        if (
            total === 0
        ) {

            if (
                emptyState
            ) {

                emptyState.hidden =
                    false;

                const strong =
                    emptyState.querySelector(
                        "strong"
                    );

                const span =
                    emptyState.querySelector(
                        "span"
                    );


                if (
                    categories.length === 0
                ) {

                    if (strong) {

                        strong.textContent =
                            "No categories found";

                    }

                    if (span) {

                        span.textContent =
                            "Create your first category to organize your products.";

                    }

                } else {

                    if (strong) {

                        strong.textContent =
                            "No matching categories";

                    }

                    if (span) {

                        span.textContent =
                            "Try a different search term or status filter.";

                    }

                }

            }


            renderPagination(
                0
            );

            updateResultsInfo();

            return;

        }


        if (
            emptyState
        ) {

            emptyState.hidden =
                true;

        }


        pageItems.forEach(
            (category) => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const status =
                    category.usageStatus ||
                    "INACTIVE";


                const statusLabel =
                    status === "ACTIVE"
                        ? "Active"
                        : "Inactive";


                const productCount =
                    Number(
                        category.productCount ||
                        0
                    );


                const created =
                    formatDate(
                        category.createdAt
                    );


                const lastUsed =
                    category.lastUsedAt
                        ? formatDateTime(
                            category.lastUsedAt
                        )
                        : "Not used yet";


                const usageText =
                    productCount > 0
                        ? `${productCount} product${productCount === 1 ? "" : "s"}`
                        : "No products";


                row.innerHTML =
                    `
                    <td>

                        <div class="category-name">

                            <div class="category-icon">

                                <i
                                    class="fa-solid fa-layer-group"
                                ></i>

                            </div>

                            <div class="category-name-text">

                                <strong>
                                    ${escapeHTML(
                                        category.name ||
                                        "Unnamed Category"
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        usageText
                                    )}
                                </small>

                            </div>

                        </div>

                    </td>


                    <td>

                        ${
                            category.description
                                ? escapeHTML(
                                    category.description
                                )
                                : "—"
                        }

                    </td>


                    <td>

                        <span class="product-count">

                            ${productCount}

                        </span>

                    </td>


                    <td>

                        <span
                            class="status-badge ${
                                status === "ACTIVE"
                                    ? "status-active"
                                    : "status-inactive"
                            }"
                        >

                            <i
                                class="fa-solid ${
                                    status === "ACTIVE"
                                        ? "fa-circle-check"
                                        : "fa-circle-minus"
                                }"
                                style="margin-right:5px;"
                            ></i>

                            ${statusLabel}

                        </span>

                    </td>


                    <td>

                        <div class="category-date-cell">

                            <strong>
                                ${created}
                            </strong>

                            <small>
                                Last used: ${escapeHTML(
                                    lastUsed
                                )}
                            </small>

                        </div>

                    </td>


                    <td class="action-column">

                        <div class="row-actions">

                            <button
                                type="button"
                                class="row-action edit"
                                data-category-action="edit"
                                data-category-id="${escapeHTML(
                                    category.id
                                )}"
                                title="Edit category"
                                aria-label="Edit category"
                            >

                                <i
                                    class="fa-solid fa-pen"
                                ></i>

                            </button>


                            <button
                                type="button"
                                class="row-action delete"
                                data-category-action="delete"
                                data-category-id="${escapeHTML(
                                    category.id
                                )}"
                                title="Delete category"
                                aria-label="Delete category"
                            >

                                <i
                                    class="fa-solid fa-trash"
                                ></i>

                            </button>

                        </div>

                    </td>
                    `;


                body.appendChild(
                    row
                );

            }
        );


        renderPagination(
            totalPages
        );


        updateResultsInfo();

    };


    /* =====================================================
       RESULTS INFO
    ===================================================== */

    const updateResultsInfo = () => {

        const element =
            $("categoryResultsInfo");


        if (!element) {
            return;
        }


        const total =
            filteredCategories.length;


        const overall =
            categories.length;


        const active =
            categories.filter(
                category =>
                    category.usageStatus ===
                    "ACTIVE"
            ).length;


        const categorized =
            categories.reduce(
                (
                    sum,
                    category
                ) => {

                    return (
                        sum +
                        Number(
                            category.productCount ||
                            0
                        )
                    );

                },
                0
            );


        if (
            total === 0
        ) {

            element.textContent =
                overall === 0
                    ? "Showing 0 categories"
                    : "No matching categories";

            return;

        }


        element.textContent =
            `Showing ${total} of ${overall} categories • ${active} active • ${categorized} products categorized`;

    };


    /* =====================================================
       PAGINATION
    ===================================================== */

    const renderPagination = (
        totalPages
    ) => {

        const container =
            $("categoryPagination");


        if (!container) {
            return;
        }


        container.innerHTML =
            "";


        if (
            totalPages <= 1
        ) {
            return;
        }


        const previous =
            document.createElement(
                "button"
            );


        previous.type =
            "button";

        previous.innerHTML =
            `<i class="fa-solid fa-chevron-left"></i>`;

        previous.disabled =
            currentPage <= 1;


        previous.addEventListener(
            "click",
            () => {

                if (
                    currentPage > 1
                ) {

                    currentPage--;

                    renderCategories();

                }

            }
        );


        container.appendChild(
            previous
        );


        for (
            let page = 1;
            page <= totalPages;
            page++
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";

            button.textContent =
                page;


            if (
                page ===
                currentPage
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    currentPage =
                        page;

                    renderCategories();

                }
            );


            container.appendChild(
                button
            );

        }


        const next =
            document.createElement(
                "button"
            );


        next.type =
            "button";

        next.innerHTML =
            `<i class="fa-solid fa-chevron-right"></i>`;

        next.disabled =
            currentPage >=
            totalPages;


        next.addEventListener(
            "click",
            () => {

                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderCategories();

                }

            }
        );


        container.appendChild(
            next
        );

    };


    /* =====================================================
       LOADING STATE
    ===================================================== */

    const showLoadingState = () => {

        const loading =
            $("categoriesLoading");

        const empty =
            $("categoriesEmpty");

        const error =
            $("categoriesError");

        const body =
            $("categoriesTableBody");


        if (
            loading
        ) {

            loading.hidden =
                false;

        }


        if (
            empty
        ) {

            empty.hidden =
                true;

        }


        if (
            error
        ) {

            error.hidden =
                true;

        }


        if (
            body
        ) {

            body.innerHTML =
                "";

        }

    };


    const hideLoadingState = () => {

        const loading =
            $("categoriesLoading");


        if (
            loading
        ) {

            loading.hidden =
                true;

        }

    };


    /* =====================================================
       ERROR STATE
    ===================================================== */

    const showErrorState = (
        message
    ) => {

        hideLoadingState();


        const error =
            $("categoriesError");


        const messageElement =
            $("categoriesErrorMessage");


        if (
            error
        ) {

            error.hidden =
                false;

        }


        if (
            messageElement
        ) {

            messageElement.textContent =
                message ||
                "Unable to load categories.";

        }


        const body =
            $("categoriesTableBody");


        if (
            body
        ) {

            body.innerHTML =
                "";

        }


        updateResultsInfo();

    };


    /* =====================================================
       CONNECTION MESSAGE
    ===================================================== */

    const showConnectionMessage = (
        message,
        type = "warning"
    ) => {

        const element =
            $("connectionMessage");


        if (!element) {
            return;
        }


        element.hidden =
            false;


        element.textContent =
            message;


        element.className =
            `connection-message ${type}`;

    };


    /* =====================================================
       HIDE CONNECTION MESSAGE
    ===================================================== */

    const hideConnectionMessage = () => {

        const element =
            $("connectionMessage");


        if (
            element
        ) {

            element.hidden =
                true;

        }

    };


    /* =====================================================
       LOAD / REFRESH
    ===================================================== */

    const loadCategories = async () => {

        hideConnectionMessage();


        try {

            await loadCategoryData();

        } catch (error) {

            console.error(
                "StockFlow categories load error:",
                error
            );


            const message =
                error?.message ||
                "Unable to load categories. Please check your connection and try again.";


            showErrorState(
                message
            );


            showConnectionMessage(
                message,
                "error"
            );

        }

    };


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    const openAddModal = () => {

        const modal =
            $("categoryModal");


        const form =
            $("categoryForm");


        if (!modal) {
            return;
        }


        if (
            form
        ) {

            form.reset();

        }


        if (
            $("categoryId")
        ) {

            $("categoryId")
                .value =
                "";

        }


        if (
            $("categoryModalTitle")
        ) {

            $("categoryModalTitle")
                .textContent =
                "Add Category";

        }


        if (
            $("saveCategoryText")
        ) {

            $("saveCategoryText")
                .textContent =
                "Save Category";

        }


        if (
            $("categoryStatus")
        ) {

            $("categoryStatus")
                .value =
                "ACTIVE";

        }


        clearFormMessage();


        modal.hidden =
            false;


        setTimeout(
            () => {

                $("categoryName")?.focus();

            },
            50
        );

    };


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    const openEditModal = (
        categoryId
    ) => {

        const category =
            categories.find(
                item =>
                    safeText(
                        item.id
                    ) ===
                    safeText(
                        categoryId
                    )
            );


        if (!category) {

            showToast(
                "Category could not be found.",
                "error"
            );

            return;

        }


        const modal =
            $("categoryModal");


        if (!modal) {
            return;
        }


        if (
            $("categoryId")
        ) {

            $("categoryId")
                .value =
                category.id || "";

        }


        if (
            $("categoryName")
        ) {

            $("categoryName")
                .value =
                category.name || "";

        }


        if (
            $("categoryDescription")
        ) {

            $("categoryDescription")
                .value =
                category.description || "";

        }


        if (
            $("categoryStatus")
        ) {

            $("categoryStatus")
                .value =
                safeText(
                    category.status
                ).toUpperCase() ===
                "INACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE";

        }


        if (
            $("categoryModalTitle")
        ) {

            $("categoryModalTitle")
                .textContent =
                "Edit Category";

        }


        if (
            $("saveCategoryText")
        ) {

            $("saveCategoryText")
                .textContent =
                "Update Category";

        }


        clearFormMessage();


        modal.hidden =
            false;


        setTimeout(
            () => {

                $("categoryName")?.focus();

            },
            50
        );

    };


    /* =====================================================
       CLOSE CATEGORY MODAL
    ===================================================== */

    const closeCategoryModal = () => {

        const modal =
            $("categoryModal");


        if (
            modal
        ) {

            modal.hidden =
                true;

        }


        clearFormMessage();

    };


    /* =====================================================
       FORM MESSAGE
    ===================================================== */

    const clearFormMessage = () => {

        const element =
            $("categoryFormMessage");


        if (!element) {
            return;
        }


        element.hidden =
            true;

        element.textContent =
            "";

        element.className =
            "form-message";

    };


    const showFormMessage = (
        message,
        type = "error"
    ) => {

        const element =
            $("categoryFormMessage");


        if (!element) {
            return;
        }


        element.hidden =
            false;

        element.textContent =
            message;

        element.className =
            `form-message ${type}`;

    };


    /* =====================================================
       SAVE CATEGORY
       -----------------------------------------------------
       Backend action:
          saveCategory
    ===================================================== */

    const saveCategory = async (
        event
    ) => {

        event.preventDefault();


        const button =
            $("saveCategoryBtn");

        const spinner =
            $("saveCategorySpinner");

        const icon =
            $("saveCategoryIcon");

        const text =
            $("saveCategoryText");


        const id =
            safeText(
                $("categoryId")?.value
            );


        const name =
            safeText(
                $("categoryName")?.value
            );


        const description =
            safeText(
                $("categoryDescription")?.value
            );


        const status =
            safeText(
                $("categoryStatus")?.value
            )
                .toUpperCase() ||
            "ACTIVE";


        if (!name) {

            showFormMessage(
                "Category name is required.",
                "error"
            );

            $("categoryName")?.focus();

            return;

        }


        if (
            name.length >
            100
        ) {

            showFormMessage(
                "Category name cannot exceed 100 characters.",
                "error"
            );

            return;

        }


        /*
         * Client-side duplicate check.
         */

        const duplicate =
            categories.some(
                (category) => {

                    return (
                        safeText(
                            category.name
                        )
                            .toLowerCase() ===
                        name.toLowerCase() &&
                        safeText(
                            category.id
                        ) !== id
                    );

                }
            );


        if (
            duplicate
        ) {

            showFormMessage(
                "A category with this name already exists.",
                "error"
            );

            return;

        }


        if (
            button
        ) {

            button.disabled =
                true;

        }


        if (
            spinner
        ) {

            spinner.hidden =
                false;

        }


        if (
            icon
        ) {

            icon.hidden =
                true;

        }


        if (
            text
        ) {

            text.textContent =
                id
                    ? "Updating..."
                    : "Saving...";

        }


        clearFormMessage();


        try {

            if (
                !window.StockFlowAPI ||
                typeof window.StockFlowAPI.request !==
                    "function"
            ) {

                throw new Error(
                    "StockFlow API is not available."
                );

            }


            /*
             * IMPORTANT:
             * The current Apps Script backend uses
             * saveCategory for BOTH create and update.
             */

            await window.StockFlowAPI.request(
                "saveCategory",
                {

                    id,

                    name,

                    description,

                    status

                }
            );


            showToast(
                id
                    ? "Category updated successfully."
                    : "Category created successfully.",
                "success"
            );


            closeCategoryModal();


            await loadCategories();

        } catch (error) {

            console.error(
                "Save category error:",
                error
            );


            showFormMessage(
                error?.message ||
                "Unable to save category.",
                "error"
            );

        } finally {

            if (
                button
            ) {

                button.disabled =
                    false;

            }


            if (
                spinner
            ) {

                spinner.hidden =
                    true;

            }


            if (
                icon
            ) {

                icon.hidden =
                    false;

            }


            if (
                text
            ) {

                text.textContent =
                    id
                        ? "Update Category"
                        : "Save Category";

            }

        }

    };


    /* =====================================================
       DELETE MODAL
    ===================================================== */

    const openDeleteModal = (
        categoryId
    ) => {

        const category =
            categories.find(
                item =>
                    safeText(
                        item.id
                    ) ===
                    safeText(
                        categoryId
                    )
            );


        if (!category) {

            showToast(
                "Category could not be found.",
                "error"
            );

            return;

        }


        categoryToDelete =
            category;


        if (
            $("deleteCategoryName")
        ) {

            $("deleteCategoryName")
                .textContent =
                category.name ||
                "this category";

        }


        clearDeleteMessage();


        if (
            $("deleteCategoryModal")
        ) {

            $("deleteCategoryModal")
                .hidden =
                false;

        }

    };


    /* =====================================================
       CLOSE DELETE MODAL
    ===================================================== */

    const closeDeleteModal = () => {

        if (
            $("deleteCategoryModal")
        ) {

            $("deleteCategoryModal")
                .hidden =
                true;

        }


        categoryToDelete =
            null;


        clearDeleteMessage();

    };


    /* =====================================================
       DELETE MESSAGE
    ===================================================== */

    const clearDeleteMessage = () => {

        const element =
            $("deleteCategoryMessage");


        if (!element) {
            return;
        }


        element.hidden =
            true;

        element.textContent =
            "";

        element.className =
            "form-message";

    };


    const showDeleteMessage = (
        message,
        type = "error"
    ) => {

        const element =
            $("deleteCategoryMessage");


        if (!element) {
            return;
        }


        element.hidden =
            false;

        element.textContent =
            message;

        element.className =
            `form-message ${type}`;

    };


    /* =====================================================
       DELETE CATEGORY
       -----------------------------------------------------
       Backend prevents deletion when category is in use.
    ===================================================== */

    const deleteCategory = async () => {

        if (
            !categoryToDelete
        ) {
            return;
        }


        const button =
            $("confirmDeleteCategoryBtn");

        const spinner =
            $("deleteCategorySpinner");


        if (
            button
        ) {

            button.disabled =
                true;

        }


        if (
            spinner
        ) {

            spinner.hidden =
                false;

        }


        clearDeleteMessage();


        try {

            if (
                !window.StockFlowAPI ||
                typeof window.StockFlowAPI.request !==
                    "function"
            ) {

                throw new Error(
                    "StockFlow API is not available."
                );

            }


            await window.StockFlowAPI.request(
                "deleteCategory",
                {

                    id:
                        categoryToDelete.id

                }
            );


            showToast(
                "Category deleted successfully.",
                "success"
            );


            closeDeleteModal();


            await loadCategories();

        } catch (error) {

            console.error(
                "Delete category error:",
                error
            );


            showDeleteMessage(
                error?.message ||
                "Unable to delete category.",
                "error"
            );

        } finally {

            if (
                button
            ) {

                button.disabled =
                    false;

            }


            if (
                spinner
            ) {

                spinner.hidden =
                    true;

            }

        }

    };


    /* =====================================================
       TOAST
    ===================================================== */

    const showToast = (
        message,
        type = "success"
    ) => {

        const container =
            $("toastContainer");


        if (!container) {
            return;
        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `toast ${type}`;


        const icon =
            type === "success"
                ? "fa-circle-check"
                : "fa-circle-exclamation";


        toast.innerHTML =
            `
            <i
                class="fa-solid ${icon}"
            ></i>

            <span>
                ${escapeHTML(
                    message
                )}
            </span>
            `;


        container.appendChild(
            toast
        );


        setTimeout(
            () => {

                toast.style.opacity =
                    "0";

                toast.style.transform =
                    "translateY(8px)";


                setTimeout(
                    () => {

                        toast.remove();

                    },
                    200
                );

            },
            3500
        );

    };


    /* =====================================================
       EVENT DELEGATION FOR TABLE ACTIONS
    ===================================================== */

    const setupTableActions = () => {

        const tableBody =
            $("categoriesTableBody");


        if (!tableBody) {
            return;
        }


        tableBody.addEventListener(
            "click",
            (event) => {

                const button =
                    event.target.closest(
                        "[data-category-action]"
                    );


                if (!button) {
                    return;
                }


                const action =
                    button.dataset.categoryAction;


                const categoryId =
                    button.dataset.categoryId;


                if (
                    action ===
                    "edit"
                ) {

                    openEditModal(
                        categoryId
                    );

                }


                if (
                    action ===
                    "delete"
                ) {

                    openDeleteModal(
                        categoryId
                    );

                }

            }
        );

    };


    /* =====================================================
       MODAL EVENTS
    ===================================================== */

    const setupModals = () => {

        $("addCategoryBtn")
            ?.addEventListener(
                "click",
                openAddModal
            );


        $("emptyAddCategoryBtn")
            ?.addEventListener(
                "click",
                openAddModal
            );


        $("closeCategoryModal")
            ?.addEventListener(
                "click",
                closeCategoryModal
            );


        $("cancelCategoryBtn")
            ?.addEventListener(
                "click",
                closeCategoryModal
            );


        $("categoryForm")
            ?.addEventListener(
                "submit",
                saveCategory
            );


        $("cancelDeleteCategoryBtn")
            ?.addEventListener(
                "click",
                closeDeleteModal
            );


        $("confirmDeleteCategoryBtn")
            ?.addEventListener(
                "click",
                deleteCategory
            );


        /*
         * Clicking outside modal closes it.
         */

        $("categoryModal")
            ?.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        $("categoryModal")
                    ) {

                        closeCategoryModal();

                    }

                }
            );


        $("deleteCategoryModal")
            ?.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        $("deleteCategoryModal")
                    ) {

                        closeDeleteModal();

                    }

                }
            );


        /*
         * Escape key.
         */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }


                if (
                    $("categoryModal") &&
                    !$("categoryModal").hidden
                ) {

                    closeCategoryModal();

                }


                if (
                    $("deleteCategoryModal") &&
                    !$("deleteCategoryModal").hidden
                ) {

                    closeDeleteModal();

                }

            }
        );

    };


    /* =====================================================
       SEARCH
    ===================================================== */

    const setupSearch = () => {

        $("categorySearch")
            ?.addEventListener(
                "input",
                applyFilters
            );


        $("categoryStatusFilter")
            ?.addEventListener(
                "change",
                applyFilters
            );

    };


    /* =====================================================
       REFRESH
    ===================================================== */

    const setupRefresh = () => {

        $("refreshCategoriesBtn")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("refreshCategoriesBtn");


                    if (
                        button
                    ) {

                        button.disabled =
                            true;

                    }


                    try {

                        await loadCategories();

                    } finally {

                        if (
                            button
                        ) {

                            button.disabled =
                                false;

                        }

                    }

                }
            );


        $("retryCategoriesBtn")
            ?.addEventListener(
                "click",
                loadCategories
            );

    };


    /* =====================================================
       KEYBOARD SHORTCUT
       -----------------------------------------------------
       Ctrl + K focuses category search.
    ===================================================== */

    const setupKeyboardShortcut = () => {

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    (
                        event.ctrlKey ||
                        event.metaKey
                    ) &&
                    event.key.toLowerCase() ===
                        "k"
                ) {

                    event.preventDefault();

                    $("categorySearch")
                        ?.focus();

                }

            }
        );

    };


    /* =====================================================
       INITIALIZE
    ===================================================== */

    const initialize = async () => {

        setupSidebar();

        setupNotifications();

        setupUserDisplay();

        setupUserAccount();

        setupLogout();

        setupConnection();

        setupTableActions();

        setupModals();

        setupSearch();

        setupRefresh();

        setupKeyboardShortcut();


        await loadCategories();

    };


    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initialize()
                .catch(
                    (error) => {

                        console.error(
                            "StockFlow categories initialization error:",
                            error
                        );

                    }
                );

        }
    );


})();
