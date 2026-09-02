/* =========================================================
   SERVICE-REQUESTS.JS
   BRSPWA&A — Resident Service Request Module

   Flow:
   Select Service
        ↓
   Enter Purpose / Details
        ↓
   Review Request
        ↓
   Submit
        ↓
   Reference Number
        ↓
   Track Status

   Uses:
   - API.js
   - Auth.js
   - config.js

   No API keys or backend credentials are stored here.
   ========================================================= */

(function () {
    "use strict";

    const ServiceRequests = {

        state: {
            requests: [],
            selectedRequest: null,
            loading: false
        },


        /* =====================================================
           INITIALIZATION
           ===================================================== */

        async init() {

            if (
                window.Auth &&
                typeof Auth.protectPage === "function" &&
                !Auth.protectPage()
            ) {
                return;
            }

            this.bindEvents();
            this.setCurrentUser();

            await this.loadRequests();
        },


        /* =====================================================
           EVENT BINDINGS
           ===================================================== */

        bindEvents() {

            document.addEventListener(
                "click",
                event => {

                    const viewButton =
                        event.target.closest(
                            "[data-view-request]"
                        );

                    if (viewButton) {

                        const id =
                            viewButton.dataset.viewRequest;

                        this.viewRequest(id);
                        return;
                    }


                    const cancelButton =
                        event.target.closest(
                            "[data-cancel-request]"
                        );

                    if (cancelButton) {

                        const id =
                            cancelButton.dataset.cancelRequest;

                        this.cancelRequest(id);
                        return;
                    }


                    const refreshButton =
                        event.target.closest(
                            "[data-refresh-requests]"
                        );

                    if (refreshButton) {
                        this.loadRequests();
                    }
                }
            );


            const form =
                document.querySelector(
                    "#serviceRequestForm"
                );

            if (form) {

                form.addEventListener(
                    "submit",
                    event => {

                        event.preventDefault();

                        this.submitRequest(form);
                    }
                );
            }
        },


        /* =====================================================
           CURRENT USER
           ===================================================== */

        setCurrentUser() {

            const user =
                window.Auth &&
                typeof Auth.getCurrentUser === "function"
                    ? Auth.getCurrentUser()
                    : null;

            if (!user) {
                return;
            }

            const name =
                user.fullName ||
                user.full_name ||
                user.name ||
                [
                    user.firstName,
                    user.middleName,
                    user.lastName
                ]
                    .filter(Boolean)
                    .join(" ");

            document
                .querySelectorAll(
                    "[data-user-name]"
                )
                .forEach(element => {
                    element.textContent =
                        name || "Resident";
                });
        },


        /* =====================================================
           LOAD REQUESTS
           ===================================================== */

        async loadRequests() {

            this.setLoading(true);

            this.hideError();

            try {

                if (
                    !window.API ||
                    typeof API.getServiceRequests !==
                        "function"
                ) {
                    throw new Error(
                        "Service Request API is unavailable."
                    );
                }

                const response =
                    await API.getServiceRequests();


                if (
                    response &&
                    response.success === false
                ) {
                    throw new Error(
                        response.message ||
                        "Unable to load service requests."
                    );
                }


                const data =
                    response?.data ??
                    response?.result ??
                    response;


                this.state.requests =
                    this.extractRequests(data);


                this.renderRequests(
                    this.state.requests
                );

                this.updateStatistics(
                    this.state.requests
                );


            } catch (error) {

                console.error(
                    "Service request loading error:",
                    error
                );

                this.showError(
                    error.message ||
                    "Unable to load service requests."
                );

                this.renderRequests([]);

            } finally {

                this.setLoading(false);
            }
        },


        /* =====================================================
           EXTRACT REQUEST ARRAY
           ===================================================== */

        extractRequests(data) {

            if (Array.isArray(data)) {
                return data;
            }

            if (!data || typeof data !== "object") {
                return [];
            }

            return (
                data.requests ||
                data.serviceRequests ||
                data.service_requests ||
                data.items ||
                data.records ||
                []
            );
        },


        /* =====================================================
           RENDER REQUESTS
           ===================================================== */

        renderRequests(requests) {

            const containers =
                document.querySelectorAll(
                    "[data-service-requests]"
                );

            containers.forEach(container => {

                if (!requests.length) {

                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📄</div>
                            <h3>No Service Requests</h3>
                            <p>
                                You currently have no service requests.
                            </p>
                        </div>
                    `;

                    return;
                }


                container.innerHTML =
                    requests
                        .map(
                            request =>
                                this.createRequestHTML(
                                    request
                                )
                        )
                        .join("");
            });
        },


        /* =====================================================
           REQUEST HTML
           ===================================================== */

        createRequestHTML(request) {

            const id =
                this.getRequestId(request);

            const reference =
                this.getReferenceNumber(request);

            const service =
                this.getServiceName(request);

            const purpose =
                request.purpose ||
                request.reason ||
                request.description ||
                "No purpose provided";

            const status =
                this.normalizeStatus(
                    request.status ||
                    request.requestStatus
                );

            const date =
                this.formatDate(
                    request.createdAt ||
                    request.created_at ||
                    request.dateCreated ||
                    request.date
                );


            return `
                <div
                    class="request-card"
                    data-request-id="${this.escapeHTML(id)}"
                >

                    <div class="request-card-header">

                        <div>
                            <span class="request-reference">
                                ${this.escapeHTML(reference)}
                            </span>

                            <h3>
                                ${this.escapeHTML(service)}
                            </h3>
                        </div>

                        <span
                            class="status-badge ${this.getStatusClass(status)}"
                        >
                            ${this.escapeHTML(status)}
                        </span>

                    </div>


                    <div class="request-card-body">

                        <div class="request-detail">
                            <span class="request-detail-label">
                                Purpose
                            </span>

                            <span class="request-detail-value">
                                ${this.escapeHTML(purpose)}
                            </span>
                        </div>

                        <div class="request-detail">
                            <span class="request-detail-label">
                                Date Submitted
                            </span>

                            <span class="request-detail-value">
                                ${this.escapeHTML(date)}
                            </span>
                        </div>

                    </div>


                    <div class="request-card-footer">

                        <button
                            type="button"
                            class="secondary-button"
                            data-view-request="${this.escapeHTML(id)}"
                        >
                            View Details
                        </button>

                        ${
                            this.canCancel(status)
                                ? `
                                    <button
                                        type="button"
                                        class="danger-button"
                                        data-cancel-request="${this.escapeHTML(id)}"
                                    >
                                        Cancel Request
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                </div>
            `;
        },


        /* =====================================================
           SUBMIT REQUEST
           ===================================================== */

        async submitRequest(form) {

            if (
                !window.API ||
                typeof API.createServiceRequest !==
                    "function"
            ) {
                this.showError(
                    "Service Request API is unavailable."
                );
                return;
            }


            const formData =
                new FormData(form);


            const requestData = {

                serviceId:
                    formData.get("serviceId") ||
                    formData.get("service") ||
                    "",

                service:
                    formData.get("service") ||
                    "",

                purpose:
                    String(
                        formData.get("purpose") ||
                        formData.get("reason") ||
                        ""
                    ).trim(),

                description:
                    String(
                        formData.get("description") ||
                        formData.get("details") ||
                        ""
                    ).trim(),

                details:
                    String(
                        formData.get("details") ||
                        formData.get("description") ||
                        ""
                    ).trim()
            };


            if (!requestData.serviceId &&
                !requestData.service) {

                this.showError(
                    "Please select a service."
                );

                return;
            }


            if (!requestData.purpose &&
                !requestData.description) {

                this.showError(
                    "Please provide the purpose or details of your request."
                );

                return;
            }


            this.setFormLoading(
                form,
                true
            );


            try {

                const response =
                    await API.createServiceRequest(
                        requestData
                    );


                if (
                    !response ||
                    response.success === false
                ) {

                    throw new Error(
                        response?.message ||
                        "Unable to submit service request."
                    );
                }


                const data =
                    response.data ||
                    response.result ||
                    {};


                const reference =
                    data.referenceNo ||
                    data.referenceNumber ||
                    data.reference ||
                    data.requestReference ||
                    "";


                this.showSuccess(
                    reference
                        ? `Request submitted successfully. Reference No.: ${reference}`
                        : "Service request submitted successfully."
                );


                form.reset();


                /*
                 * Refresh the list after successful submission.
                 */
                await this.loadRequests();


                /*
                 * Allow the backend/API to trigger its own
                 * notification workflow.
                 *
                 * Email/SMS delivery must happen server-side.
                 */
                if (
                    reference &&
                    window.API &&
                    typeof API.sendNotification ===
                        "function"
                ) {

                    try {

                        await API.sendNotification({
                            type: "SERVICE_REQUEST_SUBMITTED",
                            referenceNo: reference,
                            message:
                                `Your service request ${reference} has been submitted successfully.`
                        });

                    } catch (notificationError) {

                        console.warn(
                            "Notification request failed:",
                            notificationError
                        );
                    }
                }


                this.showConfirmation(
                    data
                );


            } catch (error) {

                console.error(
                    "Service request submission error:",
                    error
                );

                this.showError(
                    error.message ||
                    "Unable to submit your request."
                );

            } finally {

                this.setFormLoading(
                    form,
                    false
                );
            }
        },


        /* =====================================================
           VIEW REQUEST
           ===================================================== */

        async viewRequest(requestId) {

            if (!requestId) {
                return;
            }


            const localRequest =
                this.state.requests.find(
                    request =>
                        String(
                            this.getRequestId(request)
                        ) === String(requestId)
                );


            if (localRequest) {

                this.state.selectedRequest =
                    localRequest;

                this.showRequestModal(
                    localRequest
                );

                return;
            }


            try {

                if (
                    window.API &&
                    typeof API.getServiceRequest ===
                        "function"
                ) {

                    const response =
                        await API.getServiceRequest(
                            requestId
                        );


                    if (
                        response &&
                        response.success === false
                    ) {

                        throw new Error(
                            response.message ||
                            "Unable to retrieve request."
                        );
                    }


                    const request =
                        response?.data ||
                        response?.result ||
                        response;


                    if (request) {

                        this.state.selectedRequest =
                            request;

                        this.showRequestModal(
                            request
                        );
                    }
                }

            } catch (error) {

                console.error(
                    "Unable to view request:",
                    error
                );

                this.showError(
                    error.message ||
                    "Unable to retrieve request details."
                );
            }
        },


        /* =====================================================
           REQUEST MODAL
           ===================================================== */

        showRequestModal(request) {

            const modal =
                document.querySelector(
                    "#requestDetailsModal"
                );

            if (!modal) {
                return;
            }


            const reference =
                this.getReferenceNumber(request);

            const service =
                this.getServiceName(request);

            const purpose =
                request.purpose ||
                request.reason ||
                "—";

            const description =
                request.description ||
                request.details ||
                "—";

            const status =
                this.normalizeStatus(
                    request.status
                );

            const submitted =
                this.formatDate(
                    request.createdAt ||
                    request.created_at ||
                    request.date
                );


            const set =
                (selector, value) => {

                    const element =
                        modal.querySelector(
                            selector
                        );

                    if (element) {
                        element.textContent =
                            value;
                    }
                };


            set(
                "[data-request-reference]",
                reference
            );

            set(
                "[data-request-service]",
                service
            );

            set(
                "[data-request-purpose]",
                purpose
            );

            set(
                "[data-request-description]",
                description
            );

            set(
                "[data-request-status]",
                status
            );

            set(
                "[data-request-date]",
                submitted
            );


            modal.classList.add("show");
            modal.setAttribute(
                "aria-hidden",
                "false"
            );
        },


        closeRequestModal() {

            const modal =
                document.querySelector(
                    "#requestDetailsModal"
                );

            if (!modal) {
                return;
            }

            modal.classList.remove("show");

            modal.setAttribute(
                "aria-hidden",
                "true"
            );
        },


        /* =====================================================
           CANCEL REQUEST
           ===================================================== */

        async cancelRequest(requestId) {

            if (!requestId) {
                return;
            }


            const request =
                this.state.requests.find(
                    item =>
                        String(
                            this.getRequestId(item)
                        ) === String(requestId)
                );


            if (
                request &&
                !this.canCancel(
                    this.normalizeStatus(
                        request.status
                    )
                )
            ) {

                this.showError(
                    "This request can no longer be cancelled."
                );

                return;
            }


            const confirmed =
                window.confirm(
                    "Are you sure you want to cancel this service request?"
                );


            if (!confirmed) {
                return;
            }


            try {

                if (
                    !window.API ||
                    typeof API.cancelServiceRequest !==
                        "function"
                ) {

                    throw new Error(
                        "Cancel Request API is unavailable."
                    );
                }


                const response =
                    await API.cancelServiceRequest(
                        requestId
                    );


                if (
                    !response ||
                    response.success === false
                ) {

                    throw new Error(
                        response?.message ||
                        "Unable to cancel the request."
                    );
                }


                this.showSuccess(
                    "Service request cancelled successfully."
                );


                await this.loadRequests();


            } catch (error) {

                console.error(
                    "Cancel request error:",
                    error
                );

                this.showError(
                    error.message ||
                    "Unable to cancel the request."
                );
            }
        },


        /* =====================================================
           STATISTICS
           ===================================================== */

        updateStatistics(requests) {

            const total =
                requests.length;

            const pending =
                requests.filter(
                    request =>
                        this.isStatus(
                            request.status,
                            [
                                "pending",
                                "submitted",
                                "for approval"
                            ]
                        )
                ).length;

            const processing =
                requests.filter(
                    request =>
                        this.isStatus(
                            request.status,
                            [
                                "processing",
                                "in progress",
                                "under review"
                            ]
                        )
                ).length;

            const completed =
                requests.filter(
                    request =>
                        this.isStatus(
                            request.status,
                            [
                                "completed",
                                "approved",
                                "released",
                                "resolved"
                            ]
                        )
                ).length;


            this.setText(
                "[data-stat-total-requests]",
                total
            );

            this.setText(
                "[data-stat-pending-requests]",
                pending
            );

            this.setText(
                "[data-stat-processing-requests]",
                processing
            );

            this.setText(
                "[data-stat-completed-requests]",
                completed
            );
        },


        /* =====================================================
           STATUS HELPERS
           ===================================================== */

        normalizeStatus(status) {

            if (!status) {
                return "Pending";
            }

            const value =
                String(status)
                    .trim()
                    .toLowerCase();

            const map = {

                pending:
                    "Pending",

                submitted:
                    "Submitted",

                processing:
                    "Processing",

                "in progress":
                    "Processing",

                "under review":
                    "Under Review",

                approved:
                    "Approved",

                completed:
                    "Completed",

                rejected:
                    "Rejected",

                cancelled:
                    "Cancelled",

                canceled:
                    "Cancelled",

                resolved:
                    "Resolved"
            };

            return (
                map[value] ||
                this.capitalizeWords(value)
            );
        },


        getStatusClass(status) {

            const value =
                String(status)
                    .toLowerCase();

            if (
                value.includes("complete") ||
                value.includes("approved") ||
                value.includes("resolved")
            ) {
                return "status-completed";
            }

            if (
                value.includes("reject")
            ) {
                return "status-rejected";
            }

            if (
                value.includes("cancel")
            ) {
                return "status-cancelled";
            }

            if (
                value.includes("process") ||
                value.includes("review")
            ) {
                return "status-processing";
            }

            return "status-pending";
        },


        canCancel(status) {

            const value =
                String(status)
                    .toLowerCase();

            return [
                "pending",
                "submitted",
                "for approval",
                "under review"
            ].includes(value);
        },


        isStatus(status, values) {

            const normalized =
                String(status || "")
                    .trim()
                    .toLowerCase();

            return values.includes(
                normalized
            );
        },


        /* =====================================================
           REQUEST DATA HELPERS
           ===================================================== */

        getRequestId(request) {

            return (
                request?.id ||
                request?.requestId ||
                request?.request_id ||
                request?.serviceRequestId ||
                request?.service_request_id ||
                request?.referenceNo ||
                ""
            );
        },


        getReferenceNumber(request) {

            return (
                request?.referenceNo ||
                request?.referenceNumber ||
                request?.reference ||
                request?.requestReference ||
                `REQ-${this.getRequestId(request) || "PENDING"}`
            );
        },


        getServiceName(request) {

            return (
                request?.serviceName ||
                request?.service ||
                request?.serviceType ||
                request?.certificateType ||
                request?.certificate ||
                "Barangay Service"
            );
        },


        /* =====================================================
           LOADING
           ===================================================== */

        setLoading(isLoading) {

            this.state.loading =
                isLoading;

            document
                .querySelectorAll(
                    "[data-request-loading]"
                )
                .forEach(element => {

                    element.style.display =
                        isLoading
                            ? ""
                            : "none";
                });
        },


        setFormLoading(
            form,
            isLoading
        ) {

            const button =
                form.querySelector(
                    'button[type="submit"]'
                );

            if (!button) {
                return;
            }

            if (isLoading) {

                button.dataset.originalText =
                    button.textContent;

                button.disabled =
                    true;

                button.textContent =
                    "Submitting...";

            } else {

                button.disabled =
                    false;

                button.textContent =
                    button.dataset.originalText ||
                    "Submit Request";
            }
        },


        /* =====================================================
           ALERTS
           ===================================================== */

        showSuccess(message) {

            this.showAlert(
                message,
                "success"
            );
        },


        showError(message) {

            this.showAlert(
                message,
                "error"
            );
        },


        showAlert(
            message,
            type
        ) {

            let alert =
                document.querySelector(
                    "[data-service-request-alert]"
                );


            if (!alert) {

                alert =
                    document.createElement(
                        "div"
                    );

                alert.setAttribute(
                    "data-service-request-alert",
                    ""
                );

                document.body.prepend(
                    alert
                );
            }


            alert.className =
                `dashboard-alert show ${type}`;

            alert.textContent =
                message;


            window.setTimeout(
                () => {

                    alert.classList.remove(
                        "show"
                    );

                },
                5000
            );
        },


        hideError() {

            const alert =
                document.querySelector(
                    "[data-service-request-alert]"
                );

            if (alert) {
                alert.classList.remove(
                    "show"
                );
            }
        },


        /* =====================================================
           CONFIRMATION
           ===================================================== */

        showConfirmation(data) {

            const reference =
                data?.referenceNo ||
                data?.referenceNumber ||
                data?.reference ||
                "";


            const confirmation =
                document.querySelector(
                    "[data-request-confirmation]"
                );


            if (!confirmation) {
                return;
            }


            const referenceElement =
                confirmation.querySelector(
                    "[data-confirmation-reference]"
                );


            if (referenceElement) {

                referenceElement.textContent =
                    reference ||
                    "Successfully Submitted";
            }


            confirmation.classList.add(
                "show"
            );
        },


        /* =====================================================
           UTILITY
           ===================================================== */

        setText(
            selector,
            value
        ) {

            document
                .querySelectorAll(selector)
                .forEach(element => {

                    element.textContent =
                        value;
                });
        },


        formatDate(value) {

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

            return new Intl.DateTimeFormat(
                "en-PH",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            ).format(date);
        },


        capitalizeWords(value) {

            return String(value)
                .replace(
                    /\w\S*/g,
                    word =>
                        word.charAt(0)
                            .toUpperCase() +
                        word.slice(1)
                            .toLowerCase()
                );
        },


        escapeHTML(value) {

            const div =
                document.createElement(
                    "div"
                );

            div.textContent =
                value ?? "";

            return div.innerHTML;
        }
    };


    /* =========================================================
       GLOBAL ACCESS
       ========================================================= */

    window.ServiceRequests =
        ServiceRequests;


    /* =========================================================
       MODAL CLOSE EVENTS
       ========================================================= */

    document.addEventListener(
        "click",
        event => {

            if (
                event.target.matches(
                    "[data-close-request-modal]"
                )
            ) {

                ServiceRequests
                    .closeRequestModal();
            }


            if (
                event.target.matches(
                    "#requestDetailsModal"
                )
            ) {

                ServiceRequests
                    .closeRequestModal();
            }
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                ServiceRequests
                    .closeRequestModal();
            }
        }
    );


    /* =========================================================
       AUTO INITIALIZATION
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            /*
             * Only initialize when this module's page exists.
             */
            if (
                document.querySelector(
                    "[data-service-requests]"
                ) ||
                document.querySelector(
                    "#serviceRequestForm"
                )
            ) {

                ServiceRequests.init();
            }
        }
    );

})();
