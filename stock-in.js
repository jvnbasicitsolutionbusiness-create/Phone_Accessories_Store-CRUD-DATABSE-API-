document.addEventListener("DOMContentLoaded",async()=>{
"use strict";const $=id=>document.getElementById(id),form=$("stockInForm"),select=$("productId"),current=$("current"),a=$("alert"),btn=$("saveButton");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const alert=(m,t="error")=>{a.textContent=m||"";a.className="sf-alert show "+t;};let products=[];
const load=async()=>{const r=await StockFlowAPI.listProducts();if(!r?.success)throw new Error(r?.message||"Unable to load products.");products=r.products||[];
select.innerHTML='<option value="">Select product</option>'+products.filter(p=>String(p.STATUS||"ACTIVE").toUpperCase()==="ACTIVE").map(p=>`<option value="${esc(p.ID)}">${esc(p.SKU)} — ${esc(p.NAME)} (stock: ${Number(p.STOCK||0)})</option>`).join("");
current.innerHTML=products.length?products.map(p=>`<div class="sf-list-item"><strong>${esc(p.NAME)}</strong><span>${Number(p.STOCK||0)} units</span></div>`).join(""):'<div class="sf-empty">No products available. <a href="products.html">Add a product</a></div>';};
try{const u=await StockFlowAuth.requireAuth();if(!u)return;await load();form.onsubmit=async e=>{e.preventDefault();btn.disabled=true;try{
const selected=products.find(p=>String(p.ID)===String(select.value)),qty=Number($("quantity").value);if(!selected)return alert("Please select a product.");
const r=await StockFlowAPI.stockIn({productId:select.value,quantity:qty,unitCost:$("unitCost").value,reference:$("reference").value.trim(),supplier:$("supplier").value.trim(),note:$("note").value.trim()});
if(!r?.success)return alert(r?.message||"Unable to record stock movement.");alert(r.message||"Stock movement recorded.","success");form.reset();await load();
}finally{btn.disabled=false;}};}catch(e){alert(e.message||"Unable to load stock module.");}
});