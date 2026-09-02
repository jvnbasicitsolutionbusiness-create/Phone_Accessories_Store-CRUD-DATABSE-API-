document.addEventListener("DOMContentLoaded",async()=>{
"use strict";const $=id=>document.getElementById(id),rows=$("rows"),a=$("alert");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const alert=m=>{a.textContent=m||"";a.className="sf-alert show error";};
const load=async type=>{try{const r=await StockFlowAPI.listTransactions(type?{type}:{});if(!r?.success)throw new Error(r?.message||"Unable to load transactions.");const d=r.transactions||[];
rows.innerHTML=d.length?d.map(x=>{const incoming=String(x.TYPE).toUpperCase()==="STOCK_IN";return `<tr><td>${esc(x.DATE||"")}</td><td><span class="badge ${incoming?"in":"out"}">${incoming?"STOCK IN":"STOCK OUT"}</span></td><td>${esc(x.REFERENCE||"-")}</td><td><strong>${esc(x.PRODUCT_NAME||"-")}</strong></td><td>${Number(x.QUANTITY||0)}</td><td>₱${Number(x.TOTAL||0).toFixed(2)}</td><td>${esc(x.USER||"-")}</td></tr>`}).join(""):`<tr><td colspan="7" class="sf-empty">No transactions found.</td></tr>`;
}catch(e){rows.innerHTML='<tr><td colspan="7" class="sf-empty">Unable to load transactions.</td></tr>';alert(e.message);}};
try{const u=await StockFlowAuth.requireAuth();if(!u)return;$("all").onclick=()=>load("");$("ins").onclick=()=>load("STOCK_IN");$("outs").onclick=()=>load("STOCK_OUT");await load("");}catch(e){alert(e.message||"Unable to load transactions.");}
});