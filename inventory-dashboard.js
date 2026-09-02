document.addEventListener("DOMContentLoaded", async () => {
"use strict";
const cards=document.getElementById("dashboardCards"), health=document.getElementById("health"), alertBox=document.getElementById("alert");
const alert=(m,t="error")=>{alertBox.textContent=m||"";alertBox.className="sf-alert show "+t;};
try{
 const user=await StockFlowAuth.requireAuth(); if(!user)return;
 const r=await StockFlowAPI.dashboardStats();
 if(!r?.success) throw new Error(r?.message||"Unable to load inventory dashboard.");
 const s=r.stats||{}, products=Number(s.products||0), total=Number(s.totalStock||0), low=Number(s.lowStock||0), out=Number(s.outOfStock||0);
 cards.innerHTML=`<div class="mini-stat"><small>PRODUCTS</small><strong>${products}</strong></div>
 <div class="mini-stat"><small>TOTAL UNITS</small><strong>${total}</strong></div>
 <div class="mini-stat"><small>LOW STOCK</small><strong>${low}</strong></div>
 <div class="mini-stat"><small>OUT OF STOCK</small><strong>${out}</strong></div>`;
 if(out>0) health.innerHTML=`<strong>Attention required.</strong> ${out} product${out===1?"":"s"} currently ${out===1?"is":"are"} out of stock.<br><a href="inventory.html">Review inventory</a>`;
 else if(low>0) health.innerHTML=`<strong>Inventory needs monitoring.</strong> ${low} product${low===1?"":"s"} ${low===1?"is":"are"} at or below the reorder level.<br><a href="stock-in.html">Record stock in</a>`;
 else health.innerHTML=`<strong>Inventory is healthy.</strong> All currently recorded products are above their reorder levels.`;
}catch(e){console.error(e);alert(e.message||"Unable to load inventory dashboard.");health.textContent="Inventory health is currently unavailable.";}
});