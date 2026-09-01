/* ============================================================
   STOCKFLOW | INVENTORY MODULE BACKEND
   Google Apps Script
   ------------------------------------------------------------
   Add this file's functions to your existing Code.gs OR replace
   the old Code.gs with the complete backend version supplied
   with your authentication code plus these inventory functions.
   ============================================================ */

const SF_INVENTORY = {
  PRODUCTS: "PRODUCTS",
  CATEGORIES: "CATEGORIES",
  SUPPLIERS: "SUPPLIERS",
  STOCK_IN: "STOCK_IN",
  STOCK_OUT: "STOCK_OUT",
  ACTIVITY: "ACTIVITY_LOG"
};

const SF_HEADERS = {
  PRODUCTS: ["ID","SKU","NAME","CATEGORY_ID","CATEGORY","SUPPLIER_ID","SUPPLIER","PRICE","COST","STOCK","REORDER_LEVEL","STATUS","IMAGE_URL","CREATED_AT","UPDATED_AT"],
  CATEGORIES: ["ID","NAME","DESCRIPTION","STATUS","CREATED_AT","UPDATED_AT"],
  SUPPLIERS: ["ID","NAME","CONTACT_PERSON","PHONE","EMAIL","ADDRESS","STATUS","CREATED_AT","UPDATED_AT"],
  STOCK_IN: ["ID","PRODUCT_ID","SKU","PRODUCT","QTY","UNIT_COST","TOTAL_COST","SUPPLIER_ID","SUPPLIER","REFERENCE","DATE","REMARKS","CREATED_BY","CREATED_AT"],
  STOCK_OUT: ["ID","PRODUCT_ID","SKU","PRODUCT","QTY","REASON","REFERENCE","DATE","REMARKS","CREATED_BY","CREATED_AT"],
  ACTIVITY: ["ID","ACTION","MODULE","RECORD_ID","DETAILS","USERNAME","ROLE","CREATED_AT"]
};

function sfJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sfNow_(){ return new Date(); }
function sfId_(prefix){ return prefix + "_" + Utilities.getUuid(); }

function sfSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const headers = SF_HEADERS[name];
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function sfValues_(name) {
  const sh = sfSheet_(name);
  const last = sh.getLastRow();
  return last < 2 ? [] : sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
}

function sfMap_(headers) {
  const m = {};
  headers.forEach((h,i)=>m[String(h).trim().toUpperCase()] = i);
  return m;
}

function sfRows_(name) {
  const headers = SF_HEADERS[name];
  const m = sfMap_(headers);
  return {sheet: sfSheet_(name), rows: sfValues_(name), map:m};
}

function sfText_(v){ return String(v == null ? "" : v).trim(); }
function sfNum_(v){ const n=Number(v); return Number.isFinite(n) ? n : 0; }
function sfBool_(v){ return String(v).toUpperCase()==="YES" || v===true; }

function sfFindById_(name,id){
  const x=sfRows_(name);
  const target=sfText_(id);
  for(let i=0;i<x.rows.length;i++){
    if(sfText_(x.rows[i][x.map.ID])===target)
      return {row:x.rows[i], rowNumber:i+2, sheet:x.sheet, map:x.map};
  }
  return null;
}

function sfWriteRow_(sheet,rowNumber,row){
  sheet.getRange(rowNumber,1,1,row.length).setValues([row]);
}

function sfPublicProduct_(r,m){
  return {
    id:r[m.ID], sku:r[m.SKU], name:r[m.NAME], categoryId:r[m.CATEGORY_ID],
    category:r[m.CATEGORY], supplierId:r[m.SUPPLIER_ID], supplier:r[m.SUPPLIER],
    price:r[m.PRICE], cost:r[m.COST], stock:r[m.STOCK], reorderLevel:r[m.REORDER_LEVEL],
    status:r[m.STATUS], imageUrl:r[m.IMAGE_URL], createdAt:r[m.CREATED_AT], updatedAt:r[m.UPDATED_AT]
  };
}

function sfPublicCategory_(r,m){ return {id:r[m.ID],name:r[m.NAME],description:r[m.DESCRIPTION],status:r[m.STATUS],createdAt:r[m.CREATED_AT],updatedAt:r[m.UPDATED_AT]}; }
function sfPublicSupplier_(r,m){ return {id:r[m.ID],name:r[m.NAME],contactPerson:r[m.CONTACT_PERSON],phone:r[m.PHONE],email:r[m.EMAIL],address:r[m.ADDRESS],status:r[m.STATUS],createdAt:r[m.CREATED_AT],updatedAt:r[m.UPDATED_AT]}; }

function sfLog_(action,module,recordId,details,data){
  const sh=sfSheet_(SF_INVENTORY.ACTIVITY);
  sh.appendRow([sfId_("act"),action,module,recordId,details,
    sfText_(data.username || data.createdBy || "system"),
    sfText_(data.role || "system"),sfNow_()]);
}

function sfRequireFields_(obj, fields){
  return fields.every(k=>sfText_(obj[k]));
}

/* ---------- PRODUCTS ---------- */
function sfListProducts_(data){
  const x=sfRows_("PRODUCTS");
  let products=x.rows.map(r=>sfPublicProduct_(r,x.map));
  const q=sfText_(data.q).toLowerCase();
  if(q) products=products.filter(p =>
    [p.sku,p.name,p.category,p.supplier].some(v=>sfText_(v).toLowerCase().includes(q))
  );
  return sfJson_({success:true,products});
}

function sfSaveProduct_(data){
  if(!sfRequireFields_(data,["name","sku","categoryId"])) return sfJson_({success:false,message:"SKU, product name and category are required."});
  const x=sfRows_("PRODUCTS"), sku=sfText_(data.sku).toLowerCase(), id=sfText_(data.id);
  for(let i=0;i<x.rows.length;i++){
    if(sfText_(x.rows[i][x.map.SKU]).toLowerCase()===sku && sfText_(x.rows[i][x.map.ID])!==id)
      return sfJson_({success:false,message:"SKU already exists."});
  }
  const cat=sfFindById_("CATEGORIES",data.categoryId);
  if(!cat) return sfJson_({success:false,message:"Selected category does not exist."});
  const now=sfNow_();
  const productId=id || sfId_("prd");
  const existing=id ? sfFindById_("PRODUCTS",id) : null;
  const row=Array(SF_HEADERS.PRODUCTS.length).fill("");
  row[x.map.ID]=productId; row[x.map.SKU]=sfText_(data.sku); row[x.map.NAME]=sfText_(data.name);
  row[x.map.CATEGORY_ID]=cat.row[cat.map.ID]; row[x.map.CATEGORY]=cat.row[cat.map.NAME];
  row[x.map.SUPPLIER_ID]=sfText_(data.supplierId); row[x.map.SUPPLIER]=sfText_(data.supplier);
  row[x.map.PRICE]=sfNum_(data.price); row[x.map.COST]=sfNum_(data.cost);
  row[x.map.STOCK]=existing ? sfNum_(existing.row[x.map.STOCK]) : Math.max(0,sfNum_(data.stock));
  row[x.map.REORDER_LEVEL]=Math.max(0,sfNum_(data.reorderLevel));
  row[x.map.STATUS]=sfText_(data.status)||"ACTIVE"; row[x.map.IMAGE_URL]=sfText_(data.imageUrl);
  row[x.map.CREATED_AT]=existing ? existing.row[x.map.CREATED_AT] : now; row[x.map.UPDATED_AT]=now;
  if(existing) sfWriteRow_(x.sheet,existing.rowNumber,row); else x.sheet.appendRow(row);
  sfLog_(existing?"UPDATE":"CREATE","PRODUCTS",productId,existing?"Product updated":"Product created",data);
  return sfJson_({success:true,product:sfPublicProduct_(row,x.map)});
}

function sfDeleteProduct_(data){
  const f=sfFindById_("PRODUCTS",data.id);
  if(!f) return sfJson_({success:false,message:"Product not found."});
  if(sfNum_(f.row[f.map.STOCK])>0) return sfJson_({success:false,message:"Cannot delete a product with remaining stock. Set it to INACTIVE instead."});
  f.sheet.deleteRow(f.rowNumber); sfLog_("DELETE","PRODUCTS",data.id,"Product deleted",data);
  return sfJson_({success:true,message:"Product deleted."});
}

/* ---------- CATEGORIES ---------- */
function sfListCategories_(){
  const x=sfRows_("CATEGORIES");
  return sfJson_({success:true,categories:x.rows.map(r=>sfPublicCategory_(r,x.map))});
}
function sfSaveCategory_(data){
  if(!sfText_(data.name)) return sfJson_({success:false,message:"Category name is required."});
  const x=sfRows_("CATEGORIES"), id=sfText_(data.id), name=sfText_(data.name).toLowerCase();
  for(const r of x.rows) if(sfText_(r[x.map.NAME]).toLowerCase()===name && sfText_(r[x.map.ID])!==id) return sfJson_({success:false,message:"Category already exists."});
  const f=id?sfFindById_("CATEGORIES",id):null, now=sfNow_(), row=Array(SF_HEADERS.CATEGORIES.length).fill("");
  row[x.map.ID]=id||sfId_("cat"); row[x.map.NAME]=sfText_(data.name); row[x.map.DESCRIPTION]=sfText_(data.description);
  row[x.map.STATUS]=sfText_(data.status)||"ACTIVE"; row[x.map.CREATED_AT]=f?f.row[x.map.CREATED_AT]:now; row[x.map.UPDATED_AT]=now;
  if(f) sfWriteRow_(x.sheet,f.rowNumber,row); else x.sheet.appendRow(row);
  sfLog_(f?"UPDATE":"CREATE","CATEGORIES",row[x.map.ID],f?"Category updated":"Category created",data);
  return sfJson_({success:true,category:sfPublicCategory_(row,x.map)});
}
function sfDeleteCategory_(data){
  const f=sfFindById_("CATEGORIES",data.id); if(!f) return sfJson_({success:false,message:"Category not found."});
  const products=sfValues_("PRODUCTS"), pm=sfMap_(SF_HEADERS.PRODUCTS);
  if(products.some(r=>sfText_(r[pm.CATEGORY_ID])===sfText_(data.id))) return sfJson_({success:false,message:"Category is in use by products."});
  f.sheet.deleteRow(f.rowNumber); sfLog_("DELETE","CATEGORIES",data.id,"Category deleted",data);
  return sfJson_({success:true,message:"Category deleted."});
}

/* ---------- SUPPLIERS ---------- */
function sfListSuppliers_(){ const x=sfRows_("SUPPLIERS"); return sfJson_({success:true,suppliers:x.rows.map(r=>sfPublicSupplier_(r,x.map))}); }
function sfSaveSupplier_(data){
  if(!sfText_(data.name)) return sfJson_({success:false,message:"Supplier name is required."});
  const x=sfRows_("SUPPLIERS"), id=sfText_(data.id), f=id?sfFindById_("SUPPLIERS",id):null, now=sfNow_(), row=Array(SF_HEADERS.SUPPLIERS.length).fill("");
  row[x.map.ID]=id||sfId_("sup"); row[x.map.NAME]=sfText_(data.name); row[x.map.CONTACT_PERSON]=sfText_(data.contactPerson);
  row[x.map.PHONE]=sfText_(data.phone); row[x.map.EMAIL]=sfText_(data.email); row[x.map.ADDRESS]=sfText_(data.address);
  row[x.map.STATUS]=sfText_(data.status)||"ACTIVE"; row[x.map.CREATED_AT]=f?f.row[x.map.CREATED_AT]:now; row[x.map.UPDATED_AT]=now;
  if(f) sfWriteRow_(x.sheet,f.rowNumber,row); else x.sheet.appendRow(row);
  sfLog_(f?"UPDATE":"CREATE","SUPPLIERS",row[x.map.ID],f?"Supplier updated":"Supplier created",data);
  return sfJson_({success:true,supplier:sfPublicSupplier_(row,x.map)});
}
function sfDeleteSupplier_(data){
  const f=sfFindById_("SUPPLIERS",data.id); if(!f) return sfJson_({success:false,message:"Supplier not found."});
  const products=sfValues_("PRODUCTS"), pm=sfMap_(SF_HEADERS.PRODUCTS);
  if(products.some(r=>sfText_(r[pm.SUPPLIER_ID])===sfText_(data.id))) return sfJson_({success:false,message:"Supplier is in use by products."});
  f.sheet.deleteRow(f.rowNumber); sfLog_("DELETE","SUPPLIERS",data.id,"Supplier deleted",data);
  return sfJson_({success:true,message:"Supplier deleted."});
}

/* ---------- STOCK IN ---------- */
function sfStockIn_(data){
  const product=sfFindById_("PRODUCTS",data.productId);
  const qty=Math.floor(sfNum_(data.qty));
  if(!product) return sfJson_({success:false,message:"Product not found."});
  if(qty<=0) return sfJson_({success:false,message:"Quantity must be greater than zero."});
  const unitCost=Math.max(0,sfNum_(data.unitCost));
  const now=sfNow_(), x=sfRows_("STOCK_IN"), row=Array(SF_HEADERS.STOCK_IN.length).fill("");
  row[x.map.ID]=sfId_("sin"); row[x.map.PRODUCT_ID]=product.row[product.map.ID]; row[x.map.SKU]=product.row[product.map.SKU];
  row[x.map.PRODUCT]=product.row[product.map.NAME]; row[x.map.QTY]=qty; row[x.map.UNIT_COST]=unitCost; row[x.map.TOTAL_COST]=qty*unitCost;
  row[x.map.SUPPLIER_ID]=sfText_(data.supplierId); row[x.map.SUPPLIER]=sfText_(data.supplier);
  row[x.map.REFERENCE]=sfText_(data.reference); row[x.map.DATE]=data.date?new Date(data.date):now; row[x.map.REMARKS]=sfText_(data.remarks);
  row[x.map.CREATED_BY]=sfText_(data.username)||"system"; row[x.map.CREATED_AT]=now; x.sheet.appendRow(row);
  const newStock=sfNum_(product.row[product.map.STOCK])+qty;
  product.sheet.getRange(product.rowNumber,product.map.STOCK+1).setValue(newStock);
  product.sheet.getRange(product.rowNumber,product.map.COST+1).setValue(unitCost);
  product.sheet.getRange(product.rowNumber,product.map.UPDATED_AT+1).setValue(now);
  sfLog_("STOCK_IN","STOCK",row[x.map.ID],"Stock received: "+qty+" x "+product.row[product.map.NAME],data);
  return sfJson_({success:true,message:"Stock-in recorded.",newStock});
}

/* ---------- STOCK OUT ---------- */
function sfStockOut_(data){
  const product=sfFindById_("PRODUCTS",data.productId);
  const qty=Math.floor(sfNum_(data.qty));
  if(!product) return sfJson_({success:false,message:"Product not found."});
  if(qty<=0) return sfJson_({success:false,message:"Quantity must be greater than zero."});
  const current=sfNum_(product.row[product.map.STOCK]);
  if(qty>current) return sfJson_({success:false,message:"Insufficient stock. Available: "+current+"."});
  const now=sfNow_(), x=sfRows_("STOCK_OUT"), row=Array(SF_HEADERS.STOCK_OUT.length).fill("");
  row[x.map.ID]=sfId_("sout"); row[x.map.PRODUCT_ID]=product.row[product.map.ID]; row[x.map.SKU]=product.row[product.map.SKU];
  row[x.map.PRODUCT]=product.row[product.map.NAME]; row[x.map.QTY]=qty; row[x.map.REASON]=sfText_(data.reason)||"SALE";
  row[x.map.REFERENCE]=sfText_(data.reference); row[x.map.DATE]=data.date?new Date(data.date):now; row[x.map.REMARKS]=sfText_(data.remarks);
  row[x.map.CREATED_BY]=sfText_(data.username)||"system"; row[x.map.CREATED_AT]=now; x.sheet.appendRow(row);
  const newStock=current-qty;
  product.sheet.getRange(product.rowNumber,product.map.STOCK+1).setValue(newStock);
  product.sheet.getRange(product.rowNumber,product.map.UPDATED_AT+1).setValue(now);
  sfLog_("STOCK_OUT","STOCK",row[x.map.ID],"Stock released: "+qty+" x "+product.row[product.map.NAME],data);
  return sfJson_({success:true,message:"Stock-out recorded.",newStock});
}

/* ---------- TRANSACTIONS / REPORTS ---------- */
function sfListTransactions_(data){
  const type=sfText_(data.type).toUpperCase(), name=type==="IN"?"STOCK_IN":type==="OUT"?"STOCK_OUT":"";
  if(!name) return sfJson_({success:false,message:"Transaction type must be IN or OUT."});
  const x=sfRows_(name);
  const records=x.rows.map(r=>{const o={}; SF_HEADERS[name].forEach((h,i)=>o[h]=r[i]); return o;});
  return sfJson_({success:true,records});
}
function sfDashboardStats_(){
  const p=sfValues_("PRODUCTS"), pm=sfMap_(SF_HEADERS.PRODUCTS);
  const c=sfValues_("CATEGORIES"), s=sfValues_("SUPPLIERS");
  let total=0,low=0,out=0;
  p.forEach(r=>{const stock=sfNum_(r[pm.STOCK]), reorder=sfNum_(r[pm.REORDER_LEVEL]); total+=stock; if(stock===0)out++; else if(stock<=reorder)low++;});
  return sfJson_({success:true,stats:{products:p.length,categories:c.length,suppliers:s.length,totalStock:total,lowStock:low,outOfStock:out}});
}
function sfListActivity_(){
  const x=sfRows_("ACTIVITY"), rows=x.rows.slice(-200).reverse();
  return sfJson_({success:true,activities:rows.map(r=>({id:r[0],action:r[1],module:r[2],recordId:r[3],details:r[4],username:r[5],role:r[6],createdAt:r[7]}))});
}

/* ---------- ROUTER ---------- */
function inventoryDoPost_(data){
  try{
    switch(sfText_(data.action)){
      case "listProducts": return sfListProducts_(data);
      case "saveProduct": return sfSaveProduct_(data);
      case "deleteProduct": return sfDeleteProduct_(data);
      case "listCategories": return sfListCategories_();
      case "saveCategory": return sfSaveCategory_(data);
      case "deleteCategory": return sfDeleteCategory_(data);
      case "listSuppliers": return sfListSuppliers_();
      case "saveSupplier": return sfSaveSupplier_(data);
      case "deleteSupplier": return sfDeleteSupplier_(data);
      case "stockIn": return sfStockIn_(data);
      case "stockOut": return sfStockOut_(data);
      case "listTransactions": return sfListTransactions_(data);
      case "dashboardStats": return sfDashboardStats_();
      case "listActivity": return sfListActivity_();
      default: return null;
    }
  }catch(err){
    return sfJson_({success:false,message:err && err.message ? err.message : "Inventory server error."});
  }
}
