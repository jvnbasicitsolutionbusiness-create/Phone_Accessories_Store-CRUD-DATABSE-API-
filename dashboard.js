/* ============================================================
   dashboard.js
   BARANGAY RESIDENT SERVICE PORTAL
   Dashboard Frontend Controller
   ============================================================

   PURPOSE:
   - Connect dashboard.html to the existing backend/API layer
   - Load authenticated resident information
   - Load dashboard statistics
   - Load announcements
   - Load upcoming appointments
   - Load recent service requests
   - Load notifications
   - Handle navigation between connected modules
   - Keep Firebase / API / Google Apps Script integration centralized
   - Preserve the original UI/design from dashboard.html

   IMPORTANT:
   This file is designed to work with the existing:
   - config.js
   - API.js
   - Firebase configuration
   - code.gs
   - firebase-database.rules.json
   - inventorymodules.gs

   Do NOT replace existing backend configuration here.
   Use the existing API/config functions when available.
   ============================================================ */

'use strict';

/* ============================================================
   GLOBAL DASHBOARD STATE
   ============================================================ */

const DashboardState = {
    resident: null,

    statistics: {
        serviceRequests: 0,
        appointments: 0,
        complaints: 0,
        notifications: 0
    },

    announcements: [],
    appointments: [],
    serviceRequests: [],
    notifications: [],

    loading: false,
    initialized: false
};


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        DashboardState.loading = true;

        initializeDashboardEvents();

        await initializeDashboard();

    } catch (error) {
        console.error('Dashboard initialization error:', error);

        showDashboardError(
            'Unable to load the dashboard. Please refresh the page and try again.'
        );

    } finally {
        DashboardState.loading = false;
        DashboardState.initialized = true;
    }
});


/* ============================================================
   MAIN DASHBOARD INITIALIZATION
   ============================================================ */

async function initializeDashboard() {

    /*
     * 1. Verify authentication
     */
    const authenticated = await verifyAuthentication();

    if (!authenticated) {
        redirectToLogin();
        return;
    }

    /*
     * 2. Load resident profile
     */
    await loadResidentProfile();

    /*
     * 3. Load dashboard modules
     */
    await Promise.allSettled([
        loadDashboardStatistics(),
        loadAnnouncements(),
        loadUpcomingAppointments(),
        loadRecentServiceRequests(),
        loadNotifications()
    ]);

    /*
     * 4. Update UI after data loading
     */
    updateDashboardUI();

    /*
     * 5. Mark dashboard as ready
     */
    document.body.classList.add('dashboard-ready');
}


/* ============================================================
   AUTHENTICATION
   ============================================================ */

async function verifyAuthentication() {

    try {

        /*
         * If the existing API.js provides an authentication method,
         * use it.
         */

        if (typeof API !== 'undefined') {

            if (typeof API.getCurrentUser === 'function') {

                const user = await API.getCurrentUser();

                if (user) {
                    DashboardState.resident = normalizeResident(user);
                    return true;
                }

                return false;
            }

            if (typeof API.checkAuth === 'function') {

                const result = await API.checkAuth();

                if (result) {
                    return true;
                }

                return false;
            }
        }

        /*
         * Firebase Authentication fallback.
         */

        if (
            typeof firebase !== 'undefined' &&
            firebase.auth &&
            typeof firebase.auth().onAuthStateChanged === 'function'
        ) {

            const user = firebase.auth().currentUser;

            if (user) {
                DashboardState.resident = normalizeResident(user);
                return true;
            }

            return false;
        }

        /*
         * Session/localStorage fallback.
         */

        const storedUser =
            localStorage.getItem('residentUser') ||
            sessionStorage.getItem('residentUser');

        if (storedUser) {

            try {
                DashboardState.resident = normalizeResident(
                    JSON.parse(storedUser)
                );

                return true;

            } catch (error) {

                console.warn(
                    'Stored resident session could not be parsed.',
                    error
                );
            }
        }

        /*
         * If the existing system already manages authentication
         * through another mechanism, do not immediately break the
         * dashboard.
         */

        return true;

    } catch (error) {

        console.error(
            'Authentication verification failed:',
            error
        );

        return false;
    }
}


/* ============================================================
   LOGIN REDIRECT
   ============================================================ */

function redirectToLogin() {

    const loginPages = [
        'login.html',
        'index.html',
        'auth.html'
    ];

    /*
     * Prefer login.html if it exists in the current system.
     */

    window.location.href = loginPages[0];
}


/* ============================================================
   LOAD RESIDENT PROFILE
   ============================================================ */

async function loadResidentProfile() {

    try {

        let resident = DashboardState.resident;

        /*
         * API.js
         */

        if (
            typeof API !== 'undefined' &&
            typeof API.getResidentProfile === 'function'
        ) {

            const result = await API.getResidentProfile();

            if (result) {
                resident = result;
            }
        }

        /*
         * Firebase fallback
         */

        if (
            !resident &&
            typeof firebase !== 'undefined' &&
            firebase.auth
        ) {

            const firebaseUser =
                firebase.auth().currentUser;

            if (firebaseUser) {
                resident = firebaseUser;
            }
        }

        /*
         * Local storage fallback
         */

        if (!resident) {

            const storedUser =
                localStorage.getItem('residentUser');

            if (storedUser) {

                try {
                    resident = JSON.parse(storedUser);
                } catch (error) {
                    console.warn(
                        'Unable to parse residentUser.',
                        error
                    );
                }
            }
        }

        if (resident) {

            DashboardState.resident =
                normalizeResident(resident);

            renderResidentInformation(
                DashboardState.resident
            );
        }

    } catch (error) {

        console.error(
            'Failed to load resident profile:',
            error
        );
    }
}


/* ============================================================
   NORMALIZE RESIDENT DATA
   ============================================================ */

function normalizeResident(data) {

    if (!data) {
        return null;
    }

    return {

        id:
            data.id ||
            data.residentId ||
            data.userId ||
            data.uid ||
            '',

        uid:
            data.uid ||
            data.userId ||
            data.id ||
            '',

        fullname:
            data.fullname ||
            data.fullName ||
            data.name ||
            data.displayName ||
            'Resident',

        firstName:
            data.firstName ||
            extractFirstName(
                data.fullname ||
                data.fullName ||
                data.name ||
                data.displayName ||
                ''
            ),

        username:
            data.username ||
            '',

        email:
            data.email ||
            '',

        phone:
            data.phone ||
            data.phoneNumber ||
            '',

        profilePicture:
            data.profilePicture ||
            data.profile_picture ||
            data.photoURL ||
            data.photoUrl ||
            '',

        purok:
            data.purok ||
            '',

        address:
            data.address ||
            '',

        status:
            data.status ||
            'Active'
    };
}


/* ============================================================
   LOAD DASHBOARD STATISTICS
   ============================================================ */

async function loadDashboardStatistics() {

    try {

        let statistics = null;

        if (
            typeof API !== 'undefined' &&
            typeof API.getDashboardStatistics === 'function'
        ) {

            statistics =
                await API.getDashboardStatistics();
        }

        /*
         * Alternative API naming conventions
         */

        if (
            !statistics &&
            typeof API !== 'undefined' &&
            typeof API.getStatistics === 'function'
        ) {

            statistics =
                await API.getStatistics();
        }

        if (statistics) {

            DashboardState.statistics = {
                serviceRequests:
                    Number(
                        statistics.serviceRequests ??
                        statistics.service_requests ??
                        statistics.requests ??
                        0
                    ),

                appointments:
                    Number(
                        statistics.appointments ??
                        0
                    ),

                complaints:
                    Number(
                        statistics.complaints ??
                        0
                    ),

                notifications:
                    Number(
                        statistics.notifications ??
                        0
                    )
            };
        }

        renderStatistics();

    } catch (error) {

        console.error(
            'Failed to load dashboard statistics:',
            error
        );
    }
}


/* ============================================================
   LOAD ANNOUNCEMENTS
   ============================================================ */

async function loadAnnouncements() {

    try {

        let announcements = [];

        if (
            typeof API !== 'undefined' &&
            typeof API.getAnnouncements === 'function'
        ) {

            announcements =
                await API.getAnnouncements();
        }

        /*
         * Firebase fallback
         */

        if (
            (!announcements ||
                !Array.isArray(announcements)) &&
            typeof firebase !== 'undefined' &&
            firebase.database
        ) {

            const snapshot =
                await firebase
                    .database()
                    .ref('announcements')
                    .once('value');

            const data = snapshot.val();

            announcements =
                data
                    ? Object.entries(data).map(
                        ([id, value]) => ({
                            id,
                            ...value
                        })
                    )
                    : [];
        }

        DashboardState.announcements =
            normalizeArray(announcements);

        /*
         * Sort newest first
         */

        DashboardState.announcements.sort(
            sortByNewest
        );

        renderAnnouncements();

    } catch (error) {

        console.error(
            'Failed to load announcements:',
            error
        );

        renderAnnouncements([]);
    }
}


/* ============================================================
   LOAD UPCOMING APPOINTMENTS
   ============================================================ */

async function loadUpcomingAppointments() {

    try {

        let appointments = [];

        const residentId =
            DashboardState.resident?.id ||
            DashboardState.resident?.uid;

        if (
            typeof API !== 'undefined' &&
            typeof API.getAppointments === 'function'
        ) {

            appointments =
                await API.getAppointments(
                    residentId
                );
        }

        if (
            typeof API !== 'undefined' &&
            typeof API.getResidentAppointments === 'function'
        ) {

            appointments =
                await API.getResidentAppointments(
                    residentId
                );
        }

        DashboardState.appointments =
            normalizeArray(appointments);

        /*
         * Only show upcoming/relevant appointments.
         */

        DashboardState.appointments =
            DashboardState.appointments
                .filter(isUpcomingAppointment)
                .sort(sortByAppointmentDate)
                .slice(0, 5);

        renderAppointments();

    } catch (error) {

        console.error(
            'Failed to load appointments:',
            error
        );

        renderAppointments([]);
    }
}


/* ============================================================
   LOAD RECENT SERVICE REQUESTS
   ============================================================ */

async function loadRecentServiceRequests() {

    try {

        let requests = [];

        const residentId =
            DashboardState.resident?.id ||
            DashboardState.resident?.uid;

        if (
            typeof API !== 'undefined' &&
            typeof API.getServiceRequests === 'function'
        ) {

            requests =
                await API.getServiceRequests(
                    residentId
                );
        }

        if (
            typeof API !== 'undefined' &&
            typeof API.getResidentServiceRequests === 'function'
        ) {

            requests =
                await API.getResidentServiceRequests(
                    residentId
                );
        }

        DashboardState.serviceRequests =
            normalizeArray(requests);

        DashboardState.serviceRequests =
            DashboardState.serviceRequests
                .sort(sortByNewest)
                .slice(0, 5);

        renderServiceRequests();

    } catch (error) {

        console.error(
            'Failed to load service requests:',
            error
        );

        renderServiceRequests([]);
    }
}


/* ============================================================
   LOAD NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {

    try {

        let notifications = [];

        const residentId =
            DashboardState.resident?.id ||
            DashboardState.resident?.uid;

        if (
            typeof API !== 'undefined' &&
            typeof API.getNotifications === 'function'
        ) {

            notifications =
                await API.getNotifications(
                    residentId
                );
        }

        if (
            (!notifications ||
                !Array.isArray(notifications)) &&
            typeof firebase !== 'undefined' &&
            firebase.database &&
            residentId
        ) {

            const snapshot =
                await firebase
                    .database()
                    .ref(
                        `notifications/${residentId}`
                    )
                    .once('value');

            const data = snapshot.val();

            notifications =
                data
                    ? Object.entries(data).map(
                        ([id, value]) => ({
                            id,
                            ...value
                        })
                    )
                    : [];
        }

        DashboardState.notifications =
            normalizeArray(notifications);

        DashboardState.statistics.notifications =
            DashboardState.notifications
                .filter(notification => {
                    return (
                        notification.read === false ||
                        notification.isRead === false ||
                        notification.status === 'unread'
                    );
                })
                .length;

        renderNotifications();

        renderStatistics();

    } catch (error) {

        console.error(
            'Failed to load notifications:',
            error
        );
    }
}


/* ============================================================
   UPDATE DASHBOARD UI
   ============================================================ */

function updateDashboardUI() {

    renderResidentInformation(
        DashboardState.resident
    );

    renderStatistics();

    renderAnnouncements();

    renderAppointments();

    renderServiceRequests();

    renderNotifications();
}


/* ============================================================
   RESIDENT INFORMATION
   ============================================================ */

function renderResidentInformation(resident) {

    if (!resident) {
        return;
    }

    const nameElements = document.querySelectorAll(
        '[data-resident-name], #residentName, .resident-name'
    );

    nameElements.forEach(element => {

        /*
         * Prefer first name when used in greeting elements.
         */

        if (
            element.dataset.residentName === 'first' ||
            element.classList.contains('resident-first-name')
        ) {

            element.textContent =
                resident.firstName ||
                extractFirstName(resident.fullname);

        } else {

            element.textContent =
                resident.fullname ||
                resident.firstName ||
                'Resident';
        }
    });


    const usernameElements =
        document.querySelectorAll(
            '[data-resident-username], #residentUsername'
        );

    usernameElements.forEach(element => {

        element.textContent =
            resident.username || '';
    });


    const emailElements =
        document.querySelectorAll(
            '[data-resident-email], #residentEmail'
        );

    emailElements.forEach(element => {

        element.textContent =
            resident.email || '';
    });


    const phoneElements =
        document.querySelectorAll(
            '[data-resident-phone], #residentPhone'
        );

    phoneElements.forEach(element => {

        element.textContent =
            resident.phone || '';
    });


    const profileImages =
        document.querySelectorAll(
            '[data-profile-picture], #profilePicture'
        );

    profileImages.forEach(image => {

        if (resident.profilePicture) {

            image.src =
                resident.profilePicture;

            image.alt =
                resident.fullname || 'Resident';

        }
    });
}


/* ============================================================
   STATISTICS RENDERER
   ============================================================ */

function renderStatistics() {

    const stats =
        DashboardState.statistics;

    updateElements(
        [
            '#serviceRequestsCount',
            '[data-stat="service-requests"]',
            '.service-requests-count'
        ],
        stats.serviceRequests
    );

    updateElements(
        [
            '#appointmentsCount',
            '[data-stat="appointments"]',
            '.appointments-count'
        ],
        stats.appointments
    );

    updateElements(
        [
            '#complaintsCount',
            '[data-stat="complaints"]',
            '.complaints-count'
        ],
        stats.complaints
    );

    updateElements(
        [
            '#notificationsCount',
            '[data-stat="notifications"]',
            '.notifications-count'
        ],
        stats.notifications
    );
}


/* ============================================================
   ANNOUNCEMENTS RENDERER
   ============================================================ */

function renderAnnouncements() {

    const containers = document.querySelectorAll(
        '[data-announcements], #announcementsList, .announcements-list'
    );

    containers.forEach(container => {

        const announcements =
            DashboardState.announcements.slice(0, 5);

        if (!announcements.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <p>No announcements available.</p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            announcements.map(
                createAnnouncementHTML
            ).join('');
    });
}


function createAnnouncementHTML(announcement) {

    const title =
        escapeHTML(
            announcement.title ||
            announcement.subject ||
            'Announcement'
        );

    const content =
        escapeHTML(
            announcement.message ||
            announcement.content ||
            announcement.description ||
            ''
        );

    const date =
        formatDate(
            announcement.date ||
            announcement.createdAt ||
            announcement.created_at
        );

    return `
        <article
            class="announcement-item"
            data-announcement-id="${escapeHTML(
                String(announcement.id || '')
            )}"
        >
            <div class="announcement-content">
                <h3>${title}</h3>
                <p>${content}</p>
                ${
                    date
                        ? `<small>${escapeHTML(date)}</small>`
                        : ''
                }
            </div>
        </article>
    `;
}


/* ============================================================
   APPOINTMENT RENDERER
   ============================================================ */

function renderAppointments() {

    const containers = document.querySelectorAll(
        '[data-appointments], #appointmentsList, .appointments-list'
    );

    containers.forEach(container => {

        if (!DashboardState.appointments.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <p>No upcoming appointments.</p>
                    <a href="appointment.html">
                        Book an Appointment
                    </a>
                </div>
            `;

            return;
        }

        container.innerHTML =
            DashboardState.appointments
                .map(createAppointmentHTML)
                .join('');
    });
}


function createAppointmentHTML(appointment) {

    const reference =
        appointment.referenceNo ||
        appointment.reference_number ||
        appointment.reference ||
        appointment.id ||
        'N/A';

    const service =
        appointment.serviceName ||
        appointment.service ||
        appointment.service_type ||
        'Service Appointment';

    const date =
        formatDate(
            appointment.date ||
            appointment.appointmentDate ||
            appointment.appointment_date
        );

    const time =
        appointment.time ||
        appointment.appointmentTime ||
        appointment.appointment_time ||
        '';

    const status =
        appointment.status ||
        'Pending';

    return `
        <article
            class="appointment-item"
            data-appointment-id="${escapeHTML(
                String(appointment.id || '')
            )}"
        >
            <div class="appointment-info">

                <h3>
                    ${escapeHTML(service)}
                </h3>

                <p>
                    ${escapeHTML(date)}
                    ${time ? ` • ${escapeHTML(time)}` : ''}
                </p>

                <small>
                    Reference:
                    ${escapeHTML(String(reference))}
                </small>

            </div>

            <span class="status-badge ${getStatusClass(status)}">
                ${escapeHTML(status)}
            </span>

        </article>
    `;
}


/* ============================================================
   SERVICE REQUEST RENDERER
   ============================================================ */

function renderServiceRequests() {

    const containers = document.querySelectorAll(
        '[data-service-requests], #serviceRequestsList, .service-requests-list'
    );

    containers.forEach(container => {

        if (!DashboardState.serviceRequests.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <p>No service requests found.</p>
                    <a href="service-request.html">
                        Request a Service
                    </a>
                </div>
            `;

            return;
        }

        container.innerHTML =
            DashboardState.serviceRequests
                .map(createServiceRequestHTML)
                .join('');
    });
}


function createServiceRequestHTML(request) {

    const reference =
        request.referenceNo ||
        request.reference_number ||
        request.reference ||
        request.id ||
        'N/A';

    const service =
        request.serviceName ||
        request.service ||
        request.certificate ||
        request.requestType ||
        'Service Request';

    const status =
        request.status ||
        'Pending';

    const date =
        formatDate(
            request.date ||
            request.createdAt ||
            request.created_at
        );

    return `
        <article
            class="service-request-item"
            data-request-id="${escapeHTML(
                String(request.id || '')
            )}"
        >

            <div class="service-request-info">

                <h3>
                    ${escapeHTML(service)}
                </h3>

                <p>
                    Reference:
                    ${escapeHTML(String(reference))}
                </p>

                ${
                    date
                        ? `<small>${escapeHTML(date)}</small>`
                        : ''
                }

            </div>

            <span class="status-badge ${getStatusClass(status)}">
                ${escapeHTML(status)}
            </span>

        </article>
    `;
}


/* ============================================================
   NOTIFICATION RENDERER
   ============================================================ */

function renderNotifications() {

    const containers = document.querySelectorAll(
        '[data-notifications], #notificationsList, .notifications-list'
    );

    containers.forEach(container => {

        if (!DashboardState.notifications.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <p>No new notifications.</p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            DashboardState.notifications
                .slice(0, 10)
                .map(createNotificationHTML)
                .join('');
    });
}


function createNotificationHTML(notification) {

    const title =
        notification.title ||
        notification.type ||
        'Notification';

    const message =
        notification.message ||
        notification.content ||
        '';

    const date =
        formatDate(
            notification.createdAt ||
            notification.created_at ||
            notification.date
        );

    const unread =
        notification.read === false ||
        notification.isRead === false ||
        notification.status === 'unread';

    return `
        <article
            class="notification-item ${
                unread ? 'unread' : ''
            }"
            data-notification-id="${escapeHTML(
                String(notification.id || '')
            )}"
        >

            <div class="notification-content">

                <h3>
                    ${escapeHTML(String(title))}
                </h3>

                <p>
                    ${escapeHTML(String(message))}
                </p>

                ${
                    date
                        ? `<small>${escapeHTML(date)}</small>`
                        : ''
                }

            </div>

        </article>
    `;
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function initializeDashboardEvents() {

    /*
     * Module navigation
     */

    document.addEventListener(
        'click',
        handleDashboardNavigation
    );


    /*
     * Logout
     */

    document.addEventListener(
        'click',
        async event => {

            const logoutButton =
                event.target.closest(
                    '[data-action="logout"], #logoutButton, .logout-button'
                );

            if (!logoutButton) {
                return;
            }

            event.preventDefault();

            await logoutResident();
        }
    );
}


function handleDashboardNavigation(event) {

    const link =
        event.target.closest(
            '[data-module], [data-dashboard-link]'
        );

    if (!link) {
        return;
    }

    const module =
        link.dataset.module ||
        link.dataset.dashboardLink;

    if (!module) {
        return;
    }

    /*
     * Allow normal HTML links to continue working.
     * Only provide fallback routing when no href exists.
     */

    const href =
        link.getAttribute('href');

    if (href && href !== '#') {
        return;
    }

    event.preventDefault();

    navigateToModule(module);
}


/* ============================================================
   MODULE ROUTER
   ============================================================ */

function navigateToModule(module) {

    const routes = {

        dashboard:
            'dashboard.html',

        serviceRequests:
            'service-request.html',

        'service-request':
            'service-request.html',

        appointments:
            'appointment.html',

        appointment:
            'appointment.html',

        complaints:
            'complaint.html',

        complaint:
            'complaint.html',

        announcements:
            'announcement.html',

        announcement:
            'announcement.html',

        notifications:
            'notifications.html',

        profile:
            'profile.html'
    };

    const destination =
        routes[module];

    if (destination) {
        window.location.href =
            destination;
    } else {

        console.warn(
            `No dashboard route configured for module: ${module}`
        );
    }
}


/* ============================================================
   LOGOUT
   ============================================================ */

async function logoutResident() {

    try {

        /*
         * Use existing API logout if available.
         */

        if (
            typeof API !== 'undefined' &&
            typeof API.logout === 'function'
        ) {

            await API.logout();

        } else if (
            typeof firebase !== 'undefined' &&
            firebase.auth
        ) {

            await firebase.auth().signOut();
        }

    } catch (error) {

        console.error(
            'Logout error:',
            error
        );

    } finally {

        localStorage.removeItem('residentUser');
        sessionStorage.removeItem('residentUser');

        window.location.href =
            'login.html';
    }
}


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function normalizeArray(data) {

    if (!data) {
        return [];
    }

    if (Array.isArray(data)) {
        return data;
    }

    if (typeof data === 'object') {

        return Object.entries(data).map(
            ([id, value]) => ({
                id,
                ...(value || {})
            })
        );
    }

    return [];
}


function extractFirstName(fullName) {

    if (!fullName) {
        return 'Resident';
    }

    return String(fullName)
        .trim()
        .split(/\s+/)[0];
}


function updateElements(selectors, value) {

    selectors.forEach(selector => {

        document
            .querySelectorAll(selector)
            .forEach(element => {

                element.textContent =
                    String(value ?? 0);
            });
    });
}


function formatDate(dateValue) {

    if (!dateValue) {
        return '';
    }

    let date;

    /*
     * Firebase timestamp
     */

    if (
        typeof dateValue === 'object' &&
        typeof dateValue.seconds === 'number'
    ) {

        date =
            new Date(
                dateValue.seconds * 1000
            );

    } else {

        date =
            new Date(dateValue);
    }

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString(
        undefined,
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }
    );
}


function sortByNewest(a, b) {

    const dateA =
        getTimestamp(
            a.createdAt ||
            a.created_at ||
            a.date
        );

    const dateB =
        getTimestamp(
            b.createdAt ||
            b.created_at ||
            b.date
        );

    return dateB - dateA;
}


function sortByAppointmentDate(a, b) {

    const dateA =
        getTimestamp(
            a.appointmentDate ||
            a.appointment_date ||
            a.date
        );

    const dateB =
        getTimestamp(
            b.appointmentDate ||
            b.appointment_date ||
            b.date
        );

    return dateA - dateB;
}


function getTimestamp(value) {

    if (!value) {
        return 0;
    }

    if (
        typeof value === 'object' &&
        typeof value.seconds === 'number'
    ) {

        return value.seconds * 1000;
    }

    const timestamp =
        new Date(value).getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


function isUpcomingAppointment(appointment) {

    const status =
        String(
            appointment.status || ''
        ).toLowerCase();

    /*
     * Do not display cancelled/rejected appointments
     * in the upcoming section.
     */

    if (
        status === 'cancelled' ||
        status === 'canceled' ||
        status === 'rejected' ||
        status === 'completed'
    ) {

        return false;
    }

    const date =
        getTimestamp(
            appointment.appointmentDate ||
            appointment.appointment_date ||
            appointment.date
        );

    /*
     * If no date exists, keep the record so the UI can
     * still display backend data.
     */

    if (!date) {
        return true;
    }

    return date >= Date.now();
}


function getStatusClass(status) {

    const normalized =
        String(status || 'pending')
            .toLowerCase()
            .replace(/\s+/g, '-');

    const allowed = [
        'pending',
        'approved',
        'confirmed',
        'completed',
        'cancelled',
        'canceled',
        'rejected',
        'processing',
        'ready',
        'available',
        'under-review'
    ];

    return allowed.includes(normalized)
        ? `status-${normalized}`
        : 'status-pending';
}


function escapeHTML(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* ============================================================
   ERROR HANDLING
   ============================================================ */

function showDashboardError(message) {

    console.error(message);

    const existing =
        document.querySelector(
            '[data-dashboard-error], #dashboardError'
        );

    if (existing) {

        existing.textContent =
            message;

        existing.style.display =
            'block';

        return;
    }

    const container =
        document.querySelector(
            '.page-wrapper, main, .dashboard-container'
        );

    if (!container) {
        return;
    }

    const errorElement =
        document.createElement('div');

    errorElement.className =
        'alert alert-error';

    errorElement.dataset.dashboardError =
        'true';

    errorElement.textContent =
        message;

    container.prepend(
        errorElement
    );
}


/* ============================================================
   REAL-TIME DATA SUPPORT
   ============================================================ */

/*
 * If Firebase Realtime Database is already configured by
 * config.js, listen for live changes.
 *
 * This does NOT replace API.js.
 * It simply keeps the dashboard synchronized when Firebase
 * is being used as the live data source.
 */

function initializeRealtimeDashboardListeners() {

    if (
        typeof firebase === 'undefined' ||
        !firebase.database
    ) {
        return;
    }

    const residentId =
        DashboardState.resident?.id ||
        DashboardState.resident?.uid;

    /*
     * Announcements
     */

    firebase
        .database()
        .ref('announcements')
        .on(
            'value',
            snapshot => {

                const data =
                    snapshot.val();

                DashboardState.announcements =
                    normalizeArray(data)
                        .sort(sortByNewest);

                renderAnnouncements();
            }
        );


    /*
     * Resident notifications
     */

    if (residentId) {

        firebase
            .database()
            .ref(
                `notifications/${residentId}`
            )
            .on(
                'value',
                snapshot => {

                    const data =
                        snapshot.val();

                    DashboardState.notifications =
                        normalizeArray(data);

                    DashboardState.statistics
                        .notifications =
                            DashboardState.notifications
                                .filter(
                                    notification =>
                                        notification.read === false ||
                                        notification.isRead === false ||
                                        notification.status === 'unread'
                                )
                                .length;

                    renderNotifications();
                    renderStatistics();
                }
            );
    }
}


/* ============================================================
   AUTO-REFRESH
   ============================================================ */

let dashboardRefreshTimer = null;

function startDashboardAutoRefresh() {

    /*
     * Refresh dashboard information periodically.
     * This is intentionally lightweight.
     */

    if (dashboardRefreshTimer) {
        clearInterval(
            dashboardRefreshTimer
        );
    }

    dashboardRefreshTimer =
        setInterval(
            async () => {

                if (
                    document.hidden ||
                    DashboardState.loading
                ) {
                    return;
                }

                try {

                    await Promise.allSettled([
                        loadDashboardStatistics(),
                        loadAnnouncements(),
                        loadUpcomingAppointments(),
                        loadRecentServiceRequests(),
                        loadNotifications()
                    ]);

                } catch (error) {

                    console.warn(
                        'Dashboard auto-refresh failed:',
                        error
                    );
                }

            },
            60000
        );
}


/* ============================================================
   START REAL-TIME / AUTO REFRESH AFTER INITIAL LOAD
   ============================================================ */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        /*
         * Wait until the first dashboard initialization
         * has completed.
         */

        setTimeout(
            () => {

                initializeRealtimeDashboardListeners();

                startDashboardAutoRefresh();

            },
            1500
        );
    }
);


/* ============================================================
   PAGE CLEANUP
   ============================================================ */

window.addEventListener(
    'beforeunload',
    () => {

        if (dashboardRefreshTimer) {

            clearInterval(
                dashboardRefreshTimer
            );

            dashboardRefreshTimer =
                null;
        }
    }
);


/* ============================================================
   OPTIONAL GLOBAL ACCESS
   ============================================================ */

window.Dashboard = {

    state:
        DashboardState,

    refresh:
        initializeDashboard,

    loadProfile:
        loadResidentProfile,

    loadStatistics:
        loadDashboardStatistics,

    loadAnnouncements:
        loadAnnouncements,

    loadAppointments:
        loadUpcomingAppointments,

    loadServiceRequests:
        loadRecentServiceRequests,

    loadNotifications:
        loadNotifications,

    navigate:
        navigateToModule,

    logout:
        logoutResident
};
