// ============================================================
// STOCKFLOW INVENTORY MODULE
// Google Sheets-backed inventory operations.
// Each module uses its own sheet and stable headers.
// ============================================================

const SF_INV={
  PRODUCTS:["ID","SKU","NAME","CATEGORY","SUPPLIER","PRICE","COST","STOCK","REORDER_LEVEL","STATUS","CREATED_AT","UPDATED_AT"],
  CATEGORIES:["ID","NAME","DESCRIPTION","STATUS","CREATED_AT","UPDATED_AT"],
  SUPPLIERS:["ID","NAME","CONTACT_PERSON","PHONE","EMAIL","ADDRESS","STATUS","CREATED_AT","UPDATED_AT"],
  TRANSACTIONS:["ID","TYPE","PRODUCT_ID","SKU","PRODUCT_NAME","QUANTITY","UNIT_COST","TOTAL","REFERENCE","SUPPLIER","NOTE","USER","DATE"],
  ACTIVITY:["ID","ACTION","MODULE","REFERENCE","USER","DETAILS","DATE"]
};
function SFInv_sheet(n,h){return sheet(n,h)}
function SFInv_now(){return new Date()}
function SFInv_id(prefix){return prefix+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,7)}
function SFInv_rows(n,h){return rows(SFInv_sheet(n,h))}
function SFInv_obj(r,h){const o={};h.forEach((k,i)=>o[k]=r[i]);return o}
function SFInv_find(n,h,id){const s=SFInv_sheet(n,h),rs=rows(s);for(let i=0;i<rs.length;i++)if(String(rs[i][0])===String(id))return{s,row:i+2,values:rs[i]};return null}
function SFInv_activity(action,module,ref,user,details){const s=SFInv_sheet("ACTIVITY",SF_INV.ACTIVITY);s.appendRow([SFInv_id("ACT"),action,module,ref,user||"System",details||"",SFInv_now()])}
function SFInv_user(d){try{return requireSession(d).username||"System"}catch(e){return "System"}}

function SFInv_listUsers(){const s=sheet(USER_SHEET,USER_HEADERS);return {success:true,users:rows(s).map(r=>({uid:r[0],name:r[1],username:r[2],age:r[4],status:r[5],gmail:r[6],phone:r[7],role:r[8],verified:r[9]===true,createdAt:r[15],lastLogin:r[18]}))}}

function SFInv_listProducts(){
 const rs=SFInv_rows("PRODUCTS",SF_INV.PRODUCTS);return {success:true,products:rs.map(r=>SFInv_obj(r,SF_INV.PRODUCTS))}
}
function SFInv_saveProduct(d){
 const h=SF_INV.PRODUCTS,s=SFInv_sheet("PRODUCTS",h),id=clean(d.id)||SFInv_id("PRD"),now=SFInv_now(),existing=SFInv_find("PRODUCTS",h,id);
 const vals=[id,clean(d.sku),clean(d.name),clean(d.category),clean(d.supplier),Number(d.price)||0,Number(d.cost)||0,Math.max(0,Number(d.stock)||0),Math.max(0,Number(d.reorderLevel)||5),clean(d.status)||"ACTIVE",existing?existing.values[10]:now,now];
 if(!vals[1]||!vals[2])return {success:false,message:"SKU and product name are required."};
 if(existing)s.getRange(existing.row,1,1,h.length).setValues([vals]);else s.appendRow(vals);
 SFInv_activity(existing?"UPDATE":"CREATE","Products",id,SFInv_user(d),vals[2]+" ("+vals[1]+")");
 return {success:true,product:SFInv_obj(vals,h),message:existing?"Product updated.":"Product created."}
}
function SFInv_deleteProduct(d){
 const f=SFInv_find("PRODUCTS",SF_INV.PRODUCTS,d.id);if(!f)return{success:false,message:"Product not found."};f.s.deleteRow(f.row);SFInv_activity("DELETE","Products",d.id,SFInv_user(d),"Product deleted");return{success:true,message:"Product deleted."}
}
function SFInv_listCategories(){return{success:true,categories:SFInv_rows("CATEGORIES",SF_INV.CATEGORIES).map(r=>SFInv_obj(r,SF_INV.CATEGORIES))}}
function SFInv_saveCategory(d){
 const h=SF_INV.CATEGORIES,s=SFInv_sheet("CATEGORIES",h),id=clean(d.id)||SFInv_id("CAT"),ex=SFInv_find("CATEGORIES",h,id),now=SFInv_now(),v=[id,clean(d.name),clean(d.description),clean(d.status)||"ACTIVE",ex?ex.values[4]:now,now];if(!v[1])return{success:false,message:"Category name is required."};if(ex)s.getRange(ex.row,1,1,h.length).setValues([v]);else s.appendRow(v);SFInv_activity(ex?"UPDATE":"CREATE","Categories",id,SFInv_user(d),v[1]);return{success:true,category:SFInv_obj(v,h)}}
function SFInv_deleteCategory(d){const f=SFInv_find("CATEGORIES",SF_INV.CATEGORIES,d.id);if(!f)return{success:false,message:"Category not found."};f.s.deleteRow(f.row);return{success:true,message:"Category deleted."}}
function SFInv_listSuppliers(){return{success:true,suppliers:SFInv_rows("SUPPLIERS",SF_INV.SUPPLIERS).map(r=>SFInv_obj(r,SF_INV.SUPPLIERS))}}
function SFInv_saveSupplier(d){
 const h=SF_INV.SUPPLIERS,s=SFInv_sheet("SUPPLIERS",h),id=clean(d.id)||SFInv_id("SUP"),ex=SFInv_find("SUPPLIERS",h,id),now=SFInv_now(),v=[id,clean(d.name),clean(d.contactPerson),clean(d.phone),clean(d.email),clean(d.address),clean(d.status)||"ACTIVE",ex?ex.values[7]:now,now];if(!v[1])return{success:false,message:"Supplier name is required."};if(ex)s.getRange(ex.row,1,1,h.length).setValues([v]);else s.appendRow(v);SFInv_activity(ex?"UPDATE":"CREATE","Suppliers",id,SFInv_user(d),v[1]);return{success:true,supplier:SFInv_obj(v,h)}}

function SFInv_deleteSupplier(d){const f=SFInv_find("SUPPLIERS",SF_INV.SUPPLIERS,d.id);if(!f)return{success:false,message:"Supplier not found."};f.s.deleteRow(f.row);return{success:true,message:"Supplier deleted."}}

function SFInv_stock(d,type){
 const ph=SF_INV.PRODUCTS,th=SF_INV.TRANSACTIONS,s=SFInv_sheet("PRODUCTS",ph),p=SFInv_find("PRODUCTS",ph,d.productId),qty=Number(d.quantity);
 if(!p)return{success:false,message:"Product not found."};if(!Number.isInteger(qty)||qty<=0)return{success:false,message:"Quantity must be a positive whole number."};
 let stock=Number(p.values[7])||0;if(type==="STOCK_OUT"&&qty>stock)return{success:false,message:"Insufficient stock. Available: "+stock};
 stock=type==="STOCK_IN"?stock+qty:stock-qty;s.getRange(p.row,8).setValue(stock);s.getRange(p.row,12).setValue(SFInv_now());
 const ref=clean(d.reference)||SFInv_id(type==="STOCK_IN"?"SIN":"SOUT"),cost=Number(d.unitCost)||Number(p.values[6])||0;
 const ts=SFInv_sheet("TRANSACTIONS",th);ts.appendRow([SFInv_id("TX"),type,p.values[0],p.values[1],p.values[2],qty,cost,qty*cost,ref,clean(d.supplier),clean(d.note),SFInv_user(d),SFInv_now()]);
 SFInv_activity(type,type==="STOCK_IN"?"Stock-In":"Stock-Out",ref,SFInv_user(d),p.values[2]+" × "+qty+" | stock now "+stock);
 return{success:true,reference:ref,stock,product:SFInv_obj(s.getRange(p.row,1,1,ph.length).getValues()[0],ph),message:type==="STOCK_IN"?"Stock received successfully.":"Stock released successfully."}
}
function SFInv_stockIn(d){return SFInv_stock(d,"STOCK_IN")}
function SFInv_stockOut(d){return SFInv_stock(d,"STOCK_OUT")}
function SFInv_listTransactions(d){let a=SFInv_rows("TRANSACTIONS",SF_INV.TRANSACTIONS).map(r=>SFInv_obj(r,SF_INV.TRANSACTIONS));if(d&&d.type)a=a.filter(x=>x.TYPE===d.type);return{success:true,transactions:a.reverse()}}
function SFInv_listActivity(){return{success:true,activity:SFInv_rows("ACTIVITY",SF_INV.ACTIVITY).map(r=>SFInv_obj(r,SF_INV.ACTIVITY)).reverse()}}
function SFInv_dashboardStats(){
 const p=SFInv_rows("PRODUCTS",SF_INV.PRODUCTS),t=SFInv_rows("TRANSACTIONS",SF_INV.TRANSACTIONS),a=SFInv_rows("ACTIVITY",SF_INV.ACTIVITY);
 let total=0,low=0,out=0;p.forEach(r=>{const st=Number(r[7])||0,re=Number(r[8])||5;total+=st;if(st===0)out++;else if(st<=re)low++});
 return{success:true,stats:{products:p.length,totalStock:total,lowStock:low,outOfStock:out},recentTransactions:t.slice(-8).reverse().map(r=>SFInv_obj(r,SF_INV.TRANSACTIONS)),recentActivity:a.slice(-8).reverse().map(r=>SFInv_obj(r,SF_INV.ACTIVITY))}
}
function SFInv_dispatch(a,d){
 try{requireSession(d)}catch(e){return{success:false,message:"Please sign in again."}}
 switch(a){
  case"listProducts":return SFInv_listProducts();case"saveProduct":return SFInv_saveProduct(d);case"deleteProduct":return SFInv_deleteProduct(d);
  case"listCategories":return SFInv_listCategories();case"saveCategory":return SFInv_saveCategory(d);case"deleteCategory":return SFInv_deleteCategory(d);
  case"listSuppliers":return SFInv_listSuppliers();case"saveSupplier":return SFInv_saveSupplier(d);case"deleteSupplier":return SFInv_deleteSupplier(d);
  case"stockIn":return SFInv_stockIn(d);case"stockOut":return SFInv_stockOut(d);case"listTransactions":return SFInv_listTransactions(d);case"listActivity":return SFInv_listActivity();case"dashboardStats":return SFInv_dashboardStats();
  default:return{success:false,message:"Unknown STOCKFLOW action: "+a};
 }
}
