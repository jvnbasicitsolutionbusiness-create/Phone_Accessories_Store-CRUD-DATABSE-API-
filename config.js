/* STOCKFLOW CONFIGURATION */
const STOCKFLOW_CONFIG = Object.freeze({
  APP_NAME: "StockFlow",
  API_URL: "https://script.google.com/macros/s/AKfycbytfBA-SJDFkD8QlzHqpl65Lqg4CXkLfAZV2vec1Y36RcuIKbcwOER8jgDhIDeHtlgefw/exec",
  FIREBASE_URL: "https://midtermexamproject-default-rtdb.firebaseio.com/",
  SESSION_KEY: "stockflow_session",
  USER_KEY: "stockflow_user",
  OTP_KEY: "stockflow_otp_identity",
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  INVENTORY_LOW_STOCK_DEFAULT: 5,
  REQUEST_TIMEOUT_MS: 20000,
  CURRENCY: "PHP",
  ROUTES: {
    login: "login.html",
    register: "auth.html#register",
    verify: "verify-otp.html",
    forgot: "forgotpassword.html",
    dashboard: "dashboard.html",
    inventory: "inventory.html",
    products: "products.html",
    stockIn: "stock-in.html",
    stockOut: "stock-out.html",
    transactions: "transactions.html",
    suppliers: "suppliers.html",
    categories: "categories.html",
    activity: "activity.html",
    profile: "profile.html",
    settings: "settings.html"
  }
});
window.STOCKFLOW_CONFIG = STOCKFLOW_CONFIG;
