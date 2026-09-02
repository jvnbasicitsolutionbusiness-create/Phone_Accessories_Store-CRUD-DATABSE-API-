/* STOCKFLOW CENTRAL API CLIENT */
(function () {
  "use strict";
  const C = window.STOCKFLOW_CONFIG;
  async function request(payload, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || C.REQUEST_TIMEOUT_MS);
    try {
      const body = JSON.stringify(Object.assign({}, payload, { token: sessionStorage.getItem(C.SESSION_KEY) || "" }));
      const res = await fetch(C.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        signal: controller.signal
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { throw new Error("Backend returned an invalid response."); }
      if (!data || typeof data !== "object") throw new Error("Invalid backend response.");
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw new Error("Request timed out. Check your internet connection.");
      throw e;
    } finally { clearTimeout(timer); }
  }
  const api = {
    request,
    health: () => fetch(C.API_URL + "?action=health", { cache: "no-store" }).then(r => r.json()),
    token: () => sessionStorage.getItem(C.SESSION_KEY) || "",
    saveToken: t => t && sessionStorage.setItem(C.SESSION_KEY, t),
    clearToken: () => sessionStorage.removeItem(C.SESSION_KEY),
    register: d => request({action:"register", ...d}),
    registerAdmin: d => request({action:"registerAdmin", ...d}),
    login: d => request({action:"login", ...d}),
    verifyOtp: d => request({action:"verifyOtp", ...d}),
    resendOtp: d => request({action:"resendOtp", ...d}),
    requestOtp: d => request({action:"requestOtp", ...d}),
    forgotPassword: d => request({action:"forgotPassword", ...d}),
    verifyRecoveryOtp: d => request({action:"verifyRecoveryOtp", ...d}),
    resetPassword: d => request({action:"resetPassword", ...d}),
    session: () => request({action:"session"}),
    logout: () => request({action:"logout"}),
    getUser: d => request({action:"getUser", ...d}),
    updateStatus: (username,status) => request({action:"updateStatus",username,status}),
    listUsers: () => request({action:"listUsers"}),
    dashboardStats: () => request({action:"dashboardStats"}),
    listProducts: d => request({action:"listProducts", ...d}),
    saveProduct: d => request({action:"saveProduct", ...d}),
    deleteProduct: id => request({action:"deleteProduct", id}),
    listCategories: () => request({action:"listCategories"}),
    saveCategory: d => request({action:"saveCategory", ...d}),
    deleteCategory: id => request({action:"deleteCategory", id}),
    listSuppliers: () => request({action:"listSuppliers"}),
    saveSupplier: d => request({action:"saveSupplier", ...d}),
    deleteSupplier: id => request({action:"deleteSupplier", id}),
    stockIn: d => request({action:"stockIn", ...d}),
    stockOut: d => request({action:"stockOut", ...d}),
    listTransactions: d => request({action:"listTransactions", ...d}),
    listActivity: d => request({action:"listActivity", ...d})
  };
  window.StockFlowAPI = api;
  window.API = api;
})();
