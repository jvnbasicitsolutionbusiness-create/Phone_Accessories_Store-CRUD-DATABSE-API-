/* StockFlow API client - inventory modules */
const StockFlowInventoryAPI = (() => {
  const req = (payload) => StockFlowAPI.request(payload);
  return {
    products: {
      list: q => req({action:"listProducts", q:q||""}),
      save: d => req({action:"saveProduct", ...d}),
      delete: id => req({action:"deleteProduct", id})
    },
    categories: {
      list: () => req({action:"listCategories"}),
      save: d => req({action:"saveCategory", ...d}),
      delete: id => req({action:"deleteCategory", id})
    },
    suppliers: {
      list: () => req({action:"listSuppliers"}),
      save: d => req({action:"saveSupplier", ...d}),
      delete: id => req({action:"deleteSupplier", id})
    },
    stockIn: d => req({action:"stockIn", ...d}),
    stockOut: d => req({action:"stockOut", ...d}),
    transactions: type => req({action:"listTransactions", type}),
    stats: () => req({action:"dashboardStats"}),
    activity: () => req({action:"listActivity"})
  };
})();
