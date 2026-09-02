document.addEventListener("DOMContentLoaded",async()=>{
"use strict";const $=id=>document.getElementById(id),form=$("stockOutForm"),select=$("productId"),current=$("current"),a=$("alert"),btn=$("saveButton");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const alert=(m,t="error")=>{a.textContent=m||"";a.className="sf-alert show "+t;};let products=[];
const load=async()=>{const r=await StockFlowAPI.listProducts();if(!r?.success)throw new Error(r?.message||"Unable to load products.");products=r.products||[];
select.innerHTML='<option value="">Select product</option>'+products.filter(p=>String(p.STATUS||"ACTIVE").toUpperCase()==="ACTIVE").map(p=>`<option value="${esc(p.ID)}">${esc(p.SKU)} — ${esc(p.NAME)} (available: ${Number(p.STOCK||0)})</option>`).join("");
current.innerHTML=products.length?products.map(p=>{const s=Number(p.STOCK||0),c=!s?"out":s<=Number(p.REORDER_LEVEL||5)?"low":"active";return `<div class="sf-list-item"><strong>${esc(p.NAME)}</strong><span class="badge ${c}">${s} units</span></div>`}).join(""):'<div class="sf-empty">No products available.</div>';};
try{const u=await StockFlowAuth.requireAuth();if(!u)return;await load();form.onsubmit=async e=>{e.preventDefault();btn.disabled=true;try{
const p=products.find(x=>String(x.ID)===String(select.value)),qty=Number($("quantity").value);if(!p)return alert("Please select a product.");if(qty>Number(p.STOCK||0))return alert(`Insufficient stock. Available quantity: ${Number(p.STOCK||0)}.`);
const r=await StockFlowAPI.stockOut({productId:select.value,quantity:qty,reference:$("reference").value.trim(),note:$("note").value.trim()});if(!r?.success)return alert(r?.message||"Unable to record stock out.");alert(r.message||"Stock-out recorded.","success");form.reset();await load();
}finally{btn.disabled=false;}};}catch(e){alert(e.message||"Unable to load stock-out module.");}
});