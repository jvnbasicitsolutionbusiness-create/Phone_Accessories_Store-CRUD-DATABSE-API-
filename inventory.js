document.addEventListener("DOMContentLoaded",async()=>{
"use strict";const $=id=>document.getElementById(id),rows=$("rows"),alertBox=$("alert");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const alert=(m,t="error")=>{alertBox.textContent=m||"";alertBox.className="sf-alert show "+t;};
try{const u=await StockFlowAuth.requireAuth();if(!u)return;const r=await StockFlowAPI.listProducts();if(!r?.success)throw new Error(r?.message||"Unable to load inventory.");
const ps=Array.isArray(r.products)?r.products:[];let total=0,low=0,out=0;
rows.innerHTML=ps.length?ps.map(p=>{const s=Number(p.STOCK||0),re=Number(p.REORDER_LEVEL||5);total+=s;if(!s)out++;else if(s<=re)low++;const c=!s?"out":s<=re?"low":"active",st=!s?"OUT OF STOCK":s<=re?"LOW STOCK":"IN STOCK";
return `<tr><td>${esc(p.SKU)}</td><td><strong>${esc(p.NAME)}</strong></td><td>${esc(p.CATEGORY||"-")}</td><td>${esc(p.SUPPLIER||"-")}</td><td><strong>${s}</strong></td><td>${re}</td><td><span class="badge ${c}">${st}</span></td></tr>`}).join(""):`<tr><td colspan="7" class="sf-empty">No products found. <a href="products.html">Add a product</a></td></tr>`;
$("pc").textContent=ps.length;$("ts").textContent=total;$("ls").textContent=low;$("os").textContent=out;
}catch(e){console.error(e);rows.innerHTML='<tr><td colspan="7" class="sf-empty">Unable to load inventory.</td></tr>';alert(e.message||"Unable to load inventory.");}
});