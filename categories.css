/* =========================================================
   STOCKFLOW — CATEGORIES
   Professional module styling
   Dashboard-compatible visual system
========================================================= */

/* =========================================================
   ROOT
========================================================= */

:root {
    --sf-blue: #2563eb;
    --sf-blue-dark: #1d4ed8;
    --sf-blue-light: #3b82f6;
    --sf-blue-soft: #eff6ff;

    --sf-navy: #0d1b30;
    --sf-navy-2: #10213b;
    --sf-sidebar-hover: #162d4b;

    --sf-bg: #f4f7fb;
    --sf-white: #ffffff;

    --sf-text: #14213d;
    --sf-text-dark: #0f172a;
    --sf-muted: #64748b;
    --sf-light: #94a3b8;

    --sf-border: #e2e8f0;
    --sf-border-light: #edf1f6;

    --sf-success: #16a34a;
    --sf-success-soft: #ecfdf3;

    --sf-warning: #d97706;
    --sf-warning-soft: #fff7ed;

    --sf-danger: #dc2626;
    --sf-danger-dark: #b91c1c;
    --sf-danger-soft: #fef2f2;

    --sf-radius-sm: 8px;
    --sf-radius: 12px;
    --sf-radius-lg: 16px;

    --sf-sidebar-width: 250px;

    --sf-shadow-sm:
        0 2px 8px rgba(15, 23, 42, 0.04);

    --sf-shadow:
        0 8px 25px rgba(15, 23, 42, 0.06);

    --sf-shadow-lg:
        0 20px 55px rgba(15, 23, 42, 0.12);

    --sf-transition: 0.18s ease;
}


/* =========================================================
   RESET
========================================================= */

*,
*::before,
*::after {
    box-sizing: border-box;
}

html {
    margin: 0;
    padding: 0;
    min-height: 100%;
    scroll-behavior: smooth;
}

body {
    margin: 0;
    min-height: 100vh;

    background: var(--sf-bg);
    color: var(--sf-text);

    font-family:
        "Inter",
        "Manrope",
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;

    font-size: 14px;
    line-height: 1.5;

    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}

button,
input,
select,
textarea {
    font: inherit;
}

button {
    border: 0;
}

a {
    color: inherit;
}


/* =========================================================
   ACCESSIBILITY
========================================================= */

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}


/* =========================================================
   SIDEBAR
========================================================= */

.sidebar {
    position: fixed;

    top: 0;
    left: 0;
    bottom: 0;

    width: var(--sf-sidebar-width);

    display: flex;
    flex-direction: column;

    background:
        linear-gradient(
            180deg,
            #0d1b30 0%,
            #0a182b 100%
        );

    color: #ffffff;

    z-index: 1100;

    border-right:
        1px solid rgba(255, 255, 255, 0.05);

    overflow-y: auto;
    overflow-x: hidden;

    scrollbar-width: thin;
    scrollbar-color:
        rgba(255,255,255,0.14)
        transparent;

    transition:
        transform var(--sf-transition);
}

.sidebar::-webkit-scrollbar {
    width: 5px;
}

.sidebar::-webkit-scrollbar-track {
    background: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.14);
    border-radius: 20px;
}


/* =========================================================
   SIDEBAR BRAND
========================================================= */

.sidebar-brand {
    min-height: 82px;

    display: flex;
    align-items: center;

    gap: 12px;

    padding:
        19px 18px;

    border-bottom:
        1px solid rgba(255,255,255,0.06);
}

.brand-logo {
    width: 42px;
    height: 42px;

    flex: 0 0 42px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 12px;

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
        );

    color: #ffffff;

    font-size: 13px;
    font-weight: 800;

    letter-spacing: 0.3px;

    box-shadow:
        0 8px 18px rgba(37,99,235,0.25);
}

.brand-text {
    min-width: 0;

    display: flex;
    flex-direction: column;

    line-height: 1.15;
}

.brand-text strong {
    color: #ffffff;

    font-size: 16px;
    font-weight: 800;

    letter-spacing: -0.2px;
}

.brand-text span {
    margin-top: 4px;

    color:
        rgba(255,255,255,0.50);

    font-size: 10px;
    font-weight: 500;

    letter-spacing: 0.04em;
}


/* =========================================================
   SIDEBAR NAVIGATION
========================================================= */

.sidebar-nav {
    flex: 1;

    padding:
        20px 12px 16px;
}

.nav-section-title {
    margin:
        14px 10px 7px;

    color:
        rgba(255,255,255,0.37);

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.nav-section-title:first-child {
    margin-top: 0;
}

.nav-item {
    position: relative;

    min-height: 42px;

    display: flex;
    align-items: center;

    gap: 11px;

    margin: 2px 0;

    padding:
        0 12px;

    border-radius: 9px;

    color:
        rgba(226,232,240,0.70);

    text-decoration: none;

    font-size: 12px;
    font-weight: 600;

    transition:
        background-color var(--sf-transition),
        color var(--sf-transition),
        transform var(--sf-transition);
}

.nav-item i {
    width: 19px;

    flex: 0 0 19px;

    text-align: center;

    color:
        rgba(203,213,225,0.60);

    font-size: 13px;

    transition:
        color var(--sf-transition);
}

.nav-item span {
    white-space: nowrap;
}

.nav-item:hover {
    background:
        rgba(255,255,255,0.065);

    color: #ffffff;

    transform:
        translateX(1px);
}

.nav-item:hover i {
    color: #ffffff;
}

.nav-item.active {
    background:
        linear-gradient(
            90deg,
            rgba(37,99,235,0.28),
            rgba(37,99,235,0.13)
        );

    color: #ffffff;
}

.nav-item.active::before {
    content: "";

    position: absolute;

    left: 0;
    top: 8px;
    bottom: 8px;

    width: 3px;

    border-radius:
        0 4px 4px 0;

    background:
        #3b82f6;
}

.nav-item.active i {
    color: #60a5fa;
}


/* =========================================================
   SIDEBAR FOOTER
========================================================= */

.sidebar-footer {
    padding: 14px;

    border-top:
        1px solid rgba(255,255,255,0.06);
}

.sidebar-user {
    display: flex;
    align-items: center;

    gap: 10px;

    padding:
        9px 7px 12px;
}

.sidebar-user-avatar {
    width: 34px;
    height: 34px;

    flex: 0 0 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #60a5fa
        );

    color: #ffffff;

    font-size: 10px;
    font-weight: 800;
}

.sidebar-user-info {
    min-width: 0;

    display: flex;
    flex-direction: column;
}

.sidebar-user-info strong {
    overflow: hidden;

    color: #ffffff;

    font-size: 11px;
    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
}

.sidebar-user-info span {
    margin-top: 2px;

    color:
        rgba(255,255,255,0.45);

    font-size: 9px;
}

.sidebar-logout {
    width: 100%;
    min-height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    border-radius: 8px;

    background:
        rgba(255,255,255,0.055);

    color:
        rgba(255,255,255,0.70);

    cursor: pointer;

    font-size: 11px;
    font-weight: 600;

    transition:
        background-color var(--sf-transition),
        color var(--sf-transition);
}

.sidebar-logout:hover {
    background:
        rgba(220,38,38,0.14);

    color:
        #fca5a5;
}


/* =========================================================
   MOBILE OVERLAY
========================================================= */

.sidebar-overlay {
    position: fixed;

    inset: 0;

    z-index: 1050;

    background:
        rgba(2,8,23,0.48);

    opacity: 0;
    visibility: hidden;
    pointer-events: none;

    transition:
        opacity var(--sf-transition),
        visibility var(--sf-transition);
}

.sidebar-overlay.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}


/* =========================================================
   MAIN CONTENT
========================================================= */

.main-content {
    min-height: 100vh;

    margin-left:
        var(--sf-sidebar-width);

    background:
        var(--sf-bg);
}


/* =========================================================
   TOPBAR
========================================================= */

.topbar {
    position: sticky;

    top: 0;

    z-index: 800;

    min-height: 82px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 24px;

    padding:
        14px 30px;

    background:
        rgba(255,255,255,0.96);

    border-bottom:
        1px solid var(--sf-border);

    backdrop-filter:
        blur(12px);

    -webkit-backdrop-filter:
        blur(12px);
}

.topbar-left {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 14px;
}

.page-heading {
    min-width: 0;
}

.page-kicker {
    display: block;

    margin-bottom: 4px;

    color:
        #6f8fb8;

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.14em;
}

.page-heading h1 {
    margin: 0;

    color:
        var(--sf-text-dark);

    font-size: 27px;
    font-weight: 800;

    line-height: 1.15;

    letter-spacing:
        -0.8px;
}

.page-heading p {
    margin:
        5px 0 0;

    color:
        var(--sf-muted);

    font-size: 11px;
}

.topbar-right {
    display: flex;
    align-items: center;

    gap: 14px;

    flex-shrink: 0;
}


/* =========================================================
   MOBILE MENU
========================================================= */

.mobile-menu-btn {
    width: 38px;
    height: 38px;

    display: none;
    align-items: center;
    justify-content: center;

    border:
        1px solid var(--sf-border);

    border-radius: 9px;

    background:
        #ffffff;

    color:
        var(--sf-text);

    cursor: pointer;

    transition:
        background-color var(--sf-transition),
        color var(--sf-transition);
}

.mobile-menu-btn:hover {
    background:
        var(--sf-blue-soft);

    color:
        var(--sf-blue);
}


/* =========================================================
   CONNECTION BADGE
========================================================= */

.connection-badge {
    min-height: 32px;

    display: inline-flex;
    align-items: center;

    gap: 7px;

    padding:
        0 11px;

    border:
        1px solid #bbf7d0;

    border-radius: 999px;

    background:
        #f0fdf4;

    color:
        #15803d;

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.05em;
}

.connection-dot {
    width: 7px;
    height: 7px;

    border-radius: 50%;

    background:
        #22c55e;

    box-shadow:
        0 0 0 3px rgba(34,197,94,0.12);
}

.connection-badge.offline {
    background:
        #fef2f2;

    border-color:
        #fecaca;

    color:
        #b91c1c;
}

.connection-badge.offline .connection-dot {
    background:
        #ef4444;

    box-shadow:
        0 0 0 3px rgba(239,68,68,0.12);
}


/* =========================================================
   TOP USER
========================================================= */

.topbar-user {
    display: flex;
    align-items: center;

    gap: 9px;
}

.topbar-avatar {
    width: 36px;
    height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
        );

    color: #ffffff;

    font-size: 10px;
    font-weight: 800;

    box-shadow:
        0 5px 14px rgba(37,99,235,0.20);
}

.topbar-user-info {
    display: flex;
    flex-direction: column;

    line-height: 1.15;
}

.topbar-user-info strong {
    color:
        var(--sf-text-dark);

    font-size: 11px;
    font-weight: 700;
}

.topbar-user-info span {
    margin-top: 3px;

    color:
        var(--sf-muted);

    font-size: 9px;
}


/* =========================================================
   PAGE CONTENT
========================================================= */

.page-content {
    padding:
        27px 30px 35px;
}


/* =========================================================
   CONNECTION MESSAGE
========================================================= */

.connection-message {
    margin-bottom: 20px;

    padding:
        13px 16px;

    border:
        1px solid #fecaca;

    border-radius: 10px;

    background:
        #fef2f2;

    color:
        #b91c1c;

    font-size: 12px;
    font-weight: 600;
}

.connection-message.success {
    border-color:
        #bbf7d0;

    background:
        #f0fdf4;

    color:
        #15803d;
}


/* =========================================================
   STATISTICS GRID
========================================================= */

.stats-grid {
    display: grid;

    grid-template-columns:
        repeat(4, minmax(0, 1fr));

    gap: 18px;

    margin-bottom: 22px;
}

.stat-card {
    min-height: 126px;

    display: flex;
    align-items: center;

    gap: 15px;

    padding:
        20px;

    background:
        var(--sf-white);

    border:
        1px solid var(--sf-border);

    border-radius:
        var(--sf-radius-lg);

    box-shadow:
        var(--sf-shadow-sm);

    transition:
        transform var(--sf-transition),
        box-shadow var(--sf-transition),
        border-color var(--sf-transition);
}

.stat-card:hover {
    transform:
        translateY(-2px);

    box-shadow:
        var(--sf-shadow);

    border-color:
        #d6deea;
}

.stat-icon {
    width: 48px;
    height: 48px;

    flex: 0 0 48px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    background:
        var(--sf-blue-soft);

    color:
        var(--sf-blue);

    font-size: 17px;
}

.stat-card:nth-child(2) .stat-icon {
    background:
        #ecfdf3;

    color:
        #16a34a;
}

.stat-card:nth-child(3) .stat-icon {
    background:
        #eff6ff;

    color:
        #0284c7;
}

.stat-card:nth-child(4) .stat-icon {
    background:
        #fff7ed;

    color:
        #d97706;
}

.stat-content {
    min-width: 0;

    display: flex;
    flex-direction: column;
}

.stat-content span {
    color:
        #7b8da7;

    font-size: 9px;
    font-weight: 700;

    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.stat-content strong {
    margin-top: 7px;

    color:
        var(--sf-text-dark);

    font-size: 26px;
    font-weight: 800;

    line-height: 1;
}


/* =========================================================
   CONTENT CARD
========================================================= */

.content-card {
    overflow: hidden;

    background:
        #ffffff;

    border:
        1px solid var(--sf-border);

    border-radius:
        var(--sf-radius-lg);

    box-shadow:
        var(--sf-shadow-sm);
}

.content-card-header {
    min-height: 105px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    padding:
        23px 26px;

    border-bottom:
        1px solid var(--sf-border-light);
}

.section-kicker {
    display: block;

    margin-bottom: 5px;

    color:
        var(--sf-blue);

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.content-card-header h2 {
    margin: 0;

    color:
        var(--sf-text-dark);

    font-size: 20px;
    font-weight: 800;

    letter-spacing: -0.4px;
}

.content-card-header p {
    margin:
        4px 0 0;

    color:
        var(--sf-muted);

    font-size: 11px;
}


/* =========================================================
   BUTTONS
========================================================= */

.primary-btn,
.secondary-btn,
.danger-btn {
    min-height: 40px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    padding:
        0 15px;

    border-radius:
        9px;

    cursor: pointer;

    font-size: 11px;
    font-weight: 700;

    transition:
        transform var(--sf-transition),
        background-color var(--sf-transition),
        border-color var(--sf-transition),
        box-shadow var(--sf-transition);
}

.primary-btn {
    border:
        1px solid var(--sf-blue);

    background:
        linear-gradient(
            135deg,
            #2563eb,
            #1d4ed8
        );

    color:
        #ffffff;

    box-shadow:
        0 6px 15px rgba(37,99,235,0.18);
}

.primary-btn:hover {
    transform:
        translateY(-1px);

    box-shadow:
        0 9px 20px rgba(37,99,235,0.24);
}

.primary-btn:active {
    transform:
        translateY(0);
}

.secondary-btn {
    border:
        1px solid var(--sf-border);

    background:
        #ffffff;

    color:
        var(--sf-text);
}

.secondary-btn:hover {
    background:
        #f8fafc;

    border-color:
        #cbd5e1;
}

.danger-btn {
    border:
        1px solid var(--sf-danger);

    background:
        var(--sf-danger);

    color:
        #ffffff;
}

.danger-btn:hover {
    background:
        var(--sf-danger-dark);
}

.primary-btn:disabled,
.secondary-btn:disabled,
.danger-btn:disabled {
    opacity: 0.60;

    cursor:
        not-allowed;

    transform:
        none;
}


/* =========================================================
   TABLE TOOLBAR
========================================================= */

.table-toolbar {
    display: flex;
    align-items: center;

    gap: 10px;

    padding:
        16px 22px;

    border-bottom:
        1px solid var(--sf-border-light);

    background:
        #fcfdff;
}

.search-box {
    position: relative;

    flex: 1;

    max-width: 420px;
}

.search-box i {
    position: absolute;

    left: 13px;
    top: 50%;

    transform:
        translateY(-50%);

    color:
        #94a3b8;

    font-size: 12px;

    pointer-events: none;
}

.search-box input {
    width: 100%;
    height: 40px;

    padding:
        0 13px 0 36px;

    border:
        1px solid var(--sf-border);

    border-radius: 9px;

    outline: none;

    background:
        #ffffff;

    color:
        var(--sf-text);

    font-size: 11px;

    transition:
        border-color var(--sf-transition),
        box-shadow var(--sf-transition);
}

.search-box input::placeholder {
    color:
        #9aa8ba;
}

.search-box input:focus {
    border-color:
        #93c5fd;

    box-shadow:
        0 0 0 3px rgba(37,99,235,0.08);
}

.filter-group select {
    height: 40px;

    min-width: 145px;

    padding:
        0 34px 0 12px;

    border:
        1px solid var(--sf-border);

    border-radius: 9px;

    outline: none;

    background:
        #ffffff;

    color:
        var(--sf-text);

    font-size: 11px;

    cursor: pointer;
}

.filter-group select:focus {
    border-color:
        #93c5fd;

    box-shadow:
        0 0 0 3px rgba(37,99,235,0.08);
}


/* =========================================================
   TABLE
========================================================= */

.table-wrapper {
    position: relative;

    min-height: 300px;

    overflow-x: auto;
}

.data-table {
    width: 100%;

    border-collapse:
        collapse;

    min-width:
        850px;
}

.data-table thead {
    background:
        #f7f9fc;
}

.data-table th {
    height: 48px;

    padding:
        0 18px;

    border-bottom:
        1px solid var(--sf-border);

    color:
        #6f829e;

    text-align: left;

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.09em;
    text-transform: uppercase;

    white-space: nowrap;
}

.data-table td {
    padding:
        15px 18px;

    border-bottom:
        1px solid var(--sf-border-light);

    color:
        #52657f;

    font-size: 11px;

    vertical-align: middle;
}

.data-table tbody tr {
    transition:
        background-color var(--sf-transition);
}

.data-table tbody tr:hover {
    background:
        #fafcff;
}

.data-table td:first-child {
    color:
        var(--sf-text-dark);

    font-weight: 700;
}

.action-column {
    width: 155px;
    text-align: right !important;
}

.data-table td:last-child {
    text-align: right;
}

.category-name {
    display: flex;
    align-items: center;

    gap: 10px;
}

.category-icon {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex: 0 0 34px;

    border-radius: 9px;

    background:
        var(--sf-blue-soft);

    color:
        var(--sf-blue);

    font-size: 12px;
}

.category-name-text {
    display: flex;
    flex-direction: column;
}

.category-name-text strong {
    color:
        var(--sf-text-dark);

    font-size: 11px;
    font-weight: 700;
}

.category-name-text small {
    margin-top: 2px;

    color:
        #94a3b8;

    font-size: 9px;
}

.product-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    min-width: 34px;
    height: 26px;

    padding:
        0 9px;

    border-radius: 7px;

    background:
        #f1f5f9;

    color:
        var(--sf-text);

    font-size: 10px;
    font-weight: 700;
}


/* =========================================================
   STATUS BADGE
========================================================= */

.status-badge {
    display: inline-flex;
    align-items: center;

    gap: 6px;

    min-height: 25px;

    padding:
        0 9px;

    border-radius: 999px;

    font-size: 9px;
    font-weight: 800;

    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.status-badge::before {
    content: "";

    width: 6px;
    height: 6px;

    border-radius: 50%;
}

.status-active {
    background:
        var(--sf-success-soft);

    color:
        #15803d;
}

.status-active::before {
    background:
        #22c55e;
}

.status-inactive {
    background:
        #f1f5f9;

    color:
        #64748b;
}

.status-inactive::before {
    background:
        #94a3b8;
}


/* =========================================================
   ACTION BUTTONS
========================================================= */

.row-actions {
    display: inline-flex;
    align-items: center;

    gap: 6px;
}

.row-action {
    width: 32px;
    height: 32px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    border:
        1px solid var(--sf-border);

    border-radius: 8px;

    background:
        #ffffff;

    color:
        #64748b;

    cursor: pointer;

    transition:
        background-color var(--sf-transition),
        border-color var(--sf-transition),
        color var(--sf-transition);
}

.row-action.edit:hover {
    border-color:
        #bfdbfe;

    background:
        #eff6ff;

    color:
        #2563eb;
}

.row-action.delete:hover {
    border-color:
        #fecaca;

    background:
        #fef2f2;

    color:
        #dc2626;
}


/* =========================================================
   TABLE STATES
========================================================= */

.table-state {
    min-height: 300px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 7px;

    padding:
        35px 20px;

    color:
        var(--sf-muted);

    text-align: center;
}

.table-state strong {
    color:
        var(--sf-text-dark);

    font-size: 13px;
    font-weight: 700;
}

.table-state span {
    max-width: 390px;

    color:
        #8b9ab0;

    font-size: 10px;
}

.loading-spinner,
.button-spinner {
    border:
        2px solid #dbeafe;

    border-top-color:
        var(--sf-blue);

    border-radius: 50%;

    animation:
        sf-spin 0.75s linear infinite;
}

.loading-spinner {
    width: 30px;
    height: 30px;

    margin-bottom: 7px;
}

.button-spinner {
    width: 13px;
    height: 13px;
}

@keyframes sf-spin {
    to {
        transform:
            rotate(360deg);
    }
}

.empty-icon {
    width: 54px;
    height: 54px;

    display: flex;
    align-items: center;
    justify-content: center;

    margin-bottom: 6px;

    border-radius: 15px;

    background:
        #eff6ff;

    color:
        #60a5fa;

    font-size: 19px;
}

.error-state .empty-icon {
    background:
        #fef2f2;

    color:
        #ef4444;
}


/* =========================================================
   TABLE FOOTER
========================================================= */

.table-footer {
    min-height: 60px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding:
        0 22px;

    border-top:
        1px solid var(--sf-border-light);
}

#categoryResultsInfo {
    color:
        #7b8da7;

    font-size: 10px;
    font-weight: 600;
}

.pagination {
    display: flex;
    align-items: center;

    gap: 5px;
}

.pagination button {
    width: 30px;
    height: 30px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    border:
        1px solid var(--sf-border);

    border-radius: 7px;

    background:
        #ffffff;

    color:
        var(--sf-muted);

    cursor: pointer;

    font-size: 10px;
    font-weight: 700;
}

.pagination button:hover {
    border-color:
        #bfdbfe;

    background:
        #eff6ff;

    color:
        var(--sf-blue);
}

.pagination button.active {
    border-color:
        var(--sf-blue);

    background:
        var(--sf-blue);

    color:
        #ffffff;
}

.pagination button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}


/* =========================================================
   INFORMATION PANEL
========================================================= */

.info-panel {
    display: flex;
    align-items: flex-start;

    gap: 13px;

    margin-top: 20px;

    padding:
        18px 20px;

    border:
        1px solid #dbeafe;

    border-radius:
        var(--sf-radius);

    background:
        #f8fbff;
}

.info-panel-icon {
    width: 34px;
    height: 34px;

    flex: 0 0 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background:
        #dbeafe;

    color:
        var(--sf-blue);

    font-size: 13px;
}

.info-panel strong {
    display: block;

    color:
        var(--sf-text-dark);

    font-size: 11px;
    font-weight: 800;
}

.info-panel p {
    margin:
        4px 0 0;

    color:
        #64748b;

    font-size: 10px;

    line-height: 1.65;
}


/* =========================================================
   MODAL BACKDROP
========================================================= */

.modal-backdrop {
    position: fixed;

    inset: 0;

    z-index: 2000;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background:
        rgba(15,23,42,0.48);

    backdrop-filter:
        blur(4px);

    -webkit-backdrop-filter:
        blur(4px);

    opacity: 1;
    visibility: visible;
}

.modal-backdrop[hidden] {
    display: none;
}


/* =========================================================
   MODAL
========================================================= */

.modal {
    width:
        min(100%, 500px);

    max-height:
        calc(100vh - 40px);

    overflow-y: auto;

    background:
        #ffffff;

    border:
        1px solid rgba(226,232,240,0.9);

    border-radius:
        16px;

    box-shadow:
        0 25px 70px rgba(15,23,42,0.22);

    animation:
        modal-in 0.18s ease;
}

.modal-small {
    width:
        min(100%, 430px);

    padding:
        28px;
}

@keyframes modal-in {
    from {
        opacity: 0;
        transform:
            translateY(8px)
            scale(0.985);
    }

    to {
        opacity: 1;
        transform:
            translateY(0)
            scale(1);
    }
}


/* =========================================================
   MODAL HEADER
========================================================= */

.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 20px;

    padding:
        22px 24px;

    border-bottom:
        1px solid var(--sf-border-light);
}

.modal-header h2 {
    margin: 0;

    color:
        var(--sf-text-dark);

    font-size: 19px;
    font-weight: 800;

    letter-spacing: -0.3px;
}

.modal-close {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background:
        #f8fafc;

    color:
        #64748b;

    cursor: pointer;

    transition:
        background-color var(--sf-transition),
        color var(--sf-transition);
}

.modal-close:hover {
    background:
        #fef2f2;

    color:
        #dc2626;
}


/* =========================================================
   FORM
========================================================= */

#categoryForm {
    padding:
        22px 24px 24px;
}

.form-group {
    margin-bottom: 18px;
}

.form-group label {
    display: block;

    margin-bottom: 7px;

    color:
        var(--sf-text-dark);

    font-size: 11px;
    font-weight: 700;
}

.form-group label span {
    color:
        var(--sf-danger);
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;

    border:
        1px solid var(--sf-border);

    border-radius: 9px;

    outline: none;

    background:
        #ffffff;

    color:
        var(--sf-text);

    font-size: 11px;

    transition:
        border-color var(--sf-transition),
        box-shadow var(--sf-transition);
}

.form-group input,
.form-group select {
    height: 42px;

    padding:
        0 12px;
}

.form-group textarea {
    padding:
        11px 12px;

    resize:
        vertical;

    min-height:
        95px;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    border-color:
        #93c5fd;

    box-shadow:
        0 0 0 3px rgba(37,99,235,0.08);
}

.form-group small {
    display: block;

    margin-top: 5px;

    color:
        #94a3b8;

    font-size: 9px;
}

.form-message {
    margin:
        0 0 15px;

    padding:
        10px 12px;

    border-radius:
        8px;

    font-size: 10px;
    font-weight: 600;
}

.form-message.error {
    border:
        1px solid #fecaca;

    background:
        #fef2f2;

    color:
        #b91c1c;
}

.form-message.success {
    border:
        1px solid #bbf7d0;

    background:
        #f0fdf4;

    color:
        #15803d;
}


/* =========================================================
   MODAL ACTIONS
========================================================= */

.modal-actions {
    display: flex;
    justify-content: flex-end;

    gap: 9px;

    margin-top: 22px;
}

.modal-small .modal-actions {
    margin-top: 24px;
}

.modal-small > h2 {
    margin:
        12px 0 6px;

    color:
        var(--sf-text-dark);

    font-size: 19px;
}

.modal-small > p {
    margin: 0;

    color:
        var(--sf-muted);

    font-size: 11px;

    line-height: 1.65;
}

.modal-small > p strong {
    color:
        var(--sf-text-dark);
}


/* =========================================================
   DELETE CONFIRM ICON
========================================================= */

.confirm-icon {
    width: 50px;
    height: 50px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    background:
        #fef2f2;

    color:
        #dc2626;

    font-size: 17px;
}


/* =========================================================
   TOAST
========================================================= */

.toast-container {
    position: fixed;

    right: 22px;
    bottom: 22px;

    z-index: 3000;

    display: flex;
    flex-direction: column;

    gap: 9px;

    width:
        min(360px, calc(100vw - 40px));

    pointer-events: none;
}

.toast {
    display: flex;
    align-items: flex-start;

    gap: 10px;

    padding:
        13px 14px;

    border:
        1px solid var(--sf-border);

    border-radius: 11px;

    background:
        #ffffff;

    color:
        var(--sf-text);

    box-shadow:
        0 15px 40px rgba(15,23,42,0.14);

    font-size: 11px;
    font-weight: 600;

    animation:
        toast-in 0.2s ease;

    pointer-events: auto;
}

.toast.success {
    border-color:
        #bbf7d0;
}

.toast.success i {
    color:
        #16a34a;
}

.toast.error {
    border-color:
        #fecaca;
}

.toast.error i {
    color:
        #dc2626;
}

@keyframes toast-in {
    from {
        opacity: 0;
        transform:
            translateY(8px);
    }

    to {
        opacity: 1;
        transform:
            translateY(0);
    }
}


/* =========================================================
   TABLET
========================================================= */

@media (max-width: 1150px) {

    .stats-grid {
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
    }

    .page-content {
        padding:
            24px 22px 30px;
    }

    .topbar {
        padding:
            14px 22px;
    }
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

@media (max-width: 900px) {

    .sidebar {
        transform:
            translateX(-100%);

        box-shadow:
            15px 0 40px rgba(0,0,0,0.18);
    }

    .sidebar.open {
        transform:
            translateX(0);
    }

    .main-content {
        margin-left: 0;
    }

    .mobile-menu-btn {
        display: flex;
    }

    .connection-badge {
        display: none;
    }
}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 650px) {

    .topbar {
        min-height: 72px;

        padding:
            12px 15px;
    }

    .page-content {
        padding:
            20px 15px 28px;
    }

    .page-heading h1 {
        font-size: 22px;
    }

    .page-heading p {
        font-size: 10px;
    }

    .topbar-user-info {
        display: none;
    }

    .stats-grid {
        grid-template-columns:
            1fr;

        gap: 12px;
    }

    .stat-card {
        min-height: 100px;
    }

    .content-card-header {
        align-items:
            flex-start;

        flex-direction:
            column;

        padding:
            20px;
    }

    .content-card-header .primary-btn {
        width: 100%;
    }

    .table-toolbar {
        align-items:
            stretch;

        flex-direction:
            column;

        padding:
            15px;
    }

    .search-box {
        max-width:
            none;
    }

    .filter-group select,
    .table-toolbar > .secondary-btn {
        width: 100%;
    }

    .table-footer {
        align-items:
            flex-start;

        flex-direction:
            column;

        padding:
            14px 15px;
    }

    .info-panel {
        padding:
            15px;
    }

    .modal {
        border-radius:
            13px;
    }

    .modal-small {
        padding:
            23px;
    }
}


/* =========================================================
   SMALL MOBILE
========================================================= */

@media (max-width: 420px) {

    .topbar {
        padding:
            10px 12px;
    }

    .topbar-left {
        gap: 9px;
    }

    .mobile-menu-btn {
        width: 36px;
        height: 36px;
    }

    .page-heading h1 {
        font-size: 20px;
    }

    .page-kicker {
        font-size: 8px;
    }

    .stat-card {
        padding:
            17px;
    }

    .stat-content strong {
        font-size: 23px;
    }

    .modal-header {
        padding:
            19px;
    }

    #categoryForm {
        padding:
            19px;
    }

    .modal-actions {
        flex-direction:
            column-reverse;
    }

    .modal-actions button {
        width: 100%;
    }
}


/* =========================================================
   REDUCED MOTION
========================================================= */

@media (prefers-reduced-motion: reduce) {

    *,
    *::before,
    *::after {
        animation-duration:
            0.01ms !important;

        animation-iteration-count:
            1 !important;

        transition-duration:
            0.01ms !important;

        scroll-behavior:
            auto !important;
    }
}
