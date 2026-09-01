const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function load(){const r=await StockFlowInventoryAPI.activity();if(!r.success)return;$("rows").innerHTML=r.activities.length?r.activities.map(a=>`<tr><td>${esc(a.createdAt)}</td><td>${esc(a.action)}</td><td>${esc(a.module)}</td><td>${esc(a.username)}</td><td>${esc(a.details)}</td></tr>`).join(""):'<tr><td colspan="5" class="sf-empty">No activity yet.</td></tr>'}
$("refresh").onclick=load;document.addEventListener("DOMContentLoaded",load);
